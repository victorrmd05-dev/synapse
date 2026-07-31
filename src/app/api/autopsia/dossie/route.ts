// src/app/api/autopsia/dossie/route.ts
//
// Gera o dossiê: monta o contexto (ficha + criativos + TRANSCRIÇÕES), chama o
// agente `autopsia` e transforma o JSON devolvido em markdown.
//
// O contrato de saída é anexado aqui, não no AGENTS.md: o cérebro descreve
// COMO analisar (e é lido por humano em /agents); a rota impõe o FORMATO de
// que este consumidor precisa. Mesmo padrão de /api/meta/diagnose.

import { getTenantClient } from '@/lib/supabase-tenant';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { gerarJSONComAgente, parseJSONFlexivel } from '@/lib/agents/generateWithProvider';
import { montarMarkdown, type DossieJSON, type DadosDossie } from '@/lib/autopsia/dossie';

export const maxDuration = 300;

const CONTRATO = `
Responda APENAS com um objeto JSON válido, sem cercas de código, neste formato:

{
  "sumario_executivo": "string em markdown",
  "alvo": "string em markdown (tabela de ficha + sinais de que a campanha paga)",
  "anatomia": "string em markdown (funil, blocos de copy, timings da VSL, ângulos, frases que convertem — citadas literalmente)",
  "vulnerabilidades": "string em markdown",
  "modelar_x_rejeitar": "string em markdown com DUAS listas explícitas: o que modelar e o que rejeitar (com o motivo do risco)",
  "plano": "string em markdown",
  "restricoes": "string em markdown",
  "em_aberto": ["pergunta que o material NÃO responde", "outra"]
}

Regras:
- Cite trechos das transcrições literalmente, entre aspas.
- Ancore afirmações em números concretos (dias no ar, durações, quantidades).
- O que o material não sustenta vai para "em_aberto", NUNCA para o texto das seções.
- Nunca invente URL, preço, depoimento ou nome de pessoa.
`;

export async function POST(request: Request) {
  try {
    const { autopsia_id } = await request.json();
    if (!autopsia_id) {
      return Response.json({ error: 'autopsia_id é obrigatório.' }, { status: 400 });
    }

    const supabase = getTenantClient();

    const { data: autopsia, error: errA } = await supabase
      .from('autopsias')
      .select('*')
      .eq('id', autopsia_id)
      .single();
    if (errA || !autopsia) {
      return Response.json({ error: 'Autópsia não encontrada.' }, { status: 404 });
    }

    const { data: criativos, error: errC } = await supabase
      .from('autopsia_criativos')
      .select('*')
      .eq('autopsia_id', autopsia_id)
      .order('dias_no_ar', { ascending: false });
    if (errC || !criativos?.length) {
      return Response.json({ error: 'Autópsia sem criativos.' }, { status: 400 });
    }

    const config = await getAgentConfig('autopsia');
    if (!config) {
      return Response.json(
        { error: 'Agente "autopsia" não sincronizado ou inativo. Rode a sincronização em /agents.' },
        { status: 400 }
      );
    }

    // Contexto: os metadados que revelam a operação + a copy falada.
    const ficha = [
      `ANUNCIANTE: ${autopsia.page_name ?? '(sem nome)'} (page_id ${autopsia.page_id})`,
      `ANÚNCIOS COLETADOS: ${autopsia.total_anuncios}`,
      `CRIATIVOS ÚNICOS APÓS DEDUP: ${autopsia.total_criativos}`,
      `RAZÃO ANÚNCIOS/CRIATIVOS: ${(autopsia.total_anuncios / Math.max(autopsia.total_criativos, 1)).toFixed(1)}x`,
    ].join('\n');

    const blocos = criativos.map((c, i) => {
      return [
        `--- CRIATIVO ${i} ---`,
        `duração: ${c.duracao_s ?? '?'}s | dias no ar: ${c.dias_no_ar ?? '?'} | ativo: ${c.is_active ? 'sim' : 'não'}`,
        `CTA: ${c.cta_text ?? '—'} | destino: ${c.link_url ?? '—'}`,
        `COPY ESCRITA:\n${c.ad_copy ?? '(sem copy)'}`,
        `TRANSCRIÇÃO DO ÁUDIO:\n${c.transcricao ?? '(não transcrito)'}`,
      ].join('\n');
    });

    const system = buildSystemPrompt(config) + '\n\n' + CONTRATO;
    const user = `${ficha}\n\n${blocos.join('\n\n')}`;

    const { raw, provider } = await gerarJSONComAgente(config, system, user);
    const secoes = parseJSONFlexivel<DossieJSON>(raw);

    const dados: DadosDossie = {
      page_name: autopsia.page_name,
      page_id: autopsia.page_id,
      total_anuncios: autopsia.total_anuncios,
      total_criativos: autopsia.total_criativos,
      criado_em: autopsia.criado_em,
      criativos: criativos as DadosDossie['criativos'],
      secoes,
    };

    const markdown = montarMarkdown(dados);

    await supabase
      .from('autopsias')
      .update({
        dossie_json: secoes,
        dossie_md: markdown,
        status: 'pronta',
        progresso: 100,
        concluido_em: new Date().toISOString(),
      })
      .eq('id', autopsia_id);

    return Response.json({ sucesso: true, provider, tamanho: markdown.length });
  } catch (err) {
    console.error('[api/autopsia/dossie] erro:', err);
    return Response.json(
      { error: 'Falha ao gerar o dossiê', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
