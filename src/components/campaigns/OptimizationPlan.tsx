import React from 'react';
import { Sparkles, Check, X, RefreshCw, ShieldCheck, AlertTriangle, Rocket, ExternalLink, Target } from 'lucide-react';

export interface OptimizationPlanRow {
  id: string;
  status: string; // pendente | aprovado | rejeitado | executado | erro
  resumo: string;
  plano: any;
  resultado: any;
  modelo: string;
  criado_em: string;
}

interface Props {
  plan: OptimizationPlanRow | null;
  isGenerating: boolean;
  isDeciding: boolean;
  isExecuting: boolean;
  onGenerate: () => void;
  onDecide: (decisao: 'aprovar' | 'rejeitar') => void;
  onExecute: () => void;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pendente: { label: 'Aguardando sua aprovação', cls: 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20' },
  aprovado: { label: 'Aprovado — pronto p/ executar', cls: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20' },
  rejeitado: { label: 'Rejeitado', cls: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20' },
  executado: { label: 'Executado (PAUSED no Meta)', cls: 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/20' },
  erro: { label: 'Erro na execução', cls: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20' },
};

export function OptimizationPlan({ plan, isGenerating, isDeciding, isExecuting, onGenerate, onDecide, onExecute }: Props) {
  return (
    <div className="bg-[#111116] border border-[#2A2A38] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 border-b border-[#2A2A38] pb-3">
        <h3 className="text-[12px] text-[#6366F1] font-medium flex items-center gap-2">
          <Sparkles size={14} />
          Plano de Otimização do Agente — v1 (duplicar + ajustar)
        </h3>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 text-[11px] bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {isGenerating ? 'Gerando…' : plan ? 'Gerar novo plano' : 'Gerar plano de otimização'}
        </button>
      </div>

      {!plan && (
        <p className="text-[#8B8BA0] text-[12px] py-6 text-center">
          Nenhum plano ainda. O agente duplica a campanha e <strong>realoca a verba</strong> com base na
          Análise Profunda — concentra nos posicionamentos e públicos vencedores e <strong>não reduplica os
          conjuntos que não vendem</strong>. Rode a Análise Profunda antes para o plano ficar mais preciso.
        </p>
      )}

      {plan && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${STATUS_STYLE[plan.status]?.cls || ''}`}>
              {STATUS_STYLE[plan.status]?.label || plan.status}
            </span>
            <span className="text-[10px] text-[#8B8BA0]">{plan.modelo}</span>
          </div>

          <p className="text-[12px] text-[#F1F1F3] leading-relaxed">{plan.resumo}</p>

          {plan.plano?.nova_campanha && (
            <div className="bg-[#0D0D14] border border-[#2A2A38] rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                <span className="text-[#8B8BA0]">Nova campanha: <span className="text-[#F1F1F3]">{plan.plano.nova_campanha.nome_sugerido}</span></span>
                <span className="text-[#8B8BA0]">Objetivo: <span className="text-[#F1F1F3]">{plan.plano.nova_campanha.objetivo_meta}</span></span>
                <span className="text-[#8B8BA0]">Budget/dia: <span className="text-[#F1F1F3]">R$ {plan.plano.nova_campanha.daily_budget_reais}</span></span>
              </div>

              <div className="space-y-2">
                {(plan.plano.nova_campanha.ajustes || []).map((a: any, i: number) => (
                  <div key={i} className="text-[11px] border-l-2 border-[#6366F1]/40 pl-3">
                    <span className="text-[#6366F1] font-medium uppercase text-[9px] tracking-wider">{a.campo}</span>
                    <p className="text-[#F1F1F3]">
                      <span className="text-[#8B8BA0] line-through">{a.de}</span>{' → '}{a.para}
                    </p>
                    <p className="text-[#8B8BA0] text-[10px]">{a.motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.plano?.execucao && (() => {
            const ex = plan.plano.execucao;
            const seg = ex.segmentacao;
            const pos = ex.posicionamentos;
            const cortes: any[] = Array.isArray(ex.conjuntos_pausar) ? ex.conjuntos_pausar : [];
            const temAlavanca =
              (seg && (seg.idade_min || seg.idade_max || (seg.generos && seg.generos.length))) ||
              (pos && ((pos.facebook_positions || []).length || (pos.instagram_positions || []).length)) ||
              cortes.length > 0;
            if (!temAlavanca) return null;
            const generosTxt = (g: string[]) =>
              g?.map((x) => (x === 'male' ? 'homens' : x === 'female' ? 'mulheres' : x)).join(' + ');
            return (
              <div className="bg-[#0D0D14] border border-[#6366F1]/30 rounded-lg p-4 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-[#6366F1] font-bold flex items-center gap-1">
                  <Target size={12} /> Realocação de mídia (da Análise Profunda)
                </p>

                {pos && ((pos.facebook_positions || []).length || (pos.instagram_positions || []).length) ? (
                  <div className="text-[11px]">
                    <span className="text-[#8B8BA0]">Posicionamentos: </span>
                    <span className="text-[#F1F1F3]">
                      {[...(pos.facebook_positions || []), ...(pos.instagram_positions || [])].join(', ')}
                    </span>
                    {pos.motivo && <p className="text-[#8B8BA0] text-[10px] mt-0.5">{pos.motivo}</p>}
                  </div>
                ) : null}

                {seg && (seg.idade_min || seg.idade_max || (seg.generos && seg.generos.length)) ? (
                  <div className="text-[11px]">
                    <span className="text-[#8B8BA0]">Público: </span>
                    <span className="text-[#F1F1F3]">
                      {seg.idade_min || '?'}–{seg.idade_max || '?'}
                      {seg.generos && seg.generos.length ? ` · ${generosTxt(seg.generos)}` : ''}
                    </span>
                    {seg.motivo && <p className="text-[#8B8BA0] text-[10px] mt-0.5">{seg.motivo}</p>}
                  </div>
                ) : null}

                {cortes.length > 0 && (
                  <div className="text-[11px]">
                    <span className="text-[#EF4444] font-medium">Conjuntos que NÃO serão duplicados ({cortes.length}):</span>
                    <ul className="mt-1 space-y-1">
                      {cortes.map((c: any, i: number) => (
                        <li key={i} className="text-[#8B8BA0] flex items-start gap-1.5">
                          <span className="text-[#EF4444] mt-0.5">✕</span>
                          <span><span className="text-[#F1F1F3]">{c.nome}</span> — {c.motivo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

          {plan.plano?.racional_80x10x10 && (
            <div className="text-[11px] text-[#8B8BA0] leading-relaxed">
              <span className="text-[#6366F1] font-medium flex items-center gap-1 mb-1"><ShieldCheck size={12} /> Racional 80×10×10</span>
              {plan.plano.racional_80x10x10}
            </div>
          )}

          {plan.plano?.riscos && (
            <div className="text-[11px] text-[#8B8BA0] leading-relaxed">
              <span className="text-[#EAB308] font-medium flex items-center gap-1 mb-1"><AlertTriangle size={12} /> Riscos (48h)</span>
              {plan.plano.riscos}
            </div>
          )}

          {plan.status === 'pendente' && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onDecide('aprovar')}
                disabled={isDeciding}
                className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              >
                <Check size={14} /> Aprovar e preparar execução
              </button>
              <button
                onClick={() => onDecide('rejeitar')}
                disabled={isDeciding}
                className="flex items-center gap-2 bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              >
                <X size={14} /> Rejeitar
              </button>
            </div>
          )}

          {plan.status === 'aprovado' && (
            <div className="space-y-3">
              <div className="bg-[#062112] border border-[#0c3b1f] rounded-lg p-3 text-[11px] text-[#4ade80]">
                ✅ Aprovado. Executar vai <strong>duplicar a campanha em PAUSED</strong> na sua conta
                Meta — nada começa a gastar até você dar o play no Gerenciador.
              </div>
              <button
                onClick={onExecute}
                disabled={isExecuting}
                className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              >
                {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Rocket size={14} />}
                {isExecuting ? 'Criando no Meta (PAUSED)…' : 'Executar — criar campanha otimizada (PAUSED)'}
              </button>
            </div>
          )}

          {plan.status === 'executado' && plan.resultado && (
            <div className="bg-[#0D0D14] border border-[#6366F1]/30 rounded-lg p-4 space-y-2 text-[11px]">
              <p className="text-[#6366F1] font-medium flex items-center gap-1"><Rocket size={12} /> Campanha criada em PAUSED</p>
              <p className="text-[#F1F1F3]">{plan.resultado.nome}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[#8B8BA0]">
                <span>Objetivo: <span className="text-[#F1F1F3]">{plan.resultado.objetivo}</span></span>
                <span>Conjuntos: <span className="text-[#F1F1F3]">{plan.resultado.adsets_criados}</span></span>
                <span>Anúncios: <span className="text-[#F1F1F3]">{plan.resultado.ads_criados}</span></span>
                {plan.resultado.conjuntos_pulados > 0 && (
                  <span>Perdedores cortados: <span className="text-[#F1F1F3]">{plan.resultado.conjuntos_pulados}</span></span>
                )}
              </div>
              {Array.isArray(plan.resultado.avisos) && plan.resultado.avisos.length > 0 && (
                <ul className="text-[#EAB308] list-disc pl-4">
                  {plan.resultado.avisos.map((av: string, i: number) => <li key={i}>{av}</li>)}
                </ul>
              )}
              {plan.resultado.manager_url && (
                <a
                  href={plan.resultado.manager_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#6366F1] hover:underline"
                >
                  Abrir no Gerenciador de Anúncios <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
