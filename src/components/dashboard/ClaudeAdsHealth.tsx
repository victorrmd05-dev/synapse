import React from 'react';

/** Um fator do health score (ROAS, connect rate, etc.) já calculado. */
export interface AuditFactor {
  label: string;
  valor: string; // valor atual formatado (ex.: "2,64x")
  meta: string;  // meta formatada (ex.: "3x")
  peso: number;  // pontos máximos (ex.: 40)
  pontos: number; // pontos obtidos (0..peso)
}

interface ClaudeAdsHealthProps {
  score?: number;
  factors?: AuditFactor[];
  onRunAudit?: () => void;
  isAuditing?: boolean;
  auditProgress?: { done: number; total: number };
  onExportPDF?: () => void;
}

/** Nota em letra a partir do score 0-100. */
function letra(s: number): string {
  if (s >= 90) return 'A';
  if (s >= 75) return 'B';
  if (s >= 60) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

export const ClaudeAdsHealth = ({
  score = 0,
  factors = [],
  onRunAudit,
  isAuditing = false,
  auditProgress,
  onExportPDF,
}: ClaudeAdsHealthProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 75) return 'text-[#10B981]';
    if (s >= 60) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getScoreBg = (s: number) => {
    if (s >= 75) return 'bg-[#10B981]/10 border-[#10B981]/30';
    if (s >= 60) return 'bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'bg-[#EF4444]/10 border-[#EF4444]/30';
  };

  // Cor de cada fator conforme quanto da meta bateu.
  const fatorCor = (f: AuditFactor) => {
    const r = f.peso > 0 ? f.pontos / f.peso : 0;
    if (r >= 0.75) return { txt: 'text-[#10B981]', bar: 'bg-[#10B981]' };
    if (r >= 0.5) return { txt: 'text-[#F59E0B]', bar: 'bg-[#F59E0B]' };
    return { txt: 'text-[#EF4444]', bar: 'bg-[#EF4444]' };
  };

  return (
    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-6 hover:border-[#6366F1]/50 transition-all flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#6366F1] animate-pulse">✦</span>
            <h3 className="text-[#F1F1F3] font-bold text-sm uppercase tracking-wider">Claude Ads Audit</h3>
          </div>
          <p className="text-[#8B8BA0] text-xs">Nota de saúde 0–100 · ponderada das métricas reais</p>
        </div>

        {/* Score Ring */}
        <div className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${getScoreBg(score)}`}>
          <span className={`text-xl font-black leading-none ${getScoreColor(score)}`}>{score}</span>
          <span className={`text-[9px] font-bold ${getScoreColor(score)}`}>Nota {letra(score)}</span>
        </div>
      </div>

      {/* Fatores reais que compõem a nota */}
      {factors.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {factors.map((f) => {
            const cor = fatorCor(f);
            return (
              <div key={f.label}>
                <div className="flex justify-between items-baseline text-[11px] mb-1">
                  <span className="text-[#F1F1F3] font-medium">{f.label}</span>
                  <span className="text-[#8B8BA0]">
                    <span className={cor.txt}>{f.valor}</span> / meta {f.meta}
                    <span className="text-[#5A5A6E]"> · {f.pontos}/{f.peso}pts</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#2A2A38] rounded-full overflow-hidden">
                  <div className={`h-full ${cor.bar} rounded-full transition-all`} style={{ width: `${f.peso > 0 ? (f.pontos / f.peso) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[#8B8BA0] text-xs text-center py-4">
          Sincronize as campanhas para calcular a nota.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onRunAudit}
          disabled={isAuditing || !onRunAudit}
          className="w-full py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAuditing ? (
            <>
              <span>
                Auditando
                {auditProgress ? ` ${auditProgress.done}/${auditProgress.total}` : '...'}
              </span>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </>
          ) : (
            <>
              <span>Rodar Auditoria Completa</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </>
          )}
        </button>
        <button
          onClick={onExportPDF}
          disabled={!onExportPDF}
          className="w-full py-2.5 bg-[#2A2A38] hover:bg-[#3A3A48] text-[#F1F1F3] text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-[#3A3A48] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>Exportar Relatório PDF</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
      </div>
    </div>
  );
};
