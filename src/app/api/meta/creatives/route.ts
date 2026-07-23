import { NextResponse } from 'next/server';
import { hasMetaCredentials } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Busca criativos dos anúncios de uma campanha no Meta Ads.
 * GET /api/meta/creatives?campaignId=<campaign_id>
 * 
 * Retorna: { success, creatives: Array<{ id, name, status, title, body, imageUrl? }> }
 */
export async function GET(req: Request) {
  if (!hasMetaCredentials()) {
    return NextResponse.json(
      { success: false, error: 'Credenciais Meta ausentes no .env.local.' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: 'Parâmetro campaignId é obrigatório.' },
      { status: 400 }
    );
  }

  try {
    const token = process.env.META_ADS_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!token || !adAccountId) {
      return NextResponse.json(
        { success: false, error: 'META_ADS_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados.' },
        { status: 400 }
      );
    }

    // Busca anúncios da campanha com os criativos
    const url = `https://graph.facebook.com/v21.0/${campaignId}/ads?fields=name,status,creative{id,title,body,image_url,thumbnail_url,asset_feed_spec,object_story_spec}&access_token=${token}&limit=50`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Falha ao buscar criativos da Meta.' },
        { status: 502 }
      );
    }

    // Extrai criativos
    const ads = data.data || [];
    const creatives = ads.map((ad: any) => {
      const c = ad.creative || {};
      
      // Tenta extrair title/body/image das várias formas que a Meta retorna
      let title = c.title || '';
      let body = c.body || '';
      let imageUrl = c.image_url || c.thumbnail_url || '';
      let videoUrl = '';

      // Tenta de asset_feed_spec (Dynamic Creative)
      if (!title && c.asset_feed_spec) {
        const afs = c.asset_feed_spec;
        if (afs.titles?.length) title = afs.titles[0].text;
        if (afs.bodies?.length) body = afs.bodies[0].text;
        if (afs.images?.length) imageUrl = afs.images[0]?.url || '';
        if (afs.videos?.length) videoUrl = afs.videos[0]?.url || '';
      }

      // Tenta de object_story_spec (Link Ad / Video)
      if (!title && c.object_story_spec) {
        const oss = c.object_story_spec;
        const linkData = oss.link_data || oss.video_data || {};
        title = linkData.name || linkData.title || title;
        body = linkData.message || linkData.description || body;
        imageUrl = linkData.image_url || linkData.thumbnail_url || imageUrl;
        videoUrl = linkData.video_id || videoUrl;
      }

      return {
        id: ad.id,
        adId: ad.id,
        name: ad.name || '',
        status: ad.status || 'UNKNOWN',
        title,
        body,
        imageUrl,
        videoUrl,
        creativeId: c.id,
      };
    });

    return NextResponse.json({ success: true, creatives });
  } catch (error: any) {
    console.error('Falha ao buscar criativos:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 502 }
    );
  }
}