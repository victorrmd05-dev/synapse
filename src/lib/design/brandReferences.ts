// src/lib/design/brandReferences.ts
//
// MOTOR DE INJEÇÃO DINÂMICA DE MARCA (designer-webmaster)
//
// A ideia: em vez do agente Designer inventar uma estética genérica de IA
// ("AI slop", sempre a mesma cara), cada landing page nasce ancorada num
// sistema de design de uma marca de luxo/referência REAL.
//
// Fonte: agentes/designer-webmaster/references/awesome-design-md (biblioteca
// de DESIGN.md das marcas — Apple, Ferrari, Stripe, Nike, Tesla, etc.). Cada
// DESIGN.md traz frontmatter com tokens (cores + tipografia + componentes) e
// seções de layout/do's-don'ts.
//
// Fluxo em /api/design/generate:
//   1. selectBrandSlug(termo)        -> escolhe a marca que casa com o nicho
//   2. buildBrandReferenceBlock(...) -> lê o DESIGN.md e devolve um bloco
//      pronto pra injetar no prompt da OpenAI.
//
// Os arquivos são lidos do disco em runtime (Node). Em deploy serverless é
// preciso garantir que a pasta seja empacotada — ver outputFileTracingIncludes
// no next.config.mjs.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DESIGN_MD_DIR = path.join(
  process.cwd(),
  'agentes',
  'designer-webmaster',
  'references',
  'awesome-design-md',
  'design-md'
);

export interface BrandEntry {
  /** Slug = nome da pasta em design-md/ (ex: "apple", "linear.app"). */
  slug: string;
  /** Nome de exibição da marca. */
  nome: string;
  /** Humor/estética em uma frase (pra log e pra UI). */
  mood: string;
  /**
   * Palavras-chave (PT + EN) de setor/vibe. O seletor pontua a marca pela
   * quantidade de termos que aparecem no texto do produto minerado.
   */
  keywords: string[];
}

