// src/lib/tracking/fop.ts
//
// Builder DETERMINÍSTICO do Framework FOP (Funil de Otimização de Pixel).
//
// Por que determinístico e não gerado por IA: o código de tracking (dedup por
// event_id, Advanced Matching, normalização de PII) precisa ser BYTE-EXATO e
// idêntico entre client e server — senão o hash SHA256 não casa e o Meta
// descarta o matching, derrubando o EMQ. A IA decide a INTELIGÊNCIA (qual
// template de funil, value/content_name); este módulo injeta o snippet validado.
//
// Referência de produção: fop-tracking/reference/{client-implementation,
// capi-edge-function,event-templates}.md (mct.lucioartes.com / leadcerto).

// ---------------------------------------------------------------------------
// Normalização — ESPELHO EXATO do client (ver buildClientSnippet abaixo).
// Email: trim + lowercase. Telefone: só dígitos (com DDI). Nome: NFD, remove
// acento, só a-z. Hash que não casa = AM descartado.
// ---------------------------------------------------------------------------
export function normEmail(s: string | undefined | null): string {
  return (s || '').toString().trim().toLowerCase();
}
export function normPhone(s: string | undefined | null): string {
  return (s || '').toString().replace(/\D/g, '');
}
export function normName(s: string | undefined | null): string {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

// SHA256 server-side (node:crypto). Mantido aqui para o relay reusar a MESMA
// normalização que o snippet do client aplica.
import { createHash } from 'node:crypto';
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
// Não re-hasheia o que já chega como SHA256 (64 hex).
export function maybeHash(v: string | undefined | null): string | undefined {
  if (!v) return undefined;
  if (/^[a-f0-9]{64}$/i.test(v)) return v.toLowerCase();
  return sha256(v);
}

// ---------------------------------------------------------------------------
// Templates de hierarquia FOP (A–E). Cada um é um subconjunto da escada de 9
// eventos, escolhido pela estrutura do funil. Ver event-templates.md.
// ---------------------------------------------------------------------------
export type FunnelType = 'A' | 'B' | 'C' | 'D' | 'E';

export interface FunnelEvent {
  ordem: number;
  evento: string;
  gatilho: string;
  parametros: string;
}

export interface FunnelTemplate {
  tipo: FunnelType;
  nome: string;
  eventos: FunnelEvent[];
}

export const FUNNEL_TEMPLATES: Record<FunnelType, FunnelTemplate> = {
  A: {
    tipo: 'A',
    nome: 'LP com Popup',
    eventos: [
      { ordem: 1, evento: 'PageView', gatilho: 'carrega', parametros: 'AM no init' },
      { ordem: 2, evento: 'ViewContent', gatilho: 'scroll 25% / 10s', parametros: 'content_name, content_category' },
      { ordem: 3, evento: 'AddToWishlist', gatilho: 'scroll 50% / 30s', parametros: 'value, currency' },
      { ordem: 4, evento: 'Lead', gatilho: 'popup abre', parametros: '—' },
      { ordem: 5, evento: 'Contact', gatilho: 'preencheu nome', parametros: 'fn' },
      { ordem: 6, evento: 'AddToCart', gatilho: 'email + phone', parametros: 'em, ph, value, currency' },
      { ordem: 7, evento: 'InitiateCheckout', gatilho: 'clicou comprar', parametros: 'value, currency' },
      { ordem: 8, evento: 'AddPaymentInfo', gatilho: 'plataforma de checkout', parametros: '—' },
      { ordem: 9, evento: 'Purchase', gatilho: 'compra confirmada', parametros: 'value, currency, transaction_id' },
    ],
  },
  B: {
    tipo: 'B',
    nome: 'LP sem Popup (form inline)',
    eventos: [
      { ordem: 1, evento: 'PageView', gatilho: 'carrega', parametros: 'AM no init' },
      { ordem: 2, evento: 'ViewContent', gatilho: 'scroll 25% / 10s', parametros: 'content_name' },
      { ordem: 3, evento: 'AddToWishlist', gatilho: 'scroll 50% / 30s', parametros: 'value, currency' },
      { ordem: 4, evento: 'Lead', gatilho: 'form visível / foco', parametros: '—' },
      { ordem: 5, evento: 'InitiateCheckout', gatilho: 'clicou comprar', parametros: 'value, currency' },
      { ordem: 6, evento: 'AddPaymentInfo', gatilho: 'plataforma de checkout', parametros: '—' },
      { ordem: 7, evento: 'Purchase', gatilho: 'compra confirmada', parametros: 'value, currency' },
    ],
  },
  C: {
    tipo: 'C',
    nome: 'WhatsApp Direct',
    eventos: [
      { ordem: 1, evento: 'PageView', gatilho: 'carrega', parametros: 'AM no init' },
      { ordem: 2, evento: 'ViewContent', gatilho: 'scroll 25% / 10s', parametros: 'content_name' },
      { ordem: 3, evento: 'Lead', gatilho: 'clicou no botão WhatsApp', parametros: '—' },
      { ordem: 4, evento: 'Contact', gatilho: 'respondeu (manual)', parametros: '—' },
      { ordem: 5, evento: 'Purchase', gatilho: 'compra (manual/checkout)', parametros: 'value, currency' },
    ],
  },
  D: {
    tipo: 'D',
    nome: 'Instagram Direct',
    eventos: [
      { ordem: 1, evento: 'PageView', gatilho: 'carrega', parametros: 'AM no init' },
      { ordem: 2, evento: 'Lead', gatilho: 'clicou no DM', parametros: '—' },
      { ordem: 3, evento: 'Contact', gatilho: 'respondeu (manual)', parametros: '—' },
      { ordem: 4, evento: 'Purchase', gatilho: 'compra (manual)', parametros: 'value, currency' },
    ],
  },
  E: {
    tipo: 'E',
    nome: 'E-commerce',
    eventos: [
      { ordem: 1, evento: 'PageView', gatilho: 'carrega', parametros: 'AM no init' },
      { ordem: 2, evento: 'ViewContent', gatilho: 'scroll 25% / 10s', parametros: 'content_name, content_ids' },
      { ordem: 3, evento: 'AddToWishlist', gatilho: 'scroll 50% / 30s', parametros: 'value, currency' },
      { ordem: 4, evento: 'AddToCart', gatilho: 'clicou adicionar', parametros: 'value, currency, content_ids' },
      { ordem: 5, evento: 'InitiateCheckout', gatilho: 'iniciou checkout', parametros: 'value, currency' },
      { ordem: 6, evento: 'AddPaymentInfo', gatilho: 'inseriu pagamento', parametros: '—' },
      { ordem: 7, evento: 'Purchase', gatilho: 'compra confirmada', parametros: 'value, currency, transaction_id' },
    ],
  },
};

export function getFunnelTemplate(tipo: string | null | undefined): FunnelTemplate {
  const t = (tipo || 'B').toUpperCase() as FunnelType;
  return FUNNEL_TEMPLATES[t] || FUNNEL_TEMPLATES.B;
}

// ---------------------------------------------------------------------------
// Montagem do snippet FOP (HEAD + BODY) parametrizado.
// O HEAD inicializa o Pixel com Advanced Matching re-hidratado do storage e
// dispara PageView. O BODY traz persistência dual (cookie + localStorage),
// normalização IDÊNTICA ao server, dispatcher com dedup (event_id compartilhado
// client↔CAPI) e a hierarquia de scroll/tempo/formulário.
// ---------------------------------------------------------------------------
export interface SnippetParams {
  pixelId: string;
  capiEndpoint: string; // URL absoluta do relay (/api/track/capi)
  funnel: FunnelType;
  contentName: string;
  contentId: string;
  value: number;
  currency: string;
}

function jsStr(s: string): string {
  return JSON.stringify(s ?? '');
}

export function buildHeadSnippet(p: SnippetParams): string {
  return `<!-- FOP Tracking · HEAD (Pixel + Advanced Matching) -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
(function(){
  function gc(k){var m=document.cookie.match('(^|;)\\\\s*'+k+'\\\\s*=\\\\s*([^;]+)');return m?decodeURIComponent(m.pop()):'';}
  function ls(k){try{return localStorage.getItem(k)||gc(k);}catch(e){return gc(k);}}
  var L={};try{L=JSON.parse(ls('fop_lead')||'{}');}catch(e){L={};}
  var vid=ls('fop_vid');
  if(!vid){vid=(window.crypto&&crypto.randomUUID?crypto.randomUUID():'v'+Date.now()+Math.random().toString(36).slice(2));
    try{localStorage.setItem('fop_vid',vid);}catch(e){}document.cookie='fop_vid='+vid+';path=/;max-age=15552000;SameSite=Lax';}
  fbq('init', ${jsStr(p.pixelId)}, {
    em:L.em||'', ph:L.ph||'', fn:L.fn||'', ln:L.ln||'', external_id:vid
  });
  fbq('track','PageView');
})();
</script>
<!-- /FOP Tracking · HEAD -->`;
}

export function buildBodySnippet(p: SnippetParams): string {
  const eventos = FUNNEL_TEMPLATES[p.funnel]?.eventos || FUNNEL_TEMPLATES.B.eventos;
  const tem = (nome: string) => eventos.some((e) => e.evento === nome);

  // Trechos condicionais por template — só injeta o que a hierarquia exige.
  const scrollViewContent = tem('ViewContent');
  const scrollWishlist = tem('AddToWishlist');
  const formFlow = tem('Contact') || tem('AddToCart');
  const whatsappFlow = p.funnel === 'C';

  return `<!-- FOP Tracking · BODY (persistência + dispatcher dedup + hierarquia) -->
<script>
(function(){
  'use strict';
  var PIXEL_ID=${jsStr(p.pixelId)}, CAPI=${jsStr(p.capiEndpoint)};
  var CONTENT_NAME=${jsStr(p.contentName)}, CONTENT_ID=${jsStr(p.contentId)};
  var VALUE=${Number(p.value) || 0}, CURRENCY=${jsStr(p.currency || 'BRL')};

  function setCookie(k,v,d){var e=new Date(Date.now()+d*864e5).toUTCString();
    document.cookie=k+'='+encodeURIComponent(v)+';expires='+e+';path=/;SameSite=Lax';}
  function getCookie(k){var m=document.cookie.match('(^|;)\\\\s*'+k+'\\\\s*=\\\\s*([^;]+)');
    return m?decodeURIComponent(m.pop()):'';}
  function store(k,v){try{localStorage.setItem(k,v);}catch(e){}setCookie(k,v,180);}
  function load(k){try{return localStorage.getItem(k)||getCookie(k);}catch(e){return getCookie(k);}}

  window.FOP={
    visitorId:function(){var id=load('fop_vid');if(!id){id=(window.crypto&&crypto.randomUUID?
      crypto.randomUUID():'v'+Date.now()+Math.random().toString(36).slice(2));store('fop_vid',id);}return id;},
    saveLead:function(d){store('fop_lead',JSON.stringify(d));},
    loadLead:function(){try{return JSON.parse(load('fop_lead')||'{}');}catch(e){return {};}}
  };

  // Normalização IDÊNTICA ao server (senão o hash SHA256 não casa).
  function normEmail(s){return (s||'').toString().trim().toLowerCase();}
  function normPhone(s){return (s||'').toString().replace(/\\D/g,'');}
  function normName(s){return (s||'').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z]/g,'');}

  var sent={};
  function sendEvent(name,custom){
    if(sent[name])return;sent[name]=true;
    var eid=name+'_'+Date.now()+'_'+Math.random().toString(36).substr(2,6);
    fbq('track',name,custom||{},{eventID:eid});      // browser
    var L=FOP.loadLead();
    fetch(CAPI,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
      body:JSON.stringify({                            // server (CAPI) — mesmo event_id
        pixel_id:PIXEL_ID, event_name:name, event_id:eid, page_url:location.href,
        external_id:FOP.visitorId(),
        user_data:{em:normEmail(L.em),ph:normPhone(L.ph),fn:normName(L.fn),ln:normName(L.ln)},
        fbp:getCookie('_fbp'), fbc:getCookie('_fbc'),
        custom_data:Object.assign({content_name:CONTENT_NAME,content_ids:[CONTENT_ID],content_type:'product'},custom||{})
      })}).catch(function(){});
  }
  window.FOP.send=sendEvent;
${scrollViewContent || scrollWishlist ? `
  // hierarquia por scroll + tempo
  var hit={25:false,50:false};
  window.addEventListener('scroll',function(){
    var h=document.body.scrollHeight-window.innerHeight;var pct=h>0?(window.scrollY/h)*100:0;
${scrollViewContent ? `    if(pct>=25&&!hit[25]){hit[25]=true;sendEvent('ViewContent',{content_name:CONTENT_NAME});}` : ''}
${scrollWishlist ? `    if(pct>=50&&!hit[50]){hit[50]=true;sendEvent('AddToWishlist',{value:VALUE,currency:CURRENCY});}` : ''}
  },{passive:true});
${scrollViewContent ? `  setTimeout(function(){sendEvent('ViewContent',{content_name:CONTENT_NAME});},10000);` : ''}
` : ''}${formFlow ? `
  // formulário: Contact -> AddToCart; salva lead p/ re-hidratar o AM
  window.FOP.onLeadFields=function(d){            // d = {em, ph, fn, ln}
    FOP.saveLead(d);
    fbq('init',PIXEL_ID,{em:normEmail(d.em),ph:normPhone(d.ph),fn:normName(d.fn),ln:normName(d.ln),external_id:FOP.visitorId()});
${tem('Contact') ? `    if(d.fn)sendEvent('Contact',{});` : ''}
${tem('AddToCart') ? `    if(d.em&&d.ph)sendEvent('AddToCart',{value:VALUE,currency:CURRENCY});` : ''}
  };
  // auto-instrumenta formulários simples (name/email/phone) e botões de compra
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('form').forEach(function(f){
      f.addEventListener('submit',function(){
        var g=function(sel){var el=f.querySelector(sel);return el?el.value:'';};
        window.FOP.onLeadFields({
          em:g('[type=email],[name*=mail]'), ph:g('[type=tel],[name*=phone],[name*=fone],[name*=whats]'),
          fn:g('[name*=nome],[name*=name]'), ln:''
        });
      });
    });
  });
