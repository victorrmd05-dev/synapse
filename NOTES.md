# 📝 Notas do Projeto — Alavanca Synapse
> Diário de bordo do projeto. **Sempre atualizar este arquivo após validar cada tarefa**
> (e replicar no segundo cérebro: `02_Projetos/Alavanca_Synapse.md` no vault Obsidian/nexus.ai).
> Última atualização: 2026-06-25 — UX da página de mineração: análise da IA no card + favoritos/curadoria.

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
- **IA (agentes):** OpenCode Zen → modelo `deepseek-v4-flash-free` via SDK da `openai`
  apontando para `https://opencode.ai/zen/v1` (chave `OPENCODE_API_KEY`).
  ⚠️ **É modelo de raciocínio**: gasta tokens em `reasoning_content` antes do `content`.
  `max_tokens` baixo → resposta vazia silenciosa. Usar `max_tokens >= ~3000` (mineração já está em 3000).
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

## 📊 Status por agente
| Agente | Cérebro (.md) | Mãos (rota) | Status |
|---|---|---|---|
| Minerador | ✅ régua nova | ✅ `/api/mineracao/run` | **Validado ponta a ponta** |
| Copywriting | ✅ sync | ✅ `/api/copywriting/generate` | Gera copy (sessão anterior); revisar max_tokens (mesmo bug de reasoning) |
| Revisor | ⚠️ sync | ❌ falta rota | Pendente |
| Designer-Webmaster | ⚠️ sync | ❌ falta rota + deploy | Pendente |
| Video-Maker | ⚠️ sync | ❌ falta Higgsfield | Pendente |
| Gestor-Meta-Ads | ⚠️ sync | ❌ falta rota | Pendente |
| CEO / CTO | ✅ sync | aprovação/suporte | Camada humana + futura automação |

---

## 🚀 Próximos Passos
- [ ] Refinar keywords de dropshipping (e avaliar blacklistar marcas médias tipo Gocase se quiser só desconhecidos).
- [ ] Ligar as keywords ao Obsidian (nexus.ai) via MCP — listas viram fonte editável.
- [ ] (Opcional) Dropdown de keywords prontas na tela de mineração.
- [ ] Revisar `max_tokens` da rota de copywriting (risco do mesmo bug de modelo de raciocínio).
- [ ] Próximo agente da esteira: **Revisor** (`/api/revisor/review`) → aprovar copy e empurrar campanha.
- [ ] Desenhar RLS real quando houver autenticação.

---

## 🔁 Processo (regra fixa)
Ao **validar** cada tarefa: (1) atualizar este `NOTES.md`; (2) atualizar a nota do projeto no
segundo cérebro `02_Projetos/Alavanca_Synapse.md` (Obsidian/nexus.ai via MCP), mantendo canvas
e skills em dia para o cérebro ser auto-evolutivo.
