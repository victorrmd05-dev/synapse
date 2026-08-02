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

## 👋 Comece por aqui

Este README é um **manual de instalação do zero**, escrito para quem nunca abriu um
terminal na vida. Seguindo os passos na ordem, o projeto roda.

**Como usar este documento:**

- **Vá em ordem.** Cada parte assume que a anterior deu certo.
- Todo bloco cinza é um **comando**: copie, cole no terminal, aperte Enter.
- Quando algo der errado, procure o seu sintoma em **[🚑 Quando der errado](#-quando-der-errado)**.
  Tudo que está lá **já aconteceu de verdade neste projeto**, com a causa real anotada.
- Onde estiver 💸, aquilo **gasta dinheiro**. Leia antes de clicar.

**Você não precisa instalar tudo.** Para ver o painel rodando na tela bastam as
**Partes 1, 2, 3 e 5**. As Partes 4, 6 e 7 entram quando você for criar um banco novo,
usar autópsia de concorrente, renderizar vídeo ou desenvolver com IA.

---

## 📚 Índice

1. [O que é este projeto](#-o-que-é-este-projeto)
2. [Parte 1 — Instalar os programas de base](#️-parte-1--instalar-os-programas-de-base)
3. [Parte 2 — Baixar o projeto e instalar dependências](#-parte-2--baixar-o-projeto-e-instalar-as-dependências)
4. [Parte 3 — Configurar as chaves (`.env.local`)](#-parte-3--configurar-as-chaves-envlocal)
5. [Parte 4 — Banco de dados (Supabase)](#️-parte-4--banco-de-dados-supabase)
6. [Parte 5 — Rodar o projeto](#️-parte-5--rodar-o-projeto)
7. [Parte 6 — Os workers (vídeo e autópsia)](#️-parte-6--os-workers-vídeo-e-autópsia)
8. [Parte 7 — Ferramentas de IA para desenvolver](#-parte-7--ferramentas-de-ia-para-desenvolver)
9. [🚑 Quando der errado](#-quando-der-errado)
10. [Mapa do projeto](#️-mapa-do-projeto)

---

## 🧠 O que é este projeto

**Alavanca Synapse** é a plataforma de orquestração de agentes da **Alavanca AI**
(agência de marketing digital). Agentes de IA especializados operam em sincronia para
transformar um anúncio vencedor de concorrente numa campanha completa: minerar →
autopsiar → escrever copy → revisar → montar landing page → gerar vídeo → subir tráfego.

A filosofia é a de uma "empresa de agentes", mas rodando **no código e no banco do
próprio time**, sem depender de plataforma externa engessada. O nome **Synapse** vem da
arquitetura: cada agente é um neurônio, e o **Supabase é a sinapse central** por onde
todos se comunicam.

| # | Agente | O que faz | Tabela principal |
|---|--------|-----------|------------------|
| 01 | **CEO** | Aprovações de alto nível (é você, nas telas de aprovar) | — |
| 02 | **CTO** | Infraestrutura, chaves de API, suporte aos outros | `agentes_config` |
| 03 | **Minerador** | Coleta anúncios validados da Meta Ad Library | `ads_minerados` |
| 04 | **Autópsia** | Disseca o criativo do concorrente (frames + transcrição) | `autopsias` |
| 05 | **Copywriting** | Copy de anúncio, página de vendas e roteiros de vídeo | `workflow_copywriting` |
| 06 | **Revisor** | QA das copies — aprova ou devolve | `workflow_copywriting` |
| 07 | **Designer-Webmaster** | Cria e publica landing pages | `workflow_design` |
| 08 | **Tracking** | Pixel + CAPI (framework FOP) | `tracking_*` |
| 09 | **Video-Maker** | Gera o clipe e monta o anúncio final | `video_jobs` |
| 10 | **Gestor-Meta-Ads** | Gestão e otimização do tráfego pago | `meta_campaigns` |

### Pipeline de produção

```
ads_minerados → [CEO aprova] → campanhas_producao → workflow_copywriting
  → [Revisor aprova] → workflow_design → [Designer gera HTML + publica]
  → video_jobs → [Video-Maker monta o anúncio] → Gestor-Meta-Ads sobe a campanha
```

### 🧩 Conceito-chave: Cérebro vs Mãos

Cada "agente" são **duas coisas separadas** — entender isso evita muita confusão:

- **🧠 Cérebro** — os arquivos `AGENTS.md` + `SKILL.md` (na pasta `agentes/`) que viram o
  *system prompt* da IA. São **réguas de decisão**: critérios, rubricas de pontuação,
  formato de saída em JSON. Não são tutoriais.
- **✋ Mãos** — as rotas TypeScript em `src/app/api/…` que fazem as chamadas externas
  reais (ScrapeCreators, Meta, ElevenLabs…) e gravam no Supabase.

**A IA não executa ferramentas.** Ela avalia ou gera e devolve JSON; a rota faz o resto.

> 📖 A documentação técnica profunda está no **[`CLAUDE.md`](CLAUDE.md)** (arquitetura e
> regras da casa) e no **[`NOTES.md`](NOTES.md)** (diário de bordo: o que foi feito, o que
> quebrou e por quê). Este README cobre só **instalar e rodar**.

---

## 🧰 Parte 1 — Instalar os programas de base

> **Onde eu digito os comandos?** No Windows: aperte `Win`, digite `powershell`, abra o
> **Windows PowerShell** — é uma janela onde você digita comandos e aperta Enter. No Mac:
> abra o **Terminal**.

### 1.1 Node.js — obrigatório

É o motor que roda o projeto. Sem ele, nada funciona.

- Baixe em **<https://nodejs.org/>** — pegue a versão **LTS** (o botão da esquerda).
- Instale clicando "Next" em tudo, aceitando o padrão.
- **Feche e reabra o terminal.** Ele só enxerga programas novos depois de reiniciar.

Confira:

```bash
node -v
npm -v
```

Devem aparecer dois números de versão. Se aparecer *"não é reconhecido como um comando"*,
ou o Node não instalou, ou você não reabriu o terminal.

> **Versões testadas neste projeto:** Node **24.16.0**, npm **11.13.0**.

### 1.2 Git — obrigatório

É o que baixa o código do GitHub e guarda o histórico de alterações.

- Baixe em **<https://git-scm.com/downloads>** e instale aceitando o padrão.
  (No Windows isso também instala o **Git Bash**, um terminal alternativo.)

```bash
git --version
```

### 1.3 Um editor de código — recomendado

Você vai precisar editar um arquivo de texto com as chaves do projeto. Dá para usar o
Bloco de Notas, mas o **VS Code** é grátis e muito melhor:

- **<https://code.visualstudio.com/>**

### 1.4 FFmpeg — só para autópsia e vídeo

Programa que corta e converte vídeo. **Pule se você só quer ver o painel rodando.**

- **Windows:** baixe em **<https://www.gyan.dev/ffmpeg/builds/>** (o
  `ffmpeg-release-full.7z`), extraia em `C:\ffmpeg`, e adicione `C:\ffmpeg\bin` ao
  **PATH** do Windows.
  - **Como mexer no PATH:** aperte `Win` → digite "variáveis de ambiente" → abra *"Editar
    as variáveis de ambiente do sistema"* → botão **Variáveis de Ambiente** → em
    "Variáveis do sistema", selecione **Path** → **Editar** → **Novo** → cole
    `C:\ffmpeg\bin` → OK em tudo → **reabra o terminal**.
- **Mac:** `brew install ffmpeg`

```bash
ffmpeg -version
```

### 1.5 Python — só para a autópsia

O worker que transcreve o áudio dos vídeos de concorrente é escrito em Python.

- Baixe em **<https://www.python.org/downloads/>**.
- ⚠️ **No instalador do Windows, marque a caixinha "Add Python to PATH"** antes de clicar
  em Install. É o erro nº 1 de quem instala Python.

```bash
python --version
python -m pip install faster-whisper
```

> **Versão testada:** Python **3.13.3**. A biblioteca `faster-whisper` é a única
> dependência externa — o resto do worker usa só a biblioteca padrão.

---

## 📦 Parte 2 — Baixar o projeto e instalar as dependências

### 2.1 Baixar o código

O repositório é **público** — não precisa de convite nem de login para baixar:

```bash
git clone https://github.com/victorrmd05-dev/synapse.git
cd synapse
```

> 🔑 **O código é público, as chaves não.** O `.env.local` (onde ficam todas as senhas e
> chaves de API) **nunca** entrou no repositório e nunca vai entrar. Clonar te dá o
> código; para rodar, você precisa das suas próprias chaves — é a **Parte 3**.
>
> Só precisa de token do GitHub quem for **enviar** alterações de volta (`git push`), o
> que exige ser colaborador do repositório. Para só baixar e rodar, não precisa de nada.

### 2.2 Instalar as dependências

```bash
npm install --legacy-peer-deps
```

Demora alguns minutos e baixa centenas de MB. É normal.

> ⚠️ **O `--legacy-peer-deps` não é gambiarra e não dá para tirar.** O
> `@remotion/zod-types` exige `zod@3.22.3` **exato**, enquanto os SDKs da Anthropic e da
> OpenAI pedem `zod ^3.25 || ^4.0`. **Nenhuma versão do zod satisfaz os dois.** Sem a
> flag, o `npm install` falha. Já foi conferido que os dois SDKs carregam normalmente
> assim, porque o projeto não usa os helpers de zod deles.

### 2.3 Dependências do renderizador de vídeo — opcional

Só se você for **renderizar** anúncio (Parte 6). A pasta `remotion/` é um projeto
separado **de propósito**: ela traz um binário nativo de ~48 MB e baixa um Chrome
próprio, coisas que não podem entrar no site.

```bash
cd remotion
npm install
cd ..
```

---

## 🔑 Parte 3 — Configurar as chaves (`.env.local`)

É **o passo onde as pessoas mais travam**. Leia com calma.

O projeto conversa com vários serviços externos (banco, IAs, Meta Ads…) e cada um exige
uma chave. Elas ficam num arquivo chamado **`.env.local`**, na pasta raiz do projeto.

### 3.1 Criar o arquivo

Já existe um modelo pronto com todas as variáveis documentadas:

```bash
cp .env.local.example .env.local
```

No PowerShell do Windows, se `cp` não funcionar:

```powershell
Copy-Item .env.local.example .env.local
```

Agora abra o `.env.local` no VS Code e preencha os valores depois do `=`.

### 3.2 O mínimo para o projeto abrir

Você **não precisa de todas** as chaves. Para o painel subir, só estas três:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Painel do Supabase → Project Settings → API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesma tela → *anon public* |
| `SUPABASE_SERVICE_ROLE_KEY` | Mesma tela → *service_role* (⚠️ **segredo total**) |

Sem a `SUPABASE_SERVICE_ROLE_KEY` o projeto **nem inicia** — ele para na hora, com uma
mensagem dizendo exatamente isso.

### 3.3 As demais, por funcionalidade

Preencha só o que for usar. O [`.env.local.example`](.env.local.example) explica cada uma
em detalhe, com os avisos de custo.

| Para usar… | Precisa de | Onde pegar |
|---|---|---|
| Gerar copy, dossiê, diagnóstico (**grátis**) | `OPENCODE_API_KEY` | <https://opencode.ai/> |
| 💸 Análise profunda / auditoria de campanha | `ANTHROPIC_API_KEY` | <https://console.anthropic.com/> — **ver 3.4 abaixo** |
| Minerar anúncios | `SCRAPE_CREATORS_API_KEY` | <https://scrapecreators.com/> |
| Meta Ads (dashboard, campanhas) | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` | <https://developers.facebook.com/> |
| Publicar landing page | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | <https://dash.cloudflare.com/> |
| Sincronizar o cérebro dos agentes | `GITHUB_TOKEN` | <https://github.com/settings/tokens> |
| Narração dos vídeos | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | <https://elevenlabs.io/> |
| 💸 Gerar clipe de vídeo | `WAVESPEED_API_KEY`, `WAVESPEED_MODEL` | <https://wavespeed.ai/accesskey> |

> 💸 **Sobre custo de IA:** o provider **padrão é gratuito** (OpenCode Zen). Anthropic e
> OpenAI só entram por escolha explícita, nunca como fallback silencioso. A única coisa
> que queima dinheiro a cada clique é a **WaveSpeed** (geração de clipe), que é pré-paga
> e não reembolsável. Nada nela dispara sozinho, em loop ou como fallback.

### 3.4 🧠 A API da Anthropic — para análise profunda de verdade

O provider gratuito dá conta de rascunho: gerar copy, montar um dossiê, produzir um
primeiro diagnóstico. **Para julgamento — auditoria de campanha, análise profunda de
concorrente, decisão sobre onde mexer no tráfego — a diferença de modelo aparece.** É
para isso que existe a chave da Anthropic neste projeto.

```env
ANTHROPIC_API_KEY=
```

Pegue a chave em **<https://console.anthropic.com/>** → *API Keys*. É pré-paga: você põe
crédito e ele é consumido por uso. Sem crédito, as rotas de diagnóstico falham (e o
projeto **não** cai para um modelo pago sem você mandar).

**Onde ela é usada:** `/api/ai/diagnostic` e `/api/ai/deep-diagnostic` — as auditorias de
campanha do Gestor Meta Ads. Essas duas **não têm caminho gratuito**, de propósito: rodam
sob demanda, quando você clica, nunca em loop.

#### Qual modelo escolher

O modelo é configurável — se você não definir nada, o projeto usa `claude-sonnet-5`:

```env
ANTHROPIC_DIAGNOSTIC_MODEL=claude-sonnet-5
```

| Modelo | ID | Preço (entrada / saída por 1M tokens) | Quando usar |
|---|---|---|---|
| **Claude Opus 5** | `claude-opus-5` | US$ 5,00 / US$ 25,00 | **Análise profunda de verdade** — a mais capaz. Raciocínio complexo, decisão de tráfego, auditoria que você vai seguir. |
| **Claude Sonnet 5** | `claude-sonnet-5` | US$ 3,00 / US$ 15,00 | **O default do projeto.** Equilíbrio de qualidade e custo; dá conta da maioria das auditorias. |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | US$ 1,00 / US$ 5,00 | Tarefas **simples** — classificar, extrair, resumir. Corta o custo, mas **não** é o modelo para análise profunda. |

> ⚠️ **Cuidado com uma confusão fácil:** existe um comentário no código
> ([`src/lib/anthropic.ts`](src/lib/anthropic.ts)) sugerindo `claude-haiku-4-5` como forma
> de **cortar custo em 5×**. Isso é uma opção de economia, **não** uma recomendação de
> qualidade. Se o objetivo é "rodar a análise profunda com uma LLM boa", o caminho é
> `claude-opus-5` (ou o `claude-sonnet-5` padrão) — Haiku é o mais barato e mais rápido,
> feito para o trabalho simples.

Para trocar, basta editar a variável no `.env.local` e reiniciar o `npm run dev`. O modelo
usado no **Designer** é separado, na `ANTHROPIC_DESIGN_MODEL`, e a
`DESIGN_PROVIDER=anthropic` é o que liga o Designer na Anthropic (💸 passa a custar).

### 3.5 Três regras que evitam dor de cabeça

1. 🔒 **NUNCA commite o `.env.local`.** Ele já está no `.gitignore` e o Git o ignora
   sozinho — não force. Se uma chave vazar para o GitHub, ela tem que ser trocada.
2. ⚠️ **Variável de ambiente do Windows sobrepõe o `.env.local`, em silêncio.** Se existir
   uma variável de sistema com o mesmo nome, ela ganha e o arquivo é ignorado — **sem
   nenhum aviso**. Isso já custou uma sessão inteira de depuração aqui. Se um valor "não
   pega", é o primeiro lugar para olhar (a Parte 1.4 mostra onde ficam).
3. 📝 **Ao adicionar variável nova, ponha o NOME no `.env.local.example` também** (sem o
   valor). É esse arquivo que conta para a próxima pessoa o que o projeto precisa.

---

## 🗄️ Parte 4 — Banco de dados (Supabase)

O projeto usa **Supabase** — um PostgreSQL hospedado, com plano gratuito.

### 4.1 Se você vai usar o banco que já existe

**Nada a fazer.** Basta ter preenchido as três chaves do passo 3.2. Pule para a Parte 5.

### 4.2 Se você vai criar um banco novo do zero

1. Crie conta em <https://supabase.com/> e um projeto novo (plano gratuito serve).
2. Copie as três chaves (Project Settings → API) para o `.env.local`.
3. **Aplique as migrations.** Elas estão em [`supabase/migrations/`](supabase/migrations/),
   com nome numerado por data — **rode na ordem do nome do arquivo, da mais antiga para a
   mais nova**.

   O jeito simples, sem instalar nada: abra o **SQL Editor** no painel do Supabase e cole
   o conteúdo de cada arquivo `.sql`, um por vez, em ordem.

   O jeito profissional é pela CLI: <https://supabase.com/docs/guides/local-development>

4. **Crie o bucket de arquivos:** painel → **Storage** → *New bucket* → nome
   **`criativos`** → marque **Public**.

---

## ▶️ Parte 5 — Rodar o projeto

```bash
npm run dev
```

Espere aparecer `✓ Ready` e abra **<http://localhost:3000>** no navegador.

Para desligar: volte ao terminal e aperte `Ctrl + C`.

### Todos os comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Liga o site em modo desenvolvimento — é o que você usa 99% do tempo |
| `npm run build` | Compila a versão de produção — ⚠️ **leia a seção de problemas antes** |
| `npm run start` | Serve a versão já compilada |
| `npm run lint` | Confere estilo de código |
| `npx tsc --noEmit` | **Confere erros de tipo — é a verificação oficial do projeto** |
| `npm run video:worker` | Worker que busca o clipe pronto na WaveSpeed |
| `npm run agents:pull` / `agents:push` | Sincroniza o "cérebro" dos agentes |

> ⚠️ **Não existe `npm test`** — o projeto não tem suíte de testes automatizados.
> "Testar" aqui significa rodar `npx tsc --noEmit` **e abrir a tela no navegador para
> olhar**. Os dois bugs mais recentes da bancada de vídeo passavam pelo `tsc` e pelo
> `build` sem um pio; só apareceram abrindo a página.
>
> ⚠️ **Não existe `npm run type-check`.** É `npx tsc --noEmit`.

---

## ⚙️ Parte 6 — Os workers (vídeo e autópsia)

**Worker** é um programa que fica rodando em segundo plano, num terminal separado,
pegando tarefas de uma fila no banco. O site cria a tarefa; o worker executa.

Cada worker precisa do **seu próprio terminal**, com o site (`npm run dev`) rodando em
outro.

### 6.1 Worker de vídeo (WaveSpeed)

Busca na WaveSpeed o clipe encomendado e salva no Storage.

```bash
npm run video:worker
```

> 💸 **Sobre custo:** a geração do clipe **já foi cobrada** quando você clicou em "Gerar
> vídeo" no painel. O worker só **busca o resultado** — ele nunca encomenda nada sozinho.
> Isso é proposital: worker reprocessa tarefa travada, e **retry automático não pode
> conviver com cobrança**.

### 6.2 Worker da autópsia (Python)

Baixa o vídeo do concorrente, extrai grades de frames e transcreve o áudio. Precisa de
**Python + ffmpeg + faster-whisper** (Partes 1.4 e 1.5).

```bash
python scripts/worker-autopsia.py
```

Na primeira execução ele baixa o modelo de transcrição — leva uns 30 segundos.

### 6.3 Worker de composição do anúncio (Remotion)

Pega os anúncios que você montou na bancada (`/video-maker`) e renderiza o MP4 final —
faixa do gancho, clipe, legenda queimada e CTA, tudo junto.

```bash
npm run video:compor
```

Na primeira execução ele baixa um Chrome próprio (**102 MB**), só uma vez. Referência de
tempo medida: **45 segundos para um anúncio de 5,7s** (~8× a duração do vídeo).

> 💡 **Este worker não gasta nada.** A narração já foi paga quando você clicou em "Gerar
> voz", e o banco recusa job de composição sem narração. Renderizar é de graça — por isso
> ele **insiste sozinho** até 3 vezes se falhar, ao contrário do worker de vídeo.
>
> ⚠️ **Rode sempre pelo `npm run video:compor`, nunca chamando o arquivo direto da raiz.**
> O script entra na pasta `remotion/` antes de rodar, e isso não é frescura: o Remotion
> procura o Chrome na pasta em que você está, não onde ele está instalado. Rodando da
> raiz, ele baixa uma segunda cópia de 107 MB e trava na extração — o job fica preso em
> "processando" para sempre, sem nenhuma mensagem de erro.

---

## 🤖 Parte 7 — Ferramentas de IA para desenvolver

Esta parte é para quem vai **mexer no código com ajuda de IA** — inclusive para outra
pessoa (ou outro agente, em outro terminal) conseguir dar suporte remoto neste projeto.
**Nada aqui é necessário para o projeto simplesmente rodar.**

### 7.1 Claude Code

O agente de terminal que desenvolve neste repositório.

- Site: **<https://claude.com/claude-code>**
- Documentação: **<https://docs.claude.com/en/docs/claude-code/overview>**

Instalação (precisa do Node da Parte 1.1):

```bash
npm install -g @anthropic-ai/claude-code
```

Depois, **dentro da pasta do projeto**:

```bash
claude
```

Na primeira vez ele pede login na conta Anthropic pelo navegador.

> 📌 **Ao abrir neste projeto, o Claude Code lê sozinho o [`CLAUDE.md`](CLAUDE.md)** — é
> lá que estão as regras da casa, inclusive a regra nº 1: **não commitar sem pedir.**

### 7.2 Superpowers — o pacote de habilidades

Conjunto de *skills* que ensinam o agente a trabalhar com método: planejar antes de
codar, depurar de forma sistemática, revisar o próprio trabalho, verificar antes de dizer
que terminou. Este projeto usa intensamente — os planos em `docs/superpowers/` saíram
dele.

- **Repositório:** <https://github.com/obra/superpowers>
- **Marketplace** (é por onde se instala): <https://github.com/obra/superpowers-marketplace>

Dentro do Claude Code, digite:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

> **Versão em uso aqui:** `superpowers@superpowers-marketplace` **6.2.0**.

### 7.3 Playwright MCP — dar olhos ao agente

Permite que o agente **abra o navegador, clique, digite e tire print**. Foi assim que os
bugs visuais da bancada de vídeo foram encontrados — coisas que nenhum `tsc` ou `build`
pega.

- **Repositório:** <https://github.com/microsoft/playwright-mcp>

Instalação (Mac/Linux):

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

**No Windows**, precisa passar pelo `cmd` — é assim que está configurado nesta máquina:

```bash
claude mcp add playwright -- cmd /c npx @playwright/mcp@latest
```

Na primeira execução ele baixa os navegadores sozinho. Se falhar, force com:

```bash
npx playwright install
```

### 7.4 Supabase MCP — dar acesso ao banco

**Já vem configurado** neste repositório, no arquivo [`.mcp.json`](.mcp.json) — ele aponta
para o projeto Supabase por HTTP. Você só precisa autorizar quando o Claude Code pedir.

- Documentação: <https://supabase.com/docs/guides/getting-started/mcp>

---

## 🚑 Quando der errado

Tudo abaixo **já aconteceu neste projeto**, com a causa real anotada. Procure o seu
sintoma antes de investigar do zero.

### `npm install` falha com erro de *peer dependency*

Use `npm install --legacy-peer-deps`. Não é opcional — explicação na Parte 2.2.

### `npm run build` falha com `EPERM: operation not permitted, symlink`

**É um defeito conhecido desta máquina, não do seu código.** A combinação
`output: "standalone"` + dependências instaladas com pnpm + Windows sem Modo de
Desenvolvedor faz a cópia final quebrar. **A compilação em si termina com sucesso** — só
o último passo falha.

🚨 **A consequência que morde:** como o build morre no fim, ele deixa a pasta `.next` pela
metade. E `build` e `dev` **compartilham essa pasta**. Rodar o build com o site ligado
**derruba o CSS do painel** — a tela fica branca, com fonte Times New Roman, e parece que
tudo explodiu. Não é "às vezes"; é garantido.

**A regra:** use `npx tsc --noEmit` como verificação, não o build. Se precisar mesmo do
build, **desligue o `npm run dev` antes** e apague a `.next` depois.

### `npm run build` falha com `PageNotFoundError: Cannot find module for page: /_document`

Falha **transitória, sem causa diagnosticada**. Já falhou uma vez e passou na segunda
tentativa **com o código exatamente igual**. **Rode de novo antes de investigar.**

### A página abre vazia, sem estilo, ou com fonte estranha

Quase sempre é a `.next` corrompida pelo problema acima:

```bash
# 1) desligue o npm run dev com Ctrl + C
rm -rf .next
npm run dev
```

No PowerShell: `Remove-Item -Recurse -Force .next`

### Configurei a chave no `.env.local` mas o projeto ignora

Você provavelmente tem **uma variável de ambiente do Windows com o mesmo nome**. Ela
sobrepõe o arquivo **em silêncio** (Parte 3.5, regra 2). Para confirmar:

```bash
node -e "console.log(process.env.NOME_DA_VARIAVEL ? 'existe no sistema' : 'nao existe no sistema')"
```

Se disser *"existe no sistema"* e você não colocou lá, achou a causa.

### O painel está vazio, mas eu sei que tem dados no banco

Provável falta de **policy de RLS** na tabela. O Supabase bloqueia leitura por padrão;
sem uma policy que libere, o painel enxerga zero linhas — **sem erro nenhum**, só vazio.
Confira as policies da tabela no painel do Supabase.

### Acentos viram `?` ou um losango preto com interrogação quando eu testo uma rota

**Não use `curl` do Git Bash no Windows para mandar texto em português.** Ele envia o
corpo em cp1252, e o acento chega no servidor como *replacement character* (`U+FFFD`,
aquele losango) — que então vai assim para a API externa e é gravado no banco.

Medido aqui: a palavra `Você` chegou com o `ê` substituído, e o áudio gerado saiu com o
texto corrompido. **O código estava certo** — era o terminal. Use Node para testar:

```bash
node --env-file=.env.local meu-script.mjs
```

### O worker não pega a minha tarefa

Confira se ele está mesmo rodando, **num terminal separado**, e que o terminal não foi
fechado. O painel avisa na tela quando há tarefa parada esperando tempo demais.

### Não consigo clonar o repositório

O repositório é **público**, então `git clone` funciona sem login. Se falhar, quase sempre é
uma destas: o Git não está instalado (Parte 1.2), a URL foi digitada errada, ou a rede
bloqueia o GitHub. Teste com `git --version` e abra
<https://github.com/victorrmd05-dev/synapse> no navegador.

Se aparecer pedido de **usuário e senha**, você provavelmente tentou `git push` — isso sim
exige ser colaborador e usar um **Personal Access Token** como senha (o GitHub não aceita
mais senha comum). Crie um em <https://github.com/settings/tokens> → *Generate new token
(classic)* → permissão **`repo`**.

---

## 🗺️ Mapa do projeto

```
.
├── src/
│   ├── app/              # Páginas e rotas de API (Next.js App Router)
│   │   ├── api/          # As "mãos": rotas que chamam IA, banco e serviços externos
│   │   ├── mineracao/    # Cada pasta aqui é uma tela do painel
│   │   ├── video-maker/  #   ...
│   │   └── ...
│   ├── components/       # Peças de interface reutilizáveis
│   ├── lib/              # Clientes externos (Supabase, IAs, Meta, Storage)
│   └── video/            # A composição do anúncio — lida pelo site E pelo renderizador
├── remotion/             # Renderizador de vídeo — projeto SEPARADO, nunca importado pelo site
├── scripts/              # Workers e utilitários de linha de comando
├── supabase/migrations/  # Histórico do banco, em ordem cronológica
├── agentes/              # O "cérebro" de cada agente, em markdown
├── docs/superpowers/     # Especificações e planos de implementação
├── .env.local.example    # Modelo das variáveis de ambiente (documentação viva)
├── CLAUDE.md             # Regras e arquitetura — leitura obrigatória para desenvolver
└── NOTES.md              # Diário de bordo: o que foi feito, o que quebrou e por quê
```

### Três regras de ouro do código

1. **`supabase` vs `supabaseServer` — nunca troque.** O `src/lib/supabase.ts` usa a chave
   pública e respeita as permissões do banco: é para o **navegador**. O
   `src/lib/supabase-server.ts` usa a `service_role`, que **ignora todas as permissões**:
   é **só** para servidor. Importar o segundo no navegador expõe o banco inteiro.
2. **A pasta `remotion/` nunca é importada pelo site.** A seta aponta ao contrário:
   `remotion/` importa de `src/video/`. É isso que mantém 48 MB de binário nativo fora
   do site.
3. **Nenhuma chave no código.** Sempre `process.env`, sempre por rota de API — nunca no
   navegador.

---

<div align="center">

**Alavanca AI** · plataforma proprietária · uso interno

*"Métricas certas, escala garantida."*

</div>
