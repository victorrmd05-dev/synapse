import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number; // current percentage value (0-100)
  target: number; // target percentage value (0-100)
  isWarning?: boolean;
}

function ProgressBar({ label, value, target, isWarning }: ProgressBarProps) {
  const ratio = value / target;
  
  let colorClass = 'bg-[#EF4444]'; // Red
  let textClass = 'text-[#EF4444]';
  if (ratio >= 1.0) {
    colorClass = isWarning ? 'bg-[#EAB308]' : 'bg-[#22C55E]'; // Yellow or Green
    textClass = isWarning ? 'text-[#EAB308]' : 'text-[#22C55E]';
  } else if (ratio >= 0.7) {
    colorClass = 'bg-[#EAB308]'; // Yellow
    textClass = 'text-[#EAB308]';
  }

  const percentageStr = `${Math.min(100, Math.max(0, value)).toFixed(value % 1 === 0 ? 0 : 1)}%`;
  const targetStr = `${target}%`;

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-medium text-[#8B8BA0]">{label}</span>
        <div className="text-[11px]">
          <span className={`${textClass} font-bold`}>{percentageStr}</span>
          <span className="text-[#8B8BA0] ml-1">/ Meta: {targetStr}</span>
        </div>
      </div>
      <div className="h-[4px] w-full bg-[#2A2A38] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass} transition-all duration-500`} 
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

interface FunnelBarsProps {
  metrics: {
    connect_rate: number;
    conversao_lp: number;
    conversao_checkout: number;
    conversao_global: number;
    escala_status: string;
  };
}

const STATUS_BOX: Record<string, { box: string; title: string; sub: string; titleLabel: string; subLabel: string }> = {
  escalavel: {
    box: 'bg-[#062112] border-[#0c3b1f]',
    title: 'text-[#22C55E]',
    sub: 'text-[#4ade80]',
    titleLabel: 'Campanha ESCALÁVEL — critérios de escala atingidos',
    subLabel: 'ROAS e funil saudáveis — pode escalar com monitoramento',
  },
  otimizar: {
    box: 'bg-[#241d05] border-[#3d3308]',
    title: 'text-[#EAB308]',
    sub: 'text-[#facc15]',
    titleLabel: 'Campanha em OTIMIZAÇÃO — ainda não escalar',
    subLabel: 'Há gargalo(s) no funil — corrigir antes de aumentar verba',
  },
  nao_escalar: {
    box: 'bg-[#21060b] border-[#3d0c14]',
    title: 'text-[#EF4444]',
    sub: 'text-[#f87171]',
    titleLabel: 'Campanha NÃO ESCALAR — performance abaixo do mínimo',
    subLabel: 'ROAS insuficiente para cobrir custos — revisar oferta/criativo',
  },
};

export function FunnelBars({ metrics }: FunnelBarsProps) {
  const status = STATUS_BOX[metrics.escala_status] ?? STATUS_BOX.otimizar;

  return (
    <div className="bg-[#111116] border border-[#2A2A38] rounded-xl p-6">
      <h3 className="text-[12px] font-medium text-[#F1F1F3] mb-6 border-b border-[#2A2A38] pb-3">
        Funil 80×10×10 — Target Analysis
      </h3>

      <div className="space-y-1">
        <ProgressBar label="Connect Rate" value={metrics.connect_rate * 100} target={80} isWarning={metrics.connect_rate >= 0.8 && metrics.connect_rate < 0.9} />
        <ProgressBar label="Conversão LP" value={metrics.conversao_lp * 100} target={10} />
        <ProgressBar label="Conversão Checkout" value={metrics.conversao_checkout * 100} target={10} />
        <ProgressBar label="Conversão Global" value={metrics.conversao_global * 100} target={1} />
      </div>

      <div className={`mt-4 p-4 rounded-md border text-center ${status.box}`}>
        <h4 className={`text-[12px] font-bold ${status.title}`}>
          {status.titleLabel}
        </h4>
        <p className={`text-[11px] opacity-80 mt-1 ${status.sub}`}>
          {status.subLabel}
        </p>
      </div>
    </div>
  );
}
