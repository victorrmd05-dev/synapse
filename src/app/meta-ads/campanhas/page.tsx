"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Sparkles, ChevronDown, Save, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { MetaMetricsGrid } from '@/components/campaigns/MetaMetricsGrid';
import { FunnelBars } from '@/components/campaigns/FunnelBars';
import { AIAnalyst } from '@/components/campaigns/AIAnalyst';
import { TrendChart } from '@/components/campaigns/TrendChart';
import { DeepAnalysis } from '@/components/campaigns/DeepAnalysis';
import { OptimizationPlan, OptimizationPlanRow } from '@/components/campaigns/OptimizationPlan';
import { AdsetsPanel } from '@/components/campaigns/AdsetsPanel';
import { AdCreatives } from '@/components/campaigns/AdCreatives';
import { DiagnosticsHistory } from '@/components/campaigns/DiagnosticsHistory';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  RangeSelection,
  DEFAULT_RANGE,
  loadRange,
  saveRange,
  rangeToQuery,
  rangeLabel,
} from '@/lib/date-range';
import { Campaign, CampaignMetrics, EscalaStatus, AIDiagnostic, CampaignAnalysis, DeepDiagnostic } from '@/types';

function mapRowToCampaign(camp: any, metric: any | undefined): Campaign {
  const metrics: CampaignMetrics | undefined = metric
    ? {
        id: metric.id,
        campaign_id: camp.meta_campaign_id,
        data: metric.data,
        impressoes: Number(metric.impressoes) || 0,
        alcance: Number(metric.alcance) || 0,
        frequencia: Number(metric.frequencia) || 0,
        cliques_link: Number(metric.cliques_link) || 0,
        ctr: Number(metric.ctr) || 0,
        cpc: Number(metric.cpc) || 0,
        cpm: Number(metric.cpm) || 0,
        valor_gasto: Number(metric.valor_gasto) || 0,
        landing_page_views: Number(metric.landing_page_views) || 0,
        checkouts_iniciados: Number(metric.checkouts_iniciados) || 0,
        compras: Number(metric.compras) || 0,
        valor_conversao: Number(metric.valor_conversao) || 0,
        roas: Number(metric.roas) || 0,
        cpa: Number(metric.cpa) || 0,
        connect_rate: Number(metric.connect_rate) || 0,
        conversao_lp: Number(metric.conversao_lp) || 0,
        conversao_checkout: Number(metric.conversao_checkout) || 0,
        conversao_global: Number(metric.conversao_global) || 0,
        escala_status: (metric.escala_status as EscalaStatus) || 'otimizar',
        criado_em: metric.criado_em,
      }
    : undefined;

  return {
    id: camp.meta_campaign_id,
    ad_account_id: camp.ad_account_id,
    meta_campaign_id: camp.meta_campaign_id,
    nome: camp.nome,
    status: camp.status,
    objetivo: camp.objetivo,
    ativo: camp.ativo,
    criado_em: camp.criado_em,
    metrics,
  };
}

