# 📝 Notas do Projeto — Alavanca Synapse
> Diário de bordo do projeto. **Sempre atualizar este arquivo após validar cada tarefa**
> (e replicar no segundo cérebro: `02_Projetos/Alavanca_Synapse.md` no vault Obsidian/nexus.ai).
> Última atualização: 2026-06-28 — **Tracking (FOP) VALIDADO ponta a ponta** (LP no ar disparando Pixel + CAPI, eventos deduplicados no Events Manager). Relay migrado para **Supabase Edge Function** (`track-capi`), deploy passou a publicar a versão com FOP, botão **Republicar** em /design e **Remover tracking** em /tracking. Antes: Token Meta (System User) validado, deploy de LPs no Cloudflare Pages, motor do Designer, correção de corrida no Revisor.

---

## 🎯 Intenção do Projeto
**Alavanca Synapse** é a plataforma própria de orquestração de agentes da Alavanca AI
(agência de marketing digital). Em vez do Paperclip (engessado), 8 agentes especializados
operam em sincronia através do Supabase como "sinapse central". O objetivo prático do
Fernando: montar uma **agência de marketing digital operada por IA**, onde a esteira
pega um anúncio vencedor e produz a campanha inteira com mínima intervenção manual.

### Os 8 Agentes
CEO · CTO · **Minerador** · Copywriting · Revisor · Designer-Webmaster · Video-Maker · Gestor-Meta-Ads

---

## 🧠 Conceito-chave: Cérebro vs Mãos
Neste app, um "agente" são **duas coisas separadas** (diferente do Paperclip, onde o agente
rodava scripts sozinho num terminal):

- **🧠 Cérebro** = `AGENTS.md` + `SKILL.md` por agente → viram o *system prompt* da IA.
  Devem ser **réguas de decisão** (critérios, rubrica de pontuação, formato JSON de saída),
  **NÃO** tutoriais mandando "rodar script python" (erro herdado dos .md antigos).
- **✋ Mãos** = rotas TypeScript em `src/app/api/...` que fazem as chamadas externas reais
  (ScrapeCreators, etc.) e gravam no Supabase. A IA **não executa ferramentas** — ela só
  avalia/gera e devolve JSON; a rota faz o resto.

### Loop de autoria local dos agentes (criado em 25/06/2026)
Invertemos a fonte da verdade: antes era o repo GitHub `victorrmd05-dev/agents` + `/api/agents/sync`.
**Agora editamos local e damos push.**
```
agentes/<slug>/AGENTS.md, SKILL.md, ...   ← arquivos editáveis, um por agente
npm run agents:pull    # Supabase (agentes_config) → arquivos locais
npm run agents:push [slug]   # arquivos locais → Supabase (vale na hora p/ a IA e o dashboard)
```
Scripts: `scripts/agents-pull.mjs`, `scripts/agents-push.mjs`, `scripts/_env.mjs`.

---

## 🏗️ Stack
- **Framework:** Next.js 14 App Router + TypeScript strict (pacote ainda se chama `metascale-app`)
- **Estilo:** Tailwind CSS — dark glassmorphism
- **Banco:** Supabase (PostgreSQL + Realtime `postgres_changes`)
- **IA (agentes):** em migração de provider:
  - **Copywriting + Revisor → OpenAI oficial** (`gpt-4o-mini`) via `src/lib/openai.ts`
    (client + `chatComRetry` compartilhados). Chave `OPENAI_API_KEY`, modelo configurável
    por `OPENAI_MODEL`. Usa `response_format: { type: 'json_object' }` → JSON sempre válido.
  - **Mineração ainda em OpenCode Zen** → `deepseek-v4-flash-free` via SDK `openai`
    apontando para `https://opencode.ai/zen/v1` (chave `OPENCODE_API_KEY`).
    ⚠️ **É modelo de raciocínio**: gasta tokens em `reasoning_content` antes do `content`.
    `max_tokens` baixo → resposta vazia silenciosa. Usar `max_tokens >= ~3000` (mineração está em 3000).
- **IA (diagnóstico Meta Ads):** Anthropic `claude-3-5-sonnet` em `src/lib/anthropic.ts`
- **Dois clients Supabase:** `src/lib/supabase.ts` (anon, browser, respeita RLS) vs
  `src/lib/supabase-server.ts` (service_role, server-only, ignora RLS). Nunca trocar.

---

## ✅ Minerador — CONSTRUÍDO E VALIDADO (25/06/2026)
Primeiro agente 100% funcional, do zero à mineração real.

- **Cérebro:** `agentes/minerador/AGENTS.md` + `SKILL.md` reescritos como régua de decisão.
  Rubrica de score 0–100 (longevidade 30 · loja real/Shopify 15 · clareza 20 · mecanismo 15
  · gatilhos 10 · variações 10) com **corte em 50** (calibrado após testes — 70 e 60 eram altos demais).
