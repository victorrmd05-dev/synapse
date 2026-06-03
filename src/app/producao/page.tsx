"use client";

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FolderKanban, PlayCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ProducaoPage() {
  const [search, setSearch] = useState("");
  const [campanhas, setCampanhas] = useState<any[]>([]);

  useEffect(() => {
    fetchCampanhas();

    const channel = supabase.channel('campanhas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas_producao' }, (payload) => {
        fetchCampanhas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchCampanhas() {
    const { data, error } = await supabase
      .from('campanhas_producao')
      .select('*, ads_minerados(image_url, video_urls, page_profile_pic_url)')
      .order('data_criacao', { ascending: false });
      
    if (!error && data) {
      setCampanhas(data);
    }
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
            placeholder="Buscar campanhas em produção..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={fetchCampanhas} className="text-secondary hover:text-white transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <FolderKanban className="text-primary" size={32} />
            Produção Ativa
          </h1>
          <p className="text-secondary text-sm">Acompanhe as campanhas que já foram aprovadas na mineração e estão na esteira de produção.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-bold transition-colors">
            {campanhas.length} Campanhas
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campanhas.filter(c => c.nome_projeto?.toLowerCase().includes(search.toLowerCase())).map((item) => (
          <div key={item.id} className="bg-surface border border-surface-elevated rounded-xl p-5 hover:border-primary/50 transition-colors shadow-lg flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-lg bg-surface-elevated flex items-center justify-center border border-surface-elevated overflow-hidden shrink-0">
                {item.ads_minerados?.page_profile_pic_url ? (
                  <img src={item.ads_minerados.page_profile_pic_url} className="w-full h-full object-cover" />
                ) : (
                  <FolderKanban size={24} className="text-secondary" />
                )}
              </div>
              <span className="px-2.5 py-1 bg-status-yellow/10 text-status-yellow border border-status-yellow/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {item.status_geral}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{item.nome_projeto}</h3>
            <p className="text-xs text-secondary flex items-center gap-1.5 mt-auto pt-4">
              <Clock size={12} />
              Adicionada em: {new Date(item.data_criacao).toLocaleDateString('pt-BR')}
            </p>
          </div>
        ))}
        {campanhas.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <FolderKanban size={48} className="text-secondary opacity-20 mb-4" />
            <p className="text-secondary text-lg">Nenhuma campanha em produção no momento.</p>
            <p className="text-secondary/60 text-sm mt-1">Aprove um anúncio na aba de Mineração para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
