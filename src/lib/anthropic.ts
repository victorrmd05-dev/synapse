import Anthropic from '@anthropic-ai/sdk';
import { CampaignMetrics, CampaignAnalysis, BreakdownRow } from '@/types';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Modelo usado para GERAÇÃO DE DESIGN/HTML. Claude é muito superior ao
// gpt-4o-mini em frontend — por isso a página de vendas roda aqui, não na
// OpenAI. Configurável: se a conta não tiver acesso ao default, defina
// ANTHROPIC_DESIGN_MODEL no .env.local (ex.: claude-3-5-sonnet-20241022).
export const ANTHROPIC_DESIGN_MODEL =
  process.env.ANTHROPIC_DESIGN_MODEL || 'claude-sonnet-4-6';

/**
 * Gera texto com o Claude, com retry em erros transitórios (429/5xx/overloaded).
 * Devolve o texto concatenado dos blocos de resposta.
 */
export async function gerarComClaude(
  params: { model?: string; max_tokens: number; system: string; user: string },
  tentativas = 3
): Promise<string> {
  let ultimoErro: unknown;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const response = await anthropic.messages.create({
        model: params.model || ANTHROPIC_DESIGN_MODEL,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: [{ role: 'user', content: params.user }],
      });
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    } catch (err) {
      ultimoErro = err;
      const status = (err as { status?: number })?.status;
      const transitorio = !status || status >= 500 || status === 429;
      console.warn(
        `[anthropic] tentativa ${i}/${tentativas} falhou (status ${status ?? '?'})` +
          (transitorio && i < tentativas ? ' — re-tentando…' : '')
      );
      if (!transitorio || i === tentativas) break;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw ultimoErro;
}

export async function callDiagnostic(campaignName: string, metrics: CampaignMetrics) {
  const prompt = `Você é um analista sênior de performance e media buyer especialista em Meta Ads para e-commerce dropshipping. Sua função é diagnosticar campanhas com base no princípio 80x10x10 e gerar recomendações acionáveis.

Regras de diagnóstico:
- Connect Rate < 80%: problema de velocidade/UX da landing page ou desalinhamento criativo->página
- Conversão LP < 10%: oferta fraca, copy desalinhada, falta de prova social ou CTA fraco
- Conversão Checkout < 10%: checkout complexo, frete inesperado, falta de método de pagamento ou erro técnico
- ROAS < 2: campanha não cobre custos — não escalar
- CTR < 1%: criativo fraco ou público errado
- CPM alto com CTR baixo: audiência saturada ou criativo não performando
- CPA > 40% do ticket médio: margem comprometida

Classifique sempre o gargalo principal. Retorne JSON com:
{
  "gargalo": "string (nome da métrica problemática ou 'nenhum')",
  "diagnostico": "string (2-3 frases explicando o problema)",
  "recomendacoes": [
    { "texto": "string", "prioridade": "alta"|"media"|"baixa" }
  ]
}
Retorne somente o JSON, sem markdown.

Aqui estão os dados da campanha:
Campanha: ${campaignName}
Data: ${new Date().toISOString()}
Métricas: ${JSON.stringify(metrics, null, 2)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: "Retorne apenas o JSON, sem markdown, sem texto adicional.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return safeParseJson(textBlock.text);
    }
    return null;
  } catch (error) {
    console.error('Error calling Anthropic:', error);
    throw error;
  }
}

/** Formata uma lista de quebras num texto compacto para o prompt. */
function fmtRows(rows: BreakdownRow[], limit = 20): string {
  return rows
    .slice(0, limit)
    .map(
      (r) =>
        `- ${r.label}: gasto R$${r.spend.toFixed(0)}, compras ${r.compras}, ROAS ${r.roas.toFixed(2)}, CPA R$${r.cpa.toFixed(0)}, LPviews ${r.lp_views}, checkouts ${r.checkouts}`
    )
    .join('\n');
}

/** Igual a fmtRows, mas inclui o adset_id — o plano precisa dele p/ pausar conjuntos. */
function fmtAdsets(rows: (BreakdownRow & { id?: string })[], limit = 25): string {
  return rows
    .slice(0, limit)
    .map(
      (r) =>
        `- [id: ${r.id || 'n/d'}] ${r.label}: gasto R$${r.spend.toFixed(0)}, compras ${r.compras}, ROAS ${r.roas.toFixed(2)}, CPA R$${r.cpa.toFixed(0)}`
    )
    .join('\n');
}

/**
 * Diagnóstico de media buyer: recebe as QUEBRAS (posicionamento, público, conjunto)
 * e aponta onde a verba está sendo desperdiçada + plano de ação priorizado.
 */
export async function callDeepDiagnostic(campaignName: string, analysis: CampaignAnalysis) {
  const prompt = `Você é um media buyer sênior de Meta Ads para e-commerce/dropshipping. Analise as QUEBRAS reais da campanha abaixo (últimos 30 dias) e identifique onde a verba está sendo mal alocada. Foque em decisões de mídia acionáveis: posicionamentos e públicos que desperdiçam budget, conjuntos para escalar vs pausar, e problemas estruturais (fragmentação de conjuntos, fase de aprendizado). ROAS abaixo de ~2 costuma ser prejuízo.

Campanha: ${campaignName}

POR POSICIONAMENTO:
${fmtRows(analysis.byPlacement)}

POR PÚBLICO (idade · gênero):
${fmtRows(analysis.byAge)}

POR CONJUNTO:
${fmtRows(analysis.byAdset)}

Retorne SOMENTE um JSON, sem markdown, no formato:
{
  "resumo": "string (2-3 frases: o diagnóstico central de media buying)",
  "vazamentos": [ { "tipo": "Posicionamento|Público|Estrutura|Checkout", "descricao": "onde está vazando verba e quanto" } ],
  "acoes": [ { "texto": "ação concreta", "prioridade": "alta|media|baixa", "impacto": "efeito esperado (ex: ROAS de X para Y)" } ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 3500, // resposta rica (vazamentos + várias ações) — evita truncar o JSON
      system:
        'Retorne apenas o JSON, sem markdown, sem texto adicional. Limite a no máximo 4 vazamentos e 6 ações para caber na resposta.',
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return safeParseJson(textBlock.text);
    }
    return null;
  } catch (error) {
    console.error('Error calling Anthropic (deep):', error);
    throw error;
  }
}

