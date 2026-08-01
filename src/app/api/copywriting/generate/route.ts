// src/app/api/copywriting/generate/route.ts
//
// RODA NO OPENCODE ZEN (GRATUITO).
// Antes apontava para a API oficial da OpenAI (gpt-4o-mini, PAGA) — o custo
// passava despercebido porque a doc do projeto dizia que já era Zen. Mesma
// lógica de negócio de sempre (busca campanha + produto, monta o prompt do
// agente sincronizado, salva resultado).
//
// Esta rota gera o RASCUNHO dentro do painel. A copy final de campanha é feita
// no Claude Code (skill `copy`) e gravada direto em workflow_copywriting.
//
// Variáveis de ambiente necessárias:
//   OPENCODE_API_KEY=...                     (ver src/lib/opencode.ts)
//   OPENCODE_MODEL=deepseek-v4-flash-free    (opcional)

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { pesquisaDeMercadoParaCopy } from '@/lib/tavily';
import { chatComZen, OPENCODE_MODEL as MODELO } from '@/lib/opencode';

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

    // 3b. DOSSIÊ DA AUTÓPSIA — o melhor contexto que existe no sistema.
    //     Quando a campanha nasceu de uma autópsia, o dossiê já traz a anatomia
    //     dos criativos do concorrente, as vulnerabilidades e a decisão do que
    //     modelar. Passamos as SEÇÕES do dossiê, não as transcrições cruas: o
    //     dossiê é a versão comprimida e já julgada desse material — é para isso
    //     que ele existe. Mandar 20 transcrições aqui estouraria o contexto sem
    //     melhorar a copy.
    let blocoDossie = '';
    if (campanha.autopsia_id) {
      const { data: autopsia } = await supabase
        .from('autopsias')
        .select('page_name, dossie_json')
        .eq('id', campanha.autopsia_id)
        .maybeSingle();

      const d = autopsia?.dossie_json as Record<string, string> | null;
      if (d) {
        blocoDossie = `\n\nDOSSIÊ DA AUTÓPSIA DO CONCORRENTE (${autopsia?.page_name ?? '—'}).
Isto é análise já feita em cima dos criativos reais dele — anúncios baixados,
frames extraídos e áudio transcrito. É a fonte mais confiável que você tem aqui.
Use "O que modelamos" como briefing e "Vulnerabilidades" como vantagem competitiva.
NÃO copie a copy dele: modele a ESTRUTURA e ataque as brechas.

[O ALVO]
${d.alvo ?? '—'}

[ANATOMIA DA OPERAÇÃO DELE — como os criativos são construídos]
${d.anatomia ?? '—'}

[VULNERABILIDADES — onde ele é atacável]
${d.vulnerabilidades ?? '—'}

[O QUE MODELAMOS × O QUE REJEITAMOS — este é o briefing]
${d.modelar_x_rejeitar ?? '—'}

[PLANO JÁ DECIDIDO]
${d.plano ?? '—'}`;
      }
    }

    // 4. Montar o prompt do usuário
    let userPrompt = `Dados do produto minerado (input do agente Minerador):
- Nome da página/anunciante: ${produto.page_name ?? 'não informado'}
- Título do anúncio original: ${produto.ad_title ?? 'não informado'}
- Copy original do anúncio: ${produto.ad_copy ?? 'não informado'}
- Score de validação: ${produto.score_escala ?? 'não informado'}
- Nome do projeto: ${campanha.nome_projeto}`;

    userPrompt += blocoDossie;

    if (pesquisa) {
      userPrompt += `\n\nPesquisa de mercado (dados REAIS coletados na web agora — use o vocabulário,
as dores e as objeções que aparecem aqui para ancorar a copy; NÃO invente prova):
${pesquisa}`;
    }

    userPrompt += `\n\nGere a copy do anúncio Meta Ads e a copy da página de vendas para este produto,
seguindo as estruturas e técnicas da sua skill e o TEMPLATE (seção a seção).

IMAGENS — obrigatório:
1. Dentro de "pagina_vendas", marque onde cada imagem entra com uma linha isolada no
   formato exato: [IMAGEM N · nome-do-arquivo.png — descrição curta]
   São de 3 a 5 imagens. A primeira é sempre o hero, logo abaixo do título.
2. Em "prompts_imagens", escreva o prompt COMPLETO de cada uma, no formato da sua
   skill (bloco <<< >>> + "salvar como"), incluindo o bloco de estilo-mestre com a
   paleta em hex. O Fernando gera as imagens fora e sobe numa pasta.
3. Em "prompts_videos", escreva 3 prompts de video para anuncio. Regras:
   - 5 a 10 segundos cada.
   - Descreva MOVIMENTO: camera, acao, ritmo. E o que separa video de imagem.
   - Se o video deve partir de uma imagem ja gerada, cite [IMAGEM N] no inicio.
   - NUNCA peca texto na tela. Modelo de video escreve texto embolado, e a
     legenda e queimada depois no Remotion. Pedir texto aqui gasta dinheiro
     para produzir um defeito que o passo seguinte teria que cobrir.

Retorne em JSON estruturado:
{ "meta_ads_copy": "...", "pagina_vendas": "...", "prompts_imagens": "...", "prompts_videos": "..." }`;

    if (notas_revisao) {
      userPrompt += `\n\nATENÇÃO: esta é uma regeração. O Revisor pediu ajustes com a seguinte nota:
"${notas_revisao}"
Leve este feedback em conta na nova versão.`;
    }

    // 5. Chamar o Zen com retry em erros transitórios (429/5xx).
    //    Sem `response_format`: nem todo modelo do Zen aceita JSON mode, e o
    //    parse abaixo já procura o objeto JSON dentro do texto. O piso de
    //    max_tokens vem do chatComZen (modelo de raciocínio — ver opencode.ts).
    const response = await chatComZen({
      max_tokens: config.max_tokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const textoResposta = response.choices[0]?.message?.content ?? '';
    const finishReason = response.choices[0]?.finish_reason;

    // 🚨 FALHA SILENCIOSA (medida em 01/08/2026): o modelo do Zen é de
    // RACIOCÍNIO, e `max_tokens` é o teto do total (raciocínio + resposta).
    // Numa chamada real com este system prompt (16.791 chars) o raciocínio
    // consumiu 5.411 dos 8.000 tokens, `finish_reason` voltou `length` e o JSON
    // saiu cortado no meio. Com o prompt maior ainda (dossiê da autópsia +
    // Tavily), o raciocínio comeu o orçamento INTEIRO e o `content` veio VAZIO —
    // HTTP 200, sem erro.
    //
    // O que acontecia então: o `JSON.parse` falhava, o catch era mudo, e a rota
    // gravava uma linha com tudo em branco respondendo `sucesso: true`. A copy
    // aparecia vazia no /revisor e `prompts_videos` ficava null — sem nenhum
    // sinal de que algo deu errado.
    //
    // Falhar aqui é melhor que gravar vazio: o card fica marcado como erro (o
    // catch geral cuida disso) e a mensagem diz o que fazer.
    if (!textoResposta.trim()) {
      throw new Error(
        'O modelo devolveu resposta vazia. O orçamento de max_tokens ' +
          `(${config.max_tokens}) foi consumido pelo raciocínio antes de escrever a ` +
          'copy. Aumente `max_tokens` do agente "copywriting" em agentes_config.'
      );
    }

    let metaAdsCopy = '';
    let paginaVendas = textoResposta;
    let promptsImagens = '';
    let promptsVideos = '';

    let parseOk = false;
    try {
      const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        metaAdsCopy = parsed.meta_ads_copy ?? parsed.copy_text ?? '';
        paginaVendas = parsed.pagina_vendas ?? parsed.copy_text ?? textoResposta;
        promptsImagens = parsed.prompts_imagens ?? '';
        promptsVideos = parsed.prompts_videos ?? '';
        parseOk = true;
      }
    } catch {
      // mantém o texto bruto em paginaVendas — tratado logo abaixo
    }

    // Truncado + JSON quebrado = resposta cortada no meio. O texto bruto que
    // sobra é um JSON pela metade, que não serve como copy nem como prompt.
    if (!parseOk && finishReason === 'length') {
      throw new Error(
        `A resposta foi cortada por limite de tokens (max_tokens=${config.max_tokens}) ` +
          'e o JSON ficou incompleto. Aumente `max_tokens` do agente "copywriting" ' +
          'em agentes_config.'
      );
    }

    // 6. Preencher a copy real. Atualiza o card "Gerando…" criado no passo 2b
    //    (ou insere, caso o placeholder tenha falhado por algum motivo).
    const payloadCopy = {
      campanha_id,
      tipo_copy: 'Página de Vendas',
      conteudo_texto: paginaVendas,
      meta_ads_copy: metaAdsCopy,
      prompts_imagens: promptsImagens || null,
      prompts_videos: promptsVideos || null,
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
