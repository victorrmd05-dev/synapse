# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🧠 Alavanca Synapse — CLAUDE.md
> Guia definitivo para o Claude Code operar neste projeto. Leia este arquivo COMPLETO antes de qualquer ação.
> Última atualização: rebranding para Alavanca Synapse + diagnóstico completo do estado real do código.

---

## 🚨 GIT — Conta e Repositório CORRETOS (LEIA ANTES DE QUALQUER COMMIT/PUSH)

**A conta GitHub correta deste projeto é `victorrmd05-dev` — NUNCA `Thuglife22741`.**

- **Repo do CÓDIGO (este app Next.js):** `https://github.com/victorrmd05-dev/synapse` (privado).
  É para onde vão commits e pushes do código da aplicação. O `origin` local já aponta para cá.
- **Identidade do git (já configurada local no repo):**
  `user.name = victorrmd05-dev`, `user.email = victor.rmd.05@gmail.com` (de `.env.local`:
  `GITHUB_USERNAME` / `GITHUB_EMAIL`).
- **Autenticação:** use o `GITHUB_TOKEN` do `.env.local` (PAT do victor). O `origin` está com
  o token embutido na URL (`https://victorrmd05-dev:<GITHUB_TOKEN>@github.com/...`).
  **NUNCA commite o token** — ele vive só no `.env.local` e no `.git/config` local.
- **⚠️ Armadilha que já causou erro:** o Git Credential Manager do Windows tinha a credencial
  da conta ERRADA (`Thuglife22741`) cacheada para `github.com`, e o `origin` antigo apontava
  para `Thuglife22741/alavanca-ai-core` com o token do Thuglife na URL. Por isso pushes iam
  para a conta errada. **Antes de empurrar, confira `git remote -v` e `git config user.email`.**

**NÃO confundir com os repos de AGENTES** (`victorrmd05-dev/agents` e
`victorrmd05-dev/agents_alavanca_synapse`): esses contêm só os `.md` do "cérebro" dos agentes
(pastas `agents/`, `skills/`) e são lidos via sync — **não** é onde vai o código do app.

---

## ⚠️ Estado Real do Código (verificado contra o código — leia antes de confiar no resto deste arquivo)

Boa parte deste CLAUDE.md descreve a **intenção/arquitetura desejada**. O código já
divergiu em pontos importantes. Onde houver conflito, **o código abaixo manda**:

1. **Nome do pacote ainda é `metascale-app`** (`package.json`) — herança do monorepo
   anterior. Não é bug, só não foi renomeado.

2. **Não existe `npm run type-check`.** Scripts reais: `dev`, `build`, `start`, `lint`.
   Para checagem de tipos use `npx tsc --noEmit`.

3. **Copywriting NÃO roda na Anthropic.** `src/app/api/copywriting/generate/route.ts`
   usa o **SDK da OpenAI** apontando para **OpenCode Zen** (`https://opencode.ai/zen/v1`),
   modelo `deepseek-v4-flash-free`, via `OPENCODE_API_KEY`. O padrão "Anthropic em todo
   agente" descrito mais abaixo é aspiracional — confira o provider real de cada rota
   antes de assumir. O `src/lib/anthropic.ts` (usado só no diagnóstico Meta Ads) roda
   `claude-3-5-sonnet-20241022`, não `claude-sonnet-4-6`.

4. **Existem DOIS sistemas de configuração de agente paralelos e conflitantes** —
   este é o maior risco de confusão do repo:
   - **Sistema A — sync do GitHub (markdown):** tabela `agentes_config`, rota
     `src/app/api/agents/sync/route.ts`, helper `src/lib/agents/buildSystemPrompt.ts`
     com `getAgentConfig(slug)` que retorna `{ agents_md, soul_md, tools_md, skill_md, ... }`.
     Indexado por `slug` (português). É o que as rotas de IA (ex: copywriting) consomem.
   - **Sistema B — config editável pela UI (JSONB):** tabelas `agent_configurations` +
     `agent_files`, server actions `src/app/actions/agentConfig.ts` + `agentFiles.ts`,
     páginas em `src/app/agents/[agentRole]/`. Indexado por `agent_role` (inglês), com
     `getAgentConfig(agentRole)` retornando `{ identity_config, model_config, ... }`.
   - **Atenção ao import:** existem DUAS funções `getAgentConfig` com o mesmo nome e
     assinaturas/tabelas diferentes — `@/lib/agents/buildSystemPrompt` (Sistema A) vs
     `@/app/actions/agentConfig` (Sistema B). Importar a errada quebra silenciosamente.

