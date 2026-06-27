# FOP — CAPI Server-Side (Edge Function)

Padrão validado em produção (Supabase Edge Function `mct-track-event`, mct.lucioartes.com/leadcerto). Espelha cada evento do Pixel client para o Meta CAPI usando **o mesmo `event_id`** (deduplicação), hasheia PII com SHA256, enriquece geo por IP e hidrata o lead cross-device.

## Princípios que NÃO podem se perder

1. **Dedup por `event_id`:** o id vem do client no body; o CAPI usa exatamente esse valor. Sem isso, o Meta conta o evento 2×.
2. **Normalização idêntica ao client:** email lowercase+trim; phone só dígitos; nome NFD + remove acento + só `a-z`. Hash que não casa = AM descartado.
3. **`maybeHash`:** se o valor já chega como SHA256 (64 hex), não re-hashear.
4. **Geo em cascata:** `body.geo` (client) → headers CF (`cf-ipcountry`/`cf-ipcity`/`cf-region`/`cf-postal-code`) → `ipinfo.io` por IP. Enriquece PageView desde o 1º acesso.
5. **Hidratação cross-device:** sem PII no body mas com `external_id`/`fbp` → busca o lead mais recente no banco e preenche em/ph/fn/ln/geo.
6. **`fbp`/`fbc` crus** (não hashear). `client_ip_address` + `client_user_agent` sempre.
7. **AM como arrays:** `user_data.em = [hash]`, idem ph/fn/ln/ct/st/zp/country/external_id.
8. **Allowlist de eventos + CORS allowlist.** `action_source: "website"`, Graph API `v21.0`.
9. **`test_event_code`** opcional via env (modo teste no Events Manager); remover pra produção.
10. **Auditoria best-effort:** grava cada evento (payload + resposta CAPI) numa tabela e anexa ao lead. Nunca quebra o fluxo se falhar.

## Normalização (espelho do client)

```ts
function normalize(s){ return (s||"").toString().trim().toLowerCase(); }
function normName(s){ return normalize(s).normalize("NFD")
  .replace(/[̀-ͯ]/g,"").replace(/[^a-z]/g,""); }   // NFD + sem acento + a-z
function digitsOnly(s){ return (s||"").toString().replace(/\D/g,""); }
async function sha256(input){
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function maybeHash(v){            // não re-hasheia o que já é hash
  if(!v) return undefined;
  if(/^[a-f0-9]{64}$/i.test(v)) return v.toLowerCase();
  return await sha256(v);
}
```

## Montagem do user_data + envio

```ts
const ud = body.user_data || {};
let em_raw = normalize(ud.em || ud.email);
let ph_raw = digitsOnly(ud.ph || ud.phone);
let fn_raw = normName(ud.fn || ud.first_name);
let ln_raw = normName(ud.ln || ud.last_name);

// (geo em cascata + hidratação cross-device por external_id/fbp — ver implementação completa)

const [em, ph, fn, ln, ext_id_hash] = await Promise.all([
  em_raw ? maybeHash(em_raw) : undefined,
  ph_raw ? maybeHash(ph_raw) : undefined,
  fn_raw ? maybeHash(fn_raw) : undefined,
  ln_raw ? maybeHash(ln_raw) : undefined,
  external_id ? sha256(external_id) : undefined,
]);

const user_data: Record<string, string|string[]> = {
  client_ip_address: ip, client_user_agent: ua,
};
if (em) user_data.em = [em];
if (ph) user_data.ph = [ph];
if (fn) user_data.fn = [fn];
if (ln) user_data.ln = [ln];
if (ext_id_hash) user_data.external_id = [ext_id_hash];
if (fbp) user_data.fbp = fbp;          // cru
if (fbc) user_data.fbc = fbc;          // cru

const capiEvent = {
  event_name, event_id,                // <- event_id do client (dedup)
  event_time: Math.floor(Date.now()/1000),
  event_source_url: page_url,
  user_data,
  custom_data: { content_ids:[CONTENT_ID], content_name:CONTENT_NAME,
                 content_type:"product", currency:"BRL", ...(body.custom_data||{}) },
  action_source: "website",
};

const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`;
const payload = { data:[capiEvent], ...(TEST_CODE ? {test_event_code:TEST_CODE} : {}) };
await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"},
                   body: JSON.stringify(payload) });
```

## Implementação completa de referência

O código completo (CORS, allowlist, geo em cascata, hidratação cross-device, auditoria) acompanha este pacote como referência. Adapte as variáveis ao seu projeto.

## Envs necessárias (server)
`META_PIXEL_<X>_ID`, `META_PIXEL_<X>_CAPI_TOKEN`, `META_PIXEL_<X>_TEST_CODE` (vazio em produção), `IPINFO_API_TOKEN` (opcional, geo por IP), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

> **Segredos:** nunca imprimir token/chave no terminal. Configurar via `.env`/secret store, referir por NOME da variável.
