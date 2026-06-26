// src/app/api/copywriting/generate/route.ts
//
// VERSÃO COM OPENCODE ZEN (DeepSeek V4 Flash Free)
// Em vez do SDK da Anthropic, usamos o SDK da OpenAI apontando para o
// endpoint compatível do OpenCode Zen. Mesma lógica de negócio de antes
// (busca campanha + produto em queries separadas, monta prompt do
// agente sincronizado do GitHub, salva resultado).
//
// Variável de ambiente necessária:
//   OPENCODE_API_KEY=sk-PMv0...59Fs   (a chave "alavancaai_synapse" do seu painel)

import OpenAI from 'openai';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';

const opencode = new OpenAI({
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: 'https://opencode.ai/zen/v1',
});

const MODELO = 'deepseek-v4-flash-free';

interface GenerateBody {
  campanha_id: string;
  notas_revisao?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateBody;
    const { campanha_id, notas_revisao } = body;

    if (!campanha_id) {
      return Response.json({ error: 'campanha_id é obrigatório' }, { status: 400 });
    }

    // 1a. Buscar a campanha
    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas_producao')
      .select('*')
      .eq('id', campanha_id)
      .maybeSingle();

    if (campanhaError) {
      return Response.json(
        { error: 'Erro ao buscar campanha', detalhe: campanhaError.message },
        { status: 500 }
      );
    }
    if (!campanha) {
      return Response.json(
        { error: 'Campanha não encontrada', detalhe: `Nenhum registro com id=${campanha_id}` },
        { status: 404 }
      );
    }
    if (!campanha.ad_minerado_id) {
      return Response.json(
        { error: 'Campanha não possui um produto minerado relacionado (ad_minerado_id nulo)' },
        { status: 400 }
      );
    }

    // 1b. Buscar o produto minerado
    const { data: produto, error: produtoError } = await supabase
      .from('ads_minerados')
      .select('*')
      .eq('id', campanha.ad_minerado_id)
      .maybeSingle();

    if (produtoError) {
      return Response.json(
        { error: 'Erro ao buscar produto minerado', detalhe: produtoError.message },
        { status: 500 }
      );
    }
    if (!produto) {
      return Response.json(
        {
          error: 'Produto minerado não encontrado',
          detalhe: `ad_minerado_id=${campanha.ad_minerado_id} não existe em ads_minerados`,
        },
        { status: 404 }
      );
    }

    // 2. Buscar config do agente Copywriting (sincronizada do GitHub)
    const config = await getAgentConfig('copywriting');
    if (!config) {
      return Response.json(
        {
          error:
            'Agente "copywriting" não encontrado ou inativo. Rode a sincronização em /api/agents/sync primeiro.',
        },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(config);

    // 3. Montar o prompt do usuário
    let userPrompt = `Dados do produto minerado:
- Nome da página/anunciante: ${produto.page_name ?? 'não informado'}
- Título do anúncio original: ${produto.ad_title ?? 'não informado'}
- Copy original do anúncio: ${produto.ad_copy ?? 'não informado'}
- Score de validação: ${produto.score_escala ?? 'não informado'}
- Nome do projeto: ${campanha.nome_projeto}

Gere a copy do anúncio Meta Ads e a copy da página de vendas para este produto,
seguindo as estruturas e técnicas da sua skill. Retorne em JSON estruturado:
{ "meta_ads_copy": "...", "pagina_vendas": "..." }`;

    if (notas_revisao) {
      userPrompt += `\n\nATENÇÃO: esta é uma regeração. O Revisor pediu ajustes com a seguinte nota:
"${notas_revisao}"
Leve este feedback em conta na nova versão.`;
    }

    // 4. Chamar o OpenCode Zen (DeepSeek V4 Flash Free)
    const response = await opencode.chat.completions.create({
      model: MODELO,
      max_tokens: config.max_tokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const textoResposta = response.choices[0]?.message?.content ?? '';

    let metaAdsCopy = '';
    let paginaVendas = textoResposta;

    try {
      const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        metaAdsCopy = parsed.meta_ads_copy ?? parsed.copy_text ?? '';
        paginaVendas = parsed.pagina_vendas ?? parsed.copy_text ?? textoResposta;
      }
    } catch {
      // mantém o texto bruto em paginaVendas
    }

    // 5. Salvar em workflow_copywriting
    const { data: registro, error: insertError } = await supabase
      .from('workflow_copywriting')
      .insert({
        campanha_id,
        tipo_copy: 'Página de Vendas',
        conteudo_texto: paginaVendas,
        meta_ads_copy: metaAdsCopy,
        revisor_ok: false,
        notas_revisao: null,
      })
      .select()
      .single();

    if (insertError) {
      return Response.json(
        { error: 'Falha ao salvar copy gerada', detalhe: insertError.message },
        { status: 500 }
      );
    }

    await supabase
      .from('campanhas_producao')
      .update({ status_geral: 'Copy Gerada' })
      .eq('id', campanha_id);

    return Response.json({ sucesso: true, registro });
  } catch (err) {
    console.error('[api/copywriting/generate] erro:', err);
    return Response.json(
      { error: 'Falha ao gerar copy', detalhe: err instanceof Error ? err.message : 'erro desconhecido' },
      { status: 500 }
    );
  }
}