5. **Dois clients Supabase distintos — nunca trocar:**
   - `src/lib/supabase.ts` → **anon key**, respeita RLS, usar em `"use client"` (browser).
   - `src/lib/supabase-server.ts` (`supabaseServer`) → **service_role key**, ignora RLS,
     APENAS server-side (Route Handlers, Server Actions, Server Components). Nunca importar
     no browser. Lança erro no boot se `SUPABASE_SERVICE_ROLE_KEY` não estiver setada.

6. **Migrations vivem em `supabase/migrations/`** (`*_create_agent_files.sql`,
   `*_create_agent_configurations.sql`). As tabelas do Sistema B têm RLS com policies
   públicas (read/insert/update/delete liberados) — não há auth real ainda.

7. **Variável de ambiente extra real:** `OPENCODE_API_KEY` (além das já listadas adiante).

8. **Rotas existentes além das listadas na tabela de páginas:** `/agents` e
   `/agents/[agentRole]/{configuration,instructions,skills}` (link "Agents Config" na
   Sidebar, separado de `/configuracoes`), `/como-funciona`, `/settings`, e APIs em
   `src/app/api/{ai/diagnostic,meta/sync,meta/accounts,simulations}`.

---

## 🔁 Processo OBRIGATÓRIO — ao validar cada tarefa

Sempre que uma tarefa for **validada** (testada e funcionando, não só escrita), antes de
considerar concluída, execute os dois passos de documentação:

1. **Atualizar `NOTES.md`** (na raiz) — o diário de bordo do projeto: o que foi feito, por quê,
   bugs encontrados e como foram resolvidos, e os próximos passos. Manter sempre fiel ao estado real.
2. **Atualizar o segundo cérebro (nexus.ai via MCP Obsidian)** — a nota
   `02_Projetos/Alavanca_Synapse.md` no vault, mantendo também o `Alavanca_Synapse.canvas`
   e as skills relacionadas (`01_Global_Skills/`) em dia. O objetivo é um cérebro
   **auto-evolutivo**: cada aprendizado validado vira conhecimento permanente e linkado.

Convenções do vault: projetos em `02_Projetos/`, skills globais em `01_Global_Skills/`
(seguindo `04_Templates/Template_Skill.md`), índice em `02_Projetos/00_Mapa_Mestre.md`.
Não duplicar notas — atualizar a existente.

---

## 🏢 Contexto do Negócio

**Alavanca Synapse** é a plataforma própria de orquestração de agentes da Alavanca AI (agência de marketing digital), com 8 agentes especializados operando em sincronia — substituindo o Paperclip (que era engessado demais para este caso de uso). A ideia é: **mesma filosofia de "empresa de agentes", mas no código e banco de dados do próprio Fernando, sem dependência de plataforma externa.**

O nome "Synapse" reflete a arquitetura real: os 8 agentes funcionam como neurônios de um mesmo organismo, disparando em sequência (e às vezes em paralelo) através do Supabase como sinapse central — diferente do Paperclip, que tratava cada agente como uma execução isolada e genérica.

| # | Agente | Responsabilidade | Tabela Supabase |
|---|--------|-----------------|-----------------|
| 01 | CEO Alavanca AI | Aprovações de alto nível (representa o usuário) | — |
| 02 | CTO | Infraestrutura, chaves de API, suporte técnico aos outros agentes | `agentes_config` |
| 03 | Minerador | Scraping de anúncios validados via Meta Ad Library (ScrapeCreators) | `ads_minerados` |
| 04 | Copywriting | Copy de anúncios e páginas de vendas | `workflow_copywriting` |
| 05 | Revisor | QA das copies geradas — aprova ou pede revisão | `workflow_copywriting` (revisor_ok) |
| 06 | Designer-Webmaster | Criação e deploy de landing pages | `workflow_design` |
| 07 | Video-Maker | Criação de vídeos criativos via Higgsfield API | `workflow_video` |
| 08 | Gestor-Meta-Ads | Gestão e otimização de campanhas de tráfego pago | `campanhas_meta_ads` (ver Meta Ads abaixo) |

