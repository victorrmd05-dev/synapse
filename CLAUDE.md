# CLAUDE.md

Guia do Claude Code neste repositório. **Este arquivo sobe em toda conversa** — mantenha-o
enxuto. O que é história vai para o [`NOTES.md`](NOTES.md); o que é instalação vai para o
[`README.md`](README.md). Aqui ficam só as regras que, se ignoradas, quebram alguma coisa.

---

## 🛑 REGRA Nº 1 — NUNCA COMMITAR SEM O FERNANDO PEDIR

**Não execute `git commit` nem `git push` por conta própria.** Edite, verifique, e **pare**.
Diga quais arquivos estão prontos e qual seria a mensagem — mas não execute.

Vale **inclusive dentro de fluxos automatizados**: execução de plano, subagentes, skills que
listam "commit" como passo. **Se o plano manda commitar, esta regra ganha** — pare e pergunte.
Ao despachar subagentes, repasse a regra.

**Por quê:** o Fernando é dev solo e quer controlar o que entra no histórico.

**Quando ele autorizar:** commit direto na `main`, sem branch e sem PR, a menos que peça.

---

## 🚨 GIT — a conta certa é `victorrmd05-dev`, NUNCA `Thuglife22741`

- **Repo do código:** `https://github.com/victorrmd05-dev/synapse`. O `origin` já aponta para lá.
- ⚠️ **O repo é PÚBLICO** (conferido na API do GitHub em 02/08/2026 — este arquivo dizia
  "privado" havia meses, e era falso). Decisão consciente do Fernando. **Consequência prática:
  tudo que entra no histórico é mundialmente legível e não dá para "desfazer" de verdade.**
  Redobre o cuidado com chave, token e dado de cliente antes de qualquer commit.
- **Identidade local:** `user.name = victorrmd05-dev`, `user.email = victor.rmd.05@gmail.com`.
- **Auth:** `GITHUB_TOKEN` do `.env.local`, já embutido na URL do `origin`. **Nunca commite o token.**
- ⚠️ **Armadilha real:** o Credential Manager do Windows já teve a credencial da conta ERRADA
  cacheada, e pushes foram para o repo errado. **Antes de empurrar, confira `git remote -v` e
  `git config user.email`.**

Não confundir com os repos de **agentes** (`victorrmd05-dev/agents`,
`agents_alavanca_synapse`): esses só têm os `.md` do "cérebro", não o código do app.

---

## 💸 Política de custo — o default é GRATUITO

- **Provider padrão = OpenCode Zen** (`src/lib/opencode.ts`, `chatComZen`), endpoint compatível
  com OpenAI, modelo `deepseek-v4-flash-free`, via `OPENCODE_API_KEY`. **Não gera fatura.**
- **Provider pago só por escolha explícita**, nunca por fallback silencioso. Hoje cobram:
  `DESIGN_PROVIDER=openai|anthropic`, e agente com `modelo` começando em `gpt` na `agentes_config`.
  Com um modelo `claude*` na config, o `generateWithProvider` tenta a Anthropic **primeiro**.
- **Exceção intencional:** `/api/ai/diagnostic` e `/api/ai/deep-diagnostic` chamam a Anthropic
  direto, **sem caminho gratuito** (`ANTHROPIC_DIAGNOSTIC_MODEL`, default `claude-sonnet-5`).
  Rodam sob demanda, nunca em loop.
- 💸 **WaveSpeed é o único que queima dinheiro a cada clique** — pré-pago, não reembolsável.
  Nada nela pode disparar sozinho, em loop, ou como fallback.
- ⚠️ **Pegadinha do Zen:** `deepseek-v4-flash` é modelo de RACIOCÍNIO. Medido: de 1032 tokens de
  saída, **965 foram raciocínio**. Com `max_tokens` baixo o `content` volta **VAZIO, com HTTP 200
  e sem erro**. Por isso `chatComZen` aplica um piso (`OPENCODE_MIN_MAX_TOKENS`, default 8000).
  **Nunca chame o Zen sem esse piso.**
- **Julgamento de verdade não roda no app.** Copy final, landing page e dossiê são feitos no
  Claude Code (skills `copy`, `landing-page-vendas`) e gravados direto no Supabase.
- ⚠️ `callOptimizationPlan` em `src/lib/anthropic.ts` é **código morto** — nenhuma rota chama.

---

## ⚠️ Armadilhas verificadas (o código manda, não a intenção)

1. **O pacote ainda se chama `metascale-app`** (`package.json`) — herança do monorepo anterior.
2. **Não existe `npm run type-check`.** Scripts reais: `dev`, `build`, `start`, `lint`,
   `video:worker`, `video:compor`, `agents:pull`, `agents:push`. Para tipos: **`npx tsc --noEmit`**.
3. **Não existe suíte de testes.** "Testar" = `npx tsc --noEmit` + abrir a tela e olhar. Os dois
   bugs mais recentes da bancada de vídeo passavam pelo `tsc` e pelo `build` sem um pio.
4. 🚨 **`npm run build` deixa a `.next` pela metade quando falha, e `build` e `dev` compartilham
   essa pasta** — rodar build com o dev de pé **derruba o CSS do painel**. Se precisar do build:
   derrube o dev antes, e `rm -rf .next` depois.
5. **Env do Windows sobrepõe o `.env.local`, em silêncio.** Já custou uma sessão inteira. Se um
   valor "não pega", confira as variáveis do sistema.
6. **A env do scraper é `SCRAPE_CREATORS_API_KEY`** (underscore entre SCRAPE e CREATORS).
7. **O worker do Remotion precisa rodar com o cwd em `remotion/`** — o Remotion procura o Chrome
   em `<cwd>/node_modules/.remotion`. Da raiz ele baixa uma segunda cópia e trava na extração,
   deixando o job preso em `processando` **sem erro nenhum**. Use `npm run video:compor`.