` : ''}${tem('InitiateCheckout') ? `
  // botões de compra/checkout -> InitiateCheckout
  document.addEventListener('click',function(e){
    var a=e.target.closest('a,button');if(!a)return;
    var txt=(a.textContent||'').toLowerCase();
    if(/comprar|checkout|finalizar|assinar|quero|garantir/.test(txt))
      sendEvent('InitiateCheckout',{value:VALUE,currency:CURRENCY});
  });
` : ''}${whatsappFlow ? `
  // WhatsApp Direct: clique no link wa.me -> Lead
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');if(a&&/wa\\.me|api\\.whatsapp/.test(a.href||''))sendEvent('Lead',{});
  });
` : ''}})();
</script>
<!-- /FOP Tracking · BODY -->`;
}

// ---------------------------------------------------------------------------
// Injeção no HTML do Designer: HEAD antes de </head>, BODY antes de </body>.
// Idempotente: se já houver FOP instalado, remove a versão anterior primeiro.
// ---------------------------------------------------------------------------
export function injectFopIntoHtml(html: string, p: SnippetParams): string {
  let out = stripFop(html);
  const head = buildHeadSnippet(p);
  const body = buildBodySnippet(p);

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${head}\n</head>`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html[^>]*>/i, (m) => `${m}\n<head>${head}</head>`);
  } else {
    out = `${head}\n${out}`;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${body}\n</body>`);
  } else {
    out = `${out}\n${body}`;
  }
  return out;
}

// Remove um bloco FOP previamente injetado (entre os marcadores de comentário).
export function stripFop(html: string): string {
  return html
    .replace(/<!-- FOP Tracking · HEAD[\s\S]*?<!-- \/FOP Tracking · HEAD -->/gi, '')
    .replace(/<!-- FOP Tracking · BODY[\s\S]*?<!-- \/FOP Tracking · BODY -->/gi, '')
    .trim();
}
