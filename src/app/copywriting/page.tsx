"use client";

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Clock, FileText, Video, Sparkles, Check, Send, LayoutDashboard, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CopywritingPage() {
  const [fila, setFila] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'legendas' | 'pagina'>('pagina');

  useEffect(() => {
    fetchFila();

    const channel = supabase.channel('copywriting_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_copywriting' }, (payload) => {
        fetchFila();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFila() {
    const { data, error } = await supabase
      .from('workflow_copywriting')
      .select('*')
      .order('data_criacao', { ascending: false });
    
    if (!error && data) {
      const mappedData = data.map(item => {
        // Tenta extrair partes do texto (Gatilho rápido para o mockup)
        const text = item.conteudo_texto || '';
        const ganchoMatch = text.match(/GANCHO.*?([\s\S]*?)========================================/);
        const mecanismoMatch = text.match(/MÓDULO.*?([\s\S]*?)========================================/);
        const ctaMatch = text.match(/CTA FINAL.*?([\s\S]*?)$/);

        return {
          id: item.id,
          priority: item.revisor_ok ? 'APROVADO' : 'EM REVISÃO',
          title: text.split('\\n')[0] || 'Copy Sem Título',
          description: text.substring(0, 100) + '...',
          copy_gancho: ganchoMatch ? ganchoMatch[1].trim() : text.substring(0, 200),
          copy_mecanismo: mecanismoMatch ? mecanismoMatch[1].trim() : 'Mecanismo Único...',
          copy_cta: ctaMatch ? ctaMatch[1].trim() : 'Clique aqui...',
          atributos_json: { nicho: 'Vários', preco: '-' },
          conteudo_texto: item.conteudo_texto || '',
          meta_ads_copy: item.meta_ads_copy || ''
        };
      });

      setFila(mappedData);
      if (mappedData.length > 0 && !activeItem) {
        setActiveItem(mappedData[0]);
      }
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Top Bar (Specific to Copywriting) */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-elevated shrink-0">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-secondary" size={16} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-surface-elevated rounded-lg bg-[#13131b] text-text-primary placeholder-secondary focus:outline-none focus:border-primary text-sm transition-colors"
            placeholder="Buscar produtos ou scripts..."
          />
        </div>
        <div className="flex items-center gap-4 text-secondary">
          <div className="flex items-center gap-2 text-xs font-medium">
            <RefreshCw size={14} className="text-status-green" />
            Sistema Sincronizado
          </div>
          <button className="hover:text-white transition-colors"><Bell size={18} /></button>
          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-white cursor-pointer hover:bg-primary transition-colors">
            <User size={16} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Column 1: Fila de Produção */}
        <div className="w-[320px] flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-semibold">Fila de Produção</h2>
            <span className="px-2 py-0.5 bg-surface-elevated rounded-full text-xs text-secondary font-medium">{fila.length} itens</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {fila.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setActiveItem(item)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                  activeItem?.id === item.id 
                    ? 'bg-surface border-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'bg-surface border-surface-elevated hover:border-surface-elevated/80 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.priority === 'ALTA PRIORIDADE' ? 'bg-primary/20 text-primary' : 'bg-surface-elevated text-secondary'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-secondary">Recente</span>
                </div>
                <h3 className="text-white font-bold mb-1">{item.title}</h3>
                <p className="text-xs text-secondary mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 text-secondary">
                  <FileText size={14} className={activeItem?.id === item.id ? "text-primary" : ""} />
                  <Video size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Editor de Copy */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
          <div className="flex items-center gap-6 px-6 pt-4 border-b border-surface-elevated">
            <button 
              onClick={() => setActiveTab('pagina')}
              className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'pagina' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
              <LayoutDashboard size={16} /> Página de Vendas
            </button>
            <button 
              onClick={() => setActiveTab('legendas')}
              className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'legendas' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
              <FileText size={16} /> Legendas de Ads
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Main Text Editor (now taking full width) */}
            <div className="flex-1 p-6 flex flex-col bg-[#0F0F13] overflow-hidden">

              <div className="flex-1 text-text-primary text-sm leading-relaxed overflow-y-auto custom-scrollbar pr-4 space-y-4 font-inter">
                {activeItem ? (
                  <div className="whitespace-pre-wrap">
                    {activeTab === 'legendas' 
                      ? (activeItem.meta_ads_copy || 'Nenhuma legenda de anúncio gerada ainda.') 
                      : (activeItem.conteudo_texto || 'Nenhum conteúdo de página de vendas gerado ainda.')}
                  </div>
                ) : (
                  <p className="text-secondary">Selecione um item na fila de produção.</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-surface-elevated flex items-center justify-center text-secondary text-sm">
                A aprovação final e envio para o Design é feita na página do Revisor.
              </div>
            </div>

            {/* Bottom Panel: Sugestão da IA (Horizontal) */}
            <div className="h-[240px] shrink-0 border-t border-surface-elevated p-5 flex flex-col bg-surface overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles size={16} /> Sugestão da IA
                </div>
                <button className="text-xs text-secondary flex items-center gap-1 hover:text-white transition-colors">
                  <Clock size={12} /> Versões
                </button>
              </div>
              
              <div className="flex-1 flex gap-4 overflow-x-auto custom-scrollbar pb-2 items-start">
                {activeItem?.copy_gancho && (
                  <div className="min-w-[300px] w-[350px] shrink-0 border border-surface-elevated rounded-lg p-4 bg-[#0F0F13] relative mt-2">
                    <span className="absolute -top-2.5 left-3 bg-[#EAB308] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">GANCHO (HOOK)</span>
                    <p className="text-sm text-secondary italic leading-relaxed mt-1 line-clamp-5">{activeItem.copy_gancho}</p>
                  </div>
                )}

                {activeItem?.copy_mecanismo && (
                  <div className="min-w-[300px] w-[350px] shrink-0 border border-surface-elevated rounded-lg p-4 bg-[#0F0F13] relative mt-2">
                    <span className="absolute -top-2.5 left-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">MECANISMO ÚNICO</span>
                    <p className="text-sm text-secondary leading-relaxed mt-1 line-clamp-5">{activeItem.copy_mecanismo}</p>
                  </div>
                )}

                {activeItem?.copy_cta && (
                  <div className="min-w-[300px] w-[350px] shrink-0 border border-surface-elevated rounded-lg p-4 bg-[#0F0F13] relative mt-2">
                    <span className="absolute -top-2.5 left-3 bg-[#4B5563] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">PROVA SOCIAL / CTA</span>
                    <p className="text-sm text-secondary leading-relaxed mt-1 line-clamp-5">{activeItem.copy_cta}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Atributos do Produto */}
        <div className="w-[280px] shrink-0 overflow-y-auto custom-scrollbar pr-1 pb-4">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Atributos do Produto</h2>
          
          {activeItem?.atributos_json && (
            <div className="space-y-3 mb-8">
              {activeItem.atributos_json.nicho && (
                <div className="bg-surface border border-surface-elevated rounded-lg p-3">
                  <span className="text-[10px] text-secondary uppercase block mb-1">Nicho</span>
                  <span className="text-sm text-white font-medium">{activeItem.atributos_json.nicho}</span>
                </div>
              )}
              {activeItem.atributos_json.preco && (
                <div className="bg-surface border border-surface-elevated rounded-lg p-3">
                  <span className="text-[10px] text-secondary uppercase block mb-1">Preço de Venda</span>
                  <span className="text-sm text-white font-medium">{activeItem.atributos_json.preco}</span>
                </div>
              )}
              {activeItem.atributos_json.magnet && (
                <div className="bg-surface border border-surface-elevated rounded-lg p-3">
                  <span className="text-[10px] text-secondary uppercase block mb-1">Lead-Magnet</span>
                  <span className="text-sm text-white font-medium">{activeItem.atributos_json.magnet}</span>
                </div>
              )}
            </div>
          )}

          <h2 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Ângulos de Venda</h2>
          <div className="space-y-3 mb-8">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white border border-primary">
                <Check size={14} />
              </div>
              <span className="text-sm text-white group-hover:text-primary transition-colors">Prova Científica</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white border border-primary">
                <Check size={14} />
              </div>
              <span className="text-sm text-white group-hover:text-primary transition-colors">Medo da Dor</span>
            </label>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-primary uppercase mb-2">Insight da IA</h3>
            <p className="text-xs text-white leading-relaxed">"O público alvo responde melhor a anúncios que enfatizam resultados rápidos e facilidade de uso."</p>
            <Sparkles size={40} className="absolute -bottom-2 -right-2 text-primary opacity-10" />
          </div>

          <div className="rounded-lg overflow-hidden border border-surface-elevated mb-2 relative group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop" alt="Asset" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F13] to-transparent"></div>
          </div>
          <p className="text-center text-[10px] text-secondary italic">Asset visual principal sincronizado</p>
        </div>
      </div>
    </div>
  );
}
