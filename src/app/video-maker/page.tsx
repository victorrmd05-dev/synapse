"use client";

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Filter, Video, CheckCircle2, PlayCircle, Loader2, ListChecks, History, Check, X, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function VideoMakerPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);

  useEffect(() => {
    fetchVideos();

    const channel = supabase.channel('video_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_video' }, (payload) => {
        fetchVideos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchVideos() {
    const { data, error } = await supabase
      .from('workflow_video')
      .select('*')
      .order('data_criacao', { ascending: false });
    
    if (!error && data) {
      setVideos(data);
      if (data.length > 0 && !activeVideo) {
        setActiveVideo(data[0]);
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Renderizando': return 'bg-status-yellow/20 text-status-yellow border-status-yellow/30';
      case 'Aguardando Aprovação': return 'bg-primary/20 text-primary border-primary/30';
      case 'Aprovado': return 'bg-status-green/20 text-status-green border-status-green/30';
      case 'Ajuste Necessário': return 'bg-status-red/20 text-status-red border-status-red/30';
      default: return 'bg-surface-elevated text-secondary border-surface-elevated';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Renderizando': return <Loader2 size={12} className="animate-spin" />;
      case 'Aguardando Aprovação': return <PlayCircle size={12} />;
      case 'Aprovado': return <CheckCircle2 size={12} />;
      case 'Ajuste Necessário': return <RefreshCw size={12} />;
      default: return null;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-elevated shrink-0">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-secondary" size={16} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-surface-elevated rounded-lg bg-[#13131b] text-text-primary placeholder-secondary focus:outline-none focus:border-primary text-sm transition-colors"
            placeholder="Pesquisar ativos de vídeo..."
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 bg-surface border border-surface-elevated rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
            <span className="text-xs font-medium text-secondary">Render Farm: Idle</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        
        {/* Left Column: Grid de Vídeos */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Video Maker</h1>
              <p className="text-secondary text-sm">Biblioteca de Criativos para Ads</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-elevated hover:bg-surface-elevated rounded-lg text-sm font-medium text-white transition-colors">
                <Filter size={16} /> Filtrar
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-bold text-white transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Plus size={16} /> Novo Job
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {videos.map((video) => (
              <div 
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className={`bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all ${
                  activeVideo?.id === video.id 
                    ? 'border-primary shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-primary/50' 
                    : 'border-surface-elevated hover:border-surface-elevated/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex h-32">
                  <div className="w-40 relative shrink-0 bg-[#0a0a0f]">
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <h3 className="text-white font-bold text-sm mb-1 truncate">{video.title}</h3>
                      <p className="text-secondary text-xs truncate">{video.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(video.status)}`}>
                        {getStatusIcon(video.status)}
                        {video.status}
                      </div>
                      <span className="text-[10px] text-secondary">Hoje, 14:30</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Detalhes do Ativo */}
        <div className="w-[420px] shrink-0 bg-surface border border-surface-elevated rounded-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-surface-elevated flex items-start justify-between bg-[#0a0a0f]">
            <div>
              <h2 className="text-white font-bold text-lg">Detalhes do Ativo</h2>
              {activeVideo && <p className="text-xs text-secondary mt-1">ID: {activeVideo.id.split('-')[0]}</p>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeVideo ? (
              <div className="p-5 space-y-8">
                {/* Player Mock */}
                <div>
                  <div className="w-full aspect-video bg-black rounded-lg border border-surface-elevated relative overflow-hidden group cursor-pointer shadow-lg mb-3">
                    <img src={activeVideo.thumbnail_url} alt="Video cover" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
                        <PlayCircle size={32} />
                      </div>
                    </div>
                    {/* Progress bar mock */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-elevated">
                      <div className="h-full bg-primary w-1/3"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-secondary px-1">
                    <span>00:00</span>
                    <span>{activeVideo.duration}</span>
                  </div>
                </div>

                {/* Qualidade Checklist */}
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ListChecks size={14} className="text-primary" />
                    Critérios de Qualidade
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                      <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white border border-primary shrink-0">
                        <Check size={14} />
                      </div>
                      <span className="text-sm text-secondary flex-1">Sincronização Áudio/Vídeo</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                      <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white border border-primary shrink-0">
                        <Check size={14} />
                      </div>
                      <span className="text-sm text-secondary flex-1">Legendas Dinâmicas (Burned-in)</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                      <div className="w-5 h-5 rounded border border-surface-elevated flex items-center justify-center bg-[#0a0a0f] shrink-0">
                      </div>
                      <span className="text-sm text-secondary flex-1">Color Grade / Tratamento</span>
                    </label>
                  </div>
                </div>

                {/* Timeline de Versões */}
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <History size={14} className="text-primary" />
                    Timeline de Versões
                  </h3>
                  <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-surface-elevated">
                    
                    {/* Event 1 */}
                    <div className="relative">
                      <div className="absolute -left-[21px] w-3 h-3 bg-primary rounded-full ring-4 ring-surface"></div>
                      <p className="text-sm text-white font-medium mb-1">Versão 2.1 - Atual</p>
                      <p className="text-xs text-secondary mb-2">Aguardando aprovação do Gestor.</p>
                      <span className="text-[10px] text-secondary">Hoje, 14:30 • IA Generativa</span>
                    </div>

                    {/* Event 2 */}
                    <div className="relative opacity-60">
                      <div className="absolute -left-[21px] w-3 h-3 bg-surface-elevated rounded-full ring-4 ring-surface border border-secondary"></div>
                      <p className="text-sm text-white font-medium mb-1">Ajuste Solicitado</p>
                      <div className="bg-[#0F0F13] border border-surface-elevated rounded p-3 mb-2">
                        <p className="text-xs text-secondary italic">"Diminuir o volume da música de fundo no gancho inicial. Está cobrindo a voz do locutor."</p>
                      </div>
                      <span className="text-[10px] text-secondary">Hoje, 11:15 • Lucas Silva</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 flex flex-col items-center justify-center h-full text-secondary">
                <Video size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Selecione um vídeo para revisar.</p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          {activeVideo && (
            <div className="p-5 border-t border-surface-elevated bg-[#0a0a0f] space-y-3 shrink-0">
              <button className="w-full bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors">
                <CheckCircle2 size={16} /> Aprovar Vídeo Final
              </button>
              <button className="w-full border border-surface-elevated hover:bg-surface text-white py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                <MessageSquare size={16} /> Solicitar Ajuste
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
