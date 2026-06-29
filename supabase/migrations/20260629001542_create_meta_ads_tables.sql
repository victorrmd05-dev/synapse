-- Tabelas de Meta Ads (dashboard de tráfego pago)
-- meta_campaigns: cache das campanhas vindas da Graph API
-- meta_campaign_metrics: snapshot de métricas por data (upsert em meta_campaign_id + data)

CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_campaign_id TEXT UNIQUE NOT NULL,
  ad_account_id TEXT NOT NULL,
  nome TEXT,
  status TEXT,
  effective_status TEXT,
  objetivo TEXT,
  ativo BOOLEAN DEFAULT true,
  daily_budget NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meta_campaign_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_campaign_id TEXT NOT NULL REFERENCES public.meta_campaigns(meta_campaign_id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  impressoes BIGINT DEFAULT 0,
  alcance BIGINT DEFAULT 0,
  frequencia NUMERIC DEFAULT 0,
  cliques_link BIGINT DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  valor_gasto NUMERIC DEFAULT 0,
  landing_page_views BIGINT DEFAULT 0,
  checkouts_iniciados BIGINT DEFAULT 0,
  compras BIGINT DEFAULT 0,
  valor_conversao NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  connect_rate NUMERIC DEFAULT 0,
  conversao_lp NUMERIC DEFAULT 0,
  conversao_checkout NUMERIC DEFAULT 0,
  conversao_global NUMERIC DEFAULT 0,
  escala_status TEXT DEFAULT 'otimizar',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meta_campaign_id, data)
);

CREATE INDEX IF NOT EXISTS idx_meta_metrics_campaign ON public.meta_campaign_metrics(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_data ON public.meta_campaign_metrics(data DESC);

-- RLS habilitado com policies públicas (sem auth real ainda, segue convenção do projeto)
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaign_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_meta_campaigns" ON public.meta_campaigns;
CREATE POLICY "public_all_meta_campaigns" ON public.meta_campaigns
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_meta_campaign_metrics" ON public.meta_campaign_metrics;
CREATE POLICY "public_all_meta_campaign_metrics" ON public.meta_campaign_metrics
  FOR ALL USING (true) WITH CHECK (true);