- **Mãos:** `src/app/api/mineracao/run/route.ts` — busca na ScrapeCreators (Meta Ad Library),
  passa cada anúncio pela IA, salva validados em `ads_minerados`.
  - Sinal-chave de dropshipping: URL de destino com `/product` ou `/products/` = loja Shopify.
  - **Lista negra:** `src/lib/minerador-blacklist.ts` — bloqueia marketplaces/gateways/SaaS
    (Mercado Pago, Mercado Livre, Shopee, AliExpress, InfinitePay, iHerb, WhatChimp...) **antes**
    da IA (economiza crédito). Fácil de aumentar: adicionar linha em minúsculo.
  - Fallback heurístico se a IA falhar → mineração nunca volta vazia.
- **Botão na UI:** `/mineracao` agora tem campo de keyword + "Minerar com IA" (`apenas_validados: true`,
  só salva o que a IA aprova; mostra status com contagem de bloqueados/validados).
- **Validação real:** keyword "Pague 1 Leve 2" → 12 avaliados, 0 lista negra, **9 ofertas reais
  validadas** (Gocase, Aversion Outfits, Via Uno; scores 64–88). Keyword "50% off" / "Frete Grátis"
  trazem marca grande (ordenado por impressões) → a lista negra corta. **A keyword é o volante.**
- Lista de keywords de estudo: `palavras_chave_dropshipping_brasil.md`.

---

## 🖥️ UX da página `/mineracao` — análise da IA + curadoria por favoritos (25/06/2026)
Refino de usabilidade no painel de mineração (`src/app/mineracao/page.tsx`), tornando-o
uma tela real de decisão do administrador.

- **Análise da IA visível no card:** o modal do anúncio agora exibe seção "Análise da IA"
  com `score_escala` (badge colorido: verde ≥70, amarelo ≥50, vermelho abaixo), `categoria_ia`
  (nicho) e `notas_ia` (motivo/veredito). **Bug corrigido:** os dados já eram gravados pela
  rota de mineração, mas o `fetchProdutos` só mapeava o `score` — `categoria_ia`/`notas_ia`
  ficavam de fora do objeto, então o modal nunca tinha o que mostrar. Vale para anúncios antigos também.
- **Favoritos (curadoria):** nova coluna `favorito BOOLEAN DEFAULT false` em `ads_minerados`
  (migration `20260625130000_add_favorito_to_ads_minerados.sql` + índice). Coração no card e
  no header do modal, com **atualização otimista** (reverte se o `UPDATE` falhar).
- **Filtro "Só favoritos"** com contador + botão **"Excluir não favoritados"** que apaga
  PERMANENTEMENTE do banco (`DELETE WHERE favorito = false`) com confirmação. Fluxo: favoritar
  os bons → filtrar → limpar o resto de uma vez.
- RLS já tinha policy pública de UPDATE/DELETE (`USING(true)`), então favoritar/excluir pelo
  client anon funciona sem ajuste (mesma dívida de segurança do resto do app — ver abaixo).

---

## 🎬 Mineração — vídeos, campos ricos e seletor de país (25/06/2026)
A mineração antiga **só trazia imagem, nunca vídeo** — fatal pra dropshipping, onde a maioria
das ofertas é vídeo (fator "uau").

- **Causa raiz:** `route.ts` calculava `temVideo` mas **nunca salvava as URLs**. Não havia
  `video_urls` no insert; e pra anúncios de vídeo o `image_url` (lido só de `snap.images[0]`)
  vinha `null` → card "cego". Os vídeos sempre estiveram no `raw_json` da ScrapeCreators
  (`snapshot.videos[].video_hd_url/video_sd_url/video_preview_image_url`).
- **Correção (`src/app/api/mineracao/run/route.ts`):** extrai `video_urls` de
  `snapshot.videos` + `extra_videos`, usa o frame de preview como imagem de fallback, e
  passou a salvar os campos ricos que a tabela já tinha vazios: `page_profile_pic_url`
  (por isso os perfis apareciam vazios!), `caption`, `link_description`, `cta_type`,
  `display_format`, `extra_image_urls`, `cards_json`, `page_like_count`, `page_categories`.
- **Backfill:** anúncios já minerados foram corrigidos pelo próprio `raw_json` (10 ganharam vídeo).
  Frontend (`mineracao/page.tsx`) também caiu num fallback que extrai o vídeo do `raw_json`
  se a coluna `video_urls` estiver vazia.
- **Seletor de país:** dropdown na tela de mineração (BR, US, GB, PT, ES, IT, DE, FR, CA, AU, MX).
  O backend já aceitava `country`; só faltava na UI. Estratégia: garimpar oferta validada na
  gringa (keyword no idioma local) e trazer pro Brasil.

## 🧬 Mineração — dedup de DUPLICATA REAL por criativo (25/06/2026)
Apareciam anúncios repetidos do mesmo criativo (mesmo vídeo) com `ad_archive_id` diferente,
às vezes em páginas diferentes da mesma marca (ex: Gocase Acessórios/Brasil/Vibes, mesmo vídeo).

- **Assinatura estável:** coluna `creative_hash` = `v:`/`i:` + **path do arquivo** no FB CDN
  (ignora a querystring assinada que muda toda hora). Migration
  `20260625140000_add_creative_hash_to_ads_minerados.sql` (+ índice).
