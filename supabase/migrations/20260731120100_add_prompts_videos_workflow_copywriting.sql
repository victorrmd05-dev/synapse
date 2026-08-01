-- supabase/migrations/20260731120100_add_prompts_videos_workflow_copywriting.sql

-- Prompts de video gerados pelo agente Copywriting, irmaos de `prompts_imagens`.
-- `text` e nao `jsonb` de proposito: e o mesmo tipo de conteudo da irma —
-- markdown escrito para humano ler e aprovar antes de virar chamada paga.
alter table workflow_copywriting add column if not exists prompts_videos text;
