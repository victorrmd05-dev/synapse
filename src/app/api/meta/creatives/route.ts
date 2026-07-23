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
    const token = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!token || !adAccountId) {
      return NextResponse.json(
        { success: false, error: 'META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurados.' },
        { status: 400 }
      );
    }

    // Busca anúncios da campanha com os criativos. thumbnail_width/height(512)
    // porque o thumbnail_url padrão vem 64x64 (inútil pra preview).
    const url = `https://graph.facebook.com/v21.0/${campaignId}/ads?fields=name,status,creative.thumbnail_width(512).thumbnail_height(512){id,title,body,image_url,thumbnail_url,image_hash,asset_feed_spec,object_story_spec}&access_token=${token}&limit=50`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Falha ao buscar criativos da Meta.' },
        { status: 502 }
      );
    }

    const ads = data.data || [];

    // Criativos Advantage+ (asset_feed_spec) só trazem o HASH da imagem —
    // resolve em URL cheia via /adimages (uma chamada em lote, best-effort).
    const hashes = new Set<string>();
    for (const ad of ads) {
      const c = ad.creative || {};
      if (c.image_hash) hashes.add(c.image_hash);
      for (const img of c.asset_feed_spec?.images || []) if (img.hash) hashes.add(img.hash);
      const ossHash = c.object_story_spec?.link_data?.image_hash;
      if (ossHash) hashes.add(ossHash);
    }
    const hashUrl = new Map<string, string>();
    if (hashes.size > 0) {
      try {
        const hu = `https://graph.facebook.com/v21.0/${adAccountId}/adimages?hashes=${encodeURIComponent(JSON.stringify(Array.from(hashes)))}&fields=hash,url&access_token=${token}`;
        const hd = await (await fetch(hu)).json();
        for (const img of hd.data || []) if (img.hash && img.url) hashUrl.set(img.hash, img.url);
      } catch {
        // segue com o thumbnail 512px
      }
    }

    // Extrai título/copy/imagem das várias formas que a Meta retorna —
    // cada campo de forma independente (um criativo pode ter title no topo
    // e imagem só no asset_feed_spec).
    const creatives = ads.map((ad: any) => {
      const c = ad.creative || {};
      const afs = c.asset_feed_spec;
      const linkData = c.object_story_spec?.link_data || c.object_story_spec?.video_data || {};

      const title = c.title || afs?.titles?.[0]?.text || linkData.name || linkData.title || '';
      const body = c.body || afs?.bodies?.[0]?.text || linkData.message || linkData.description || '';

      // Imagem: URL direta > hash resolvido (full-res) > thumbnail 512px
      const afsHash = afs?.images?.[0]?.hash;
      const imageUrl =
        c.image_url ||
        (c.image_hash && hashUrl.get(c.image_hash)) ||
        (afsHash && hashUrl.get(afsHash)) ||
        (linkData.image_hash && hashUrl.get(linkData.image_hash)) ||
        linkData.picture ||
        c.thumbnail_url ||
        '';
      const videoUrl = afs?.videos?.[0]?.url || linkData.video_id || '';

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

    // Id numérico da conta (sem "act_") — usado pelo link "Abrir no Gerenciador".
    const accountId = adAccountId.replace(/^act_/, '');

    return NextResponse.json({ success: true, creatives, accountId });
  } catch (error: any) {
    console.error('Falha ao buscar criativos:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 502 }
    );
  }
}