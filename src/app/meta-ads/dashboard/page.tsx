"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { SummaryHeader } from '@/components/dashboard/SummaryHeader';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { ClaudeAdsHealth } from '@/components/dashboard/ClaudeAdsHealth';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Campaign, AIDiagnostic } from '@/types';
import {
  RangeSelection,
  DEFAULT_RANGE,
  loadRange,
  saveRange,
  rangeToQuery,
  rangeLabel,
} from '@/lib/date-range';

interface MetaAccount {
  id: string;
  name: string;
  currency: string;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [isSyncing, setIsSyncing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [account, setAccount] = useState<MetaAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Record<string, AIDiagnostic>>({});
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState({ done: 0, total: 0 });
  const [range, setRange] = useState<RangeSelection>(DEFAULT_RANGE);

  // Restaura a janela de data salva no navegador ao montar.
  useEffect(() => {
    setRange(loadRange());
  }, []);

  // Dispara a análise de IA (Claude) para cada campanha em paralelo, sem bloquear o render.
  const fetchDiagnostics = useCallback(async (list: Campaign[]) => {
    const withMetrics = list.filter((c) => c.metrics);
    setIsAuditing(true);
    setAuditProgress({ done: 0, total: withMetrics.length });
    try {
      await Promise.all(
        withMetrics.map(async (c) => {
          try {
            const res = await fetch('/api/ai/diagnostic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignName: c.nome, metrics: c.metrics }),
            });
            const data = await res.json();
            if (data.success && data.diagnostic) {
              setDiagnostics((prev) => ({
                ...prev,
                [c.id]: {
                  id: `diag-${c.id}`,
                  campaign_id: c.id,
                  metrics_id: c.metrics!.id,
                  data: new Date().toISOString(),
                  gargalo: data.diagnostic.gargalo ?? 'nenhum',
                  diagnostico: data.diagnostic.diagnostico ?? '',
                  recomendacoes: data.diagnostic.recomendacoes ?? [],
                  prioridade: data.diagnostic.recomendacoes?.[0]?.prioridade ?? 'media',
                  criado_em: new Date().toISOString(),
                },
              }));
            }
          } catch {
            // Falha silenciosa por campanha — o card mostra "Analisando...".
          } finally {
            setAuditProgress((p) => ({ ...p, done: p.done + 1 }));
          }
        })
      );
    } finally {
      setIsAuditing(false);
    }
  }, []);

  // Botão "Rodar Auditoria Completa" — re-analisa todas as campanhas com IA.
  const handleRunAudit = useCallback(() => {
    if (campaigns.length > 0) void fetchDiagnostics(campaigns);
  }, [campaigns, fetchDiagnostics]);

  // Botão "Exportar Relatório PDF" — usa a impressão do navegador (Salvar como PDF).
  const handleExportPDF = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    setDiagnostics({});
    try {
      const res = await fetch(`/api/meta/sync?${rangeToQuery(range)}`, { method: 'GET' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao sincronizar com a Meta Ads.');
      }
      const list: Campaign[] = data.campaigns || [];
      setCampaigns(list);
      setAccount(data.account || null);
      setLastSync(data.synced_at || new Date().toISOString());
      // Análise de IA em background (não aguarda para liberar o dashboard).
      void fetchDiagnostics(list);
    } catch (err: any) {
      setError(err?.message || 'Erro desconhecido ao sincronizar.');
      setCampaigns([]);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchDiagnostics, range]);

  // Sincroniza automaticamente ao abrir e sempre que a janela de data mudar.
  useEffect(() => {
    handleSync();
  }, [handleSync]);

  // Aplica e persiste a nova janela de data (dispara re-sync via handleSync).
  const handleRangeChange = useCallback((sel: RangeSelection) => {
    saveRange(sel);
    setRange(sel);
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    if (activeFilter === 'Todas') return true;
    if (activeFilter === 'Escaláveis') return c.metrics?.escala_status === 'escalavel';
    if (activeFilter === 'Otimizar') return c.metrics?.escala_status === 'otimizar';
    if (activeFilter === 'Não Escalar') return c.metrics?.escala_status === 'nao_escalar';
    return true;
  });

  // Calcular métricas agregadas para o topo
  const aggregateMetrics = filteredCampaigns.reduce((acc, curr) => {
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
  }, { investimento: 0, impressoes: 0, cliques: 0, views: 0, checkouts: 0, vendas: 0, faturamento: 0 });

