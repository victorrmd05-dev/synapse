"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MetaMetricsGrid } from '@/components/campaigns/MetaMetricsGrid';
import { FunnelBars } from '@/components/campaigns/FunnelBars';
import { AIAnalyst } from '@/components/campaigns/AIAnalyst';
import { TrendChart } from '@/components/campaigns/TrendChart';

const mockCampaign = {
  id: '1',
  meta_campaign_id: '23849102394',
  nome: 'Verão 2024 — Broad',
  objetivo: 'Conversão',
  conjunto: 'Broad 18-45',
  metrics: {
    id: 'm1',
    campaign_id: '1',
    data: new Date().toISOString(),
    impressoes: 248500,
    alcance: 187200,
    frequencia: 1.33,
    cliques_link: 6958,
    ctr: 2.80,
    cpc: 1.85,
    cpm: 18.10,
    valor_gasto: 4500.00,
    landing_page_views: 5845,
    checkouts_iniciados: 701,
    compras: 360,
    valor_conversao: 15300.00,
    roas: 3.4,
    cpa: 12.50,
    connect_rate: 0.84, 
    conversao_lp: 0.12, 
    conversao_checkout: 0.14, 
    conversao_global: 0.014, 
    escala_status: 'escalavel' as const,
    criado_em: new Date().toISOString()
  }
};

const mockDiagnostic = {
  id: 'd1',
  campaign_id: '1',
  metrics_id: 'm1',
  data: new Date().toISOString(),
  gargalo: 'nenhum',
  diagnostico: 'A campanha apresenta ROAS excelente (3.4x) e funil bem calibrado. O Connect Rate (84%) está marginalmente acima do mínimo de 80% — há oportunidade de otimizar a velocidade da LP para empurrar para 90%+, o que pode aumentar as vendas em até 7% sem aumentar orçamento. Recomendo escalar com cautela: +20% no orçamento, monitorando CPA por 48h.',
  recomendacoes: [
    { texto: 'Otimizar compressão de imagens e lazy loading da landing page — impacto direto no Connect Rate', prioridade: 'alta' as const },
    { texto: 'Duplicar conjunto vencedor e aumentar orçamento +20% no original', prioridade: 'alta' as const },
    { texto: 'Revisar Conversions API (CAPI) — garantir cobertura ≥80% dos eventos', prioridade: 'media' as const },
    { texto: 'Testar novo criativo estático com mesmo ângulo de copy do vencedor', prioridade: 'baixa' as const }
  ],
  prioridade: 'alta',
  criado_em: new Date().toISOString()
};

export default function CampaignsPage() {
  const campaign = mockCampaign;
  const m = campaign.metrics;

  return (
    <div className="flex flex-col min-h-screen pb-10">
      {/* Custom TopBar for Campaign Details to match image */}
      <header className="flex items-center justify-between pb-4 border-b border-[#2A2A38] mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-medium text-[#F1F1F3]">Campaign Detail</h2>
          <span className="text-[#2A2A38]">|</span>
          <p className="text-[13px] text-[#8B8BA0]">Act. #1203948021</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full border border-[#2A2A38] flex items-center justify-center text-[#8B8BA0] hover:text-[#F1F1F3] hover:bg-[#1A1A24]">
            <User size={14} />
          </button>
          <button className="w-8 h-8 rounded-full border border-[#2A2A38] flex items-center justify-center text-[#8B8BA0] hover:text-[#F1F1F3] hover:bg-[#1A1A24]">
            <Bell size={14} />
          </button>
          <button className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
            Sync Data
          </button>
        </div>
      </header>

      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors mb-2">
          <ChevronLeft size={14} />
          Voltar ao Dashboard
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-[22px] font-bold text-[#F1F1F3]">{campaign.nome}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                ESCALÁVEL
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[#8B8BA0]">
              <span className="px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38]">ID: {campaign.meta_campaign_id}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38]">Meta Ads Network</span>
              <span className="px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38]">Objetivo: {campaign.objetivo}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38]">Conjunto: {campaign.conjunto}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-transparent border border-[#2A2A38] text-[#F1F1F3] px-4 py-1.5 rounded-md text-[13px] font-medium hover:bg-[#1A1A24] transition-colors">
              Editar
            </button>
            <button className="bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors">
              Forçar Escala
            </button>
          </div>
        </div>

        <MetaMetricsGrid metrics={m} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6">
          <FunnelBars metrics={m} />
          <AIAnalyst diagnostic={mockDiagnostic} />
        </div>

        <TrendChart />
      </div>
    </div>
  );
}
