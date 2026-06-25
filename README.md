<div align="center">

<img src="https://img.shields.io/badge/Status-Em_Desenvolvimento-6366f1?style=for-the-badge" alt="Status"/>
<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
<img src="https://img.shields.io/badge/TypeScript-strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>

# 🧠 Alavanca Synapse

### Plataforma própria de orquestração de agentes de IA da Alavanca AI

*"Métricas certas, escala garantida."*

</div>

---

**Alavanca Synapse** é a plataforma de orquestração de agentes da **Alavanca AI** (agência de marketing digital): **8 agentes de IA especializados** operando em sincronia para transformar um anúncio vencedor em uma campanha completa, com mínima intervenção manual.

A filosofia é a mesma de uma "empresa de agentes" — mas rodando **no código e no banco de dados do próprio time**, sem depender de plataforma externa engessada. O nome **Synapse** reflete a arquitetura: os agentes funcionam como neurônios de um mesmo organismo, disparando em sequência (e às vezes em paralelo) através do **Supabase como sinapse central**.

---

## 🤖 Os 8 Agentes

| # | Agente | Responsabilidade | Tabela Supabase |
|---|--------|------------------|-----------------|
| 01 | **CEO** | Aprovações de alto nível (representa o usuário) | — |
| 02 | **CTO** | Infraestrutura, chaves de API, suporte técnico | `agentes_config` |
| 03 | **Minerador** | Scraping de anúncios validados (Meta Ad Library) | `ads_minerados` |
| 04 | **Copywriting** | Copy de anúncios e páginas de vendas | `workflow_copywriting` |
| 05 | **Revisor** | QA das copies — aprova ou pede revisão | `workflow_copywriting` |
| 06 | **Designer-Webmaster** | Criação e deploy de landing pages | `workflow_design` |
| 07 | **Video-Maker** | Criação de vídeos criativos (Higgsfield) | `workflow_video` |
| 08 | **Gestor-Meta-Ads** | Gestão e otimização de tráfego pago | `campanhas_meta_ads` |

### Pipeline de produção

```
ads_minerados → [CEO aprova] → campanhas_producao → workflow_copywriting
  → [Revisor aprova] → workflow_design → [Designer gera HTML + deploy]
  → workflow_video → [Video-Maker gera criativo] → Gestor-Meta-Ads sobe campanha
```

---

## 🧩 Conceito-chave: Cérebro vs Mãos

Cada "agente" são **duas coisas separadas**:

- **🧠 Cérebro** — os arquivos `AGENTS.md` + `SKILL.md` que viram o *system prompt* da IA. São **réguas de decisão** (critérios, rubrica de pontuação, formato de saída JSON), não tutoriais.
- **✋ Mãos** — as rotas TypeScript em `src/app/api/...` que fazem as chamadas externas reais (ScrapeCreators, Meta, Higgsfield…) e gravam no Supabase. A IA **não executa ferramentas**: ela avalia/gera e devolve JSON; a rota faz o resto.

---

## ✨ Destaques já funcionando

- **⛏️ Minerador validado ponta a ponta** — busca na Meta Ad Library via ScrapeCreators, pontua cada anúncio com IA (rubrica 0–100) e salva os validados. Inclui **lista negra** que descarta marketplaces/gateways antes de gastar crédito.
- **🔍 Análise de IA visível no card** — score, categoria/nicho e notas da IA direto no modal do anúncio em `/mineracao`.
- **⭐ Curadoria por favoritos** — favorite os melhores anúncios, filtre por favoritos e exclua em massa os não favoritados.
- **📊 Diagnóstico de Meta Ads** — auditoria de campanhas com IA no dashboard de tráfego.
- **🔄 Realtime** — todas as telas sincronizam via Supabase `postgres_changes`.

---

## 🏗️ Stack

- **Framework:** Next.js 14 (App Router) + TypeScript strict
- **Estilo:** Tailwind CSS — design system *dark glassmorphism*
- **Banco:** Supabase (PostgreSQL + Realtime)
- **IA (agentes):** OpenCode Zen — `deepseek-v4-flash-free` (via SDK OpenAI)
- **IA (diagnóstico Meta Ads):** Anthropic Claude
- **Integrações:** Meta Ads API · ScrapeCreators · Higgsfield · Cloudflare · Telegram

---

## 🚀 Como rodar

```bash
npm install          # instala dependências
npm run dev          # servidor local (http://localhost:3000)
npm run build        # build de produção
npm run start        # serve o build
npm run lint         # ESLint
npx tsc --noEmit     # checagem de tipos
```

### Variáveis de ambiente (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENCODE_API_KEY=
META_ACCESS_TOKEN=
SCRAPE_CREATORS_API_KEY=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
GITHUB_TOKEN=
HIGGSFIELD_API_KEY=
TELEGRAM_BOT_TOKEN=
```

> ⚠️ **Nunca** commite o `.env.local` nem qualquer chave de API. Toda chamada externa passa por um Route Handler (`/api/`), nunca pelo client.

---

## 📁 Estrutura

```
src/
 ├─ app/                 # páginas (App Router) + rotas de API
 │   ├─ mineracao/       # mineração e curadoria de anúncios
 │   ├─ producao/        # kanban de campanhas
 │   ├─ copywriting/     # geração de copy
 │   ├─ meta-ads/        # dashboard, campanhas e simulador
 │   └─ api/             # "mãos" dos agentes (route handlers)
 ├─ lib/                 # supabase clients, agentes, helpers
 └─ components/          # UI compartilhada
supabase/migrations/     # schema versionado do banco
agentes/                 # "cérebro" dos agentes (.md) — sync via Supabase
```

---

<div align="center">

**Alavanca AI** · plataforma proprietária · uso interno

</div>
