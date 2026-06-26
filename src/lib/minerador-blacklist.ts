// src/lib/minerador-blacklist.ts
//
// LISTA NEGRA DO MINERADOR.
// Anunciantes e domínios que NUNCA queremos minerar: marketplaces gigantes,
// gateways de pagamento, SaaS e marcas institucionais. Eles dominam keywords
// genéricas ("frete grátis", "50% off") e poluem a mineração.
//
// COMO EDITAR: é só adicionar uma linha com o nome/domínio em MINÚSCULAS.
// A checagem é case-insensitive e por "contém" (substring), então "shopee"
// pega "Shopee Brasil", "Shopee Oficial" etc. Quando achar mais lixo, some aqui.
//
// (Futuramente isso pode vir do Obsidian/nexus.ai via MCP — por ora, fica aqui.)

// Bate contra o NOME do anunciante (page_name)
export const ANUNCIANTES_LISTA_NEGRA: string[] = [
  'mercado pago',
  'mercado livre',
  'mercadolivre',
  'mercadolibre',
  'shopee',
  'aliexpress',
  'infinitepay',
  'infinite pay',
  'whatchimp',
  'iherb',
  'techfindshub',
  'amazon',
  'temu',
  'magalu',
  'magazine luiza',
  'americanas',
  'casas bahia',
  'pagseguro',
  'pagbank',
  'pagar.me',
  'stone',
  'cielo',
  'getnet',
  'nubank',
  'banco inter',
  'picpay',
  'shein',
];

// Bate contra a URL de destino (link_url)
export const DOMINIOS_LISTA_NEGRA: string[] = [
  'mercadopago',
  'mercadolivre',
  'mercadolibre',
  'shopee',
  'aliexpress',
  'infinitepay',
  'whatchimp',
  'iherb',
  'amazon.',
  'temu.',
  'magazineluiza',
  'magalu',
  'americanas',
  'shein',
  'pagseguro',
  'pagbank',
  'nubank',
];

/**
 * Retorna o motivo do bloqueio (string) se o anúncio cair na lista negra,
 * ou null se estiver liberado para avaliação.
 */
export function naListaNegra(pageName?: string | null, linkUrl?: string | null): string | null {
  const nome = (pageName || '').toLowerCase();
  const url = (linkUrl || '').toLowerCase();

  for (const termo of ANUNCIANTES_LISTA_NEGRA) {
    if (termo && nome.includes(termo)) return `anunciante "${pageName}" está na lista negra`;
  }
  for (const dom of DOMINIOS_LISTA_NEGRA) {
    if (dom && url.includes(dom)) return `domínio de destino na lista negra (${dom})`;
  }
  return null;
}
