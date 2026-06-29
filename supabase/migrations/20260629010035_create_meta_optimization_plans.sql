-- Planos de otimização da execução autônoma (agente Gestor-Meta-Ads).
-- Fluxo: pendente -> (orquestrador aprova) aprovado -> (Meta API) executado.

CREATE TABLE IF NOT EXISTS public.meta_optimization_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_campaign_id TEXT NOT NULL REFERENCES public.meta_campaigns(meta_campaign_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado | executado | erro
  resumo TEXT,
  plano JSONB DEFAULT '{}'::jsonb,
  resultado JSONB,
  modelo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,
  executado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meta_plans_campaign ON public.meta_optimization_plans(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_plans_status ON public.meta_optimization_plans(status);

ALTER TABLE public.meta_optimization_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_meta_optimization_plans" ON public.meta_optimization_plans;
CREATE POLICY "public_all_meta_optimization_plans" ON public.meta_optimization_plans
  FOR ALL USING (true) WITH CHECK (true);
