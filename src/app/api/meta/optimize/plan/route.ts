import { NextResponse } from 'next/server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { gerarJSONComAgente, parseJSONFlexivel } from '@/lib/agents/generateWithProvider';
import { supabaseServer } from '@/lib/supabase-server';
import { fetchCampaignAnalysis } from '@/lib/meta-api';
import type { CampaignAnalysis, BreakdownRow } from '@/types';

// v1 da execução autônoma — ESCOPO ESTREITO: "duplicar + ajustar".
// Esta rota apenas GERA o plano (sem escrever no Meta). O plano fica 'pendente'
// até o orquestrador (Fernando) aprovar em /meta-ads/campanhas; só então a rota
// de execução cria a nova campanha (sempre em PAUSED).
//
// O plano é ANCORADO na Análise Profunda: busca as quebras (posicionamento,
// público, conjunto) e delas deriva as alavancas concretas (segmentacao,
// posicionamentos, conjuntos_pausar) que a execução aplica no targeting.

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const metaCampaignId: string | undefined = body?.meta_campaign_id;
    if (!metaCampaignId) {
      return NextResponse.json({ success: false, error: 'meta_campaign_id é obrigatório' }, { status: 400 });
    }

    const config = await getAgentConfig('gestor-meta-ads');
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Agente gestor-meta-ads não sincronizado ou inativo' },
        { status: 400 }
      );
    }

    const { data: campanha } = await supabaseServer
      .from('meta_campaigns')
      .select('meta_campaign_id, nome, objetivo, ativo')
      .eq('meta_campaign_id', metaCampaignId)
      .maybeSingle();
    if (!campanha) {
      return NextResponse.json({ success: false, error: 'Campanha não encontrada (sincronize antes)' }, { status: 404 });
    }

    const { data: metricRows } = await supabaseServer
      .from('meta_campaign_metrics')
      .select('*')
      .eq('meta_campaign_id', metaCampaignId)
      .order('data', { ascending: false })
      .limit(1);
    const m = metricRows?.[0];
    if (!m) {
      return NextResponse.json({ success: false, error: 'Campanha sem métricas sincronizadas' }, { status: 400 });
    }

    const { data: diagRows } = await supabaseServer
      .from('meta_ai_diagnostics')
      .select('*')
      .eq('meta_campaign_id', metaCampaignId)
      .order('data', { ascending: false })
      .limit(1);
    const diag = diagRows?.[0];

    // Análise Profunda: busca as quebras (posicionamento, público, conjunto) para
    // ancorar o plano. Se falhar, segue só com métricas agregadas.
    let analysis: CampaignAnalysis | null = null;
    try {
      analysis = await fetchCampaignAnalysis(metaCampaignId, { preset: 'last_30d' });
    } catch (e) {
      console.error('[plan] não consegui buscar quebras (segue só com métricas):', e);
    }
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
${fmtAdsets(analysis!.byAdset as any)}`
      : '\n(Sem quebras da Análise Profunda — derive o que der só das métricas agregadas; deixe segmentacao/posicionamentos/conjuntos_pausar nulos ou vazios.)';

    const systemPrompt = buildSystemPrompt(config) + '\n\n' + PLAN_CONTRACT;

    const userMsg = `Gere o plano de otimização (escopo duplicar + ajustar) para a campanha abaixo.

Campanha: ${campanha.nome}
Objetivo atual: ${campanha.objetivo}
Ativa: ${campanha.ativo ? 'sim' : 'não'}

Métricas (lifetime, R$ em BRL):
${JSON.stringify(
  {
    impressoes: m.impressoes,
    cliques_link: m.cliques_link,
    ctr_pct: m.ctr,
    cpc: m.cpc,
    cpm: m.cpm,
    valor_gasto: m.valor_gasto,
    landing_page_views: m.landing_page_views,
    connect_rate: m.connect_rate,
    checkouts_iniciados: m.checkouts_iniciados,
    compras: m.compras,
    roas: m.roas,
    cpa: m.cpa,
    escala_status: m.escala_status,
  },
  null,
  2
)}

${diag ? `Diagnóstico mais recente:\nGargalo: ${diag.gargalo}\n${diag.diagnostico}` : 'Sem diagnóstico prévio — gere o plano a partir das métricas.'}
${blocoQuebras}`;

    const { raw, provider } = await gerarJSONComAgente(config, systemPrompt, userMsg);
    const plano = parseJSONFlexivel<any>(raw);

    const { data: registro, error: insErr } = await supabaseServer
      .from('meta_optimization_plans')
      .insert({
        meta_campaign_id: metaCampaignId,
        status: 'pendente',
        resumo: plano?.resumo || '',
        plano,
        modelo: provider,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, plano: registro });
  } catch (err: any) {
    console.error('[api/meta/optimize/plan] erro:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Falha ao gerar plano' }, { status: 500 });
  }
}
