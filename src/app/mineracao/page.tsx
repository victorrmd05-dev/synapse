"use client";

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Star, X, Database, CheckCircle2, Globe, BookOpen, Video as VideoIcon, PlayCircle, Trash2, Sparkles, Loader2, Heart, ImageOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pickThumbnail, pickVideos } from '../../lib/minerador-media';

// Países para mineração. A jogada clássica de dropshipping/low-ticket é garimpar
// ofertas já VALIDADAS na gringa (EUA, Europa) e trazer pro Brasil. O código ISO-2
// é o que a ScrapeCreators espera no parâmetro `country`.
const PAISES = [
  { code: 'BR', label: '🇧🇷 Brasil' },
  { code: 'US', label: '🇺🇸 Estados Unidos' },
  { code: 'GB', label: '🇬🇧 Reino Unido' },
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'ES', label: '🇪🇸 Espanha' },
  { code: 'IT', label: '🇮🇹 Itália' },
  { code: 'DE', label: '🇩🇪 Alemanha' },
  { code: 'FR', label: '🇫🇷 França' },
  { code: 'CA', label: '🇨🇦 Canadá' },
  { code: 'AU', label: '🇦🇺 Austrália' },
  { code: 'MX', label: '🇲🇽 México' },
];

export default function MineracaoPage() {
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState<any[]>([]);
  const [stats, setStats] = useState({ produtos: 0, criativos: 0 });
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [miningQuery, setMiningQuery] = useState("Frete Grátis");
  const [miningCountry, setMiningCountry] = useState("BR");
  const [isMining, setIsMining] = useState(false);
  const [miningMsg, setMiningMsg] = useState<string | null>(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  // Feedback do gatilho do Copywriter (geração roda em background após aprovar).
  const [copyGenMsg, setCopyGenMsg] = useState<string | null>(null);

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
        let hdImage: string | null = ad.image_url || null;
        let videos: string[] = ad.video_urls || [];

        try {
          if (ad.raw_json) {
            const raw = typeof ad.raw_json === 'string' ? JSON.parse(ad.raw_json) : ad.raw_json;
            const snap = raw.snapshot;
            if (snap) {
              // Reextrai do snapshot (cobre carrossel, onde a imagem vive em cards[]).
              hdImage = pickThumbnail(snap) || hdImage;
              if (videos.length === 0) videos = pickVideos(snap);
            }
          }
        } catch (e) {
          // fallback silencioso
        }

        return {
          id: ad.id,
          title: ad.ad_title || 'Anúncio sem título',
          score: ad.score_escala || 0,
          categoria_ia: ad.categoria_ia || null,
          notas_ia: ad.notas_ia || null,
          favorito: ad.favorito || false,
          image_url: hdImage || null,
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

  async function minerar() {
    const query = miningQuery.trim();
    if (!query || isMining) return;
    setIsMining(true);
    setMiningMsg(null);
    try {
      const res = await fetch('/api/mineracao/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, country: miningCountry, limit: 8, apenas_validados: true }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setMiningMsg(`❌ ${json.error || `HTTP ${res.status}`}${json.detalhe ? ' — ' + json.detalhe : ''}`);
      } else {
        const bl = json.bloqueados_lista_negra ?? 0;
        const paisLabel = PAISES.find(p => p.code === json.country)?.label ?? json.country;
        setMiningMsg(
          `✓ ${paisLabel} · "${json.query}": ${json.avaliados} avaliados · ${bl} bloqueados pela lista negra · ${json.inseridos} salvos no painel.` +
          (json.inseridos === 0 ? ' Nenhuma oferta boa nessa keyword — tente outra.' : '')
        );
        await fetchProdutos();
      }
    } catch (e: any) {
      setMiningMsg(`❌ Falha de rede: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setIsMining(false);
    }
  }

  async function aprovarAnuncio(ad: any) {
    setIsApproving(true);

    // 1. Cria a campanha em produção e captura o id gerado (precisamos dele
    //    para acionar o Copywriter logo em seguida).
    const { data: novaCampanha, error } = await supabase
      .from('campanhas_producao')
      .insert([{
        ad_minerado_id: ad.id,
        nome_projeto: `Campanha - ${ad.title.substring(0, 40)}`,
        status_geral: 'Produção',
      }])
      .select('id')
      .single();

    if (error || !novaCampanha) {
      console.error(error);
      alert('Erro ao aprovar anúncio.');
      setIsApproving(false);
      return;
    }

    // 2. Aprovado: tira o card da lista e fecha o modal.
    setProdutos(prev => prev.filter(p => p.id !== ad.id));
    setSelectedAd(null);
    setIsApproving(false);

    // 3. GATILHO: dispara o agente Copywriter para esta campanha. Roda em
    //    background (pesquisa Tavily + IA leva ~30-60s); a copy aparece sozinha
    //    na Fila de Produção (/copywriting) via Realtime. O toast dá o feedback.
    setCopyGenMsg('✨ Anúncio aprovado! O Copywriter está pesquisando e gerando a copy — ela aparecerá na Fila de Produção em ~30-60s.');
    fetch('/api/copywriting/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campanha_id: novaCampanha.id }),
    })
      .then(async (r) => {
        if (r.ok) {
          setCopyGenMsg('✅ Copy gerada! Abra a página Copywriting para ler e enviar ao Revisor.');
        } else {
          const e = await r.json().catch(() => ({}));
          setCopyGenMsg('❌ Falha ao gerar copy: ' + (e.detalhe || e.error || `HTTP ${r.status}`));
        }
      })
      .catch((err) => {
        console.error('[copywriting trigger]', err);
        setCopyGenMsg('❌ Erro de rede ao acionar o Copywriter. Confira se o servidor está rodando.');
      })
      .finally(() => {
        setTimeout(() => setCopyGenMsg(null), 12000);
      });
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

  async function toggleFavorito(ad: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const novoValor = !ad.favorito;

    // Atualização otimista (UI responde na hora; Realtime confirma depois)
    setProdutos(prev => prev.map(p => (p.id === ad.id ? { ...p, favorito: novoValor } : p)));
    if (selectedAd?.id === ad.id) setSelectedAd({ ...selectedAd, favorito: novoValor });

    const { error } = await supabase
      .from('ads_minerados')
      .update({ favorito: novoValor })
      .eq('id', ad.id);

    if (error) {
      console.error(error);
      // Reverte em caso de falha
      setProdutos(prev => prev.map(p => (p.id === ad.id ? { ...p, favorito: ad.favorito } : p)));
      if (selectedAd?.id === ad.id) setSelectedAd({ ...selectedAd, favorito: ad.favorito });
      alert("Erro ao favoritar anúncio.");
    }
  }

  async function excluirNaoFavoritados() {
    const naoFavoritados = produtos.filter(p => !p.favorito);
    if (naoFavoritados.length === 0) {
      alert("Não há anúncios não favoritados para excluir.");
      return;
    }
    if (!window.confirm(
      `Isso vai excluir PERMANENTEMENTE ${naoFavoritados.length} anúncio(s) não favoritado(s) do banco de dados, mantendo apenas os ${produtos.length - naoFavoritados.length} favoritado(s). Continuar?`
    )) return;

    setIsPurging(true);

    const { error } = await supabase
      .from('ads_minerados')
      .delete()
      .eq('favorito', false);

    if (!error) {
      setProdutos(prev => prev.filter(p => p.favorito));
    } else {
      console.error(error);
      alert("Erro ao excluir anúncios não favoritados.");
    }

    setIsPurging(false);
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
        <div className="flex items-center gap-2">
          <select
            value={miningCountry}
            onChange={(e) => setMiningCountry(e.target.value)}
            disabled={isMining}
            title="País de origem dos anúncios (minere ofertas validadas na gringa)"
            className="px-3 py-2 bg-[#13131b] border border-surface-elevated rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors cursor-pointer"
          >
            {PAISES.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={miningQuery}
            onChange={(e) => setMiningQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') minerar(); }}
            disabled={isMining}
            placeholder="Palavra-chave (ex: Frete Grátis)"
            className="px-3 py-2 w-60 bg-[#13131b] border border-surface-elevated rounded-lg text-sm text-text-primary placeholder-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
          <button
            onClick={minerar}
            disabled={isMining || !miningQuery.trim()}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 whitespace-nowrap"
          >
            {isMining
              ? <><Loader2 size={16} className="animate-spin" /> Minerando…</>
              : <><Sparkles size={16} /> Minerar com IA</>}
          </button>
        </div>
      </div>

      {copyGenMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${
            copyGenMsg.startsWith('❌') ? 'bg-status-red/10 border-status-red/30' : 'bg-surface border-primary/30'
          }`}>
            <Sparkles size={18} className={copyGenMsg.startsWith('❌') ? 'text-status-red shrink-0 mt-0.5' : 'text-primary shrink-0 mt-0.5'} />
            <p className="text-sm text-text-primary leading-snug">{copyGenMsg}</p>
            <button onClick={() => setCopyGenMsg(null)} className="text-secondary hover:text-white shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {(miningMsg || isMining) && (
        <div className="mb-6 -mt-3 text-sm">
          {isMining ? (
            <span className="text-secondary flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Buscando na Meta Ad Library e avaliando cada anúncio com a IA — pode levar até ~1 min.
            </span>
          ) : (
            <span className={miningMsg?.startsWith('❌') ? 'text-status-red' : 'text-status-green'}>{miningMsg}</span>
          )}
        </div>
      )}

      {/* Toolbar de curadoria */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <button
          onClick={() => setShowOnlyFavorites(v => !v)}
          className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border ${
            showOnlyFavorites
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-surface text-secondary border-surface-elevated hover:text-white'
          }`}
        >
          <Heart size={16} className={showOnlyFavorites ? 'fill-primary' : ''} />
          {showOnlyFavorites ? 'Mostrando favoritos' : 'Só favoritos'}
          <span className="ml-1 text-xs opacity-70">({produtos.filter(p => p.favorito).length})</span>
        </button>

        <button
          onClick={excluirNaoFavoritados}
          disabled={isPurging || produtos.filter(p => !p.favorito).length === 0}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors bg-status-red/10 hover:bg-status-red/20 text-status-red border border-status-red/20 disabled:opacity-40"
        >
          {isPurging
            ? <><Loader2 size={16} className="animate-spin" /> Excluindo…</>
            : <><Trash2 size={16} /> Excluir não favoritados ({produtos.filter(p => !p.favorito).length})</>}
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 lg:gap-8 gap-6">
        {produtos
          .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
          .filter(p => !showOnlyFavorites || p.favorito)
          .map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedAd(item)}
            className="bg-surface border border-surface-elevated rounded-xl overflow-hidden flex flex-col hover:border-primary/50 cursor-pointer transition-colors group shadow-lg"
          >
            <div className="relative h-64 w-full bg-[#0a0a0f] overflow-hidden">
              {/* Placeholder neutro atrás: aparece se não houver imagem ou se a URL do FB expirar */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-secondary/40">
                <ImageOff size={30} />
                <span className="text-[10px] uppercase tracking-wider">sem imagem</span>
              </div>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  className="relative w-full h-full object-cover opacity-90 mix-blend-lighten group-hover:scale-105 transition-transform duration-500"
                />
              )}
              {item.video_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle size={48} className="text-white/80 drop-shadow-lg" />
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xl">
                <Star size={12} className="text-yellow-400" />
                <span className="text-xs font-bold text-white">SCORE {item.score}</span>
              </div>
              <button
                onClick={(e) => toggleFavorito(item, e)}
                title={item.favorito ? 'Remover dos favoritos' : 'Favoritar anúncio'}
                className={`absolute top-3 left-3 p-2 rounded-full backdrop-blur-md border shadow-xl transition-colors ${
                  item.favorito
                    ? 'bg-primary/80 border-primary text-white'
                    : 'bg-black/60 border-white/10 text-white/80 hover:text-white'
                }`}
              >
                <Heart size={16} className={item.favorito ? 'fill-white' : ''} />
              </button>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorito(selectedAd)}
                  title={selectedAd.favorito ? 'Remover dos favoritos' : 'Favoritar anúncio'}
                  className={`p-2 rounded-full transition-colors ${
                    selectedAd.favorito
                      ? 'bg-primary text-white'
                      : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB]'
                  }`}
                >
                  <Heart size={18} className={selectedAd.favorito ? 'fill-white' : ''} />
                </button>
                <button onClick={() => setSelectedAd(null)} className="p-2 bg-[#3A3B3C] hover:bg-[#4E4F50] rounded-full text-[#E4E6EB] transition-colors">
                  <X size={20} />
                </button>
              </div>
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
                    poster={selectedAd.image_url || undefined}
                    controls
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : selectedAd.image_url ? (
                  <img
                    src={selectedAd.image_url}
                    alt="Ad Media"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <div className="w-full h-64 flex flex-col items-center justify-center gap-2 text-secondary/40">
                    <ImageOff size={32} />
                    <span className="text-xs uppercase tracking-wider">sem imagem disponível</span>
                  </div>
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

              {/* Análise da IA (Minerador) */}
              <div className="p-5 border-b border-[#3E4042]">
                <h3 className="text-[#B0B3B8] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  Análise da IA
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm ${
                    selectedAd.score >= 70
                      ? 'bg-status-green/10 text-status-green border border-status-green/20'
                      : selectedAd.score >= 50
                        ? 'bg-status-yellow/10 text-status-yellow border border-status-yellow/20'
                        : 'bg-status-red/10 text-status-red border border-status-red/20'
                  }`}>
                    <Star size={14} />
                    Score {selectedAd.score}/100
                  </div>
                  {selectedAd.categoria_ia && (
                    <span className="px-3 py-1.5 rounded-lg bg-[#3A3B3C] text-[#E4E6EB] text-sm font-medium">
                      {selectedAd.categoria_ia}
                    </span>
                  )}
                </div>
                {selectedAd.notas_ia ? (
                  <p className="text-[#B0B3B8] text-sm leading-relaxed whitespace-pre-wrap">{selectedAd.notas_ia}</p>
                ) : (
                  <p className="text-[#6E7174] text-sm italic">Sem notas da IA para este anúncio.</p>
                )}
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
