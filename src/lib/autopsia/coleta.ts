// src/lib/autopsia/coleta.ts
//
// COLETA DE UM ANUNCIANTE INTEIRO na Biblioteca de Anúncios do Meta.
//
// A mineração busca por KEYWORD (muitos anunciantes, poucos anúncios de cada).
// A autópsia busca por PAGE_ID: todos os anúncios de UM anunciante.
// Endpoint verificado em 26/07/2026: devolve 30 anúncios por chamada + um
// `cursor` para a próxima página, e cobra 1 crédito por chamada.
//
// A razão entre total de anúncios e criativos únicos é sinal de leitura: 18
// anúncios para 8 vídeos significa copy travada com criativo em rotação —
// operação que já achou a mensagem e agora só compra volume.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { creativeKeyFromSnap, pickVideos, pickThumbnail } from '@/lib/minerador-media';

const COMPANY_ADS_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads';

export interface CriativoColetado {
  ad_archive_id: string | null;
  creative_key: string;
  tipo: 'video' | 'imagem';
  duracao_s: number | null;
  dias_no_ar: number | null;
  is_active: boolean | null;
  ad_copy: string | null;
  ad_title: string | null;
  cta_text: string | null;
  link_url: string | null;
  url_origem: string | null;
  raw_json: any;
}

export interface ResultadoColeta {
  page_id: string;
  page_name: string | null;
  page_profile_pic_url: string | null;
  total_anuncios: number;
  criativos: CriativoColetado[];
  paginas_lidas: number;
  creditos_gastos: number;
}

/**
 * Aceita page_id puro ("1130979790090955") ou URL da Biblioteca de Anúncios
 * (…?view_all_page_id=123… ou …&id=123…). Devolve null se não achar dígitos.
 */
export function parsePageId(entrada: string): string | null {
  const txt = (entrada ?? '').trim();
  if (!txt) return null;
  if (/^\d{5,}$/.test(txt)) return txt;
  try {
    const u = new URL(txt);
    const cand =
      u.searchParams.get('view_all_page_id') ||
      u.searchParams.get('page_id') ||
      u.searchParams.get('id');
    if (cand && /^\d{5,}$/.test(cand)) return cand;
  } catch {
    /* não é URL */
  }
  const m = txt.match(/\d{8,}/);
  return m ? m[0] : null;
}

/**
 * O parâmetro `efg` da URL do vídeo no FB CDN é base64 de um JSON com
 * `duration_s` e `asset_age_days`. Vem de graça na URL que já temos — o
 * worker corrige a duração com o valor real do ffprobe depois.
 */
export function decodeEfg(url: string): { duration_s?: number; asset_age_days?: number } | null {
  try {
    const efg = new URL(url).searchParams.get('efg');
    if (!efg) return null;
    const json = JSON.parse(Buffer.from(efg, 'base64').toString('utf8'));
    return {
      duration_s: typeof json.duration_s === 'number' ? json.duration_s : undefined,
      asset_age_days: typeof json.asset_age_days === 'number' ? json.asset_age_days : undefined,
    };
  } catch {
    return null;
  }
}

/** Dias que o anúncio ficou (ou está) no ar. start_date/end_date vêm em segundos. */
function calcularDiasNoAr(start?: number, end?: number): number | null {
  if (!start) return null;
  const fim = end ? Math.min(end * 1000, Date.now()) : Date.now();
  const dias = Math.floor((fim - start * 1000) / 86_400_000);
  return dias >= 0 ? dias : null;
}

export async function coletarAnunciante(
  pageId: string,
  opts: { maxPaginas?: number } = {}
): Promise<ResultadoColeta> {
  const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
  if (!apiKey) throw new Error('SCRAPE_CREATORS_API_KEY não configurada no .env.local.');

  // Teto de segurança: cada página custa 1 crédito. 10 páginas = 300 anúncios,
  // suficiente para qualquer operação real sem torrar crédito num anunciante gigante.
  const maxPaginas = opts.maxPaginas ?? 10;

  const porChave = new Map<string, CriativoColetado>();
  let cursor: string | null = null;
  let totalAnuncios = 0;
  let paginas = 0;
  let pageName: string | null = null;
  let pageProfilePic: string | null = null;

  while (paginas < maxPaginas) {
    const url = new URL(COMPANY_ADS_URL);
    url.searchParams.set('pageId', pageId);
    url.searchParams.set('trim', 'false');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalhe = (await res.text()).slice(0, 500);
      throw new Error(`ScrapeCreators respondeu ${res.status}: ${detalhe}`);
    }
    const data: any = await res.json();
    paginas++;

    const results: any[] = Array.isArray(data.results) ? data.results : [];
    totalAnuncios += results.length;

    for (const ad of results) {
      const snap = ad?.snapshot;
      if (!snap) continue;
      if (!pageName) pageName = snap.page_name ?? ad.page_name ?? null;
      if (!pageProfilePic) pageProfilePic = snap.page_profile_picture_url ?? null;

      const chave = creativeKeyFromSnap(snap);
      if (!chave) continue;
      if (porChave.has(chave)) continue; // duplicata real — mesmo criativo

      const videos = pickVideos(snap);
      const ehVideo = videos.length > 0;
      const urlOrigem = ehVideo ? videos[0] : pickThumbnail(snap);
      const efg = ehVideo && urlOrigem ? decodeEfg(urlOrigem) : null;

      porChave.set(chave, {
        ad_archive_id: ad.ad_archive_id ? String(ad.ad_archive_id) : null,
        creative_key: chave,
        tipo: ehVideo ? 'video' : 'imagem',
        duracao_s: efg?.duration_s ?? null,
        dias_no_ar: calcularDiasNoAr(ad.start_date, ad.end_date),
        is_active: typeof ad.is_active === 'boolean' ? ad.is_active : null,
        ad_copy: snap.body?.text ?? snap.body ?? null,
        ad_title: snap.title ?? null,
        cta_text: snap.cta_text ?? null,
        link_url: snap.link_url ?? null,
        url_origem: urlOrigem,
        raw_json: ad,
      });
    }

    cursor = typeof data.cursor === 'string' && data.cursor ? data.cursor : null;
    if (!cursor || results.length === 0) break;
  }

  return {
    page_id: pageId,
    page_name: pageName,
    page_profile_pic_url: pageProfilePic,
    total_anuncios: totalAnuncios,
    criativos: Array.from(porChave.values()),
    paginas_lidas: paginas,
    creditos_gastos: paginas,
  };
}
