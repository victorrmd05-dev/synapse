import { NextResponse } from 'next/server';
import { fetchAdsetsOverview } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Lista os conjuntos de anúncios (adsets) de uma campanha, com status de
 * entrega + métricas do período (gasto, impressões, ROAS, CPA).
 * GET /api/meta/adsets/list?campaignId=<meta_campaign_id>[&range=last_30d]
 * ou período personalizado: &since=YYYY-MM-DD&until=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const range = searchParams.get('range') || 'last_30d';
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: 'Parâmetro campaignId é obrigatório.' },
      { status: 400 }
    );
  }

  try {
    const date = since && until ? { since, until } : { preset: range };
    const adsets = await fetchAdsetsOverview(campaignId, date);
    return NextResponse.json({ success: true, adsets });
  } catch (error: any) {
    console.error('Falha ao listar adsets:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 502 }
    );
  }
}