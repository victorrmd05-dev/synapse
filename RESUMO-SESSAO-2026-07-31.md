# Resumo da sessão — 31/07/2026 (fim de tarde/noite)

> ⚠️ **Este arquivo NÃO é o `NOTES.md`.** O pedido original foi "cria um notes.md na raiz",
> mas o Windows não diferencia maiúsculas de minúsculas: `notes.md` e `NOTES.md` são o
> **mesmo arquivo**, e o `NOTES.md` da raiz tem 2.334 linhas de diário de bordo do projeto.
> Criar `notes.md` teria apagado ele inteiro. Por isso este resumo mora num nome próprio.
>
> Divisão de papéis: o `NOTES.md` é o **diário do projeto** (o que foi construído e por quê);
> este arquivo é o **registro de uma sessão** (o que aconteceu neste chat).

---

## 1. O chat anterior foi fechado sem querer — reconstrução

Nada se perdeu. O estado foi reconstruído a partir dos arquivos, sem depender do histórico
da conversa:

- `NOTES.md` (seção "ONDE PARAMOS")
- `docs/superpowers/plans/2026-07-31-video-wavespeed.md`
- `.superpowers/sdd/2026-07-31-video-wavespeed/` (ledger da execução)
- `git status`

**Estado do módulo de vídeo (WaveSpeed):** 7/7 tarefas construídas e revisadas, **nada
commitado**, **nunca rodado ponta a ponta**. Verificado na hora que o `.env.local` **não
tem nenhuma linha `WAVESPEED_`** — o `grep` deu 0.

Os 4 passos para retomar, na ordem:

1. Fernando cola `WAVESPEED_API_KEY` e `WAVESPEED_MODEL` no `.env.local` (único passo que
   não pode ser feito pelo agente)
2. Revisão final do conjunto — pacote já montado (89 KB), interrompido pela cota
3. Verificação paga: `npm run dev` + `npm run video:worker`, gerar pela `/video-maker`
4. Conferir a Task 6: `/producao` → "Gerar copy" → 3 prompts de vídeo, nenhum pedindo
   texto na tela

---

## 2. O bug real da sessão: "a mineração não está puxando os ads"

Relatado no meio de uma apresentação da ferramenta. **A causa não era o banco.**

### A investigação, na ordem em que foi feita

Nada foi alterado antes de o backend estar 100% provado:

| Verificação | Resultado |
|---|---|
| `ads_minerados` no banco | **5 linhas** — o dado existe |
| RLS / policies | `SELECT` liberado para `public` — **não era RLS** |
| Projeto do `.env.local` × projeto do MCP | **o mesmo** (`apdjykkl…`) |
| Env do Windows sombreando o `.env.local` | **não** (vazias) |
| REST direto com a anon key do `.env.local` | **HTTP 200 + os 5 anúncios** |

Três hipóteses plausíveis (e todas já vividas antes neste projeto) descartadas **por
medição**, não por palpite.

### O erro só apareceu no navegador

```
404  http://localhost:3000/_next/static/chunks/app/mineracao/page.js
```

E **zero requisições ao Supabase** na aba de rede.

**Por que a tela ficava vazia sem nenhum erro visível:** a página é `"use client"` e busca
no `useEffect`. Sem o chunk ela não hidrata → o `useEffect` nunca roda → nenhuma requisição
sai. Uma tela vazia por falta de JS é **visualmente idêntica** a uma tela vazia por falta de
dado.

No disco, o problema era geral — `autopsia`, `copywriting`, `design`, `mineracao`,
`producao` e `video-maker` todas com **0 arquivos** em `.next/static/chunks/app/<rota>/`.

### Causa raiz

`npm run build` e `npm run dev` compartilham a pasta `.next`, e **neste projeto o build
falha 100% das vezes** no fim:

```
EPERM: operation not permitted, symlink → .next/standalone/...
```

Três coisas somadas: `output: "standalone"` no `next.config` + `node_modules` instalado
com **pnpm** (estrutura de symlinks) + **Windows exige Modo de Desenvolvedor para criar
symlink**. Todo build deixa a `.next` pela metade e sabota o `dev` que estiver rodando.

**Segunda ocorrência em dois dias, com sintomas diferentes:**
- 30/07 — dashboard **sem CSS** (parecia Tailwind quebrado)
- 31/07 — páginas **vazias** (parecia banco/RLS/chave)

### Correção

Matar o dev, `rm -rf .next`, subir de novo. Resultado: **17/17 rotas em HTTP 200**, todas
emitindo chunk, e os 5 anúncios na tela.

**Correção definitiva (pendente):** ligar o Modo de Desenvolvedor do Windows **ou** remover
o `output: "standalone"`. Enquanto não fizer, isso volta.

> **A lição que ficou:** *"a página não puxa do banco"* quase nunca começa no banco. Quando
> a tela é `"use client"`, a primeira pergunta é **se a requisição saiu**, não se o dado
> existe. A aba de rede responde isso em 5 segundos.

---

## 3. Varredura das 17 rotas, no navegador de verdade

Todas em HTTP 200, todas emitindo chunk, com dado real na tela:

