// src/app/api/deploy/dominios/route.ts
//
// Domínios disponíveis para publicar uma LP. Alimenta o seletor de destino da
// /design — que nasce VAZIO de propósito (decisão de 29/07): escolher o domínio
// a cada publicação custa um clique e evita subir oferta no domínio errado, que
// é caro de desfazer (subdomínio que o Meta já viu não se troca sem perder
// histórico de domínio no pixel).
//
// Requer CLOUDFLARE_API_TOKEN com leitura de Zone.

import { listarZonas } from '@/lib/cloudflare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const zonas = await listarZonas();
    return Response.json({ dominios: zonas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[api/deploy/dominios] erro:', msg);
    return Response.json(
      {
        error: 'Não foi possível listar os domínios do Cloudflare.',
        detalhe: msg,
        dica: 'Publicar só para teste (.pages.dev) continua funcionando sem isto.',
      },
      { status: 502 }
    );
  }
}
