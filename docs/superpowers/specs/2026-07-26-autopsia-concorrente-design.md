# Design — Módulo Autópsia de Concorrente

> **Status:** aprovado pelo Fernando em 26/07/2026.
> **Origem:** `PLANO-AUTOPSIA-CONCORRENTE.md` (handoff do workspace `low-ticket`) + leitura do
> código deste repositório + verificação empírica das APIs (§2 abaixo).
> **Escopo:** fases 0–5. BYOK, multi-tenant, billing e retenção ficam para a fase 6.

---

## 1. O problema

A `/mineracao` que já existe acha anúncios: muitos, rasos, com score. Ela responde
*"quem está escalando?"*. Não responde *"como essa oferta funciona?"* — para isso é preciso
pegar **um** anunciante e dissecar a operação inteira: todos os criativos, a copy falada
(não só a escrita), a estrutura da VSL, os ângulos testados, o funil e as vulnerabilidades.

Esse método já foi executado à mão num concorrente real (*Alimento Sagrado*, no workspace
`low-ticket`) e produziu um dossiê de 424 linhas que o Fernando validou. O que falta é
**transformá-lo em produto dentro deste dashboard**.

### O que já existe e não será reconstruído

| Peça | Onde |
|---|---|
| Busca na Ad Library via ScrapeCreators | `src/app/api/mineracao/run/route.ts` |
| Copy, headline, CTA, link, dados do anunciante | tabela `ads_minerados` |
| Dedup de criativo por path da URL | `creativeKeyFromSnap()` na mesma rota |
| Seleção de mídia em images/videos/cards | `src/lib/minerador-media.ts` |
| Motor de agentes (prompt + provider + fallback) | `src/lib/agents/` |
| Publicação de HTML único no Cloudflare Pages | `src/lib/cloudflare.ts` |
| Padrão de fila visual com Realtime | `src/app/producao/page.tsx` |

---

## 2. Verificações feitas antes do design (não são suposições)

1. **A ScrapeCreators lista o anunciante inteiro por `page_id`.** Chamada real em 26/07:
   `GET /v1/facebook/adLibrary/company/ads?pageId=675352045933936&trim=false` → HTTP 200,
   `results[]` com **30 anúncios**, campo `cursor` para paginação, **1 crédito por chamada**
   (7.059 restantes). Cada item traz `snapshot` completo (`body`, `title`, `cta_text`,
   `cta_type`, `link_url`, `videos[].video_hd_url`, `images`, `cards`) mais `start_date`,
   `end_date`, `is_active`, `total_active_time`, `publisher_platform`, `collation_count`.
   Nesse anunciante: 12 anúncios com vídeo → **12 paths únicos** pelo `creativeKeyFromSnap()`.
   **Consequência:** os passos 1, 2, 3 e 5 do método manual (Playwright, scroll, parse de
   `innerText`, dedup por `xpv_asset_id`) desaparecem. Sobram download, frames e transcrição.
2. **A máquina tem o necessário para o worker local:** Python 3.13.3, ffmpeg 8.1.2,
   `faster-whisper` já instalado em `%APPDATA%\Python\Python313\site-packages`.
3. **O gap é real:** `grep -E "storage\.from|whisper|ffmpeg|transcri|getTenantClient" src/` →
   zero ocorrências. Nenhum bucket de Storage existe no projeto Supabase (`/storage/v1/bucket`
   → `[]`).
4. **O bug do §4.1 está acontecendo agora:** 30 anúncios em `ads_minerados`, 16 com vídeo,
   minerados em 21–22/07 — ou seja, 4–5 dias atrás, no limite da validade do `oe=` do CDN.
5. **A env real é `SCRAPE_CREATORS_API_KEY`** (o `CLAUDE.md` documenta `SCRAPECREATORS_API_KEY`;
   o código usa a primeira). Corrigir o `CLAUDE.md` faz parte da entrega.

---

