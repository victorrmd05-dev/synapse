import React, { useCallback, useEffect, useState } from 'react';
import { ImageIcon, ImageOff, RefreshCw, X, ExternalLink, Eye } from 'lucide-react';

interface Creative {
  id: string;
  adId: string;
  name: string;
  status: string;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  creativeId?: string;
}

interface AdCreativesProps {
  campaignId: string;
}

/** Formatos da Ad Preview API — rótulos amigáveis. */
const PREVIEW_FORMATS: { format: string; label: string }[] = [
  { format: 'MOBILE_FEED_STANDARD', label: 'Feed Mobile' },
  { format: 'DESKTOP_FEED_STANDARD', label: 'Feed Desktop' },
  { format: 'INSTAGRAM_STANDARD', label: 'Instagram' },
  { format: 'INSTAGRAM_STORY', label: 'Story' },
  { format: 'INSTAGRAM_REELS', label: 'Reels' },
];

function statusBadge(status: string) {
  const on = status === 'ACTIVE';
  return (
    <span
      className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
        on
          ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20'
          : 'text-[#8B8BA0] bg-[#2A2A38]/50 border-[#2A2A38]'
      }`}
    >
      {on ? 'Ativo' : status === 'PAUSED' ? 'Pausado' : status}
    </span>
  );
}

function Thumb({ creative, size }: { creative: Creative; size: 'card' | 'modal' }) {
  const [broken, setBroken] = useState(false);
  const cls = size === 'card' ? 'w-full h-40 object-cover' : 'w-full max-h-[380px] object-contain bg-black';
  if (!creative.imageUrl || broken) {
    return (
      <div className={`${size === 'card' ? 'h-40' : 'h-56'} w-full flex flex-col items-center justify-center gap-2 bg-[#16161d] text-[#8B8BA0]`}>
        <ImageOff size={20} />
        <span className="text-[10px]">sem imagem</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={creative.imageUrl} alt={creative.name} className={cls} onError={() => setBroken(true)} />;
}

/**
 * Grid de criativos dos anúncios da campanha (imagem + copy), com modal
 * expandido e link direto pro Gerenciador de Anúncios da Meta.
 * Lê GET /api/meta/creatives?campaignId=X.
 */
export function AdCreatives({ campaignId }: AdCreativesProps) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Creative | null>(null);

  // Visualização da publicação (Ad Preview oficial da Meta)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/creatives?campaignId=${campaignId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao buscar os criativos.');
      setCreatives(data.creatives || []);
      setAccountId(data.accountId || null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar os criativos.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    setCreatives([]);
    setSelected(null);
    fetchCreatives();
  }, [fetchCreatives]);

  // Troca de anúncio → limpa o preview da publicação
  useEffect(() => {
    setPreviewHtml(null);
    setPreviewFormat(null);
    setPreviewError(null);
  }, [selected?.adId]);

  const loadPreview = async (format: string) => {
    if (!selected) return;
    setPreviewFormat(format);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);
    try {
      const res = await fetch(`/api/meta/preview?adId=${selected.adId}&format=${format}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao gerar a visualização.');
      setPreviewHtml(data.html);
    } catch (e: any) {
      setPreviewError(e?.message || 'Erro ao buscar a visualização.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const managerUrl = (adId: string) =>
    accountId
      ? `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_ids=${adId}`
      : `https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`;

  return (
    <div className="bg-[#0F0F13] border border-[#2A2A38] rounded-xl p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-[#6366F1]" />
          <h3 className="text-[15px] font-bold text-[#F1F1F3]">Criativos da Campanha</h3>
        </div>
        <button
          onClick={fetchCreatives}
          disabled={loading}
          className="flex items-center gap-2 text-[#8B8BA0] hover:text-[#F1F1F3] px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
          title="Recarregar criativos"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
      <p className="text-[#8B8BA0] text-[12px] mb-5">
        O que o público está vendo — imagem e copy de cada anúncio, direto da Meta.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {loading && creatives.length === 0 && !error && (
        <div className="flex items-center justify-center py-8 text-[#8B8BA0] text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Puxando os criativos da Meta...
        </div>
      )}

      {!loading && !error && creatives.length === 0 && (
        <div className="text-center py-8 text-[#8B8BA0] text-sm">
          Nenhum criativo encontrado nesta campanha.
        </div>
      )}

      {creatives.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="text-left bg-[#111116] border border-[#2A2A38] hover:border-[#6366F1]/50 rounded-xl overflow-hidden transition-colors group"
            >
              <Thumb creative={c} size="card" />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#F1F1F3] truncate" title={c.name}>
                    {c.name}
                  </span>
                  {statusBadge(c.status)}
                </div>
                {c.title && (
                  <p className="text-[11px] text-[#C7C7D1] font-medium truncate" title={c.title}>
                    {c.title}
                  </p>
                )}
                {c.body && (
                  <p className="text-[11px] text-[#8B8BA0] leading-relaxed line-clamp-2">{c.body}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal expandido */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#111116] border border-[#2A2A38] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A38] sticky top-0 bg-[#111116]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[14px] font-bold text-[#F1F1F3] truncate" title={selected.name}>
                  {selected.name}
                </span>
                {statusBadge(selected.status)}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors flex-shrink-0"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <Thumb creative={selected} size="modal" />

            <div className="p-5 space-y-4">
              {selected.title && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#8B8BA0] font-semibold">Título</span>
                  <p className="text-[13px] text-[#F1F1F3] font-medium mt-1">{selected.title}</p>
                </div>
              )}
              {selected.body && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#8B8BA0] font-semibold">Texto principal</span>
                  <p className="text-[12px] text-[#C7C7D1] leading-relaxed mt-1 whitespace-pre-wrap">{selected.body}</p>
                </div>
              )}
              {!selected.title && !selected.body && (
                <p className="text-[12px] text-[#8B8BA0]">
                  Sem texto disponível — criativo de mídia pura ou formato não exposto pela API.
                </p>
              )}

              {/* Visualização da publicação — Ad Preview oficial da Meta */}
              <div className="pt-4 border-t border-[#2A2A38]">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={14} className="text-[#6366F1]" />
                  <span className="text-[10px] uppercase tracking-wider text-[#8B8BA0] font-semibold">
                    Visualização da publicação
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PREVIEW_FORMATS.map((f) => (
                    <button
                      key={f.format}
                      onClick={() => loadPreview(f.format)}
                      disabled={previewLoading}
                      className={`px-3 py-1.5 rounded-md border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                        previewFormat === f.format
                          ? 'bg-[#6366F1] border-[#6366F1] text-white'
                          : 'border-[#3A3A48] text-[#C7C7D1] hover:bg-[#2A2A38]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {previewLoading && (
                  <div className="flex items-center justify-center py-8 text-[#8B8BA0] text-sm gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    Gerando a visualização na Meta...
                  </div>
                )}
                {previewError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {previewError}
                  </div>
                )}
                {previewHtml && !previewLoading && (
                  <div
                    className="flex justify-center overflow-auto rounded-lg bg-[#0D0D14] border border-[#2A2A38] p-3 [&_iframe]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
                {!previewHtml && !previewLoading && !previewError && (
                  <p className="text-[11px] text-[#8B8BA0]">
                    Escolha um formato acima para ver o anúncio exatamente como o público vê.
                  </p>
                )}
              </div>

              <a
                href={managerUrl(selected.adId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                <ExternalLink size={14} />
                Abrir no Gerenciador
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