8. **`npm install` exige `--legacy-peer-deps`** — `@remotion/zod-types` fixa `zod@3.22.3` exato e
   os SDKs da Anthropic/OpenAI pedem `^3.25||^4.0`. Nenhuma versão satisfaz os dois.
9. **Para testar rota com texto em português, não use `curl` do Git Bash** — ele manda cp1252 e o
   acento chega corrompido no servidor. Use `node --env-file=.env.local script.mjs`.

---

## 🧩 Os dois pares que nunca podem ser trocados

**1. Clients do Supabase:**
- `src/lib/supabase.ts` → **anon key**, respeita RLS. Só no browser (`"use client"`).
- `src/lib/supabase-server.ts` (`supabaseServer`) → **service_role**, **ignora RLS**. Só no
  servidor. Importar no browser expõe o banco inteiro.

**2. Configuração de agente — existem DOIS sistemas paralelos, e este é o maior risco do repo:**

| | Sistema A (o que vale) | Sistema B (legado) |
|---|---|---|
| Tabela | `agentes_config` | `agent_configurations` + `agent_files` |
| Índice | `slug` (português) | `agent_role` (inglês) |
| Fonte | pasta local `agentes/`, via `syncAgentsFromFolder()` em `/agents` | UI em `/agents/[agentRole]/` |
| Helper | `@/lib/agents/buildSystemPrompt` | `@/app/actions/agentConfig` |

⚠️ **As DUAS exportam uma função chamada `getAgentConfig`**, com assinaturas e tabelas
diferentes. Importar a errada quebra em silêncio.

⚠️ **Editar `AGENTS.md`/`SKILL.md` não faz NADA até rodar o sync** — a rota lê o markdown da
tabela, não do disco. O sintoma é idêntico ao de `max_tokens` baixo.

⚠️ **`max_tokens` mora em `agentes/<agente>/_agente.json`, NUNCA em SQL** — o sync grava o valor
do arquivo por cima do banco.

---

## 🏗️ Arquitetura

- **Next.js 14 App Router** + TypeScript strict + Tailwind. **Monorepo único**, o app mora na raiz.
- **Supabase** (Postgres + Realtime via `postgres_changes`). Bucket de arquivos: `criativos`.
- **Exceção autorizada: `remotion/`** é um projeto Node separado, e tem que ser assim — o
  `@remotion/renderer` traz binário nativo (~48 MB) e baixa um Chrome próprio, que não podem
  entrar no bundle do Next. **Regra: `remotion/` NUNCA é importado pelo app Next.** A seta é
  sempre `remotion/` → `src/video/`. A comunicação é pela fila no Supabase.
- **Nada de API específica de versão do React** dentro de `src/video/` — esse código é compilado
  pelo React 18 (app) e pelo React 19 (`remotion/`).

Padrão de Realtime, usado em todas as páginas:

```ts
const channel = supabase.channel('nome_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'nome_tabela' }, fetchDados)
  .subscribe();
return () => { supabase.removeChannel(channel); };
```

Padrão de rota de agente — **nunca hardcode prompt no código**:

```ts
const config = await getAgentConfig('copywriting');   // Sistema A
const systemPrompt = buildSystemPrompt(config);       // SOUL + AGENTS + TOOLS + SKILL
```

---

## 🎨 Design System (obrigatório)

```
bg-[#0D0D14]  fundo global      ·  bg-surface / bg-surface-elevated  card e hover
border-surface-elevated  bordas ·  text-text-primary / text-secondary
bg-primary (#6366f1) ações      ·  text-status-green/yellow/red
```

**Proibido:** fundo branco ou claro, cores fora dessa lista, `border-2`, gradiente arco-íris,
animação excessiva, "AI Slop".

---

## 🛡️ Segurança

1. **Nunca** commitar `.env.local` nem chave de API.
2. **Nunca** expor chave no client — sempre via Route Handler (`/api/`).
3. Toda chamada externa em `try/catch`, com erro logado e mensagem útil.
4. Query Supabase sempre confere `error` antes de usar `data`.
5. Sanitizar input antes de mandar para a IA (copy minerada de concorrente é texto hostil).

---

## 🔁 Processo ao VALIDAR uma tarefa

Só quando estiver **testado e funcionando** (não só escrito):

1. **Atualizar o [`NOTES.md`](NOTES.md)** — o diário de bordo: o que foi feito, por quê, o que
   quebrou e como. Fiel ao estado real, sempre.
2. **Atualizar o segundo cérebro** (nexus.ai via MCP Obsidian): nota
   `02_Projetos/Alavanca_Synapse.md`, canvas em `03_Workflows/`, skills em `01_Global_Skills/`.
   Não duplicar nota — atualizar a existente.
3. **Rodar o Graphify** no cofre `C:\Users\cerqu\Documents\Obsidian\Nexus.AI`, com o Python
   global `C:\Python313\python.exe`: `python -m graphify update . --force`

---

## 📍 Onde está o resto

| Procurando | Vá para |
|---|---|
| Como instalar e rodar do zero | [`README.md`](README.md) |
| O que já foi feito, o que quebrou e por quê | [`NOTES.md`](NOTES.md) |
| Specs e planos de implementação | [`docs/superpowers/`](docs/superpowers/) |
| Cérebro dos agentes | [`agentes/`](agentes/) |
| Todas as variáveis de ambiente, comentadas | [`.env.local.example`](.env.local.example) |
| Histórico do banco | [`supabase/migrations/`](supabase/migrations/) |

---

*"Métricas certas, escala garantida." — Alavanca Synapse*