- **Na rota:** helper `creativeKeyFromSnap()`; antes da IA (economiza crédito) pula se o criativo
  já existe no banco ou no lote. Mantém vários anúncios por anunciante — só descarta criativo idêntico.
- **Limpeza:** backfill do `creative_hash` + remoção de 3 duplicatas da Gocase (mantido o melhor:
  favorito → maior score → mais antigo). Decisão do Fernando: "remover só duplicata real".

## 🤖 Agents Config — unificada no que a IA usa + editável (25/06/2026)
A página `/agents` lia da tabela `agent_files` (Sistema B), que estava pela metade e **sem nenhum
SKILL.md**. O conteúdo completo vivia em `agentes_config` (Sistema A, o que a IA consome) e na
pasta local `agentes/`. Decisão do Fernando: **unificar em `agentes_config`**, fonte = pasta local.

- **Server actions** `src/app/actions/syncAgents.ts` (+ tipos em `agentTypes.ts`):
  `getAgentesConfig()`, `syncAgentsFromFolder()` (lê `agentes/<slug>/*.md` + `_agente.json` →
  upsert), `saveAgentMarkdown()` (grava no banco **e espelha no `.md` local**), `setAgenteAtivo()`.
- **Página reescrita** (`src/app/agents/page.tsx`): lê/edita `agentes_config` (o que você vê =
  o que a IA recebe). Mostra os 8 agentes na ordem do pipeline (CEO→CTO→Minerador→Copy→Revisor→
  Designer→Video→Gestor), com toggle ativo, abas SOUL/AGENTS/TOOLS/SKILL/HEARTBEAT.
  - **AGENTS.md e SKILL.md obrigatórios** (sempre visíveis, marcados com `*`); SOUL/TOOLS/HEARTBEAT
    são opcionais, adicionados sob demanda no botão **"+"** (cada um = um slot fixo do system prompt;
    não há `.md` de nome livre).
  - **Link "Abrir [página]"** por agente → tela do dashboard correspondente (minerador→/mineracao,
    copy→/copywriting, etc.). CEO/CTO mostram "sem página no dashboard" (são camada humana/infra).
- **Layout** `src/app/agents/layout.tsx` virou passthrough (antes criava uma 2ª sidebar duplicada).
- ⚠️ **Código órfão do Sistema B** (subpáginas `/agents/[agentRole]/*`, `FileEditor`,
  `ConfigurationForm`, actions `agentFiles.ts`/`agentConfig.ts`) ficou sem uso — candidato a remoção.
- ⚠️ **`npm run build` quebra por lint PRÉ-EXISTENTE** em vários arquivos (video-maker, meta-api,
  Sidebar, TipTap...). `next.config.mjs` não ignora lint. `tsc --noEmit` e `dev` funcionam.
  Decidir depois: `eslint.ignoreDuringBuilds` ou limpar a dívida.
- ⚠️ **Não rodar `npm run build` com `npm run dev` ativo** — disputam o `.next` e a tela fica
  branca/sem estilo (aconteceu). Validar com `tsc --noEmit` + `next lint`; build só com dev parado.

## 🗄️ Camada de dados — RLS corrigido (25/06/2026)
**Causa raiz do "nada aparece no painel":** 6 tabelas do pipeline tinham RLS **ligado e ZERO
policies** → a `anon key` do browser lia 0 linhas (default deny), mesmo com dados inseridos pela
`service_role`. O frontend inteiro estava cego.
- Migration `20260625120000_add_public_rls_policies_pipeline_tables.sql` — policies públicas
  (SELECT/INSERT/UPDATE/DELETE `USING(true)`) em ads_minerados, campanhas_producao, workflow_*.
- Migration `20260625120100_enable_realtime_pipeline_tables.sql` — Realtime ligado (estava off).
- ⚠️ **Dívida de segurança:** policies abertas porque o app ainda não tem login. Quando entrar
  auth, trocar `USING(true)` por checagem real.

---

## ✍️ Copywriting — migrado para OpenAI oficial (26/06/2026)
A rota `src/app/api/copywriting/generate/route.ts` rodava no **OpenCode Zen**
(`deepseek-v4-flash-free`), que dava **500 intermitente** (~1 em 4) em prompts grandes.
Decisão do Fernando: migrar para a **API oficial da OpenAI**.

- **Lib compartilhada nova** `src/lib/openai.ts`: client único + `chatComRetry` (backoff em
  429/5xx). Reusada por copywriting e revisor. Chave `OPENAI_API_KEY`, modelo `OPENAI_MODEL`
  (default `gpt-4o-mini`). `.env.local` ganhou `OPENAI_API_KEY` e `OPENAI_MODEL`.
- **`response_format: { type: 'json_object' }`** → a OpenAI sempre devolve JSON válido, então
  o parse de `meta_ads_copy` / `pagina_vendas` ficou confiável (não depende mais de regex torto).
- **Validado:** chave testada direto na API + geração de copy ponta a ponta pelo painel.

## ✅ Revisor — CONSTRUÍDO E VALIDADO (26/06/2026)
Segundo agente 100% funcional. Fecha o elo Copywriter → **IA revisora** → decisão humana → Design.

