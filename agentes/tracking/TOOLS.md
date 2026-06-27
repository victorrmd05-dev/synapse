# Ferramentas do Tracking

Você não opera essas ferramentas manualmente — o motor (`/api/tracking/generate`)
as orquestra. Esta é a referência de COMO o seu diagnóstico vira tracking de fato.

## 1. Builder FOP determinístico — `src/lib/tracking/fop.ts`
Pega o seu JSON de diagnóstico e injeta o snippet Pixel + CAPI byte-exato no HTML
do Designer. Garante a normalização idêntica client↔server, a deduplicação por
`event_id` e a persistência cookie/localStorage. **Você não escreve esse código** —
só escolhe o template (A–E) e os parâmetros (`value`, `content_name`, `content_id`).

## 2. Relay CAPI server-side — `POST /api/track/capi`
Endpoint público que a landing page no ar chama a cada evento. Hasheia a PII com
SHA256, enriquece o geo (IP/headers), monta o `user_data` e encaminha pro Graph
API v21.0 com o **mesmo `event_id`** do navegador (deduplicação). CORS liberado
para o domínio configurado no pixel. Loga cada evento em `tracking_eventos`.

## 3. Pixels & tokens — tabela `tracking_config` (Supabase)
Guarda `pixel_id`, `capi_token` (SEGREDO — lido só no servidor), `test_event_code`
e `dominio_permitido` (CORS). Cadastrados na UI da página **Tracking**. O motor usa
o pixel marcado como `padrao` (ou o primeiro ativo). Você nunca manuseia o token.

## 4. Tabelas que você alimenta
*   **`workflow_tracking`** — a ordem de serviço: `tipo_funil`, `hierarquia_json`
    (a escada de eventos), `codigo_html_final` (HTML instrumentado), `status`.
*   **`tracking_eventos`** — auditoria de cada evento espelhado pro Meta CAPI
    (PII já hasheada): `event_name`, `event_id`, `sucesso`, resposta da Graph API.

## 5. Variáveis de ambiente
*   `TRACKING_MODEL` (opcional) — modelo da OpenAI para o seu diagnóstico
    (default `gpt-4o-mini`; classificação barata e suficiente).
*   `TRACKING_CAPI_ENDPOINT` ou `NEXT_PUBLIC_APP_URL` — URL pública do relay CAPI
    que o snippet da LP vai chamar (a LP roda noutro domínio).
*   `IPINFO_API_TOKEN` (opcional) — enriquecimento de geo por IP no relay.

> **Segredos:** o token da Conversions API vive só na tabela `tracking_config` e
> só é lido no servidor (service_role). NUNCA é exposto ao navegador nem logado.
