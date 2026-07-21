import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMetaCampaigns,
  fetchMetaInsights,
  fetchAccountInfo,
  type DateParams,
} from '@/lib/meta-api';
import { supabaseServer } from '@/lib/supabase-server';

// Sempre no servidor, sem cache (dados de anúncios são voláteis).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '';

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

/** Heurística simples de escala — refinada depois pelo agente Gestor-Meta-Ads. */
function calcEscalaStatus(roas: number, compras: number, gasto: number, lpViews: number): string {
  if (compras > 0 && roas >= 2) return 'escalavel';
  if (compras > 0) return 'otimizar';
  if (gasto > 0 && lpViews === 0) return 'nao_escalar';
  return 'otimizar';
}

/**
 * Sincroniza o dashboard com a conta Meta configurada no .env.local, respeitando
 * a janela de data escolhida no cockpit (?range=last_7d | ?since=&until=).
 * Continua PERSISTINDO no Supabase (meta_campaigns / meta_campaign_metrics) — a
 * lista de campanhas e as rotas optimize/diagnose leem dessas tabelas.
 */
async function handle(req: NextRequest) {
  if (!AD_ACCOUNT_ID) {
    return NextResponse.json(
      { success: false, error: 'META_AD_ACCOUNT_ID não configurado no .env.local' },
      { status: 400 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const since = sp.get('since') || undefined;
  const until = sp.get('until') || undefined;
  const preset = sp.get('range') || 'last_30d';
  const date: DateParams = since && until ? { since, until } : { preset };
  const rangeLabel = since && until ? `${since}..${until}` : preset;

  try {
    // 1. Campanhas (atributos) + 2. Insights (métricas, na janela) + 3. Conta real
    const [campaigns, insights, account] = await Promise.all([
      fetchMetaCampaigns(),
      fetchMetaInsights(date),
      fetchAccountInfo(),
    ]);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma campanha retornada pela Meta (verifique token/conta)' },
        { status: 502 }
      );
    }

    const insightsById = new Map(insights.map((i) => [i.meta_campaign_id, i]));
    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const relatorio: { id: string; nome: string; ok: boolean; erro?: string }[] = [];
    const enrichedCampaigns: any[] = [];

    for (const c of campaigns) {
      const m = insightsById.get(c.id);

      // Upsert da campanha (atributos)
      const ativo = (c.effective_status || c.status) === 'ACTIVE';
      const { error: campErr } = await supabaseServer
        .from('meta_campaigns')
        .upsert(
          {
            meta_campaign_id: c.id,
            ad_account_id: AD_ACCOUNT_ID,
            nome: c.name,
            status: c.status,
            effective_status: c.effective_status,
            objetivo: c.objective,
            ativo,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'meta_campaign_id' }
        );

      if (campErr) {
        relatorio.push({ id: c.id, nome: c.name, ok: false, erro: campErr.message });
        continue;
      }

      let metricsObj = null;

      // Métricas derivadas (só se houve entrega)
      if (m) {
        const connect_rate = Math.min(safeDiv(m.landing_page_views, m.cliques_link), 1);
        const conversao_lp = safeDiv(m.checkouts_iniciados, m.landing_page_views);
        const conversao_checkout = safeDiv(m.compras, m.checkouts_iniciados);
        const conversao_global = safeDiv(m.compras, m.cliques_link);
        const cpa = safeDiv(m.valor_gasto, m.compras);
        const escala_status = calcEscalaStatus(
          m.roas,
          m.compras,
          m.valor_gasto,
          m.landing_page_views
        );

        metricsObj = {
          meta_campaign_id: c.id,
          data: hoje,
          impressoes: m.impressoes,
          alcance: m.alcance,
          frequencia: m.frequencia,
          cliques_link: m.cliques_link,
          ctr: m.ctr,
          cpc: m.cpc,
          cpm: m.cpm,
          valor_gasto: m.valor_gasto,
          landing_page_views: m.landing_page_views,
          checkouts_iniciados: m.checkouts_iniciados,
          compras: m.compras,
          valor_conversao: m.valor_conversao,
          roas: m.roas,
          cpa,
          connect_rate,
          conversao_lp,
          conversao_checkout,
          conversao_global,
          escala_status,
        };

        const { error: metricErr } = await supabaseServer
          .from('meta_campaign_metrics')
          .upsert(metricsObj, { onConflict: 'meta_campaign_id,data' });

        if (metricErr) {
          relatorio.push({ id: c.id, nome: c.name, ok: false, erro: metricErr.message });
          continue;
        }
      }

      enrichedCampaigns.push({
        id: c.id,
        meta_campaign_id: c.id,
        ad_account_id: AD_ACCOUNT_ID,
        nome: c.name,
        status: c.status,
        objetivo: c.objective,
        ativo,
        criado_em: new Date().toISOString(),
        metrics: metricsObj
      });

      relatorio.push({ id: c.id, nome: c.name, ok: true });
    }

    const okCount = relatorio.filter((r) => r.ok).length;

    return NextResponse.json({
      success: true,
      message: `Sync finalizado: ${okCount}/${campaigns.length} campanhas`,
      sincronizado_em: new Date().toISOString(),
      range: rangeLabel,
      total_campanhas: campaigns.length,
      com_metricas: insights.length,
      relatorio,
      campaigns: enrichedCampaigns,
      account: account || {
        id: AD_ACCOUNT_ID,
        name: 'Conta Meta Ads',
        currency: 'BRL',
      },
    });
  } catch (err: any) {
    console.error('[api/meta/sync] erro:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Falha no sync da Meta' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
