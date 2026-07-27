// src/lib/storage.ts
//
// Persistência de mídia no Supabase Storage.
//
// POR QUE EXISTE: as URLs do CDN do Facebook são assinadas e EXPIRAM — o
// parâmetro `oe=` é um timestamp Unix em hexadecimal, e a validade medida em
// 26/07/2026 foi de ~5 DIAS. Todo anúncio minerado há mais de uma semana
// aponta para o nada: thumbnail quebrada no card, vídeo que não abre.
// Guardamos o arquivo e mantemos a URL do CDN só como procedência.
//
// Best-effort por decisão: se o download/upload falhar, devolve null e o
// chamador segue com a URL original. Mineração nunca pode quebrar por causa
// do Storage.

import { getTenantClient } from './supabase-tenant';

export const BUCKET_CRIATIVOS = 'criativos';

// Sem o Referer o FB CDN responde 403.
const FB_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.facebook.com/',
  Accept: '*/*',
};

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Extensão a partir do PATH da URL (a querystring assinada não conta). */
export function extensaoDaUrl(url: string, padrao = '.jpg'): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    const m = p.match(/\.(mp4|jpe?g|png|webp|gif)$/);
    return m ? m[0] : padrao;
  } catch {
    return padrao;
  }
}

/** Cria o bucket se ainda não existir. Idempotente. */
export async function garantirBucket(nome = BUCKET_CRIATIVOS): Promise<void> {
  const supabase = getTenantClient();
  const { data } = await supabase.storage.getBucket(nome);
  if (data) return;
  // Teto global de Storage deste projeto Supabase e ~50MB (medido: 52MB
  // passa, 55MB falha com "The object exceeded the maximum allowed size").
  // Pedir mais faz createBucket falhar. Criativo de anuncio tem 4-5MB, entao
  // 50MB sobra.
  const { error } = await supabase.storage.createBucket(nome, {
    public: true,
    fileSizeLimit: '50MB',
  });
  // Corrida entre duas chamadas simultâneas: "already exists" não é erro.
  if (error && !/exist/i.test(error.message)) throw error;
}

/**
 * Baixa uma URL do CDN e sobe para o Storage.
 * @returns URL pública, ou null se qualquer etapa falhar.
 */
export async function salvarMidia(opts: {
  url: string;
  caminho: string;
  bucket?: string;
}): Promise<string | null> {
  const bucket = opts.bucket ?? BUCKET_CRIATIVOS;
  try {
    await garantirBucket(bucket);

    const res = await fetch(opts.url, { headers: FB_HEADERS, cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[storage] download falhou (${res.status}): ${opts.caminho}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
      console.warn(`[storage] arquivo suspeito (${buffer.length} bytes): ${opts.caminho}`);
      return null;
    }

    const ext = extensaoDaUrl(opts.url);
    const supabase = getTenantClient();
    const { error } = await supabase.storage.from(bucket).upload(opts.caminho, buffer, {
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
      upsert: true,
    });
    if (error) {
      console.warn(`[storage] upload falhou: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(opts.caminho);
    return data.publicUrl;
  } catch (err) {
    console.warn('[storage] erro inesperado:', (err as Error)?.message);
    return null;
  }
}