## 3. Decisões tomadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Transcrição em worker local Python, com fila modelada desde o dia 1** | Custo R$ 0 e as dependências já estão instaladas. A fila é o que permite trocar por API (Groq/Deepgram) sem reescrever o módulo — basta outro consumidor da mesma tabela. |
| D2 | **Fase 0 salva só a imagem na mineração; vídeo sob demanda** | A imagem é o que quebra visível no card e custa ~100 KB. Vídeo custa ~4 MB e só importa nos anúncios escolhidos. Evita encher o Storage com anúncio que será deletado. |
| D3 | **Escopo desta rodada = fases 0–5** | Entrega o módulo funcionando para uso próprio. BYOK/billing entram depois, com evidência. |
| D4 | **A rota nunca processa mídia — só enfileira** | `maxDuration` é limite de plataforma (300 s). 8 vídeos passam de 20 min. Não é otimizável; é categoria errada de lugar. |
| D5 | **O agente devolve JSON por seção; o `.md` e o `.html` saem de um montador determinístico** | Mesmo padrão de `src/lib/tracking/fop.ts`. O `.html` precisa de estrutura e de URLs absolutas do Storage, e um campo `em_aberto[]` de primeira classe transforma a regra "o dossiê não preenche slot em aberto" em schema, em vez de depender do modelo se comportar. |
| D6 | **`getTenantClient()` desde a primeira linha** | §11.4 do handoff. Hoje é um arquivo de 10 linhas que devolve o `supabaseServer` atual — custo praticamente zero, e no dia em que o BYOK for construído muda um arquivo em vez de sessenta. Mantido mesmo com o app sendo pessoal (D8), justamente por ser barato: a apólice custa menos que o sinistro. |
| D7 | **Página nova `/autopsia`, com entrada em `/mineracao`** | Mineração é lista larga que se percorre; autópsia é peça longa que se lê. Não vai em `/producao`, que é o kanban da nossa produção. |

### D8 — Uso pessoal: guardar o material completo, sem hedge

**Decisão do Fernando em 27/07:** este app é de **uso pessoal**, roda no Supabase dele, e o
módulo deve **guardar no banco/Storage o que for melhor para o trabalho** — vídeo completo,
frames, transcrições, sem meio-termo.

Isso encerra a ressalva que o §10.4 do handoff levantava (redistribuição de material de
terceiros): baixar criativo alheio para **pesquisa própria** é uso interno, e é o que está
sendo construído. Bucket `criativos` **público** é aceitável — a UI precisa exibir e o custo
de URL assinada não se paga aqui.

A pergunta só volta a existir no dia em que o acervo for servido a **cliente pagante** — aí
deixa de ser pesquisa e vira distribuição. Registrado na fase 6 (§10), não bloqueia nada
agora e não deve gerar cautela defensiva no código desta rodada.

---

## 4. Arquitetura

```
/mineracao ──[Autopsiar este anunciante]──┐
                                          ├──→ POST /api/autopsia/criar
/autopsia  ──[Nova autópsia: page_id/URL]─┘      │  ScrapeCreators company/ads (paginado)
                                                 │  dedup por creativeKeyFromSnap()
                                                 ↓
                              autopsias · autopsia_criativos · autopsia_jobs
                                                 ↓  polling 5 s
                              scripts/worker-autopsia.py   (máquina do Fernando)
                                 download (Referer: facebook.com) → Storage
                                 ffmpeg → 3 grades de frames (hook · meio · CTA)
                                 faster-whisper medium → transcrição + SRT
                                                 ↓  escreve de volta
                              POST /api/autopsia/dossie  → agente `autopsia`
                                                 ↓  JSON por seção → montador
                                          dossie_md  +  dossie.html
                                                 ↓  POST /api/autopsia/publicar
                                        Cloudflare Pages (link compartilhável)
```

### Unidades e responsabilidades

