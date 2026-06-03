import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { getPerformanceColor } from '@/lib/colors';
import { Campaign, AIDiagnostic } from '@/types';

interface CampaignCardProps {
  campaign: Campaign;
  diagnostic?: AIDiagnostic | null;
  ticketMedio?: number;
}

export function CampaignCard({ campaign, diagnostic, ticketMedio = 100 }: CampaignCardProps) {
  const m = campaign.metrics;

  if (!m) return null;

  const ctrColor = getPerformanceColor(m.ctr, 2.5); // Example target 2.5%
  const cpaTarget = ticketMedio * 0.3; // 30% of ticket
  const cpaColor = getPerformanceColor(m.cpa, cpaTarget, true);
  const roasColor = getPerformanceColor(m.roas, 2.0);

  const crColor = getPerformanceColor(m.connect_rate * 100, 80);
  const lpColor = getPerformanceColor(m.conversao_lp * 100, 10);
  const chkColor = getPerformanceColor(m.conversao_checkout * 100, 10);
  const globColor = getPerformanceColor(m.conversao_global * 100, 1);

  return (
    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-[14px] flex flex-col hover:border-[#6366F1]/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[#F1F1F3] font-medium text-[15px] truncate max-w-[280px]">{campaign.nome}</h3>
        </div>
        <Badge status={m.escala_status} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-3">
        <MetricCard label="Impressões" value={m.impressoes.toLocaleString()} />
        <MetricCard label="Alcance" value={m.alcance.toLocaleString()} />
        <MetricCard label="Frequência" value={m.frequencia.toFixed(2)} />
        <MetricCard label="Gasto" value={`R$ ${m.valor_gasto.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard label="CTR" value={`${(m.ctr).toFixed(2)}%`} valueClassName={ctrColor} />
        <MetricCard label="CPC" value={`R$ ${m.cpc.toFixed(2)}`} />
        <MetricCard label="CPM" value={`R$ ${m.cpm.toFixed(2)}`} />
        <MetricCard label="CPA" value={`R$ ${m.cpa.toFixed(2)}`} valueClassName={cpaColor} />
      </div>

      <div className="h-[1px] bg-[#2A2A38] w-full my-4" />

      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard label="Connect Rate" value={`${(m.connect_rate * 100).toFixed(1)}%`} valueClassName={crColor} />
        <MetricCard label="Conv. LP" value={`${(m.conversao_lp * 100).toFixed(1)}%`} valueClassName={lpColor} />
        <MetricCard label="Conv. Checkout" value={`${(m.conversao_checkout * 100).toFixed(1)}%`} valueClassName={chkColor} />
        <MetricCard label="Conv. Global" value={`${(m.conversao_global * 100).toFixed(1)}%`} valueClassName={globColor} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <MetricCard label="ROAS" value={m.roas.toFixed(2)} valueClassName={roasColor} />
        <MetricCard label="Compras" value={m.compras} />
        <MetricCard label="Faturamento" value={`R$ ${m.valor_conversao.toFixed(2)}`} />
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#2A2A38]">
        <div className="text-[11px] text-[#8B8BA0] flex items-center gap-2 truncate pr-4">
          <span className="text-[#6366F1]">✦ IA:</span>
          {diagnostic ? diagnostic.gargalo : 'Analisando...'}
        </div>
        <Link 
          href={`/campanhas/${campaign.id}`}
          className="text-[12px] bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-3 py-1.5 rounded transition-colors whitespace-nowrap"
        >
          Ver Detalhes
        </Link>
      </div>
    </div>
  );
}