- **Bug raiz corrigido:** a copy gerada nascia com `revisor_ok=false`, mas a página `/revisor`
  só listava itens com `revisor_ok=true` → **a copy nunca aparecia na fila de revisão**. O fluxo
  agora é dirigido por um **campo `status`** (estado-máquina), não pelo `revisor_ok` invertido.
- **Migration `20260626120000_add_revisao_ia_to_workflow_copywriting.sql`:** adiciona em
  `workflow_copywriting`:
  - `status`: `gerando` → `aguardando_revisao_ia` → `revisado_ia` → `aprovado` / `rejeitado` (/ `erro`)
  - `revisao_ia_score` (0–100) e `revisao_ia_parecer` (texto do parecer da IA).
- **Mãos — rota nova** `src/app/api/revisor/review/route.ts`: usa o agente `revisor` sincronizado
  + a **mesma chave OpenAI** (`gpt-4o-mini`). Recebe `copy_id`, monta contexto (copy + produto
  minerado), pede JSON `{ score, aprovacao_sugerida, pontos_fortes[], pontos_fracos[], recomendacao }`,
  salva parecer e move para `revisado_ia`.
- **UI `/revisor` reescrita** (`src/app/revisor/page.tsx`):
  - Fila puxa por `status in ('aguardando_revisao_ia','revisado_ia')` com `data_aprovacao IS NULL`.
  - **IA revisora dispara sozinha** ao item entrar na fila (badge "IA analisando…"), via `useRef`
    de ids já disparados (não chama 2x). Resultado chega por Realtime.
  - Sidebar mostra **score + parecer real da IA**.
  - **Aprovar** → `revisor_ok=true`, `status=aprovado`, `data_aprovacao=now`, insere em
    `workflow_design` e marca `campanhas_producao.status_geral='Aprovado'`.
  - **Rejeitar** → campo de feedback obrigatório; marca a versão como `rejeitado` (mantém histórico)
    e chama `/api/copywriting/generate` com `notas_revisao` → **Copywriter regera** e a nova versão
    volta para a IA revisora. Decisão do Fernando: manter a versão rejeitada no histórico.
- **Validado:** fluxo testado pelo painel (aprovar e rejeitar) — funcionando ponta a ponta.

## 🎨 Design/Webmaster — badge "Rascunho" corrigido (26/06/2026)
Card na fila do `/design` mostrava **"RASCUNHO"** para copy já aprovada pelo Revisor.

- **Causa raiz:** a tabela `workflow_design` **não tem coluna `status`**; o badge usava
  `lp.status || 'RASCUNHO'` → caía sempre no fallback.
- **Correção (sem schema):** helper `getDesignStatus(lp)` em `src/app/design/page.tsx` **deriva o
  rótulo das colunas reais** (nunca desincroniza): sem `codigo_html` → **Aguardando Design**;
  com HTML → **Pronta p/ Revisão**; `data_aprovacao` → **Aprovada p/ Tráfego**; `url_recurso` →
  **No Ar**.

## 🎨 Designer-Webmaster — MOTOR CONSTRUÍDO (26/06/2026)
Terceiro agente com mãos. Gera a landing page de verdade, com controle manual de fila.

- **Ferramentas de design instaladas:** 2 repos clonados em
  `agentes/designer-webmaster/references/` — **`awesome-design-md`** (74 marcas de luxo, cada
  `DESIGN.md` com tokens reais; **versionado**) e **`ui-ux-pro-max-skill`** (ferramenta dev,
  **gitignored**). MCP **Magic (21st.dev)** adicionado ao config de usuário do Claude Code (dev-time).
- **Motor de injeção dinâmica de marca** (`src/lib/design/brandReferences.ts`): detecta o nicho do
  produto → escolhe a marca-referência (estética→Apple, fitness→Nike, luxo/auto→Ferrari,
  cripto/gaming→Lamborghini, e-commerce→Shopify… fallback Apple) → **injeta o `DESIGN.md` real**
  no prompt. Cada página nasce ancorada num sistema de luxo, não em "AI slop". `next.config.mjs`
  empacota os `DESIGN.md` no bundle (`outputFileTracingIncludes`, sob `experimental` no Next 14).
- **Mãos — rota nova** `src/app/api/design/generate/route.ts`: copy aprovada (conteúdo) + produto
  minerado (nicho + **imagens reais**: `image_url`/`extra_image_urls`…) + **Firecrawl** (estrutura
  da LP do concorrente via `link_url` + mais imagens) + marca injetada → gera HTML completo
  (Tailwind CDN, mobile-first, SVG inline). Salva em `workflow_design.codigo_html` **e em disco**
  (`lps/<projeto>-<id>.html`, gitignored) como rede de segurança pra edição manual.
- **Firecrawl** (`src/lib/firecrawl.ts`): scraping best-effort (no-op sem chave). Chave
  `FIRECRAWL_API_KEY` no `.env.local`. Serve pro Designer **entender a página que está remodelando**.
