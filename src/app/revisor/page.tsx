"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Save, LayoutDashboard, FileText, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TipTapEditor from '../../components/TipTapEditor';

type FilaItem = {
  id: string;
  campanha_id: string;
  title: string;
  conteudo_texto: string;
  meta_ads_copy: string;
  status: string;
  revisao_ia_score: number | null;
  revisao_ia_parecer: string | null;
};

export default function RevisorPage() {
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [activeItem, setActiveItem] = useState<FilaItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedTextPagina, setEditedTextPagina] = useState('');
  const [editedTextLegendas, setEditedTextLegendas] = useState('');
  const [activeTab, setActiveTab] = useState<'pagina' | 'legendas'>('pagina');
  const [feedbackRejeicao, setFeedbackRejeicao] = useState('');

  // Guarda os ids cuja revisão pela IA já foi disparada, pra não chamar 2x.
  const revisaoDisparada = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchFila();

    const channel = supabase.channel('revisor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_copywriting' }, () => {
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
    setFeedbackRejeicao('');
  }, [activeItem]);

  async function fetchFila() {
    const { data } = await supabase
      .from('workflow_copywriting')
      .select('*')
      .in('status', ['aguardando_revisao_ia', 'revisado_ia'])
      .is('data_aprovacao', null)
      .order('data_criacao', { ascending: false });

    if (data) {
      const mapped: FilaItem[] = data.map((item) => {
        const text = item.conteudo_texto || '';
        const lines = text.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        const firstLine = lines.length > 0
          ? lines[0].replace(/#+/g, '').replace(/\*/g, '').replace(/={3,}/g, '').trim()
          : 'Copy Sem Título';

        return {
          id: item.id,
          campanha_id: item.campanha_id,
          title: firstLine,
          conteudo_texto: item.conteudo_texto || '',
          meta_ads_copy: item.meta_ads_copy || '',
          status: item.status,
          revisao_ia_score: item.revisao_ia_score ?? null,
          revisao_ia_parecer: item.revisao_ia_parecer ?? null,
        };
      });

      setFila(mapped);

      // Mantém o item ativo sincronizado (ou seleciona o primeiro).
      setActiveItem((prev) => {
        if (prev) {
          const atualizado = mapped.find((i) => i.id === prev.id);
          if (atualizado) return atualizado;
        }
        return mapped.length > 0 ? mapped[0] : null;
      });

      // Dispara a IA revisora para itens que ainda não foram analisados.
      for (const item of mapped) {
        if (item.status === 'aguardando_revisao_ia' && !revisaoDisparada.current.has(item.id)) {
          revisaoDisparada.current.add(item.id);
          dispararRevisaoIA(item.id);
        }
      }
    }
  }

  async function dispararRevisaoIA(copyId: string) {
    try {
      const res = await fetch('/api/revisor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy_id: copyId }),
      });
      if (!res.ok) {
        // Libera para nova tentativa em caso de falha transitória.
        revisaoDisparada.current.delete(copyId);
        const erro = await res.json().catch(() => ({}));
        console.error('Falha na revisão da IA:', erro);
      }
      // O resultado chega via Realtime (status -> revisado_ia) e refaz a fila.
    } catch (err) {
      revisaoDisparada.current.delete(copyId);
      console.error('Erro ao chamar a IA revisora:', err);
    }
  }

  async function aprovarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);

    const { error: copyError } = await supabase
      .from('workflow_copywriting')
      .update({
        conteudo_texto: editedTextPagina,
        meta_ads_copy: editedTextLegendas,
        revisor_ok: true,
        status: 'aprovado',
        data_aprovacao: new Date().toISOString(),
      })
      .eq('id', activeItem.id);

    if (copyError) {
      console.error(copyError);
      alert('Erro ao aprovar a copy.');
      setIsProcessing(false);
      return;
    }

    // Sinaliza para o Webmaster/Designer.
    const { error: designError } = await supabase
      .from('workflow_design')
      .insert([{
        campanha_id: activeItem.campanha_id,
        tipo_design: 'Landing Page',
        notas_revisao: activeItem.title,
      }]);

    if (designError) {
      console.error(designError);
      alert('Copy aprovada, mas falhou ao enviar para o Design. Verifique workflow_design.');
    }

    await supabase
      .from('campanhas_producao')
      .update({ status_geral: 'Aprovado' })
      .eq('id', activeItem.campanha_id);

    setFila((prev) => prev.filter((p) => p.id !== activeItem.id));
    setActiveItem(null);
    setIsProcessing(false);
  }

  async function rejeitarCopy() {
    if (!activeItem) return;
    if (!feedbackRejeicao.trim()) {
      alert('Descreva o que precisa ser ajustado para o Copywriter regerar a copy.');
      return;
    }
    setIsProcessing(true);

    // 1. Marca a versão atual como rejeitada (mantém histórico).
    const { error } = await supabase
      .from('workflow_copywriting')
      .update({
        revisor_ok: false,
        status: 'rejeitado',
        notas_revisao: feedbackRejeicao,
      })
      .eq('id', activeItem.id);

    if (error) {
      console.error(error);
      alert('Erro ao rejeitar a copy.');
      setIsProcessing(false);
      return;
    }

    // 2. Devolve para o Copywriter regerar com o feedback como contexto.
    try {
      const res = await fetch('/api/copywriting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanha_id: activeItem.campanha_id,
          notas_revisao: feedbackRejeicao,
        }),
      });
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}));
        console.error('Falha ao regenerar copy:', erro);
        alert('Copy rejeitada, mas falhou ao acionar o Copywriter. Detalhe: ' + (erro.detalhe || erro.error || 'desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Copy rejeitada, mas falhou ao acionar o Copywriter.');
    }

    setFila((prev) => prev.filter((p) => p.id !== activeItem.id));
    setActiveItem(null);
    setIsProcessing(false);
  }

  async function salvarCopy() {
    if (!activeItem) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from('workflow_copywriting')
      .update({
        conteudo_texto: editedTextPagina,
        meta_ads_copy: editedTextLegendas,
      })
      .eq('id', activeItem.id);

    if (error) {
      console.error(error);
      alert('Erro ao salvar copy.');
    }
    setIsProcessing(false);
  }

  const analisandoIA = activeItem?.status === 'aguardando_revisao_ia';
  const score = activeItem?.revisao_ia_score ?? null;
  const scoreColor = score === null
    ? 'text-secondary'
    : score >= 80
      ? 'text-status-green'
      : score >= 60
        ? 'text-status-yellow'
        : 'text-status-red';

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
                  {item.status === 'aguardando_revisao_ia' ? (
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> IA analisando
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-status-yellow uppercase tracking-wider bg-status-yellow/10 px-2 py-0.5 rounded">
                      Revisado pela IA
                    </span>
                  )}
                  {item.revisao_ia_score !== null && (
                    <span className="text-[11px] font-bold text-white">{item.revisao_ia_score}/100</span>
                  )}
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
              <p className="text-xs text-secondary">Analise a copy e o parecer da IA, edite livremente e decida</p>
            </div>
            {activeItem && (
              <div className="flex gap-3">
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
              <div className="w-[300px] shrink-0 border-l border-surface-elevated pl-6 space-y-6">
                {/* Parecer da IA Revisora */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" /> Parecer da IA
                    </h3>
                    {score !== null && (
                      <span className={`text-lg font-bold ${scoreColor}`}>{score}<span className="text-xs text-secondary">/100</span></span>
                    )}
                  </div>

                  {analisandoIA ? (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3 text-sm text-secondary">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      A IA revisora está analisando a copy…
                    </div>
                  ) : (
                    <div className="p-3 bg-[#0F0F13] border border-surface-elevated rounded-lg max-h-[280px] overflow-y-auto custom-scrollbar">
                      <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                        {activeItem.revisao_ia_parecer || 'Sem parecer disponível.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rejeição com feedback */}
                <div>
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Rejeitar e Refazer</h3>
                  <textarea
                    value={feedbackRejeicao}
                    onChange={(e) => setFeedbackRejeicao(e.target.value)}
                    placeholder="O que o Copywriter deve ajustar? (esse feedback volta pra ele regerar a copy)"
                    className="w-full h-28 p-3 text-xs bg-[#0F0F13] border border-surface-elevated rounded-lg text-text-primary placeholder-secondary focus:outline-none focus:border-status-red/50 resize-none custom-scrollbar"
                  />
                  <button
                    onClick={rejeitarCopy}
                    disabled={isProcessing}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-status-red/10 hover:bg-status-red/20 text-status-red border border-status-red/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <XCircle size={16} /> Rejeitar e Devolver ao Copywriter
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary">
              <CheckCircle2 size={48} className="mb-4 opacity-20" />
              <p>Nenhum item aguardando revisão.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
