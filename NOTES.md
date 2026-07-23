# 📝 Notas do Projeto — Alavanca Synapse
> Diário de bordo do projeto. **Sempre atualizar este arquivo após validar cada tarefa**
> (e replicar no segundo cérebro: `02_Projetos/Alavanca_Synapse.md` no vault Obsidian/nexus.ai).
> Última atualização: 2026-07-23 — **Campanhas: Histórico de diagnósticos + painel de Conjuntos + galeria de Criativos** (GUIA_IMPLEMENTACAO.md implementado; endpoints já existiam do commit a4e1ca7, faltava a UI + 2 bugs de backend). Antes: **Gestor-Meta-Ads: paridade total com o MetaScale** (fix de modelo IA `claude-opus-4-8`, filtro por data, Claude Ads Audit transparente, distribuição de verba real, Plano de Otimização ancorado na Análise Profunda, "Salvar análise" completo). Antes: **Tracking: "Limpar log" + filtro "só conversões"** no painel CAPI (log local, não afeta o Meta). Antes: **Dashboard Meta Ads LIGADO A DADOS REAIS** (Gestor-Meta-Ads, parte de leitura). `/api/meta/sync` agora puxa campanhas + `/insights` reais da conta Cavalheiros, calcula métricas derivadas e grava em duas tabelas novas (`meta_campaigns`, `meta_campaign_metrics`); dashboard lê com Realtime e botão Sync. Funil de compra com estado vazio honesto (sem `purchase`/`roas` ainda — campanhas atuais são tráfego/awareness). Antes: Tracking (FOP) validado ponta a ponta, relay em Edge Function, deploy de LPs no Cloudflare, motor do Designer.

---

## ▶️ Como abrir o dashboard (rodar local)
O app é um Next.js que roda **na sua máquina** — não há URL pública, é sempre `localhost`.

**Passo a passo:**
1. Abrir um terminal na raiz do projeto:
   `C:\Users\cerqu\Documents\Projetos_IDE\Alavanca _synapse`
2. (Só na 1ª vez, ou depois de mudar dependências) instalar os pacotes:
   ```bash
   npm install
   ```
3. Subir o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abrir no navegador: **http://localhost:3000**
   - Se a porta 3000 estiver ocupada, o Next sobe em 3001 (ele avisa no terminal — usar a URL que aparecer).
5. Para **parar** o servidor: `Ctrl + C` no terminal.

**Rotas principais do dashboard:**
| Tela | URL |
|---|---|
| Home | http://localhost:3000/ |
| Mineração | http://localhost:3000/mineracao |
| Produção (Kanban) | http://localhost:3000/producao |
| Copywriting | http://localhost:3000/copywriting |
| Revisor | http://localhost:3000/revisor |
| Design/LP | http://localhost:3000/design |
| Tracking (FOP) | http://localhost:3000/tracking |
| Meta Ads — Dashboard | http://localhost:3000/meta-ads/dashboard |
| Meta Ads — Campanhas | http://localhost:3000/meta-ads/campanhas |
| Agents Config | http://localhost:3000/agents |

**Requisito:** o `.env.local` precisa estar preenchido (Supabase, chaves de IA, Meta, etc.) — sem
ele o painel abre mas fica sem dados. Ele **nunca** é commitado; fica só na sua máquina.

**Armadilhas conhecidas (do próprio diário):**
- **Não rodar `npm run build` com o `npm run dev` ativo** — disputam a pasta `.next` e a tela fica
  branca/sem estilo. Para checar tipos com o dev rodando, usar `npx tsc --noEmit`.
- Se mexeu no `.env.local`, **reiniciar o `npm run dev`** (ele só lê o env no boot).

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
  - **Mineração → Anthropic Claude** (`claude-sonnet-4-6`) desde 29/06. A rota
    `mineracao/run` agora usa `gerarJSONComAgente(config, …)` (provider-aware), então o modelo
    vem de `agentes_config.modelo` — trocar é só UPDATE na tabela / `_agente.json`, sem mexer no
    código. Fallback automático p/ OpenAI se o Claude falhar. Saiu do OpenCode Zen
    (`deepseek-v4-flash-free`), que era modelo de raciocínio e dava resposta vazia silenciosa.
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

## 🗄️ Camada de dados — RLS corrigido (/6)
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
- ~~PageView só no navegador → não dedupa~~ → **RESOLVIDO (28/06)**: HEAD gera `event_id`
  (`window.__FOP_PV`) e dispara o browser com ele; BODY espelha o MESMO id pro CAPI → **PageView
  deduplica** (confirmado no Events Manager). Removido o `custom_data` de produto do PageView
  (semanticamente errado; provável causa do selo "Evento personalizado" da Meta — a confirmar num
  reinstalar+republicar). Eventos automáticos do Pixel (`SubscribedButtonClick`) desligados no painel.
- Builder FOP **não injeta gatilho de Lord/Lead** no funil B (template tem Lead, mas o body só
  instrumenta scroll/form/checkout/whatsapp). Avaliar.
- **Botão Remover tracking** adicionado em /tracking (`excluirTracking()`), faltava antes.

