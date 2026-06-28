// supabase/functions/track-capi/index.ts
//
// RELAY CAPI (Conversions API) — versão Supabase Edge Function (Deno).
//
// Por que aqui e não só no Next.js: a landing page roda publicada (Cloudflare)
// e precisa chamar um endpoint PÚBLICO e estável. O app Synapse roda local, então
// o relay do Next (/api/track/capi) só serve pra dev. Em produção o snippet FOP
// aponta para esta função: https://<projeto>.supabase.co/functions/v1/track-capi
//
// Espelha exatamente o relay Next (src/app/api/track/capi/route.ts):
//  - normalização de PII BYTE-EXATA ao client (senão o SHA256 não casa e a dedup
//    + Advanced Matching quebram);
//  - mesmo event_id do client → o Meta deduplica → EMQ sobe;
//  - token da Conversions API lido só aqui no servidor (tracking_config), via
//    service_role injetada pelo Supabase. NUNCA chega ao browser.
//  - best-effort: nunca derruba a página do cliente (devolve 200 mesmo em erro).
//
// JWT verification DESLIGADA de propósito: é endpoint público chamado pelo
// navegador de visitantes anônimos. A "autorização" é o próprio pixel_id + token
// configurado no banco; eventos fora da allowlist ou sem pixel são barrados.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GRAPH_VERSION = 'v21.0';

// Allowlist de eventos do FOP — barra qualquer coisa fora da hierarquia.
const EVENTOS_PERMITIDOS = new Set([
  'PageView', 'ViewContent', 'AddToWishlist', 'Lead', 'Contact',
  'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Search',
]);

// --- Normalização: ESPELHO EXATO do client (buildBodySnippet em fop.ts) --------
function normEmail(s: string | undefined | null): string {
  return (s || '').toString().trim().toLowerCase();
}
function normPhone(s: string | undefined | null): string {
  return (s || '').toString().replace(/\D/g, '');
}
function normName(s: string | undefined | null): string {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

// SHA256 hex via Web Crypto (Deno) — equivalente ao node:crypto do relay Next.
async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Não re-hasheia o que já chega como SHA256 (64 hex).
async function maybeHash(v: string | undefined | null): Promise<string | undefined> {
  if (!v) return undefined;
  if (/^[a-f0-9]{64}$/i.test(v)) return v.toLowerCase();
  return await sha256(v);
}

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
  // Tolera barra final / diferença de caixa: o navegador manda a Origin SEM barra,
  // mas o domínio costuma ser cadastrado COM barra — comparar normalizado e, se
  // casar, ecoar a Origin exata (senão o Allow-Origin não bate e o browser bloqueia).
  const strip = (s: string) => s.replace(/\/+$/, '').toLowerCase();
  let allow = origin || '*';
  if (allowed && allowed !== '*') {
    allow = origin && strip(origin) === strip(allowed) ? origin : allowed.replace(/\/+$/, '');
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin, null) });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin, null) });
  }

  let pixelDominio: string | null = null;

  try {
    const body = (await request.json()) as CapiBody;

    if (!body.pixel_id || !body.event_name || !body.event_id) {
      return Response.json(
        { erro: 'pixel_id, event_name e event_id são obrigatórios' },
        { status: 400, headers: corsHeaders(origin, null) },
      );
    }
    if (!EVENTOS_PERMITIDOS.has(body.event_name)) {
      return Response.json(
        { erro: `Evento não permitido: ${body.event_name}` },
        { status: 400, headers: corsHeaders(origin, null) },
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
      // Sem token: aceita silenciosamente (o Pixel no browser ainda funciona),
      // mas não há como espelhar server-side.
      return Response.json(
        { ok: false, motivo: 'pixel sem token/inativo — só client-side ativo' },
        { status: 200, headers: corsHeaders(origin, pixelDominio) },
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
    if (geo.ct) userData.ct = [await sha256(normName(geo.ct))];
    if (geo.st) userData.st = [await sha256(normName(geo.st))];
    if (geo.zp) userData.zp = [await sha256(normPhone(geo.zp))];
    if (geo.country) userData.country = [await sha256(normName(geo.country))];
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
    const { error: logErr } = await supabase.from('tracking_eventos').insert({
      pixel_id: pixel.pixel_id,
      event_name: body.event_name,
      event_id: body.event_id,
      page_url: body.page_url,
      sucesso,
      payload_json: payload,
      meta_response_json: metaJson,
    });
    if (logErr) console.warn('[track-capi] falha ao logar evento:', logErr.message);

    return Response.json(
      { ok: sucesso, meta: metaJson },
      { status: 200, headers: corsHeaders(origin, pixelDominio) },
    );
  } catch (err) {
    console.error('[track-capi] erro:', err);
    // Mesmo em erro, devolve 200 pra não derrubar a página do cliente.
    return Response.json(
      { ok: false, erro: err instanceof Error ? err.message : 'erro' },
      { status: 200, headers: corsHeaders(origin, pixelDominio) },
    );
  }
});