**Pipeline de produção:**
```
ads_minerados → [CEO aprova] → campanhas_producao → workflow_copywriting
  → [Revisor aprova] → workflow_design → [Designer gera HTML + deploy]
  → workflow_video → [Video-Maker gera criativo] → Gestor-Meta-Ads sobe campanha
```

---

## 🏗️ Arquitetura e Stack

- **Framework:** Next.js 14 App Router (`src/app/`)
- **Linguagem:** TypeScript strict
- **Estilo:** Tailwind CSS — design system dark glassmorphism (tokens na seção Design System)
- **Banco de Dados:** Supabase (PostgreSQL + Realtime via `postgres_changes`)
- **IA:** Anthropic API (`claude-sonnet-4-6`) via `src/lib/anthropic.ts`
- **Monorepo único** — tudo na raiz. NUNCA criar subpastas isoladas como `workspace/` ou `packages/`

### Variáveis de Ambiente obrigatórias (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
META_ADS_API_TOKEN=
SCRAPECREATORS_API_KEY=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
GITHUB_TOKEN=
HIGGSFIELD_API_KEY=
TELEGRAM_BOT_TOKEN=
```
**NUNCA hardcode chaves no código.** Sempre via `process.env`. Nunca commitar `.env.local`.

---

## 🗄️ Banco de Dados — Tabelas e Relacionamentos

```sql
ads_minerados (id, ad_archive_id, page_name, ad_title, ad_copy, image_url,
               video_urls[], score_escala, raw_json, data_mineracao, ...)
      ↓ aprovado pelo CEO (botão "Aprovar Anúncio para Produção" em /mineracao)
campanhas_producao (id, ad_minerado_id, nome_projeto, status_geral, data_criacao)
      ↓ agente Copywriting gera (precisa ser conectado — ver Prioridade 1)
workflow_copywriting (id, campanha_id, tipo_copy, conteudo_texto, meta_ads_copy,
                      atributos_json, revisor_ok, notas_revisao,
                      data_criacao, data_aprovacao)
      ↓ agente Revisor aprova (revisor_ok = true, data_aprovacao preenchida)
workflow_design (id, campanha_id, tipo_design, url_recurso, codigo_html,
                 revisor_ok, notas_revisao, data_criacao, data_aprovacao)
      ↓ deploy real da LP (precisa ser implementado — ver Prioridade 3)
workflow_video (id, campanha_id, tipo_video, url_video_download,
                revisor_ok, notas_revisao, data_criacao, data_aprovacao)
```

**Tabela `agentes_config`** — arquitetura GitHub → Supabase (ver seção dedicada abaixo):
A fonte da verdade dos agentes é o repositório **github.com/victorrmd05-dev/agents**
(que já contém `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `TOOLS.md` por agente e
`SKILL.md` por skill). A tabela `agentes_config` é um **cache sincronizado** desse
repositório, atualizado via botão "Sincronizar Agentes" em `/configuracoes`
(rota `POST /api/agents/sync`). Nunca editar o conteúdo markdown direto no
Supabase de forma permanente — editar no GitHub, commitar, sincronizar de novo.

```sql
CREATE TABLE IF NOT EXISTS agentes_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  github_agent_path TEXT,
  github_skill_path TEXT,
  agents_md TEXT,
  soul_md TEXT,
  heartbeat_md TEXT,
  tools_md TEXT,
  skill_md TEXT,
  modelo TEXT DEFAULT 'claude-sonnet-4-6',
  max_tokens INTEGER DEFAULT 4000,
  ativo BOOLEAN DEFAULT true,
  ultimo_sync_em TIMESTAMP WITH TIME ZONE,
  ultimo_commit_sha TEXT,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
Ver arquivo completo: `setup_agentes_config_v2.sql`.

### Padrão de query Supabase com Realtime (já usado em todas as páginas)
```typescript
const channel = supabase.channel('nome_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'nome_tabela' }, () => {
    fetchDados();
  })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

