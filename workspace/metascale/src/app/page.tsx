"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ArrowUpRight, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function VisaoGeralPage() {
  const [totalItens, setTotalItens] = useState(0);

  useEffect(() => {
    async function fetchTotals() {
      const [min, cop, des, vid] = await Promise.all([
        supabase.from('ads_minerados').select('*', { count: 'exact', head: true }),
        supabase.from('workflow_copywriting').select('*', { count: 'exact', head: true }),
        supabase.from('workflow_design').select('*', { count: 'exact', head: true }),
        supabase.from('workflow_video').select('*', { count: 'exact', head: true })
      ]);

      const t = (min.count || 0) + (cop.count || 0) + (des.count || 0) + (vid.count || 0);
      setTotalItens(t);
    }
    
    fetchTotals();
  }, []);
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-primary" />
            Visão Geral do Ecossistema
          </h1>
          <p className="text-secondary mt-1 text-sm">Acompanhamento em tempo real de toda a esteira de produção e tráfego pago.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-surface border border-surface-elevated px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-green animate-pulse"></div>
            <span className="text-sm font-medium text-white">Supabase Conectado</span>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-surface-elevated p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} className="text-primary" />
          </div>
          <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Itens na Esteira</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">{totalItens}</h2>
            <span className="text-status-green text-sm font-medium flex items-center mb-1">
              <ArrowUpRight size={16} />
              Realtime
            </span>
          </div>
        </div>

        <div className="bg-surface border border-surface-elevated p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} className="text-status-green" />
          </div>
          <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">ROAS Global (Meta Ads)</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">3.82</h2>
            <span className="text-status-green text-sm font-medium flex items-center mb-1">
              <ArrowUpRight size={16} />
              +0.42
            </span>
          </div>
        </div>

        <div className="bg-surface border border-surface-elevated p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={48} className="text-status-green" />
          </div>
          <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-2">Lucro Líquido</p>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-bold text-white">R$ 158.4k</h2>
            <span className="text-status-green text-sm font-medium flex items-center mb-1">
              <ArrowUpRight size={16} />
              18%
            </span>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-6 rounded-xl relative overflow-hidden flex flex-col justify-center items-center text-center cursor-pointer hover:bg-primary/20 transition-colors">
          <h3 className="text-primary font-bold mb-2">Próxima Ação da IA</h3>
          <p className="text-white text-sm">O Minerador encontrou 3 novos produtos validados.</p>
          <button className="mt-4 bg-primary text-white px-4 py-2 rounded text-xs font-bold w-full uppercase tracking-wider">
            Analisar Agora
          </button>
        </div>
      </div>

      <div className="bg-surface border border-surface-elevated rounded-xl p-8 min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Activity size={48} className="text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Esteira 100% Sincronizada</h3>
          <p className="text-secondary mb-6">Todos os dados de Mineração, Copywriting, Design e Vídeos agora são alimentados em tempo real diretamente do Supabase PostgreSQL.</p>
          <Link href="/mineracao" className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-primary-hover transition-colors inline-block">
            Ver Fila de Produção
          </Link>
        </div>
      </div>
    </div>
  );
}
