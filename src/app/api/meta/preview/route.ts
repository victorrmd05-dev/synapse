import { NextResponse } from 'next/server';
import { hasMetaCredentials } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Formatos aceitos pela Ad Preview API (whitelist — evita passar lixo pro Graph). */
const FORMATOS = new Set([
  'MOBILE_FEED_STANDARD',
  'DESKTOP_FEED_STANDARD',
  'INSTAGRAM_STANDARD',
  'INSTAGRAM_STORY',
  'INSTAGRAM_REELS',
]);

/**
 * Visualização da publicação (Ad Preview oficial da Meta — iframe do próprio
 * Facebook mostrando o anúncio como o público vê).
 * GET /api/meta/preview?adId=<ad_id>&format=<AD_FORMAT>
 * Retorna: { success, html } — html é o <iframe> pronto pra renderizar.
 */
export async function GET(req: Request) {
  if (!hasMetaCredentials()) {
    return NextResponse.json(
      { success: false, error: 'Credenciais Meta ausentes no .env.local.' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const adId = searchParams.get('adId');
  const format = searchParams.get('format') || 'MOBILE_FEED_STANDARD';

  if (!adId) {
    return NextResponse.json(
      { success: false, error: 'Parâmetro adId é obrigatório.' },
      { status: 400 }
    );
  }
  if (!FORMATOS.has(format)) {
    return NextResponse.json(
      { success: false, error: `format inválido. Use: ${Array.from(FORMATOS).join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const token = process.env.META_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v21.0/${adId}/previews?ad_format=${format}&access_token=${token}`;
    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();

    if (!resp.ok || data.error) {
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Falha ao gerar o preview na Meta.' },
        { status: 502 }
      );
    }

    const html = data.data?.[0]?.body || '';
    if (!html) {
      return NextResponse.json(
        { success: false, error: 'Meta não devolveu preview para este anúncio/formato.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, html });
  } catch (error: any) {
    console.error('Falha no ad preview:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 502 }
    );
  }
}
