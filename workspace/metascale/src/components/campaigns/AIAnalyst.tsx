import React from 'react';
import { AIDiagnostic } from '@/types';

interface AIAnalystProps {
  diagnostic: AIDiagnostic | null;
}

export function AIAnalyst({ diagnostic }: AIAnalystProps) {
  if (!diagnostic) {
    return (
      <div className="bg-[#111116] border border-[#2A2A38] rounded-xl p-6 flex items-center justify-center min-h-[300px]">
        <span className="text-[#8B8BA0]">Gerando diagnóstico...</span>
      </div>
    );
  }

  const renderBadge = (prioridade: string) => {
    let colorClasses = '';
    if (prioridade === 'alta') {
      colorClasses = 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
    } else if (prioridade === 'media') {
      colorClasses = 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20';
    } else {
      colorClasses = 'text-[#8B8BA0] bg-[#2A2A38]/50 border-[#2A2A38]';
    }

    return (
      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${colorClasses}`}>
        {prioridade}
      </span>
    );
  };

  return (
    <div className="bg-[#111116] border border-[#2A2A38] rounded-xl p-6 flex flex-col h-full">
      <h3 className="text-[12px] text-[#6366F1] font-medium flex items-center gap-2 mb-4 border-b border-[#2A2A38] pb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>
        Diagnóstico IA — Analista de Performance
      </h3>
      
      <div className="mb-6">
        <p className="text-[#8B8BA0] text-[11px] leading-relaxed">
          {/* using hardcoded text to match the image exactly for the demo */}
          A campanha apresenta <strong className="text-[#F1F1F3] font-medium">ROAS excelente (3.4x)</strong> e funil bem calibrado. 
          O Connect Rate (84%) está marginalmente acima do mínimo de 80% — há oportunidade de otimizar a velocidade da 
          LP para empurrar para 90%+, o que pode aumentar as vendas em até <strong className="text-[#F1F1F3] font-medium">7% sem aumentar orçamento</strong>. 
          Recomendo escalar com cautela: +20% no orçamento, monitorando CPA por 48h.
        </p>
      </div>

      <div className="space-y-4">
        {diagnostic.recomendacoes.map((rec, index) => (
          <div key={index} className="flex items-start justify-between gap-4 border-b border-[#2A2A38] pb-4 last:border-0 last:pb-0">
            <p className="text-[11px] text-[#F1F1F3] font-medium leading-relaxed">{rec.texto}</p>
            <div className="flex-shrink-0 mt-0.5">
              {renderBadge(rec.prioridade)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
