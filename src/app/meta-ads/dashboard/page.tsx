"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { SummaryHeader } from '@/components/dashboard/SummaryHeader';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { ClaudeAdsHealth } from '@/components/dashboard/ClaudeAdsHealth';
import { Campaign, CampaignMetrics, EscalaStatus, AIDiagnostic } from '@/types';

// Mapeia uma linha do Supabase (meta_campaigns + última meta_campaign_metrics)
// para o shape Campaign usado pelos componentes do dashboard.
function mapRowToCampaign(camp: any, metric: any | undefined): Campaign {
  const metrics: CampaignMetrics | undefined = metric
    ? {
        id: metric.id,
        campaign_id: camp.meta_campaign_id,
        data: metric.data,
        impressoes: Number(metric.impressoes) || 0,
        alcance: Number(metric.alcance) || 0,
        frequencia: Number(metric.frequencia) || 0,
        cliques_link: Number(metric.cliques_link) || 0,
        ctr: Number(metric.ctr) || 0,
        cpc: Number(metric.cpc) || 0,
        cpm: Number(metric.cpm) || 0,
        valor_gasto: Number(metric.valor_gasto) || 0,
        landing_page_views: Number(metric.landing_page_views) || 0,
        checkouts_iniciados: Number(metric.checkouts_iniciados) || 0,
        compras: Number(metric.compras) || 0,
        valor_conversao: Number(metric.valor_conversao) || 0,
        roas: Number(metric.roas) || 0,
        cpa: Number(metric.cpa) || 0,
        connect_rate: Number(metric.connect_rate) || 0,
        conversao_lp: Number(metric.conversao_lp) || 0,
        conversao_checkout: Number(metric.conversao_checkout) || 0,
        conversao_global: Number(metric.conversao_global) || 0,
        escala_status: (metric.escala_status as EscalaStatus) || 'otimizar',
        criado_em: metric.criado_em,
      }
    : undefined;

  return {
    id: camp.meta_campaign_id,
    ad_account_id: camp.ad_account_id,
    meta_campaign_id: camp.meta_campaign_id,
    nome: camp.nome,
    status: camp.status,
    objetivo: camp.objetivo,
    ativo: camp.ativo,
    criado_em: camp.criado_em,
    metrics,
  };
}