**Validado:** `npx tsc --noEmit` limpo; Edge Function v2 ACTIVE; eventos reais no banco + Meta.

---

## 📊 Gestor-Meta-Ads — DASHBOARD LIGADO A DADOS REAIS (29/06/2026)
Fechando o ciclo da parte de tráfego pago: o dashboard era 100% mock e as rotas
`/api/meta/sync` e `/api/meta/accounts` eram stubs vazios. Agora a **leitura** é real.

**Conta:** Cavalheiros (`META_AD_ACCOUNT_ID=act_814261946562792`, BRL). 2 campanhas ativas
(`[CP-02][Tráfego][loja]` → loja Shopify; `[CP-01][Curtidas funpage]` → awareness) + 5 pausadas.

**O que foi feito:**
- **Tabelas novas** (migration `create_meta_ads_tables`): `meta_campaigns` (cache de atributos,
  `meta_campaign_id` UNIQUE) e `meta_campaign_metrics` (snapshot por `data`, upsert em
  `meta_campaign_id+data` p/ histórico). RLS on + policy pública (convenção do projeto).
- **`src/lib/meta-api.ts`**: novo `fetchMetaInsights()` real chamando `/insights` (level=campaign,
  `date_preset=maximum`) com `actions`/`action_values`/`purchase_roas`. Helper `extractAction()`
  testa vários `action_type` (`omni_purchase`/`purchase`/`offsite_conversion.fb_pixel_purchase`),
  pois a Meta nomeia o mesmo evento de formas diferentes conforme o tracking. `fetchMetaMetrics`
  mock (números chumbados) foi removido.
- **`/api/meta/sync`** (era stub): puxa campanhas + insights em paralelo, calcula derivadas
  (`connect_rate=lp/cliques`, `conversao_lp`, `conversao_checkout`, `conversao_global`, `cpa`,
  `escala_status`) e faz upsert nas 2 tabelas. Usa `supabaseServer` (service_role). Retorna relatório.
- **Dashboard** (`/meta-ads/dashboard`): trocado mock → leitura real do Supabase com Realtime,
  botão **Sync Data** chama `/api/meta/sync`, estado inicial "sincronizar agora", "Distribuição de
  Verba" agora é gasto real por objetivo, `ClaudeAdsHealth` recebe score data-driven (CTR+connect).
  **Banner honesto**: quando `compras=0`, avisa "funil de compra aguardando 1ª venda".

**Heurística `escala_status`** (provisória, refinar no agente depois): `escalavel` se roas≥2 e
compras>0; `nao_escalar` se gasto>0 e sem LP views; senão `otimizar`.

**Validado (29/06):** `/insights` testado com o token do app (não só MCP) → 7 campanhas, a de
tráfego com 17 LP views, connect_rate 65,4% (17/26). Sync real disparado no dev server →
`7/7 campanhas`, dados conferidos no Supabase. `compras`/`roas`=0 nas 7 (esperado: nenhuma é
campanha de compra ainda). `npx tsc --noEmit` limpo (único erro é em `scratch/`, pré-existente).

**AI Diagnostic real (29/06):** rota `/api/meta/diagnose` (POST, opcional `meta_campaign_id`)
usa o **cérebro do agente Gestor-Meta-Ads** (`getAgentConfig`+`buildSystemPrompt`) + um
**CONTRATO DE SAÍDA JSON** anexado (o brain responde em markdown por padrão; aqui sobrescreve
p/ JSON `{gargalo, diagnostico, prioridade, recomendacoes[]}`). Roda nas campanhas ativas, grava
em `meta_ai_diagnostics` (upsert por dia). **Provider-aware com fallback**: modelo `claude*` →
Anthropic, e se falhar (ex.: sem crédito) cai p/ OpenAI `gpt-4o-mini` (JSON mode) sozinho — sem
mudar config; volta pro Claude quando houver crédito. Dashboard lê via Realtime, passa ao
`CampaignCard`, e o botão **"Rodar Auditoria Completa"** do `ClaudeAdsHealth` dispara a rota.
**Validado (29/06):** 2/2 campanhas diagnosticadas (uma no Claude, uma no fallback OpenAI),
gargalos coerentes (tráfego→Connect Rate; awareness→CTR 0,03%). Nota: a qualidade do Claude é
visivelmente superior à do gpt-4o-mini — preferir Claude quando houver crédito.

**Página Campanhas real + provider Claude (29/06, parte 2):**
- **Design/Webmaster → Claude**: `DESIGN_PROVIDER=anthropic` no `.env.local` (Fernando pôs crédito
  + chave nova). Reiniciar dev server p/ valer. Gestor-Meta-Ads **já estava** no Claude (a rota
  diagnose usa `config.modelo=claude-sonnet-4-6`; só cai p/ OpenAI se Claude falhar).
