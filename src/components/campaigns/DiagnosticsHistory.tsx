import React, { useCallback, useEffect, useState } from 'react';
import { marked } from 'marked';
import {
  History,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Maximize2,
  Minimize2,
  FileText,
} from 'lucide-react';

/** A IA às vezes grava recomendações como string, às vezes como objeto. */
type Recomendacao = string | { texto?: string; impacto?: string; prioridade?: string };

interface DiagnosticRow {
  id: string;
  meta_campaign_id: string;
  data: string;
  gargalo: string | null;
  diagnostico: string | null;
  recomendacoes: Recomendacao[] | null;
  prioridade: string | null;
  modelo: string | null;
  criado_em: string;
  /** Relatório completo em markdown (métricas + funil + Análise Profunda + plano). */
  relatorio_md?: string | null;
}

interface DiagnosticsHistoryProps {
  campaignId?: string | null;
  /** Mapa meta_campaign_id → nome, pra rotular as linhas quando mostrar todas. */
  campaignNames?: Record<string, string>;
  onClose: () => void;
}

function recTexto(r: Recomendacao): { texto: string; impacto?: string } {
  if (typeof r === 'string') return { texto: r };
  return { texto: r?.texto || JSON.stringify(r), impacto: r?.impacto };
}

function prioBadge(p: string | null) {
  const prio = p || 'media';
  const cls =
    prio === 'alta'
      ? 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20'
      : prio === 'media'
        ? 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20'
        : 'text-[#8B8BA0] bg-[#2A2A38]/50 border-[#2A2A38]';
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${cls}`}>
      {prio}
    </span>
  );
}

/** Estilo do markdown renderizado (relatório completo) — sem plugin typography. */
const MD_CLS =
  'text-[12px] leading-relaxed text-[#C7C7D1] ' +
  '[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#F1F1F3] [&_h1]:mb-3 ' +
  '[&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-[#F1F1F3] [&_h2]:mt-6 [&_h2]:mb-2 ' +
  '[&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-[#F1F1F3] [&_h3]:mt-4 [&_h3]:mb-1.5 ' +
  '[&_p]:my-2 [&_strong]:text-[#F1F1F3] [&_hr]:border-[#2A2A38] [&_hr]:my-5 ' +
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 ' +
  '[&_table]:w-full [&_table]:text-[11px] [&_table]:my-3 [&_table]:border-collapse ' +
  '[&_th]:text-left [&_th]:px-2 [&_th]:py-1.5 [&_th]:border-b [&_th]:border-[#2A2A38] [&_th]:text-[#8B8BA0] [&_th]:font-medium ' +
  '[&_td]:px-2 [&_td]:py-1.5 [&_td]:border-b [&_td]:border-[#1E1E28]';

/**
 * Modal de histórico dos diagnósticos de IA salvos (tabela meta_ai_diagnostics).
 * Lê GET /api/diagnostics/list; exclui via POST /api/diagnostics/delete;
 * relatório completo (relatorio_md) renderizado em tela cheia.
 */
export function DiagnosticsHistory({ campaignId, campaignNames, onClose }: DiagnosticsHistoryProps) {
  const [rows, setRows] = useState<DiagnosticRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soCampanha, setSoCampanha] = useState(Boolean(campaignId));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [maximizado, setMaximizado] = useState(false);
  const [relatorio, setRelatorio] = useState<DiagnosticRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = soCampanha && campaignId ? `?campaignId=${campaignId}&limit=50` : '?limit=50';
      const res = await fetch(`/api/diagnostics/list${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao listar diagnósticos.');
      setRows(data.diagnostics || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, soCampanha]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const nomeCampanha = (id: string) => campaignNames?.[id] || id;

  const handleDelete = async (d: DiagnosticRow) => {
    const ok = window.confirm(
      `Excluir este diagnóstico (${d.data || new Date(d.criado_em).toLocaleDateString('pt-BR')}) do histórico?\n\n` +
        `Apaga só o registro do banco — os arquivos .md em analises-ia/ ficam intactos.`
    );
    if (!ok) return;
    setDeletingId(d.id);
    try {
      const res = await fetch('/api/diagnostics/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRows((prev) => prev.filter((r) => r.id !== d.id));
        if (expandedId === d.id) setExpandedId(null);
      } else {
        alert(data.error || 'Falha ao excluir.');
      }
    } catch (e: any) {
      alert(e?.message || 'Erro de rede ao excluir.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={`bg-[#111116] border border-[#2A2A38] rounded-xl w-full flex flex-col ${
          maximizado ? 'max-w-[96vw] h-[94vh]' : 'max-w-3xl max-h-[85vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A38]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#6366F1]" />
            <h3 className="text-[15px] font-bold text-[#F1F1F3]">Histórico de Diagnósticos</h3>
          </div>
          <div className="flex items-center gap-3">
            {campaignId && (
              <label className="flex items-center gap-2 text-[11px] text-[#8B8BA0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={soCampanha}
                  onChange={(e) => setSoCampanha(e.target.checked)}
                  className="accent-[#6366F1]"
                />
                Só esta campanha
              </label>
            )}
            <button
              onClick={() => setMaximizado((m) => !m)}
              className="text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors"
              title={maximizado ? 'Restaurar tamanho' : 'Maximizar'}
            >
              {maximizado ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="m-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading && rows.length === 0 && !error && (
            <div className="flex items-center justify-center py-10 text-[#8B8BA0] text-sm gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Carregando histórico...
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-10 text-[#8B8BA0] text-sm px-6">
              Nenhum diagnóstico salvo{soCampanha ? ' para esta campanha' : ''} ainda.
              <br />
              Use <span className="text-[#6366F1]">Pedir diagnóstico desta campanha</span> ou rode a{' '}
              <span className="text-[#6366F1]">Análise Profunda</span> para gerar o primeiro.
            </div>
          )}

          {rows.length > 0 && (
            <table className="w-full text-[11px]">
              <thead className="text-[#8B8BA0] sticky top-0 bg-[#111116]">
                <tr className="text-left border-b border-[#2A2A38]">
                  <th className="px-5 py-2.5 font-medium">Data</th>
                  {!soCampanha && <th className="px-2 py-2.5 font-medium">Campanha</th>}
                  <th className="px-2 py-2.5 font-medium">Gargalo</th>
                  <th className="px-2 py-2.5 font-medium">Prioridade</th>
                  <th className="px-5 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const aberto = expandedId === d.id;
                  const colSpan = soCampanha ? 4 : 5;
                  return (
                    <React.Fragment key={d.id}>
                      <tr className="border-t border-[#1E1E28] hover:bg-[#16161d]">
                        <td className="px-5 py-2.5 text-[#F1F1F3] whitespace-nowrap">
                          {d.data || new Date(d.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        {!soCampanha && (
                          <td
                            className="px-2 py-2.5 text-[#C7C7D1] max-w-[180px] truncate"
                            title={nomeCampanha(d.meta_campaign_id)}
                          >
                            {nomeCampanha(d.meta_campaign_id)}
                          </td>
                        )}
                        <td className="px-2 py-2.5 text-[#F1F1F3] capitalize max-w-[200px] truncate" title={d.gargalo || ''}>
                          {d.gargalo || '—'}
                        </td>
                        <td className="px-2 py-2.5">{prioBadge(d.prioridade)}</td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          {d.relatorio_md && (
                            <button
                              onClick={() => setRelatorio(d)}
                              className="inline-flex items-center gap-1 px-2 py-1 mr-1.5 rounded border border-[#6366F1]/40 text-[#6366F1] hover:bg-[#6366F1]/10 text-[10px] font-medium transition-colors"
                              title="Abrir o relatório completo em tela cheia"
                            >
                              <FileText size={12} />
                              Relatório
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(aberto ? null : d.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 mr-1.5 rounded border border-[#3A3A48] text-[#F1F1F3] hover:bg-[#2A2A38] text-[10px] font-medium transition-colors"
                          >
                            {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {aberto ? 'Fechar' : 'Detalhes'}
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            disabled={deletingId === d.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-[10px] font-medium transition-colors disabled:opacity-50"
                            title="Excluir este diagnóstico do histórico"
                          >
                            {deletingId === d.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="border-t border-[#1E1E28] bg-[#0F0F13]">
                          <td colSpan={colSpan} className="px-5 py-4">
                            <p className="text-[12px] text-[#C7C7D1] leading-relaxed whitespace-pre-wrap mb-3">
                              {d.diagnostico || 'Sem texto de diagnóstico.'}
                            </p>
                            {Array.isArray(d.recomendacoes) && d.recomendacoes.length > 0 && (
                              <ul className="space-y-1.5">
                                {d.recomendacoes.map((r, i) => {
                                  const rec = recTexto(r);
                                  return (
                                    <li key={i} className="text-[11px] text-[#8B8BA0] flex gap-2">
                                      <span className="text-[#6366F1] flex-shrink-0">→</span>
                                      <span>
                                        {rec.texto}
                                        {rec.impacto && (
                                          <span className="block text-[10px] text-[#8B8BA0]/70 mt-0.5">
                                            → {rec.impacto}
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {d.modelo && (
                              <p className="text-[10px] text-[#8B8BA0]/70 mt-3">Modelo: {d.modelo}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Relatório completo em tela cheia */}
      {relatorio?.relatorio_md && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setRelatorio(null)}
        >
          <div
            className="bg-[#111116] border border-[#2A2A38] rounded-xl max-w-[96vw] w-full h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A38]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-[#6366F1]" />
                <h3 className="text-[14px] font-bold text-[#F1F1F3] truncate">
                  Relatório — {nomeCampanha(relatorio.meta_campaign_id)} ·{' '}
                  {relatorio.data || new Date(relatorio.criado_em).toLocaleDateString('pt-BR')}
                </h3>
              </div>
              <button
                onClick={() => setRelatorio(null)}
                className="text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors flex-shrink-0"
                title="Fechar relatório"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-8 py-6">
              <div
                className={MD_CLS}
                dangerouslySetInnerHTML={{ __html: marked.parse(relatorio.relatorio_md) as string }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
