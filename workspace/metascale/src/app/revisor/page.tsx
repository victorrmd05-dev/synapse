"use client";

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, CheckCircle2, XCircle, RefreshCw, AlertTriangle, MessageSquare, PlayCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function RevisorPage() {
  const [fila, setFila] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchFila();

    const channel = supabase.channel('revisor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_copywriting' }, (payload) => {
        fetchFila();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFila() {
    const { data: allData } = await supabase
      .from('workflow_copywriting')
      .select('*')
      .eq('revisor_ok', true)
      .order('data_criacao', { ascending: false });

    if (allData) {
      const mappedData = allData
        .filter(item => item.aprovado_humano !== true)
        .map(item => {
          const text = item.conteudo_texto || '';
          const ganchoMatch = text.match(/GANCHO.*?([\s\S]*?)========================================/);
          const mecanismoMatch = text.match(/MÓDULO.*?([\s\S]*?)========================================/);
          const ctaMatch = text.match(/CTA FINAL.*?([\s\S]*?)$/);

          return {
            id: item.id,
            title: text.split('\n')[0] || 'Copy Sem Título',
            description: text.substring(0, 100) + '...',
            copy_gancho: ganchoMatch ? ganchoMatch[1].trim() : text.substring(0, 200),
            copy_mecanismo: mecanismoMatch ? mecanismoMatch[1].trim() : 'Mecanismo Único...',
            copy_cta: ctaMatch ? ctaMatch[1].trim() : 'Clique aqui...'
          };
        });

      setFila(mappedData);
      if (mappedData.length > 0 && !activeItem) {
        setActiveItem(mappedData[0]);
      }
    }
  }

  async function rejeitarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);
    
    // Marca como falso para o agente de copy saber que precisa refazer
    const { error } = await supabase
      .from('workflow_copywriting')
      .update({ revisor_ok: false })
      .eq('id', activeItem.id);

    if (!error) {
      setFila(prev => prev.filter(p => p.id !== activeItem.id));
      setActiveItem(null);
    } else {
      console.error(error);
      alert("Erro ao rejeitar copy.");
    }
    setIsProcessing(false);
  }

  async function aprovarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);
    
    // Insere na tabela workflow_design sinalizando para o Webmaster
    const { error: designError } = await supabase
      .from('workflow_design')
      .insert([{
        copywriting_id: activeItem.id,
        nome_projeto: activeItem.title,
        status_geral: 'Aguardando Design'
      }]);

    if (!designError) {
      // Removemos localmente da fila para sumir da tela do revisor
      setFila(prev => prev.filter(p => p.id !== activeItem.id));
      setActiveItem(null);
      // Opcional: Atualizar a tabela de copy indicando aprovação final
      await supabase.from('workflow_copywriting').update({ aprovado_humano: true }).eq('id', activeItem.id);
    } else {
      console.error(designError);
      alert("Erro ao enviar para o Design. Verifique a tabela workflow_design.");
    }
    setIsProcessing(false);
  }

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
            placeholder="Pesquisar itens em revisão..."
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-status-yellow bg-status-yellow/10 px-3 py-1.5 rounded-full border border-status-yellow/20">
            <AlertTriangle size={14} />
            {fila.length} Itens Pendentes
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        
        {/* Fila de Revisão */}
        <div className="w-[340px] flex flex-col shrink-0 overflow-y-auto custom-scrollbar pr-2">
          <h2 className="text-white font-bold text-lg mb-4">Aguardando Revisão</h2>
          
          <div className="space-y-3">
            {fila.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setActiveItem(item)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeItem?.id === item.id 
                    ? 'bg-surface border-status-yellow shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                    : 'bg-surface border-surface-elevated hover:border-surface-elevated/80 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-status-yellow uppercase tracking-wider bg-status-yellow/10 px-2 py-0.5 rounded">
                    Revisão de Copy
                  </span>
                  <span className="text-[10px] text-secondary">ID: {item.id.split('-')[0]}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-secondary line-clamp-2">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor de Revisão */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
          <div className="p-5 border-b border-surface-elevated flex items-center justify-between bg-[#0a0a0f]">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Revisão de Conteúdo</h2>
              <p className="text-xs text-secondary">Analise a copy gerada e aprove para produção</p>
            </div>
            {activeItem && (
              <div className="flex gap-3">
                <button 
                  onClick={rejeitarCopy}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-status-red/10 hover:bg-status-red/20 text-status-red border border-status-red/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Rejeitar e Refazer
                </button>
                <button 
                  onClick={aprovarCopy}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Aprovar Copy
                </button>
              </div>
            )}
          </div>

          {activeItem ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex gap-6">
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Gancho (Hook)</h3>
                  <div className="p-4 bg-[#0F0F13] border border-surface-elevated rounded-lg relative group">
                    <button className="absolute top-2 right-2 p-1.5 bg-surface rounded text-secondary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageSquare size={14} />
                    </button>
                    <p className="text-sm text-white leading-relaxed">{activeItem.copy_gancho}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Mecanismo Único</h3>
                  <div className="p-4 bg-[#0F0F13] border border-surface-elevated rounded-lg relative group">
                    <button className="absolute top-2 right-2 p-1.5 bg-surface rounded text-secondary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageSquare size={14} />
                    </button>
                    <p className="text-sm text-white leading-relaxed">{activeItem.copy_mecanismo}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Call to Action</h3>
                  <div className="p-4 bg-[#0F0F13] border border-surface-elevated rounded-lg relative group">
                    <button className="absolute top-2 right-2 p-1.5 bg-surface rounded text-secondary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageSquare size={14} />
                    </button>
                    <p className="text-sm text-white leading-relaxed">{activeItem.copy_cta}</p>
                  </div>
                </div>
              </div>

              {/* Sidebar de Contexto no Revisor */}
              <div className="w-[280px] shrink-0 border-l border-surface-elevated pl-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Checklist de Revisão</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-surface-elevated bg-[#0F0F13] text-primary" />
                      <span className="text-sm text-secondary">Tom de voz adequado</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-surface-elevated bg-[#0F0F13] text-primary" />
                      <span className="text-sm text-secondary">Gatilhos mentais presentes</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-surface-elevated bg-[#0F0F13] text-primary" />
                      <span className="text-sm text-secondary">Clareza no mecanismo</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Notas do Copywriter</h3>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-xs text-secondary leading-relaxed">
                      "Foquei bastante no gatilho de urgência no CTA e utilizei o ângulo de 'Medo da Dor' sugerido pela IA."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary">
              <CheckCircle2 size={48} className="mb-4 opacity-20" />
              <p>Nenhum item selecionado para revisão.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