- **`/meta-ads/campanhas` reconstruída** (era mock "Verão 2024"): agora lê Supabase com Realtime,
  tem **seletor de campanha** (dropdown; aceita `?campaign=<id>` na URL — essencial p/ escala com
  várias campanhas ativas), métricas reais (`MetaMetricsGrid`), `FunnelBars` 80×10×10 e `AIAnalyst`
  agora **dinâmicos** (eram hardcoded), e botão **"Pedir diagnóstico desta campanha"** →
  `POST /api/meta/diagnose {meta_campaign_id}`.
- **"Ver Detalhes"** do card do Dashboard agora aponta p/ `/meta-ads/campanhas?campaign=<id>`
  (antes ia p/ `/campanhas/[id]`, rota inexistente).
- **Validado (29/06):** página GET 200, diagnose por campanha 1/1, `tsc` limpo.

**Pendente desta frente:**
- ✅ **Execução autônoma — METADE 1 (gerar plano + aprovar) FEITA E VALIDADA (29/06)**.
  Decisões do Fernando: **v1 estreita** (duplicar + ajustar, sem criativo novo) + **sempre PAUSED**.
  - Helper compartilhado `src/lib/agents/generateWithProvider.ts` (`gerarJSONComAgente` provider-aware
    com fallback + `parseJSONFlexivel`); rota diagnose refatorada p/ usar (sem regressão).
  - Tabela `meta_optimization_plans` (status: pendente|aprovado|rejeitado|executado|erro).
  - `POST /api/meta/optimize/plan {meta_campaign_id}` → agente gera PLANO estruturado (nova_campanha:
    nome/objetivo/budget + ajustes de budget/objetivo/segmentação/posicionamento + racional 80×10×10
    + riscos). Persistido 'pendente'. **Qualidade Claude excelente** (ex.: detectou Connect Rate 65%,
    propôs remover Audience Network + trocar evento de otimização p/ Landing Page Views, manteve
    OUTCOME_TRAFFIC por não haver checkout ainda).
  - `POST /api/meta/optimize/approve {plan_id, decisao}` → trava do orquestrador (pendente→aprovado/
    rejeitado). NÃO escreve no Meta.
  - UI: componente `OptimizationPlan` na página Campanhas (gerar → revisar ajustes/racional/riscos →
    Aprovar/Rejeitar), com Realtime. Validado: plan 1/1, approve pendente→aprovado, página GET 200.
- ✅ **Execução autônoma — METADE 2 (escrever no Meta) FEITA E VALIDADA NA CONTA REAL (29/06)**.
  `POST /api/meta/optimize/execute {plan_id}` (só roda com plano 'aprovado'): lê a estrutura da
  campanha-fonte no Graph e **recria tudo em PAUSED**. Helpers novos em `meta-api.ts`:
  `getCampaignAdSets`/`getAdSetAds` (lê config completa) + `createCampaignV2`/`createAdSetV2`/
  `createAdV2`/`deleteEntity` (+ `graphGet`/`graphPost` com erro rico). Reaproveita o `creative_id`
  da fonte (duplicata real, sem re-upload). UI: botão **"Executar — criar campanha otimizada (PAUSED)"**
  no componente `OptimizationPlan` (com confirm), mostra resultado + link pro Gerenciador. Status do
  plano → 'executado'.
  - **v1 (decisão de segurança):** mantém o **objetivo da fonte** (mudar objetivo exige reconfigurar
    optimization_goal/promoted_object junto — manual por ora); aplica budget + optimization_goal +
    posicionamento (bloco `execucao` do plano: `remover_audience_network`, `somente_mobile`,
    `optimization_goal`). Piso de budget R$6/dia. Se 0 conjuntos forem criados, **apaga a campanha
    vazia** e não marca executado.
  - **Bugs resolvidos no teste real:** (1) campanha exigia `is_adset_budget_sharing_enabled=false`
    (ABO); (2) conjunto exigia `bid_strategy=LOWEST_COST_WITHOUT_CAP` (senão pede bid_amount,
    subcode 2490487). Limpei a campanha-vazia da 1ª tentativa via Graph DELETE.
  - **Validado:** criou `[CP-02]...— OTIM v1` (id `120245932633660108`) PAUSED, 1 conjunto (R$6/dia)
    + 1 anúncio reaproveitando o criativo. Confirmado independente via MCP (status PAUSED). `tsc` limpo,
    página GET 200.
  - **Nota:** o plano usado no teste foi gerado ANTES do bloco `execucao` → saiu duplicata fiel só com
    budget. Planos novos já incluem `execucao` (ex.: remover Audience Network + LP-views) e aplicam.
- Página `/meta-ads/campanhas/[id]` (dinâmica) ficou órfã/mock — o card agora usa `?campaign=`.
  Avaliar remover ou redirecionar. `TrendChart` ainda é ilustrativo (só temos 1 snapshot/dia).
- Subir a campanha de compra pra "acender" o funil inteiro. ⚠️ `META_ACCESS_TOKEN` (e agora a
  chave nova da Anthropic) apareceram no chat — rotacionar.

---

