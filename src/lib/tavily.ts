// src/lib/tavily.ts
//
// Busca web via Tavily — usada na "Fase de Pesquisa" do agente Copywriter ANTES
// de gerar a copy. Dá à IA vocabulário real, dores e objeções do cliente (em vez
// de alucinar a pesquisa). Segue o padrão "cérebro vs mãos": é a ROTA que pesquisa
// e injeta os achados no prompt — a IA não decide buscar sozinha.
//
// Best-effort: se TAVILY_API_KEY faltar ou a API falhar, retorna vazio e a
// geração de copy continua normalmente (nunca quebra o fluxo).
//
// Variável de ambiente: TAVILY_API_KEY=tvly-...

const TAVILY_URL = 'https://api.tavily.com/search';

export interface TavilyResultItem {
  title: string;
  url: string;
  content: string;
}

export interface TavilySearch {
  query: string;
  answer: string | null;
  results: TavilyResultItem[];
}

interface TavilyRawResponse {
  answer?: string;
  results?: Array<{ title?: string; url?: string; content?: string }>;
}

export async function tavilySearch(
  query: string,
  opts: { maxResults?: number; searchDepth?: 'basic' | 'advanced' } = {}
): Promise<TavilySearch | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: opts.searchDepth ?? 'basic',
        max_results: opts.maxResults ?? 5,
        include_answer: true,
      }),
    });

    if (!resp.ok) {
      console.error('[tavily] HTTP', resp.status, await resp.text().catch(() => ''));
      return null;
    }

    const data = (await resp.json()) as TavilyRawResponse;
    return {
      query,
      answer: typeof data.answer === 'string' ? data.answer : null,
      results: (data.results ?? []).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        content: r.content ?? '',
      })),
    };
  } catch (e) {
    console.error('[tavily] erro:', e);
    return null;
  }
}

// Monta o bloco de "Pesquisa de mercado" a partir de um termo-base (derivado do
// produto minerado) e o devolve já formatado para injeção no prompt do Copywriter.
// Retorna '' quando não há chave/termo ou nenhuma busca trouxe resultado.
export async function pesquisaDeMercadoParaCopy(termoBase: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return '';
  const termo = (termoBase || '').trim().slice(0, 80);
  if (!termo) return '';

  const queries = [
    `${termo} avaliações reclamações problemas`,
    `${termo} vale a pena benefícios para que serve`,
  ];

  const buscas = await Promise.all(queries.map((q) => tavilySearch(q, { maxResults: 4 })));

  const blocos: string[] = [];
  for (const b of buscas) {
    if (!b) continue;
    const linhas: string[] = [`### Busca: "${b.query}"`];
    if (b.answer) linhas.push(`Resumo: ${b.answer}`);
    for (const r of b.results.slice(0, 4)) {
      const trecho = (r.content || '').replace(/\s+/g, ' ').trim().slice(0, 400);
      if (trecho) linhas.push(`- (${r.title || 'fonte'}) ${trecho}`);
    }
    if (linhas.length > 1) blocos.push(linhas.join('\n'));
  }

  return blocos.join('\n\n');
}