---

## 🔄 Arquitetura de Sincronização GitHub → Supabase (substitui o Paperclip)

### Por que isso existe
O Paperclip prendia a edição de instruções de agentes dentro da sua UI proprietária.
Aqui, a fonte da verdade é **github.com/victorrmd05-dev/agents** — um repositório
que já existe com a estrutura:
```
agents/
  ├── alavanca-ceo/  (AGENTS.md, SOUL.md, HEARTBEAT.md)
  ├── cto/           (AGENTS.md, TOOLS.md)
  ├── copywriting/   (AGENTS.md)
  ├── revisor/       (AGENTS.md)
  ├── designer-webmaster/ (AGENTS.md)
  ├── video-maker/   (AGENTS.md)
  ├── gestor-meta-ads/ (AGENTS.md)
  └── minerador/     (AGENTS.md, HEARTBEAT.md)
skills/
  ├── alavanca-ceo-skill/SKILL.md
  ├── infra-tech-skill/SKILL.md
  ├── minerador-skill/SKILL.md
  ├── copywriting/SKILL.md
  ├── quality-check-skill/SKILL.md
  ├── webmaster-skill/SKILL.md
  ├── video-maker-skill/SKILL.md
  └── gestor-meta-ads/SKILL.md
```

**Importante:** os nomes de pasta em `agents/` e `skills/` NÃO seguem a mesma
convenção (ex: `designer-webmaster` ↔ `webmaster-skill`, `revisor` ↔
`quality-check-skill`). Por isso o mapa `AGENT_MAP` na rota de sync é
**explícito**, não adivinhado por convenção de nome. Se renomear pastas no
GitHub, atualize o `AGENT_MAP` também.

### Fluxo de trabalho do dia a dia
1. Edita os `.md` localmente (ou em terminal com IA, como você já faz)
2. Comita e dá push pro repositório `victorrmd05-dev/agents`
3. Abre `/configuracoes` no Alavanca Synapse, clica em "Sincronizar Agentes"
4. A rota `POST /api/agents/sync` busca os arquivos atualizados via GitHub
   Contents API e faz upsert na tabela `agentes_config`
5. Toda próxima chamada a um agente já usa o conteúdo atualizado

### Arquivos de referência já implementados (usar como base, não reinventar)
- `setup_agentes_config_v2.sql` — schema da tabela + seed dos 8 agentes (sem `system_prompt` pronto — conteúdo vem do sync)
- `api_agents_sync_route.ts` → colar em `src/app/api/agents/sync/route.ts`
- `buildSystemPrompt.ts` → colar em `src/lib/agents/buildSystemPrompt.ts`

### Como montar o system prompt final ao chamar um agente
```typescript
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';

const config = await getAgentConfig('copywriting');
if (!config) {
  return Response.json({ error: 'Agente não sincronizado ou inativo' }, { status: 400 });
}

const systemPrompt = buildSystemPrompt(config); // concatena SOUL + AGENTS + TOOLS + SKILL

const response = await anthropic.messages.create({
  model: config.modelo,
  max_tokens: config.max_tokens,
  system: systemPrompt,
  messages: [{ role: 'user', content: promptDoUsuario }]
});
```

### Variável de ambiente adicional
```
GITHUB_TOKEN=   # Personal Access Token com permissão de leitura no repo
                # victorrmd05-dev/agents. Sem token, a sync ainda funciona
                # (repo é público) mas com rate limit anônimo do GitHub
                # (60 req/hora em vez de 5000 req/hora).
```

### Nota sobre a integração nativa "Supabase + GitHub"
Essa integração existe no painel do Supabase, mas serve para outra coisa:
versionar **migrations de schema** (criar tabelas/colunas), não para sincronizar
conteúdo de negócio como instruções de agentes. Não é a ferramenta certa para
este caso — por isso construímos a rota `/api/agents/sync` própria.

---

## 🎨 Design System (OBRIGATÓRIO seguir — já implementado, só replicar)