  const summaryData = {
    investimento: aggregateMetrics.investimento,
    cpa: aggregateMetrics.vendas > 0 ? aggregateMetrics.investimento / aggregateMetrics.vendas : 0,
    roas: aggregateMetrics.investimento > 0 ? aggregateMetrics.faturamento / aggregateMetrics.investimento : 0,
    vendas: aggregateMetrics.vendas,
    faturamento: aggregateMetrics.faturamento
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

  // Fatores reais que compõem a nota de saúde (0-100). Cada um é valor vs meta,
  // ponderado. A nota exibida é a SOMA dos pontos — 100% transparente no card.
  const auditFactors = (() => {
    if (aggregateMetrics.impressoes === 0) return [] as {
      label: string; valor: string; meta: string; peso: number; pontos: number;
    }[];
    const roas = summaryData.roas;
    const connectRate = funnelData.connectRate;
    const linkCtr = aggregateMetrics.cliques / aggregateMetrics.impressoes;
    const chkConv = funnelData.chkConv;
    const lpConv = funnelData.lpConv;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
    return [
      { label: 'ROAS', valor: `${roas.toFixed(2)}x`, meta: '3x', peso: 40, ratio: clamp(roas / 3) },
      { label: 'Connect Rate', valor: pct(connectRate), meta: '80%', peso: 20, ratio: clamp(connectRate / 0.8) },
      { label: 'CTR (link)', valor: pct(linkCtr, 2), meta: '2,5%', peso: 15, ratio: clamp(linkCtr / 0.025) },
      { label: 'Conv. Checkout', valor: pct(chkConv), meta: '10%', peso: 15, ratio: clamp(chkConv / 0.1) },
      { label: 'Conv. LP', valor: pct(lpConv), meta: '10%', peso: 10, ratio: clamp(lpConv / 0.1) },
    ].map(({ ratio, ...f }) => ({ ...f, pontos: Math.round(ratio * f.peso) }));
  })();
  const healthScore = auditFactors.reduce((s, f) => s + f.pontos, 0);

  // Distribuição de verba REAL: gasto por objetivo da campanha (não é mais hardcoded).
  const budgetDist = (() => {
    const bucket = { conversao: 0, trafego: 0, outros: 0 };
    let total = 0;
    for (const c of filteredCampaigns) {
      const gasto = c.metrics?.valor_gasto || 0;
      if (gasto <= 0) continue;
      total += gasto;
      const obj = (c.objetivo || '').toUpperCase();
      if (obj.includes('SALES') || obj.includes('CONVERSION') || obj.includes('LEAD')) {
        bucket.conversao += gasto;
      } else if (obj.includes('TRAFFIC') || obj.includes('LINK_CLICKS')) {
        bucket.trafego += gasto;
      } else {
        bucket.outros += gasto; // awareness, engagement, app promotion, etc.
      }
    }
    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
    return {
      total,
      conversao: { pct: pct(bucket.conversao), reais: bucket.conversao },
      trafego: { pct: pct(bucket.trafego), reais: bucket.trafego },
      outros: { pct: pct(bucket.outros), reais: bucket.outros },
    };
  })();
  const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="pb-10 max-w-[1400px] mx-auto px-4">
      <TopBar
        title="Performance Overview"
        subtitle={account ? `${account.name} · ${account.currency} · dados reais Meta Ads · ${rangeLabel(range)}` : 'Sincronizando com a Meta Ads...'}
        onSync={handleSync}
        isSyncing={isSyncing}
        actions={
          <DateRangePicker value={range} onChange={handleRangeChange} disabled={isSyncing} />
        }
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Erro ao sincronizar: {error}
        </div>
      )}

      {!error && !isSyncing && campaigns.length === 0 && (
        <div className="mt-4 rounded-lg border border-[#2A2A38] bg-[#1A1A24] px-4 py-3 text-sm text-[#8B8BA0]">
          Nenhuma campanha encontrada nesta conta de anúncios.
        </div>
      )}

      {/* Seção de Cards de Sumário */}
      <div className="mt-8 mb-6">
        <SummaryHeader metrics={summaryData} />
      </div>

      {/* Seção Principal: Funil e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-8">
          <ConversionFunnel metrics={funnelData} />
        </div>
        
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-6 flex-1 flex flex-col hover:border-[#6366F1]/30 transition-all group">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-[#F1F1F3] font-bold text-lg">Distribuição de Verba</h3>
              <span className="text-[10px] text-[#8B8BA0] uppercase tracking-wider">por objetivo · {rangeLabel(range)}</span>
            </div>

            {budgetDist.total <= 0 ? (
              <div className="flex-1 flex items-center justify-center text-[#8B8BA0] text-sm">
                Sem gasto no período.
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                {[
                  { nome: 'Conversão', data: budgetDist.conversao, bar: 'bg-gradient-to-r from-[#4338CA] to-[#6366F1]', txt: 'text-[#6366F1]' },
                  { nome: 'Tráfego', data: budgetDist.trafego, bar: 'bg-[#10B981]', txt: 'text-[#10B981]' },
                  { nome: 'Outros', data: budgetDist.outros, bar: 'bg-[#F59E0B]', txt: 'text-[#F59E0B]' },
                ].map((row) => (
                  <div key={row.nome}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[#F1F1F3] text-sm font-medium">{row.nome}</span>
                      <span className={`${row.txt} text-xs font-bold`}>
                        {row.data.pct}% <span className="text-[#8B8BA0] font-normal">· {brl(row.data.reais)}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.bar} rounded-full group-hover:brightness-110 transition-all`}
                        style={{ width: `${row.data.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ClaudeAdsHealth
            score={healthScore}
            factors={auditFactors}
            onRunAudit={handleRunAudit}
            isAuditing={isAuditing}
            auditProgress={auditProgress}
            onExportPDF={handleExportPDF}
          />
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
        {filteredCampaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            diagnostic={diagnostics[campaign.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
