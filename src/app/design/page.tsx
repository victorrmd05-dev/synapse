"use client";

import React, { useState, useEffect } from 'react';
import { Search, Monitor, Smartphone, Globe, ExternalLink, CheckCircle2, Download, Rocket, Edit2, Eye, X, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DesignPage() {
  const [lps, setLps] = useState<any[]>([]);
  const [activeLp, setActiveLp] = useState<any>(null);

  useEffect(() => {
    fetchLps();

    const channel = supabase.channel('design_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_design' }, (payload) => {
        fetchLps();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // O estado da LP é derivado das colunas reais de workflow_design (não há
  // coluna "status"). Assim o rótulo nunca desincroniza do estado de verdade:
  //   sem HTML            -> Aguardando Design (copy já aprovada pelo Revisor)
  //   com HTML            -> Pronta p/ Revisão
  //   data_aprovacao set  -> Aprovada p/ Tráfego
  //   url_recurso set     -> No Ar (deploy feito)
  function getDesignStatus(lp: any): { label: string; cls: string } {
    if (lp.url_recurso) return { label: 'No Ar', cls: 'bg-status-green/20 text-status-green' };
    if (lp.data_aprovacao) return { label: 'Aprovada p/ Tráfego', cls: 'bg-status-green/20 text-status-green' };
    if (lp.codigo_html) return { label: 'Pronta p/ Revisão', cls: 'bg-primary/20 text-primary' };
    return { label: 'Aguardando Design', cls: 'bg-status-yellow/20 text-status-yellow' };
  }

  async function fetchLps() {
    const { data, error } = await supabase
      .from('workflow_design')
      .select('*')
      .order('data_criacao', { ascending: false });
    
    if (!error && data) {
      setLps(data);
      if (data.length > 0 && !activeLp) {
        setActiveLp(data[0]);
      }
    }
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
            placeholder="Pesquisar landing pages..."
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 bg-surface border border-surface-elevated rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
            <span className="text-xs font-medium text-secondary">Supabase Sync: Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Column 1: Fila de LPs */}
        <div className="w-[280px] flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-semibold">Landing Pages</h2>
            <span className="px-2 py-0.5 bg-surface-elevated rounded-full text-xs text-secondary font-medium">{lps.length} itens</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {lps.map((lp) => (
              <div 
                key={lp.id} 
                onClick={() => setActiveLp(lp)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                  activeLp?.id === lp.id 
                    ? 'bg-surface border-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'bg-surface border-surface-elevated hover:border-surface-elevated/80 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getDesignStatus(lp).cls}`}>
                    {getDesignStatus(lp).label}
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{lp.title || lp.notas_revisao || lp.tipo_design || 'Landing Page Nova'}</h3>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Briefcase size={12} /> {lp.niche || 'Nicho indefinido'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Desktop Preview (Interactive) */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-surface-elevated flex items-center justify-between bg-[#0F0F13]">
            <div className="flex items-center gap-3">
              <Monitor className="text-primary" size={18} />
              <h2 className="text-white font-semibold text-sm">Preview Desktop</h2>
            </div>
            <button 
              onClick={() => {
                if (!activeLp?.codigo_html) return;
                const blob = new Blob([activeLp.codigo_html], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated hover:bg-surface-elevated/80 text-white rounded text-xs font-medium transition-colors cursor-pointer"
            >
              <ExternalLink size={14} /> Abrir no Navegador
            </button>
          </div>
          
          <div className="flex-1 bg-white relative overflow-hidden">
            {activeLp ? (
              activeLp.codigo_html ? (
                <iframe 
                  srcDoc={activeLp.codigo_html} 
                  className="w-full h-full border-0"
                  title="Desktop Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0F13]">
                  <Globe size={48} className="text-surface-elevated mb-4" />
                  <p className="text-secondary text-sm">Nenhum HTML encontrado para esta LP.</p>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F13]">
                <p className="text-secondary text-sm">Selecione uma Landing Page na fila.</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Side Panel - Details & Mobile */}
        <div className="w-[360px] shrink-0 bg-surface border border-surface-elevated rounded-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-surface-elevated flex items-start justify-between bg-[#0F0F13]">
            <div>
              <h2 className="text-white font-bold text-lg">Mobile & Status</h2>
              {activeLp && <p className="text-xs text-secondary mt-1 uppercase tracking-wider">ID: {activeLp.id.split('-')[0]}</p>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {activeLp ? (
              <>
                {/* Mobile Preview */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Smartphone size={14} /> Preview Mobile
                    </h3>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-[280px] h-[540px] bg-white border-[12px] border-[#0a0a0f] rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-surface-elevated">
                      {/* Notch simulation */}
                      <div className="absolute top-0 inset-x-0 h-5 bg-[#0a0a0f] rounded-b-2xl w-24 mx-auto z-10"></div>
                      
                      {activeLp.codigo_html ? (
                        <div className="absolute inset-0 pt-4 overflow-hidden rounded-[1.5rem]">
                          <iframe 
                            srcDoc={activeLp.codigo_html} 
                            className="border-0 bg-white"
                            style={{ width: '375px', height: '756px', transform: 'scale(0.6826)', transformOrigin: 'top left' }}
                            title="Mobile Preview"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-[#0F0F13]">
                          <Globe size={32} className="text-surface-elevated mb-3" />
                          <p className="text-xs text-secondary">Sem HTML</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Technical Health */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Technical Health</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#0F0F13] border border-surface-elevated rounded-lg p-3 flex items-center justify-between">
                      <span className="text-xs text-secondary font-medium">SSL</span>
                      <CheckCircle2 size={16} className="text-status-green" />
                    </div>
                    <div className="bg-[#0F0F13] border border-surface-elevated rounded-lg p-3 flex items-center justify-between">
                      <span className="text-xs text-secondary font-medium">Pixel</span>
                      <CheckCircle2 size={16} className="text-status-green" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0F0F13] border border-surface-elevated rounded-lg p-3">
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-xs text-secondary font-medium">Desktop SPD</span>
                        <span className="text-lg font-bold text-status-green">98</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-status-green" style={{ width: `98%` }}></div>
                      </div>
                    </div>
                    <div className="bg-[#0F0F13] border border-surface-elevated rounded-lg p-3">
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-xs text-secondary font-medium">Mobile SPD</span>
                        <span className="text-lg font-bold text-status-yellow">85</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-status-yellow" style={{ width: `85%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-secondary text-sm">Selecione uma Landing Page.</p>
            )}
          </div>

          <div className="p-5 border-t border-surface-elevated bg-[#0a0a0f] space-y-3">
            <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors">
              <Rocket size={16} /> Aprovar para Tráfego
            </button>
            <div className="flex gap-3">
              <button className="flex-1 border border-surface-elevated hover:bg-surface text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                <Edit2 size={14} /> Editar
              </button>
              <button 
                onClick={() => {
                  if (!activeLp?.codigo_html) return;
                  const blob = new Blob([activeLp.codigo_html], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                className="flex-1 border border-surface-elevated hover:bg-surface text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
              >
                <Eye size={14} /> Live Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
