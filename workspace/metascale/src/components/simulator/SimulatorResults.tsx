import React from 'react';
import { MetricCard } from '@/components/ui/MetricCard';

interface SimulatorResultsProps {
  results: {
    cliques_est: number;
    visitas_lp_est: number;
    checkouts_est: number;
    vendas_est: number;
    faturamento_est: number;
    roas_est: number;
    cpa_est: number;
    lucro_est: number;
    margem_lucro_est: number;
    conversao_global_sim: number;
  };
}

export function SimulatorResults({ results }: SimulatorResultsProps) {
  const isEscalavel = results.roas_est >= 2 && results.conversao_global_sim >= 0.01;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Cliques Estimados" value={results.cliques_est.toLocaleString()} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Visitas LP" value={results.visitas_lp_est.toLocaleString()} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Checkouts" value={results.checkouts_est.toLocaleString()} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Vendas Previstas" value={results.vendas_est.toLocaleString()} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Faturamento Previsto" value={`R$ ${results.faturamento_est.toFixed(2)}`} valueClassName="text-[#22C55E]" />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="CPA Projetado" value={`R$ ${results.cpa_est.toFixed(2)}`} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="ROAS Projetado" value={results.roas_est.toFixed(2)} valueClassName={results.roas_est >= 2 ? 'text-[#22C55E]' : 'text-[#EAB308]'} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Lucro Líquido" value={`R$ ${results.lucro_est.toFixed(2)}`} valueClassName={results.lucro_est > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Margem de Lucro" value={`${results.margem_lucro_est.toFixed(1)}%`} />
        </div>
        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
          <MetricCard label="Conv. Global" value={`${(results.conversao_global_sim * 100).toFixed(1)}%`} />
        </div>
      </div>

      <div className={`border rounded-xl p-6 text-center ${isEscalavel ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
        <h3 className={`text-lg font-bold tracking-wider uppercase ${isEscalavel ? 'text-green-500' : 'text-yellow-500'}`}>
          {isEscalavel ? 'ESCALÁVEL' : 'OTIMIZAR'}
        </h3>
        <p className="text-sm text-[#8B8BA0] mt-1">
          {isEscalavel ? 'A projeção indica viabilidade de escala cobrindo custos e gerando lucro.' : 'Os parâmetros projetados não atingem as metas ideais para escala agressiva.'}
        </p>
      </div>
    </div>
  );
}
