import React from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { getPerformanceColor } from '@/lib/colors';
import { CampaignMetrics } from '@/types';

interface MetaMetricsGridProps {
  metrics: CampaignMetrics;
  ticketMedio?: number;
  /** Rótulo da janela de data ativa (ex.: "Últimos 7 dias"). */
  rangeLabel?: string;
}

export function MetaMetricsGrid({ metrics, ticketMedio = 150, rangeLabel = 'Últimos 30 dias' }: MetaMetricsGridProps) {
  const m = metrics;
  
  const ctrColor = getPerformanceColor(m.ctr, 2.5); 
  const cpaTarget = ticketMedio * 0.3; 
  const cpaColor = getPerformanceColor(m.cpa, cpaTarget, true);
  const roasColor = getPerformanceColor(m.roas, 2.0);

  const lucroEstimado = (m.valor_conversao * 0.40) - m.valor_gasto; // Mock margem_produto = 0.4
  const margemLucro = m.valor_conversao > 0 ? (lucroEstimado / m.valor_conversao) * 100 : 0;

  return (
    <div className="mt-8 mb-6">
      <h3 className="text-[10px] text-[#8B8BA0] font-medium tracking-widest uppercase mb-4">
        Métricas Meta Ads — {rangeLabel}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Row 1 equivalent */}
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Impressões" value={m.impressoes.toLocaleString('pt-BR')} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Alcance" value={m.alcance.toLocaleString('pt-BR')} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Frequência" value={`${m.frequencia.toFixed(2)}x`} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Cliques no Link" value={m.cliques_link.toLocaleString('pt-BR')} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="CTR" value={`${m.ctr.toFixed(2)}%`} valueClassName={`${ctrColor} text-[16px] font-bold mt-1`} />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="CPC" value={`R$ ${m.cpc.toFixed(2)}`} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="CPM" value={`R$ ${m.cpm.toFixed(2)}`} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Valor Gasto" value={`R$ ${m.valor_gasto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>

        {/* Row 2 equivalent */}
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="LP Views" value={m.landing_page_views.toLocaleString('pt-BR')} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Checkouts Init." value={m.checkouts_iniciados.toLocaleString('pt-BR')} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Compras" value={m.compras.toLocaleString('pt-BR')} valueClassName="text-[#22C55E] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Valor Conversão" value={`R$ ${m.valor_conversao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} valueClassName="text-[#F1F1F3] text-[16px] font-bold mt-1" />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="ROAS" value={`${m.roas.toFixed(1)}x`} valueClassName={`${roasColor} text-[16px] font-bold mt-1`} />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="CPA" value={`R$ ${m.cpa.toFixed(2)}`} valueClassName={`${cpaColor} text-[16px] font-bold mt-1`} />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Lucro Estimado" value={`R$ ${lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} valueClassName={lucroEstimado > 0 ? 'text-[#22C55E] text-[16px] font-bold mt-1' : 'text-red-500 text-[16px] font-bold mt-1'} />
        </div>
        <div className="bg-[#111116] border border-[#2A2A38] rounded-md p-3">
          <MetricCard label="Margem Lucro" value={`${margemLucro.toFixed(1)}%`} valueClassName="text-[#22C55E] text-[16px] font-bold mt-1" />
        </div>
      </div>
    </div>
  );
}