- **Provider do desenho configurável** (`DESIGN_PROVIDER` no `.env.local`): **`openai`** (default,
  `gpt-4o` COMPLETO — não o mini) ou **`anthropic`** (Claude, melhor em frontend).
  ⚠️ **Claude bloqueado por ora:** conta Anthropic **sem créditos** ("credit balance too low").
  Por isso o default caiu no `gpt-4o`. Trocar pra `anthropic` quando houver saldo.
- **Botão "play" na fila** (`src/app/design/page.tsx`): geração **manual, uma de cada vez** — o
  Fernando segura a fila no ponto de criação da página e escolhe qual produto vira a 1ª oferta.
  Play por card + CTA grande no preview; estado "Gerando…" local; preview renderiza via Realtime.
- **Cérebro atualizado:** `AGENTS.md` + `SKILL.md` (Seção 0/0.1) documentam como usar os blocos
  injetados (marca, estrutura do concorrente, imagens reais; nunca inventar URL de imagem).
- **Validação:** página gerada ponta a ponta pelo painel (gpt-4o). **Qualidade ainda mediana** —
  o salto real virá com o Claude (crédito) e/ou refino de prompt. Mecânica do fluxo: OK.

## 🔁 Revisor — correção de corrida (26/06/2026)
Bug encontrado ao ligar o motor do Designer: uma copy **aprovada** estava com `status='revisado_ia'`
(em vez de `aprovado`), embora `revisor_ok=true` e `data_aprovacao` preenchidos.
- **Causa raiz (corrida):** a IA revisora é lenta (~10s). Se o humano aprova **antes** dela terminar,
  o `UPDATE status='revisado_ia'` da revisão **sobrescreve** a aprovação.
- **Correção 1 — `/api/revisor/review`:** o update do parecer agora é **guardado** por
  `.eq('status','aguardando_revisao_ia')` (+ `maybeSingle`); se a copy já saiu da fila, o parecer é
  **descartado** (não sobrescreve decisão tomada).
- **Correção 2 — `/api/design/generate`:** busca a copy aprovada por **`revisor_ok=true` +
  `data_aprovacao IS NOT NULL`** (sinal real), não por `status='aprovado'` — imune à corrida.
- Registro travado realinhado no banco (`status='aprovado'`).

---

## 📡 Tracking — NOVO AGENTE (FOP: Pixel + CAPI) — CONSTRUÍDO (26/06/2026)
9º agente da esteira, logo **depois do Designer**: instala a camada de rastreamento
**FOP (Funil de Otimização de Pixel)** nas landing pages e espelha os eventos pro Meta.
Base: a skill "fop-tracking" (Lúcio Artes) em `fop-tracking/` — copiada e adaptada.

**Pipeline:** `workflow_design.codigo_html` → [Tracking instala FOP] → `workflow_tracking`
→ a LP no ar dispara eventos → `/api/track/capi` espelha pro Meta (deduplicado) → `tracking_eventos`.

**Decisão de arquitetura (híbrida):** a IA decide só a INTELIGÊNCIA (qual template de funil
A–E, `value`, `content_name`) e devolve **JSON**; um **builder determinístico**
(`src/lib/tracking/fop.ts`) injeta o snippet Pixel+CAPI **byte-exato**. Motivo: dedup por
`event_id` e normalização de PII (SHA256) têm que ser idênticos client↔server — não podem
ser "alucinados" pela LLM, senão o hash não casa e o EMQ despenca.

**O que foi construído:**
- **Cérebro:** `agentes/tracking/` (`AGENTS.md`, `SKILL.md` port do FOP, `TOOLS.md`, `_agente.json`)
  + as 3 referências técnicas em `reference/`. Vira o 9º registro em `agentes_config` ao sincronizar.
- **Banco** (migration `20260626140000`, ✅ aplicada via MCP):
  - `tracking_config` — Pixels + **token da Conversions API** (SEGREDO: RLS sem policy pública;
    só o servidor lê via service_role; a UI recebe a lista sem o token via server action).
  - `workflow_tracking` — ordem de serviço (tipo_funil, hierarquia_json, codigo_html_final, status).
  - `tracking_eventos` — auditoria de cada evento CAPI (PII já hasheada). Ambas com realtime.
- **Motor:**
  - `src/lib/tracking/fop.ts` — normalização espelho client↔server, templates A–E, builder do snippet.
    ⚠️ **Armadilha resolvida:** escape de regex no JS gerado. Regex *literal* (`/\D/`, `/[̀-ͯ]/`)
    precisa de `\\` no fonte TS; regex via *string* `.match('\\\\s*')` precisa de `\\\\`. O `tsc` NÃO
    pega isso (é runtime no HTML). Validei transpilando e dando `new Function()` no snippet (JS válido).
  - `/api/track/capi` — relay server-side (hash SHA256, Graph v21.0, mesmo `event_id`, CORS+OPTIONS,
    log best-effort; sempre devolve 200 pra não derrubar a LP).
  - `/api/tracking/generate` — diagnóstico do funil (OpenAI `gpt-4o-mini` via `TRACKING_MODEL`) →
    injeção FOP → salva em `workflow_tracking` + disco `lps/*-tracked.html`.
  - `src/app/actions/tracking.ts` — CRUD de pixels (token nunca vai ao browser).
