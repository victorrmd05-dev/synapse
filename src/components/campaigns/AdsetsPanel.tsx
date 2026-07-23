import React, { useCallback, useEffect, useState } from 'react';
import { Layers, RefreshCw, Pause, Play } from 'lucide-react';

type AdsetSaude = 'escalar' | 'otimizar' | 'pausar';

interface AdsetRow {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  spend: number;
  impressoes: number;
  compras: number;
  roas: number;
  cpa: number;
  saude: AdsetSaude;
}

type ActionState = 'idle' | 'acting' | 'error';

interface AdsetsPanelProps {
  campaignId: string;
  /** Query string do período (ex.: "range=last_7d" ou "since=...&until=..."). */
  rangeQuery?: string;
  /** Rótulo humano do período (ex.: "Últimos 7 dias"). */
  rangeLabel?: string;
}

const SAUDE_STYLE: Record<AdsetSaude, { cls: string; label: string }> = {
  escalar: { cls: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20', label: 'ESCALAR' },
  otimizar: { cls: 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20', label: 'OTIMIZAR' },
  pausar: { cls: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20', label: 'PAUSAR' },
};

const brl = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function entregaBadge(effectiveStatus: string) {
  const on = effectiveStatus === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded border ${
        on
          ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20'
          : 'text-[#8B8BA0] bg-[#2A2A38]/50 border-[#2A2A38]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-[#22C55E] animate-pulse' : 'bg-[#8B8BA0]'}`} />
      {on ? 'Ativo' : effectiveStatus === 'PAUSED' ? 'Pausado' : effectiveStatus}
    </span>
  );
}

/**
 * Painel "Conjuntos de Anúncios" — sempre visível, sem depender da Análise
 * Profunda. Lê /api/meta/adsets/list e permite pausar/ativar cada conjunto
 * na conta real (reaproveita POST /api/meta/adset).
 */
export function AdsetsPanel({
  campaignId,
  rangeQuery = 'range=last_30d',
  rangeLabel = 'Últimos 30 dias',
}: AdsetsPanelProps) {
  const [rows, setRows] = useState<AdsetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [actionErr, setActionErr] = useState<Record<string, string>>({});

  const fetchAdsets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/adsets/list?campaignId=${campaignId}&${rangeQuery}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao listar os conjuntos.');
      setRows(data.adsets || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar os conjuntos.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, rangeQuery]);

  useEffect(() => {
    setRows([]);
    setActionState({});
    setActionErr({});
    fetchAdsets();
  }, [fetchAdsets]);

  const handleToggle = async (row: AdsetRow) => {
    const ativo = row.effective_status === 'ACTIVE';
    const alvo = ativo ? 'PAUSED' : 'ACTIVE';
    const ok = window.confirm(
      ativo
        ? `Pausar o conjunto "${row.name}" na conta REAL da Meta?\n\nIsso interrompe a entrega — reversível a qualquer momento.`
        : `Reativar o conjunto "${row.name}" na conta REAL da Meta?\n\nEle volta a entregar (e a gastar) imediatamente.`
    );
    if (!ok) return;
    setActionState((s) => ({ ...s, [row.id]: 'acting' }));
    try {
      const res = await fetch('/api/meta/adset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsetId: row.id, status: alvo }),
      });
      const data = await res.json();
      if (data.success) {
        setActionState((s) => ({ ...s, [row.id]: 'idle' }));
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, status: alvo, effective_status: alvo } : r))
        );
      } else {
        setActionState((s) => ({ ...s, [row.id]: 'error' }));
        setActionErr((e) => ({ ...e, [row.id]: data.error || 'Falha ao atualizar.' }));
      }
    } catch (e: any) {
      setActionState((s) => ({ ...s, [row.id]: 'error' }));
      setActionErr((er) => ({ ...er, [row.id]: e?.message || 'Erro de rede.' }));
    }
  };

  return (
    <div className="bg-[#0F0F13] border border-[#2A2A38] rounded-xl p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#6366F1]" />
          <h3 className="text-[15px] font-bold text-[#F1F1F3]">Conjuntos de Anúncios</h3>
        </div>
        <button
          onClick={fetchAdsets}
          disabled={loading}
          className="flex items-center gap-2 text-[#8B8BA0] hover:text-[#F1F1F3] px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
          title="Recarregar conjuntos"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      <p className="text-[#8B8BA0] text-[12px] mb-5">
        Entrega e métricas · {rangeLabel} — direto da Meta, com pausa/reativação por conjunto.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {loading && rows.length === 0 && !error && (
        <div className="flex items-center justify-center py-8 text-[#8B8BA0] text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Puxando os conjuntos da Meta...
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-8 text-[#8B8BA0] text-sm">
          Nenhum conjunto encontrado nesta campanha.
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-[#111116] border border-[#2A2A38] rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="text-[#8B8BA0] sticky top-0 bg-[#111116]">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Conjunto</th>
                  <th className="px-2 py-2 font-medium">Entrega</th>
                  <th className="px-2 py-2 font-medium text-right">Orçamento/dia</th>
                  <th className="px-2 py-2 font-medium text-right">Gasto</th>
                  <th className="px-2 py-2 font-medium text-right">Impressões</th>
                  <th className="px-2 py-2 font-medium text-right">ROAS</th>
                  <th className="px-2 py-2 font-medium text-right">CPA</th>
                  <th className="px-4 py-2 font-medium text-right">Saúde</th>
                  <th className="px-4 py-2 font-medium text-right">Controle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const state = actionState[r.id] || 'idle';
                  const ativo = r.effective_status === 'ACTIVE';
                  return (
                    <tr key={r.id} className="border-t border-[#1E1E28] hover:bg-[#16161d]">
                      <td className="px-4 py-2 text-[#F1F1F3] max-w-[220px] truncate" title={r.name}>
                        {r.name}
                      </td>
                      <td className="px-2 py-2">{entregaBadge(r.effective_status)}</td>
                      <td className="px-2 py-2 text-right text-[#F1F1F3]">
                        {r.daily_budget ? brl(Number(r.daily_budget) / 100) : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-[#F1F1F3]">{brl(r.spend)}</td>
                      <td className="px-2 py-2 text-right text-[#F1F1F3]">
                        {r.impressoes.toLocaleString('pt-BR')}
                      </td>
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
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${SAUDE_STYLE[r.saude].cls}`}
                        >
                          {SAUDE_STYLE[r.saude].label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleToggle(r)}
                          disabled={state === 'acting'}
                          title={state === 'error' ? actionErr[r.id] : ativo ? 'Pausar na conta real' : 'Reativar na conta real'}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-colors disabled:opacity-50 ${
                            state === 'error'
                              ? 'text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/10'
                              : 'text-[#F1F1F3] border-[#3A3A48] hover:bg-[#2A2A38]'
                          }`}
                        >
                          {state === 'acting' ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : ativo ? (
                            <Pause size={12} />
                          ) : (
                            <Play size={12} />
                          )}
                          {state === 'error' ? 'Erro' : ativo ? 'Pausar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
