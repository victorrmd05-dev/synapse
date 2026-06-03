"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MetaMetricsGrid } from '@/components/campaigns/MetaMetricsGrid';
import { FunnelBars } from '@/components/campaigns/FunnelBars';
import { AIAnalyst } from '@/components/campaigns/AIAnalyst';
import { TrendChart } from '@/components/campaigns/TrendChart';

// Mock Data
const mockCampaign = {
  id: '1',
  meta_campaign_id: '1234567890',
  nome: 'CBO - Coleção Inverno - Drop V1',
  objetivo: 'CONVERSIONS',
  conta: 'Minha Loja Drop',
  metrics: {
    id: 'm1',
    campaign_id: '1',
    data: new Date().toISOString(),
    impressoes: 15420,
    alcance: 12000,
    frequencia: 1.28,
    cliques_link: 345,
    ctr: 2.23,
    cpc: 1.45,
    cpm: 32.40,
    valor_gasto: 500.25,
    landing_page_views: 310,
    checkouts_iniciados: 45,
    compras: 6,
    valor_conversao: 1200.00,
    roas: 2.4,
    cpa: 83.37,
    connect_rate: 0.89, 
    conversao_lp: 0.145, 
    conversao_checkout: 0.133, 
    conversao_global: 0.019, 
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
  diagnostico: 'A campanha apresenta forte retenção ao longo de todo o funil. O Connect Rate de 89% indica que a LP carrega rápido e não há quebra de expectativa do criativo. O ROAS de 2.4 garante margem de contribuição saudável.',
  recomendacoes: [
    { texto: 'Aumentar o orçamento do CBO em 20% a cada 24 horas.', prioridade: 'alta' as const },
    { texto: 'Isolar os criativos campeões em uma campanha de ABO para testar variações (Hooks diferentes).', prioridade: 'media' as const }
  ],
  prioridade: 'alta',
  criado_em: new Date().toISOString()
};

export default function CampaignDetailsPage({ params }: { params: { id: string } }) {
  // na vida real faria fetch pelo ID (ex: params.id)
  const campaignId = params.id;
  const campaign = { ...mockCampaign, id: campaignId };
  const m = campaign.metrics;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors mb-2">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-[#F1F1F3]">{campaign.nome}</h1>
            <Badge status={m.escala_status} />
          </div>
          <div className="flex gap-4 text-sm text-[#8B8BA0]">
            <span>ID: {campaign.meta_campaign_id}</span>
            <span>•</span>
            <span>{campaign.objetivo}</span>
            <span>•</span>
            <span>Conta: {campaign.conta}</span>
          </div>
        </div>

        <button className="bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#6366F1]/20">
          Forçar Escala
        </button>
      </div>

      <MetaMetricsGrid metrics={m} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelBars metrics={m} />
        <AIAnalyst diagnostic={mockDiagnostic} />
      </div>

      <TrendChart />
    </div>
  );
}
