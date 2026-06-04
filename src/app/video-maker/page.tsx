"use client";

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Filter, Video, CheckCircle2, PlayCircle, Loader2, ListChecks, History, Check, X, MessageSquare, Plus, RefreshCw, FileText, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function VideoMakerPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('roteiro'); // For middle column tabs

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

      {/* Main Content Grid (3 Columns) */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Column 1: Fila de Vídeos */}
        <div className="w-[300px] flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Video Maker</h1>
              <p className="text-secondary text-[10px]">Biblioteca de Criativos</p>
            </div>
            <button className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover rounded-lg text-white transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
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
                <div className="flex flex-col">
                  <div className="w-full h-32 relative shrink-0 bg-[#0a0a0f]">
                    {(video.url_video_download || video.thumbnail_url?.includes('.mp4') || video.video_url) ? (
                      <video src={video.url_video_download || video.video_url || video.thumbnail_url} className="w-full h-full object-cover opacity-80" muted playsInline />
                    ) : (
                      <img src={video.thumbnail_url} alt={video.title || "Video"} className="w-full h-full object-cover opacity-80" />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                      {video.duration || '0:30'}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5">
                    <div>
                      <h3 className="text-white font-bold text-sm truncate">{video.title || `Vídeo ${video.tipo_video ? video.tipo_video.toUpperCase() : ''} #${video.id.substring(0, 4)}`}</h3>
                      <p className="text-secondary text-[10px] truncate">{video.subtitle || 'Ativo Bruto'}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(video.status || (video.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}`}>
                        {getStatusIcon(video.status || (video.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}
                        <span className="truncate max-w-[100px]">{video.status || (video.revisor_ok ? 'Aprovado' : 'Aguardando')}</span>
                      </div>
                      <span className="text-[10px] text-secondary">Hoje</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Roteiro e Detalhes */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
          {activeVideo ? (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-6 px-6 pt-4 border-b border-surface-elevated shrink-0">
                <button 
                  onClick={() => setActiveTab('roteiro')}
                  className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'roteiro' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
                  <FileText size={16} /> Roteiro / Locução
                </button>
                <button 
                  onClick={() => setActiveTab('instrucoes')}
                  className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'instrucoes' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
                  <LayoutDashboard size={16} /> Briefing de Edição
                </button>
                <button 
                  onClick={() => setActiveTab('qualidade')}
                  className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'qualidade' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
                  <ListChecks size={16} /> Checklist & Timeline
                </button>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0F0F13]">
                {activeTab === 'roteiro' && (
                  <div className="space-y-6 max-w-3xl mx-auto">
                    <div className="bg-surface border border-surface-elevated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase tracking-wider">Cena 1 (0:00 - 0:05)</span>
                        <span className="text-xs text-secondary font-medium">Gancho</span>
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        &quot;Você também está perdendo vendas todos os dias porque seus anúncios não convertem?&quot;
                      </p>
                    </div>

                    <div className="bg-surface border border-surface-elevated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-surface-elevated text-secondary rounded text-[10px] font-bold uppercase tracking-wider">Cena 2 (0:05 - 0:15)</span>
                        <span className="text-xs text-secondary font-medium">Corpo</span>
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        &quot;A verdade é que a maioria das pessoas foca na métrica errada. Elas olham pro CTR quando deveriam estar olhando para a retenção nos primeiros 3 segundos.&quot;
                      </p>
                    </div>

                    <div className="bg-surface border border-surface-elevated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-surface-elevated text-secondary rounded text-[10px] font-bold uppercase tracking-wider">Cena 3 (0:15 - 0:30)</span>
                        <span className="text-xs text-secondary font-medium">CTA</span>
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        &quot;Se você quer descobrir o framework exato que usamos para escalar contas, clica no botão abaixo e vem pro nosso treinamento gratuito.&quot;
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'instrucoes' && (
                  <div className="space-y-6 max-w-3xl mx-auto">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Diretrizes Visuais</h3>
                      <ul className="space-y-2 text-sm text-secondary list-disc list-inside">
                        <li>Usar fonte <strong>Inter Bold</strong> com borda preta para legendas.</li>
                        <li>Aplicar zoom dinâmico (jump cuts) nas partes de maior ênfase.</li>
                        <li>Não usar transições espalhafatosas, manter corte seco.</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Assets Solicitados</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface border border-surface-elevated p-3 rounded-lg flex items-center gap-3">
                          <div className="w-10 h-10 bg-surface-elevated rounded flex items-center justify-center text-secondary">B-Roll</div>
                          <div className="text-xs">
                            <p className="text-white font-medium">Vídeo de Fundo</p>
                            <p className="text-secondary text-[10px]">Pessoa digitando</p>
                          </div>
                        </div>
                        <div className="bg-surface border border-surface-elevated p-3 rounded-lg flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 text-primary rounded flex items-center justify-center">Som</div>
                          <div className="text-xs">
                            <p className="text-white font-medium">Efeito Sonoro</p>
                            <p className="text-secondary text-[10px]">Whoosh transition</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'qualidade' && (
                  <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Qualidade Checklist */}
                    <div>
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ListChecks size={12} className="text-primary" />
                        Critérios de Qualidade
                      </h3>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2.5 bg-surface border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                          <div className="w-4 h-4 rounded bg-primary flex items-center justify-center text-white border border-primary shrink-0">
                            <Check size={10} />
                          </div>
                          <span className="text-xs text-secondary flex-1">Sincronização Áudio/Vídeo</span>
                        </label>
                        <label className="flex items-center gap-3 p-2.5 bg-surface border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                          <div className="w-4 h-4 rounded bg-primary flex items-center justify-center text-white border border-primary shrink-0">
                            <Check size={10} />
                          </div>
                          <span className="text-xs text-secondary flex-1">Legendas Dinâmicas (Burned-in)</span>
                        </label>
                        <label className="flex items-center gap-3 p-2.5 bg-surface border border-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/30 transition-colors">
                          <div className="w-4 h-4 rounded border border-surface-elevated flex items-center justify-center bg-[#0a0a0f] shrink-0">
                          </div>
                          <span className="text-xs text-secondary flex-1">Color Grade / Tratamento</span>
                        </label>
                      </div>
                    </div>

                    {/* Timeline de Versões */}
                    <div>
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <History size={12} className="text-primary" />
                        Timeline de Versões
                      </h3>
                      <div className="relative pl-3 space-y-6 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-surface-elevated">
                        {/* Event 1 */}
                        <div className="relative">
                          <div className="absolute -left-[17px] w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-[#0F0F13]"></div>
                          <p className="text-xs text-white font-medium mb-1">Versão 2.1 - Atual</p>
                          <p className="text-[10px] text-secondary mb-1.5 leading-snug">Aguardando aprovação do Gestor.</p>
                          <span className="text-[9px] text-secondary">Hoje, 14:30 • IA Generativa</span>
                        </div>

                        {/* Event 2 */}
                        <div className="relative opacity-60">
                          <div className="absolute -left-[17px] w-2.5 h-2.5 bg-surface-elevated rounded-full ring-4 ring-[#0F0F13] border border-secondary"></div>
                          <p className="text-xs text-white font-medium mb-1">Ajuste Solicitado</p>
                          <div className="bg-surface border border-surface-elevated rounded p-2.5 mb-1.5">
                            <p className="text-[10px] text-secondary italic leading-snug">&quot;Diminuir o volume da música de fundo no gancho inicial. Está cobrindo a voz do locutor.&quot;</p>
                          </div>
                          <span className="text-[9px] text-secondary">Hoje, 11:15 • Lucas Silva</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Selecione um vídeo para visualizar os detalhes.</p>
            </div>
          )}
        </div>

        {/* Column 3: Video Player / Preview */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4 overflow-hidden">
          {activeVideo ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-white font-bold text-sm">Visualização</h2>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}`}>
                  {getStatusIcon(activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}
                  <span>{activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando')}</span>
                </div>
              </div>

              {/* Video Player (Constrained to a mobile-like aspect or contained) */}
              <div className="w-full flex-1 bg-black rounded-xl border border-surface-elevated relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center">
                {(activeVideo.url_video_download || activeVideo.thumbnail_url?.includes('.mp4') || activeVideo.video_url) ? (
                  <video 
                    src={activeVideo.url_video_download || activeVideo.video_url || activeVideo.thumbnail_url} 
                    controls 
                    className="w-full h-full max-h-[600px] object-contain outline-none"
                  />
                ) : (
                  <div className="w-full h-full relative group cursor-pointer flex flex-col items-center justify-center max-h-[600px]">
                    <img src={activeVideo.thumbnail_url} alt="Video cover" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                    <div className="relative z-10 w-16 h-16 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
                      <PlayCircle size={36} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 border border-surface-elevated bg-surface rounded-xl space-y-2 shrink-0">
                <button className="w-full bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors">
                  <CheckCircle2 size={14} /> Aprovar Vídeo Final
                </button>
                <button className="w-full border border-surface-elevated hover:bg-surface-elevated text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                  <MessageSquare size={14} /> Solicitar Ajuste
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface border border-surface-elevated rounded-xl text-secondary">
              <Video size={48} className="mb-4 opacity-20" />
              <p className="text-xs text-center px-4">Selecione um vídeo para visualizar o player.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
