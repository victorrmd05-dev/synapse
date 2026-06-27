# FOP — Implementação Cliente (HEAD + BODY)

Padrão validado em produção (mct.lucioartes.com/leadcerto). O cliente dispara Pixel + Advanced Matching + hierarquia de eventos, gera um `event_id` único por evento e chama o CAPI server-side com **o mesmo id** (deduplicação).

## HEAD — Inicialização com Advanced Matching

`fbq('init')` recebe o AM já hidratado do que estiver persistido (lead que voltou via cookie/localStorage). PageView dispara desde o 1º acesso; o CAPI enriquece o geo por IP.

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

// AM re-hidratado do storage (lead que já preencheu antes)
var L = FOP.loadLead();   // { em, ph, fn, ln } | {}
fbq('init', 'SEU_PIXEL_ID', {
  em: L.em || '', ph: L.ph || '', fn: L.fn || '', ln: L.ln || '',
  external_id: FOP.visitorId()      // UUID persistente (cookie + localStorage)
});
fbq('track', 'PageView');
</script>
```

## BODY — Persistência, normalização e dispatcher

```javascript
(function(){
  'use strict';

  // ---- persistência dual: cookie + localStorage ----
  function setCookie(k,v,d){var e=new Date(Date.now()+d*864e5).toUTCString();
    document.cookie=k+'='+encodeURIComponent(v)+';expires='+e+';path=/;SameSite=Lax';}
  function getCookie(k){var m=document.cookie.match('(^|;)\\s*'+k+'\\s*=\\s*([^;]+)');
    return m?decodeURIComponent(m.pop()):'';}
  function store(k,v){try{localStorage.setItem(k,v);}catch(e){} setCookie(k,v,180);}
  function load(k){try{return localStorage.getItem(k)||getCookie(k);}catch(e){return getCookie(k);}}

  window.FOP = {
    visitorId: function(){
      var id = load('fop_vid');
      if(!id){ id = (crypto.randomUUID?crypto.randomUUID():
        'v'+Date.now()+Math.random().toString(36).slice(2)); store('fop_vid', id); }
      return id;
    },
    saveLead: function(d){ store('fop_lead', JSON.stringify(d)); },
    loadLead: function(){ try{return JSON.parse(load('fop_lead')||'{}');}catch(e){return {};} }
  };

  // ---- normalização IDÊNTICA ao server (senão o hash não casa) ----
  function normEmail(s){ return (s||'').toString().trim().toLowerCase(); }
  function normPhone(s){ return (s||'').toString().replace(/\D/g,''); }   // só dígitos (com DDI)
  function normName(s){ return (s||'').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,''); }

  // ---- dispatcher com dedup (client + CAPI compartilham event_id) ----
  var sent = {};
  function sendEvent(name, custom){
    if (sent[name]) return; sent[name] = true;
    var eid = name+'_'+Date.now()+'_'+Math.random().toString(36).substr(2,6);

    // browser-side
    fbq('track', name, custom||{}, { eventID: eid });

    // server-side (CAPI) — mesmo event_id
    var L = FOP.loadLead();
    fetch('https://api.SEU_DOMINIO/functions/v1/mct-track-event', {
      method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
      body: JSON.stringify({
        event_name: name, event_id: eid, page_url: location.href,
        external_id: FOP.visitorId(),
        user_data: { em: normEmail(L.em), ph: normPhone(L.ph),
                     fn: normName(L.fn), ln: normName(L.ln) },
        fbp: getCookie('_fbp'), fbc: getCookie('_fbc'),
        custom_data: custom || {}
      })
    }).catch(function(){});
  }
  window.FOP.send = sendEvent;

  // ---- hierarquia: scroll + tempo ----
  var hit = {25:false,50:false};
  window.addEventListener('scroll', function(){
    var pct = (window.scrollY/(document.body.scrollHeight-window.innerHeight))*100;
    if(pct>=25 && !hit[25]){ hit[25]=true; sendEvent('ViewContent', {content_name:'NOME_PAGINA'}); }
    if(pct>=50 && !hit[50]){ hit[50]=true; sendEvent('AddToWishlist', {value:PRECO, currency:'BRL'}); }
  }, {passive:true});
  setTimeout(function(){ sendEvent('ViewContent', {content_name:'NOME_PAGINA'}); }, 10000);

  // ---- formulário: Contact → AddToCart, salva lead p/ re-hidratar AM ----
  function onLeadFields(d){                       // d = {em, ph, fn, ln}
    FOP.saveLead(d);
    fbq('init', 'SEU_PIXEL_ID', {                 // re-hidrata AM do init
      em: normEmail(d.em), ph: normPhone(d.ph),
      fn: normName(d.fn), ln: normName(d.ln), external_id: FOP.visitorId()
    });
    if(d.fn) sendEvent('Contact', {});
    if(d.em && d.ph) sendEvent('AddToCart', {value:PRECO, currency:'BRL'});
  }
  window.FOP.onLeadFields = onLeadFields;
})();
```

## Notas
- **`event_id` compartilhado** entre `fbq('track', …, {eventID})` e o body do CAPI → Meta deduplica.
- **Re-hidratação do AM:** ao capturar lead, re-chama `fbq('init')` com os dados e persiste — reloads e cross-device recuperam o AM.
- **`fbp`/`fbc` crus** (cookies `_fbp`/`_fbc`), nunca hasheados.
- A normalização de nome/email/telefone tem que ser **byte-idêntica** à do servidor (ver `capi-edge-function.md`).
