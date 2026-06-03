"use client";

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Star, X, Database, CheckCircle2, Globe, BookOpen, Video as VideoIcon, PlayCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function MineracaoPage() {
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState<any[]>([]);
  const [stats, setStats] = useState({ produtos: 0, criativos: 0 });
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProdutos();

    const channel = supabase.channel('mineracao_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads_minerados' }, (payload) => {
        fetchProdutos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchProdutos() {
    const { data, count, error } = await supabase
      .from('ads_minerados')
      .select('*', { count: 'exact' })
      .order('data_mineracao', { ascending: false });
      
    if (!error && data) {
      const mappedData = data.map(ad => {
        let hdImage = ad.image_url;
        let videos = ad.video_urls || [];
        
        try {
          if (ad.raw_json) {
            const raw = typeof ad.raw_json === 'string' ? JSON.parse(ad.raw_json) : ad.raw_json;
            if (raw.snapshot) {
              if (raw.snapshot.images && raw.snapshot.images.length > 0) {
                hdImage = raw.snapshot.images[0].original_image_url || raw.snapshot.images[0].resized_image_url || hdImage;
              } else if (raw.snapshot.videos && raw.snapshot.videos.length > 0) {
                hdImage = raw.snapshot.videos[0].video_preview_image_url || hdImage;
              }
            }
          }
        } catch (e) {
          // fallback silencioso
        }

        return {
          id: ad.id,
          title: ad.ad_title || 'Anúncio sem título',
          score: ad.score_escala || 0,
          image_url: hdImage || 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=600',
          page_name: ad.page_name || 'Desconhecido',
          page_profile_pic_url: ad.page_profile_pic_url || '',
          ad_copy: ad.ad_copy || '',
          cta_text: ad.cta_text || 'Saiba mais',
          link_url: ad.link_url || '#',
          ad_library_url: ad.ad_library_url || '#',
          video_url: videos.length > 0 ? videos[0] : null
        };
      });
      
      const uniqueData = Array.from(new Map(mappedData.map(item => [item.title, item])).values());
      
      setProdutos(uniqueData);
      setStats({ produtos: uniqueData.length, criativos: uniqueData.length * 3 });
    }
  }

  async function aprovarAnuncio(ad: any) {
    setIsApproving(true);
    
    const { error } = await supabase.from('campanhas_producao').insert([{
      ad_minerado_id: ad.id,
      nome_projeto: `Campanha - ${ad.title.substring(0, 40)}`,
      status_geral: 'Produção'
    }]);

    if (!error) {
      setProdutos(prev => prev.filter(p => p.id !== ad.id));
      setSelectedAd(null);
    } else {
      console.error(error);
      alert("Erro ao aprovar anúncio.");
    }
    
    setIsApproving(false);
  }

  async function excluirAnuncio(ad: any) {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este anúncio do banco de dados?")) return;
    
    setIsDeleting(true);
    
    const { error } = await supabase.from('ads_minerados').delete().eq('id', ad.id);

    if (!error) {
      setProdutos(prev => prev.filter(p => p.id !== ad.id));
      setSelectedAd(null);
    } else {
      console.error(error);
      alert("Erro ao excluir anúncio.");
    }
    
    setIsDeleting(false);
  }

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-surface-elevated pb-4 mb-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-secondary" size={18} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-surface-elevated rounded-lg leading-5 bg-[#13131b] text-text-primary placeholder-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
            placeholder="Buscar produtos minerados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={fetchProdutos} className="text-secondary hover:text-white transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Mineração de Produtos</h1>
          <p className="text-secondary text-sm">Inteligência Artificial processando tendências globais do Meta Ads.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-secondary tracking-wider uppercase">Filtros Ativos:</span>
          <span className="px-3 py-1.5 bg-surface border border-surface-elevated rounded-md text-xs text-white font-medium hover:bg-surface-elevated cursor-pointer transition-colors">Score &gt; 85</span>
          <span className="px-3 py-1.5 bg-surface border border-surface-elevated rounded-md text-xs text-white font-medium hover:bg-surface-elevated cursor-pointer transition-colors">Últimas 24h</span>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 lg:gap-8 gap-6">
        {produtos.filter(p => p.title.toLowerCase().includes(search.toLowerCase())).map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedAd(item)}
            className="bg-surface border border-surface-elevated rounded-xl overflow-hidden flex flex-col hover:border-primary/50 cursor-pointer transition-colors group shadow-lg"
          >
            <div className="relative h-64 w-full bg-[#0a0a0f] overflow-hidden">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover opacity-90 mix-blend-lighten group-hover:scale-105 transition-transform duration-500" />
              {item.video_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle size={48} className="text-white/80 drop-shadow-lg" />
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xl">
                <Star size={12} className="text-yellow-400" />
                <span className="text-xs font-bold text-white">SCORE {item.score}</span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                {item.page_profile_pic_url ? (
                  <img src={item.page_profile_pic_url} className="w-6 h-6 rounded-full object-cover border border-surface-elevated" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-elevated"></div>
                )}
                <span className="text-xs font-medium text-secondary">{item.page_name}</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-sm text-secondary line-clamp-2 mt-auto">{item.ad_copy}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 right-8 bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5 shadow-2xl w-72 z-40">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-secondary tracking-wider uppercase">Mineração em Tempo Real</h4>
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary">Produtos Scan:</span>
            <span className="text-sm font-bold text-white">{stats.produtos}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary">Ads Criativos:</span>
            <span className="text-sm font-bold text-white">{stats.criativos}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-surface-elevated flex items-center gap-2 text-xs text-secondary">
          <Database size={12} />
          Sincronizado com Supabase
        </div>
      </div>

      {/* Ad Modal (Facebook Post Style) */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18191A] border border-[#3E4042] rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header Actions */}
            <div className="flex justify-between items-center p-3 border-b border-[#3E4042]">
              <span className="text-[#B0B3B8] font-semibold text-sm ml-2">Espião de Anúncios</span>
              <button onClick={() => setSelectedAd(null)} className="p-2 bg-[#3A3B3C] hover:bg-[#4E4F50] rounded-full text-[#E4E6EB] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Ad Content */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
              {/* Facebook Post Header */}
              <div className="flex items-center gap-3 p-4">
                {selectedAd.page_profile_pic_url ? (
                  <img src={selectedAd.page_profile_pic_url} className="w-10 h-10 rounded-full border border-[#3E4042]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#3A3B3C]"></div>
                )}
                <div>
                  <h4 className="font-bold text-[#E4E6EB] text-sm leading-tight">{selectedAd.page_name}</h4>
                  <div className="flex items-center gap-1 text-[#B0B3B8] text-[13px]">
                    <span>Patrocinado</span>
                    <span>·</span>
                    <Globe size={12} />
                  </div>
                </div>
              </div>

              {/* Post Text */}
              <div className="px-4 pb-3">
                <p className="text-[#E4E6EB] text-sm whitespace-pre-wrap">{selectedAd.ad_copy}</p>
              </div>

              {/* Media */}
              <div className="w-full bg-black relative">
                {selectedAd.video_url ? (
                  <video 
                    src={selectedAd.video_url} 
                    poster={selectedAd.image_url}
                    controls 
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <img src={selectedAd.image_url} alt="Ad Media" className="w-full max-h-[500px] object-contain" />
                )}
              </div>

              {/* Post Footer (Link) */}
              <div className="bg-[#242526] p-3 flex items-center justify-between border-b border-[#3E4042]">
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-[#B0B3B8] text-xs uppercase block truncate">{selectedAd.link_url.replace(/^https?:\/\//, '').split('/')[0]}</span>
                  <strong className="text-[#E4E6EB] text-sm block truncate">{selectedAd.title}</strong>
                </div>
                <button className="bg-[#3A3B3C] text-[#E4E6EB] font-semibold text-sm px-4 py-1.5 rounded-md shrink-0">
                  {selectedAd.cta_text}
                </button>
              </div>

              {/* Spy Tools Actions */}
              <div className="p-5 flex flex-col gap-3">
                <h3 className="text-[#B0B3B8] text-xs font-bold uppercase tracking-wider mb-1">Ações do Espião</h3>
                <div className="grid grid-cols-2 gap-3">
                  <a href={selectedAd.link_url} target="_blank" rel="noreferrer" className="bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] p-3 rounded-lg flex items-center gap-3 transition-colors">
                    <Globe size={18} className="text-blue-400" />
                    <span className="font-semibold text-sm">Página de Vendas</span>
                  </a>
                  <a href={selectedAd.ad_library_url} target="_blank" rel="noreferrer" className="bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] p-3 rounded-lg flex items-center gap-3 transition-colors">
                    <BookOpen size={18} className="text-purple-400" />
                    <span className="font-semibold text-sm">Biblioteca (Ads)</span>
                  </a>
                  {selectedAd.video_url && (
                    <a href={selectedAd.video_url} target="_blank" rel="noreferrer" className="bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] p-3 rounded-lg flex items-center gap-3 transition-colors col-span-2">
                      <VideoIcon size={18} className="text-green-400" />
                      <span className="font-semibold text-sm">Download Vídeo MP4</span>
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#3E4042] flex flex-col gap-3">
                  <button 
                    onClick={() => aprovarAnuncio(selectedAd)}
                    disabled={isApproving || isDeleting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                  >
                    {isApproving ? 'Aprovando...' : <><CheckCircle2 size={18} /> Aprovar Anúncio para Produção</>}
                  </button>

                  <button 
                    onClick={() => excluirAnuncio(selectedAd)}
                    disabled={isApproving || isDeleting}
                    className="w-full bg-status-red/10 hover:bg-status-red/20 text-status-red border border-status-red/20 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Excluindo...' : <><Trash2 size={18} /> Excluir Anúncio (Permanente)</>}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