- **UI:** `/tracking` (fila com **botão play por página**, painel Pixels & Tokens, escada de eventos,
  log CAPI ao vivo, checklist EMQ) + aba **Tracking** no Sidebar (ícone Radar) + registrado em `/agents`.

**Pixels/token:** ficam no banco (`tracking_config`), cadastrados pela própria UI — não no `.env`.
**`.env.local`:** só `NEXT_PUBLIC_APP_URL`/`TRACKING_CAPI_ENDPOINT` (URL pública do relay pra LP no ar
alcançar), `TRACKING_MODEL` e `IPINFO_API_TOKEN` (todos opcionais).

**Validação:** compila com sucesso (tipos/SSR OK); ESLint limpo nos arquivos novos; snippet gerado
testado como JS válido. **Falta o teste ponta a ponta do Fernando** (sincronizar agente → cadastrar
pixel+token → play → ver eventos no Events Manager).

**Caveat de produção:** o snippet chama o relay por URL absoluta. Em dev usa a origem da request;
publicado, setar `NEXT_PUBLIC_APP_URL`. Pra produção robusta, considerar migrar o relay pra Supabase
Edge Function (o código da referência já é Deno/edge).

---

## 🚀 Designer — DEPLOY no Cloudflare Pages VALIDADO (26/06/2026)
Fechado o gap crítico do Designer: a LP gerada agora **vai pro ar de verdade** num clique.

- **Validação manual primeiro:** provei o fluxo Wrangler ponta a ponta com o token atual antes
  de codar. `npx wrangler whoami` (token OK, conta `victor.rmd.05`), `pages project create` +
  `pages deploy` de uma LP real (`lps/campanha-sale-ends-today-…html`) → no ar em
  `https://alavanca-lp-test.pages.dev` (HTTP 200, bytes batendo). Projeto de teste deixado no ar.
- **Helper novo** `src/lib/cloudflare.ts`: `deployHtmlToPages({slug, html})` — escreve o HTML como
  `index.html` num dir temp, roda `wrangler pages project create` (idempotente, tolera "já existe")
  + `pages deploy`, devolve `https://<slug>.pages.dev`. **Segurança:** HTML vai por ARQUIVO, nunca
  por argumento; só o slug (sanitizado `[a-z0-9-]`) entra na linha de comando. `slugify()` exportado.
- **Mãos — rota nova** `src/app/api/deploy/route.ts` (`POST {design_id}`): exige `codigo_html`,
  deriva o slug de `campanhas_producao.nome_projeto` + sufixo do id, publica via Wrangler e salva
  `url_recurso` + `data_aprovacao` → status na UI vira **"No Ar"** automático. `maxDuration=120`.
- **Botão ligado** (`src/app/design/page.tsx`): "Aprovar para Tráfego" (decorativo, sem onClick)
  virou **"Aprovar e Publicar"** com `publicarPagina()` real, spinner "Publicando…", desabilitado
  sem HTML. Já publicado → vira link verde **"No Ar — Abrir Página"** (`url_recurso`).
- **Dependência:** `wrangler@4` adicionado como **devDependency** (rota não depende de `npx` baixar
  em runtime). Requer `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (já no `.env.local`).
- **Validação:** mecanismo Wrangler validado de verdade; `tsc --noEmit` limpo nos arquivos novos.
  **Falta o teste pela própria UI** com um `design_id` real (clicar "Aprovar e Publicar" no painel).
- **Nota:** o CLAUDE.md sugeria GitHub Pages como fallback confiável — não foi preciso, o Cloudflare
  funcionou de primeira com o token atual. Fallback fica como ideia futura se a Cloudflare oscilar.

---

## 🔑 Meta Ads — credencial System User VALIDADA (27/06/2026)
Base de credencial pro futuro agente **Gestor-Meta-Ads** (puxar dados reais, otimizar, escalar).

- **Decisão de arquitetura:** o app NÃO usa Login OAuth do Facebook (que exige callback URL com
  HTTPS — o que estava travando o Fernando por causa de SSL em `http://localhost`). Pra backend/
  automação o caminho certo é **token de Usuário do Sistema (System User)**, gerado direto no
  Business Settings: **não expira, sem callback, sem tela de consentimento**. Eliminou o problema
  do SSL por completo. (OAuth/redirect só seria necessário pra logar usuários externos — não é o caso.)
- **`.env.local` (`FACEBOOK CONFIGURATION`):** `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`
  (System User), `META_AD_ACCOUNT_ID`. **Dois ajustes feitos:** (1) `META_AD_ACCOUNT_ID` estava
  `act=...` → corrigido pra **`act_...`** (com `=` toda chamada Graph falharia com URL malformada);
  (2) removida a linha morta `NEXT_PUBLIC_META_REDIRECT_URI` (não há mais OAuth).