| Arquivo | Faz | Depende de |
|---|---|---|
| `supabase/migrations/20260726120000_add_storage_paths_ads_minerados.sql` | colunas de Storage em `ads_minerados` (fase 0) | — |
| `supabase/migrations/20260726120100_create_autopsia.sql` | 3 tabelas + índices + RLS + Realtime; idempotente (`IF NOT EXISTS`) | — |
| `src/lib/supabase-tenant.ts` | `getTenantClient()` — porta única para dados de tenant | `supabase-server` |
| `src/lib/storage.ts` | `salvarMidia({ url, caminho, bucket })` → baixa do CDN com `Referer` e devolve URL pública; `garantirBucket()` | `getTenantClient` |
| `src/lib/autopsia/coleta.ts` | `coletarAnunciante(pageId)` → pagina a ScrapeCreators, deduplica, normaliza; `parsePageId(entrada)` aceita `page_id` puro ou URL da Ad Library | `minerador-media`, `creativeKeyFromSnap` |
| `src/lib/autopsia/dossie.ts` | `montarMarkdown(dados)` e `montarHtml(dados)` — determinísticos, sem IA | — |
| `scripts/worker-autopsia.py` | consome a fila: download → frames → transcrever | `_env` local, ffmpeg, faster-whisper |
| `src/app/api/autopsia/criar/route.ts` | cria a autópsia, grava criativos, enfileira os jobs | `coleta`, `getTenantClient` |
| `src/app/api/autopsia/dossie/route.ts` | chama o agente `autopsia`, monta `.md`/`.html`, salva | `agents/`, `dossie` |
| `src/app/api/autopsia/publicar/route.ts` | publica o `.html` no Cloudflare Pages | `cloudflare` |
| `src/app/autopsia/page.tsx` | lista de autópsias (Realtime) + criar nova | — |
| `src/app/autopsia/[id]/page.tsx` | abas Criativos · Transcrições · Frames · Dossiê · Baixar | — |
| `agentes/autopsia/{AGENTS.md,SKILL.md,_agente.json}` | o cérebro do 10º agente | sync em `/agents` |

`creativeKeyFromSnap()` está hoje **dentro** de `src/app/api/mineracao/run/route.ts`. Como
`coleta.ts` precisa da mesma função, ela sai para `src/lib/minerador-media.ts` (que já é puro
e já é compartilhado entre rota e client) e a rota de mineração passa a importar de lá. É uma
extração, não uma reescrita: o comportamento não muda.

---

## 5. Schema

```sql
-- Fase 0 — em ads_minerados (colunas novas, nada é substituído)
alter table ads_minerados
  add column if not exists image_storage_path text,   -- URL pública no Storage
  add column if not exists video_storage_paths text[];

-- Uma autópsia = um anunciante analisado numa data
create table if not exists autopsias (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  page_name text,
  page_profile_pic_url text,
  status text not null default 'coletando',  -- coletando|processando|montando|pronta|erro
  progresso int not null default 0,          -- 0-100
  total_anuncios int default 0,              -- antes da dedup
  total_criativos int default 0,             -- depois da dedup
  total_transcritos int default 0,
  dossie_json jsonb,                         -- saída crua do agente
  dossie_md text,
  dossie_html_url text,
  erro text,
  criado_em timestamptz default now(),
  concluido_em timestamptz
);

-- Um criativo único dentro de uma autópsia
create table if not exists autopsia_criativos (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  ad_archive_id text,          -- procedência; a copy vive em ads_minerados/raw_json
  creative_key text not null,  -- mesma função do minerador
  tipo text not null default 'video',   -- video|imagem
  duracao_s int,
  dias_no_ar int,              -- de start_date/end_date
  is_active boolean,
  ad_copy text,                -- snapshot da copy no momento da coleta
  cta_text text,
  link_url text,
  url_origem text,             -- CDN do FB (expira ~5 dias)
  storage_path text,           -- o arquivo de verdade
  transcricao text,
  transcricao_srt text,
  frames_paths text[],
  raw_json jsonb,
  criado_em timestamptz default now(),
  unique (autopsia_id, creative_key)
);

-- A fila
create table if not exists autopsia_jobs (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  criativo_id uuid references autopsia_criativos(id) on delete cascade,
  tipo text not null,                        -- download|frames|transcrever
  status text not null default 'pendente',   -- pendente|processando|concluido|erro
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index if not exists idx_autopsia_jobs_fila on autopsia_jobs (status, criado_em);
```

RLS ligada com policies públicas e Realtime nas três tabelas — mesma convenção do resto do
projeto (dívida conhecida, some quando houver auth).

**Não duplicar em `autopsia_criativos` o que já está em `ads_minerados`.** As exceções
`ad_copy`/`cta_text`/`link_url` são deliberadas: o anunciante autopsiado pode não ter nenhum
anúncio em `ads_minerados` (autópsia por `page_id` avulso), e a copy no momento da coleta é
um dado histórico do dossiê, não um espelho a manter sincronizado.

---

## 6. Fluxo de dados

### 6.1 Coleta (`POST /api/autopsia/criar`)

