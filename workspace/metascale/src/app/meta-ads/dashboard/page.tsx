"use client";

import React, { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { SummaryHeader } from '@/components/dashboard/SummaryHeader';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { ClaudeAdsHealth } from '@/components/dashboard/ClaudeAdsHealth';
import { Campaign, AIDiagnostic } from '@/types';

// Mock Data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    ad_account_id: 'acc1',
    meta_campaign_id: 'meta1',
    nome: 'CBO - Coleção Inverno - Drop V1',
    status: 'ACTIVE',
    objetivo: 'CONVERSIONS',
    ativo: true,
    criado_em: new Date().toISOString(),
    metrics: {
      id: 'm1',
      campaign_id: '1',
      data: new Date().toISOString(),
      impressoes: 15420,
      alcance: 12000,
      frequencia: 1.28,
      cliques_link: 345,
      ctr: 2.23,
      cpc: 1.45,
      cpm: 32.40,
      valor_gasto: 500.25,
      landing_page_views: 310,
      checkouts_iniciados: 45,
      compras: 6,
      valor_conversao: 1200.00,
      roas: 2.4,
      cpa: 83.37,
      connect_rate: 0.89, // 89%
      conversao_lp: 0.145, // 14.5%
      conversao_checkout: 0.133, // 13.3%
      conversao_global: 0.019, // 1.9%
      escala_status: 'escalavel',
      criado_em: new Date().toISOString()
    }
  },
  {
    id: '2',
    ad_account_id: 'acc1',
    meta_campaign_id: 'meta2',
    nome: 'ABO - Teste Criativos - Produto Y',
    status: 'ACTIVE',
    objetivo: 'CONVERSIONS',
    ativo: true,
    criado_em: new Date().toISOString(),
    metrics: {
      id: 'm2',
      campaign_id: '2',
      data: new Date().toISOString(),
      impressoes: 8500,
      alcance: 7900,
      frequencia: 1.07,
      cliques_link: 120,
      ctr: 1.41,
      cpc: 2.10,
      cpm: 29.60,
      valor_gasto: 252.00,
      landing_page_views: 65,
      checkouts_iniciados: 5,
      compras: 0,
      valor_conversao: 0,
      roas: 0,
      cpa: 0,
      connect_rate: 0.54, // 54%
      conversao_lp: 0.076, // 7.6%
      conversao_checkout: 0, // 0%
      conversao_global: 0, // 0%
      escala_status: 'nao_escalar',
      criado_em: new Date().toISOString()
    }
  }
];

const mockDiagnostics: Record<string, AIDiagnostic> = {
  '1': {
    id: 'd1',
    campaign_id: '1',
    metrics_id: 'm1',
    data: new Date().toISOString(),
    gargalo: 'nenhum',
    diagnostico: 'Campanha performando acima das métricas alvo. Connect rate e conversões estão saudáveis.',
    recomendacoes: [{ texto: 'Escalar orçamento em 20%', prioridade: 'alta' }],
    prioridade: 'alta',
    criado_em: new Date().toISOString()
  },
  '2': {
    id: 'd2',
    campaign_id: '2',
    metrics_id: 'm2',
    data: new Date().toISOString(),
    gargalo: 'Connect Rate (54%)',
    diagnostico: 'Apenas 54% dos cliques chegam na LP. Isso indica problema no tempo de carregamento ou desalinhamento entre o criativo e a página.',
    recomendacoes: [
      { texto: 'Otimizar tempo de carregamento da LP', prioridade: 'alta' },
      { texto: 'Pausar criativos com maior gap de clique x view', prioridade: 'media' }
    ],
    prioridade: 'alta',
    criado_em: new Date().toISOString()
  }
};

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    // Simular sync
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const filteredCampaigns = mockCampaigns.filter(c => {
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

  return (
    <div className="pb-10 max-w-[1400px] mx-auto px-4">
      <TopBar 
        title="Performance Overview" 
        subtitle="Métricas consolidadas de todas as suas fontes de tráfego" 
        onSync={handleSync}
        isSyncing={isSyncing}
      />

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
            <h3 className="text-[#F1F1F3] font-bold text-lg mb-4">Distribuição de Verba</h3>
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[#F1F1F3] text-sm font-medium">Conversão</span>
                  <span className="text-[#6366F1] text-xs font-bold">85%</span>
                </div>
                <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4338CA] to-[#6366F1] w-[85%] rounded-full group-hover:brightness-110 transition-all" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[#F1F1F3] text-sm font-medium">Tráfego</span>
                  <span className="text-[#10B981] text-xs font-bold">10%</span>
                </div>
                <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] w-[10%] rounded-full group-hover:brightness-110 transition-all" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[#F1F1F3] text-sm font-medium">Outros</span>
                  <span className="text-[#F59E0B] text-xs font-bold">5%</span>
                </div>
                <div className="h-2 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                  <div className="h-full bg-[#F59E0B] w-[5%] rounded-full group-hover:brightness-110 transition-all" />
                </div>
              </div>
            </div>
          </div>

          <ClaudeAdsHealth score={78} />
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
            diagnostic={mockDiagnostics[campaign.id]} 
          />
        ))}
      </div>
    </div>
  );
}
