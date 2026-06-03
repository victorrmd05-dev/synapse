import React from 'react';

interface FunnelStepProps {
  label: string;
  value: string;
  subLeft?: string;
  subRight?: string;
  width: string;
  nextWidth: string;
  color: string;
  isLast?: boolean;
}

function FunnelStep({ label, value, subLeft, subRight, width, nextWidth, color, isLast }: FunnelStepProps) {
  return (
    <div className="relative flex flex-col items-center w-full">
      {/* The Trapezoid */}
      <div 
        className="h-20 relative flex items-center justify-center transition-all duration-500 ease-out shadow-2xl border-t border-white/5"
        style={{ 
          width: width, 
          backgroundColor: color,
          clipPath: `polygon(0% 0%, 100% 0%, calc(50% + ${nextWidth}/2) 100%, calc(50% - ${nextWidth}/2) 100%)`,
          opacity: 1
        }}
      >
        <div className="flex flex-col items-center z-10 text-center px-4">
          <span className="text-[#D1D1D6] text-[11px] uppercase font-black tracking-[0.1em] mb-1.5 drop-shadow-md">{label}</span>
          <span className="text-white font-black text-2xl leading-none drop-shadow-lg">{value}</span>
        </div>
        {/* Subtle Gradient overlay for more realism */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Side Metrics (Positioned at the edges) */}
      {!isLast && (
        <div className="w-full h-14 flex items-center relative">
          {/* Central flow indicator */}
          <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
          
          {/* Left Metric (Cost) */}
          <div className="absolute left-0 lg:left-4 flex flex-col items-start bg-[#1A1A24]/60 backdrop-blur-sm p-2 rounded-lg">
            <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider mb-0.5">Custo/Etapa</span>
            <span className="text-[#FF5F5F] text-[15px] font-black tracking-tight">{subLeft}</span>
          </div>

          {/* Right Metric (Rate) */}
          <div className="absolute right-0 lg:right-4 flex flex-col items-end bg-[#1A1A24]/60 backdrop-blur-sm p-2 rounded-lg text-right">
            <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider mb-0.5">Taxa de Conversão</span>
            <span className="text-[#34D399] text-[15px] font-black tracking-tight">{subRight}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConversionFunnelProps {
  metrics: {
    impressoes: number;
    cliques: number;
    views: number;
    checkouts: number;
    vendas: number;
    ctr: number;
    connectRate: number;
    lpConv: number;
    chkConv: number;
    globalConv: number;
    cpc: number;
    cpv: number;
    cpc_chk: number;
    cpa: number;
  };
}

export function ConversionFunnel({ metrics }: ConversionFunnelProps) {
  return (
    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-10 flex flex-col h-full hover:border-[#6366F1]/40 transition-all overflow-hidden relative shadow-2xl">
      {/* Background Decorative Glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#6366F1]/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#10B981]/5 blur-[120px] pointer-events-none" />
      
      <div className="flex justify-between items-center mb-16 relative z-10">
        <div>
          <h3 className="text-[#F1F1F3] font-black text-3xl tracking-tighter">Funil de Conversão</h3>
          <p className="text-[#8B8BA0] text-sm mt-1.5 font-medium">Análise de eficiência operacional em tempo real</p>
        </div>
        <div className="text-right bg-gradient-to-br from-[#2A2A38] to-[#1A1A24] p-5 rounded-2xl border border-[#3A3A4D] shadow-xl">
          <p className="text-[#8B8BA0] text-[11px] uppercase font-black tracking-[0.2em] mb-2">Conv. Geral</p>
          <p className="text-[#10B981] font-black text-4xl leading-none">{(metrics.globalConv * 100).toFixed(2)}%</p>
        </div>
      </div>

      <div className="flex flex-col items-center flex-1 w-full max-w-[650px] mx-auto relative z-10 pb-4">
        <FunnelStep 
          label="Impressões" 
          value={metrics.impressoes.toLocaleString()} 
          subLeft={`R$ ${metrics.cpc.toFixed(2)}`}
          subRight={`${metrics.ctr.toFixed(2)}% CTR`}
          width="100%" 
          nextWidth="85%"
          color="#333345" 
        />
        
        <FunnelStep 
          label="Cliques" 
          value={metrics.cliques.toLocaleString()} 
          subLeft={`R$ ${metrics.cpv.toFixed(2)}`}
          subRight={`${(metrics.connectRate * 100).toFixed(1)}% Connect`}
          width="85%" 
          nextWidth="70%"
          color="#3F3F56" 
        />

        <FunnelStep 
          label="Views LP" 
          value={metrics.views.toLocaleString()} 
          subLeft={`R$ ${metrics.cpc_chk.toFixed(2)}`}
          subRight={`${(metrics.lpConv * 100).toFixed(1)}% Conv. LP`}
          width="70%" 
          nextWidth="55%"
          color="#4B4B67" 
        />

        <FunnelStep 
          label="Checkouts" 
          value={metrics.checkouts.toLocaleString()} 
          subLeft={`R$ ${metrics.cpa.toFixed(2)}`}
          subRight={`${(metrics.chkConv * 100).toFixed(1)}% Conv. Chk`}
          width="55%" 
          nextWidth="40%"
          color="#575778" 
        />

        <FunnelStep 
          label="Vendas" 
          value={metrics.vendas.toLocaleString()} 
          width="40%" 
          nextWidth="40%" 
          color="#6366F1" 
          isLast={true}
        />
      </div>
    </div>
  );
}
