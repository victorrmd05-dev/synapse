"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, RefreshCw, FolderKanban, PlayCircle, Clock, Microscope, PenLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ProducaoPage() {
  const [search, setSearch] = useState("");
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [gerandoCopy, setGerandoCopy] = useState<string | null>(null);

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
    // Traz junto o estado da esteira (copy e design) para saber qual é o PRÓXIMO
    // passo de cada campanha. Sem isso o card vira beco sem saída: mandar todo
    // mundo para /copywriting cai em tela vazia, porque aquela página lê
    // workflow_copywriting e a campanha recém-criada ainda não tem copy.
    const { data, error } = await supabase
      .from('campanhas_producao')
      .select(`*,
        ads_minerados(image_url, video_urls, page_profile_pic_url),
        workflow_copywriting(id, status, data_aprovacao),
        workflow_design(id, codigo_html, data_aprovacao, url_recurso)`)
      .order('data_criacao', { ascending: false });

    if (!error && data) {
      setCampanhas(data);
    }
  }

  // Rascunho da copy pelo agente Copywriting (roda no OpenCode Zen — grátis).
  // Quando a campanha veio de uma autópsia, a rota injeta as seções do dossiê no
  // prompt, então o rascunho já nasce ancorado na análise do concorrente.
  // A versão final continua podendo ser escrita no Claude Code, que sobrescreve.
  async function gerarCopy(campanhaId: string) {
    setGerandoCopy(campanhaId);
    try {
      const res = await fetch('/api/copywriting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanha_id: campanhaId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) alert(json.detalhe ?? json.error ?? 'Falha ao gerar a copy.');
    } catch (e) {
      alert((e as Error).message);
    }
    setGerandoCopy(null);
    fetchCampanhas();
  }

  /** Onde a campanha está e para onde o Fernando deve ir agora. */
  function proximoPasso(item: any): { rotulo: string; href: string | null; pronto: boolean; gerar: boolean } {
    const copy = (item.workflow_copywriting ?? [])[0];
    const design = (item.workflow_design ?? [])[0];
    const p = (rotulo: string, href: string | null, pronto = false, gerar = false) =>
      ({ rotulo, href, pronto, gerar });

    if (design?.url_recurso) return p('No ar', '/design', true);
    if (design?.codigo_html) return p('Aprovar a LP', '/design');
    if (design) return p('Aguardando a LP', null);
    if (copy?.data_aprovacao) return p('Copy aprovada', '/design');
    // Rejeitada ou vazia: dá para (re)gerar. O agente recebe as notas do revisor.
    if (copy?.status === 'rejeitado') return p('Refazer a copy', null, false, true);
    if (copy?.status === 'gerando') return p('Escrevendo a copy…', null);
    if (copy) return p('Revisar a copy', '/revisor');
    return p('Gerar a copy', null, false, true);
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

            <p className="text-xs text-secondary flex items-center gap-1.5 pt-4">
              <Clock size={12} />
              Adicionada em: {new Date(item.data_criacao).toLocaleDateString('pt-BR')}
            </p>

            {(() => {
              const passo = proximoPasso(item);
              return (
                <div className="mt-auto pt-4 flex items-center gap-3 border-t border-surface-elevated">
                  {passo.href ? (
                    <Link
                      href={passo.href}
                      className={`text-sm font-semibold flex items-center gap-1.5 hover:underline ${
                        passo.pronto ? 'text-status-green' : 'text-primary'
                      }`}
                    >
                      <PlayCircle size={14} /> {passo.rotulo}
                    </Link>
                  ) : passo.gerar ? (
                    <button
                      onClick={() => gerarCopy(item.id)}
                      disabled={gerandoCopy === item.id}
                      className="bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 disabled:opacity-40 text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      <PenLine size={14} />
                      {gerandoCopy === item.id ? 'Escrevendo…' : 'Gerar copy'}
                    </button>
                  ) : (
                    <span className="text-sm text-secondary flex items-center gap-1.5">
                      <Clock size={14} /> {passo.rotulo}
                    </span>
                  )}

                  {item.autopsia_id && (
                    <Link
                      href={`/autopsia/${item.autopsia_id}`}
                      className="ml-auto text-xs text-secondary hover:text-white flex items-center gap-1.5"
                      title="O dossiê é o briefing da copy"
                    >
                      <Microscope size={13} /> Dossiê
                    </Link>
                  )}
                </div>
              );
            })()}
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