function CampanhasInner() {
  const searchParams = useSearchParams();
  const queryCampaign = searchParams.get('campaign');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, AIDiagnostic>>({});
  const [plans, setPlans] = useState<Record<string, OptimizationPlanRow>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados da Análise Profunda
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);
  const [deep, setDeep] = useState<DeepDiagnostic | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Janela de data — mesma seleção/memória do Dashboard (localStorage compartilhado)
  const [range, setRange] = useState<RangeSelection>(DEFAULT_RANGE);
  const [isSyncingRange, setIsSyncingRange] = useState(false);

  // Restaura a janela salva no navegador ao montar
  useEffect(() => {
    setRange(loadRange());
  }, []);

  const fetchDados = useCallback(async () => {
    const { data: camps } = await supabase
      .from('meta_campaigns')
      .select('*')
      .order('ativo', { ascending: false });
    const { data: metrics } = await supabase
      .from('meta_campaign_metrics')
      .select('*')
      .order('data', { ascending: false });
    const { data: diags } = await supabase
      .from('meta_ai_diagnostics')
      .select('*')
      .order('data', { ascending: false });
    const { data: planRows } = await supabase
      .from('meta_optimization_plans')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!camps) {
      setLoading(false);
      return;
    }

    // Plano mais recente por campanha
    const planByCampaign: Record<string, OptimizationPlanRow> = {};
    for (const p of planRows || []) {
      if (!planByCampaign[p.meta_campaign_id]) planByCampaign[p.meta_campaign_id] = p as OptimizationPlanRow;
    }
    setPlans(planByCampaign);

    const latestMetric = new Map<string, any>();
    for (const m of metrics || []) {
      if (!latestMetric.has(m.meta_campaign_id)) latestMetric.set(m.meta_campaign_id, m);
    }

    const diagByCampaign: Record<string, AIDiagnostic> = {};
    for (const d of diags || []) {
      if (!diagByCampaign[d.meta_campaign_id]) {
        diagByCampaign[d.meta_campaign_id] = {
          id: d.id,
          campaign_id: d.meta_campaign_id,
          metrics_id: '',
          data: d.data,
          gargalo: d.gargalo || 'nenhum',
          diagnostico: d.diagnostico || '',
          recomendacoes: Array.isArray(d.recomendacoes) ? d.recomendacoes : [],
          prioridade: d.prioridade || 'media',
          criado_em: d.criado_em,
        };
      }
    }

    const mapped = camps
      .map((c) => mapRowToCampaign(c, latestMetric.get(c.meta_campaign_id)))
      .filter((c) => c.metrics && c.ativo) // só campanhas ativas no Gerenciador
      .sort((a, b) => (b.metrics!.valor_gasto || 0) - (a.metrics!.valor_gasto || 0));

    setCampaigns(mapped);
    setDiagnostics(diagByCampaign);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDados();
    const channel = supabase
      .channel('campanhas_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_campaign_metrics' }, fetchDados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_ai_diagnostics' }, fetchDados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_optimization_plans' }, fetchDados)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDados]);

  // Define a campanha selecionada: query param > primeira da lista
  useEffect(() => {
    if (campaigns.length === 0) return;
    setSelectedId((prev) => {
      if (prev && campaigns.some((c) => c.id === prev)) return prev;
      if (queryCampaign && campaigns.some((c) => c.id === queryCampaign)) return queryCampaign;
      return campaigns[0].id;
    });
  }, [campaigns, queryCampaign]);

  // Reseta a Análise Profunda ao trocar de campanha
  useEffect(() => {
    setAnalysis(null);
    setDeep(null);
    setDeepError(null);
    setSaveState('idle');
  }, [selectedId]);

  // Troca de janela de data → persiste, re-sincroniza as métricas na Meta
  // (a rota sync grava o snapshot da janela no Supabase) e limpa a Análise
  // Profunda (as quebras eram de outra janela).
  const handleRangeChange = useCallback(
    async (sel: RangeSelection) => {
      saveRange(sel);
      setRange(sel);
      setAnalysis(null);
      setDeep(null);
      setDeepError(null);
      setIsSyncingRange(true);
      try {
        await fetch(`/api/meta/sync?${rangeToQuery(sel)}`, { method: 'GET' });
        await fetchDados();
      } catch {
        // Realtime cobre se o fetch manual falhar
      } finally {
        setIsSyncingRange(false);
      }
    },
    [fetchDados]
  );

  const selected = campaigns.find((c) => c.id === selectedId) || null;
  const selectedDiagnostic = selectedId ? diagnostics[selectedId] ?? null : null;
  const selectedPlan = selectedId ? plans[selectedId] ?? null : null;

  const handleGeneratePlan = async () => {
    if (!selectedId) return;
    setIsGeneratingPlan(true);
    setErro(null);
    try {
      const res = await fetch('/api/meta/optimize/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_campaign_id: selectedId }),
      });
      const json = await res.json();
      if (!json.success) setErro(json.error || 'Falha ao gerar plano');
      await fetchDados();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao gerar plano');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('Criar a campanha otimizada em PAUSED na sua conta Meta? Nada vai gastar até você dar o play no Gerenciador.')) return;
    setIsExecuting(true);
    setErro(null);
    try {
      const res = await fetch('/api/meta/optimize/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan.id }),
      });
      const json = await res.json();
      if (!json.success) setErro(json.error || 'Falha na execução');
      await fetchDados();
    } catch (e: any) {
      setErro(e?.message || 'Falha na execução');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDecide = async (decisao: 'aprovar' | 'rejeitar') => {
    if (!selectedPlan) return;
    setIsDeciding(true);
    setErro(null);
    try {
      const res = await fetch('/api/meta/optimize/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan.id, decisao }),
      });
      const json = await res.json();
      if (!json.success) setErro(json.error || 'Falha ao registrar decisão');
      await fetchDados();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao registrar decisão');
    } finally {
      setIsDeciding(false);
    }
  };

  const handleDiagnose = async () => {
    if (!selectedId) return;
    setIsDiagnosing(true);
    setErro(null);
    try {
      const res = await fetch('/api/meta/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_campaign_id: selectedId }),
      });
      const json = await res.json();
      if (!json.success) setErro(json.error || 'Falha no diagnóstico');
      await fetchDados();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao pedir diagnóstico');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRunDeep = async () => {
    if (!selected) return;
    setDeepLoading(true);
    setDeepError(null);
    setDeep(null);
    try {
      const res = await fetch(
        `/api/meta/analysis?campaignId=${selected.meta_campaign_id}&${rangeToQuery(range)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha na análise profunda.');
      const a: CampaignAnalysis = {
        byAdset: data.byAdset || [],
        byPlacement: data.byPlacement || [],
        byAge: data.byAge || [],
      };
      setAnalysis(a);
      setDeepLoading(false);

      setAiLoading(true);
      let deepResult: DeepDiagnostic | null = null;
      try {
        const air = await fetch('/api/ai/deep-diagnostic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignName: selected.nome, analysis: a }),
        });
        const aid = await air.json();
        if (aid.success && aid.diagnostic) {
          deepResult = aid.diagnostic;
          setDeep(aid.diagnostic);
        }
      } catch {
        // Ignora erro
      } finally {
        setAiLoading(false);
      }

      // Auto-save: toda Análise Profunda gera o relatório COMPLETO
      // (.md em analises-ia/ + relatorio_md no histórico), sem clique extra.
      await handleSaveDiagnostic({ analysisArg: a, deepArg: deepResult });
    } catch (err: any) {
      setDeepError(err?.message || 'Erro ao rodar a análise profunda.');
      setDeepLoading(false);
    }
  };

  const handlePauseAdset = async (adsetId: string, _nome: string) => {
    try {
      const res = await fetch('/api/meta/adset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsetId, status: 'PAUSED' }),
      });
      const data = await res.json();
      return { success: !!data.success, error: data.error };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro de rede.' };
    }
  };

  // Salva a PÁGINA INTEIRA (métricas + funil + diagnóstico + Análise Profunda +
  // media buyer + plano) num .md arrastável, além do relatório completo no
  // Supabase (relatorio_md — o Histórico mostra a análise inteira).
  // Aceita analysis/deep por argumento porque o auto-save roda logo após a
  // Análise Profunda, antes do estado do React atualizar.
  const handleSaveDiagnostic = async (opts?: {
    analysisArg?: CampaignAnalysis | null;
    deepArg?: DeepDiagnostic | null;
  }) => {
    if (!selected) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/diagnostics/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_campaign_id: selected.meta_campaign_id,
          campaign_nome: selected.nome,
          objetivo: selected.objetivo,
          status: selected.ativo ? 'Ativa' : 'Pausada',
          range_label: rangeLabel(range),
          gargalo: selectedDiagnostic?.gargalo ?? 'nenhum',
          diagnostico:
            selectedDiagnostic?.diagnostico ||
            '_(diagnóstico do funil ainda não gerado — use "Pedir diagnóstico desta campanha")_',
          recomendacoes: selectedDiagnostic?.recomendacoes ?? [],
          prioridade: selectedDiagnostic?.prioridade ?? 'media',
          metrics: selected.metrics,
          analysis: opts?.analysisArg !== undefined ? opts.analysisArg : analysis,
          deep: opts?.deepArg !== undefined ? opts.deepArg : deep,
          plan: selectedPlan?.plano ?? null,
        }),
      });
      const json = await res.json();
      setSaveState(json.success ? 'saved' : 'error');
      setSavedFile(json.success && json.mdFile ? json.mdFile : null);
    } catch {
      setSaveState('error');
    }
  };

  if (loading) {
    return <div className="text-center text-[#8B8BA0] text-sm mt-10">Carregando campanhas…</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="max-w-7xl mx-auto text-center bg-[#111116] border border-[#2A2A38] rounded-xl p-12 mt-10">
        <h3 className="text-[#F1F1F3] text-lg font-bold mb-2">Nenhuma campanha ativa</h3>
        <p className="text-[#8B8BA0] text-sm">
          Esta página mostra apenas campanhas ativas no Gerenciador. Ative uma campanha no Meta, vá ao{' '}
          <Link href="/meta-ads/dashboard" className="text-[#6366F1]">Dashboard</Link> e clique em
          <span className="text-[#6366F1]"> Sync Data</span>.
        </p>
      </div>
    );
  }

  const m = selected?.metrics;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/meta-ads/dashboard" className="inline-flex items-center gap-2 text-sm text-[#8B8BA0] hover:text-[#F1F1F3] transition-colors">
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {isSyncingRange && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#8B8BA0]">
              <RefreshCw size={12} className="animate-spin" />
              Sincronizando janela…
            </span>
          )}

          {/* Janela de data — mesma do Dashboard (Hoje/Ontem/3/7/14/30d/Personalizado) */}
          <DateRangePicker value={range} onChange={handleRangeChange} disabled={isSyncingRange} />

          {/* Seletor de campanha — essencial para escala (várias campanhas ativas) */}
          <div className="relative">
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none bg-[#1A1A24] border border-[#2A2A38] text-[#F1F1F3] text-sm rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-[#6366F1] cursor-pointer min-w-[280px]"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ativo ? '🟢 ' : '⚪ '}{c.nome}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] pointer-events-none" />
          </div>
        </div>
      </div>

      {erro && (
        <div className="px-4 py-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-sm">
          {erro}
        </div>
      )}

      {selected && m && (
        <>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-[#F1F1F3]">{selected.nome}</h1>
                <Badge status={m.escala_status} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#8B8BA0]">
                <span>ID: {selected.meta_campaign_id}</span>
                <span>•</span>
                <span>{selected.objetivo}</span>
                <span>•</span>
                <span>{selected.ativo ? 'Ativa' : 'Pausada'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveState !== 'idle' && (
                <span
                  className={`text-[11px] max-w-[260px] truncate ${saveState === 'error' ? 'text-red-400' : 'text-[#22C55E]'}`}
                  title={savedFile ? `analises-ia/${savedFile}` : undefined}
                >
                  {saveState === 'saving'
                    ? 'Salvando…'
                    : saveState === 'saved'
                      ? `Salvo: analises-ia/${savedFile || ''}`
                      : 'Falha ao salvar'}
                </span>
              )}
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Ver diagnósticos salvos"
              >
                <History size={16} />
                Histórico
              </button>
              <button
                onClick={() => handleSaveDiagnostic()}
                disabled={saveState === 'saving'}
                className="flex items-center gap-2 bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Salvar a análise completa (.md em analises-ia/ + histórico)"
              >
                {saveState === 'saving' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar análise
              </button>
              <button
                onClick={handleDiagnose}
                disabled={isDiagnosing}
                className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#6366F1]/20 disabled:opacity-50"
              >
                {isDiagnosing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isDiagnosing ? 'Analisando…' : 'Pedir diagnóstico desta campanha'}
              </button>
            </div>
          </div>

          <MetaMetricsGrid metrics={m} rangeLabel={rangeLabel(range)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelBars metrics={m} />
            <AIAnalyst diagnostic={selectedDiagnostic} />
          </div>

          <DeepAnalysis 
            analysis={analysis}
            deep={deep}
            loading={deepLoading}
            aiLoading={aiLoading}
            error={deepError}
            onRun={handleRunDeep}
            onPauseAdset={handlePauseAdset}
          />

          {/* Conjuntos sempre visíveis (sem depender da Análise Profunda) */}
          <AdsetsPanel
            campaignId={selected.meta_campaign_id}
            rangeQuery={rangeToQuery(range)}
            rangeLabel={rangeLabel(range)}
          />

          {/* Criativos dos anúncios (imagem + copy) */}
          <AdCreatives campaignId={selected.meta_campaign_id} />

          <OptimizationPlan
            plan={selectedPlan}
            isGenerating={isGeneratingPlan}
            isDeciding={isDeciding}
            isExecuting={isExecuting}
            onGenerate={handleGeneratePlan}
            onDecide={handleDecide}
            onExecute={handleExecute}
          />

          <TrendChart />
        </>
      )}

      {showHistory && (
        <DiagnosticsHistory
          campaignId={selected?.meta_campaign_id ?? null}
          campaignNames={Object.fromEntries(campaigns.map((c) => [c.meta_campaign_id, c.nome]))}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

export default function CampanhasPage() {
  return (
    <Suspense fallback={<div className="text-center text-[#8B8BA0] text-sm mt-10">Carregando…</div>}>
      <CampanhasInner />
    </Suspense>
  );
}
