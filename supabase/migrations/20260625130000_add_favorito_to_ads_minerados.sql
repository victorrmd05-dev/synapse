-- Adiciona favoritação de anúncios minerados para curadoria do administrador.
-- Permite filtrar só favoritos e excluir em massa os não favoritados.

ALTER TABLE public.ads_minerados
  ADD COLUMN IF NOT EXISTS favorito BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ads_minerados_favorito
  ON public.ads_minerados (favorito);
