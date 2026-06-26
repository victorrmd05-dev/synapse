-- Adiciona policies públicas (sem auth) às tabelas do pipeline que tinham RLS
-- ligado mas ZERO policies — o que bloqueava 100% das leituras feitas pelo
-- frontend com a anon key (default deny do Postgres). Mesmo padrão de agent_files.
-- DÍVIDA DE SEGURANÇA: quando houver login, trocar USING(true) por checagem real.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ads_minerados',
    'campanhas_producao',
    'workflow_copywriting',
    'workflow_design',
    'workflow_video',
    'workflow_relatorios_trafego'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "public_select_%1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "public_insert_%1$s" ON public.%1$I FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public_update_%1$s" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public_delete_%1$s" ON public.%1$I FOR DELETE USING (true);', t);
  END LOOP;
END $$;