// Agrupa objetivo da Meta em 3 buckets para a "Distribuição de Verba"
function bucketObjetivo(objetivo: string = ''): 'Conversão' | 'Tráfego' | 'Outros' {
  const o = objetivo.toUpperCase();
  if (o.includes('SALES') || o.includes('CONVERSION') || o.includes('PURCHASE')) return 'Conversão';
  if (o.includes('TRAFFIC') || o.includes('LINK_CLICK')) return 'Tráfego';
  return 'Outros';
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, AIDiagnostic>>({});
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchDados = useCallback(async () => {
    // Busca campanhas + a métrica mais recente de cada uma
    const { data: camps, error: campErr } = await supabase
      .from('meta_campaigns')
      .select('*')
      .order('ativo', { ascending: false });

    const { data: metrics } = await supabase
      .from('meta_campaign_metrics')
      .select('*')
      .order('data', { ascending: false });

    const { data: diags } = await supabase
      .from('meta_ai_diagnostics')
      .select('*')
      .order('data', { ascending: false });

    if (campErr || !camps) {
      setLoading(false);
      return;
    }

    // Diagnóstico mais recente por campanha
    const diagByCampaign: Record<string, AIDiagnostic> = {};
    for (const d of diags || []) {
      if (!diagByCampaign[d.meta_campaign_id]) {
        diagByCampaign[d.meta_campaign_id] = {
          id: d.id,
          campaign_id: d.meta_campaign_id,
          metrics_id: '',
          data: d.data,
          gargalo: d.gargalo || 'nenhum',
          diagnostico: d.diagnostico || '',
          recomendacoes: Array.isArray(d.recomendacoes) ? d.recomendacoes : [],
          prioridade: d.prioridade || 'media',
          criado_em: d.criado_em,
        };
      }
    }
    setDiagnostics(diagByCampaign);

    // Última métrica por campanha (metrics já vem ordenado por data desc)
    const latestByCampaign = new Map<string, any>();
    for (const m of metrics || []) {
      if (!latestByCampaign.has(m.meta_campaign_id)) {
        latestByCampaign.set(m.meta_campaign_id, m);
      }
    }

    const mapped = camps
      .map((c) => mapRowToCampaign(c, latestByCampaign.get(c.meta_campaign_id)))
      .filter((c) => c.metrics) // só campanhas com métricas sincronizadas
      .sort((a, b) => (b.metrics!.valor_gasto || 0) - (a.metrics!.valor_gasto || 0));

    setCampaigns(mapped);
    if (mapped.length > 0) {
      const maxAtualizado = camps.reduce(
        (acc, c) => (c.atualizado_em > acc ? c.atualizado_em : acc),
        camps[0].atualizado_em
      );
      setLastSync(maxAtualizado);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDados();
    const channel = supabase
      .channel('meta_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_campaigns' }, fetchDados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_campaign_metrics' }, fetchDados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_ai_diagnostics' }, fetchDados)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDados]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        setSyncError(json.error || 'Falha no sync');
      }
      await fetchDados();
    } catch (err: any) {
      setSyncError(err?.message || 'Falha ao chamar o sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/meta/diagnose', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        setSyncError(json.error || 'Falha na auditoria');
      }
      await fetchDados();
    } catch (err: any) {
      setSyncError(err?.message || 'Falha ao chamar a auditoria');
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'Todas') return true;
    if (activeFilter === 'Escaláveis') return c.metrics?.escala_status === 'escalavel';
    if (activeFilter === 'Otimizar') return c.metrics?.escala_status === 'otimizar';
    if (activeFilter === 'Não Escalar') return c.metrics?.escala_status === 'nao_escalar';
    return true;
  });

  const aggregateMetrics = filteredCampaigns.reduce(
    (acc, curr) => {
      const m = curr.metrics;
      if (!m) return acc;
      return {
        investimento: acc.investimento + m.valor_gasto,
        impressoes: acc.impressoes + m.impressoes,
        cliques: acc.cliques + m.cliques_link,
        views: acc.views + m.landing_page_views,
        checkouts: acc.checkouts + m.checkouts_iniciados,
        vendas: acc.vendas + m.compras,
        faturamento: acc.faturamento + m.valor_conversao,
      };
    },
    { investimento: 0, impressoes: 0, cliques: 0, views: 0, checkouts: 0, vendas: 0, faturamento: 0 }
  );

  const summaryData = {
    investimento: aggregateMetrics.investimento,
    cpa: aggregateMetrics.vendas > 0 ? aggregateMetrics.investimento / aggregateMetrics.vendas : 0,
    roas: aggregateMetrics.investimento > 0 ? aggregateMetrics.faturamento / aggregateMetrics.investimento : 0,
    vendas: aggregateMetrics.vendas,
    faturamento: aggregateMetrics.faturamento,
  };

  const funnelData = {
    impressoes: aggregateMetrics.impressoes,
    cliques: aggregateMetrics.cliques,
    views: aggregateMetrics.views,
    checkouts: aggregateMetrics.checkouts,
    vendas: aggregateMetrics.vendas,
    ctr: aggregateMetrics.impressoes > 0 ? (aggregateMetrics.cliques / aggregateMetrics.impressoes) * 100 : 0,
    connectRate: aggregateMetrics.cliques > 0 ? aggregateMetrics.views / aggregateMetrics.cliques : 0,
    lpConv: aggregateMetrics.views > 0 ? aggregateMetrics.checkouts / aggregateMetrics.views : 0,
    chkConv: aggregateMetrics.checkouts > 0 ? aggregateMetrics.vendas / aggregateMetrics.checkouts : 0,
    globalConv: aggregateMetrics.impressoes > 0 ? aggregateMetrics.vendas / aggregateMetrics.impressoes : 0,
    cpc: aggregateMetrics.cliques > 0 ? aggregateMetrics.investimento / aggregateMetrics.cliques : 0,
    cpv: aggregateMetrics.views > 0 ? aggregateMetrics.investimento / aggregateMetrics.views : 0,
    cpc_chk: aggregateMetrics.checkouts > 0 ? aggregateMetrics.investimento / aggregateMetrics.checkouts : 0,
    cpa: aggregateMetrics.vendas > 0 ? aggregateMetrics.investimento / aggregateMetrics.vendas : 0,
  };

  // Distribuição de verba real por objetivo
  const distribuicao = filteredCampaigns.reduce(
    (acc, c) => {
      const bucket = bucketObjetivo(c.objetivo);
      acc[bucket] += c.metrics?.valor_gasto || 0;
      return acc;
    },
    { Conversão: 0, Tráfego: 0, Outros: 0 } as Record<'Conversão' | 'Tráfego' | 'Outros', number>
  );
  const totalVerba = distribuicao.Conversão + distribuicao.Tráfego + distribuicao.Outros;
  const pct = (v: number) => (totalVerba > 0 ? Math.round((v / totalVerba) * 100) : 0);

  // Health score simples e data-driven (CTR + connect rate dos itens filtrados)
  const avgCtr = funnelData.ctr;
  const avgConnect = funnelData.connectRate;
  const healthScore = Math.round(
    Math.min((avgCtr / 2.5) * 50, 50) + Math.min(avgConnect * 50, 50)
  );

  const semVendas = aggregateMetrics.vendas === 0;

  return (
    <div className="pb-10 max-w-[1400px] mx-auto px-4">
      <TopBar
        title="Performance Overview"
        subtitle={
          lastSync
            ? `Última sincronização: ${new Date(lastSync).toLocaleString('pt-BR')}`
            : 'Métricas reais da sua conta Meta Ads'
        }
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {syncError && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-sm">
          Erro no sync: {syncError}
        </div>
      )}

      {/* Estado inicial: nenhum dado sincronizado ainda */}
      {!loading && campaigns.length === 0 && (
        <div className="mt-10 text-center bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-12">
          <h3 className="text-[#F1F1F3] text-lg font-bold mb-2">Nenhum dado sincronizado ainda</h3>
          <p className="text-[#8B8BA0] text-sm mb-6">
            Clique em <span className="text-[#6366F1] font-medium">Sync Data</span> para puxar suas
            campanhas reais da conta Meta Ads.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-[#6366F1] hover:bg-[#4f52e2] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSyncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
        </div>
      )}

      {campaigns.length > 0 && (
        <>
          {/* Banner honesto: funil de compra aguardando 1ª venda */}
          {semVendas && (
            <div className="mt-6 px-4 py-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-sm flex items-start gap-2">
              <span className="mt-0.5">⏳</span>
              <p>
                <span className="font-semibold">Funil de compra aguardando 1ª venda.</span>{' '}
                Suas campanhas atuais são de <strong>tráfego / reconhecimento</strong> — o topo do
                funil (impressões → cliques → views LP) reflete dados reais; checkout → venda → ROAS
                acendem automaticamente quando você subir a campanha de compras.
              </p>
            </div>
          )}

          {/* Cards de Sumário */}
          <div className="mt-8 mb-6">
            <SummaryHeader metrics={summaryData} />
          </div>

          {/* Funil + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            <div className="lg:col-span-8">
              <ConversionFunnel metrics={funnelData} />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-6 flex-1 flex flex-col hover:border-[#6366F1]/30 transition-all group">
                <h3 className="text-[#F1F1F3] font-bold text-lg mb-4">Distribuição de Verba</h3>
                <div className="space-y-6 flex-1 flex flex-col justify-center">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[#F1F1F3] text-sm font-medium">Conversão</span>
                      <span className="text-[#6366F1] text-xs font-bold">{pct(distribuicao.Conversão)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4338CA] to-[#6366F1] rounded-full group-hover:brightness-110 transition-all"
                        style={{ width: `${pct(distribuicao.Conversão)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[#F1F1F3] text-sm font-medium">Tráfego</span>
                      <span className="text-[#10B981] text-xs font-bold">{pct(distribuicao.Tráfego)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full group-hover:brightness-110 transition-all"
                        style={{ width: `${pct(distribuicao.Tráfego)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[#F1F1F3] text-sm font-medium">Outros</span>
                      <span className="text-[#F59E0B] text-xs font-bold">{pct(distribuicao.Outros)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F59E0B] rounded-full group-hover:brightness-110 transition-all"
                        style={{ width: `${pct(distribuicao.Outros)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <ClaudeAdsHealth score={healthScore} onAudit={handleAudit} isAuditing={isAuditing} />
            </div>
          </div>

          {/* Listagem de Campanhas */}
          <div className="flex items-center justify-between mb-6 pt-6 border-t border-[#2A2A38]">
            <div>
              <h2 className="text-2xl font-bold text-[#F1F1F3]">Campanhas Individuais</h2>
              <p className="text-[#8B8BA0] text-sm">Detalhamento por conjunto de anúncio e criativos</p>
            </div>
            <FilterPills
              filters={['Todas', 'Escaláveis', 'Otimizar', 'Não Escalar']}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} diagnostic={diagnostics[campaign.id] ?? null} />
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="mt-10 text-center text-[#8B8BA0] text-sm">Carregando dados reais…</div>
      )}
    </div>
  );
}