Entrada: `{ page_id }` ou `{ url }` da Ad Library, ou `{ ad_minerado_id }` (botão em `/mineracao`).

1. `parsePageId()` normaliza a entrada.
2. Pagina `company/ads` com `cursor` até acabar ou atingir **10 páginas (300 anúncios)** —
   teto de segurança contra anunciante gigante consumindo créditos.
3. Deduplica por `creativeKeyFromSnap()`. Guarda `total_anuncios` e `total_criativos`; a razão
   entre os dois é sinal de leitura (copy travada + criativo em rotação).
4. Calcula `dias_no_ar` de `start_date`/`end_date` e a duração do vídeo pelo parâmetro `efg`
   da URL do CDN (base64 → `duration_s`, `asset_age_days`) quando presente — é de graça,
   já vem na URL, e o worker corrige com o valor real do ffprobe depois.
5. Insere `autopsias` + `autopsia_criativos` e enfileira **um job `download` por criativo**.
6. Responde imediatamente com o `id`. A UI acompanha por Realtime.

Frames e transcrição **não** são enfileirados aqui: entram quando o `download` conclui, porque
dependem do arquivo existir.

### 6.2 Worker (`scripts/worker-autopsia.py`)

Loop: pega o job mais antigo pendente, marca `processando`, executa, marca `concluido`.

- **download** — `urllib` com `Referer: facebook.com` (sem o header, 403), sobe para
  `criativos/autopsia/<autopsia_id>/<creative_key>.mp4`, grava `storage_path`, e **enfileira
  `frames` + `transcrever`** para aquele criativo.
- **frames** — `ffmpeg` extrai 9 frames em cada terço do vídeo e monta 3 grades 3×3
  (`grid-hooks`, `grid-meio`, `grid-cta`), espelhando o que o método manual produziu. Sobe as
  grades e grava `frames_paths`.
- **transcrever** — `faster-whisper` `medium`, `device=cpu`, `compute_type=int8`,
  `language=pt`, `vad_filter=True`, `condition_on_previous_text=False` — os mesmos parâmetros
  do `transcrever.py` validado. Grava `transcricao` (corrido) e `transcricao_srt`
  (com timestamps), e incrementa `total_transcritos`.

Depois de cada job, recalcula `autopsias.progresso` e, quando todos concluem, marca
`status='processando' → 'montando'` liberando o botão de gerar o dossiê na UI.

O worker lê `.env.local` pelo mesmo caminho de `scripts/_env.mjs` (versão Python equivalente)
e usa a **service_role** — é local, server-side, não passa pelo browser.

### 6.3 Dossiê (`POST /api/autopsia/dossie`)

Monta o contexto: dados do anunciante, tabela de criativos (duração, dias no ar, ativo),
**todas as transcrições** e a copy de cada anúncio. Chama `gerarJSONComAgente()` com o cérebro
do agente `autopsia` + um contrato de saída JSON com as 9 seções:

```
0 sumario_executivo   3 anatomia (funil, blocos de copy, angulos, timings)
1 alvo                4 vulnerabilidades
2 metodo_coleta       5 modelar_x_rejeitar   6 plano   7 restricoes   8 anexos
+ em_aberto[]         ← slots que o material NÃO permite concluir
```

`montarMarkdown()` e `montarHtml()` transformam isso em arquivos. O `.html` é **único e
autocontido** (CSS inline, sem CDN) com **URLs absolutas do Storage** para frames — a
armadilha do §7 do handoff, já que o original usava caminhos relativos de pasta.

Duas regras de conteúdo viram schema, não instrução solta:
- **O dossiê não decide estratégia.** O que o material não sustenta vai para `em_aberto[]` e
  é renderizado como pauta, não preenchido por inferência.
- **`modelar_x_rejeitar` é obrigatório.** Um relatório que só descreve não protege ninguém.

### 6.4 Publicar (`POST /api/autopsia/publicar`)

`deployHtmlToPages({ slug: 'autopsia-<slug do anunciante>-<sufixo do id>', html })` →
grava `dossie_html_url`. Reusa integralmente o helper já validado do Designer.

---

## 7. Tratamento de erro