## 🖼️ Mineração — miniatura do card reflete o anúncio REAL (carrossel) (29/06/2026)
O card de `/mineracao` mostrava sempre um **smartwatch** (placeholder Unsplash hardcoded) nos
anúncios de imagem. **Causa raiz:** a maioria dos anúncios é **carrossel** → a imagem vive em
`snapshot.cards[]` (cada card tem `original_image_url`/`resized_image_url`/`video_preview_image_url`),
mas o código só lia `snapshot.images`/`videos` → `image_url` vazio → caía no placeholder.
- **Helper novo `src/lib/minerador-media.ts`** (`pickThumbnail`/`pickVideos`/`pickImages`): olha
  images, videos **E cards**. Puro (sem dep de servidor) → usado na rota `mineracao/run` (salva a
  imagem certa) e no componente client `/mineracao` (corrige os já minerados lendo do `raw_json`).
- **Smartwatch removido**: sem imagem (ou URL FB expirada) → placeholder neutro **"sem imagem"**
  com ícone `ImageOff` + `onError` no `<img>` do card e do modal. Vídeo segue com a thumbnail.
- **Validado:** `tsc` limpo; URL real de card testada → HTTP 200 (carrega). Anúncios existentes
  passam a mostrar a imagem real sem re-minerar.
- ⚠️ **FB CDN expira**: URLs de imagem do Facebook têm validade. Recém-minerados mostram a imagem
  real; muito antigos podem cair no "sem imagem". Fix definitivo (futuro): baixar a imagem e
  guardar no Supabase Storage na mineração → card nunca quebra.

---

## 🧹 Tracking — "Limpar log" + filtro "só conversões" no painel CAPI (29/06/2026)
O painel **"Eventos recentes (CAPI)"** (`/tracking`) lê os últimos 20 de `tracking_eventos` — um
**log local de observabilidade** (prova que o disparo server-side roda). Estava 100% **PageView**
(toda carga de página gera um) sem forma de limpar nem filtrar. Adicionados 2 controles no header
do painel (só aparecem quando há eventos):
- **🧹 Limpar log** (ícone `Eraser`): nova server action `limparEventosTracking()` em
  `src/app/actions/tracking.ts` (`supabaseServer`/service_role) dá `DELETE` em `tracking_eventos`.
  `confirm()` deixa **explícito que é só o log NOSSO** — o Meta já recebeu os eventos, nada é
  desfeito lá. Serve pra slate limpo antes de um teste e pra segurar o crescimento da tabela.
- **🔎 Só conversões** (ícone `Filter`): esconde `PageView` (ruído) e destaca eventos de funil
  (Lead, InitiateCheckout, Purchase…). Filtro **client-side** (instantâneo, não toca o banco);
  empty-state dedicado quando só há PageView.
- **Validado:** `tsc` limpo (só erro pré-existente em `scratch/`). Commit `2881ece`.
- Futuro opcional (sem botão): retenção automática (manter só N dias/registros) p/ a tabela não
  crescer pra sempre.

---

## 🗂️ Campanhas — Histórico de Diagnósticos + Conjuntos sempre visíveis + Criativos (23/07/2026)
Implementação do `GUIA_IMPLEMENTACAO.md` (3 melhorias na página `/meta-ads/campanhas`). Os 3
endpoints do guia **já existiam** (commit `a4e1ca7`) — faltava a UI inteira e 2 bugs de backend.

**Bugs de backend corrigidos (os endpoints não funcionariam):**
1. `/api/meta/creatives` usava `process.env.META_ADS_ACCESS_TOKEN` — a env real é
   `META_ACCESS_TOKEN` → sempre retornava 400 "não configurados".
2. `/api/meta/adsets/list` usava `getCampaignAdSets()` (só config: budget/targeting, sem status
   nem métricas) — inútil pra tabela Nome|Status|Gasto|ROAS do guia. → Novo helper
   `fetchAdsetsOverview()` em `meta-api.ts`: mescla `/adsets` (status/effective_status/daily_budget)
   com `/insights?level=adset` (reaproveita `mapBreakdownRow` → spend/compras/roas/cpa + saúde
   escalar/otimizar/pausar). Aceita `range` opcional (default `last_30d`).
3. **Criativos sem imagem** (descoberto no teste real): (a) a extração de imagem estava presa
   atrás de `if (!title)`; (b) criativos Advantage+ (`asset_feed_spec`) só trazem o **hash** da
   imagem, não URL; (c) `thumbnail_url` padrão vem 64x64. → Extração independente por campo +
   resolução de hashes em URL cheia via `/adimages` (1 chamada em lote, best-effort) + fallback
   `creative.thumbnail_width(512).thumbnail_height(512)`. Validado: 39/39 criativos com imagem.

**UI nova (3 componentes em `src/components/campaigns/`):**
- **`AdsetsPanel.tsx`** — painel "Conjuntos de Anúncios" **sempre visível** (sem depender da
  Análise Profunda), entre DeepAnalysis e OptimizationPlan. Tabela: Conjunto | Entrega (badge
  Ativo/Pausado) | Orçamento/dia | Gasto | Impressões | ROAS | CPA | Saúde | Controle. Botão
  **pausar/reativar por conjunto** (reusa `POST /api/meta/adset`, com confirm de conta real e
  update otimista do status).
