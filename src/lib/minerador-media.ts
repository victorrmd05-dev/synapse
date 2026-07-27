// src/lib/minerador-media.ts
//
// Extração de mídia do snapshot da ScrapeCreators (Biblioteca de Anúncios Meta).
// A maioria dos anúncios é CARROSSEL: a imagem/vídeo NÃO fica em snapshot.images/
// snapshot.videos, e sim em snapshot.cards[] (cada card tem original_image_url,
// resized_image_url, video_hd_url, video_preview_image_url…). Por isso a miniatura
// vinha vazia (e caía num placeholder) — estes helpers olham images, videos E cards.
//
// Puro (sem deps de servidor) → usado tanto na rota /mineracao/run quanto no
// componente client /mineracao.
//
// ⚠️ URLs do FB CDN são assinadas e EXPIRAM. A miniatura reflete o anúncio real
// enquanto a URL é válida (mineração recente). Persistir a imagem (download +
// Supabase Storage) é um passo futuro para o card nunca quebrar.

/* eslint-disable @typescript-eslint/no-explicit-any */

function firstUrl(arr: any[], keys: string[]): string | null {
  for (const item of arr) {
    for (const k of keys) {
      const u = item?.[k];
      if (typeof u === 'string' && u.length > 0) return u;
    }
  }
  return null;
}

/** Melhor miniatura: imagem estática (images/cards) ou, na falta, preview de vídeo. */
export function pickThumbnail(snap: any): string | null {
  if (!snap) return null;
  const imgs = [...(snap.images ?? []), ...(snap.extra_images ?? [])];
  const cards = snap.cards ?? [];
  return (
    firstUrl(imgs, ['original_image_url', 'resized_image_url']) ||
    firstUrl(cards, ['original_image_url', 'resized_image_url']) ||
    firstUrl([...(snap.videos ?? []), ...(snap.extra_videos ?? []), ...cards], ['video_preview_image_url'])
  );
}

/** Todas as URLs de vídeo (videos, extra_videos e cards de vídeo). */
export function pickVideos(snap: any): string[] {
  if (!snap) return [];
  const all = [...(snap.videos ?? []), ...(snap.extra_videos ?? []), ...(snap.cards ?? [])];
  return all
    .map((v) => v?.video_hd_url || v?.video_sd_url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/** Todas as URLs de imagem estática (images, extra_images e cards). */
export function pickImages(snap: any): string[] {
  if (!snap) return [];
  const all = [...(snap.images ?? []), ...(snap.extra_images ?? []), ...(snap.cards ?? [])];
  return all
    .map((i) => i?.original_image_url || i?.resized_image_url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/**
 * Assinatura ESTÁVEL do criativo, para dedup de duplicata real.
 *
 * As URLs do FB CDN trazem querystring assinada que muda toda hora
 * (oh=, oe=, _nc_gid=…), então comparamos só o PATH do arquivo — o token do
 * vídeo/imagem é estável e idêntico quando o criativo é o mesmo, mesmo com
 * ad_archive_id diferente (o mesmo vídeo aparece em várias páginas da marca).
 *
 * Prefixo 'v:' para vídeo e 'i:' para imagem, para nunca colidirem.
 */
export function creativeKeyFromSnap(snap: any): string | null {
  const vid =
    (Array.isArray(snap?.videos) ? snap.videos : [])[0] ??
    (Array.isArray(snap?.extra_videos) ? snap.extra_videos : [])[0];
  const vurl = vid?.video_hd_url || vid?.video_sd_url;
  if (vurl) {
    try { return 'v:' + new URL(vurl).pathname; } catch { /* url inválida */ }
  }
  const img =
    (Array.isArray(snap?.images) ? snap.images : [])[0] ??
    (Array.isArray(snap?.extra_images) ? snap.extra_images : [])[0];
  const iurl = img?.original_image_url || img?.resized_image_url;
  if (iurl) {
    try { return 'i:' + new URL(iurl).pathname; } catch { /* url inválida */ }
  }
  return null;
}
