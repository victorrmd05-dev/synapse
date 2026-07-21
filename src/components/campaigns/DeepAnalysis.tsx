import React, { useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, Pause, Check } from 'lucide-react';
import { CampaignAnalysis, BreakdownRow, BreakdownStatus, DeepDiagnostic } from '@/types';

type ActionState = 'idle' | 'acting' | 'paused' | 'error';

interface DeepAnalysisProps {
  analysis: CampaignAnalysis | null;
  deep: DeepDiagnostic | null;
  loading: boolean;
  aiLoading: boolean;
  error: string | null;
  onRun: () => void;
  onPauseAdset?: (adsetId: string, nome: string) => Promise<{ success: boolean; error?: string }>;
}

const STATUS_STYLE: Record<BreakdownStatus, { cls: string; label: string }> = {
  escalar: { cls: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20', label: 'ESCALAR' },
  otimizar: { cls: 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20', label: 'OTIMIZAR' },
  pausar: { cls: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20', label: 'PAUSAR' },
};

const brl = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function StatusPill({ status }: { status: BreakdownStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function PauseButton({
  row,
  state,
  errMsg,
  onPause,
}: {
  row: BreakdownRow;
  state: ActionState;
  errMsg?: string;
  onPause: (row: BreakdownRow) => void;
}) {
  if (!row.id) return <span className="text-[#8B8BA0]">—</span>;
  if (state === 'paused') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#22C55E]">
        <Check size={12} /> Pausado
      </span>
    );
  }
  return (
    <button
      onClick={() => onPause(row)}
      disabled={state === 'acting'}
      title={state === 'error' ? errMsg : `Pausar "${row.label}" na conta real`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-colors disabled:opacity-50 ${
        state === 'error'
          ? 'text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/10'
          : 'text-[#F1F1F3] border-[#3A3A48] hover:bg-[#2A2A38]'
      }`}
    >
      {state === 'acting' ? (
        <RefreshCw size={12} className="animate-spin" />
      ) : (
        <Pause size={12} />
      )}
      {state === 'error' ? 'Erro' : 'Pausar'}
    </button>
  );
}

function BreakdownTable({
  title,
  rows,
  onPause,
  actionState,
  actionErr,
}: {
  title: string;
  rows: BreakdownRow[];
  onPause?: (row: BreakdownRow) => void;
  actionState?: Record<string, ActionState>;
  actionErr?: Record<string, string>;
}) {
  const cols = onPause ? 7 : 6;
  return (
    <div className="bg-[#111116] border border-[#2A2A38] rounded-xl overflow-hidden">
      <h4 className="text-[12px] font-semibold text-[#F1F1F3] px-4 py-3 border-b border-[#2A2A38]">
        {title}
      </h4>
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="text-[#8B8BA0] sticky top-0 bg-[#111116]">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Segmento</th>
              <th className="px-2 py-2 font-medium text-right">Gasto</th>
              <th className="px-2 py-2 font-medium text-right">Compras</th>
              <th className="px-2 py-2 font-medium text-right">ROAS</th>
              <th className="px-2 py-2 font-medium text-right">CPA</th>
              <th className="px-4 py-2 font-medium text-right">Status</th>
              {onPause && <th className="px-4 py-2 font-medium text-right">Controle</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className="px-4 py-6 text-center text-[#8B8BA0]">
                  Sem dados neste recorte.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1E1E28] hover:bg-[#16161d]">
                <td className="px-4 py-2 text-[#F1F1F3] max-w-[220px] truncate" title={r.label}>
                  {r.label}
                </td>
                <td className="px-2 py-2 text-right text-[#F1F1F3]">{brl(r.spend)}</td>
                <td className="px-2 py-2 text-right text-[#F1F1F3]">{r.compras}</td>
                <td
                  className={`px-2 py-2 text-right font-bold ${
                    r.roas >= 2 ? 'text-[#22C55E]' : r.roas >= 1 ? 'text-[#EAB308]' : 'text-[#EF4444]'
                  }`}
                >
                  {r.roas.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right text-[#F1F1F3]">
                  {r.compras > 0 ? brl(r.cpa) : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <StatusPill status={r.status} />
                </td>
                {onPause && (
                  <td className="px-4 py-2 text-right">
                    <PauseButton
                      row={r}
                      state={(r.id && actionState?.[r.id]) || 'idle'}
                      errMsg={r.id ? actionErr?.[r.id] : undefined}
                      onPause={onPause}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function prioColor(p: string) {
  if (p === 'alta') return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20';
  if (p === 'media') return 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20';
  return 'text-[#8B8BA0] bg-[#2A2A38]/50 border-[#2A2A38]';
}

export function DeepAnalysis({
  analysis,
  deep,
  loading,
  aiLoading,
  error,
  onRun,
  onPauseAdset,
}: DeepAnalysisProps) {
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [actionErr, setActionErr] = useState<Record<string, string>>({});

  const handlePause = async (row: BreakdownRow) => {
    if (!row.id || !onPauseAdset) return;
    const ok = window.confirm(
      `Pausar o conjunto "${row.label}" na conta REAL da Meta?\n\n` +
        `Isso interrompe a entrega desse conjunto. É reversível — você pode reativar depois no Gerenciador de Anúncios.`
    );
    if (!ok) return;
    setActionState((s) => ({ ...s, [row.id!]: 'acting' }));
    try {
      const res = await onPauseAdset(row.id, row.label);
      if (res.success) {
        setActionState((s) => ({ ...s, [row.id!]: 'paused' }));
      } else {
        setActionState((s) => ({ ...s, [row.id!]: 'error' }));
        setActionErr((e) => ({ ...e, [row.id!]: res.error || 'Falha ao pausar.' }));
      }
    } catch (err: any) {
      setActionState((s) => ({ ...s, [row.id!]: 'error' }));
      setActionErr((e) => ({ ...e, [row.id!]: err?.message || 'Falha ao pausar.' }));
    }
  };

  return (
    <div className="bg-[#0F0F13] border border-[#2A2A38] rounded-xl p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#6366F1]" />
          <h3 className="text-[15px] font-bold text-[#F1F1F3]">Análise Profunda — Media Buyer IA</h3>
        </div>
        <button
          onClick={onRun}
          disabled={loading || aiLoading}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading || aiLoading ? 'animate-spin' : ''} />
          {loading ? 'Puxando quebras...' : aiLoading ? 'IA analisando...' : 'Rodar Análise Profunda'}
        </button>
      </div>
      <p className="text-[#8B8BA0] text-[12px] mb-5">
        Quebra por posicionamento, público e conjunto — onde a verba converte e onde vaza.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-center py-10 text-[#8B8BA0] text-sm">
          Clique em <span className="text-[#6366F1] font-medium">Rodar Análise Profunda</span> para
          destrinchar esta campanha por posicionamento, público e conjunto.
        </div>
      )}

      {loading && !analysis && (
        <div className="flex items-center justify-center py-10 text-[#8B8BA0] text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Puxando as quebras da Meta...
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Diagnóstico de IA */}
          <div className="bg-[#111116] border border-[#6366F1]/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#6366F1]" />
              <span className="text-[12px] font-semibold text-[#6366F1]">Diagnóstico de Media Buying</span>
            </div>
            {aiLoading && !deep && (
              <p className="text-[#8B8BA0] text-[12px]">Gerando plano de mídia com IA...</p>
            )}
            {deep && (
              <>
                <p className="text-[#C7C7D1] text-[12px] leading-relaxed mb-4">{deep.resumo}</p>

                {deep.vazamentos?.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {deep.vazamentos.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <AlertTriangle size={13} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
                        <span className="text-[#C7C7D1]">
                          <strong className="text-[#F1F1F3]">{v.tipo}:</strong> {v.descricao}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {deep.acoes?.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-[#2A2A38]">
                    {deep.acoes.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <TrendingUp size={13} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[11px] text-[#F1F1F3] font-medium">{a.texto}</p>
                            {a.impacto && (
                              <p className="text-[10px] text-[#8B8BA0] mt-0.5">→ {a.impacto}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border flex-shrink-0 ${prioColor(
                            a.prioridade
                          )}`}
                        >
                          {a.prioridade}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tabelas de quebra */}
          <BreakdownTable title="📍 Por posicionamento" rows={analysis.byPlacement} />
          <BreakdownTable title="👥 Por público (idade · gênero)" rows={analysis.byAge} />
          <BreakdownTable
            title="🎯 Por conjunto"
            rows={analysis.byAdset}
            onPause={onPauseAdset ? handlePause : undefined}
            actionState={actionState}
            actionErr={actionErr}
          />
        </div>
      )}
    </div>
  );
}