```
bg-[#0D0D14]            → fundo global
bg-surface              → card/painel
bg-surface-elevated     → hover state / bordas
border-surface-elevated → bordas padrão
text-text-primary / text-white → texto principal
text-secondary          → texto secundário
bg-primary              → roxo (#6366f1) — ações principais
bg-primary-hover        → hover do primário
text-status-green       → verde (#22c55e)
text-status-yellow      → amarelo (#eab308)
text-status-red         → vermelho (#ef4444)
animate-pulse           → indicadores de status ao vivo
```

### PROIBIDO no design
- Fundo branco ou claro
- Cores fora do design system acima
- Borders grossas (`border`, nunca `border-2`)
- Gradientes arco-íris, animações excessivas, "AI Slop"

---

## 📄 Páginas Existentes e Status REAL (diagnóstico atualizado)

| Rota | Status | O que já funciona | O que falta |
|------|--------|--------------------|--------------|
| `/` | ✅ Completo | Dashboard home | — |
| `/mineracao` | ✅ Completo | Lista `ads_minerados`, modal estilo Facebook, aprovar → `campanhas_producao`, excluir | — |
| `/producao` | ✅ Completo | Kanban de `campanhas_producao` com Realtime | — |
| `/copywriting` | ⚠️ UI pronta, motor ausente | Lê `workflow_copywriting`, parseia gancho/mecanismo/CTA, exibe fila | **Não existe geração via IA.** Falta botão "Gerar Copy com IA" chamando `/api/copywriting/generate` |
| `/revisor` | ⚠️ UI pronta, lógica parcial | Lê itens com `revisor_ok = true` e `data_aprovacao = null`, editor TipTap funcional | Falta: fluxo de aprovação real (update no Supabase), acionar agente Revisor IA, botão "pedir revisão" que regenera copy |
| `/design` | ⚠️ UI pronta, deploy ausente | Lê `workflow_design`, preview, botão "Aprovar para Tráfego" (Rocket) | **Não existe deploy real.** Botão não chama nenhuma API de deploy. Falta geração de HTML via agente Designer + deploy Cloudflare/GitHub |
| `/video-maker` | ⚠️ UI pronta, API ausente | Lê `workflow_video`, fila com tabs roteiro/etc | Falta integração real com Higgsfield API |
| `/meta-ads/dashboard` | ✅ Completo | Dashboard com Anthropic audit (`ClaudeAdsHealth.tsx`) | — |
| `/meta-ads/campanhas` | ✅ Completo | Lista campanhas Meta | — |
| `/meta-ads/simulador` | ✅ Completo | Simulador ROAS/CPA | — |
| `/configuracoes` | ⚠️ Apenas visual | Abas "Chaves de API (Agentes)", "Chaves Meta Ads", "Database" | **Não salva nada de fato.** Falta conectar a `agentes_config` e a tabela de secrets |

**Resumo do diagnóstico:** o problema não é falta de UI — é falta do "motor" por trás dos botões. As páginas parecem prontas mas são interfaces sem a chamada de API/IA implementada. É exatamente esse hiato que travava no Paperclip (que tentava fazer isso de forma genérica) e que vamos resolver direto no código, sob seu controle total.

---

## 🤖 Padrão de Implementação dos Agentes IA

### Padrão de Route Handler (usar para TODOS os agentes)
```typescript
// src/app/api/[agente]/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Buscar system_prompt da tabela agentes_config (NUNCA hardcoded)
    const { data: config, error: configError } = await supabase
      .from('agentes_config')
      .select('*')
      .eq('slug', 'copywriting')
      .eq('ativo', true)
      .single();

    if (configError || !config) {
      return Response.json({ error: 'Agente não configurado ou inativo' }, { status: 400 });
    }

    // 2. Chamar Anthropic
    const response = await anthropic.messages.create({
      model: config.modelo,
      max_tokens: config.max_tokens,
      system: config.system_prompt,
      messages: [{ role: 'user', content: body.prompt }]
    });

    const resultado = response.content[0].type === 'text' ? response.content[0].text : '';

    // 3. Salvar no Supabase
    // ... insert/update na tabela correspondente

    return Response.json({ resultado });
  } catch (err) {
    console.error('[api/copywriting] erro:', err);
    return Response.json({ error: 'Falha ao gerar copy' }, { status: 500 });
  }
}
```

