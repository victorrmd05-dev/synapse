# FOP — Templates de Hierarquia por Campanha + Checklist

Cada template é um subconjunto da hierarquia de 9 eventos, escolhido pela estrutura do funil. Sempre apresentar a tabela `# | Evento | Gatilho | Parâmetros` ANTES de codar.

## A) LP com Popup (mais comum) — 9 eventos

| # | Evento | Gatilho | Parâmetros |
|---|--------|---------|------------|
| 1 | PageView | carrega | AM no init |
| 2 | ViewContent | scroll 25% / 10s | content_name, content_category |
| 3 | AddToWishlist | scroll 50% / 30s | value, currency |
| 4 | Lead | popup abre | — |
| 5 | Contact | preencheu nome | fn |
| 6 | AddToCart | email + phone | em, ph, value, currency |
| 7 | InitiateCheckout | clicou comprar | value, currency |
| 8 | AddPaymentInfo | na plataforma checkout | — |
| 9 | Purchase | compra confirmada | value, currency, transaction_id |

## B) LP sem Popup (formulário inline) — 7 eventos
PageView → ViewContent → AddToWishlist → Lead (form visível/foco) → InitiateCheckout → AddPaymentInfo → Purchase

## C) WhatsApp Direct — 5 eventos
PageView → ViewContent → Lead (clicou WPP) → Contact (respondeu) → Purchase (manual/checkout)

## D) Instagram Direct — 4 eventos
PageView → Lead (DM) → Contact (respondeu) → Purchase (manual)

## E) E-commerce — 8 eventos
PageView → ViewContent → AddToWishlist → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase (+ Search quando há busca)

---

## Checklist de Validação

### Pré-deploy
- [ ] Hierarquia FOP definida e apresentada em tabela
- [ ] AM no `fbq('init')` com pelo menos em, ph, external_id
- [ ] Cada evento gera `event_id` único, compartilhado client↔CAPI
- [ ] value + currency em todo evento com valor monetário
- [ ] Persistência cookie + localStorage configurada (visitorId + lead)
- [ ] Normalização de PII idêntica client e server (lowercase / dígitos / NFD-sem-acento)
- [ ] Nenhum parâmetro lixo (device_*, event_day/month/year, tracked_by)
- [ ] Pixel NÃO dentro de Vturb / player de vídeo
- [ ] `test_event_code` setado no server (modo teste)

### Pós-deploy (Events Manager → Test Events)
- [ ] Eventos disparam na ordem da hierarquia (Pixel Helper)
- [ ] Cada evento aparece 2× (Browser + Server) e é **deduplicado** pelo mesmo event_id
- [ ] EMQ por evento ≥ 6.0 (meta ≥ 8.0)
- [ ] AM populado (em, ph, fn, ln, geo, external_id) — verificar "Parâmetros correspondidos"
- [ ] fbp/fbc chegando crus no server
- [ ] Geo enriquecido desde o PageView (cascade body→CF→ipinfo)
- [ ] Remover `test_event_code` → produção (`--clear-test --deploy`)

### Auditoria de pixel existente (5 passos)
1. Eventos disparando? (Pixel Helper + Events Manager)
2. Parâmetros (value/currency/content_ids)?
3. AM / EMQ acima de 6.0?
4. Dedup (event_id presente, CAPI ativo casando o id)?
5. Hierarquia forma funil lógico ou está aleatória?