// Catálogo curado para landing pages de campanha (não cobre as 74 marcas da
// lib — só as que rendem bem como referência de LP de conversão). O seletor
// cai no DEFAULT_BRAND quando nada pontua.
export const BRAND_CATALOG: BrandEntry[] = [
  {
    slug: 'apple',
    nome: 'Apple',
    mood: 'Galeria de museu: produto é a arte, UI invisível, muito respiro',
    keywords: [
      'saas', 'software', 'app', 'aplicativo', 'tech', 'tecnologia', 'eletronico',
      'gadget', 'minimalista', 'premium', 'produto', 'clinica', 'estetica',
      'beleza', 'skincare', 'saude', 'odontologia', 'limpo', 'clean', 'elegante',
    ],
  },
  {
    slug: 'nike',
    nome: 'Nike',
    mood: 'Editorial cinético: tipografia gigante em caixa-alta, contraste brutal',
    keywords: [
      'fitness', 'academia', 'treino', 'esporte', 'esportivo', 'moda', 'roupa',
      'vestuario', 'streetwear', 'tenis', 'suplemento', 'emagrecimento', 'corrida',
      'performance', 'atleta', 'musculacao', 'whey', 'creatina', 'energia',
    ],
  },
  {
    slug: 'ferrari',
    nome: 'Ferrari',
    mood: 'Luxo cinematográfico: preto dominante + vermelho icônico, esparso',
    keywords: [
      'luxo', 'luxuoso', 'automotivo', 'carro', 'veiculo', 'alto ticket',
      'colecionador', 'exclusivo', 'sofisticado', 'joia', 'relogio', 'premium',
      'imovel de luxo', 'iate', 'cinematografico',
    ],
  },
  {
    slug: 'lamborghini',
    nome: 'Lamborghini',
    mood: 'Brutalismo premium noturno: preto total + néon cortante, agressivo',
    keywords: [
      'gaming', 'game', 'jogo', 'web3', 'cripto', 'crypto', 'nft', 'trading',
      'energetico', 'streetwear', 'ousado', 'futurista', 'gamer', 'esports',
      'masculino', 'apostas', 'bet', 'cassino',
    ],
  },
  {
    slug: 'bmw',
    nome: 'BMW',
    mood: 'Precisão corporativa: grade imaculada, prata/azul-marinho, credibilidade',
    keywords: [
      'b2b', 'corporativo', 'consultoria', 'empresa', 'servico', 'engenharia',
      'industria', 'imobiliaria', 'corretora', 'juridico', 'advocacia',
      'contabilidade', 'financeiro', 'seguros', 'profissional',
    ],
  },
  {
    slug: 'tesla',
    nome: 'Tesla',
    mood: 'Subtração radical: foto full-viewport, mínimo absoluto, futurista',
    keywords: [
      'inovacao', 'eletrico', 'energia solar', 'sustentavel', 'futuro', 'startup',
      'tecnologia', 'automovel', 'minimal', 'ousado', 'disruptivo',
    ],
  },
  {
    slug: 'stripe',
    nome: 'Stripe',
    mood: 'Gradientes roxos assinatura + peso 300 elegante, infraestrutura',
    keywords: [
      'fintech', 'pagamento', 'pagamentos', 'financas', 'infra', 'api',
      'plataforma', 'banco', 'dashboard', 'assinatura', 'cobranca', 'saas premium',
    ],
  },
  {
    slug: 'shopify',
    nome: 'Shopify',
    mood: 'Dark-first cinematográfico, verde neon, display ultra-light',
    keywords: [
      'ecommerce', 'e-commerce', 'loja', 'lojavirtual', 'dropshipping', 'venda',
      'vendas', 'produto fisico', 'marketplace', 'varejo', 'comercio',
    ],
  },
  {
    slug: 'starbucks',
    nome: 'Starbucks',
    mood: 'Verde-terra em quatro tons, canvas creme quente, acolhedor',
    keywords: [
      'cafe', 'food', 'comida', 'gastronomia', 'restaurante', 'bebida',
      'confeitaria', 'padaria', 'organico', 'natural', 'acolhedor', 'artesanal',
    ],
  },
  {
    slug: 'airbnb',
    nome: 'Airbnb',
    mood: 'Coral quente, foto-driven, UI arredondada e amigável',
    keywords: [
      'viagem', 'turismo', 'hospedagem', 'pousada', 'hotel', 'aluguel',
      'marketplace', 'experiencia', 'acolhedor', 'lazer', 'evento',
    ],
  },
  {
    slug: 'notion',
    nome: 'Notion',
    mood: 'Minimalismo quente, títulos serifados, superfícies suaves',
    keywords: [
      'produtividade', 'workspace', 'organizacao', 'curso', 'educacao', 'ebook',
      'conhecimento', 'mentoria', 'comunidade', 'notas', 'planner', 'infoproduto',
    ],
  },
  {
    slug: 'spotify',
    nome: 'Spotify',
    mood: 'Verde vibrante sobre dark, tipo em negrito, capa-driven',
    keywords: [
      'musica', 'streaming', 'podcast', 'audio', 'entretenimento', 'criador',
      'artista', 'jovem', 'playlist', 'show', 'evento musical',
    ],
  },
  {
    slug: 'revolut',
    nome: 'Revolut',
    mood: 'Dark sofisticado, cartões em gradiente, precisão fintech',
    keywords: [
      'banco digital', 'cartao', 'conta', 'fintech', 'investimento', 'cambio',
      'carteira', 'wallet', 'neobank',
    ],
  },
  {
    slug: 'coinbase',
    nome: 'Coinbase',
    mood: 'Azul limpo, foco em confiança, sensação institucional',
    keywords: [
      'cripto', 'crypto', 'bitcoin', 'exchange', 'investimento', 'confianca',
      'institucional', 'blockchain', 'corretora cripto',
    ],
  },
  {
    slug: 'runwayml',
    nome: 'Runway',
    mood: 'Editorial film-festival: heróis dark cinematográficos, CTA pílula preta',
    keywords: [
      'video', 'criativo', 'audiovisual', 'producao', 'cinema', 'filme',
      'edicao', 'reels', 'conteudo', 'agencia', 'arte',
    ],
  },
  {
    slug: 'pinterest',
    nome: 'Pinterest',
    mood: 'Acento vermelho, grade masonry, image-first',
    keywords: [
      'decoracao', 'design', 'inspiracao', 'lifestyle', 'casa', 'diy',
      'artesanato', 'visual', 'moodboard', 'galeria',
    ],
  },
];

