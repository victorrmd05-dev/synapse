-- Diagnósticos de IA por campanha (agente Gestor-Meta-Ads).
-- Upsert por (meta_campaign_id, data): um diagnóstico por campanha por dia.

CREATE TABLE IF NOT EXISTS public.meta_ai_diagnostics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_campaign_id TEXT NOT NULL REFERENCES public.meta_campaigns(meta_campaign_id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  gargalo TEXT,
  diagnostico TEXT,
  recomendacoes JSONB DEFAULT '[]'::jsonb,
  prioridade TEXT DEFAULT 'media',
  modelo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meta_campaign_id, data)
);

CREATE INDEX IF NOT EXISTS idx_meta_diag_campaign ON public.meta_ai_diagnostics(meta_campaign_id);

ALTER TABLE public.meta_ai_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_meta_ai_diagnostics" ON public.meta_ai_diagnostics;
CREATE POLICY "public_all_meta_ai_diagnostics" ON public.meta_ai_diagnostics
  FOR ALL USING (true) WITH CHECK (true);
