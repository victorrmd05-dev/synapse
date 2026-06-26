-- Dedup de DUPLICATA REAL na mineração: dois anúncios podem ter ad_archive_id
-- diferente mas o MESMO criativo (vídeo/imagem). Guardamos uma assinatura
-- estável do criativo (path do arquivo no FB CDN, sem a querystring assinada)
-- para detectar e descartar esses duplicados.
ALTER TABLE public.ads_minerados
  ADD COLUMN IF NOT EXISTS creative_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ads_minerados_creative_hash
  ON public.ads_minerados (creative_hash);