- **`AdCreatives.tsx`** — grid de criativos (imagem 512px + nome + status + título + copy),
  modal expandido ao clicar (imagem grande, texto completo, whitespace preservado) e link
  **"Abrir no Gerenciador"** (a rota devolve `accountId` sem o prefixo `act_` pro deep-link).
- **`DiagnosticsHistory.tsx`** — modal "Histórico" (botão novo no header, ícone History) listando
  `meta_ai_diagnostics` via `/api/diagnostics/list`: Data | Campanha | Gargalo | Prioridade |
  Ver detalhes (expande diagnóstico + recomendações + modelo). Checkbox "Só esta campanha".
  ⚠️ **Armadilha real:** `recomendacoes` no banco ora é `string[]`, ora `{texto, impacto}[]`
  (formatos de IA diferentes ao longo do tempo) — helper `recTexto()` normaliza os dois; renderizar
  o objeto direto quebraria o React ("Objects are not valid as a React child").

**Decisão:** seguido o roteamento do Synapse (`?campaign=<id>` na página única), não o
`[id]/page.tsx` sugerido pelo guia (rota órfã, ver sessões anteriores).

**Rodada 2 (mesmo dia, feedback do Fernando):**
- **Onde os relatórios ficam:** pasta `analises-ia/` na raiz (`<slug>_<meta_campaign_id>.md` +
  `diagnosticos.json`), gitignorada — deletar manualmente à vontade. O modal Histórico lê do
  **Supabase** (`meta_ai_diagnostics`), não desses arquivos.
- **🐛 Bug crítico achado no teste:** `meta_ai_diagnostics` tem **UNIQUE (meta_campaign_id, data)**
  (convenção da rota diagnose: 1/dia). O "Salvar análise" fazia INSERT → **falhava silenciosamente**
  (best-effort) sempre que o diagnóstico do dia já existia — ou seja, quase sempre. → Trocado por
  **UPSERT** `onConflict: 'meta_campaign_id,data'`. (A tabela também tem **FK** pra `meta_campaigns` —
  id inventado é rejeitado.)
- **Coluna nova `relatorio_md`** (migration `20260723120000`, aplicada via MCP): o markdown COMPLETO
  (métricas + funil + diagnóstico + Análise Profunda + plano — igual ao .md da pasta) agora é salvo
  também no Supabase, então o Histórico mostra a análise inteira.
- **Auto-save da Análise Profunda:** ao terminar `handleRunDeep` (quebras + media buyer IA), a página
  chama o save sozinha → **toda Análise Profunda gera o relatório completo** (.md + histórico) sem
  clique extra. `handleSaveDiagnostic` aceita `analysisArg`/`deepArg` (o estado do React ainda não
  atualizou no momento do auto-save). Botão "Salvar análise" não exige mais diagnóstico prévio.
- **Histórico (DiagnosticsHistory) turbinado:** botão **Excluir** por linha (nova rota
  `POST /api/diagnostics/delete {id}`, service_role; só apaga do banco, arquivos ficam), botão
  **"Relatório"** que abre o `relatorio_md` renderizado (lib `marked`, estilos via arbitrary variants
  do Tailwind — sem plugin typography) em **tela cheia**, e toggle **maximizar** no modal.
- **Validado (23/07):** upsert testado com o registro real do dia (re-save preservando o conteúdo →
  `supabase:true`, `relatorio_md` preenchido), delete testado com registro dummy (criado e excluído),
  lista devolve `relatorio_md`; arquivos de teste limpos; `tsc` limpo; página 200.

**Rodada 3 (mesmo dia) — "parece que não funciona" era UX, não bug:**
Fernando reportou que excluir/salvar "não funcionavam". Diagnóstico pelos logs do dev + SQL:
- **Excluir FUNCIONAVA** (registros 21/07 e 18/07 realmente sumiram do banco). A percepção de
  "volta tudo no F5" vinha de: (a) o registro DE HOJE é **recriado pelo próprio Salvar/auto-save**
  (desenho: 1 registro por campanha/dia); (b) com "Só esta campanha" desmarcado aparecem os
  registros antigos de OUTRAS campanhas (29/06), que nunca foram excluídos.
- **Salvar FUNCIONAVA** (arquivo reescrito às 12:32) — mas o nome era fixo por campanha, então
  **sobrescrevia o mesmo .md** e nunca "aparecia arquivo novo" na pasta.
- **Relatório saiu sem quebras** porque o "Salvar análise" foi clicado SEM rodar a Análise
  Profunda antes (zero chamadas a `/api/meta/analysis` nos logs da sessão).
Correções de UX: **arquivo datado** `<slug>_<id>_<YYYY-MM-DD>.md` (novo arquivo por dia; re-save
no dia atualiza o do dia, ontem nunca é sobrescrito) e o header agora mostra **o nome do arquivo
salvo** ("Salvo: analises-ia/<arquivo>"). Validado: `tsc` limpo, save de teste gerou nome datado.
📌 **Fluxo pro relatório completo: Rodar Análise Profunda → auto-save faz o resto.**