- **Validação real (script Python ad-hoc lendo o token do `.env.local`, sem hardcode):**
  - `debug_token`: **`is_valid: true`**, **tipo `SYSTEM_USER`**, **`expires_at: 0` (NUNCA)**.
  - Escopos: `ads_management, ads_read, business_management, pages_read_engagement,
    pages_manage_ads, public_profile` → cobre gestão de campanha **e** ações de Página (CAPI/criativo).
  - Conta `act_814261946562792`: ATIVA, moeda **BRL**. **Leitura OK** — 5 campanhas (todas `PAUSED`,
    posts de Instagram impulsionados). Insights 30d "sem dados" (esperado: tudo pausado).
  - **Escrita OK (teste reversível):** renomeou uma campanha → `success:true` → reverteu pro nome
    original → `success:true`. Prova que `ads_management` escreve de fato. Nada ficou alterado.
- **Pendente:** o agente **Gestor-Meta-Ads ainda não tem rota** (`/api/...`) nem lib de gestão.
  `src/lib/meta-api.ts` tem helpers (fetchCampaigns/createCampaign/AdSet/Creative/Ad) mas
  `fetchMetaMetrics()` ainda devolve **mock** — trocar por insights reais quando construir o agente.

---

## 🩹 Tracking — agente faltava na `agentes_config` (27/06/2026)
Ao dar **play** numa página em `/tracking`, erro: *"Agente 'tracking' não encontrado ou inativo.
Rode a sincronização em /agents…"*.

- **Causa raiz:** o agente Tracking foi **construído** (Sessão 7, pasta `agentes/tracking/` completa:
  `AGENTS.md`, `SKILL.md`, `TOOLS.md`, `_agente.json` com `slug:"tracking"`, `ativo:true`), mas a
  tabela `agentes_config` (o que a IA consome) só tinha os **8 agentes antigos** — o único sync
  registrado rodou **26/06 01:41**, *antes* do Tracking existir. A rota `/api/tracking/generate`
  chama `getAgentConfig('tracking')` e não achava o registro. **Nada quebrado no código** —
  só faltou rodar a sincronização da pasta.
- **Correção:** `/agents` → **"Sincronizar da pasta agentes/"** (`syncAgentsFromFolder()` lê todas
  as subpastas de `agentes/` dinamicamente e faz upsert) → **9 agentes sincronizados**, Tracking
  entra ativo. Play parou de dar erro.
- **Validação:** **visual OK** (agente aparece, play não erra mais). **Teste real do FOP ainda
  pendente** — depende da página estar **publicada** (LP no ar disparando eventos → ver dedup no
  Events Manager + EMQ). Combinado com o Fernando pra depois.
- **Aprendizado:** ao criar um agente novo, **rodar o sync** (ou ele não existe pra IA, só no disco).

---

## 📡 Tracking (FOP) — VALIDADO PONTA A PONTA + relay migrado p/ Edge Function (28/06/2026)
Teste real do Fernando: LP publicada no Cloudflare disparando eventos, **dedup confirmada no
Events Manager** (ViewContent, AddToWishlist, InitiateCheckout vindo 2× — Navegador + Servidor —
com mesmo `event_id`). `tracking_eventos`: **todos `sucesso=true`, zero falha**.

**Por que não funcionava antes (cadeia de bugs, todos resolvidos):**
1. **Relay apontava pra `localhost`.** `resolveCapiEndpoint` caía no fallback `new URL(request.url).origin`
   (= localhost:3000) porque `TRACKING_CAPI_ENDPOINT` estava comentado no `.env.local`. A LP no
   Cloudflare (https) não alcança o localhost do PC + mixed content → o `fetch` do CAPI morria no
   `.catch()` silencioso. **Raiz real:** o Synapse só roda local, não há URL pública pro relay Next.
   → **Solução: relay portado pra Supabase Edge Function** `supabase/functions/track-capi/` (Deno,
   `verify_jwt:false` — endpoint público), espelha byte-exato a normalização/SHA256 do `fop.ts`.
   URL: `https://apdjykklderoyiosmytw.supabase.co/functions/v1/track-capi`. Setado em
   `TRACKING_CAPI_ENDPOINT`. **Desacopla o tracking do app estar online.**
2. **Deploy publicava o HTML SEM FOP.** `/api/deploy` usava `workflow_design.codigo_html` (sem
   tracking). → Corrigido pra preferir `workflow_tracking.codigo_html_final` quando `status='instalado'`.
3. **Sem botão de Republicar.** Depois de publicada (`url_recurso` setada), a UI só mostrava link
   "No Ar" — não dava pra subir de novo após reinstalar o FOP. → Botão **Republicar** em /design
   (deploy é idempotente: recria o projeto Cloudflare se foi apagado).
4. **Pixel ID com e-mail.** O pixel da LP estava cadastrado com `victor.rmd.05@gmail.com` no campo
   Pixel ID → ID inválido → extensão "nenhum pixel detectado". Corrigido na UI p/ ID numérico.
5. **CORS com barra final.** `dominio_permitido` cadastrado com `/` no fim não casava com a `Origin`
   (sem barra) → Edge Function bloquearia o CAPI. → `corsHeaders` agora normaliza barra/caixa.

**Fluxo correto (ordem importa):** reiniciar dev (carrega env) → /tracking **Reinstalar** (reassa a
URL da Edge no HTML) → /design **Republicar** (sobe a versão com FOP) → testar.

