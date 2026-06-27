// src/app/api/track/capi/route.ts
//
// RELAY CAPI (Conversions API) — o lado servidor do disparo duplo do FOP.
//
// A landing page no ar dispara cada evento 2×: pelo navegador (Pixel) e por aqui
// (servidor), AMBOS com o MESMO event_id → o Meta deduplica e o EMQ sobe. Este
// relay hasheia a PII com SHA256 (normalização idêntica ao client), enriquece o
// geo e encaminha pro Graph API v21.0. Best-effort: NUNCA quebra o fluxo da LP.
//
// O Pixel + token da Conversions API vêm da tabela tracking_config (lida só aqui
// no servidor, via service_role — o token NUNCA chega ao browser).
//
// CORS: a LP roda noutro domínio (Cloudflare/GitHub Pages), então liberamos a
// origem configurada no pixel (ou * quando não especificada) + OPTIONS.

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { normEmail, normPhone, normName, maybeHash, sha256 } from '@/lib/tracking/fop';

export const runtime = 'nodejs';

const GRAPH_VERSION = 'v21.0';
// Allowlist de eventos do FOP — barra qualquer coisa fora da hierarquia.
const EVENTOS_PERMITIDOS = new Set([
  'PageView', 'ViewContent', 'AddToWishlist', 'Lead', 'Contact',
  'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Search',
]);

interface CapiBody {
  pixel_id?: string;
  event_name?: string;
  event_id?: string;
  page_url?: string;
  external_id?: string;
  user_data?: { em?: string; ph?: string; fn?: string; ln?: string };
  fbp?: string;
  fbc?: string;
  custom_data?: Record<string, unknown>;
  geo?: { ct?: string; st?: string; zp?: string; country?: string };
}

function corsHeaders(origin: string | null, allowed: string | null): HeadersInit {
  // Se o pixel define um domínio, só ele passa; senão, reflete a origem (ou *).
  const allow = allowed && allowed !== '*' ? allowed : origin || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin'), null),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  let pixelDominio: string | null = null;

  try {
    const body = (await request.json()) as CapiBody;

    if (!body.pixel_id || !body.event_name || !body.event_id) {
      return Response.json(
        { erro: 'pixel_id, event_name e event_id são obrigatórios' },
        { status: 400, headers: corsHeaders(origin, null) }
      );
    }
    if (!EVENTOS_PERMITIDOS.has(body.event_name)) {
      return Response.json(
        { erro: `Evento não permitido: ${body.event_name}` },
        { status: 400, headers: corsHeaders(origin, null) }
      );
    }

    // 1. Config do pixel (token SECRETO lido só aqui no servidor).
    const { data: pixel } = await supabase
      .from('tracking_config')
      .select('pixel_id, capi_token, test_event_code, dominio_permitido, ativo')
      .eq('pixel_id', body.pixel_id)
      .maybeSingle();

    pixelDominio = pixel?.dominio_permitido ?? null;

    if (!pixel || !pixel.ativo || !pixel.capi_token) {
      // Sem token configurado: aceita silenciosamente (o Pixel no browser ainda
      // funciona sozinho) mas não tem como espelhar server-side.
      return Response.json(
        { ok: false, motivo: 'pixel sem token/inativo — só client-side ativo' },
        { status: 200, headers: corsHeaders(origin, pixelDominio) }
      );
    }

    // 2. Identidade + geo
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      '';
    const ua = request.headers.get('user-agent') || '';

    const ud = body.user_data || {};
    const [em, ph, fn, ln, extId] = await Promise.all([
      ud.em ? maybeHash(normEmail(ud.em)) : undefined,
      ud.ph ? maybeHash(normPhone(ud.ph)) : undefined,
      ud.fn ? maybeHash(normName(ud.fn)) : undefined,
      ud.ln ? maybeHash(normName(ud.ln)) : undefined,
      body.external_id ? sha256(body.external_id) : undefined,
    ]);

    const geo = body.geo || {};
    const userData: Record<string, string | string[]> = {};
    if (ip) userData.client_ip_address = ip;
    if (ua) userData.client_user_agent = ua;
    if (em) userData.em = [em];
    if (ph) userData.ph = [ph];
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (extId) userData.external_id = [extId];
    if (geo.ct) userData.ct = [sha256(normName(geo.ct))];
    if (geo.st) userData.st = [sha256(normName(geo.st))];
    if (geo.zp) userData.zp = [sha256(normPhone(geo.zp))];
    if (geo.country) userData.country = [sha256(normName(geo.country))];
    if (body.fbp) userData.fbp = body.fbp; // cru
    if (body.fbc) userData.fbc = body.fbc; // cru

    // 3. Monta o evento CAPI (mesmo event_id do client = deduplicação)
    const capiEvent = {
      event_name: body.event_name,
      event_id: body.event_id,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: body.page_url,
      action_source: 'website',
      user_data: userData,
      custom_data: body.custom_data || {},
    };

    const payload = {
      data: [capiEvent],
      ...(pixel.test_event_code ? { test_event_code: pixel.test_event_code } : {}),
    };

    // 4. Envia ao Meta
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixel.pixel_id}/events?access_token=${pixel.capi_token}`;
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const metaJson = await metaRes.json().catch(() => ({}));
    const sucesso = metaRes.ok;

    // 5. Auditoria best-effort (PII já hasheada no payload)
    supabase
      .from('tracking_eventos')
      .insert({
        pixel_id: pixel.pixel_id,
        event_name: body.event_name,
        event_id: body.event_id,
        page_url: body.page_url,
        sucesso,
        payload_json: payload,
        meta_response_json: metaJson,
      })
      .then(({ error }) => {
        if (error) console.warn('[track/capi] falha ao logar evento:', error.message);
      });

    return Response.json(
      { ok: sucesso, meta: metaJson },
      { status: 200, headers: corsHeaders(origin, pixelDominio) }
    );
  } catch (err) {
    console.error('[track/capi] erro:', err);
    // Mesmo em erro, devolve 200 pra não derrubar a página do cliente.
    return Response.json(
      { ok: false, erro: err instanceof Error ? err.message : 'erro' },
      { status: 200, headers: corsHeaders(origin, pixelDominio) }
    );
  }
}
