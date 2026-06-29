import React from 'react';

interface ClaudeAdsHealthProps {
  score?: number;
  onAudit?: () => void;
  isAuditing?: boolean;
}

export const ClaudeAdsHealth = ({ score = 85, onAudit, isAuditing }: ClaudeAdsHealthProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-[#10B981]'; // Green A
    if (s >= 75) return 'text-[#10B981]'; // Green B
    if (s >= 60) return 'text-[#F59E0B]'; // Yellow C
    if (s >= 40) return 'text-[#EF4444]'; // Red D
    return 'text-[#EF4444]'; // Red F
  };

  const getScoreBg = (s: number) => {
    if (s >= 90) return 'bg-[#10B981]/10 border-[#10B981]/30';
    if (s >= 75) return 'bg-[#10B981]/10 border-[#10B981]/30';
    if (s >= 60) return 'bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'bg-[#EF4444]/10 border-[#EF4444]/30';
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
          <p className="text-[#8B8BA0] text-xs">Auditoria multicamada via Agentes IA</p>
        </div>
        
        {/* Score Ring */}
        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 ${getScoreBg(score)}`}>
          <span className={`text-xl font-black ${getScoreColor(score)}`}>{score}</span>
        </div>
      </div>

      {/* Agents Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#13131A] p-3 rounded-lg border border-[#2A2A38] flex flex-col gap-1">
          <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider">Copywriter IA</span>
          <span className="text-[#10B981] text-xs flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Online
          </span>
        </div>
        <div className="bg-[#13131A] p-3 rounded-lg border border-[#2A2A38] flex flex-col gap-1">
          <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider">Visual Designer</span>
          <span className="text-[#10B981] text-xs flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Online
          </span>
        </div>
        <div className="bg-[#13131A] p-3 rounded-lg border border-[#2A2A38] flex flex-col gap-1">
          <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider">Ads Strategist</span>
          <span className="text-[#10B981] text-xs flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Online
          </span>
        </div>
        <div className="bg-[#13131A] p-3 rounded-lg border border-[#2A2A38] flex flex-col gap-1">
          <span className="text-[#8B8BA0] text-[10px] uppercase font-bold tracking-wider">Audit Engine</span>
          <span className="text-[#10B981] text-xs flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> 250+ Checks
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onAudit}
          disabled={isAuditing}
          className="w-full py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{isAuditing ? 'Analisando campanhas…' : 'Rodar Auditoria Completa'}</span>
          <svg className={`w-4 h-4 ${isAuditing ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
        <button className="w-full py-2.5 bg-[#2A2A38] hover:bg-[#3A3A48] text-[#F1F1F3] text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-[#3A3A48]">
          <span>Exportar Relatório PDF</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
      </div>
    </div>
  );
};
