-- ============================================================================
-- AGENTE TRACKING (FOP — Funil de Otimização de Pixel)
-- Tabelas que sustentam o 8º/9º elo do pipeline: instalar a camada de
-- rastreamento Pixel + CAPI nas landing pages geradas pelo Designer e espelhar
-- cada evento server-side para o Meta (deduplicado por event_id).
--
--   workflow_design.codigo_html  →  [Tracking instala FOP]  →  workflow_tracking
--                                                                    ↓
--                                  /api/track/capi recebe os eventos da LP no ar
--                                  e loga em tracking_eventos (auditoria).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. tracking_config — os Pixels + tokens da Conversions API (1 por oferta).
--    ⚠️ SEGREDO: capi_token NUNCA pode chegar ao browser. Por isso esta tabela
--    NÃO tem policy pública de SELECT — só o servidor (service_role, que ignora
--    RLS) lê o token. O frontend recebe a lista (sem token) via server action.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,                       -- rótulo da oferta/pixel (ex: "Emagrece Já")
  pixel_id TEXT NOT NULL,                   -- ID do Pixel da Meta
  capi_token TEXT,                          -- token da Conversions API (SEGREDO)
  test_event_code TEXT,                     -- TESTxxxx p/ Test Events; vazio = produção
  dominio_permitido TEXT,                   -- origem permitida no CORS do relay (ex: https://oferta.com); null = *
  ativo BOOLEAN DEFAULT true,
  padrao BOOLEAN DEFAULT false,             -- pixel usado quando a campanha não especifica
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS tracking_config_pixel_id_uidx
  ON public.tracking_config (pixel_id);

ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;
-- Sem policies = anon (browser) não lê nada. Acesso só via service_role no server.

-- ----------------------------------------------------------------------------
-- 2. workflow_tracking — a "ordem de serviço" de rastreamento de cada página.
--    Guarda a hierarquia FOP aprovada (qual template A–E, gatilhos, parâmetros)
--    e o HTML final já instrumentado com Pixel + dispatcher CAPI.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID REFERENCES public.workflow_design(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.campanhas_producao(id) ON DELETE CASCADE,
  pixel_config_id UUID REFERENCES public.tracking_config(id) ON DELETE SET NULL,
  tipo_funil TEXT,                          -- A | B | C | D | E (template FOP)
  hierarquia_json JSONB,                    -- escada de eventos aprovada (# | evento | gatilho | params)
  codigo_html_final TEXT,                   -- HTML do Designer + camada FOP injetada
  status TEXT DEFAULT 'pendente',           -- pendente | instalado | erro
  observacoes TEXT,                         -- diagnóstico do agente / notas
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workflow_tracking_design_idx
  ON public.workflow_tracking (design_id);

ALTER TABLE public.workflow_tracking ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. tracking_eventos — log de auditoria de cada evento espelhado pro Meta CAPI.
--    PII vai HASHEADA no payload; guardamos só o que o Events Manager mostra.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id TEXT,
  event_name TEXT,
  event_id TEXT,                            -- mesmo id do client (chave da deduplicação)
  page_url TEXT,
  sucesso BOOLEAN DEFAULT false,
  payload_json JSONB,                       -- corpo enviado ao Meta (PII já hasheada)
  meta_response_json JSONB,                 -- resposta da Graph API
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tracking_eventos_created_idx
  ON public.tracking_eventos (created_at DESC);

ALTER TABLE public.tracking_eventos ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. Policies públicas (sem auth) para as tabelas que o frontend LÊ.
--    Mesmo padrão das demais tabelas do pipeline. tracking_config fica de fora
--    de propósito (segredo). DÍVIDA: trocar USING(true) por auth real depois.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workflow_tracking', 'tracking_eventos']
  LOOP
    EXECUTE format('CREATE POLICY "public_select_%1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "public_insert_%1$s" ON public.%1$I FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public_update_%1$s" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public_delete_%1$s" ON public.%1$I FOR DELETE USING (true);', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Realtime para a fila de Tracking e o log de eventos (a página assina).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workflow_tracking', 'tracking_eventos']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;
