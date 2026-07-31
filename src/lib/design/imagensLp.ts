// src/lib/design/imagensLp.ts
//
// Imagens da landing page: otimização para web e casamento com a copy.
//
// CONTEXTO: o /api/deploy sobe UM único arquivo HTML para o Cloudflare, sem
// bundle de assets. Então toda imagem da LP mora no bucket público `criativos`,
// em `lp/<campanha_id>/`, e entra na página como URL absoluta.
//
// A PASTA É A FONTE DA VERDADE — não existe tabela de imagens. O casamento com
// a copy é PELO NOME DO ARQUIVO: a copy traz `[IMAGEM 1 · hero.png — …]` e a
// pasta tem `hero.png`.
//
// DUAS CÓPIAS DE CADA IMAGEM, de propósito:
//   lp/<campanha_id>/hero.png       ← original, intocado (fonte, o que o Fernando sobe)
//   lp/<campanha_id>/web/hero.webp  ← derivada servida na página
// O gerador de imagem devolve PNG de 2+ MB a ~1500px. Isso derruba o PageSpeed
// mobile sozinho num público que é quase todo 4G. O WebP redimensionado corta
// ~90% sem diferença visível. O original fica porque regerar a derivada tem que
// ser possível sem pedir a imagem de novo ao gerador.

import sharp from 'sharp';
import { getTenantClient } from '@/lib/supabase-tenant';
import { BUCKET_CRIATIVOS } from '@/lib/storage';

/** Teto de largura da derivada. ~2x a largura de uma coluna mobile — cobre tela retina sem exagero. */
export const LARGURA_MAX_WEB = 1200;
export const QUALIDADE_WEBP = 80;

export function pastaLp(campanhaId: string) {
  return `lp/${campanhaId}`;
}
export function pastaWeb(campanhaId: string) {
  return `lp/${campanhaId}/web`;
}

/** Nome sem extensão — é a chave que casa original com derivada e com a copy. */
export function radical(nome: string): string {
  return nome.replace(/\.[^.]+$/, '').toLowerCase();
}

export interface ImagemOtimizada {
  buffer: Buffer;
  largura: number;
  altura: number;
}

/**
 * Converte para WebP, reduzindo até LARGURA_MAX_WEB.
 *
 * `withoutEnlargement` garante que imagem menor que o teto não seja esticada —
 * ampliar só aumentaria o peso sem ganhar nitidez.
 */
export async function otimizarParaWeb(entrada: Buffer): Promise<ImagemOtimizada> {
  const pipeline = sharp(entrada)
    .rotate() // respeita o EXIF antes de redimensionar
    .resize({ width: LARGURA_MAX_WEB, withoutEnlargement: true })
    .webp({ quality: QUALIDADE_WEBP });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, largura: info.width, altura: info.height };
}

export interface ImagemLp {
  /** Nome do arquivo original, ex: `hero.png` */
  nome: string;
  /** `hero` — o que casa com o `[IMAGEM N · hero.png]` da copy */
  radical: string;
  /** URL pública da versão servida na página (webp se existir, senão o original) */
  url: string;
  largura: number | null;
  altura: number | null;
}

/**
 * Lê a pasta da campanha e devolve as imagens prontas para entrar na página.
 *
 * Prefere a derivada webp; cai no original quando a derivada não existe (imagem
 * subida antes da otimização existir, ou conversão que falhou).
 */
