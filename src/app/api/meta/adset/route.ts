import { NextResponse } from 'next/server';
import { updateAdsetStatus, hasMetaCredentials } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Ação de escrita na conta Meta: pausar/ativar um conjunto (ad set).
 * POST { adsetId: string, status: 'PAUSED' | 'ACTIVE' }
 * ⚠️ Altera a conta real — requer token com permissão ads_management.
 */
export async function POST(req: Request) {
  if (!hasMetaCredentials()) {
    return NextResponse.json(
      { success: false, error: 'Credenciais Meta ausentes no .env.local.' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const { adsetId, status } = body || {};
  if (!adsetId || (status !== 'PAUSED' && status !== 'ACTIVE')) {
    return NextResponse.json(
      { success: false, error: 'adsetId e status (PAUSED|ACTIVE) são obrigatórios.' },
      { status: 400 }
    );
  }

  const result = await updateAdsetStatus(String(adsetId), status);
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