/** Marca padrão quando o nicho não casa com nada (produto limpo e premium). */
export const DEFAULT_BRAND = 'apple';

/** Orçamento de caracteres do DESIGN.md injetado (gpt-4o-mini: foco + custo). */
const MAX_DESIGN_CHARS = 9000;

function normaliza(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // remove diacríticos combinantes (acentos)
}

/**
 * Escolhe o slug da marca cujo conjunto de keywords mais aparece no texto do
 * produto/nicho. Empate ou zero -> DEFAULT_BRAND.
 */
export function selectBrandSlug(termo: string): string {
  const alvo = normaliza(termo || '');
  if (!alvo) return DEFAULT_BRAND;

  let melhor = DEFAULT_BRAND;
  let melhorScore = 0;

  for (const brand of BRAND_CATALOG) {
    let score = 0;
    for (const kw of brand.keywords) {
      if (alvo.includes(normaliza(kw))) score += 1;
    }
    if (score > melhorScore) {
      melhorScore = score;
      melhor = brand.slug;
    }
  }

  return melhor;
}

export function getBrandEntry(slug: string): BrandEntry | undefined {
  return BRAND_CATALOG.find((b) => b.slug === slug);
}

/**
 * Lê o DESIGN.md de uma marca do disco e corta no orçamento de caracteres
 * (no último \n antes do limite, pra não cortar no meio de uma linha de token).
 * Best-effort: devolve null se o arquivo não existir.
 */
export async function loadBrandDesignMd(
  slug: string,
  maxChars: number = MAX_DESIGN_CHARS
): Promise<string | null> {
  try {
    const file = path.join(DESIGN_MD_DIR, slug, 'DESIGN.md');
    const conteudo = await fs.readFile(file, 'utf-8');
    if (conteudo.length <= maxChars) return conteudo;

    const corte = conteudo.lastIndexOf('\n', maxChars);
    const fim = corte > maxChars * 0.6 ? corte : maxChars;
    return (
      conteudo.slice(0, fim) +
      '\n\n[...DESIGN.md truncado para caber no orçamento — os tokens essenciais (cores, tipografia, componentes) já estão acima.]'
    );
  } catch {
    return null;
  }
}

export interface BrandReference {
  slug: string;
  nome: string;
  mood: string;
  /** Bloco markdown pronto pra concatenar no prompt do usuário (OpenAI). */
  block: string;
}

/**
 * Orquestra a injeção: escolhe a marca pelo termo, carrega o DESIGN.md e monta
 * o bloco final. Se a leitura falhar, devolve um bloco mínimo só com o nome/mood
 * (o agente ainda tem o catálogo destilado na própria SKILL.md como fallback).
 */
export async function buildBrandReferenceBlock(
  termo: string
): Promise<BrandReference> {
  const slug = selectBrandSlug(termo);
  const entry = getBrandEntry(slug);
  const nome = entry?.nome ?? slug;
  const mood = entry?.mood ?? '';

  const designMd = await loadBrandDesignMd(slug);

  const cabecalho = `=== REFERÊNCIA DE MARCA INJETADA: ${nome.toUpperCase()} ===
Estética escolhida para este nicho: ${mood}

Você DEVE ancorar o design desta landing page no sistema abaixo (cores, tipografia,
componentes, layout e do's/don'ts). Não invente uma paleta genérica de IA — use
EXATAMENTE os tokens e regras desta marca. Adapte o conteúdo à copy aprovada,
mas mantenha a linguagem visual fiel à referência.`;

  const corpo = designMd
    ? `\n\n${designMd}`
    : `\n\n[DESIGN.md de "${slug}" indisponível em disco — siga o catálogo de marcas da sua SKILL para reproduzir a estética ${nome}.]`;

  return { slug, nome, mood, block: cabecalho + corpo };
}