export async function listarImagensParaPagina(campanhaId: string): Promise<ImagemLp[]> {
  const supabase = getTenantClient();
  const bucket = supabase.storage.from(BUCKET_CRIATIVOS);

  const [originais, derivadas] = await Promise.all([
    bucket.list(pastaLp(campanhaId), { limit: 100 }),
    bucket.list(pastaWeb(campanhaId), { limit: 100 }),
  ]);

  // Entrada de PASTA vem com id/metadata nulos — não é arquivo, tem que sair.
  const arquivos = (originais.data ?? []).filter((f) => f.id && !f.name.startsWith('.'));
  const webPorRadical = new Map(
    (derivadas.data ?? []).filter((f) => f.id).map((f) => [radical(f.name), f.name])
  );

  const imagens: ImagemLp[] = [];
  for (const arquivo of arquivos) {
    const r = radical(arquivo.name);
    const nomeWeb = webPorRadical.get(r);
    const caminho = nomeWeb
      ? `${pastaWeb(campanhaId)}/${nomeWeb}`
      : `${pastaLp(campanhaId)}/${arquivo.name}`;

    // width/height explícitos no <img> evitam CLS. A dimensão não está no
    // Storage, então lemos do próprio arquivo — são ~100KB cada e esta rota já
    // é disparo manual, então o download não pesa.
    let largura: number | null = null;
    let altura: number | null = null;
    try {
      const { data: blob } = await bucket.download(caminho);
      if (blob) {
        const meta = await sharp(Buffer.from(await blob.arrayBuffer())).metadata();
        largura = meta.width ?? null;
        altura = meta.height ?? null;
      }
    } catch {
      // Sem dimensão o <img> ainda funciona — só perde a proteção de CLS.
    }

    imagens.push({
      nome: arquivo.name,
      radical: r,
      url: bucket.getPublicUrl(caminho).data.publicUrl,
      largura,
      altura,
    });
  }

  return imagens;
}

// `[IMAGEM 1 · hero.png — cão caminhando ao lado do tutor]`
// Ancorado no NOME DO ARQUIVO com extensão, que é a parte estável. Os
// separadores são frouxos de propósito: a copy é escrita à mão e o "·"/"—"
// viram "-" com facilidade ao passar por editor.
const RE_PLACEHOLDER =
  /\[\s*IMAGEM\s*(\d+)\s*[·•\-–—:]?\s*([A-Za-z0-9_.\-]+\.(?:png|jpe?g|webp|avif))\s*[—–\-:]?\s*([^\]]*)\]/gi;

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ResultadoSubstituicao {
  texto: string;
  usadas: string[];
  /** Placeholder que não achou arquivo na pasta — fica no texto para não sumir em silêncio. */
  faltando: string[];
}

/**
 * Troca cada `[IMAGEM N · arquivo — descrição]` da copy pela tag <img> real.
 *
 * A descrição do placeholder vira o `alt` — ela já foi escrita para descrever a
 * imagem, então é melhor alt do que qualquer coisa que o modelo inventaria.
 *
 * A primeira imagem (N=1) é tratada como LCP: `eager` + `fetchpriority=high`.
 * As demais são `lazy`.
 *
 * Placeholder sem arquivo correspondente é MANTIDO no texto e reportado em
 * `faltando` — apagar em silêncio esconderia um erro de nome de arquivo.
 */
export function substituirPlaceholders(
  texto: string,
  imagens: ImagemLp[]
): ResultadoSubstituicao {
  const porRadical = new Map(imagens.map((i) => [i.radical, i]));
  const usadas: string[] = [];
  const faltando: string[] = [];

  const novo = texto.replace(RE_PLACEHOLDER, (original, n: string, arquivo: string, desc: string) => {
    const img = porRadical.get(radical(arquivo));
    if (!img) {
      faltando.push(arquivo);
      return original;
    }
    usadas.push(img.nome);

    const alt = escaparHtml((desc || '').trim()) || escaparHtml(img.radical);
    const dim =
      img.largura && img.altura ? ` width="${img.largura}" height="${img.altura}"` : '';
    const prioridade =
      Number(n) === 1
        ? ' loading="eager" fetchpriority="high" decoding="async"'
        : ' loading="lazy" decoding="async"';

    return `<img src="${img.url}" alt="${alt}"${dim}${prioridade} style="max-width:100%;height:auto">`;
  });

  return { texto: novo, usadas, faltando };
}