### De onde vem o system prompt de cada agente
Não há mais "seeds" de prompt escritos à mão neste documento — o conteúdo real
vem do repositório `victorrmd05-dev/agents` (AGENTS.md + SOUL.md + TOOLS.md +
SKILL.md por agente), sincronizado via `/api/agents/sync` conforme detalhado na
seção **🔄 Arquitetura de Sincronização GitHub → Supabase** acima. Use
`getAgentConfig(slug)` + `buildSystemPrompt(config)` em todo Route Handler de
agente, em vez de hardcodar texto de prompt no código.

### CEO e CTO
Não geram conteúdo de marketing via IA diretamente — atuam como camada de
aprovação (CEO, representado pelo próprio Fernando nas telas de aprovação) e
suporte técnico (CTO, que pode validar configs/chaves antes de cada chamada
externa). Ambos já têm pasta própria no repositório de agentes e podem ser
chamados via IA também caso você queira automatizar relatórios/cobranças de
status (ver `HEARTBEAT.md` do `alavanca-ceo` no repositório — define gatilhos
autônomos de cobrança de status e preparação de pautas para o CEO humano).

---

## 🚀 Deploy de Landing Pages (gap crítico — prioridade 3)

### Estratégia com fallback em cadeia
```typescript
// src/app/api/deploy/route.ts
// 1. Tenta Cloudflare Pages
// 2. Se falhar, tenta GitHub Pages
// 3. Salva URL final em workflow_design.url_recurso
```

**Opção 1 — Cloudflare Pages:**
```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/deployments
Header: Authorization: Bearer {CLOUDFLARE_API_TOKEN}
```
⚠️ Histórico conhecido: essa API às vezes falha silenciosamente com a chave atual.
Implementar log detalhado de erro (status/body completo da resposta) para
diagnosticar antes de assumir que "não funciona".

**Opção 2 — GitHub Pages (fallback confiável):**
```
PUT https://api.github.com/repos/{owner}/{repo}/contents/lps/{slug}.html
Branch gh-pages → URL pública automática em {owner}.github.io/{repo}/lps/{slug}.html
```

**Opção 3 — Vercel API (alternativa simples, geralmente mais previsível que Cloudflare):**
```
POST https://api.vercel.com/v13/deployments
Body: { files: [{ file: 'index.html', data: htmlContent }], name: 'lp-alavanca-{slug}' }
```

**Recomendação:** comece pela Opção 2 (GitHub Pages) como fallback confiável e
deixe Cloudflare como tentativa otimista — assim você nunca fica bloqueado
esperando resolver o bug da Cloudflare.

---

## 🔌 Integrações Externas

### Meta Ads API + Mineração
- Token: `META_ADS_API_TOKEN`
- Mineração via ScrapeCreators (Facebook Ad Library): `SCRAPECREATORS_API_KEY`
- Endpoint de sync já existe: `src/app/api/meta/sync/route.ts`

### Higgsfield API (Video-Maker)
- Chave: `HIGGSFIELD_API_KEY`
- Endpoint: `https://api.higgsfield.ai/v1/generation`
- Salvar resultado em `workflow_video.url_video_download`

### Telegram Bot (Notificações CTO)
- Bot: HermesClipBot
- Notificar: aprovações, erros críticos, status de deploy
- Token: `TELEGRAM_BOT_TOKEN`

---

## ⚡ Tarefas Prioritárias (em ordem — peça ao Claude Code uma por vez)

### PRIORIDADE 1 — Conectar IA real em `/copywriting`
- Rodar `setup_agentes_config_v2.sql` no Supabase (cria tabela + seed de paths)
- Criar `src/app/api/agents/sync/route.ts` (conteúdo já pronto em `api_agents_sync_route.ts`)
- Criar `src/lib/agents/buildSystemPrompt.ts` (conteúdo já pronto)
- Rodar a sincronização uma vez (manualmente via `curl` ou botão temporário) para popular `agentes_config`
- Criar `src/app/api/copywriting/generate/route.ts` usando `getAgentConfig('copywriting')` + `buildSystemPrompt()`
- Adicionar botão "Gerar Copy com IA" na UI existente, chamando essa API
- Salvar resultado em `workflow_copywriting` (campos `conteudo_texto` e `meta_ads_copy`)

