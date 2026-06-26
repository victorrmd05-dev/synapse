-- Habilita Realtime (postgres_changes) para as tabelas do pipeline, que as
-- páginas já assinam via supabase.channel(...).on('postgres_changes', ...).
-- Sem isso, as telas só atualizavam com refresh manual.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ads_minerados',
    'campanhas_producao',
    'workflow_copywriting',
    'workflow_design',
    'workflow_video'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;
