import { NextResponse } from 'next/server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { gerarJSONComAgente, parseJSONFlexivel } from '@/lib/agents/generateWithProvider';
import { supabaseServer } from '@/lib/supabase-server';

// v1 da execução autônoma — ESCOPO ESTREITO: "duplicar + ajustar".
// Esta rota apenas GERA o plano (sem escrever no Meta). O plano fica 'pendente'
// até o orquestrador (Fernando) aprovar em /meta-ads/campanhas; só então a rota
// de execução cria a nova campanha (sempre em PAUSED).
const PLAN_CONTRACT = `
---

## CONTRATO DE SAÍDA — PLANO DE OTIMIZAÇÃO (OBRIGATÓRIO)
Você vai propor a OTIMIZAÇÃO desta campanha no escopo "duplicar + ajustar" (v1):
duplicar a campanha vencedora e aplicar ajustes de orçamento, objetivo, segmentação
e posicionamento. NÃO proponha criar criativo novo nesta versão.

Responda APENAS com um objeto JSON válido (sem cercas, sem texto fora do JSON):

{
  "resumo": "1-2 frases: o que será feito e por quê, ancorado no diagnóstico",
  "nova_campanha": {
    "nome_sugerido": "string curta com sufixo de otimização (ex: '<nome> — OTIM v1')",
    "objetivo_meta": "OUTCOME_TRAFFIC | OUTCOME_SALES | OUTCOME_AWARENESS | OUTCOME_ENGAGEMENT | OUTCOME_LEADS",
    "daily_budget_reais": number,
    "ajustes": [
      { "campo": "budget | objetivo | segmentacao | posicionamento", "de": "valor atual", "para": "valor proposto", "motivo": "curto" }
    ]
  },
  "execucao": {
    "daily_budget_reais": number,
    "optimization_goal": "LINK_CLICKS | LANDING_PAGE_VIEWS | OFFSITE_CONVERSIONS | REACH | IMPRESSIONS | THRUPLAY | null (null = manter o da fonte)",
    "remover_audience_network": true | false,
    "somente_mobile": true | false
  },
  "racional_80x10x10": "como a mudança melhora connect/checkout/purchase rate ou o KPI do objetivo",
  "riscos": "o que monitorar nas primeiras 48h"
}

Regras:
- Respeite o objetivo atual da campanha; só proponha mudar o objetivo se o diagnóstico justificar
  e a etapa do funil estiver madura (ex.: tráfego validado → conversão).
- daily_budget_reais coerente com o gasto atual e com a regra de escala (vertical 10-20%/dia).
- 2 a 5 ajustes objetivos. Nada de criar criativo novo nesta v1.
- O bloco "execucao" traduz os ajustes em parâmetros CONCRETOS que serão aplicados via Meta API.
  Só use optimization_goal compatível com o objetivo (ex.: LANDING_PAGE_VIEWS p/ tráfego). Se não
  tiver certeza, use null (mantém o da campanha-fonte).`;

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

${diag ? `Diagnóstico mais recente:\nGargalo: ${diag.gargalo}\n${diag.diagnostico}` : 'Sem diagnóstico prévio — gere o plano a partir das métricas.'}`;

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