**Gaps menores conhecidos (não bloqueiam):**
- **PageView** dispara só no navegador (fica no `<head>`, fora do `sendEvent`/relay) → não dedupa.
  Fechar depois: gerar `event_id` compartilhado e espelhar PageView pro servidor.
- Builder FOP **não injeta gatilho de Lord/Lead** no funil B (template tem Lead, mas o body só
  instrumenta scroll/form/checkout/whatsapp). Avaliar.
- **Botão Remover tracking** adicionado em /tracking (`excluirTracking()`), faltava antes.

**Validado:** `npx tsc --noEmit` limpo; Edge Function v2 ACTIVE; eventos reais no banco + Meta.

---

## 📊 Status por agente
| Agente | Cérebro (.md) | Mãos (rota) | Status |
|---|---|---|---|
| Minerador | ✅ régua nova | ✅ `/api/mineracao/run` | **Validado ponta a ponta** |
| Copywriting | ✅ sync | ✅ `/api/copywriting/generate` (OpenAI `gpt-4o-mini`) | **Validado** |
| Revisor | ✅ sync | ✅ `/api/revisor/review` (OpenAI `gpt-4o-mini`) | **Validado ponta a ponta** |
| Designer-Webmaster | ✅ marca+Firecrawl+imagens | ✅ `/api/design/generate` + ✅ `/api/deploy` (Cloudflare Pages/Wrangler) | **Motor + deploy OK** (qualidade visual a refinar) |
| **Tracking** (FOP) | ✅ `agentes/tracking/` | ✅ `/api/tracking/generate` + Edge Function `track-capi` | **Validado ponta a ponta** (dedup real no Events Manager; PageView server pendente) |
| Video-Maker | ⚠️ sync | ❌ falta Higgsfield | Pendente |
| Gestor-Meta-Ads | ⚠️ sync | ❌ falta rota | Pendente |
| CEO / CTO | ✅ sync | aprovação/suporte | Camada humana + futura automação |

---

## 🚀 Próximos Passos
- [ ] Refinar keywords de dropshipping (e avaliar blacklistar marcas médias tipo Gocase se quiser só desconhecidos).
- [ ] Ligar as keywords ao Obsidian (nexus.ai) via MCP — listas viram fonte editável.
- [ ] (Opcional) Dropdown de keywords prontas na tela de mineração.
- [x] ~~Migrar copywriting para provider confiável~~ → **feito: OpenAI `gpt-4o-mini`** (26/06).
- [x] ~~Próximo agente da esteira: Revisor~~ → **feito e validado** (`/api/revisor/review`, 26/06).
- [x] ~~Designer-Webmaster: motor `/api/design/generate`~~ → **feito** (gpt-4o/Claude + marca +
      Firecrawl + imagens reais + botão play). **Qualidade a refinar** (Claude com crédito / prompt).
- [x] ~~Novo agente **Tracking** (FOP: Pixel + CAPI)~~ → **construído** (26/06): `/api/tracking/generate`
      + relay `/api/track/capi` + página `/tracking` + tabelas. **Falta teste ponta a ponta do Fernando.**
- [x] ~~**Tracking: validar ponta a ponta**~~ → **feito e validado (28/06)**: dedup real no Events
      Manager, relay migrado p/ **Supabase Edge Function** (`track-capi`), deploy publica versão com
      FOP, botões Republicar/Remover. Ver seção "Tracking (FOP) — VALIDADO" acima.
- [ ] **Tracking: fechar PageView server-side** (hoje só dispara no navegador → não dedupa) e medir EMQ
      por evento no Events Manager (meta ≥ 6.0). Avaliar gatilho de Lead no funil B.
- [x] ~~**Designer: deploy** `/api/deploy` + conectar "Aprovar para Tráfego"~~ → **feito e validado**
      (26/06): Cloudflare Pages via Wrangler (`src/lib/cloudflare.ts`), botão **"Aprovar e Publicar"**,
      salva `url_recurso`. Falta só clicar pela UI com um `design_id` real.
- [ ] **Designer: subir a qualidade visual** — pôr crédito na Anthropic e `DESIGN_PROVIDER=anthropic`,
      e/ou refinar o prompt do motor (usar o `ui-ux-pro-max` + Magic MCP como apoio de dev).
- [ ] Templates por agente na Agents Config (ex: Designer-Webmaster → exemplos de LP; entra junto com a decisão landing page x Shopify por produto).
- [ ] (Limpeza) Remover código órfão do Sistema B de agentes (subpáginas `[agentRole]`, `FileEditor`, etc.).
- [ ] (Build) Decidir entre `eslint.ignoreDuringBuilds` ou limpar a dívida de lint pré-existente.
- [ ] Desenhar RLS real quando houver autenticação.

---

## 🔁 Processo (regra fixa)
Ao **validar** cada tarefa: (1) atualizar este `NOTES.md`; (2) atualizar a nota do projeto no
segundo cérebro `02_Projetos/Alavanca_Synapse.md` (Obsidian/nexus.ai via MCP), mantendo canvas
e skills em dia para o cérebro ser auto-evolutivo.
