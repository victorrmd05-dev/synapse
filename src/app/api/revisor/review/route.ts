// src/app/api/revisor/review/route.ts
//
// IA REVISORA (agente "revisor") rodando na OpenAI.
// Recebe o id de um registro em workflow_copywriting, monta o system prompt do
// agente Revisor (sincronizado do GitHub), pede um parecer estruturado em JSON
// (score 0-100 + análise) e salva o resultado no próprio registro, deixando-o
// no status 'revisado_ia' para o humano decidir (aprovar/rejeitar).
//
// Variáveis de ambiente: OPENAI_API_KEY (ver src/lib/openai.ts).

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { OPENAI_MODEL as MODELO, chatComRetry } from '@/lib/openai';

interface ReviewBody {
  copy_id: string;
}

export async function POST(request: Request) {
  try {
    const { copy_id } = (await request.json()) as ReviewBody;

    if (!copy_id) {
      return Response.json({ error: 'copy_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar a copy a ser revisada
    const { data: copy, error: copyError } = await supabase
      .from('workflow_copywriting')
      .select('*')
      .eq('id', copy_id)
      .maybeSingle();

    if (copyError) {
      return Response.json(
        { error: 'Erro ao buscar copy', detalhe: copyError.message },
        { status: 500 }
      );
    }
    if (!copy) {
      return Response.json({ error: 'Copy não encontrada' }, { status: 404 });
    }

    // 2. Contexto do produto (best-effort: ajuda a IA a julgar aderência à oferta)
    let contextoProduto = '';
    if (copy.campanha_id) {
      const { data: campanha } = await supabase
        .from('campanhas_producao')
        .select('nome_projeto, ad_minerado_id')
        .eq('id', copy.campanha_id)
        .maybeSingle();

      if (campanha?.ad_minerado_id) {
        const { data: produto } = await supabase
          .from('ads_minerados')
          .select('page_name, ad_title, ad_copy')
          .eq('id', campanha.ad_minerado_id)
          .maybeSingle();

        if (produto) {
          contextoProduto = `Produto/oferta de referência (anúncio minerado original):
- Anunciante: ${produto.page_name ?? 'não informado'}
- Título original: ${produto.ad_title ?? 'não informado'}
- Copy original: ${produto.ad_copy ?? 'não informado'}`;
        }
      }
    }

    // 3. System prompt do agente Revisor (sincronizado do GitHub)
    const config = await getAgentConfig('revisor');
    if (!config) {
      return Response.json(
        {
          error:
            'Agente "revisor" não encontrado ou inativo. Rode a sincronização em /api/agents/sync primeiro.',
        },
        { status: 400 }
      );
    }
    const systemPrompt = buildSystemPrompt(config);

    // 4. Prompt do usuário: a copy a julgar
    const userPrompt = `${contextoProduto ? contextoProduto + '\n\n' : ''}Faça o QA (revisão de qualidade) da copy abaixo, gerada pelo agente Copywriter.

=== COPY DA PÁGINA DE VENDAS ===
${copy.conteudo_texto || '(vazio)'}

=== COPY DO META ADS ===
${copy.meta_ads_copy || '(vazio)'}

Avalie clareza, força do gancho, mecanismo único, prova, CTA, aderência à oferta e
ausência de promessas problemáticas. Seja rigoroso e específico.

Responda APENAS em JSON com este formato exato:
{
  "score": <número inteiro de 0 a 100>,
  "aprovacao_sugerida": <true se a copy está pronta para produção, false se precisa de ajustes>,
  "pontos_fortes": ["...", "..."],
  "pontos_fracos": ["...", "..."],
  "recomendacao": "<parágrafo curto com o veredito e, se reprovar, o que o Copywriter deve ajustar>"
}`;

    // 5. Chamar a IA revisora (OpenAI) com retry e saída JSON garantida
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

    let score: number | null = null;
    let aprovacaoSugerida: boolean | null = null;
    let parecer = textoResposta;

    try {
      const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.score === 'number') {
          score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        }
        if (typeof parsed.aprovacao_sugerida === 'boolean') {
          aprovacaoSugerida = parsed.aprovacao_sugerida;
        }

        const fortes: string[] = Array.isArray(parsed.pontos_fortes) ? parsed.pontos_fortes : [];
        const fracos: string[] = Array.isArray(parsed.pontos_fracos) ? parsed.pontos_fracos : [];
        const recomendacao: string = parsed.recomendacao ?? '';

        parecer = [
          recomendacao && `📋 ${recomendacao}`,
          fortes.length ? '\n✅ Pontos fortes:\n' + fortes.map((p) => `• ${p}`).join('\n') : '',
          fracos.length ? '\n⚠️ Pontos a ajustar:\n' + fracos.map((p) => `• ${p}`).join('\n') : '',
        ]
          .filter(Boolean)
          .join('\n');
      }
    } catch {
      // mantém o texto bruto em parecer
    }

    // 6. Salvar o parecer e mover para "revisado_ia" (aguardando decisão humana)
    const { data: registro, error: updateError } = await supabase
      .from('workflow_copywriting')
      .update({
        status: 'revisado_ia',
        revisao_ia_score: score,
        revisao_ia_parecer: parecer,
      })
      .eq('id', copy_id)
      .select()
      .single();

    if (updateError) {
      return Response.json(
        { error: 'Falha ao salvar parecer da IA', detalhe: updateError.message },
        { status: 500 }
      );
    }

    return Response.json({
      sucesso: true,
      score,
      aprovacao_sugerida: aprovacaoSugerida,
      parecer,
      registro,
    });
  } catch (err) {
    console.error('[api/revisor/review] erro:', err);
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    return Response.json({ error: 'Falha ao revisar copy', detalhe: msg }, { status: 500 });
  }
}