| Rota | O que apareceu |
|---|---|
| `/mineracao` | 5 anúncios (Confitaria, Desenvolve Cursos, A Guia Atacadista, Leidy Cakes, Saga Adestramento) |
| `/autopsia` | Saga Adestramento · CONCLUIDA · 27 anúncios / 20 criativos / 17 transcritos |
| `/autopsia/[id]` | dossiê completo |
| `/producao` | 1 campanha, APROVADO |
| `/copywriting` | Método do Corredor + aba "Prompts de Vídeo" (Task 6 do módulo novo) |
| `/revisor` | 0 pendentes (correto — a copy já foi aprovada) |
| `/design` | NO AR · COM TRACKING · 4 imagens na pasta |
| `/paginas` | biblioteca de LPs |
| `/tracking` | EM TESTE · Pixel Cavalheiros -01 · `TEST65121` |
| `/video-maker` | botão "Gerar Vídeo (WaveSpeed)" |
| `/meta-ads/dashboard` | ver observação abaixo |

### Dois achados que **não** são bug

1. **Dashboard Meta Ads zerado.** As 7 campanhas estão **PAUSED**. Medido nas três janelas:
   `last_7d` → 0 campanhas com métrica · `last_30d` → 0 · `last_90d` → **2**.
   Para demonstrar, escolher **90 dias**.
2. **2 erros de console na `/paginas`** — iframe de preview em sandbox (`about:srcdoc` sem
   `allow-scripts`). É o sandbox funcionando.

### Um falso alarme investigado e descartado

Durante a varredura, as páginas pareceram **navegar sozinhas** (`/autopsia` → `/producao`
→ `/copywriting`). Investigado: não há `router.push` automático nem `setInterval` de
navegação em lugar nenhum do app, e num teste limpo a URL ficou **estável por 8 segundos**.
Era atraso da ferramenta de automação reproduzindo a fila de comandos — não é
comportamento do produto.

---

## 4. Teste de pixel na LP publicada

**Resolvido pelo Fernando: era teste no pixel errado no Gerenciador.** Nenhum defeito na
página.

Do caminho, duas coisas ficam registradas:

- **Nada foi publicado.** Havia dois diálogos de "Publicar em…" travados no navegador
  (`modelagem-saga-adestramento.meuaprendizado.online` e
  `adestramento.meuaprendizado.online`). Ambos **cancelados** — publicar é ação externa e
  não tinha sido pedida.
- O `ativo:false` encontrado numa busca no HTML era **texto dentro de um comentário**, não
  configuração. Falso positivo, descartado.

**Pendência que continua de pé:** a página no ar ainda é a versão **anterior** ao fix do
`fbp` no PageView. O HTML corrigido já está em `workflow_tracking.codigo_html_final` — só
falta "Aprovar e Publicar" na `/design`. Sem isso o PageView do servidor continua indo com
`fbp` nulo, que numa LP sem formulário é o identificador mais forte que existe.

---

## 5. Demonstração de acesso ao nexus.ai (segundo cérebro)

**O MCP do Obsidian não está conectado nesta sessão** (os servidores disponíveis são Meta
Ads, Monid, Playwright, Supabase e synabun). O acesso foi feito **direto no sistema de
arquivos**, que funciona igual para leitura.

Duas cópias do cofre foram encontradas:

| Caminho | Notas `.md` | Última alteração |
|---|---|---|
| `C:\Users\cerqu\Documents\Obsidian\Nexus.AI` | 120 | **27/07/2026** ← a viva |
| `D:\Obsidian  work\Nexus.AI` | 181 | 29/05/2026 (parada) |

Estrutura do cofre vivo: `01_Global_Skills` (35) · `02_Projetos` (8) · `05_Obsidian_Skills`
(10) · `06_Growth_Marketing` (5) · `03_Workflows` (2) · `04_Templates` (1), entre outras.

A nota `02_Projetos/Alavanca_Synapse.md` existe, tem **66,3 KB** e foi atualizada em
**27/07/2026**.

> ⚠️ **Ela está desatualizada em pelo menos um ponto:** a tabela dos 8 agentes ainda diz
> *"Video-Maker — Vídeos criativos via **Higgsfield API**"*. A Higgsfield foi abandonada em
> 31/07 e **nunca teve uma linha no `src/`**. Hoje é **WaveSpeed**. O `CLAUDE.md` já foi
> alinhado; a nota do vault não.

---

## 6. O que ficou pendente ao fim da sessão

1. **Colar `WAVESPEED_API_KEY` e `WAVESPEED_MODEL`** no `.env.local` — trava o módulo de vídeo inteiro
2. **Revisão final** do conjunto do módulo de vídeo (pacote pronto, nunca rodado)
3. **Verificação paga** do WaveSpeed ponta a ponta — a única coisa que prova que funciona
4. **Ligar o Modo de Desenvolvedor do Windows** (ou tirar o `output: "standalone"`) — senão a `.next` corrompe de novo
5. **Republicar a LP** para levar o fix do `fbp` para o ar
6. **Atualizar a nota do vault** (Higgsfield → WaveSpeed)
7. **Nada commitado** desta leva (~15 arquivos na working tree) — o `CLAUDE.md` proíbe commit sem pedido explícito

---

*Sessão de 31/07/2026 · Alavanca Synapse*
