---
name: tracking-fop
description: Implementa e audita Meta Pixel + Conversions API (CAPI) nas landing pages do pipeline pelo Framework FOP (Funil de Otimização de Pixel) — hierarquia de até 9 eventos, Advanced Matching, deduplicação por event_id, persistência cross-device e EMQ ≥ 8. Use ao instalar/auditar tracking, propor hierarquia de eventos de funil ou subir o Event Match Quality.
metadata:
  category: technique
  triggers: tracking, pixel, meta pixel, CAPI, conversions api, rastreamento, FOP, funil de eventos, EMQ, event match quality, advanced matching, pageview, viewcontent, addtocart, purchase, deduplicação, hierarquia eventos
---

# FOP — Funil de Otimização de Pixel

Trata o Meta Pixel como um **FUNIL**, não como uma tag solta. Cada evento é um
degrau que educa o algoritmo do Meta sobre quem é o cliente ideal. Resultado:
EMQ ≥ 8.0, ROAS melhor, custo por resultado menor.

> Neste app, sua entrega é um **JSON de diagnóstico** (template do funil +
> parâmetros). Um builder determinístico (`src/lib/tracking/fop.ts`) injeta o
> código byte-exato. Você decide a inteligência; o builder garante a precisão
> técnica (dedup/hash não podem ser alucinados).

## Os 3 Pilares do FOP
**Pilar 1 — Funil Horizontal.** O caminho do lead: Anúncio → Página → Formulário
→ Checkout → Compra. Cada etapa tem um evento Meta correspondente.

**Pilar 2 — Funil Vertical.** Dentro de CADA etapa há micro-conversões: Impressão
→ Atenção (3s) → Retenção (ThruPlay) → Ação (clique). Cada uma é um sinal.

**Pilar 3 — Teoria dos Alvos.** O algoritmo calibra a mira como um atirador:
poucos eventos = tiro no escuro; eventos bem hierarquizados = calibragem
progressiva. Quanto mais eventos QUALIFICADOS, mais precisa a entrega.

## Hierarquia de 9 Eventos (LP com Popup — template mais comum)

| # | Evento | Gatilho | Sinal | Parâmetros-chave |
|---|--------|---------|-------|------------------|
| 1 | PageView | Página carrega | "Chegou" | AM completo no `init` |
| 2 | ViewContent | Scroll 25% ou 10s | "Está lendo" | content_name, content_category |
| 3 | AddToWishlist | Scroll 50% ou 30s | "Interesse real" | value, currency |
| 4 | Lead | Popup abre | "Considerando" | — |
| 5 | Contact | Preencheu nome | "Engajou" | fn |
| 6 | AddToCart | Preencheu email+phone | "Pronto p/ converter" | em, ph, value |
| 7 | InitiateCheckout | Clicou comprar | "Decisão tomada" | value, currency |
| 8 | AddPaymentInfo | Na plataforma de checkout | "Inserindo dados" | — |
| 9 | Purchase | Compra confirmada | "Converteu" | value, currency, transaction_id |

Eventos 8 e 9 geralmente vêm da plataforma de checkout (Ticto, Hotmart, Kiwify).

## Fluxo de Trabalho
1.  **Diagnóstico (SEMPRE primeiro).** Tipo de campanha? Tem popup? Checkout
    externo? Tem formulário (popup/inline/nenhum)?
2.  **Escolha do template (A–E)** e extração de `value`/`content_name`/`content_id`.
3.  **Entrega do JSON de diagnóstico** (o motor injeta o snippet).
4.  **Validação.** Test Events: client + server com o MESMO `event_id`
    (deduplicado)? EMQ por evento ≥ 6.0 (meta ≥ 8.0)? AM populado?

## Diagnóstico FOP (5 passos — auditar pixel existente)
1. **Eventos disparando?** → Pixel Helper + Events Manager
2. **Parâmetros?** → tem value? currency? content_ids?
3. **Advanced Matching?** → EMQ acima de 6.0?
4. **Deduplicação?** → `event_id` presente? CAPI ativo casando o id do client?
5. **Hierarquia?** → forma um funil lógico ou está aleatória?

## O Segredo Técnico — disparo duplo, um evento só
Cada evento sai 2×: navegador (Pixel) e servidor (CAPI), ambos com o **mesmo
`event_id`** → o Meta entende que é o mesmo evento e não conta dobrado. Isso é o
que faz o EMQ subir.

## Parâmetros — o que enviar e o que é LIXO
**ENVIAR:** `content_name`, `content_category`, `content_type` ("product"),
`content_ids`, `value` + `currency` (em todo evento com valor), `event_id` (dedup).

**NUNCA (polui e derruba o EMQ):** `device_*`, `event_day/month/year`,
`tracked_by`, qualquer custom sem propósito claro.

**Advanced Matching (hash SHA256, normalização idêntica client↔server):** `em`
(lowercase+trim), `ph` (só dígitos, com DDI), `fn`/`ln` (lowercase, sem acento,
só a-z), `external_id`, `ct`/`st`/`zp`/`country`. `fbp`/`fbc` vão **crus**.

## Templates por Tipo de Campanha
- **A) LP com Popup** — 9 eventos: PageView → ViewContent → AddToWishlist → Lead → Contact → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase
- **B) LP sem Popup** (form inline) — 7 eventos: PageView → ViewContent → AddToWishlist → Lead → InitiateCheckout → AddPaymentInfo → Purchase
- **C) WhatsApp Direct** — 5 eventos: PageView → ViewContent → Lead (clicou WPP) → Contact → Purchase
- **D) Instagram Direct** — 4 eventos: PageView → Lead (DM) → Contact → Purchase
- **E) E-commerce** — 7+ eventos: PageView → ViewContent → AddToWishlist → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase

## Métricas Proprietárias FOP

| Métrica | Fórmula | Mede | Meta |
|---------|---------|------|------|
| **Hook Rate** | 3s views / Impressões | Criativo prende? | >30% |
| **Hold Rate** | ThruPlay / Impressões | Criativo retém? | >15% |
| **Connect Rate** | PageViews / Link Clicks | Página carrega bem? | >80% |
| **Qualify Rate** | Leads / PageViews | Página converte? | >10% |
| **Close Rate** | Purchases / Leads | Funil fecha? | >3% |

## Regras Invioláveis
1. **NUNCA** instalar sem definir a hierarquia FOP primeiro.
2. **NUNCA** enviar parâmetros-lixo (`device_*`, `event_day/month/year`, `tracked_by`).
3. **NUNCA** usar evento custom quando existe o padrão Meta equivalente.
4. **NUNCA** ativar pixel dentro do Vturb / player de vídeo.
5. **SEMPRE** `event_id` único por evento, **idêntico** no Pixel e no CAPI (dedup).
6. **SEMPRE** `value` + `currency` em todo evento com valor monetário.
7. **SEMPRE** Advanced Matching no `init` com pelo menos `em`, `ph`, `external_id`.
8. **SEMPRE** persistir em cookie + localStorage e re-hidratar o AM nos reloads.
9. **SEMPRE** hashear PII com SHA256 e normalização idêntica client/server.

---

*Framework FOP — Lúcio Artes. Validado em produção (mct.lucioartes.com + leadcerto):
Pixel+CAPI dual deduplicado, persistência 3 camadas, hidratação cross-device.
Referências completas em `agentes/tracking/reference/`.*