### PRIORIDADE 2 — Fechar fluxo real de `/revisor`
- Criar `src/app/api/revisor/review/route.ts` (chama agente Revisor IA, retorna score/notas)
- Botão "Aprovar" → `UPDATE workflow_copywriting SET revisor_ok = true, data_aprovacao = NOW()`
- Botão "Solicitar Revisão" → salva `notas_revisao`, aciona agente Copywriting de novo com o feedback como contexto
- Ao aprovar, atualizar `campanhas_producao.status_geral = 'Aprovado'`

### PRIORIDADE 3 — Deploy real em `/design`
- Criar `src/app/api/design/generate/route.ts` (agente Designer gera HTML, salva em `workflow_design.codigo_html`)
- Criar `src/app/api/deploy/route.ts` com fallback GitHub Pages → Cloudflare
- Conectar botão "Aprovar para Tráfego" (já existe, ícone Rocket) para de fato disparar o deploy
- Salvar URL pública resultante em `workflow_design.url_recurso`

### PRIORIDADE 4 — `/configuracoes` funcional
- Adicionar botão "🔄 Sincronizar Agentes" que chama `POST /api/agents/sync`
- Exibir o relatório de retorno (quais agentes sincronizaram OK, quais deram erro)
- Mostrar `ultimo_sync_em` de cada agente na lista (para saber se está desatualizado)
- Toggle `ativo` por agente direto na UI (update simples na tabela, não via GitHub)
- Visualização somente-leitura do conteúdo sincronizado (agents_md, soul_md, etc.) — edição de conteúdo deve ser feita no GitHub, não aqui

### PRIORIDADE 5 — Video-Maker e Gestor-Meta-Ads
- Integração real Higgsfield em `/video-maker`
- Lógica de sugestão de estrutura de campanha no Gestor-Meta-Ads (pode reaproveitar `ClaudeAdsHealth.tsx` como referência de padrão)

---

## 🛡️ Regras Críticas de Segurança

1. **NUNCA** commitar `.env.local` ou qualquer chave de API
2. **NUNCA** expor `ANTHROPIC_API_KEY` ou qualquer chave no client — sempre via Route Handler (`/api/`)
3. Toda chamada externa (Anthropic, Cloudflare, GitHub, Higgsfield, Meta) deve ter `try/catch` com erro tratado e logado
4. Supabase queries sempre com verificação de `error` antes de usar `data` (padrão já seguido no projeto)
5. Sanitizar inputs do usuário antes de enviar à IA (evitar prompt injection vindo de copy de concorrentes minerada)

---

## 🔧 Comandos Úteis

```bash
npm run dev          # Servidor local (porta 3000)
npm run build        # Build de produção (Next.js)
npm run start        # Servir o build de produção
npm run lint         # ESLint (next lint)
npx tsc --noEmit     # Checagem de tipos (NÃO existe script "type-check")
```
> Não há suíte de testes configurada (sem `test` no package.json). "Testar" aqui
> significa `npm run dev` + verificar a tela, ou `npm run build` para pegar erros de tipo/SSR.

---

## 📐 Padrão de Componente de Página (já usado em mineracao, producao, etc.)

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function NomePage() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDados();
    const channel = supabase.channel('nome_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nome_tabela' }, fetchDados)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchDados() {
    setLoading(true);
    const { data, error } = await supabase.from('nome_tabela').select('*').order('data_criacao', { ascending: false });
    if (!error && data) setDados(data);
    setLoading(false);
  }

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      {/* Header, título, grid de cards — seguir padrão visual do projeto */}
    </div>
  );
}
```

---

## 🔗 Referências

- **Repositório (código do app):** https://github.com/victorrmd05-dev/synapse (privado) — ver seção "🚨 GIT" no topo
- **Skills dos agentes:** `src/lib/ai-agents/skills/` (dezenas de SKILL.md especializados — usar como contexto extra)
- **Agentes detalhados:** `src/lib/ai-agents/agents/` (copy-writer.md, visual-designer.md, audit-meta.md, etc.)
- **Referências Meta Ads:** `src/lib/ai-agents/ads/references/meta-audit.md`

---

*"Métricas certas, escala garantida." — Alavanca Synapse*