/** Extrai e parseia JSON mesmo que o modelo devolva com cercas de markdown. */
function safeParseJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: pega o primeiro bloco {...} encontrado.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Resposta da IA não é um JSON válido.');
  }
}

/**
 * Gera o plano de otimização no escopo "duplicar + ajustar" (v1).
 *
 * Ancorado na ANÁLISE PROFUNDA (quebras por posicionamento, público e conjunto):
 * o plano deriva alavancas de media buying CONCRETAS e prontas para a Meta API —
 * segmentação (idade/gênero), posicionamentos (ex.: só Reels) e a lista de
 * conjuntos perdedores a NÃO duplicar. É isso que a execução aplica no targeting.
 */
export async function callOptimizationPlan(
  campaignName: string,
  objetivo: string,
  ativo: boolean,
  metrics: any,
  diagnostic: any,
  analysis?: CampaignAnalysis | null,
  deep?: any
) {
  const temQuebras =
    analysis && (analysis.byPlacement?.length || analysis.byAge?.length || analysis.byAdset?.length);

  const blocoQuebras = temQuebras
    ? `
QUEBRAS REAIS DA CAMPANHA (Análise Profunda — é DAQUI que você tira as alavancas):

POR POSICIONAMENTO (onde o ROAS é melhor/pior):
${fmtRows(analysis!.byPlacement)}

POR PÚBLICO (idade · gênero — quem realmente compra):
${fmtRows(analysis!.byAge)}

POR CONJUNTO (candidatos a pausar = 0 vendas ou ROAS<1 com gasto relevante):
${fmtAdsets(analysis!.byAdset as any)}
${deep?.resumo ? `\nLeitura do media buyer:\n${deep.resumo}` : ''}`
    : `\n(Sem quebras da Análise Profunda — derive o que der só das métricas agregadas; deixe segmentacao/posicionamentos/conjuntos_pausar nulos ou vazios.)`;

  const PLAN_CONTRACT = `
---

## CONTRATO DE SAÍDA — PLANO DE OTIMIZAÇÃO (OBRIGATÓRIO)
Você vai propor a OTIMIZAÇÃO no escopo "duplicar + ajustar" (v1): duplicar a campanha
e REALOCAR a verba para o que converte, segundo as QUEBRAS acima. NÃO crie criativo novo.

O foco NÃO é aumentar verba — é concentrar: manter os posicionamentos e públicos vencedores,
cortar os perdedores e não reduplicar os conjuntos que não vendem.

Responda APENAS com um objeto JSON válido (sem cercas, sem texto fora do JSON):

{
  "resumo": "1-2 frases: o que será realocado e por quê, citando os vazamentos das quebras",
  "nova_campanha": {
    "nome_sugerido": "string curta (ex: '<nome> — OTIM v1')",
    "objetivo_meta": "OUTCOME_TRAFFIC | OUTCOME_SALES | OUTCOME_AWARENESS | OUTCOME_ENGAGEMENT | OUTCOME_LEADS",
    "daily_budget_reais": number,
    "ajustes": [
      { "campo": "budget | objetivo | segmentacao | posicionamento | estrutura", "de": "valor atual", "para": "valor proposto", "motivo": "curto, ancorado na quebra" }
    ]
  },
  "execucao": {
    "daily_budget_reais": number,
    "optimization_goal": "LINK_CLICKS | LANDING_PAGE_VIEWS | OFFSITE_CONVERSIONS | REACH | IMPRESSIONS | THRUPLAY | null (null = manter o da fonte)",
    "remover_audience_network": true | false,
    "somente_mobile": true | false,
    "segmentacao": {
      "idade_min": number | null,
      "idade_max": number | null,
      "generos": ["male"] | ["female"] | ["male","female"] | null,
      "motivo": "curto — quem compra segundo a quebra por público"
    },
    "posicionamentos": {
      "publisher_platforms": ["facebook","instagram"] | null,
      "facebook_positions": ["feed","facebook_reels","story","right_hand_column","marketplace","video_feeds","instream_video"] (subconjunto) | null,
      "instagram_positions": ["stream","story","reels","explore","explore_home","profile_feed"] (subconjunto) | null,
      "motivo": "curto — onde o ROAS é melhor (ex.: concentrar em Reels)"
    },
    "conjuntos_pausar": [ { "id": "<adset_id EXATO da quebra POR CONJUNTO>", "nome": "<nome>", "motivo": "0 vendas / ROAS<1 com R$X" } ]
  },
  "racional_80x10x10": "como a realocação melhora connect/checkout/purchase rate",
  "riscos": "o que monitorar nas primeiras 48h"
}

Regras:
- segmentacao/posicionamentos/conjuntos_pausar DEVEM sair das quebras. Use null/[] só se não houver sinal claro.
- Só corte um posicionamento/público/conjunto se ele claramente perde dinheiro (0 vendas com gasto, ou ROAS<1 com gasto relevante). NUNCA corte um vencedor (ROAS≥2).
- conjuntos_pausar: use o adset_id EXATO que aparece em "[id: ...]". Não invente ids. Não liste TODOS os conjuntos (a campanha ficaria vazia) — só os perdedores.
- Tokens de posicionamento devem ser EXATAMENTE os listados acima (ex.: Facebook Reels = "facebook_reels", Instagram Reels = "reels", Instagram Feed = "stream").
- generos: "male"/"female". Respeite o objetivo atual; só mude se o funil estiver maduro.
- daily_budget_reais coerente com o gasto atual (concentrar, não inflar).`;

  const prompt = `Gere o plano de otimização (duplicar + ajustar) para a campanha abaixo.

Campanha: ${campaignName}
Objetivo atual: ${objetivo}
Ativa: ${ativo ? 'sim' : 'não'}

Métricas agregadas (R$ em BRL):
${JSON.stringify(metrics, null, 2)}

${diagnostic ? `Diagnóstico (funil): Gargalo ${diagnostic.gargalo} — ${diagnostic.diagnostico}` : ''}
${blocoQuebras}

${PLAN_CONTRACT}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 3500,
      system: "Retorne apenas o JSON, sem markdown, sem texto adicional.",
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return safeParseJson(textBlock.text);
    }
    return null;
  } catch (error) {
    console.error('Error calling Anthropic (plan):', error);
    throw error;
  }
}
