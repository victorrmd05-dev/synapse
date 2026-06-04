"use client";

import React, { useState, useEffect } from 'react';
import { Bell, User, CheckCircle2, XCircle, RefreshCw, AlertTriangle, MessageSquare, PlayCircle, Save, LayoutDashboard, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TipTapEditor from '../../components/TipTapEditor';

export default function RevisorPage() {
  const [fila, setFila] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedTextPagina, setEditedTextPagina] = useState('');
  const [editedTextLegendas, setEditedTextLegendas] = useState('');
  const [activeTab, setActiveTab] = useState<'pagina' | 'legendas'>('pagina');

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

  useEffect(() => {
    if (activeItem) {
      setEditedTextPagina(activeItem.conteudo_texto || '');
      setEditedTextLegendas(activeItem.meta_ads_copy || '');
    } else {
      setEditedTextPagina('');
      setEditedTextLegendas('');
    }
  }, [activeItem]);

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
          
          const lines = text.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
          const firstLine = lines.length > 0 ? lines[0].replace(/#+/g, '').replace(/\*/g, '').replace(/={3,}/g, '').trim() : 'Copy Sem Título';

          return {
            id: item.id,
            title: firstLine,
            description: text.substring(0, 100) + '...',
            conteudo_texto: item.conteudo_texto || '',
            meta_ads_copy: item.meta_ads_copy || ''
          };
        });

      setFila(mappedData);
      if (mappedData.length > 0 && (!activeItem || !mappedData.find(i => i.id === activeItem.id))) {
        setActiveItem(mappedData[0]);
      }
    }
  }

  async function rejeitarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);
    
    // Atualizar o texto antes de rejeitar para salvar o progresso ou feedback do revisor
    const { error } = await supabase
      .from('workflow_copywriting')
      .update({ 
        revisor_ok: false,
        conteudo_texto: editedTextPagina,
        meta_ads_copy: editedTextLegendas
      })
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
    
    // Atualizar o texto final
    await supabase.from('workflow_copywriting').update({ 
      conteudo_texto: editedTextPagina,
      meta_ads_copy: editedTextLegendas,
      aprovado_humano: true 
    }).eq('id', activeItem.id);

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
    } else {
      console.error(designError);
      alert("Erro ao enviar para o Design. Verifique a tabela workflow_design.");
    }
    setIsProcessing(false);
  }

  async function salvarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);
    
    const { error } = await supabase
      .from('workflow_copywriting')
      .update({ 
        conteudo_texto: editedTextPagina,
        meta_ads_copy: editedTextLegendas
      })
      .eq('id', activeItem.id);

    if (error) {
      console.error(error);
      alert("Erro ao salvar copy.");
    }
    
    setIsProcessing(false);
  }


  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="flex-1 flex gap-8 overflow-hidden">
        
        {/* Fila de Revisão */}
        <div className="w-[340px] flex flex-col shrink-0 overflow-y-auto custom-scrollbar pr-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Aguardando Revisão</h2>
            <div className="flex items-center gap-2 text-[10px] font-medium text-status-yellow bg-status-yellow/10 px-2 py-1 rounded-full border border-status-yellow/20 uppercase tracking-wider">
              <AlertTriangle size={12} />
              {fila.length} Pendentes
            </div>
          </div>
          
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
                <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Editor de Revisão */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
          <div className="p-5 border-b border-surface-elevated flex items-center justify-between bg-[#0a0a0f]">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Editor & Revisão</h2>
              <p className="text-xs text-secondary">Analise a copy gerada, edite livremente e aprove para produção</p>
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
                  onClick={salvarCopy}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> Salvar
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
              {/* Main Editor Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F0F13] border border-surface-elevated rounded-xl">
                <div className="flex items-center gap-6 px-6 pt-4 border-b border-surface-elevated bg-[#0a0a0f] shrink-0">
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
                  {activeTab === 'pagina' ? (
                    <TipTapEditor 
                      key="editor-pagina"
                      content={editedTextPagina} 
                      onChange={setEditedTextPagina} 
                    />
                  ) : (
                    <TipTapEditor 
                      key="editor-legendas"
                      content={editedTextLegendas} 
                      onChange={setEditedTextLegendas} 
                    />
                  )}
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
                      &quot;A copy reflete o conteúdo integral da Sales Page ou das Legendas de Ads geradas. Edite as seções, remova marcações e finalize o texto que será passado para o Webmaster ou Designer.&quot;
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
