import { NextResponse } from 'next/server';
import { getCampaignAdSets } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Lista os conjuntos de anúncios (adsets) de uma campanha.
 * GET /api/meta/adsets/list?campaignId=<meta_campaign_id>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: 'Parâmetro campaignId é obrigatório.' },
      { status: 400 }
    );
  }

  try {
    const adsets = await getCampaignAdSets(campaignId);
    return NextResponse.json({ success: true, adsets });
  } catch (error: any) {
    console.error('Falha ao listar adsets:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 502 }
    );
  }
}