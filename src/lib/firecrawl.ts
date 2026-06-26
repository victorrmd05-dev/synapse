// src/lib/firecrawl.ts
//
// Scraping da landing page do CONCORRENTE (Firecrawl). A partir do link_url do
// anúncio minerado, captura a ESTRUTURA da página (markdown) e as IMAGENS reais
// usadas — material de ouro para o Designer reproduzir uma página de verdade,
// não uma estética vazia de IA.
//
// Best-effort: sem FIRECRAWL_API_KEY (ou em qualquer erro/timeout), devolve null
// e a geração segue sem o bloco — nunca quebra o fluxo do Designer.
//
// Variável de ambiente:
//   FIRECRAWL_API_KEY=fc-...

const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape';

export interface ConcorrenteScrape {
  url: string;
  /** Markdown da página (cortado num orçamento) — a estrutura/seções. */
  estrutura: string;
  /** URLs de imagens encontradas (deduplicadas e filtradas). */
  imagens: string[];
}

const MAX_ESTRUTURA_CHARS = 6000;
const MAX_IMAGENS = 12;

/** Extrai URLs de imagem de HTML (<img src>) e markdown (![](url)). */
function extrairImagens(html: string, markdown: string): string[] {
  const urls = new Set<string>();

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    if (m[1]) urls.add(m[1]);
  }

  const mdRe = /!\[[^\]]*\]\(([^)\s]+)/g;
  while ((m = mdRe.exec(markdown)) !== null) {
    if (m[1]) urls.add(m[1]);
  }

  // Filtra ícones/sprites/pixels de tracking e mantém só http(s) plausíveis.
  const lixo = /(sprite|icon|favicon|logo-?\d*\.svg|pixel|1x1|tracking|\.svg$)/i;
  return Array.from(urls)
    .filter((u) => /^https?:\/\//i.test(u) && !lixo.test(u))
    .slice(0, MAX_IMAGENS);
}

export async function scrapeConcorrente(
  url: string | null | undefined
): Promise<ConcorrenteScrape | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !url || !/^https?:\/\//i.test(url)) return null;

  try {
    const res = await fetch(FIRECRAWL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
      // Não deixa o scraping segurar a geração pra sempre.
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      console.warn(`[firecrawl] scrape falhou (status ${res.status})`);
      return null;
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string; html?: string };
    };

    const markdown = json.data?.markdown ?? '';
    const html = json.data?.html ?? '';
    if (!markdown && !html) return null;

    const estrutura =
      markdown.length > MAX_ESTRUTURA_CHARS
        ? markdown.slice(0, MAX_ESTRUTURA_CHARS) + '\n[...truncado]'
        : markdown;

    return { url, estrutura, imagens: extrairImagens(html, markdown) };
  } catch (err) {
    console.warn('[firecrawl] erro no scrape:', err instanceof Error ? err.message : err);
    return null;
  }
}