**Rodada 4 — 🐛 BUG REAL encontrado: Data Cache do Next congelava as leituras do Supabase:**
O diagnóstico da rodada 3 estava incompleto: os DELETEs de fato apagavam no banco, mas a lista
`/api/diagnostics/list` voltava **CONGELADA** — o Fernando excluía 18/07 e 21/07 e elas
"ressuscitavam" no F5 (e o registro novo de hoje nunca aparecia).
- **Causa raiz:** o Next.js 14 intercepta o `fetch` global e cacheia respostas dentro de Route
  Handlers (Data Cache, chaveado por URL) — **mesmo com `export const dynamic = 'force-dynamic'`**
  na rota. O fetch interno do supabase-js caía nesse cache: a query do modal (`limit=50`) ficou
  congelada com o estado de antes das exclusões, enquanto URLs diferentes (`limit=3`, `limit=5`)
  tinham snapshots de outros momentos — por isso os testes por curl "passavam".
- **Como foi provado:** API na 3000 devolvia 21/18; consulta direta ao REST do Supabase com a
  mesma URL/key do `.env.local` devolvia só 23/07 + 3 de junho (mesmo projeto `apdjykklderoyiosmytw`
  do MCP). Mesma origem, respostas diferentes = cache no meio.
- **Correção (raiz):** `src/lib/supabase-server.ts` agora injeta
  `global.fetch = (url, init) => fetch(url, { ...init, cache: 'no-store' })` no client — TODA
  leitura server-side do Supabase vai ao banco de verdade. Vale pra todas as rotas que usam
  `supabaseServer` (não só diagnostics).
- **Validado:** a URL exata do modal passou a devolver só o estado real do banco.
- ⚠️ **Aprendizado:** rota com `force-dynamic` NÃO garante fetch fresco no Next 14; qualquer
  client HTTP server-side (supabase-js, SDKs) precisa de `cache: 'no-store'` explícito.

**Rodada 5 — Visualização da publicação nos Criativos (Ad Preview API):**
- Rota nova `GET /api/meta/preview?adId=X&format=Y` → Graph `/{ad_id}/previews` devolve o
  **iframe oficial da Meta** com o anúncio como o público vê. Whitelist de formatos:
  MOBILE_FEED_STANDARD, DESKTOP_FEED_STANDARD, INSTAGRAM_STANDARD, INSTAGRAM_STORY, INSTAGRAM_REELS.
- No modal do `AdCreatives`: seção **"Visualização da publicação"** com chips de formato
  (Feed Mobile/Desktop, Instagram, Story, Reels) → renderiza o iframe. Preview limpa ao trocar
  de anúncio.
- **Validado:** rota testada nos 3 formatos com anúncio real (200/OK), `tsc` limpo.

**Rodada 6 — Janela de data na página Campanhas (igual ao Dashboard):**
- `DateRangePicker` (Hoje/Ontem/3/7/14/30d/Personalizado) no header da página Campanhas, com a
  **mesma memória** do Dashboard (localStorage `synapse.dateRange` compartilhado — escolher numa
  página vale na outra).
- Trocar a janela → `saveRange` + `GET /api/meta/sync?<range>` (grava o snapshot da janela no
  Supabase, padrão do Dashboard) + refetch + **limpa a Análise Profunda** (quebras eram de outra
  janela). Indicador "Sincronizando janela…".
- A janela flui pra tudo: `MetaMetricsGrid` (rótulo), **Análise Profunda**
  (`/api/meta/analysis` agora aceita `since/until` além de `range`), **AdsetsPanel**
  (`/api/meta/adsets/list` idem; props `rangeQuery`/`rangeLabel`) e **range_label do relatório
  salvo** (antes fixo "Últimos 30 dias").
- **Validado:** `tsc` limpo; adsets em `last_7d` (R$528) vs custom 15–22/07 (R$603) — números
  reais diferentes por janela; analysis com `since/until` OK (18 conjuntos/18 posicionamentos).

**Validação (23/07):** `npx tsc --noEmit` limpo; lint dos arquivos novos sem erros (só os
warnings `no-explicit-any` padrão do projeto); os 3 endpoints testados com a campanha real
`120249862631490627` (Premier Esportes): adsets com métricas e saúde corretas (8 compras,
ROAS 2.88 no "Genérico_Aberto"), 39 criativos todos com imagem, histórico com diagnósticos
reais; página GET 200 e compilando sem erro. ⏳ **Falta o clique do Fernando na tela**
(pausar/ativar conjunto real, modais). Nota de ambiente: `node_modules` estava com o pacote
`typescript` quebrado/ausente — `npm install typescript` resolveu.

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
| Gestor-Meta-Ads | ✅ sync | ✅ `/api/meta/sync` + `/api/meta/diagnose` (leitura + diagnóstico IA) | **Dashboard real + AI Diagnostic** (falta detalhe `[id]`; subir campanha de compra) |
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
- [x] ~~**Tracking: fechar PageView server-side**~~ → **feito e validado (28/06)**: PageView dedupa
      (HEAD+BODY com `event_id` compartilhado); eventos automáticos do Pixel desligados.
