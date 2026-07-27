"use client";

// Lista de autópsias. A mineração acha muitos anúncios rasos; a autópsia
// disseca UM anunciante a fundo. Telas separadas de propósito: mineração é
// lista larga que se percorre rápido, autópsia é peça longa que se lê.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Microscope, Loader2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Autopsia {
  id: string;
  page_id: string;
  page_name: string | null;
  page_profile_pic_url: string | null;
  status: string;
  progresso: number;
  total_anuncios: number;
  total_criativos: number;
  total_transcritos: number;
  erro: string | null;
  criado_em: string;
}

const STATUS_COR: Record<string, string> = {
  coletando: 'text-status-yellow',
  processando: 'text-status-yellow',
  montando: 'text-primary',
  pronta: 'text-status-green',
  erro: 'text-status-red',
};

export default function AutopsiaPage() {
  const [autopsias, setAutopsias] = useState<Autopsia[]>([]);
  const [loading, setLoading] = useState(true);
  const [entrada, setEntrada] = useState('');
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAutopsias();
    const channel = supabase
      .channel('autopsias_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsias' }, fetchAutopsias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAutopsias() {
    const { data, error } = await supabase
      .from('autopsias')
      .select('*')
      .order('criado_em', { ascending: false });
    if (!error && data) setAutopsias(data as Autopsia[]);
    setLoading(false);
  }

  async function criar() {
    if (!entrada.trim() || criando) return;
    setCriando(true);
    setMsg(null);
    try {
      const res = await fetch('/api/autopsia/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: entrada.trim(), url: entrada.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? 'Falha ao criar a autópsia.');
      } else {
        setMsg(
          `${json.total_anuncios} anúncios → ${json.total_criativos} criativos únicos. ` +
          `Rode o worker para processar: node/py scripts/worker-autopsia.py`
        );
        setEntrada('');
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
    setCriando(false);
  }

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Microscope className="text-primary" size={26} />
          Autópsia de Concorrente
        </h1>
        <p className="text-secondary text-sm mt-1">
          A mineração acha anúncios. A autópsia disseca um anunciante — todos os criativos,
          a copy falada, a estrutura da oferta.
        </p>
      </div>

      <div className="bg-surface border border-surface-elevated rounded-xl p-5 mb-8">
        <label className="text-xs uppercase tracking-wider text-secondary font-semibold">
          Nova autópsia
        </label>
        <div className="flex gap-3 mt-2">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && criar()}
            placeholder="page_id (ex: 1130979790090955) ou URL da Biblioteca de Anúncios"
            className="flex-1 bg-[#0D0D14] border border-surface-elevated rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-secondary focus:outline-none focus:border-primary"
          />
          <button
            onClick={criar}
            disabled={criando || !entrada.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all"
          >
            {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {criando ? 'Coletando…' : 'Autopsiar'}
          </button>
        </div>
        {msg && <p className="text-xs text-secondary mt-3">{msg}</p>}
      </div>

      {loading ? (
        <div className="text-secondary text-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Carregando…
        </div>
      ) : autopsias.length === 0 ? (
        <div className="text-center py-20 text-secondary">
          <Microscope size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma autópsia ainda. Cole um page_id acima ou use o botão em Mineração.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {autopsias.map((a) => (
            <Link
              key={a.id}
              href={`/autopsia/${a.id}`}
              className="bg-surface border border-surface-elevated hover:border-primary/40 rounded-xl p-5 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {a.page_profile_pic_url ? (
                  <img src={a.page_profile_pic_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface-elevated" />
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{a.page_name ?? a.page_id}</p>
                  <p className="text-secondary text-[11px]">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs mb-3">
                <span className={`font-semibold uppercase tracking-wide ${STATUS_COR[a.status] ?? 'text-secondary'}`}>
                  {a.status === 'pronta' ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                  {a.status}
                </span>
                {a.erro && <AlertCircle size={12} className="text-status-red" />}
              </div>

              <div className="h-1.5 bg-[#0D0D14] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary transition-all" style={{ width: `${a.progresso}%` }} />
              </div>

              <div className="flex gap-4 text-[11px] text-secondary">
                <span>{a.total_anuncios} anúncios</span>
                <span className="text-white">{a.total_criativos} criativos</span>
                <span>{a.total_transcritos} transcritos</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
