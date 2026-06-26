// src/app/api/mineracao/run/route.ts
//
// AS "MÃOS" DO MINERADOR.
// 1. Busca anúncios ativos na Biblioteca de Anúncios do Meta via ScrapeCreators.
// 2. Passa cada candidato pela IA (system prompt = AGENTS.md + SKILL.md do
//    minerador, vindos de agentes_config) que devolve nota + veredito.
// 3. Salva os anúncios em ads_minerados (com score_escala, categoria_ia, notas_ia).
//
// A IA é o FILTRO; esta rota é quem coleta e grava. Se a IA falhar para um
// anúncio, cai num score heurístico para a mineração nunca voltar vazia.
//
// Body (JSON):
//   { "query": "50% off", "country": "BR", "limit": 10,
//     "apenas_validados": false, "min_score": 70 }
//
// Env: SCRAPE_CREATORS_API_KEY, OPENCODE_API_KEY

import OpenAI from 'openai';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { naListaNegra } from '@/lib/minerador-blacklist';

const opencode = new OpenAI({
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: 'https://opencode.ai/zen/v1',
});
const MODELO = 'deepseek-v4-flash-free';
const SCRAPE_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads';

interface Body {
  query?: string;
  country?: string;
  limit?: number;
  apenas_validados?: boolean;
  min_score?: number;
}

// Assinatura ESTÁVEL do criativo (para dedup de duplicata real). As URLs do
// FB CDN trazem querystring assinada que muda toda hora (oh=, oe=, _nc_gid=…),
// então comparamos só o PATH do arquivo — o token do vídeo/imagem é estável e
// idêntico quando o criativo é o mesmo, mesmo com ad_archive_id diferente.
function creativeKeyFromSnap(snap: any): string | null {
  const vid =
    (Array.isArray(snap?.videos) ? snap.videos : [])[0] ??
    (Array.isArray(snap?.extra_videos) ? snap.extra_videos : [])[0];
  const vurl = vid?.video_hd_url || vid?.video_sd_url;
  if (vurl) {
    try { return 'v:' + new URL(vurl).pathname; } catch { /* url inválida */ }
  }
  const img =
    (Array.isArray(snap?.images) ? snap.images : [])[0] ??
    (Array.isArray(snap?.extra_images) ? snap.extra_images : [])[0];
  const iurl = img?.original_image_url || img?.resized_image_url;
  if (iurl) {
    try { return 'i:' + new URL(iurl).pathname; } catch { /* url inválida */ }
  }
  return null;
}

interface Avaliacao {
  score_escala?: number;
  veredito?: string;
  nicho?: string;
  mecanismo?: string;
  motivo?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const query = body.query?.trim();
    if (!query) {
      return Response.json({ error: 'O campo "query" (palavra-chave) é obrigatório.' }, { status: 400 });
    }
    if (!process.env.SCRAPE_CREATORS_API_KEY) {
      return Response.json({ error: 'SCRAPE_CREATORS_API_KEY não configurada no .env.local.' }, { status: 500 });
    }

    const country = body.country ?? 'BR';
    const limit = Math.min(body.limit ?? 10, 30);
    const minScore = body.min_score ?? 50;
    const apenasValidados = body.apenas_validados ?? false;