- [ ] **Tracking: medir EMQ** por evento no Events Manager (meta ≥ 6.0) e avaliar gatilho de Lead no funil B.
      (Cosmético: confirmar que o PageView perde o selo "Evento personalizado" após reinstalar/republicar.)
- [x] ~~**Designer: deploy** `/api/deploy` + conectar "Aprovar para Tráfego"~~ → **feito e validado**
      (26/06): Cloudflare Pages via Wrangler (`src/lib/cloudflare.ts`), botão **"Aprovar e Publicar"**,
      salva `url_recurso`. Falta só clicar pela UI com um `design_id` real.
- [ ] **Designer: subir a qualidade visual** — pôr crédito na Anthropic e `DESIGN_PROVIDER=anthropic`,
      e/ou refinar o prompt do motor (usar o `ui-ux-pro-max` + Magic MCP como apoio de dev).
- [ ] Templates por agente na Agents Config (ex: Designer-Webmaster → exemplos de LP; entra junto com a decisão landing page x Shopify por produto).
- [ ] (Limpeza) Remover código órfão do Sistema B de agentes (subpáginas `[agentRole]`, `FileEditor`, etc.).
- [ ] (Build) Decidir entre `eslint.ignoreDuringBuilds` ou limpar a dívida de lint pré-existente.
- [x] ~~**Gestor-Meta-Ads: dashboard com dados reais**~~ → **feito e validado (29/06)**: tabelas
      `meta_campaigns`/`meta_campaign_metrics`, `/api/meta/sync` real, dashboard com Realtime + Sync.
      Ver seção "Gestor-Meta-Ads — DASHBOARD LIGADO A DADOS REAIS" acima.
- [x] ~~**Gestor-Meta-Ads: AI Diagnostic real** por campanha~~ → **feito e validado (29/06)**:
      `/api/meta/diagnose` com cérebro do agente + contrato JSON + fallback OpenAI, tabela
      `meta_ai_diagnostics`, botão "Rodar Auditoria". Ver seção do Gestor acima.
- [ ] **Gestor-Meta-Ads: ligar página de detalhe** `/meta-ads/campanhas/[id]` (mock: TrendChart,
      AIAnalyst) ao Supabase — mostrar o diagnóstico completo (recomendações) e histórico/trend real.
- [ ] **Validação do ciclo de compra:** subir a campanha de compras (loja Shopify) e conferir que o
      funil inteiro acende (checkout → venda → ROAS via `omni_purchase`/`purchase_roas`).
- [ ] **Segurança:** rotacionar `META_ACCESS_TOKEN` (apareceu no chat durante o build de 29/06).
- [ ] Desenhar RLS real quando houver autenticação.

---

## 🔁 Processo (regra fixa)
Ao **validar** cada tarefa: (1) atualizar este `NOTES.md`; (2) atualizar a nota do projeto no
segundo cérebro `02_Projetos/Alavanca_Synapse.md` (Obsidian/nexus.ai via MCP), mantendo canvas
e skills em dia para o cérebro ser auto-evolutivo; (3) **rodar o Graphify** para reconstruir o
grafo do segundo cérebro.

**Graphify (rotina diária do segundo cérebro):**
- Cofre alvo: **SEMPRE `C:\Users\cerqu\Documents\Obsidian\Nexus.AI`** — nunca outro vault.
- Python **global** `C:\Python313\python.exe` (o venv do projeto NÃO tem o módulo graphify).
- Comando, na raiz do cofre: `python -m graphify update . --force`
  (saída em `graphify-out/`: `graph.json`, `graph.html`, `GRAPH_REPORT.md`).
- Rodar **todo dia** e sempre que a nota do projeto for atualizada. Para automatizar de verdade
  (sem depender de sessão), usar uma Tarefa Agendada do Windows com esse mesmo comando.

---

## 🔄 Dashboard Atualizado via MetaScale (2026-07-18)
O Frontend da rota pp/meta-ads foi 100% sincronizado com as últimas atualizações de UI desenvolvidas no projeto base MetaScale.

**O que foi migrado:**
- **Dashboard Principal (/meta-ads/dashboard/page.tsx):** Agora suporta a visualização real do funil e distribuição de verbas sem mocks.
- **Listagem de Campanhas (/meta-ads/campanhas/page.tsx):** Importada inteiramente para suportar filtros rápidos (Escalável, Otimizar, etc).
- **Detalhes da Campanha (/meta-ads/campanhas/[id]/page.tsx):** Traz as atualizações visuais da página de análise.

**Nota técnica:**
Foi uma migração estrita de frontend. Os componentes em src/components/campaigns e a API em src/app/api/meta precisam estar em suas últimas versões para garantir o correto funcionamento destes novos containers visuais.

---

