"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  LayoutTemplate,
  Trash2,
  ExternalLink,
  Eye,
  X,
  RefreshCw,
  BadgeCheck,
  Wrench,
  Bot,
} from 'lucide-react';

interface LpRow {
  id: string;
  nome: string;
  slug: string;
  origem: string; // 'pipeline' | 'manual'
  design_id: string | null;
  codigo_html: string;
  url_publicada: string | null;
  validada: boolean;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
}

function origemBadge(origem: string) {
  const manual = origem === 'manual';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
        manual
          ? 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20'
          : 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/20'
      }`}
    >
      {manual ? <Wrench size={10} /> : <Bot size={10} />}
      {manual ? 'Manual' : 'Pipeline'}
    </span>
  );
}

/**
 * Biblioteca de Páginas — todas as landing pages (geradas pelo Designer ou
 * manuais) salvas no banco (lp_biblioteca): preview, link no ar, marcar como
 * "Validada (ROAS OK)" e excluir (banco + dashboard; Cloudflare é manual).
 */
export default function PaginasPage() {
  const [rows, setRows] = useState<LpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<LpRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [soValidadas, setSoValidadas] = useState(false);

  const fetchDados = useCallback(async () => {
    const { data, error } = await supabase
      .from('lp_biblioteca')
      .select('*')
      .order('validada', { ascending: false })
      .order('atualizado_em', { ascending: false });
    if (!error && data) setRows(data as LpRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDados();
    const channel = supabase
      .channel('lp_biblioteca_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lp_biblioteca' }, fetchDados)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDados]);

  const toggleValidada = async (lp: LpRow) => {
    // Otimista: marca na hora, reverte se o UPDATE falhar
    setRows((prev) => prev.map((r) => (r.id === lp.id ? { ...r, validada: !lp.validada } : r)));
    const { error } = await supabase
      .from('lp_biblioteca')
      .update({ validada: !lp.validada, atualizado_em: new Date().toISOString() })
      .eq('id', lp.id);
    if (error) {
      setRows((prev) => prev.map((r) => (r.id === lp.id ? { ...r, validada: lp.validada } : r)));
      alert('Falha ao atualizar: ' + error.message);
    }
  };

  const handleDelete = async (lp: LpRow) => {
    const ok = window.confirm(
      `Excluir "${lp.nome}" da biblioteca?\n\n` +
        `Apaga do banco e do dashboard. ` +
        `${lp.url_publicada ? 'A página NO AR no Cloudflare continua — exclua lá manualmente se quiser tirar do ar. ' : ''}` +
        `Arquivos locais em lps/ não são tocados.`
    );
    if (!ok) return;
    setDeletingId(lp.id);
    const { error } = await supabase.from('lp_biblioteca').delete().eq('id', lp.id);
    setDeletingId(null);
    if (error) {
      alert('Falha ao excluir: ' + error.message);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== lp.id));
      if (preview?.id === lp.id) setPreview(null);
    }
  };

  const visiveis = soValidadas ? rows.filter((r) => r.validada) : rows;

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
            <LayoutTemplate size={20} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Biblioteca de Páginas</h1>
            <p className="text-secondary text-sm">
              Todas as landing pages salvas — modelos prontos e páginas validadas com ROAS.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soValidadas}
            onChange={(e) => setSoValidadas(e.target.checked)}
            className="accent-[#22C55E]"
          />
          Só validadas (ROAS OK)
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-secondary text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando biblioteca...
        </div>
      )}

      {!loading && visiveis.length === 0 && (
        <div className="text-center bg-surface border border-surface-elevated rounded-xl p-12 mt-6">
          <h3 className="text-white text-lg font-bold mb-2">
            {soValidadas ? 'Nenhuma página validada ainda' : 'Biblioteca vazia'}
          </h3>
          <p className="text-secondary text-sm">
            {soValidadas
              ? 'Marque uma página como "Validada (ROAS OK)" quando a campanha provar retorno.'
              : 'Gere uma página no Design/Webmaster — ela entra aqui automaticamente.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
        {visiveis.map((lp) => (
          <div
            key={lp.id}
            className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
              lp.validada ? 'border-[#22C55E]/40' : 'border-surface-elevated hover:border-[#6366F1]/40'
            }`}
          >
            {/* Mini-preview (iframe escalado, sem interação) */}
            <button
              onClick={() => setPreview(lp)}
              className="block w-full h-44 bg-white overflow-hidden relative group"
              title="Abrir preview"
            >
              <iframe
                srcDoc={lp.codigo_html}
                sandbox=""
                scrolling="no"
                tabIndex={-1}
                className="w-[1200px] h-[720px] origin-top-left scale-[0.29] pointer-events-none border-0"
              />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-white leading-snug" title={lp.slug}>
                  {lp.nome}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {origemBadge(lp.origem)}
                  {lp.validada && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20">
                      <BadgeCheck size={10} />
                      ROAS OK
                    </span>
                  )}
                </div>
              </div>

              {lp.notas && <p className="text-[11px] text-secondary leading-relaxed">{lp.notas}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-surface-elevated">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleValidada(lp)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-colors ${
                      lp.validada
                        ? 'text-[#22C55E] border-[#22C55E]/40 hover:bg-[#22C55E]/10'
                        : 'text-secondary border-[#3A3A48] hover:bg-surface-elevated hover:text-white'
                    }`}
                    title={lp.validada ? 'Desmarcar validação' : 'Marcar como validada (campanha provou ROAS)'}
                  >
                    <BadgeCheck size={12} />
                    {lp.validada ? 'Validada' : 'Validar ROAS'}
                  </button>
                  {lp.url_publicada && (
                    <a
                      href={lp.url_publicada}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10 text-[10px] font-medium transition-colors"
                      title={lp.url_publicada}
                    >
                      <ExternalLink size={12} />
                      No Ar
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(lp)}
                  disabled={deletingId === lp.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-[10px] font-medium transition-colors disabled:opacity-50"
                  title="Excluir do banco e do dashboard (Cloudflare é manual)"
                >
                  {deletingId === lp.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview em tela cheia */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-surface border border-surface-elevated rounded-xl max-w-[96vw] w-full h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-elevated">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[14px] font-bold text-white truncate">{preview.nome}</span>
                {origemBadge(preview.origem)}
                {preview.validada && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20">
                    <BadgeCheck size={10} />
                    ROAS OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {preview.url_publicada && (
                  <a
                    href={preview.url_publicada}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[#22C55E] hover:underline"
                  >
                    <ExternalLink size={14} />
                    Abrir no ar
                  </a>
                )}
                <button
                  onClick={() => setPreview(null)}
                  className="text-secondary hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Se está publicada, mostra a versão viva (imagens/assets ok);
                senão renderiza o HTML salvo no banco. */}
            <iframe
              src={preview.url_publicada || undefined}
              srcDoc={preview.url_publicada ? undefined : preview.codigo_html}
              sandbox="allow-scripts allow-same-origin"
              className="flex-1 w-full bg-white border-0 rounded-b-xl"
              title={preview.nome}
            />
          </div>
        </div>
      )}
    </div>
  );
}