    // 1. Buscar anúncios na ScrapeCreators
    const url = new URL(SCRAPE_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('country', country);
    url.searchParams.set('status', 'ACTIVE');
    url.searchParams.set('trim', 'false');

    const scRes = await fetch(url.toString(), {
      headers: { 'x-api-key': process.env.SCRAPE_CREATORS_API_KEY },
      cache: 'no-store',
    });
    if (!scRes.ok) {
      const detalhe = (await scRes.text()).slice(0, 500);
      return Response.json(
        { error: 'Falha ao consultar a ScrapeCreators', status: scRes.status, detalhe },
        { status: 502 }
      );
    }
    const scData = await scRes.json();
    const resultados: any[] = Array.isArray(scData.searchResults) ? scData.searchResults : [];
    const candidatos = resultados.slice(0, limit);

    if (candidatos.length === 0) {
      return Response.json({
        sucesso: true,
        query,
        country,
        total_encontrados: 0,
        avaliados: 0,
        inseridos: 0,
        avaliacoes: [],
        aviso: 'Nenhum anúncio ativo retornado para essa palavra-chave/país. Tente outra keyword.',
      });
    }

    // Evitar duplicatas: descobrir quais ad_archive_id já estão no banco
    const ids = candidatos.map((a) => String(a.ad_archive_id)).filter(Boolean);
    const { data: existentes } = await supabase
      .from('ads_minerados')
      .select('ad_archive_id')
      .in('ad_archive_id', ids);
    const jaExiste = new Set((existentes ?? []).map((r: any) => r.ad_archive_id));

    // Evitar DUPLICATA REAL: descobrir quais criativos (mesmo vídeo/imagem) já
    // estão no banco, mesmo que com ad_archive_id diferente.
    const candidateKeys = candidatos
      .map((a) => creativeKeyFromSnap(a.snapshot ?? {}))
      .filter((k): k is string => !!k);
    const { data: existentesCriativos } = candidateKeys.length
      ? await supabase.from('ads_minerados').select('creative_hash').in('creative_hash', candidateKeys)
      : { data: [] as any[] };
    const creativeJaExiste = new Set((existentesCriativos ?? []).map((r: any) => r.creative_hash));
    const creativesNoBatch = new Set<string>();

    // 2. System prompt do minerador (do agentes_config)
    const config = await getAgentConfig('minerador');
    const systemPrompt = config ? buildSystemPrompt(config) : '';

    const avaliacoes: any[] = [];
    const paraInserir: any[] = [];
    let bloqueadosListaNegra = 0;
    let duplicatasCriativo = 0;

    for (const ad of candidatos) {
      const archiveId = String(ad.ad_archive_id ?? '');
      if (!archiveId) continue;

      const snap = ad.snapshot ?? {};
      const adCopy: string = snap.body?.text ?? '';
      const linkUrl: string | null = snap.link_url ?? null;
      const isShopify = !!linkUrl && /\/products?\//i.test(linkUrl);

      // LISTA NEGRA: descarta antes de gastar IA/crédito e nunca salva.
      const motivoListaNegra = naListaNegra(ad.page_name, linkUrl);
      if (motivoListaNegra) {
        bloqueadosListaNegra++;
        avaliacoes.push({
          ad_archive_id: archiveId,
          page_name: ad.page_name ?? null,
          score_escala: 0,
          veredito: 'lista_negra',
          nicho: null,
          motivo: motivoListaNegra,
          shopify: isShopify,
          ja_no_banco: jaExiste.has(archiveId),
        });
        continue;
      }

      // DUPLICATA REAL: criativo idêntico (mesmo vídeo/imagem) já minerado, seja
      // num anúncio anterior ou neste mesmo lote. Pula antes da IA p/ poupar crédito.
      // (Não vale para o mesmo ad_archive_id já no banco — esse cai no fluxo normal.)
      const creativeKey = creativeKeyFromSnap(snap);
      if (
        !jaExiste.has(archiveId) &&
        creativeKey &&
        (creativeJaExiste.has(creativeKey) || creativesNoBatch.has(creativeKey))
      ) {
        duplicatasCriativo++;
        avaliacoes.push({
          ad_archive_id: archiveId,
          page_name: ad.page_name ?? null,
          score_escala: 0,
          veredito: 'duplicata_criativo',
          nicho: null,
          motivo: 'Criativo idêntico (mesmo vídeo/imagem) a outro anúncio já minerado.',
          shopify: isShopify,
          ja_no_banco: false,
        });
        continue;
      }

      const startMs = ad.start_date ? Number(ad.start_date) * 1000 : null;
      const diasAtivo = startMs ? Math.floor((Date.now() - startMs) / 86_400_000) : null;
      const variacoes = Number(ad.collation_count ?? 0);

      // MÍDIA: a maioria das ofertas de dropshipping é VÍDEO (fator uau). A
      // ScrapeCreators devolve os vídeos em snapshot.videos (+ extra_videos nos
      // carrosséis) com video_hd_url/video_sd_url + um frame de preview. Antes só
      // salvávamos imagem — por isso vídeos nunca apareciam no painel.
      const videosArr: any[] = [
        ...(Array.isArray(snap.videos) ? snap.videos : []),
        ...(Array.isArray(snap.extra_videos) ? snap.extra_videos : []),
      ];
      const temVideo = videosArr.length > 0;
      const videoUrls: string[] = videosArr
        .map((v) => v?.video_hd_url || v?.video_sd_url)
        .filter((u): u is string => typeof u === 'string' && u.length > 0);
      const videoPreview: string | null = videosArr[0]?.video_preview_image_url ?? null;

      const imagesArr: any[] = [
        ...(Array.isArray(snap.images) ? snap.images : []),
        ...(Array.isArray(snap.extra_images) ? snap.extra_images : []),
      ];
      // Imagem principal: imagem real do anúncio ou, se for vídeo, o frame de preview.
      const imageUrl: string | null =
        imagesArr[0]?.original_image_url ?? imagesArr[0]?.resized_image_url ?? videoPreview ?? null;
      const extraImageUrls: string[] = imagesArr
        .slice(1)
        .map((i) => i?.original_image_url || i?.resized_image_url)
        .filter((u): u is string => typeof u === 'string' && u.length > 0);

      // 2a. Avaliação pela IA (com fallback heurístico)
      let aval: Avaliacao | null = null;
      if (systemPrompt) {
        try {
          const userPrompt = `Avalie este anúncio coletado da Biblioteca de Anúncios do Meta:
- page_name: ${ad.page_name ?? '—'}
- dias_ativo: ${diasAtivo ?? '—'}
- variacoes (collation_count): ${variacoes}
- tem_video: ${temVideo}
- link_destino: ${linkUrl ?? '—'}
- loja_shopify_detectada: ${isShopify}
- ad_copy: ${String(adCopy).slice(0, 1200)}

Responda SOMENTE com o JSON no formato definido na sua SKILL.`;
          // OBS: deepseek-v4-flash é modelo de RACIOCÍNIO — ele "pensa" no campo
          // reasoning_content antes de escrever a resposta em content. Com pouco
          // max_tokens ele gasta tudo pensando e devolve content vazio. Por isso
          // a folga generosa (~3000): raciocínio + o JSON final cabem.
          const r = await opencode.chat.completions.create({
            model: MODELO,
            max_tokens: 3000,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          });
          const txt = r.choices[0]?.message?.content ?? '';
          const m = txt.match(/\{[\s\S]*\}/);
          if (m) aval = JSON.parse(m[0]) as Avaliacao;
        } catch {
          // cai no heurístico abaixo
        }
      }

      if (!aval) {
        let score = 0;
        if (diasAtivo != null) score += diasAtivo < 7 ? 0 : diasAtivo <= 14 ? 15 : diasAtivo <= 30 ? 25 : 30;
        score += variacoes < 3 ? 0 : variacoes < 10 ? 12 : 25;
        if (isShopify) score += 15;
        aval = {
          score_escala: score,
          veredito: score >= minScore ? 'validado' : 'descartado',
          nicho: isShopify ? 'Dropshipping' : 'Outro',
          mecanismo: 'não identificado',
          motivo: `heurística: ${diasAtivo ?? '?'}d ativo, ${variacoes} variações${isShopify ? ', loja Shopify' : ''}`,
        };
      }

      const score = Number(aval.score_escala ?? 0);
      const validado = aval.veredito === 'validado' || score >= minScore;

      avaliacoes.push({
        ad_archive_id: archiveId,
        page_name: ad.page_name ?? null,
        score_escala: score,
        veredito: aval.veredito ?? (validado ? 'validado' : 'descartado'),
        nicho: aval.nicho ?? null,
        motivo: aval.motivo ?? null,
        shopify: isShopify,
        ja_no_banco: jaExiste.has(archiveId),
      });

      if (jaExiste.has(archiveId)) continue;
      if (apenasValidados && !validado) continue;

      paraInserir.push({
        ad_archive_id: archiveId,
        page_id: ad.page_id ?? null,
        page_name: ad.page_name ?? null,
        is_active: ad.is_active ?? null,
        start_date: startMs ? new Date(startMs).toISOString() : null,
        end_date: ad.end_date ? new Date(Number(ad.end_date) * 1000).toISOString() : null,
        collation_count: variacoes,
        publisher_platform: ad.publisher_platform ?? null,
        ad_library_url: `https://www.facebook.com/ads/library/?id=${archiveId}`,
        // ScrapeCreators não traz um "título" — derivamos da 1ª linha da copy
        // (a página usa ad_title como rótulo do card e chave de deduplicação).
        ad_title:
          (adCopy ? String(adCopy).split('\n')[0].trim().slice(0, 80) : '') ||
          ad.page_name ||
          null,
        ad_copy: adCopy || null,
        caption: snap.caption ?? null,
        link_description: snap.link_description ?? null,
        cta_text: snap.cta_text ?? null,
        cta_type: snap.cta_type ?? null,
        display_format: snap.display_format ?? null,
        link_url: linkUrl,
        image_url: imageUrl,
        image_resized_url: imagesArr[0]?.resized_image_url ?? null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        extra_image_urls: extraImageUrls.length > 0 ? extraImageUrls : null,
        cards_json: Array.isArray(snap.cards) && snap.cards.length > 0 ? snap.cards : null,
        page_profile_pic_url: snap.page_profile_picture_url ?? null,
        page_like_count: snap.page_like_count ?? null,
        page_categories: Array.isArray(snap.page_categories) ? snap.page_categories : null,
        pais_codigo: country,
        query_busca: query,
        data_mineracao: new Date().toISOString(),
        raw_json: ad,
        categoria_ia: aval.nicho ?? null,
        score_escala: score,
        notas_ia: aval.motivo ?? null,
        creative_hash: creativeKey,
      });
      // Só marca o criativo como "visto" quando de fato vai inserir — assim um
      // criativo descartado por filtro não bloqueia uma versão válida idêntica.
      if (creativeKey) creativesNoBatch.add(creativeKey);
    }

    // 3. Salvar no Supabase
    let inseridos = 0;
    if (paraInserir.length > 0) {
      const { error } = await supabase.from('ads_minerados').insert(paraInserir);
      if (error) {
        return Response.json(
          { error: 'Falha ao salvar em ads_minerados', detalhe: error.message, avaliacoes },
          { status: 500 }
        );
      }
      inseridos = paraInserir.length;
    }

    return Response.json({
      sucesso: true,
      query,
      country,
      total_encontrados: resultados.length,
      avaliados: candidatos.length,
      bloqueados_lista_negra: bloqueadosListaNegra,
      duplicatas_criativo: duplicatasCriativo,
      inseridos,
      usou_ia: !!systemPrompt,
      avaliacoes: avaliacoes.sort((a, b) => b.score_escala - a.score_escala),
    });
  } catch (err) {
    console.error('[api/mineracao/run] erro:', err);
    return Response.json(
      { error: 'Falha na mineração', detalhe: err instanceof Error ? err.message : 'erro desconhecido' },
      { status: 500 }
    );
  }
}
