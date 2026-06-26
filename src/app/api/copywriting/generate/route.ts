// src/app/api/copywriting/generate/route.ts
//
// VERSÃO COM OPENAI (API oficial)
// Usa o SDK da OpenAI apontando para a API oficial (api.openai.com). Mesma
// lógica de negócio de antes (busca campanha + produto em queries separadas,
// monta prompt do agente sincronizado do GitHub, salva resultado).
//
// Variáveis de ambiente necessárias:
//   OPENAI_API_KEY=sk-...        (chave da sua conta OpenAI)
//   OPENAI_MODEL=gpt-4o-mini     (opcional; default abaixo)

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { pesquisaDeMercadoParaCopy } from '@/lib/tavily';
import { OPENAI_MODEL as MODELO, chatComRetry } from '@/lib/openai';

interface GenerateBody {
  campanha_id: string;
  notas_revisao?: string;
}

export async function POST(request: Request) {
  // Declarado fora do try para o catch conseguir marcar o card como "erro".
  let placeholderId: string | null = null;
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

    // 2b. Card "Gerando…" imediato: insere já o registro em workflow_copywriting
    //     para o produto aparecer na Fila de Produção na hora (via Realtime).
    //     A copy real preenche este mesmo registro no fim (passo 6).
    const { data: placeholder } = await supabase
      .from('workflow_copywriting')
      .insert({
        campanha_id,
        tipo_copy: 'Página de Vendas',
        conteudo_texto: `⏳ ${campanha.nome_projeto}\n\nO Copywriter está pesquisando o mercado (Tavily) e escrevendo a copy… Isso leva ~30-60s. Esta tela atualiza sozinha.`,
        meta_ads_copy: '',
        revisor_ok: false,
        notas_revisao: null,
        status: 'gerando',
      })
      .select('id')
      .single();
    placeholderId = placeholder?.id ?? null;

    await supabase
      .from('campanhas_producao')
      .update({ status_geral: 'Gerando Copy' })
      .eq('id', campanha_id);

    // 3. Fase de Pesquisa — busca web real (Tavily) a partir do produto minerado.
    //    Best-effort: se falhar/sem chave, segue sem o bloco (não quebra).
    const termoBase = produto.ad_title || produto.page_name || campanha.nome_projeto || '';
    const pesquisa = await pesquisaDeMercadoParaCopy(termoBase);

    // 4. Montar o prompt do usuário
    let userPrompt = `Dados do produto minerado (input do agente Minerador):
- Nome da página/anunciante: ${produto.page_name ?? 'não informado'}
- Título do anúncio original: ${produto.ad_title ?? 'não informado'}
- Copy original do anúncio: ${produto.ad_copy ?? 'não informado'}
- Score de validação: ${produto.score_escala ?? 'não informado'}
- Nome do projeto: ${campanha.nome_projeto}`;

    if (pesquisa) {
      userPrompt += `\n\nPesquisa de mercado (dados REAIS coletados na web agora — use o vocabulário,
as dores e as objeções que aparecem aqui para ancorar a copy; NÃO invente prova):
${pesquisa}`;
    }

    userPrompt += `\n\nGere a copy do anúncio Meta Ads e a copy da página de vendas para este produto,
seguindo as estruturas e técnicas da sua skill e o TEMPLATE (seção a seção).
Retorne em JSON estruturado:
{ "meta_ads_copy": "...", "pagina_vendas": "..." }`;

    if (notas_revisao) {
      userPrompt += `\n\nATENÇÃO: esta é uma regeração. O Revisor pediu ajustes com a seguinte nota:
"${notas_revisao}"
Leve este feedback em conta na nova versão.`;
    }

    // 5. Chamar a OpenAI com retry em erros transitórios (429/5xx).
    //    response_format json_object garante que a resposta seja JSON válido.
    const response = await chatComRetry({
      model: MODELO,
      max_tokens: config.max_tokens,
      response_format: { type: 'json_object' },
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

    // 6. Preencher a copy real. Atualiza o card "Gerando…" criado no passo 2b
    //    (ou insere, caso o placeholder tenha falhado por algum motivo).
    const payloadCopy = {
      campanha_id,
      tipo_copy: 'Página de Vendas',
      conteudo_texto: paginaVendas,
      meta_ads_copy: metaAdsCopy,
      revisor_ok: false,
      notas_revisao: null,
      // Copy pronta -> entra na fila do Revisor para a IA revisora analisar.
      status: 'aguardando_revisao_ia',
      revisao_ia_score: null,
      revisao_ia_parecer: null,
    };

    const query = placeholderId
      ? supabase.from('workflow_copywriting').update(payloadCopy).eq('id', placeholderId)
      : supabase.from('workflow_copywriting').insert(payloadCopy);

    const { data: registro, error: insertError } = await query.select().single();

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
    const msg = err instanceof Error ? err.message : 'erro desconhecido';

    // Não deixa o card preso em "Gerando…": marca a falha no próprio registro.
    if (placeholderId) {
      await supabase
        .from('workflow_copywriting')
        .update({ status: 'erro', conteudo_texto: `❌ Falha ao gerar a copy.\n\nDetalhe: ${msg}\n\nAprove o anúncio novamente para tentar de novo.` })
        .eq('id', placeholderId);
    }

    return Response.json({ error: 'Falha ao gerar copy', detalhe: msg }, { status: 500 });
  }
}
