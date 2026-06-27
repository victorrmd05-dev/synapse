---
name: fop-tracking
description: Use ao criar landing/página de vendas, configurar ou auditar Meta Pixel + CAPI, propor hierarquia de eventos de funil, ou subir EMQ/Event Match Quality. Implementa o Framework FOP (Funil de Otimização de Pixel) — hierarquia de até 9 eventos, Advanced Matching sem GTM, CAPI server-side com deduplicação por event_id, persistência cross-device e métricas proprietárias (Hook/Hold/Connect Rate). Padrão validado em produção (mct.lucioartes.com + leadcerto).
metadata:
  category: technique
  triggers: tracking, pixel, meta pixel, CAPI, conversions api, rastreamento, FOP, funil de eventos, EMQ, event match quality, advanced matching, pageview, viewcontent, addtocart, purchase, otimizar pixel, auditar tracking, hierarquia eventos, deduplicação, landing page, página de vendas
---

# FOP — Funil de Otimização de Pixel

Trata o Meta Pixel como um **FUNIL**, não como uma ferramenta de tracking. Cada evento é um degrau que educa o algoritmo do Meta sobre quem é o cliente ideal. Resultado: EMQ ≥ 8.0, ROAS melhor, custo por resultado menor.

> Esta skill é **self-contained** — funciona instalada em qualquer `~/.claude/skills/` sem dependências externas. Quando rodar **dentro do Mega Brain**, carregue também o agente para profundidade extra (ver [§ Modo interno](#modo-interno-mega-brain)).

## Quando Ativar
- Criar landing page / página de vendas
- Implementar ou configurar tracking/pixel
- Auditar eventos existentes (EMQ baixo, dados poluídos)
- Mencionar Meta Pixel, CAPI, EMQ, Advanced Matching, Conversions API
- Propor hierarquia de eventos para um funil

## Quando NÃO Ativar
- Discussão genérica de marketing sem componente de rastreamento
- Páginas que já têm tracking e não pedem revisão
- SEO, copy, design sem rastreamento

---

## Os 3 Pilares do FOP

**Pilar 1 — Funil Horizontal.** O caminho do lead: Anúncio → Página → Formulário → Checkout → Compra. Cada etapa tem um evento Meta correspondente.

**Pilar 2 — Funil Vertical.** Dentro de CADA etapa há micro-conversões: Impressão → Atenção (3s) → Retenção (ThruPlay) → Ação (clique). Cada micro-conversão é um sinal para o algoritmo.

**Pilar 3 — Teoria dos Alvos.** O algoritmo calibra a mira como um atirador: poucos eventos = tiro no escuro; eventos bem hierarquizados = calibragem progressiva. Quanto mais eventos QUALIFICADOS, mais precisa fica a entrega.

---

## Hierarquia de 9 Eventos (LP com Popup — template mais comum)

| # | Evento | Gatilho | Sinal | Parâmetros-chave |
|---|--------|---------|-------|------------------|
| 1 | PageView | Página carrega | "Chegou" | AM completo no `init` |
| 2 | ViewContent | Scroll 25% ou 10s | "Está lendo" | content_name, content_category |
| 3 | AddToWishlist | Scroll 50% ou 30s | "Interesse real" | value (estimado), currency |
| 4 | Lead | Popup abre | "Considerando" | — |
| 5 | Contact | Preencheu nome | "Engajou" | fn |
| 6 | AddToCart | Preencheu email+phone | "Pronto p/ converter" | em, ph |
| 7 | InitiateCheckout | Clicou comprar | "Decisão tomada" | value, currency |
| 8 | AddPaymentInfo | Na plataforma de checkout | "Inserindo dados" | — |
| 9 | Purchase | Compra confirmada | "Converteu" | value, currency, transaction_id |

Eventos 8 e 9 geralmente vêm da plataforma de checkout (Ticto, Hotmart, Kiwify). Outros funis usam subconjuntos — ver [§ Templates por campanha](#templates-por-tipo-de-campanha).

---

## Fluxo de Trabalho

### 1. Diagnóstico (SEMPRE primeiro)
- Tipo de campanha? (Site, WhatsApp Direct, Instagram Direct, Híbrido)
- Estrutura do funil? (quantas etapas, tem popup?, checkout externo?)
- Plataforma de checkout? (Ticto, Hotmart, Kiwify, custom)
- Tem formulário na página? (popup, inline, nenhum)

### 2. Proposta de Hierarquia FOP
- Selecionar template base (A–E) e adaptar ao caso
- Apresentar tabela: **# | Evento | Gatilho | Parâmetros** ANTES de codar

### 3. Implementação
- **HEAD:** `fbq('init')` com Advanced Matching → `PageView`
- **BODY:** observers/listeners por evento → `sendEvent()` com dedup + `event_id` + chamada CAPI
- **Server (CAPI):** espelha cada evento, hasheia PII (SHA256), enriquece geo por IP, hidrata lead cross-device
- Persistência 3 camadas: cookie + localStorage + banco → re-hidrata AM nos reloads
- Código de referência **validado em produção**:
  - Cliente (HEAD + BODY): [`reference/client-implementation.md`](reference/client-implementation.md)
  - Servidor (edge CAPI): [`reference/capi-edge-function.md`](reference/capi-edge-function.md)

### 4. Validação
- Pixel Helper: eventos disparam na ordem certa?
- Events Manager → Test Events: client + server chegam com o MESMO `event_id` (deduplicados)?
- EMQ por evento ≥ 6.0 (meta ≥ 8.0)?
- Ver checklist completo em [`reference/event-templates.md`](reference/event-templates.md#checklist)

---

## Diagnóstico FOP (5 Passos — para auditar pixel existente)

1. **Eventos disparando?** → Pixel Helper + Events Manager
2. **Parâmetros?** → Tem value? currency? content_ids?
3. **Advanced Matching?** → EMQ acima de 6.0?
4. **Deduplicação?** → `event_id` presente? CAPI ativo e casando o id do client?
5. **Hierarquia?** → Eventos formam funil lógico ou estão aleatórios?

---

## Parâmetros — O que enviar e o que é LIXO

**ENVIAR (obrigatório):** `content_name`, `content_category`, `content_type` (`"product"`), `content_ids`, `value` + `currency` (em todo evento com valor), `event_id` (dedup CAPI).

**NUNCA ENVIAR (polui dados):** `device_*` (o Meta já tem), `event_day`/`event_month`/`event_year` (redundante com timestamp), `tracked_by`, qualquer parâmetro custom sem propósito claro.

**Advanced Matching (hashear SHA256, normalização idêntica client↔server):** `em` (lowercase trim), `ph` (só dígitos, com DDI), `fn`/`ln` (lowercase, sem acento, só a-z), `external_id`, `ct`/`st`/`zp`/`country`. `fbp`/`fbc` vão **crus** (não hashear).

---

## Métricas Proprietárias FOP

| Métrica | Fórmula | O que mede | Meta |
|---------|---------|-----------|------|
| **Hook Rate** | 3s views / Impressões | Criativo prende atenção? | >30% |
| **Hold Rate** | ThruPlay / Impressões | Criativo retém? | >15% |
| **Connect Rate** | PageViews / Link Clicks | Página carrega bem? | >80% |
| **Qualify Rate** | Leads / PageViews | Página converte? | >10% |
| **Close Rate** | Purchases / Leads | Funil fecha? | >3% |

---

## Regras Invioláveis

1. **NUNCA** implementar tracking sem definir a hierarquia FOP primeiro
2. **NUNCA** enviar parâmetros lixo (`device_*`, `event_day/month/year`, `tracked_by`)
3. **NUNCA** usar evento personalizado quando existe padrão Meta equivalente
4. **NUNCA** ativar pixel dentro do Vturb / player de vídeo
5. **SEMPRE** `event_id` único por evento, **idêntico** no Pixel client e no CAPI server (deduplicação)
6. **SEMPRE** `value` + `currency` em todo evento com valor monetário
7. **SEMPRE** Advanced Matching no `fbq('init')` com pelo menos `em`, `ph`, `external_id`
8. **SEMPRE** persistir dados em cookie + localStorage (dual) e re-hidratar o AM nos reloads
9. **SEMPRE** hashear PII com SHA256 e normalização idêntica client/server (senão o hash não casa e o AM é descartado)

---

## Templates por Tipo de Campanha

- **A) LP com Popup** (mais comum) — 9 eventos: PageView → ViewContent → AddToWishlist → Lead → Contact → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase
- **B) LP sem Popup** (form inline) — 7 eventos: PageView → ViewContent → AddToWishlist → Lead → InitiateCheckout → AddPaymentInfo → Purchase
- **C) WhatsApp Direct** — 5 eventos: PageView → ViewContent → Lead (clicou WPP) → Contact (respondeu) → Purchase (manual)
- **D) Instagram Direct** — 4 eventos: PageView → Lead (DM) → Contact (respondeu) → Purchase (manual)
- **E) E-commerce** — 8 eventos: PageView → ViewContent → AddToWishlist → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase + Search

Detalhamento de gatilhos e parâmetros por template: [`reference/event-templates.md`](reference/event-templates.md).

---

---

*Framework FOP (Funil de Otimização de Pixel) — Lucio Artes. Validado em produção: mct.lucioartes.com + leadcerto (pixel dedicado, Pixel+CAPI dual deduplicado, persistência 3 camadas, hidratação cross-device).*
