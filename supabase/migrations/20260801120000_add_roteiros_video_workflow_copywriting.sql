-- supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql

-- Roteiro FALADO de cada video, irmao de `prompts_videos` e pareado com ele
-- por indice: roteiro 1 e a narracao do video 1.
--
-- Por que um campo separado e nao reaproveitar `meta_ads_copy`: aquele texto e
-- escrito para ser LIDO (escaneavel, emoji, "clique no link abaixo"); roteiro e
-- escrito para ser OUVIDO. Reaproveitar obriga a cortar texto a mao em todo
-- video. Ver a spec de 01/08/2026, secao 3.
--
-- `text` e nao `jsonb` pelo mesmo motivo das irmas: markdown escrito para humano
-- ler e aprovar, com os 3 blocos entre <<< e >>>.
alter table workflow_copywriting add column if not exists roteiros_video text;
