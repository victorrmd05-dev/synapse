-- supabase/migrations/20260727120000_add_storage_paths_ads_minerados.sql
--
-- As URLs do CDN do Facebook expiram em ~5 dias. Guardamos a midia no
-- Supabase Storage e mantemos image_url/video_urls como procedencia.
-- Colunas NOVAS, nao substituicao: anuncio antigo continua funcionando pelo
-- fallback image_storage_path ?? image_url ?? placeholder.

alter table ads_minerados
  add column if not exists image_storage_path text,
  add column if not exists video_storage_paths text[];

comment on column ads_minerados.image_storage_path is
  'URL publica da imagem no Supabase Storage (bucket criativos). Preenchida na mineracao.';
comment on column ads_minerados.video_storage_paths is
  'URLs publicas dos videos no Storage. Preenchida sob demanda (favorito/autopsia), nao na mineracao.';
