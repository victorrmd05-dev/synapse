import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingBag, BarChart3 } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  change?: number;
  isPositive?: boolean;
  icon: React.ReactNode;
}

function SummaryCard({ label, value, change, isPositive, icon }: SummaryCardProps) {
  return (
    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3 hover:border-[#6366F1]/30 transition-all group">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-[#2A2A38] rounded-lg text-[#8B8BA0] group-hover:text-[#6366F1] transition-colors">
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-[12px] font-medium ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[#8B8BA0] text-[13px] mb-1">{label}</p>
        <h3 className="text-[#F1F1F3] text-2xl font-bold tracking-tight">{value}</h3>
      </div>
    </div>
  );
}

interface SummaryHeaderProps {
  metrics: {
    investimento: number;
    cpa: number;
    roas: number;
    vendas: number;
    faturamento: number;
  };
}

export function SummaryHeader({ metrics }: SummaryHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard 
        label="Investimento" 
        value={`R$ ${metrics.investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
        change={12.5}
        isPositive={false} // Aumento de gasto costuma ser marcado como negativo ou neutro dependendo do contexto, mas aqui vou seguir a lógica de ROI
        icon={<DollarSign size={20} />}
      />
      <SummaryCard 
        label="CPA Médio" 
        value={`R$ ${metrics.cpa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
        change={8.2}
        isPositive={true} // Queda no CPA é positivo
        icon={<Target size={20} />}
      />
      <SummaryCard 
        label="Vendas Totais" 
        value={metrics.vendas} 
        change={15.3}
        isPositive={true}
        icon={<ShoppingBag size={20} />}
      />
      <SummaryCard 
        label="ROAS Global" 
        value={metrics.roas.toFixed(2)} 
        change={5.4}
        isPositive={true}
        icon={<BarChart3 size={20} />}
      />
    </div>
  );
}