| Situação | Comportamento |
|---|---|
| Job falha | `tentativas++`; a partir de 3, `status='erro'` com a mensagem. A autópsia **continua** com os outros criativos. |
| Criativo com erro | Aparece no dossiê como criativo não transcrito, com o motivo. Não é omitido — omitir faria a contagem mentir. |
| URL do CDN expirada no download | Erro claro ("URL expirada — recoletar o anunciante"), não retry infinito. |
| ScrapeCreators fora do ar | `criar` devolve 502 com status e corpo, como já faz `mineracao/run`. |
| Agente sem crédito | `gerarJSONComAgente` já cai para OpenAI sozinho. |
| Worker parado | Jobs ficam `pendente` e a UI mostra "worker offline?" se o job mais antigo passar de 10 min sem `iniciado_em`. Sem isso, a tela fica travada em 0% sem explicação. |
| Anunciante sem vídeo | Autópsia roda só com imagens e copy; o dossiê registra a ausência. |

---

## 8. Verificação

Não há suíte de testes no projeto. Validação = `npx tsc --noEmit` + execução real.

**Prova principal, com gabarito conhecido:** rodar a autópsia automatizada no **mesmo
anunciante do low-ticket** — *Alimento Sagrado*, `page_id 1130979790090955`. O método manual
produziu, em 24/07: **18 anúncios → 8 criativos únicos**, durações de 31 s a 130 s, funil
Click-to-WhatsApp, e as 8 transcrições estão salvas em
`low-ticket/alimento-sagrado/transcricoes/`.

Critérios de aceite:
1. A coleta encontra os anúncios ativos e deduplica para **8 criativos únicos** (tolerância:
   a operação mudou desde 24/07, então divergência é aceitável **se explicável** por anúncio
   novo/removido — não por falha de dedup).
2. As durações batem com `v0_…_31s` … `v7_…_130s`.
3. As transcrições batem em conteúdo com os `.txt` existentes.
4. Os 3 grids de frames são gerados e abrem.
5. O dossiê tem as 9 seções, `modelar_x_rejeitar` preenchida e nenhum slot inventado.
6. O `.html` publicado abre no link e **mostra os frames** (prova das URLs absolutas).

Verificações menores: bucket criado; backfill preserva os 30 anúncios atuais; card de
`/mineracao` continua exibindo imagem depois de a URL do CDN expirar; `/autopsia` GET 200.

---

## 9. Ordem de implementação

| Fase | Entrega | Vale sozinha? |
|---|---|---|
| **0** | Bucket + `storage.ts` + `getTenantClient()` + colunas + mineração salvando imagem + **backfill dos 30 atuais** | Sim — conserta bug existente |
| **1** | Migration das 3 tabelas + `coleta.ts` + `/api/autopsia/criar` + `/autopsia` + `/autopsia/[id]` + botão em `/mineracao` | Esqueleto navegável |
| **2** | Fila + worker: `download` e `frames` | Vídeos e grades na tela |
| **3** | Worker: `transcrever` | O material que dá valor |
| **4** | `agentes/autopsia/` + `/api/autopsia/dossie` + montador `.md` | O entregável |
| **5** | `montarHtml()` + `/api/autopsia/publicar` | Compartilhar por link |

A fase 0 roda **antes de tudo** e o backfill é a primeira coisa dentro dela: as URLs atuais
expiram esta semana.

---

## 10. Fora de escopo (fase 6, registrado para não se perder)

> Nada aqui é premissa desta rodada. O app é de uso pessoal (D8); esta lista só existe para
> o dia em que essa premissa mudar — e para que ninguém confunda "não construído" com
> "esquecido".

- BYOK completo: banco de controle, credenciais cifradas, provisionamento por SQL colado,
  `synapse_schema_version`.
- Multi-tenant real (`user_id` + RLS de verdade), limites por plano, billing, retenção.
- Rever a hospedagem do acervo de terceiros **se** o material passar a ser servido a cliente
  pagante (deixa de ser pesquisa própria — ver D8).
- `/configuracoes` funcional — hoje é casca (inputs sem binding, sem rota de salvar, botão
  escrito ".env"). Contém um **Meta App ID real hard-coded** em
  `src/app/configuracoes/page.tsx`, que deve ser removido antes de qualquer cliente.
- Decidir entre `/configuracoes` e `/settings` (duas telas para a mesma coisa).
- Transcrição por API (Groq/Deepgram) como segundo consumidor da fila.