## 🔄 Gestor-Meta-Ads — PARIDADE TOTAL com o MetaScale (2026-07-20)
Porte completo das atualizações do projeto MetaScale (`C:\Users\cerqu\Documents\Obsidian\MetaScale`)
para a parte de Gestor Meta Ads do Synapse. **Merge cirúrgico**, não cópia cega: os libs
`anthropic.ts`/`meta-api.ts` são compartilhados com outros agentes (minerador/design) e o Synapse
é **stateful** (persiste em `meta_campaigns`/`meta_campaign_metrics`/`meta_optimization_plans` e lê
delas na lista/optimize/diagnose) — o MetaScale é stateless. Preservei a arquitetura stateful e o
sistema de agentes (`getAgentConfig`/`buildSystemPrompt`); trouxe só as melhorias.

**O que foi portado:**
- ✅ **Fix de modelo IA:** `callDiagnostic`/`callDeepDiagnostic` usavam `claude-3-5-sonnet-20240620`
  (descontinuado → 404, diagnósticos quebrados). Trocado para **`claude-opus-4-8`** + parse robusto
  (pega bloco `text` + `safeParseJson`). Rota `/api/ai/diagnostic` não engole mais o erro.
- ✅ **Filtro por data** (Hoje/Ontem/3/7/14/30d + Personalizado): novo `src/lib/date-range.ts` +
  `src/components/ui/DateRangePicker.tsx`; `DateParams`/`dateQuery` em `meta-api.ts`
  (`fetchMetaInsights` e `fetchCampaignAnalysis` aceitam preset **ou** `since/until`→`time_range`).
  Rota `sync` aceita GET/POST + `range`/`since`/`until` e **continua persistindo** no Supabase.
  Dashboard com seletor no TopBar, default `last_7d`, persiste no navegador.
- ✅ **Claude Ads Audit transparente:** `ClaudeAdsHealth` agora mostra os **5 fatores reais**
  (ROAS 40 / Connect 20 / CTR 15 / Checkout 15 / LP 10) com valor·meta·pontos; nota = soma dos pontos.
  Fim dos "agentes online" falsos hardcoded.
- ✅ **Distribuição de Verba real** (gasto por objetivo, não mais 85/10/5 fake) + **CPA formatado**
  (`maximumFractionDigits: 2`).
- ✅ **Conta Meta real** no dashboard (via `fetchAccountInfo`) em vez de "Conta Meta Ads" fixo.
- ✅ **Plano de Otimização ancorado na Análise Profunda:** `optimize/plan` agora busca as quebras
  (`fetchCampaignAnalysis`) e usa o contrato ancorado → o plano deriva `segmentacao` (idade/gênero),
  `posicionamentos` (ex.: só Reels) e `conjuntos_pausar` (perdedores, por adset_id). `optimize/execute`
  ganhou `aplicarAlavancas()` (injeta age/gender/positions no targeting, reconcilia plataformas, pula
  os conjuntos perdedores com salvaguarda anti-esvaziamento) + `conjuntos_pulados` no resultado.
  `OptimizationPlan.tsx` exibe o bloco "Realocação de mídia".
- ✅ **"Salvar análise" (página inteira):** nova rota `/api/diagnostics/save` grava um `.md` completo
  em `analises-ia/` (métricas + funil + diagnóstico + Análise Profunda + media buyer + plano) e faz
  insert best-effort no Supabase (`meta_ai_diagnostics`, via `supabaseServer`). Botão "Salvar análise"
  na página de campanhas. Pasta `analises-ia/` gitignorada (exceto README).
- ✅ **Componentes atualizados:** `AIAnalyst` (estado de erro), `FunnelBars` (status box dinâmico),
  `MetaMetricsGrid` (rótulo de janela), `SummaryHeader`, `TopBar` (slot `actions`).
- ✅ **Limpeza:** removida a pasta duplicada/órfã `meta-ads/campanhas/campanhas/` (rota quebrada,
  tentativa de port anterior). `scratch` adicionado ao `exclude` do tsconfig.

**Decisões de merge (o que NÃO copiei):**
- `CampaignCard` mantido: o link é `/meta-ads/campanhas?campaign=` (roteamento do Synapse), não
  `/campanhas/` do MetaScale.
- Rota `sync` NÃO virou stateless — mantida a persistência no Supabase (lista/optimize/diagnose leem dela).
- `optimize/plan` NÃO virou stateless — mantido o sistema de agentes + tabela `meta_optimization_plans`
  + fluxo de aprovação; só enxertei a ancoragem nas quebras.
- Usado `supabaseServer` (service-role já existente) em vez de criar `supabase-admin.ts`.

**Validação:**
- ✅ `npx tsc --noEmit` **limpo (exit 0)** — a checagem de tipos oficial do projeto.
- ⚠️ `npm run build` falha em ESLint `no-explicit-any`/`no-unused-vars`, mas é **condição
  pré-existente do projeto inteiro** (erra até em arquivos não tocados: `TipTapEditor.tsx`,
  `generateWithProvider.ts`) — não é regressão deste porte. Para o build passar seria preciso
  limpar o lint do projeto ou setar `eslint.ignoreDuringBuilds` (não feito sem pedido).
- ⏳ **Não testado ao vivo** (npm run dev + clicar). A **execução real do Plano** cria campanha
  PAUSED na conta ativa — reversível, mas não disparada de propósito. Validar quando quiser.
