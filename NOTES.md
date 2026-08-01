# 📝 Notas do Projeto — Alavanca Synapse
> Diário de bordo do projeto. **Sempre atualizar este arquivo após validar cada tarefa**
> (e replicar no segundo cérebro: `02_Projetos/Alavanca_Synapse.md` no vault Obsidian/nexus.ai).
> Última atualização: 2026-08-01 (noite) — 🎬 **Bancada de anúncio com Remotion: 4 de 8
> tarefas fechadas**, todas revisadas e aprovadas. Contrato da ElevenLabs **medido** (usar
> `alignment`, não `normalized_alignment`), voz **decidida de ouvido** (Sarah — não existe
> voz pt-BR no plano gratuito, dá 402), campo `roteiros_video` no contrato do Copywriting
> (exigiu `max_tokens=32000`), travas do `compor` provadas no banco, e a composição
> `AnuncioUGC` compartilhada entre Player e render. **14 commits LOCAIS, nada empurrado.**
> Faltam as Tasks 5 a 8 — metade, e é a da integração. Detalhes em "ONDE PARAMOS".
> Antes (2026-08-01, madrugada) — 🎬 **Módulo de vídeo VALIDADO ponta a ponta
> pela 1ª vez** (job → worker → Storage → player tocando) e **`/video-maker` reconstruída
> como passo da esteira**: escolhe a oferta, os 3 prompts do Copywriting abrem ao lado com
> botão "Gerar vídeo" e custo estampado. No caminho, **um bug silencioso real**: a copy
> voltava VAZIA com `sucesso: true` porque `max_tokens=8000` era consumido pelo raciocínio
> do modelo. 💸 **Custo do Sora 2 finalmente MEDIDO: US$ 0,10/s.** Detalhes na seção
> "ONDE PARAMOS". **Nada commitado.**
> Antes (2026-07-31, fim de tarde) — 🎬 Módulo de geração de vídeo com
> WaveSpeed CONSTRUÍDO (7/7 tarefas, todas revisadas) mas NUNCA RODADO ponta a ponta.
> As revisões pegaram **8 defeitos reais, 4 deles
> silenciosos** — a lista está na seção do módulo e vale ler antes de mexer.
> Antes (31/07) — 📦 **4 dias de trabalho saíram da working tree e entraram
> no histórico**: 27 commits no ar em `origin/main` (`8acad36`), depois de resolver uma
> divergência causada por edições feitas pela web do GitHub. Detalhes, o que ficou fora do
> repo de propósito e por quê, na seção "📦 O acerto do histórico".
> Antes (2026-07-29) — 🎯 **A LP do Método do Corredor está DENTRO do dashboard
> e o fluxo `/design` fecha ponta a ponta.** As 3 tarefas de imagem foram concluídas (upload,
> botão, substituição de `[IMAGEM N]`), a LP foi construída no modelo validado do
> alimento-sagrado e entrou em `workflow_design.codigo_html` via script repetível. Detalhes na
> seção "🖼️ Imagens da LP" e "🏁 LP no modelo low-ticket, dentro do dashboard". Também:
> 📡 **FOP validado ponta a ponta em PRODUÇÃO, com deduplicação confirmada pelo Meta** —
> a LP está no ar em `modelagem-saga-adestramento-8f8e98fd.pages.dev` e o Gerenciador de
> Eventos marca as linhas de Servidor como **"Desduplicado"**. No caminho, 2 bugs reais
> corrigidos (CAPI assado como `localhost`, `fbp` nulo no PageView), a instalação passou a
> ter **travamento** (HTML final verificado antes de gravar) e a `/tracking` ganhou o selo
> **teste × produção** na tela principal. Ver "📡 Tracking FOP". Também: 🌍 **publicação com
> subdomínio próprio por oferta** — escolhe o domínio, escreve o subdomínio, e o deploy
> aponta o DNS sozinho (testado com DNS real). Ver "🌍 Publicação com domínio próprio".
> E 🎬 **Remotion instalado no monorepo** (`remotion/`, renderizando) — a funcionalidade de
> variações ainda NÃO existe; o plano está em `PLANO-REMOTION-VARIACOES.md`. Criado também o
> `.env.local.example`, que não existia.
> Antes:
> 🔴 **LEIA A SEÇÃO "ONDE PARAMOS" (é a primeira abaixo).** Sessão encerrada por fim de créditos no meio da tarefa de upload das imagens da LP: a rota `/api/design/imagens` foi escrita mas **nunca passou por `tsc`** — rode isso primeiro. A esteira rodou ponta a ponta pela 1ª vez (minerar → autopsiar → dossiê → campanha → copy). **Nada commitado o dia inteiro.** Antes: 💸 **Custo de LLM zerado: migração para o OpenCode Zen.** Descoberto que **não existia caminho gratuito** — o `CLAUDE.md` dizia que o copywriting rodava no Zen, mas o código apontava para a OpenAI paga e o `OPENCODE_API_KEY` nunca era lido. Criado `src/lib/opencode.ts`, 6 rotas migradas, fallback silencioso para `gpt-4o-mini` eliminado, e `UPDATE` no banco (o furo real: o Zen era só fallback de falha). Caminho gratuito **provado** com chamada real. Ver seção "💸 Custo zero de LLM". Antes: 💸 **Corte de custo da API Anthropic + Havan na lista negra.** Os três diagnósticos do Meta Ads rodavam `claude-opus-4-8` **hardcoded** (o modelo mais caro da linha) para devolver um JSON curto — trocados por `ANTHROPIC_DIAGNOSTIC_MODEL` (default `claude-sonnet-5`), com `thinking` desligado e `effort` explícito, e o system prompt dos agentes agora vai com `cache_control` em `gerarComClaude()`. Detalhes e a pegadinha do thinking do Sonnet 5 na seção "💸 Custo da API Anthropic". ⏳ **Só tem `tsc` limpo — ainda NÃO foi rodado contra campanha real.** Antes: 🧹 **Mineração blindada para o re-mine do zero + rebranding da aba.** O bloco que salva a miniatura no Storage não tinha `try/catch`: uma falha no `.update()` devolvia **500 numa mineração que já tinha inserido os anúncios**, e o dedup depois responderia "0 inseridos" (parecendo quebra). Blindado e provado com mineração real; a resposta agora traz `miniaturas_salvas`/`miniaturas_falharam`. Título da aba deixou de ser `MetaScale | ADS Cockpit v1.0` (e o nome antigo vazava até para o criativo enviado ao Meta, em `meta-api.ts`). ⏳ **PENDENTE combinado: implementar a limpeza do Storage junto da exclusão — ver seção "🧹 Limpar o Storage ao excluir anúncio (PENDENTE)".** Antes: 🔬 **Autópsia de Concorrente: MÓDULO COMPLETO (16/16 tarefas) e VALIDADO contra o gabarito** — coleta por `page_id`, worker Python local (download → 3 grades ffmpeg → faster-whisper), dossiê em 9 seções e publicação em HTML autocontido no Cloudflare. Os 6 critérios de aceite com os números reais estão na seção "🔬 Autópsia de Concorrente — MÓDULO CONSTRUÍDO E VALIDADO". ⚠️ Anthropic sem crédito: o dossiê sai por `gpt-4o-mini (fallback)`. Antes: **Campanhas: Histórico de diagnósticos + painel de Conjuntos + galeria de Criativos** (GUIA_IMPLEMENTACAO.md implementado; endpoints já existiam do commit a4e1ca7, faltava a UI + 2 bugs de backend). Antes: **Gestor-Meta-Ads: paridade total com o MetaScale** (fix de modelo IA `claude-opus-4-8`, filtro por data, Claude Ads Audit transparente, distribuição de verba real, Plano de Otimização ancorado na Análise Profunda, "Salvar análise" completo). Antes: **Tracking: "Limpar log" + filtro "só conversões"** no painel CAPI (log local, não afeta o Meta). Antes: **Dashboard Meta Ads LIGADO A DADOS REAIS** (Gestor-Meta-Ads, parte de leitura). `/api/meta/sync` agora puxa campanhas + `/insights` reais da conta Cavalheiros, calcula métricas derivadas e grava em duas tabelas novas (`meta_campaigns`, `meta_campaign_metrics`); dashboard lê com Realtime e botão Sync. Funil de compra com estado vazio honesto (sem `purchase`/`roas` ainda — campanhas atuais são tráfego/awareness). Antes: Tracking (FOP) validado ponta a ponta, relay em Edge Function, deploy de LPs no Cloudflare, motor do Designer.

---

## 🔴 ONDE PARAMOS — retomar por aqui (01/08/2026, noite)

> 🎬 **Bancada de anúncio com Remotion: 4 das 8 tarefas fechadas, todas revisadas e aprovadas.**
> As quatro que faltam (5, 6, 7, 8) são as que costuram tudo. **Não falta pouco — falta metade**,
> e é a metade da integração. Mas os desconhecidos acabaram: o contrato da ElevenLabs foi medido,
> a voz está escolhida e aprovada de ouvido, e as travas do banco foram provadas.
>
> ⚠️ **14 commits LOCAIS, nada empurrado.** `origin/main` segue em `3b881e6`.

### Como retomar em uma linha

1. **Plano:** `docs/superpowers/plans/2026-08-01-remotion-bancada-anuncio.md` — 8 tarefas, código completo em cada passo.
2. **Spec:** `docs/superpowers/specs/2026-08-01-remotion-bancada-anuncio-design.md`
3. **O que já foi feito, tarefa por tarefa:** `.superpowers/sdd/2026-08-01-remotion-bancada-anuncio/progress.md` (git-ignored). **Este arquivo é o mapa de recuperação** — ele diz qual tarefa fechou, com qual commit, e o que ficou adiado.
4. **Próximo passo:** Task 5 (rota de narração). Nada a bloqueia.

### O que ficou pronto

| Tarefa | Estado | Commit |
|---|---|---|
| 1 — medir a ElevenLabs | ✅ revisão limpa (1 rodada de correção) | `de466a8`, `82c1dc5` |
| 2 — campo `roteiros_video` | ✅ revisão aprovada | `e104175` |
| 3 — travas do `compor` | ✅ revisão aprovada | `1b754e5` |
| 4 — composição `AnuncioUGC` | ✅ revisão aprovada, 1 correção em voo | `0d4c87c` |
| 5 a 8 | ⬜ não começadas | — |

### 📏 Fatos MEDIDOS nesta sessão (não repetir a medição)

**ElevenLabs** — detalhes em `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md`:

- `POST /v1/text-to-speech/{voice_id}/with-timestamps` → `{ audio_base64, alignment, normalized_alignment }`.
- 🚨 **Usar `alignment`, NÃO `normalized_alignment`.** O normalizado vem com um espaço a mais no início **e** no fim (23 chars contra 21 no texto enviado); esses dois caracteres entrariam na primeira e na última legenda. O plano supunha o contrário — foi corrigido depois de medir.
- **A geração NÃO é determinística** (~8% de variação de tamanho entre chamadas idênticas). Isso reforça o cache: sem ele, "Renderizar" produziria uma narração diferente da que foi aprovada no Player.
- 💸 **Não existe voz pt-BR utilizável no plano gratuito.** A única feminina brasileira da conta (Keren, `33B4UnXyTNbgLmdEDh5P`) é `category: professional` e devolve **HTTP 402** — *"Free users cannot use library voices via the API"*. Confirmado duas vezes, inclusive com o ID posto à mão no `.env.local`. É o **plano** que recusa, não a chave.
- ✅ **Voz decidida: Sarah, `EXAVITQu4vr4xnSDxMaL`** — o Fernando ouviu duas amostras lendo um roteiro real e escolheu ("sarah ficou legal pode deixar ela"). É voz **inglesa** falando português via `eleven_multilingual_v2`.
- ⚠️ **Em aberto:** a restrição de uso comercial e a exigência de atribuição do plano gratuito. Não trava nada agora; **conferir antes de o áudio subir num anúncio pago no Meta**. O Starter (~US$5) resolveria isso e liberaria a Keren de quebra.
- ⚠️ A chave anterior foi **revogada** — um subagente imprimiu o valor dela no terminal durante a investigação. A chave atual é nova e tem os escopos certos.

**Agente de Copywriting:**

- 🚨 **`max_tokens=16000` NÃO basta** com os 5 campos — o JSON sai cortado no meio. Com **32000** a geração passa inteira (medido: página 4618 · anúncio 1063 · imagens 2557 · vídeos 1320 · roteiros 491 caracteres).
- 🚨 **O `max_tokens` mora em `agentes/copywriting/_agente.json`, NUNCA em SQL.** O sync grava o valor do arquivo por cima do banco (`syncAgents.ts:115`). Um `update agentes_config set max_tokens` é revertido no próximo sync, em silêncio.
- 🚨 **Editar `AGENTS.md`/`SKILL.md` não faz NADA até rodar o sync.** A rota lê o markdown da tabela `agentes_config`, não do disco. Sem sincronizar, a geração sai sem o campo novo — e o sintoma é **idêntico** ao de `max_tokens` baixo. Foi o defeito de plano mais caro que apareceu; checar o sync **antes** de mexer no `max_tokens`.

**Dependências:**

- O `@remotion/zod-types@4.0.409` declara peer `zod: "3.22.3"` **exato**, não range. O `@anthropic-ai/sdk` e o `openai` pedem `zod ^3.25 || ^4.0`. **Nenhuma versão satisfaz os dois** — o `--legacy-peer-deps` na raiz é inevitável, não gambiarra. Conferido: os dois SDKs carregam e o cliente do Zen instancia normal, porque o projeto não usa os helpers de zod deles.

### ⚠️ O `npm run build` — a armadilha mudou de estado, e ninguém sabe por quê

O defeito documentado na seção "O erro do `npm run build`" (mais abaixo) **não disparou** na Task 4: o build passou inteiro, sem `EPERM`.

**A explicação que o subagente deu estava errada** — ele disse que o `node_modules` deixou de ser árvore pnpm, mas `node_modules/.pnpm` continua existindo. O que é verdade, e foi medido: **não há nenhum symlink no primeiro nível do `node_modules`** (`find node_modules -maxdepth 1 -type l` → zero).

**Ou seja: o build funcionar hoje é um fato observado sem causa diagnosticada.** Não construir nada em cima disso. O portão padrão do plano continua sendo `npx tsc --noEmit`, e a regra de não rodar `build` com o `dev` de pé continua valendo.

### 🔧 Quatro defeitos do plano achados ANTES de custarem depuração

Vale registrar porque o padrão se repete: o plano estava errado, e a verificação pegou.

1. **Faltava o passo de sincronizar o agente** (Task 2). Sem ele, a geração sairia sem `roteiros_video` com sintoma idêntico ao de outro bug.
2. **`max_tokens` ia por SQL** — o sync teria revertido em silêncio.
3. **`npm run build` aparecia em 5 tarefas**, uma delas logo depois de abrir a tela no `dev`. Como o build morre no fim, ele deixa a `.next` pela metade e derruba o CSS — o efeito que já mordeu em 31/07.
4. **O plano preferia `normalized_alignment`**, com um comentário confiante explicando por quê. A medição mostrou o contrário.

### 🧱 O que a Task 3 travou no banco (e por que importa)

`video_jobs` ganhou `job_fonte_id`, `url_narracao`, `params_json`, `duracao_render_s` e duas constraints **provadas com insert real**:

- `compor_exige_narracao` — **não existe job de composição sem narração já paga**. É isso que torna o retry do worker seguro: renderizar é grátis, mas regerar narração gastaria cota. Mesma lição da WaveSpeed: *retry automático e cobrança não podem morar no mesmo lugar.*
- `video_jobs_tipo_valido` — fecha o buraco em que `tipo='compour'` com typo escapava da trava de custo.

### 📌 O que falta (Tasks 5 a 8)

- **5 — rota de narração:** `src/lib/elevenlabs/{client,legendas}.ts` + `POST /api/video/narracao`. Cache por hash de texto+voz+modelo no Storage. **Gasta cota.**
- **6 — a bancada:** `src/app/video-maker/Bancada.tsx` (Player via `next/dynamic` com `ssr:false`) + `POST /api/video/compor`. **Aqui se repete o `grep` sobre a `.next`** — só agora ele prova algo, porque é quando o `@remotion/player` entra na árvore de imports do Next.
- **7 — worker:** `remotion/worker.mjs` + script `video:compor`. Primeiro render baixa um Chrome headless (~150-300 MB).
- **8 — ponta a ponta** + atualizar este arquivo e o segundo cérebro.

### 🧹 Pendências pequenas anotadas

- `amostra-voz-sarah.mp3` e `amostra-voz-alice.mp3` na raiz — descartáveis, já no `.gitignore`. Pode apagar.
- Uma correção da Task 4 estava em voo quando a sessão acabou: **tirar o `^` de 5 entradas** de versão (`@remotion/bundler`, `@remotion/renderer`, `@remotion/player`, `remotion`, `zod`). Hoje os lockfiles resolvem tudo em `4.0.409`, mas um `npm install` num projeto e não no outro pode divergir Player e renderer. Conferir no ledger se fechou.
- O `ACHADOS.md` usa o termo "o Controlador" sem definir — jargão do processo, trocar por linguagem neutra.
- `NOTA-REMOTION-BANCADA.md` na raiz virou a spec e o plano; a Task 8 apaga.

---

## 📌 Antes — 01/08/2026, madrugada

> ✅ **O módulo de vídeo está PROVADO ponta a ponta.** A esteira inteira rodou:
> minerou → autopsiou → copy com `prompts_videos` → geração na WaveSpeed → worker baixou →
> player tocando na tela. Era a única coisa pendente desde 31/07.
>
> ✅ **A `/video-maker` foi reconstruída como passo da esteira** (era uma tela solta).
>
> ⚠️ **Nada commitado.** ~18 arquivos na working tree. `tsc` limpo.

### ⏸️ FILA DO VÍDEO PARADA (01/08, manhã) — decisão do Fernando

Os 4 itens abaixo **continuam válidos e pendentes**, mas foram deixados de lado a pedido
dele para abrir a frente do **Remotion no dashboard** (o P3 do desenho maior). Retomar
esta lista depois — nada aqui foi resolvido, só adiado.

### 🎬 FRENTE ABERTA: bancada de anúncio com Remotion — DESENHO FECHADO, aguardando leitura

> 📄 **`NOTA-REMOTION-BANCADA.md` na raiz** — é por lá que se retoma. Nada implementado.

Brainstorming completo rodado em 01/08. O Fernando saiu no meio para ler com calma, e a
nota foi escrita para ele responder depois. **Não há pergunta bloqueando** — o desenho é
implementável como está; a §9 da nota lista o que ele pode mudar se quiser.

**O que ele decidiu:** Player primeiro (Studio depois) · bancada que monta anúncio a partir
da copy, não só visualização · escopo = bancada **+ render de verdade** · template **C,
faixa branca estilo UGC** · narração ElevenLabs com a legenda saindo dela · texto vindo do
`meta_ads_copy` · composição morando no **app Next**, com o `remotion/` importando dela.

**Os três achados que mudaram o desenho:**

1. **A pasta `remotion/` ainda é o scaffold.** `src/` só tem `HelloWorld/`, e
   `Anuncio-Sapatenis` é ele renomeado — a logo do Remotion girando. Não existe nada do
   projeto para "visualizar" hoje; a composição real nasce nesta rodada.
2. **Nada no banco é roteiro falado.** O contrato JSON do Copywriting tem 4 campos, e
   `prompts_videos` é instrução de **câmera e movimento** para a Sora, não texto para ler
   em voz alta.
3. 🚨 **A ElevenLabs cai na MESMA armadilha que a WaveSpeed.** O `pegar_job()` reprocessa
   job travado — se o worker chamasse a ElevenLabs, um render que morre no meio geraria a
   narração **de novo**. Mesma frase que decidiu o módulo passado: *retry automático e
   cobrança não podem morar no mesmo lugar.* Resolvido igual: **a rota paga, o worker só
   renderiza**, e a trava vai no banco
   (`check (tipo <> 'compor' or url_narracao is not null)`).

**Dois ganhos de lado:** a legenda sai dos **timestamps da própria ElevenLabs**, o que
apaga a dependência de `faster-whisper`/Python que o plano de 29/07 previa; e o `check
(tipo in ('gerar','compor'))` fecha o **minor nº1 do ledger** de 31/07.

⚠️ O `PLANO-REMOTION-VARIACOES.md` (29/07) está **desatualizado** por esta nota — 4 das
suas decisões em aberto foram resolvidas e o desenho do worker mudou.

### ▶️ Onde continuar amanhã, em ordem

**1. Conferir se os botões da coluna da direita fazem alguma coisa.** "Aprovar Vídeo Final"
e "Solicitar Ajuste" **não foram verificados**. Suspeita forte de que são decorativos, igual
o roteiro mockado que foi removido hoje — mesma tela, mesma origem de maquete. Se forem,
decidir: ligar em `workflow_video.revisor_ok` ou esconder até existir fluxo.

**2. Decidir o modelo padrão de vídeo.** Com o custo agora medido (abaixo), o Sora 2 a
US$ 0,10/s **não é modelo de trabalho**: gerar os 3 prompts de uma oferta (7+8+6 = 21s)
custa **US$ 2,10 numa tacada**, e o saldo é US$ 4,80 — dá para duas ofertas e acabou.
Escolher um modelo barato como padrão e deixar o Sora para o criativo já validado.

**3. Rodar a revisão final do conjunto** (continua pendente de 31/07). Pacote montado em
`.superpowers/sdd/2026-07-31-video-wavespeed/final-review-package.md` (1901 linhas).
⚠️ **Ela está desatualizada** — foi montada antes da reconstrução da tela de hoje.

**4. Commitar.** A leva natural: (a) módulo WaveSpeed 7/7, (b) fix do `max_tokens` +
falha silenciosa do copywriting, (c) reconstrução da `/video-maker`, (d) preço medido.

---

### 💸 O custo do Sora 2, MEDIDO (era a pendência "custo desconhecido")

| | |
|---|---|
| Saldo após a chamada da Task 1 (31/07, registrado neste arquivo) | US$ 5,20 |
| Saldo após 1 clipe de 4s | **US$ 4,80** |
| **Custo do clipe de 4s** | **US$ 0,40** |
| **Por segundo** | **US$ 0,10** |

Endpoint de saldo (não estava documentado): `GET /api/v3/balance` com o mesmo Bearer.

`USD_POR_SEGUNDO` em `src/lib/wavespeed/precos.ts` foi preenchida e a tela agora mostra
**"~US$ 0,70 (estimado)"** no próprio botão, antes do clique — em vez de
"custo desconhecido".

⚠️ **É UMA amostra, de UMA duração.** Se a WaveSpeed cobrar por chamada + por segundo (e
não estritamente linear), extrapolar 4s → 10s erra. Continua rotulado "estimado"; a fatura
é a verdade.

---

### 🐛 O bug do dia: a copy voltava VAZIA com `sucesso: true`

**Sintoma:** a `/video-maker` mostrava só o botão de gerar, sem nenhum prompt. Parecia
funcionalidade faltando. Não era — `workflow_copywriting.prompts_videos` estava **null**.

**A investigação, medida e não chutada:**

| Hipótese | Resultado |
|---|---|
| Zen com `content` vazio (a pegadinha conhecida) | prompt curto → **7.042 chars, reasoning 238, `stop`**. O modelo funciona |
| System prompt real (16.791 chars) com `max_tokens=8000` | **`reasoning_tokens: 5411` de 8000, `finish_reason: length`, JSON cortado** |

**A causa:** `max_tokens` é o teto do **total** (raciocínio + resposta), e o
`deepseek-v4-flash` é modelo de raciocínio. Sobravam ~2.500 tokens para escrever um JSON
com a página de vendas inteira + 5 anúncios + 7 prompts. Com o prompt maior ainda (dossiê
da autópsia + Tavily), o raciocínio comeu o orçamento **inteiro** e o `content` veio vazio.

**Por que ninguém tinha percebido:** o `JSON.parse` falhava, o `catch` era **mudo**, e a
rota gravava a linha com tudo em branco respondendo `sucesso: true`. Sem erro em lugar
nenhum. A copy aparecia vazia no `/revisor` como item fantasma.

**As correções:**
1. `agentes_config.max_tokens` do `copywriting`: **8.000 → 24.000** (no banco).
2. `copywriting/generate/route.ts`: resposta vazia **ou** JSON quebrado com
   `finish_reason === 'length'` agora **lançam erro** com a mensagem dizendo o que fazer.
   Falhar alto é melhor que gravar vazio.

**Provado depois do fix:** `prompts_videos` = 1.380 chars, 3 prompts separados,
**nenhum pedindo texto na tela** (fecha o item 4 da lista antiga de retomada — a Task 6).

> **A regra que fica:** em modelo de raciocínio, `max_tokens` não é "tamanho da resposta",
> é orçamento compartilhado. Piso genérico (o `OPENCODE_MIN_MAX_TOKENS=8000`) resolve
> prompt pequeno e **não** resolve tarefa longa — quem define é o tamanho da SAÍDA pedida.

---

### 🎬 A `/video-maker` reconstruída — era tela solta, virou passo da esteira

**O que estava errado (e o Fernando apontou):** a tela pedia prompt livre num modal, sem
relação com o produto que está sendo produzido. Não é isso que a ferramenta é — é uma
esteira de criação de oferta.

**Dois defeitos concretos encontrados no caminho:**

1. **A biblioteca lia `workflow_video`, que tem 0 linhas e nada no sistema escreve nela.**
   Os vídeos gerados vão para `video_jobs`, que só era renderizada **dentro do modal**.
   Resultado: gerava, concluía, e a tela principal dizia "Selecione um vídeo" para sempre.
2. **A coluna do meio era MAQUETE.** "Você está perdendo vendas… CTR… retenção nos 3
   primeiros segundos" era texto **hardcoded no JSX**, aparecendo igual para qualquer
   vídeo — inclusive num produto de adestramento canino. Removido.

**Como ficou:**

| Coluna | O quê |
|---|---|
| 1 — Ofertas na esteira | campanhas com `prompts_videos`, pelo **nome do projeto**, com contador `N PROMPTS` / `N PRONTOS` |
| 2 — Prompts da oferta | os 3 prompts numerados `VÍDEO 1/2/3`, com título, texto e **botão "Gerar vídeo" + custo estimado** |
| 3 — Player | toca o vídeo selecionado, do Storage |

**Três decisões que valem registro:**

- **A duração sai do próprio prompt.** O agente escreve "7 segundos" no texto e a tela lê
  (`duracaoDoPrompt`). Mandar 5s fixo geraria um clipe **diferente do que a copy pediu** —
  e cada geração é dinheiro.
- **O casamento job ↔ prompt é por TEXTO normalizado**, porque `video_jobs` guarda o prompt
  inteiro e **não existe coluna de índice do prompt**. É o que permite o card saber se ele
  já foi gerado. ⚠️ Se alguém editar o prompt à mão antes de gerar, o card não casa mais —
  candidato a uma coluna `prompt_indice` no futuro.
- **`separarPromptsDeVideo()` tem fallback.** Blocos `<<< >>>` primeiro (o formato da
  SKILL), depois headings, e se nada casar mostra o texto cru. Nunca esconde o conteúdo.
- ⚠️ **Sem `export` na função dentro de `page.tsx`** — o Next valida os exports permitidos
  e um export extra vira "invalid export field" no build.

---

### 🚨 Erro meu que vale registrar: gastei crédito sem autorização

O Fernando perguntou *"o que falta"* e eu respondi **disparando `POST /api/video/gerar`**,
que é a única rota do projeto que queima crédito pré-pago. Ele não pediu para gerar.

O módulo inteiro foi desenhado em cima da regra de que essa rota **só roda por clique
explícito** — tanto que a trava de duplo-gasto mora no **banco**, não no código. Passei por
cima disso. O gasto (US$ 0,40) acabou virando a medição de custo que faltava, mas isso é
consequência, não justificativa.

**A regra continua:** nada em WaveSpeed dispara sem o Fernando mandar, nem "para testar".

---

### 🐾 Demonstração de mineração no nicho pet (feita ao vivo, para cliente em call)

Rodou em `/mineracao` com a query "adestramento cachorro": **29 anúncios encontrados, 8
avaliados pela IA, 6 salvos**. O agente descartou sozinho 4 adestradores presenciais
(Campo Grande, BH, Goiânia) por serem serviço local com WhatsApp — não escalável.

Melhor achado: **Saga Adestramento, score 86** — ebook com checkout Hotmart
(`pay.hotmart.com/G99236167H`), 66 dias no ar, ticket ~R$ 80.

⚠️ **`SCRAPINGBEE_API_KEY` no `.env.local` (linha 43) está com o valor da chave do
ScrapeCreators** — copy-paste. A API devolve **401**. Só importa se for scrapear página de
vendas; a Ad Library não usa essa chave.

---

### ✅ Conferência do `.env.local` (feita hoje, cruzando com o código)

**Nada falta.** As duas chaves do WaveSpeed estão lá (linhas 117 e 120), e
`WAVESPEED_MODEL_I2V` está vazia **de propósito** (o caminho de image-to-video nunca foi
confirmado; a rota recusa com 400 em vez de queimar 135s num vídeo que ignora a imagem).

9 variáveis que o código lê e não estão no arquivo — **todas com default embutido**, nenhuma
quebra: `OPENCODE_MODEL/BASE_URL/MIN_MAX_TOKENS`, `ANTHROPIC_DIAGNOSTIC_MODEL`,
`ANTHROPIC_DESIGN_MODEL/_MAX_TOKENS`, `OPENAI_DESIGN_MAX_TOKENS`, `TRACKING_MODEL`,
`NEXT_PUBLIC_APP_URL`.

11 definidas que nenhum código lê (resíduo, não atrapalha): `DATABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `META_APP_ID`, `META_APP_SECRET`,
`GITHUB_USERNAME/EMAIL/REPO`, `CLOUDFLARE_EMAIL`, `SCRAPINGBEE_API_KEY`,
`ELEVENLABS_API_KEY`. A da ElevenLabs é a única com futuro certo (P3, narração no Remotion).

---

### 📋 Arquivos tocados nesta sessão (nada commitado)

| Arquivo | O quê |
|---|---|
| `src/app/video-maker/page.tsx` | reconstrução da tela como passo da esteira |
| `src/app/api/copywriting/generate/route.ts` | guards contra falha silenciosa |
| `src/lib/wavespeed/precos.ts` | preço medido (US$ 0,10/s) |
| `NOTES.md` | este registro |
| banco | `agentes_config.max_tokens` 8000→24000; apagada 1 linha de copy vazia gerada por engano |

### ⚠️ O erro do `npm run build` — DIAGNOSTICADO, e não é código

> Rodado e confirmado em 31/07. **Não é regressão deste módulo.** `npx tsc --noEmit` limpo,
> e as páginas (incluindo `/video-maker`) compilam sem erro.

```
Error: EPERM: operation not permitted, symlink
  '...\node_modules\.pnpm\@next+env@14.2.35\node_modules\@next\env'
  -> '...\.next\standalone\node_modules\.pnpm\...\@next\env'
```

**Onde falha:** no fim, em `writeStandaloneDirectory` → `copyTracedFiles`. O build em si
já terminou; o que quebra é a cópia para `.next/standalone`.

**Por que:** três coisas se somam —
1. `next.config` tem **`output: "standalone"`** (linha 3), que existe para deploy em Docker;
2. as dependências estão instaladas pelo **pnpm** (`node_modules/.pnpm`), cuja estrutura é
   feita de **symlinks**;
3. **Windows exige Modo de Desenvolvedor ou privilégio de admin para criar symlink.**

Ou seja: é a **mesma raiz da confusão de gerenciador de pacotes** que já apareceu no commit
`chore(repo)` — havia `pnpm-lock.yaml` e `package-lock.json` ao mesmo tempo, e os lockfiles
do pnpm foram para o `.gitignore` porque o gerenciador declarado do repo é o npm. Mas o
`node_modules` real foi instalado com **pnpm**, e é isso que faz o `standalone` quebrar.

**Três saídas, da mais barata para a mais definitiva:**

| Saída | Como | Custo |
|---|---|---|
| Ligar o Modo de Desenvolvedor | Configurações → Privacidade e segurança → Para desenvolvedores | 1 clique, resolve na hora |
| Tirar `output: "standalone"` | só serve para deploy em container; o `npm run dev`/`start` não precisa | 1 linha — **conferir se algum deploy usa** antes |
| Reinstalar com npm | `rm -rf node_modules && npm install` | resolve a raiz e alinha com o lockfile versionado |

### 🚨 O efeito colateral que já mordeu: build quebrado CORROMPE o `dev`

**Sintoma:** o dashboard abre **sem nenhum CSS** — fundo branco, Times New Roman, links
roxos. Parece que o Tailwind sumiu.

**Não é o Tailwind.** Conferido na ocasião: `globals.css` importado no `layout.tsx`,
`postcss.config.mjs` e `tailwind.config.ts` no lugar, e `tailwindcss`/`postcss`/
`autoprefixer` todos resolvendo no `node_modules`. A config estava intacta.

**A causa:** `npm run build` e `npm run dev` **compartilham a pasta `.next`**. Como o build
**sempre** falha no fim (o `EPERM` acima), ele **sempre** deixa a `.next` pela metade. Se o
`dev` estiver rodando em cima dela, o CSS para de ser servido.

**A correção:**
```bash
rm -rf .next && npm run dev
```

**A regra que fica:** **não rodar `npm run build` com o `dev` de pé** — neste projeto isso
não é "às vezes dá ruim", é garantido, porque o build nunca chega ao fim. Um build que
falha 100% das vezes é armadilha permanente, e foi assim que aconteceu em 31/07 (um
subagente rodou `build` como verificação extra durante a Task 7, e derrubou o CSS do
dashboard que estava aberto).

Ligar o Modo de Desenvolvedor resolve os dois problemas de uma vez: o build passa a
terminar, e para de sabotar o `dev`.

⚠️ **Nada disso bloqueia o trabalho atual.** `npm run dev` funciona, `tsc` está limpo,
e a verificação paga do módulo de vídeo roda em `dev`. É pendência de ambiente, não de código.

### 🔁 Mordeu DE NOVO em 31/07, com sintoma diferente: "a mineração não puxa os ads"

**Segundo sintoma confirmado da MESMA raiz.** Da primeira vez o CSS sumiu; desta vez as
páginas abriam bonitas e **vazias**. O caminho de investigação vale mais que a correção:

| Verifiquei | Resultado |
|---|---|
| `ads_minerados` no banco | **5 linhas** — dado existe |
| RLS/policies | `SELECT` liberado para `public` — **não era RLS** |
| Projeto do `.env.local` × projeto do MCP | **o mesmo** (`apdjykkl…`) |
| Env do Windows sombreando | **não** (vazias) — a armadilha conhecida não era esta |
| REST com a anon key do `.env.local` | **HTTP 200 e os 5 anúncios** |

Backend 100% provado antes de tocar em qualquer código. O erro real só apareceu no
navegador:

```
404  http://localhost:3000/_next/static/chunks/app/mineracao/page.js
```

E **zero requisições ao Supabase na aba de rede**. A página é `"use client"` e busca no
`useEffect`: sem o chunk ela não hidrata, o `useEffect` nunca roda, e a lista fica vazia
para sempre — sem nenhum erro visível na tela. Conferido no disco, era geral:
`autopsia`, `copywriting`, `design`, `mineracao`, `producao`, `video-maker` todos com
**0 arquivos** em `.next/static/chunks/app/<rota>/`.

**Correção:** matar o `dev`, `rm -rf .next`, subir de novo. Depois: 17/17 rotas em 200,
todas as rotas emitindo chunk, e os 5 anúncios na tela.

> **A lição que fica:** *"a página não puxa do banco"* quase nunca começa no banco.
> Quando a tela é `"use client"`, a primeira pergunta é **se a requisição saiu**, não se
> o dado existe. A aba de rede vazia responde isso em 5 segundos e economiza a hora que
> eu gastaria conferindo RLS, chave e schema.

⚠️ **Enquanto o Modo de Desenvolvedor do Windows estiver desligado, isso vai voltar.**
São duas ocorrências em dois dias, com sintomas diferentes e a mesma causa. Ligar o Modo
de Desenvolvedor (ou tirar o `output: "standalone"`) é o que fecha a torneira.

### 📌 Dois achados de lado, na varredura das 17 rotas (nenhum é bug)

1. **Dashboard Meta Ads zerado** — não é defeito. As 7 campanhas estão **PAUSED** e a
   Meta só devolve métrica na janela de 90 dias: `last_7d` → 0 campanhas com métrica,
   `last_30d` → 0, `last_90d` → **2**. Para demonstrar, escolher 90 dias.
2. **`test_event_code` envelheceu de novo** — a `/tracking` mostra `TEST65121`; este
   arquivo registrava `TEST72769`. É o comportamento esperado (o Meta troca a cada
   sessão da aba), e é exatamente por isso que a conferência entrou na rotina.

---

## 🎬 Geração de vídeo com WaveSpeed — módulo construído (31/07/2026)

> Design em `docs/superpowers/specs/2026-07-31-video-wavespeed-remotion-design.md`
> Plano em `docs/superpowers/plans/2026-07-31-video-wavespeed.md`
> Achados da chamada real em `docs/superpowers/plans/2026-07-31-video-wavespeed-ACHADOS.md`
> Ledger da execução em `.superpowers/sdd/2026-07-31-video-wavespeed/progress.md`

### A decisão de arquitetura, e o furo que a determinou

**A rota submete; o worker só consulta e baixa.** Parece detalhe, mas foi o que descartou
a alternativa óbvia (fila única, worker faz tudo):

> O `pegar_job()` do worker da autópsia **incrementa `tentativas` e reprocessa job travado**.
> Se o worker fosse quem submete, **um retry cobraria de novo**.
> **Retry automático e cobrança não podem morar no mesmo lugar.**

**A trava é do BANCO, não do código:**
```sql
constraint gerar_exige_task_id check (tipo <> 'gerar' or wavespeed_task_id is not null)
```
Uma linha `gerar` não existe sem tarefa já submetida — não sobra nada para o worker
"iniciar", e iniciar aqui significa cobrar. **Provado com teste negativo em `INSERT` e
também em `UPDATE`** (o Postgres reavalia o `CHECK` em toda modificação, então nem
zerando o campo depois dá para burlar).

### 🚨 Achado que mudou o desenho: o MODO está no CAMINHO

O spec dizia que `image_url` opcional escolheria entre image-to-video e text-to-video no
mesmo modelo. **Errado.** O caminho confirmado é `openai/sora-2/text-to-video` —
image-to-video é **outro endpoint**. A rota agora escolhe `WAVESPEED_MODEL` vs
`WAVESPEED_MODEL_I2V` pelo modo, e **recusa com 400** se o i2v não estiver configurado,
em vez de mandar a imagem para o endpoint de texto e queimar ~135s cobrados por um vídeo
que ignora a imagem.

### Números medidos na chamada real

| | |
|---|---|
| Modelo | `openai/sora-2/text-to-video` |
| Corpo aceito | `{ "prompt": string, "duration": number }` |
| Tempo até `completed` | **135,8s para clipe de 4s** (~34× o tempo real) |
| Saldo depois | US$ 5,20 |

**135,8s confirma a arquitetura:** não cabe em route handler, é fila + worker.

### 💸 O custo continua DESCONHECIDO — e isso é proposital na tela

Falta o saldo **antes** da chamada, então não dá para calcular o custo por clipe.
`USD_POR_SEGUNDO` está **vazia** e `estimarCustoUsd()` devolve `null`. A tela escreve
**"custo desconhecido — modelo fora da tabela de preços"**.

⚠️ **Nunca trocar isso por `US$ 0,00`.** Zero na tela faria aprovar um gasto achando que
é de graça. Para preencher a tabela: gerar um clipe anotando o saldo antes e depois.

⚠️ **Sora 2 é premium.** O plano pedia "barato e rápido" para validar, e o Sora é
provavelmente o mais caro da plataforma. Com 3 prompts por campanha a conta cresce —
vale considerar um modelo mais barato como padrão de trabalho.

### As peças

| Arquivo | O quê |
|---|---|
| `supabase/migrations/20260731120000_*` | resgata `prompts_imagens` (existia no banco, **sem migration**) |
| `supabase/migrations/20260731120100_*` | `prompts_videos` |
| `supabase/migrations/20260731120200_*` | tabela `video_jobs` + a `check` |
| `supabase/migrations/20260731120300_*` | `tentativas_download` (ver bug abaixo) |
| `src/lib/wavespeed/client.ts` | submeter e consultar. Só HTTP. |
| `src/lib/wavespeed/precos.ts` | tabela de preços à mão + `estimarCustoUsd()` |
| `src/app/api/video/gerar/route.ts` | **a única rota do projeto que gasta dinheiro** |
| `src/app/api/video/jobs/route.ts` | leitura |
| `scripts/worker-video.mjs` | consulta e baixa. `npm run video:worker` |
| `src/app/video-maker/page.tsx` | tela com custo, confirmação e Realtime |
| copywriting (5 arquivos) | `prompts_videos` alimentado pelo dossiê da autópsia |

### 🐛 Os 8 defeitos que as revisões pegaram — 4 falhariam EM SILÊNCIO

Este é o conteúdo mais útil desta seção. **Três eram erro do plano, não do implementador.**

**1. `agentes/copywriting/AGENTS.md` mandava devolver TRÊS campos.** Ele vai no **system
prompt** (`buildSystemPrompt.ts:55-57`) e dizia *"Responda apenas com um JSON válido —
TRÊS campos"*. O pedido do 4º campo só existia no user prompt: instrução enfática e
anterior brigando com pedido posterior. O JSON voltaria sem `prompts_videos`, e o
`route.ts` engole com `?? ''`. **A aba nova estaria sempre vazia, sem erro em lugar nenhum.**
> **Regra que ficou:** ao adicionar campo ao contrato JSON de um agente, o `AGENTS.md`
> dele muda junto. O user prompt sozinho não basta.

**2. `modelo` explícito no body pulava a guarda de image-to-video.** A checagem morava
dentro de `if (!modelo)`. Chamada com `{prompt, image_url, modelo:"...text-to-video"}`
passava reto e mandava a imagem para o endpoint de texto. **~135s cobrados por um vídeo
que ignora a imagem.**

**3. `duracao_s` sem piso nem arredondamento.** `Number(-5) || 5` = `-5` (truthy
sobrevive). Fracionário passava pela **cobrança** e só então quebrava no `insert` (coluna
é `int`), caindo no ramo de "gasto órfão" — que existe para falha imprevisível, não para
entrada que dava para filtrar antes.

**4. Dedupe era fail-open.** Se a consulta anti-duplicidade falhasse, submetia mesmo assim.
> O argumento que inverteu a decisão: **falha transitória do Supabase e retry do cliente
> por timeout acontecem na MESMA janela de instabilidade.** O cenário em que o check falha
> é justamente o cenário em que o reenvio acidental é mais provável — fail-open desarmava
> a proteção exatamente quando ela mais importava. Agora é **fail-closed (503)**.

**5. O `while(true)` do worker não tinha try/catch.** O comentário dizia "mesma lição do
worker da autópsia" — mas o `worker-autopsia.py` **de fato** envolve o loop em
`try/except`, e o plano não replicou. Exceção fora do try por-job matava o processo **em
silêncio**, deixando um vídeo **já pago** sem ninguém consultando.

**6. Os contadores de falha se contaminavam.** `consultar()` e `baixarParaStorage()`
dividiam a coluna `tentativas`. 4 falhas de rede na *consulta* (que não tem teto) faziam a
**primeira** falha de *download* estourar o teto de 5 — descartando um vídeo pago e ainda
reportando *"o download falhou 5x"*, **factualmente falso**. Resolvido com coluna separada
`tentativas_download`.

**7. Seção de vídeo no `SKILL.md` órfanava as regras de imagem.** Inserida antes de
"Anatomia" e "Regras que evitam retrabalho", que não têm heading próprio — o modelo passava
a ler *"idioma do texto na arte"* como regra de vídeo, **contradizendo a proibição de texto
na tela**.

**8. Duplo-envio virava dupla cobrança.** Agora: 409 se houver submissão idêntica (mesmo
prompt + modelo) em `processando` nos últimos 60s. **Não é teto de gasto** — o Fernando
recusou teto de propósito; isto é só reenvio acidental.

### 📌 Minors adiados (no ledger, decidir antes do commit)

1. `video_jobs.tipo` é `text` sem `check (tipo in ('gerar','compor'))` — valor com typo
   passa livre pela trava. Mesmo padrão frouxo do `autopsia_jobs`.
2. `client.ts:96,112` — `JSON.parse` sem try/catch em resposta 2xx com corpo não-JSON.
3. `gerar/route.ts` — `campanha_id` não validado como UUID antes de gastar.
4. `gerar/route.ts:48` — `modelo` do body não validado como string (tipo errado monta URL
   `.../[object Object]`).
5. **Deriva no banco:** o histórico remoto tem migration órfã
   `20260729003102_add_prompts_imagens` aplicada por MCP numa sessão anterior, **sem arquivo
   no repo**. Sintoma corrigido; a causa é aplicar migration por MCP sem gravar o arquivo.

### ❓ Ainda não confirmado

| O quê | Por quê importa |
|---|---|
| Custo por clipe | a tela mostra "desconhecido" até alguém medir |
| Caminho do image-to-video | o modo com imagem devolve 400 hoje |
| Chave da imagem no corpo | idem |
| Se `outputs[0]` expira, e em quanto tempo | define o `MAX_TENTATIVAS = 5` do download |

### 🗺️ O desenho maior — P0 a P4

Isto é **P1 + P2** de cinco peças combinadas com o Fernando:

| | Peça | Estado |
|---|---|---|
| P0 | modelo do agente `autopsia` | **decidido: fica como está**, não mexer |
| P1 | `prompts_videos` no copywriting | ✅ construído |
| P2 | geração no WaveSpeed | ✅ construído, **não verificado** |
| P3 | variações no Remotion (legenda + narração ElevenLabs) | ⏸ spec próprio |
| P4 | Remotion Studio embutido no dashboard | ⏸ spec próprio |

**Ressalva já levantada do P4:** o Remotion Studio é servidor de desenvolvimento, sobe na
**porta 3000 — a mesma do `next dev`**, só existe enquanto o processo roda, e é local. É
conveniência de desenvolvimento, não funcionalidade de produto.

**A tabela `video_jobs` já nasceu com `tipo='compor'` previsto** para o P3, mas **nada
consome esse tipo ainda**.

### ✅ Coisas que já funcionavam e foram confirmadas nesta sessão

- **O botão "Autopsiar" já existe** em `mineracao/page.tsx:621` e `autopsia/page.tsx:116`.
  Escolher produto na mineração → clicar → gerar autópsia **não precisa de chat**.
- **O copywriting já lê o dossiê** (`copywriting/generate/route.ts:136-145` carrega
  `autopsias.dossie_json` pelo `campanha.autopsia_id`). Os prompts de vídeo herdam esse
  contexto de graça.
- **A Higgsfield nunca existiu** — nenhuma linha no `src/`. O `CLAUDE.md` foi alinhado
  (6 pontos) para dizer WaveSpeed.

---

## 📌 Antes (30/07 e anterior)

> A LP do Método do Corredor está **no ar**, com FOP instalado e **deduplicação
> confirmada pelo Meta**. ✅ **Tudo commitado e empurrado** (31/07) — ver a seção
> "📦 O acerto do histórico" logo abaixo.

**No ar:** https://modelagem-saga-adestramento-8f8e98fd.pages.dev

### ▶️ Próximo passo

1. **Republicar** — o fix do `fbp` está no `codigo_html_final` mas a página no ar ainda é
   a versão anterior. `/design` → "Aprovar e Publicar". **É o primeiro item da fila.**
2. **Conferir o `test_event_code`** no selo da `/tracking` antes de cada rodada — ele expira
   por sessão do Meta. Hoje está em `TEST72769`, batendo com o Gerenciador.
3. Decidir as pendências de oferta abaixo. A página está no ar com `#CHECKOUT_URL`:
   **ninguém consegue comprar.** É teste de tracking, não de venda.
4. **Escolher o subdomínio da oferta** quando for pra valer. Hoje está no `.pages.dev`; o
   seletor "Publicar em" já lista os 3 domínios. Sugestão do campo vem do nome da campanha
   (`modelagem-saga-adestramento`) — o certo aqui seria `adestramento`.

### 🎬 Frente nova aberta: variações de vídeo com Remotion

**A base está instalada e renderiza** (`remotion/`, movida do `my-video`). **A
funcionalidade não existe ainda.** O plano completo, com schema, tarefas e riscos, está em
**`PLANO-REMOTION-VARIACOES.md`** — é por ele que se retoma.

Resumo de uma linha: **fila `video_jobs` + worker em `remotion/`**, porque render mede
**59,6s para 5s de vídeo** e não cabe em route handler.

4 decisões esperam você (§7 do plano): voz da ElevenLabs, formatos de saída, estilo da
legenda, e se o worker roda à mão ou sobe junto com o `dev`.

### ✅ Modo do pixel (teste × produção) — CONSTRUÍDO na `/tracking`

`src/components/tracking/ModoDoPixel.tsx`, na **tela principal**, logo abaixo do cabeçalho.
Estado atual: **em teste com `TEST72769`** (o código que o Gerenciador está mostrando —
o banco tinha `TEST67494`, desatualizado, e foi corrigido).

### ⚠️ A armadilha nova: "Gerar Página com IA" SOBRESCREVE a LP feita à mão

O botão play / "Gerar Página com IA" chama `/api/design/generate`, que faz
`UPDATE workflow_design SET codigo_html = <html da IA>`. **Isso apaga a LP construída no
modelo low-ticket sem perguntar.** Hoje o botão some quando já existe `codigo_html`
(a UI só mostra o play para `!lp.codigo_html`), então o risco é baixo — mas a rota
continua chamável.

**Se acontecer, não é perda:** a fonte da verdade é a pasta
`low-ticket/metodo-do-corredor/lp/`. Recuperar é rodar de novo:
```bash
node scripts/lp-para-dashboard.mjs "C:/Users/cerqu/Documents/Projetos_IDE/low-ticket/metodo-do-corredor/lp" 8f8e98fd-dd25-424f-a1d3-f9a8338bd741
```

### 📌 Pendências de OFERTA (decisão do Fernando — não inferir)

Estas travam a publicação de verdade, não o dashboard:

1. **Formato de entrega** — PDF? vídeo? área de membros? A copy aprovada nunca diz.
   Trava o FAQ e o texto do checkout.
2. **Quem não tem corredor de 3 metros** — objeção mais óbvia do mecanismo, sem resposta
   na copy. Apartamento pequeno é fatia grande do tráfego.
3. **URL de checkout** — a LP tem 3 `#CHECKOUT_URL` de placeholder.
4. **Pixel + endpoint do CAPI** — o tracking nasce DESLIGADO de propósito
   (`FOP.ativo === false` enquanto os IDs forem placeholder). Pixel com ID falso polui a
   conta de anúncio.
5. **Marca guarda-chuva** — rodapé e favicon estão provisórios.
6. **Ticket R$ 27** — se mudar, muda em 6 lugares da página.

O detalhamento completo está em `low-ticket/metodo-do-corredor/notes.md` (diário do
produto). Aqui fica só o ponteiro — o produto não mora neste repo.

### ✅ O que ficou pronto e validado na sessão de 28/07

- **Esteira ponta a ponta rodou pela 1ª vez:** minerou → autopsiou (20 criativos, 18
  transcritos) → dossiê → publicado no Cloudflare → campanha → copy no `/revisor`.
- **Dossiê da Saga Adestramento** no ar: `https://autopsia-saga-adestramento-4aff5b.pages.dev`
- **Copy do "Método do Corredor"** gravada em `workflow_copywriting`
  (`4ec8e821-c35b-4c4d-a56c-c6eedda39a70`), campanha `fcad8b73-c12f-4021-947e-3b43845ebb24`.
  Página + 5 anúncios + 4 prompts de imagem.
- **Botão "Produzir campanha"** na `/autopsia/[id]` + coluna `campanhas_producao.autopsia_id`
- **Card da `/producao`** mostra o próximo passo e tem botão "Gerar copy"
- **Aba "Prompts de Imagem"** na `/copywriting` e na `/revisor` + coluna
  `workflow_copywriting.prompts_imagens`
- **Alerta de "worker parado"** corrigido (media tempo desde a última conclusão, não
  idade da fila)

### 📌 Pendências abertas (decisão do Fernando, não inferir)

1. **Quem grava os vídeos dos anúncios** — os ads 1, 3 e 5 precisam de alguém em cena
   com um cão real. Sem isso só o estático e o carrossel são produzíveis. É a mesma
   pergunta da seção 8 do dossiê.
2. **Confirmar o ticket de R$ 27** — se mudar, a tabela de ancoragem da página muda.
3. **Prova social** — a copy não tem depoimento porque não existe depoimento real.
4. **Nome da marca** — hoje só existe o nome do método.
5. **Agente `autopsia` está no modelo grátis** e não deu conta de gerar o dossiê (20
   criativos, 18k caracteres). Ou volta para Claude, ou dossiê continua sendo feito no
   Claude Code. **Decisão pendente.**
6. **Spec `docs/superpowers/specs/2026-07-28-esteira-producao-design.md`** — escrito e
   nunca executado. Boa parte virou realidade por outro caminho (botões diretos em vez
   de skill + view). **Decidir: apagar ou atualizar.**
7. **Worker rodando em segundo plano** varrendo fila vazia — pode matar.
8. ~~**Nada commitado.**~~ ✅ **Resolvido em 31/07** — 27 commits no ar. Ver a seção
   seguinte.

---

## 📦 O acerto do histórico — 4 dias de trabalho versionados (31/07/2026)

> ✅ `origin/main` = local em `8acad36`. Zero pendente, `tsc` limpo, árvore limpa.

77 arquivos pendentes viraram **12 commits novos** (o plano era 10; a remoção dos 3
agentes e a limpeza das cópias da skill do Remotion viraram commits próprios em vez
de contaminar outros). Junto com 15 commits antigos que também nunca tinham sido
empurrados, foram **27 ao todo**.

### 🚨 O push foi REJEITADO na primeira tentativa — e a lição vale

`main` tinha divergido: dois commits feitos **pela interface web do GitHub**
(`Delete GUIA_IMPLEMENTACAO.md` em 23/07, `Delete palavras_chave_dropshipping_brasil.md`
em 31/07) apagavam exatamente **os mesmos dois arquivos** que o commit local de
limpeza apagava. Mesma intenção, dois caminhos.

**Resolvido com `pull --rebase`**, não merge — histórico linear é o que faz sentido
para dev solo em `main`. 27 commits replayados, **zero conflitos**, e conferido depois
que `git diff` entre o pré e o pós-rebase é **vazio**: só os SHAs mudaram, nenhum
conteúdo. Tag local `antes-do-rebase-31jul` ficou como rede de segurança (pode apagar
com `git tag -d antes-do-rebase-31jul`).

⚠️ **Editar arquivo pela web do GitHub cria commit que o local não conhece.** Foi o
que causou isso. Se for mexer pela web, `git pull` antes de voltar a trabalhar aqui.

### 🧹 O que ficou de fora do repo de propósito

| Arquivo | Por quê |
|---|---|
| `remotion/public/*.mp4` | `Sapatenis_dois.mp4` sozinho tem **44 MB**, e histórico do git é permanente. É footage de demo do `my-video`; a fonte de vídeo real são os criativos da autópsia, que já vivem no Storage |
| `pnpm-lock.yaml` + `pnpm-workspace.yaml` | O gerenciador deste repo é o **npm**. Dois lockfiles divergem em silêncio — e o `pnpm-workspace.yaml` ainda estava com o placeholder literal `set this to true or false` |
| `.claude/` | Permissões com caminhos absolutos desta máquina (`C:/Users/cerqu/...`), sem valor para mais ninguém |

`public/audio/*.mp3` (4,3 MB) **entrou** — é asset da aplicação (a música de fundo do
dashboard), não material de trabalho.

### 🧹 Cópias triplicadas da skill do Remotion

O `create-video` gera `remotion-best-practices` (34 arquivos) **três vezes**: `.agent/`,
`.cursor/` e `.windsurf/`. Ficou só a `.agent/`. As outras 68 eram idênticas byte a
byte, para editores que não são usados aqui — e divergiriam em silêncio na primeira
edição de uma delas.

### ⚠️ O que o fatiamento NÃO conseguiu separar

Alguns arquivos carregam mais de um tema e foram para o commit do **tema dominante**,
não fatiados hunk a hunk (53 arquivos assim custaria caro e arriscaria commit
intermediário quebrado):

- `design/page.tsx` → foi com *domínio próprio*, mas tem também o selo de tracking e a
  remoção dos 4 elementos mortos
- `design/generate/route.ts` → foi com *imagens da LP*, mas tem também a migração para
  o Zen
- `tracking/generate/route.ts` → foi com *FOP*, mas tem também a migração para o Zen

Está registrado no corpo de cada commit.

---

## 🖼️ Imagens da LP — as 3 tarefas fechadas (29/07/2026)

> ✅ **Rodou de verdade**, não só `tsc`. Upload real, URL pública servindo, HTML gerado
> com as tags trocadas.

### O desenho (decisão que continua valendo)
O `/api/deploy` sobe **um único arquivo HTML**, sem bundle de assets → imagem tem que ser
URL absoluta pública. Bucket `criativos`, que já é público.

```
lp/<campanha_id>/hero.png       ← original intocado (o que o Fernando sobe)
lp/<campanha_id>/web/hero.webp  ← derivada automática, é ela que entra na página
lp/<campanha_id>/pagina/*.webp  ← assets da LP feita à mão (ver seção seguinte)
```

**A pasta é a fonte da verdade — não existe tabela de imagens.** O casamento com a copy é
pelo **nome do arquivo**: a copy traz `[IMAGEM 1 · hero.png — …]` e a pasta tem `hero.png`.

| Passo | Estado |
|---|---|
| 1. `api/design/imagens` (GET lista / POST sobe) | ✅ rodado |
| 2. Botão de upload na `/design` | ✅ `src/components/design/ImagensLP.tsx` |
| 3. `design/generate` trocar `[IMAGEM N]` pelas URLs | ✅ `src/lib/design/imagensLp.ts` |

### 🐛 Bug real na rota de upload: MIME do cliente não é confiável
A rota validava só `File.type`. Primeiro upload de teste voltou **502 "tipo não suportado
(application/octet-stream)" com um PNG perfeitamente válido** — cliente não-browser manda
`octet-stream`, e o próprio navegador manda string vazia quando o SO não conhece a extensão.
Trocado por `tipoDaImagem()`, que decide **pela extensão** e usa o tipo declarado só como
plano B. Coerente com o resto do módulo, já que o casamento com a copy é pelo nome.

### 🐛 O botão existia e ninguém achava
O `ImagensLP` renderizava certo, mas o mock de celular da `/design` tem **540px fixos** e
empurrava o bloco para fora da dobra da coluna da direita. Pior: sem HTML gerado o celular
está vazio ocupando meia tela, enquanto o upload é justamente a ação pendente.
**Corrigido:** "Imagens da LP" subiu para o topo do painel, e sem `codigo_html` o celular
vira uma faixa de uma linha.

⚠️ **Lição de método:** eu tinha checado o HTML servido por `curl` e concluído que o
componente "não aparecia". Era ruído — a `/design` é `"use client"` e busca no `useEffect`,
então no render do servidor `activeLp` é null e **nem o Technical Health aparece**. Só o
navegador de verdade responde esse tipo de pergunta.

### 💾 WebP: 8,44 MB → 357 KB
O gerador devolve PNG de ~2,3 MB a ~1500px. Medido nas 4 imagens: corte de **94–97%** por
arquivo. `sharp` foi promovido a dependência declarada no `package.json` (`^0.34.5`) —
estava só transitivo do Next, o que quebraria sem aviso numa atualização.

**Placeholder sem arquivo correspondente é MANTIDO no texto** e reportado em
`imagens_lp_faltando` na resposta da rota. Erro de digitação no renomear é o caso comum, e
sumir em silêncio esconderia o problema.

---

## 🏁 LP no modelo low-ticket, dentro do dashboard (29/07/2026)

> 🎯 **O dashboard é o que estamos validando.** Toda atualização precisa aparecer nele para
> seguir o fluxo normal: preview → Aprovar e Publicar → `/api/deploy` → tracking.

### O que foi feito
A LP do Método do Corredor foi construída **modelando a `alimento-sagrado/lp/`** (a LP que
já passou por PageSpeed real), e depois levada para dentro do `workflow_design`.

**Onde o produto mora:** `low-ticket/metodo-do-corredor/lp/` — não neste repo. O Synapse é a
plataforma; o produto é conteúdo, e o workspace `low-ticket/` tem a regra "um produto = uma
pasta". Registrado lá no `notes.md` do produto e na tabela do `low-ticket/CLAUDE.md`.

### 🔁 A ponte é um SCRIPT, não uma cópia manual
`scripts/lp-para-dashboard.mjs` — a pasta do projeto é a fonte da verdade, o dashboard é o
espelho. Rodar de novo re-espelha.

```bash
node scripts/lp-para-dashboard.mjs <pasta-do-projeto-lp> <design_id>
```

Ele: sobe `public/assets/*` para `lp/<campanha_id>/pagina/` · inlina o `script.js` ·
inlina o favicon como data URI · troca caminho relativo por URL absoluta do Storage ·
grava em `workflow_design.codigo_html` · espelha em `lp_biblioteca`.

**Por que não copiar o HTML à mão:** o projeto é multi-arquivo e o `/api/deploy` é
arquivo único. Copiar uma vez faria os dois desandarem em silêncio na primeira edição.

⚠️ **Pasta `pagina/` é separada de `web/` de propósito.** `web/` é das derivadas
automáticas do `/api/design/imagens` (1200px); `pagina/` é dos assets da LP feita à mão
(540px). Se dividissem pasta, um upload pelo botão do dashboard clobberia os assets da LP.

### O que o modelo do alimento-sagrado ensina
| Peça | Decisão |
|---|---|
| CSS | **inteiro inline** no `<head>`. Não existe `styles.css` — zero render-block |
| Fontes | **nenhuma webfont.** Georgia + `system-ui`. Zero requisição, zero FOUT |
| Imagens | WebP na **largura de exibição** (~540px), não a do arquivo original |
| Deploy | `wrangler` assets-only. **Nunca** `main =` no `wrangler.toml` |
| Copy | sem escassez fabricada, sem depoimento inventado, sem preço-âncora falso |

A seção *"Não tenho depoimento para te mostrar"* transforma a ausência de prova social em
prova de honestidade. Foi adaptada aqui — e resolve a pendência nº 3 do dia 28.

### 🐛 Contraste: os BOTÕES de CTA reprovavam AA — e a referência também reprova
Medido em todo texto da página: branco sobre o gradiente laranja vibrante dá **3,80:1 na
ponta escura e 2,70:1 na clara**, contra 4,5 exigido (botão 16px/800 conta como texto
normal, não grande). Mesma falha na barra do topo, nos eyebrows e no selo de garantia.

É a armadilha do §7 da skill, mas na direção que passa despercebido: **texto branco SOBRE a
cor vibrante**, não a cor vibrante como texto. A LP do alimento-sagrado tem o mesmo defeito
(4,44:1, marginalmente abaixo).

**Correção:** separar os usos por token.
```
--brand / --brand-2   vibrantes → SÓ decoração (blob, barra de card, borda)
--brand-ink           escura    → texto laranja sobre creme
--brand-grad          par escuro → fundo de qualquer coisa com TEXTO BRANCO
```
Resultado: 5,81:1 e 4,74:1. **107 elementos com texto, 0 falhas de contraste.**

### Números medidos
| | |
|---|---|
| Primeiro paint (HTML+JS+hero) | **73 KB** (meta da skill: ~150 KB) |
| Assets somados | 89 KB (referência: 88 KB) |
| HTML de arquivo único no banco | 41 KB |
| Console do navegador | 0 erros |
| Falhas de contraste | 0 de 107 elementos |

⚠️ **Perda conhecida do arquivo único:** o `_headers` (cache `immutable` nos assets) só vale
no deploy por `wrangler` da pasta do projeto. Publicando pelo dashboard, os assets vêm do
Storage do Supabase, em outra origem e sem esse header. Aceito por ora — o ganho é o fluxo
do dashboard fechar.

### 🧪 Armadilha de verificação: screenshot de página inteira mente
O meio da página saiu **em branco** num `fullPage` do Playwright, parecendo bug do
`.reveal`. Não era: o Playwright estica o viewport para capturar e a imagem sai antes da
transição de opacidade terminar. **Verificar rolando de verdade e lendo o `classList`, não
pela imagem.** (10 blocos `.reveal`, todos com `.in`, nenhum invisível.)

---

## 📡 Tracking FOP — validado em produção e TRAVADO (29/07/2026)

> ✅ **Deduplicação confirmada pelo Meta**: no Gerenciador de Eventos, cada evento vira uma
> linha-mãe com duas filhas — `Navegador` marcada **Processado** e `Servidor` marcada
> **Desduplicado**. Provado em PageView, ViewContent e AddToWishlist.

### O sintoma que abriu tudo: "instalei o FOP e o pixel sumiu"

Não tinha sumido — **o dashboard nunca mostrava a versão instrumentada**.
`/api/tracking/generate` grava só em `workflow_tracking.codigo_html_final`, nunca de volta
no `codigo_html`. E a `/design` lia só o `codigo_html` no preview, no "Abrir no Navegador"
e no "Live Link". A `/tracking` não tem preview nenhum. Ou seja: depois de instalar, não
existia lugar no dashboard para ver o resultado.

**Corrigido:** `htmlPublicavel()` na `/design` **espelha a regra do `/api/deploy`** (usa o
`codigo_html_final` quando o tracking está instalado) + selo **COM TRACKING / sem tracking**
no cabeçalho + Realtime na `workflow_tracking`.

⚠️ **Se a regra do `/api/deploy` mudar, mudar a da tela junto.** Preview que diverge do que
é publicado é pior que não ter preview.

### 🐛 Bug 1 — o CAPI era assado como `localhost` (o pior do dia)

O HTML publicável saía com `CAPI="http://localhost:3000/api/track/capi"`, porque
`resolveCapiEndpoint()` caía no origin da requisição. **O navegador de cada visitante
POSTaria para a própria máquina dele.** E o `fetch` do FOP tem `.catch(function(){})`:
falha em **silêncio total**. Eventos de navegador chegariam, os de servidor não, e a
deduplicação seria impossível de validar sem nenhum erro em lugar nenhum.

**Corrigido em dois níveis:**
1. `TRACKING_CAPI_ENDPOINT` no `.env.local` → Edge Function `track-capi` (que já existia
   ativo e público no Supabase do Synapse, e espelha a rota Next).
2. A função **nunca mais assa endereço local**: se o origin for local, cai no Edge Function;
   se nem isso existir, lança erro claro. Melhor não instalar do que instalar quebrado.

> Havia uma linha comentada no `.env.local` prevendo `synapse.alavanca.ai/api/track/capi` —
> um Synapse publicado que não existe. O Edge Function é o substituto real.

### 🐛 Bug 2 — `fbp` nulo no PageView do servidor

Medido em produção:
```
PageView       → servidor: fbp = null      ← espelhado cedo demais
ViewContent    → servidor: fbp = fb.2.17…  ← dispara no scroll, cookie já existe
AddToWishlist  → servidor: fbp = fb.2.17…
```
O `_fbp` é gravado pelo `fbevents.js` **depois** que ele carrega; o espelho do PageView saía
no carregamento. Numa LP sem formulário o `fbp` é o identificador mais forte que existe.

**Corrigido:** `comFbp()` no `fop.ts` — fila que espera o cookie (teto ~2s) e dispara em
seguida. O `fbq('track')` do navegador continua disparando na hora; só o espelho espera.

⚠️ **A causa raiz estava na SKILL, não no código.** O `reference/client-implementation.md`
da `fop-tracking` mandava espelhar direto. Corrigi lá também — senão o próximo projeto
nasceria com o mesmo bug.

### 🔒 O travamento (é o que impede tudo isso de voltar)

`validarInstalacaoFop()` roda sobre o HTML final **antes de gravar**. Falhou? HTTP 422, não
grava, não marca `instalado`, e diz qual regra quebrou.

| # | Regra | De onde veio |
|---|---|---|
| 1 | exatamente 1 carregador `fbevents.js` | os dois blocos FOP que coexistiram |
| 2 | endpoint CAPI presente | — |
| 3 | **CAPI não é localhost** | bug 1 |
| 4 | id do PageView compartilhado HEAD↔BODY | é a chave da dedup |
| 5 | espelho do CAPI espera o `_fbp` | bug 2 |
| 6 | `pixel_id` real presente | — |
| 7 | nenhum placeholder sobrevivente | — |

**Provado com teste negativo:** sabotei o `codigo_html` com um `fbevents.js` extra →
`HTTP 422 · pixel-unico — esperado 1, encontrado 2`. Restaurado num `finally`.

⚠️ **Descontar comentários antes de contar.** A primeira versão pegava menções dentro de
comentários (3 menções, 1 carregador real) e teria travado instalação boa.

### 🔒 Trava do tipo de funil

Três instalações seguidas da mesma página deram **E, A, E** — o diagnóstico é da IA e não é
determinístico. Trocar de template muda quais eventos existem e invalida teste em
andamento. Agora **o primeiro diagnóstico manda**; para trocar, `tipo_funil` no body; para
a IA redecidir, `rediagnosticar: true`. A resposta traz `origem_funil`.

Para esta LP o certo é **E** (sem formulário, clique direto para checkout). Com o funil A,
`Contact`/`AddToCart`/`Lead` nunca disparariam — dependem de campos de formulário.

### 📌 Duas coisas sobre o `test_event_code` que custam tempo

1. **Ele expira a cada sessão** da aba Eventos de teste. O banco tinha `TEST67494` e o
   Gerenciador mostrava `TEST72769`. Código velho = eventos de servidor somem da aba.
2. **Ele só vale para o CAPI.** O Pixel do navegador não carrega esse parâmetro — não dá
   para "proteger" tráfego de navegador com ele. Verificado na requisição real:
   `facebook.com/tr/?...` sai sem `test_event_code`.

### ✅ Não é defeito, não vá atrás

**`PageView` aparece rotulado como "Evento personalizado"** na aba de teste. Conferido:
`event_name: PageView`, `action_source: website`, resposta do Meta com `messages: []` e
`events_received: 1`. É rótulo da interface — e a linha vem marcada `Desduplicado`.

### 🌐 CORS do relay CAPI — por que `dominio_permitido` fica VAZIO

> Pergunta que já voltou e vai voltar. A resposta curta: **deixe vazio**.

**CORS é regra que o NAVEGADOR aplica, não cadeado no servidor.** Ele responde só a
"o JS do site A pode LER a resposta de uma chamada ao site B?". `curl`, script de servidor,
Postman — nada disso liga para CORS.

**E do jeito que o `track-capi` está implementado, o campo quase não faz nada:**

```js
let allow = origin || '*';
if (allowed && allowed !== '*') { allow = origin === allowed ? origin : allowed; }
return { 'Access-Control-Allow-Origin': allow, ... }
```

Ele **nunca recusa a requisição**. Processa o evento, manda pro Meta, grava no log — e só
então monta o cabeçalho. Preencher o campo mudaria apenas o header da resposta; o evento
**já teria ido pro Meta do mesmo jeito**. Por isso vazio ou preenchido dá no mesmo.

**A exposição real** é outra: o endpoint é público e sem auth (tem que ser — a LP chama do
navegador de qualquer visitante), e o `pixel_id` está no fonte da página. Alguém poderia
disparar evento falso com `curl`. O que limita o estrago hoje: só eventos de uma lista fixa
passam (`EVENTOS_PERMITIDOS`), o token da CAPI nunca sai do servidor, e precisa do
`pixel_id` certo. Risco baixo — é vandalismo dirigido, sem ganho para quem faz.

**Por que NÃO preencher, além de não proteger:** com subdomínio por oferta, várias LPs em
domínios diferentes compartilham o mesmo pixel. Um campo que aceita um domínio só quebraria
essa configuração no dia em que virasse portão de verdade.

**Se um dia valer a pena fechar:** o certo é o Edge Function **recusar com 403** quando o
`Origin`/`Referer` não estiver numa **lista** de domínios seus. Aí vira proteção. Anotado
como possibilidade, não como pendência.

### 🎛️ Modo do pixel na UI — `ModoDoPixel.tsx` (29/07/2026)

**O problema que ele resolve:** "estou em teste ou em produção?" é a pergunta que causa
erro no tracking, e a resposta estava escondida — a palavra `teste` em 11px, dentro do
painel "Pixels & Tokens", que **nasce fechado**. Dava para rodar uma semana achando que
estava em produção. Agora é uma faixa colorida na tela principal:

```
🧪 EM TESTE · Pixel Cavalheiros -01 [TEST72769]     [Trocar código] [Encerrar teste → produção]
📡 EM PRODUÇÃO · Pixel Cavalheiros -01                          [Colar código de teste]
```

**Server action `setTestEventCode(id, codigo)`** — `codigo` vazio/null = produção.
Ação própria de propósito: é a operação MAIS frequente do tracking e estava enterrada
dentro do formulário de editar pixel.

**A explicação mora dentro do selo**, porque foi ela que custou tempo hoje: *"O Meta troca
este código a cada sessão da aba — se os eventos sumirem de lá, é ele que envelheceu."*
E a confirmação de encerrar diz o que importa: **não é preciso republicar a página.**

**Qual pixel o selo mostra:** o `padrao = true` ativo, senão o primeiro ativo com token —
**a mesma escolha que `/api/tracking/generate` faz**. Assim o que se vê no selo é o pixel
que a instalação realmente usa. Com múltiplos pixels, os outros seguem em "Pixels & Tokens".

**Testado no navegador, ciclo completo:** trocar → `TEST72769` gravado · encerrar →
`null` gravado e selo verde · colar de volta → gravado e selo amarelo.

⚠️ **Por que isto NÃO exige republish** (vale repetir, é contraintuitivo): o
`test_event_code` vive no `tracking_config` e o relay CAPI lê a cada requisição. Ele nunca
entra no HTML publicado. Então virar teste↔produção é um `UPDATE` de um campo, com efeito
no evento seguinte.

---

## 🎬 Remotion no monorepo — base instalada, plano escrito (29/07/2026)

> ✅ **A base existe e renderiza.** ❌ **A funcionalidade de variações NÃO foi implementada.**
> Plano completo em **`PLANO-REMOTION-VARIACOES.md`** (na raiz, temporário — mover para
> `docs/superpowers/plans/` ao executar).

### O que foi feito

`C:\Users\cerqu\Documents\Projetos_IDE\my-video` foi **movido** (não copiado — 842 MB de
`node_modules` não foram duplicados) para **`remotion/`** dentro deste repo. O `.git`
aninhado dele foi removido (tinha 1 commit, sem remote).

| Verificação | Resultado |
|---|---|
| `remotion versions` do novo local | 4.0.409 OK |
| **Render real** | **59,6s para 5s de vídeo** · 5,3 MB |
| `remotion/node_modules` e `out/` no git | já ignorados (padrões sem barra pegam qualquer profundidade) |

**Composição que já existe:** `Anuncio-Sapatenis`, 1080×1920, 150 frames @30fps.
⚠️ O `Root.tsx` passa `titleColor`/`priceText` em `defaultProps` que **não existem no
schema** — erro de tipo real, não impede o render, mas o lint de dentro de `remotion/` acusa.

### 🔑 O número que decide a arquitetura

**59,6s para 5 segundos** = ~12× o tempo real. Anúncio de 30s → ~6 min. **Não cabe em route
handler** (`maxDuration`). É fila + worker, exatamente como a decisão **D4 da autópsia**
("a rota nunca processa mídia, só enfileira") e o `scripts/worker-autopsia.py`.

### Decisões tomadas com o Fernando

- **Licença do Remotion:** free até 3 pessoas; 4+ exige Company License paga. Fernando é
  sempre solo → **fica no gratuito**. Registrado para não virar surpresa se crescer.
- **Monorepo:** o `CLAUDE.md` proibia subpastas isoladas. Fernando autorizou a exceção, e
  ela está **nomeada** lá — não virou regra genérica. A regra que sustenta:
  **`remotion/` NUNCA é importado pelo app Next**; conversa só pela fila no Supabase.
- **Reaproveitar o `my-video`** em vez de criar projeto novo.

### 🐛 Custo real do monorepo, e como foi pago

O `tsc` do Next passou a checar `remotion/src/**`, e os tipos de **React 19** de lá colidiram
com os de **React 18** daqui (`'AbsoluteFill' cannot be used as a JSX component`).
**Corrigido:** `"remotion"` no `exclude` do `tsconfig.json` da raiz. Cada projeto se checa
com o próprio tsconfig.

### Duas sinergias que já existem (não construir do zero)

1. **Legendas sem custo:** o worker da autópsia já roda `faster-whisper` local. Transcreve
   com timestamps → `@remotion/captions` consome. ⚠️ Usar `C:\Python313\python.exe`.
2. **Fonte de vídeo:** a autópsia **já baixa os criativos do concorrente** para o Storage.
   Há vídeo no sistema hoje — não depende do Video Maker (que é só UI, sem Higgsfield).

---

## 🔐 `.env.local.example` criado — e um quase-vazamento (29/07/2026)

**Não existia arquivo de exemplo.** Criado com as 28 variáveis por seção, **só os nomes**,
com os avisos que já custaram tempo (env do Windows sobrepondo em silêncio,
`SCRAPE_CREATORS_API_KEY` com underscore, `DESIGN_PROVIDER` que é pago).

🚨 **O que quase aconteceu:** a chave real da ElevenLabs foi colada no
**`.env.local.example`** — o arquivo **versionado**. Movida para o `.env.local` (ignorado) e
o example zerado.

**Não vazou:** `git log --all -S "<prefixo>"` não achou a chave em commit nenhum — nada foi
commitado ainda, então **não precisou rotacionar**. Se tivesse sido commitado, o certo seria
rotacionar na ElevenLabs, não só apagar do arquivo (fica no histórico).

**A regra, agora escrita no topo do próprio example:** `.env.local` = valores reais, fora do
git. `.env.local.example` = só nomes, versionado.

---

## 🌍 Publicação com domínio próprio — subdomínio por oferta (29/07/2026)

> ✅ **Testado com DNS real**, não simulado: subdomínio criado, no ar com HTTPS em ~8s,
> republicação idempotente, e tudo removido depois.

### O que existe na conta Cloudflare (levantado, não suposto)

| Zona | Uso |
|---|---|
| `meuaprendizado.online` | `regradosseis.` — LP do alimento-sagrado, via **Worker** |
| `planoensino.online` | `armorglas.` — LP do ArmorGlass, via **Pages** |
| `zedocarro.cloud` | sem uso |

Token: **escrita de DNS confirmada** (testei criando e apagando um TXT) e permissão de Pages
(os deploys já criam projeto, o que exige a mesma permissão).

### O padrão — já existia, só não era automatizado

```
armorglas.planoensino.online ──CNAME PROXIED──▶ armorglass-capa-iphone.pages.dev
                                              + registrado como domínio do projeto Pages
```

São **duas chamadas de API** depois do deploy que já fazíamos. O CNAME **precisa** estar
proxied — domínio customizado de Pages não valida por DNS direto.

### Como ficou

| Peça | O quê |
|---|---|
| `listarZonas()` / `apontarSubdominio()` | `src/lib/cloudflare.ts` |
| `GET /api/deploy/dominios` | alimenta o seletor |
| `POST /api/deploy` | aceita `zone_id` + `subdominio` **opcionais** |
| Seletor na `/design` | nasce em **"Só teste — .pages.dev"** |

**Decisão do Fernando:** sem domínio padrão (escolher a cada publicação) e subdomínio
**sugerido e editável**. A sugestão vem do nome da campanha — aqui deu
`modelagem-saga-adestramento`, e o certo seria `adestramento`. Por isso editável: nome
interno de campanha quase nunca é bom nome público.

### Três decisões de implementação que valem saber

1. **Falha no subdomínio NÃO desfaz a publicação.** O deploy já deu certo neste ponto — a
   rota devolve sucesso com `aviso_dominio` + a URL `.pages.dev`, em vez de dizer "falhou"
   sobre uma página que está no ar.
2. **CNAME apontando para outro projeto é ATUALIZADO, não duplicado.** Sem isso o
   subdomínio serviria a página errada em silêncio.
3. **A `.pages.dev` continua valendo** mesmo com domínio próprio (campo `url_teste`) —
   serve para isolar se um problema é do subdomínio ou da página.

⚠️ **Subdomínio é quase definitivo.** Depois que o Meta vê o domínio, trocar perde histórico
de domínio no pixel. Por isso publicar em domínio pede confirmação com a URL exata.

### Verificação

| Teste | Resultado |
|---|---|
| Publicar com subdomínio | `dns: criado` · `dominioPages: registrado` |
| Subdomínio responde | HTTP 200 em ~8s, HTTPS, conteúdo confere |
| Republicar no mesmo | `dns: ja-correto` · `ja-registrado` — não quebra |
| Limpeza | domínio + CNAME removidos, `url_recurso` restaurado |

Usado `teste-automacao-synapse.zedocarro.cloud` e apagado depois. Não se entrega automação
de DNS que nunca rodou.

---

## 🧹 `/design` — 4 elementos removidos por serem mortos ou duplicados (29/07/2026)

A coluna "Mobile & Status" era o gargalo da tela: o bloco "Publicar em" só aparecia rolando.
Removido o que não fazia falta:

| Item | Por que saiu |
|---|---|
| Barra de busca | `<input>` **sem handler** — digitar nunca filtrou nada |
| "Supabase Sync: Online" | decorativo, verde fixo no código; não lia conexão real |
| Botão "Editar" | **sem `onClick`** — botão morto |
| Botão "Live Link" | abria o mesmo blob que "Abrir no Navegador" do cabeçalho |

~120px recuperados, nenhuma função perdida. Saíram junto 5 imports órfãos do `lucide-react`
(`Search`, `Edit2`, `Eye`, `Download`, `X` — os dois últimos já estavam sem uso).

Lição que vale além desta tela: **três dos quatro eram casca** — UI que parece funcional e
não faz nada. Vale desconfiar de campo de busca e selo de status ao encontrar outros.

---

## 🐍 Worker da autópsia — use o Python GLOBAL, não o venv (28/07/2026)

> ✅ Corrigido no código: o worker agora falha na largada se faltar dependência.

```
C:\Python313\python.exe scripts\worker-autopsia.py     ← certo
python scripts\worker-autopsia.py                       ← ERRADO (resolve pro venv)
```

**O `venv\Scripts\python.exe` não tem `faster-whisper`.** Está no Python global
(`faster_whisper 1.2.1`). E como o venv vem primeiro no PATH, digitar `python` pega o
interpretador errado.

**Por que enganou:** os 20 downloads concluíram normalmente — `job_download` só usa a
stdlib. A quebra apareceu ~40 min depois, no primeiro job de transcrição
(`No module named 'faster_whisper'`). Parecia problema na transcrição; era o
interpretador desde o começo.

**Correção aplicada:** `checar_dependencias()` roda antes do loop e verifica
`faster_whisper`, `ffmpeg` e `ffprobe`. Falha na hora, dizendo qual Python está em uso e
como corrigir. O banner do worker agora também imprime `sys.executable`.

**Diagnóstico de "travado × lento"** — a pergunta que sempre volta:
```sql
select tipo, status, count(*), max(tentativas) from autopsia_jobs group by tipo, status;
```
`pegar_job()` incrementa `tentativas` ao travar o job. `tentativas = 0` e `iniciado_em`
nulo em todos = **ninguém consumiu a fila** (worker não está rodando). Não é lentidão.
Foi exatamente esse o caso hoje: 20 jobs parados, nenhum tocado.

**Ordem da fila:** baixa todos primeiro, depois frames/transcrição — os jobs de download
nascem juntos no clique, os demais nascem depois e entram atrás por `criado_em`. É
proposital: as URLs do CDN do Facebook expiram, então pegar os arquivos primeiro protege
a coleta.

**Tempo medido (20 criativos):** download ~28s por arquivo (4s a 91s), serial. Frames +
Whisper é a parte lenta. O worker faz um job por vez; paralelizar o download (limitado
por rede, não CPU) cortaria essa fase para ~1/3 — não foi feito.

Detalhes operacionais em `agentes/autopsia/WORKER.md` (não entra em prompt, custo zero).

---

## 💸 Custo zero de LLM — migração para o OpenCode Zen (28/07/2026)

> ✅ **O caminho gratuito está PROVADO** (chamada real ao Zen, HTTP 200, JSON válido —
> números abaixo). ⏳ **O que ainda NÃO rodou ponta a ponta é uma rota inteira do app**
> (precisa de `npm run dev` + campanha real). O `chatComZen` é casca fina sobre o que foi
> testado, então o risco residual é baixo, mas não é zero.

### 🚨 O achado que mudou tudo: não existia caminho gratuito
O `CLAUDE.md` afirmava que o copywriting rodava no OpenCode Zen. **Era mentira.** O
arquivo dizia "VERSÃO COM OPENAI (API oficial)" e importava `@/lib/openai`, que aponta
para `api.openai.com` sem override. O `OPENCODE_API_KEY` estava no `.env.local` e
**nenhuma linha de código lia ele.** As 10 rotas de IA iam todas para provider pago.

Lição: **a doc do projeto tinha divergido do código.** Sempre conferir o provider real
antes de assumir o que o `CLAUDE.md` diz.

### Os dois vazamentos que ninguém estava contando
1. **`design/generate` defaultava para `gpt-4o`** (o completo, não o mini), teto 16k. O
   comentário dizia "para destravar sem custo novo" — mas era custo novo, na outra fatura.
2. **Fallback silencioso do `generateWithProvider`:** Anthropic sem crédito → caía em
   `gpt-4o-mini` pago e seguia. Quando parecia que o gasto tinha parado, tinha só mudado
   de credor.

### O que mudou no código
| Arquivo | Antes | Agora |
|---|---|---|
| `src/lib/opencode.ts` | **não existia** | client do Zen + piso de `max_tokens` |
| `src/lib/openai.ts` | retry preso na OpenAI | `chatComRetry` aceita `client` — os dois providers dividem o backoff |
| `generateWithProvider.ts` | fallback → gpt-4o-mini **pago, calado** | fallback → **Zen grátis**; pago só se o agente pedir `gpt*` por nome |
| `design/generate` | default `gpt-4o` | default `zen`; `anthropic`/`openai` opt-in |
| `copywriting/generate` | gpt-4o-mini pago | Zen |
| `revisor/review` | gpt-4o-mini pago | Zen |
| `tracking/generate` | gpt-4o-mini pago | Zen |

### 🚨 O código não bastava — o furo estava no BANCO
`generateWithProvider` usa o Zen **só como fallback de falha**. Com todos os agentes em
`modelo = 'claude-sonnet-4-6'` na `agentes_config`, ele tentava a Anthropic **primeiro** e
pagava normalmente. Fechar o código sem mexer no banco não resolveria nada.

`UPDATE` aplicado em 28/07 — `minerador`, `gestor-meta-ads` e `autopsia` foram para
`deepseek-v4-flash-free`. **Reverter = voltar os três para `claude-sonnet-4-6`.**

Também corrigido um defeito introduzido no mesmo dia: o `usarZen` ignorava o
`config.modelo`. Agora gravar o nome de um modelo do Zen no banco já basta — sem tocar
em código.

### ⚠️ A pegadinha dos tokens de raciocínio — agora com número medido
Teste real no Zen (28/07), pedindo um JSON de avaliação de anúncio:
```
HTTP 200 em 11s · finish_reason: stop · content OK
completion_tokens: 1032   ← total gerado
reasoning_tokens:   965   ← 93% foi só "pensando"
```
**Sobraram ~67 tokens de resposta real.** O `tracking/generate` pedia `max_tokens: 500` —
teria gasto o orçamento inteiro no raciocínio e devolvido `content` **VAZIO, com HTTP 200
e sem erro nenhum**. Pareceria bug de parse e custaria horas.

Por isso `chatComZen` aplica `OPENCODE_MIN_MAX_TOKENS` (default 8000) em todo pedido.
**Nunca chamar o Zen sem esse piso.**

Bônus do teste: JSON válido saiu **sem `response_format`** (JSON mode), então dá para
confiar no `parseJSONFlexivel`. E o Zen faz prompt caching (`prompt_cache_hit_tokens: 128`).

### O que AINDA é pago (de propósito)
- `/api/ai/diagnostic` e `/api/ai/deep-diagnostic` — chamam a Anthropic direto, sem
  caminho gratuito. Rodam em `ANTHROPIC_DIAGNOSTIC_MODEL` (default `claude-sonnet-5`).
  Decisão consciente: são sob demanda, não rodam em loop, e é auditoria de campanha.
- `DESIGN_PROVIDER=openai|anthropic` e agente com `modelo` em `gpt*` — só por escolha.

### Código morto encontrado
`callOptimizationPlan` em `src/lib/anthropic.ts` **não tem nenhum chamador** — o
`/api/meta/optimize/plan` usa o `generateWithProvider`. Foi "otimizada" no mesmo dia sem
efeito nenhum. Candidata a remoção.

---

## 💸 Antes disso: Anthropic mais barata — modelo por env + prompt caching (28/07/2026)

### O sintoma
O crédito da Anthropic sumia rápido demais para o que o app entrega. Não era volume —
era preço por chamada.

### A causa
Três chamadas em `src/lib/anthropic.ts` estavam com **`claude-opus-4-8` hardcoded**:
`callDiagnostic`, `callDeepDiagnostic` e `callOptimizationPlan`. Opus é o topo da linha
e essas rotas só devolvem um JSON curto com as regras já dadas no prompt.

Preço por 1M tokens (input/output), para não errar a conta de novo:

| Modelo | Input | Output |
|---|---|---|
| `claude-opus-4-8` / `claude-opus-5` | $5 | $25 |
| `claude-sonnet-5` | $3 | $15 |
| `claude-haiku-4-5` | $1 | $5 |

⚠️ Opus → Sonnet corta **~1,7x**, não 5x. O 5x é Opus → **Haiku**.

### O que mudou

**1. Modelo saiu do hardcode** — novo export em `anthropic.ts`, no mesmo padrão do
`ANTHROPIC_DESIGN_MODEL` que já existia:
```ts
export const ANTHROPIC_DIAGNOSTIC_MODEL =
  process.env.ANTHROPIC_DIAGNOSTIC_MODEL || 'claude-sonnet-5';
```
Default no código, então **não precisa mexer no `.env.local`** para funcionar. Trocar de
modelo agora é uma linha de env, sem tocar em código.

**2. 🚨 A pegadinha do Sonnet 5 — `thinking` LIGADO por padrão.** Não bastava trocar a
string do modelo. No Opus 4.8, omitir o parâmetro `thinking` significava **sem thinking**.
No Sonnet 5 (e no Opus 5), omitir significa **thinking adaptativo ligado**. E `max_tokens`
é o teto de *thinking + resposta somados* — ou seja, o `callDiagnostic`, que tem
`max_tokens: 1024`, teria passado a devolver **JSON truncado**, silenciosamente. Por isso
as três chamadas levaram:
```ts
thinking: { type: 'disabled' },
output_config: { effort: 'low' },   // 'medium' nas duas mais pesadas
```
São extrações de JSON com regra pronta no prompt — não precisam raciocinar. **Este ajuste
segura mais custo que a própria troca de modelo.**

**3. Prompt caching nos agentes** — entrou em `gerarComClaude()`, que é o **funil único**
por onde passa todo system prompt de agente (`gerarJSONComAgente` e
`/api/design/generate` chamam ele). O system (SOUL+AGENTS+TOOLS+SKILL concatenados) é
grande e idêntico entre chamadas; o prompt do usuário é volátil. Então o breakpoint vai
no system e o usuário fica de fora:
```ts
system: [
  { type: 'text', text: params.system, cache_control: { type: 'ephemeral' } },
],
messages: [{ role: 'user', content: params.user }],
```
Cobre mineração, autopsia/dossiê, meta/diagnose, meta/optimize/plan e design/generate.
1ª chamada paga 1.25x; as seguintes pagam ~0.1x nesse trecho.

⚠️ **Duas ressalvas do cache:** TTL de ~5 min, e o prefixo precisa de **no mínimo 1024
tokens** para entrar — abaixo disso ele **não cacheia e não dá erro**. Para conferir se
está pegando, olhar `usage.cache_read_input_tokens` na resposta: se vier 0 em chamadas
repetidas, ou o prompt é curto demais ou algo volátil vazou para dentro do bloco cacheado.

### O que ficou de fora (de propósito)
- **`ANTHROPIC_DESIGN_MODEL`** continua `claude-sonnet-4-6`. Já era configurável e não é
  Opus — mudar seria escopo não pedido.
- **`PLAN_CONTRACT`** (em `callOptimizationPlan`) é grande e estático, ótimo candidato a
  cache, mas está **no fim** do prompt, depois das métricas voláteis. Cachear exigiria
  reordenar o prompt inteiro. Fica anotado.

### Próximo passo recomendado
Rodar o mesmo diagnóstico em `claude-sonnet-5` e em `claude-haiku-4-5` na mesma campanha
e comparar o JSON. Se o Haiku aguentar a classificação de gargalo, é 5x mais barato que o
Opus original — e é só trocar `ANTHROPIC_DIAGNOSTIC_MODEL` no `.env.local`.

### Bônus da mesma leva: Havan na lista negra do minerador
Apareceu anúncio da Havan na mineração (varejão gigante domina keyword genérica e polui o
funil). Em `src/lib/minerador-blacklist.ts`: `'havan'` em `ANUNCIANTES_LISTA_NEGRA` e
`'havan.com'` em `DOMINIOS_LISTA_NEGRA` — o domínio ficou específico de propósito, porque
só `'havan'` pegaria "havana" por substring. Já existe **1 anúncio da Havan no banco**
(minerado 28/07 00:25, `havan.com.br/golden-waffle-britania...`) — a lista negra só filtra
mineração nova, esse aí precisa ser excluído na mão pela tela `/mineracao`.

---

## 🔬 Autópsia de Concorrente — COMPLETA (27/07/2026)

> ✅ **As 16 tarefas do plano estão implementadas e o módulo foi validado contra o
> gabarito.** O registro da validação (os 6 critérios de aceite com os números reais)
> está na seção "Autópsia de Concorrente — MÓDULO CONSTRUÍDO E VALIDADO", mais abaixo.
> As decisões e os achados desta seção continuam valendo como contexto histórico.

### O que é
A `/mineracao` acha **muitos** anúncios rasos e dá score. A **autópsia** disseca **um**
anunciante a fundo: baixa todos os criativos únicos, extrai grades de frames, **transcreve o
áudio** e gera um dossiê `.md`/`.html` publicável. São complementares — minerar é o funil de
descoberta, autopsiar é o que se faz depois de escolher o alvo.

Origem: `PLANO-AUTOPSIA-CONCORRENTE.md` (handoff do workspace `low-ticket`, onde o método foi
executado à mão e validado num concorrente real).

### Os 3 documentos que governam este trabalho
| Arquivo | O que é |
|---|---|
| `docs/superpowers/specs/2026-07-26-autopsia-concorrente-design.md` | **Design aprovado** — decisões D1–D8, schema, fluxo, critérios de aceite |
| `docs/superpowers/plans/2026-07-27-autopsia-concorrente.md` | **Plano de 16 tarefas** com o código completo de cada uma |
| `.superpowers/sdd/2026-07-27-autopsia-concorrente/progress.md` | **Ledger** — o que foi feito, achados, minors adiados (gitignorado) |

### Decisões tomadas com o Fernando (não reabrir)
- **D1 — Transcrição em worker Python local**, com a fila (`autopsia_jobs`) modelada desde o
  dia 1. Custo R$ 0; `faster-whisper` e `ffmpeg` já estão instalados na máquina. Trocar por API
  (Groq/Deepgram) depois = escrever **outro consumidor da mesma fila**, sem reescrever o módulo.
- **D2 — Storage salva só a IMAGEM na mineração**; vídeo baixa sob demanda (favorito/autópsia).
- **D4 — A rota nunca processa mídia, só enfileira.** Transcrever passa dos 300s de `maxDuration`.
- **D5 — O agente devolve JSON por seção; o `.md`/`.html` sai de montador determinístico**
  (mesmo padrão do `fop.ts`).
- **D6 — `getTenantClient()` é a porta única dos dados.** Hoje devolve o `supabaseServer` de
  sempre; existe para que o dia do BYOK mude 1 arquivo em vez de 60. Código NOVO usa ela.
- **D8 — App de uso pessoal:** guardar o material completo no Supabase do Fernando, bucket
  público, **sem cautela defensiva no código**. A questão de hospedar material de terceiro só
  volta se virar produto pago.

### ✅ O que JÁ ESTÁ FEITO (9 tarefas, 11 commits, todos na `main`)

| # | Tarefa | Commit | Review |
|---|---|---|---|
| 1 | `storage.ts` (`salvarMidia`) + `supabase-tenant.ts` + bucket `criativos` | `3466dd0` + `34aa24c` | ✅ limpa |
| 2 | Mineração persiste imagem + migration de colunas + `storage-backfill.mjs` | `e5898a9` | ✅ limpa |
| 3 | Migration das 3 tabelas da autópsia | `c29cc16` | ✅ limpa |
| 4 | `creativeKeyFromSnap` extraída p/ `minerador-media.ts` | `e59f7fc` | ✅ limpa, 0 achados |
| 5 | `src/lib/autopsia/coleta.ts` (ScrapeCreators paginado + dedup) | `8d8a975` | ⚠️ **não rodou** |
| 6 | `POST /api/autopsia/criar` | `606b2d5` | ✅ limpa |
| 7 | Página `/autopsia` + item na Sidebar | `995955a` | ✅ limpa |
| 8 | Página `/autopsia/[id]` com 4 abas | `98b9479` | ✅ limpa |
| 9 | Botão "Autopsiar este anunciante" no modal de `/mineracao` | `34ea3fc` | ⚠️ **não rodou** |

| 10 | `scripts/worker-autopsia.py` + job `download` | (working tree) | rodado na fila real |
| 11 | Job `frames` — 3 grades 3×3 por vídeo | (working tree) | rodado na fila real |
| 12 | Job `transcrever` — faster-whisper local | (working tree) | rodado na fila real |
| 13 | Cérebro do agente `autopsia` + sync | (working tree) | sincronizado, `ativo=true` |
| 14 | `/api/autopsia/dossie` + `montarMarkdown` | (working tree) | `sucesso:true` contra a autópsia real |
| 15 | `montarHtml` + `/api/autopsia/publicar` | (working tree) | tsc limpo |
| 16 | Validação ponta a ponta + documentação | (working tree) | esta seção |

**Estado real do banco:** 1 autópsia (`a0bf2707-aac4-4125-a5f7-71d4e03bcfa7`,
"Alimento Sagrado", 22 anúncios → 8 criativos), todos os criativos baixados, com 3 grades
e transcritos. 33 anúncios minerados. Bucket `criativos` público, limite 50MB.

**Como usar:** abrir `/autopsia`, colar um `page_id` (ou clicar em "Autopsiar este
anunciante" no modal da mineração) → a coleta roda e a fila enche. Depois rodar
`py -3 scripts/worker-autopsia.py` na raiz e deixar esvaziar (~2–4 min de CPU por vídeo).
Quando `total_transcritos > 0`, o botão "Gerar dossiê com IA" acende na aba Dossiê.

### ✅ RETOMADO E FECHADO (mesma data)

1. **Reviews das Tasks 5 e 9** — feitas contra dados reais: as durações batem o gabarito
   e os 33 `ads_minerados` têm `page_id`, então o botão "Autopsiar" resolve de verdade.
   Um minor ficou aberto na Task 5: `snap.body?.text ?? snap.body ?? null` grava o
   **objeto** se `body` vier como objeto sem `text` (o comentário do plano diz que cai em
   `null` — não cai). Os dados reais não caem nesse caso; fix de 1 linha quando aparecer.
2. **Tasks 10–12** — worker completo, rodado na fila real (8 downloads, 3 grades/vídeo,
   8 transcrições).
3. **Tasks 13–15** — 10º agente + dossiê + publicação.
4. **Task 16** — validação e esta documentação.

O método de execução era **subagent-driven**: um subagente implementador por tarefa (com o
brief extraído do plano), depois um revisor por tarefa, ledger atualizado a cada passo. Os
scripts estão em
`C:\Users\cerqu\.claude\plugins\cache\superpowers-marketplace\superpowers\6.2.0\skills\subagent-driven-development\scripts\`.

### 🔴 Achados desta sessão que valem mais que o código

**1. Variável de ambiente do Windows sombreava o `.env.local` — e falhava em SILÊNCIO.**
Havia `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` no ambiente do usuário do Windows apontando
para **outro** projeto Supabase (`nafpijwkdzqagfiigqvi`; este repo é `apdjykklderoyiosmytw`).
O **Next não sobrescreve `process.env` já setado**, então o app montava o client com a URL
deste projeto e a chave do outro → toda escrita server-side falhava auth, sem erro visível
(o código grava best-effort e ignora `error`). **As duas foram removidas**; backup em
`C:\Users\cerqu\supabase-env-backup.txt` com o comando de restauração dentro.
⚠️ Processo já em execução mantém o valor antigo em memória — **subir `npm run dev` de um
terminal novo**. Registrado na memória do projeto como `env-os-shadows-env-local`.

**2. O acervo antigo de imagens foi perdido — chegamos ~3 dias tarde.**
O parâmetro `oe=` das URLs do FB CDN é a validade, e mede ~5 dias. Os 30 anúncios estavam
minerados em 21–22/07; no dia 27 o backfill devolveu **0 salvos / 30 HTTP 403**. Não é bug —
é exatamente o problema que motivou a fase 0, descoberto tarde demais para esses. **Daqui em
diante toda mineração salva a imagem no ato.** Os cards antigos mostram o placeholder "sem
imagem" até re-minerar aquelas keywords.

**3. Erro meu no plano, corrigido:** `fileSizeLimit: '200MB'` no `createBucket` **não funciona**
neste projeto — o teto global de Storage é ~50MB (medido: 52MB passa, 55MB falha). Ficaria
latente, só explodindo se alguém apagasse o bucket. Corrigido para 50MB e provado **apagando e
recriando o bucket**. Vídeo de anúncio real tem 1,4–5MB (8 amostras do gabarito), então há 10x
de folga.

**4. A coleta automatizada bateu EXATO com o gabarito manual.** Rodada no mesmo anunciante que
o método manual dissecou à mão em 24/07 (*Alimento Sagrado*, `page_id 1130979790090955`):
**22 anúncios → 8 criativos únicos**, durações 31/82/91/105/109/110/111s e 130s — idênticas aos
8 arquivos em `low-ticket/alimento-sagrado/videos/`. A dedup por path do CDN está correta.
**Esse anunciante é o gabarito oficial do módulo** — use sempre ele para validar.

**5. `SCRAPE_CREATORS_API_KEY`** é o nome real da env (com underscore). O `CLAUDE.md` documenta
`SCRAPECREATORS_API_KEY` e está **errado** — a Task 16 do plano corrige.

### 📋 Minors adiados (nenhum bloqueia; triar na review final)
- `api/mineracao/run/route.ts:341-344` — o `.update` do `image_storage_path` não tem try/catch
  próprio; se lançasse, viraria 500 numa mineração que já deu certo. **Colide com o requisito
  "mineração nunca reprova por causa do Storage". Fix de 1 linha — o mais relevante da lista.**
- `api/autopsia/criar/route.ts:32` — body JSON malformado devolve 500 em vez de 400.
- `api/autopsia/criar/route.ts:37-46` — `ad_minerado_id` não-UUID vira 404 genérico.
- `api/autopsia/criar/route.ts:117-130` — se o insert de jobs falhar, a autópsia fica
  `processando` sem retomada automática (herdado do spec; sugere rota futura de reparo).
- `autopsia/[id]/page.tsx:80` — variável `workerParece0ffline` com zero no lugar do "o" (typo).
- `autopsia/page.tsx` e `producao/page.tsx` — fetch não distingue erro de lista vazia
  (padrão fraco pré-existente do projeto, não regressão).

### 🚧 Fora de escopo desta rodada (fase 6 do spec)
BYOK completo, multi-tenant real, billing, retenção, `/configuracoes` funcional (hoje é casca,
com um **Meta App ID real hard-coded** em `src/app/configuracoes/page.tsx` para remover), e
transcrição por API como 2º consumidor da fila.

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

---

## 📚 Biblioteca de Páginas — /paginas + pasta única `lps/` (23/07/2026)
Organização das landing pages (pedido do Fernando): **uma pasta só** e **todas as páginas no
banco/dashboard** pra servir de modelo e registrar qual **validou (ROAS OK)**.

- **Pasta única:** `lps/` é o local oficial. `capa_iphone_aluminio/` (página manual + 13 assets)
  movida para **`lps/capa-iphone-aluminio/`** (subpasta com `index.html` + `assets/`). A raiz do
  projeto ficou limpa. `lps/` segue gitignorada (o HTML de verdade vive no banco).
- **Tabela nova `lp_biblioteca`** (migration `20260723150000`, aplicada via MCP): nome, slug
  (UNIQUE), origem (`pipeline`/`manual`), `design_id` (UNIQUE, elo com workflow_design),
  codigo_html, url_publicada, **`validada`** (flag ROAS OK), notas. RLS + policies públicas +
  Realtime (convenção do projeto).
- **Motor ligado:** `/api/design/generate` faz **upsert automático** na biblioteca ao gerar
  (regerar atualiza o mesmo registro via `design_id`); `/api/deploy` espelha a `url_publicada`
  ao publicar. Slug do arquivo em disco e da biblioteca agora são a MESMA string (`slugLp`).
- **Backfill** `scripts/lp-backfill.mjs` (idempotente, roda com `node`): importa (1) pipeline
  (workflow_design com HTML), (2) **manuais** (subpastas de `lps/` com index.html), (3) **soltos**
  (lps/*.html de designs antigos já removidos do banco; ignora `-tracked`). Resultado: **8 páginas**
  (1 pipeline + 1 manual capa-iphone + 6 soltos).
- **UI nova `/paginas`** (Sidebar → "Páginas", ícone LayoutTemplate, após Design/Webmaster):
  grid de cards com **mini-preview real** (iframe `srcDoc` escalado 0.29, sandbox), badge de
  origem, botão **"Validar ROAS"** (toggle otimista → badge verde "ROAS OK"), filtro "Só
  validadas", link "No Ar", **Excluir** (banco + dashboard com confirm; aviso de que o Cloudflare
  é manual e os arquivos locais ficam) e **preview em tela cheia** (usa a URL viva quando
  publicada — assets ok; senão renderiza o HTML do banco).
- ⚠️ **Limitação conhecida:** páginas manuais com assets locais (capa-iphone) mostram o preview
  sem imagens (o banco só tem o HTML; os arquivos estão em `lps/capa-iphone-aluminio/assets/`).
  Se publicar no Cloudflare, o preview passa a usar a URL viva e fica perfeito.
- **Validado:** migration ok, backfill 8/8, `tsc` limpo, `/paginas` GET 200.

**Validação (23/07):** `npx tsc --noEmit` limpo; lint dos arquivos novos sem erros (só os
warnings `no-explicit-any` padrão do projeto); os 3 endpoints testados com a campanha real
`120249862631490627` (Premier Esportes): adsets com métricas e saúde corretas (8 compras,
ROAS 2.88 no "Genérico_Aberto"), 39 criativos todos com imagem, histórico com diagnósticos
reais; página GET 200 e compilando sem erro. ⏳ **Falta o clique do Fernando na tela**
(pausar/ativar conjunto real, modais). Nota de ambiente: `node_modules` estava com o pacote
`typescript` quebrado/ausente — `npm install typescript` resolveu.

---

## 🎵 Música de fundo no dashboard (27/07/2026)
Botão **Play Music** + slider de volume no header da Visão Geral, tocando em loop infinito.

**A decisão que importa:** o `<audio>` vive no **layout** (`MusicProvider`), não na página. No
App Router, trocar de rota desmonta o componente da página — se o player morasse em
`src/app/page.tsx`, a música cortaria no instante em que você clicasse em Mineração. O botão
(`src/components/ui/MusicButton.tsx`) fica na Visão Geral e conversa com o provider por
contexto, então o controle está onde foi pedido sem acoplar o áudio ao ciclo de vida da página.

- **`loop` é atributo nativo** do `<audio>`: o navegador reinicia sem gap, sem timer nosso.
- **O arquivo teve que sair de `audio/` para `public/audio/`** — o Next só serve estáticos de
  `public/`. Na raiz, o mp3 não era acessível pelo navegador de jeito nenhum.
- Volume padrão **35%** (é cama sonora de fundo) e volume + estado persistem em `localStorage`.
- Autoplay bloqueado pelo navegador na retomada é tratado com honestidade: mostra
  "clique p/ liberar" em vez de fingir que está tocando.

**Validado no navegador:** `/` → play → `/mineracao` → `/` com `paused=false` e `currentTime`
subindo continuamente (10s → 37s → 72s), **1 única instância de `<audio>`** (navegar não
duplica o player) e o botão voltando como "Pause". `preload="metadata"` para não baixar os
4,3 MB antes de alguém querer ouvir.

---

## 🔬 Autópsia de Concorrente — MÓDULO CONSTRUÍDO E VALIDADO (27/07/2026)
10º agente. A mineração acha anúncios; a autópsia disseca **um** anunciante.

**Arquitetura:** a rota só enfileira, um worker Python local consome (`autopsia_jobs`).
Transcrever leva minutos por vídeo e não cabe em rota (`maxDuration=300` é limite de
plataforma, não escolha). Trocar por API de transcrição depois = outro consumidor da
mesma fila, sem reescrever o módulo.

**Fase 0 (consertou bug real):** as URLs do FB CDN expiram em ~5 dias (o `oe=` é a
validade). Mineração agora salva a imagem no Storage (bucket `criativos`, coluna
`image_storage_path`); vídeo só baixa sob demanda. O acervo antigo de 30 anúncios
**foi perdido** (backfill devolveu 0 salvos / 30 HTTP 403) — chegamos ~3 dias tarde.

**Coleta:** ScrapeCreators `company/ads` por `page_id` — 30 anúncios/chamada + cursor,
1 crédito cada. Substitui Playwright/scroll/parse do método manual. Dedup pela mesma
`creativeKeyFromSnap()` da mineração (extraída para `minerador-media.ts`).

**Worker** (`scripts/worker-autopsia.py`, só stdlib + REST via urllib): download com
`Referer: facebook.com` → ffmpeg 3 grades 3×3 (hook/meio/CTA) → faster-whisper `medium`
CPU. Custo R$ 0. Lock por UPDATE condicionado a `status=pendente`, 3 tentativas.

**Dossiê:** agente `autopsia` devolve JSON por seção; montador determinístico gera `.md`
e `.html` autocontido (CSS inline, sem CDN, **URLs absolutas do Storage**) publicado no
Cloudflare. `em_aberto[]` é campo de schema — o dossiê não preenche slot em aberto por
inferência.

**Validado contra o gabarito** (*Alimento Sagrado*, `page_id 1130979790090955`, cujo
dossiê manual de 24/07 deu 8 criativos de 31–130s):

| # | Critério de aceite | Resultado real |
|---|---|---|
| 1 | Dedup chega a ~8 criativos únicos | ✅ **22 anúncios → 8 criativos** |
| 2 | Durações entre 31s e 130s | ✅ 31/83/92/105/109/111/111/131s (ffprobe arredonda pra cima o que o gabarito truncava — +1s consistente; são os mesmos 8 vídeos) |
| 3 | Transcrições batem com o gabarito manual | ✅ **praticamente palavra por palavra** no vídeo de 31s (só "sem leite **e** sem açúcar" → "sem leite, sem açúcar"). 8/8 transcritos, 525–1990 chars, todos com SRT |
| 4 | 3 grades de frames por vídeo | ✅ 3 grades/vídeo (24 PNGs), servindo publicamente HTTP 200 (~1,6 MB cada) |
| 5 | Dossiê 9 seções, `modelar_x_rejeitar` preenchida, nada inventado | ✅ 8 chaves JSON + método de coleta determinístico; `em_aberto` com perguntas reais |
| 6 | HTML abre e mostra os frames | ✅ renderizado local (27 KB): **24 `<img>` com URL absoluta, 0 relativa**, 0 `<script>`/`<link>`, CSS inline, único host externo é o Storage. **Deploy no Cloudflare NÃO executado** — ver abaixo |

**Desvio do plano (Task 16 Step 1):** não apaguei a autópsia de teste para refazer do
zero — a rodada existente já era do mesmo anunciante-gabarito e completou o ciclo
inteiro, então refazer só gastaria crédito da ScrapeCreators e ~30 min sem informação
nova. Os números acima são dessa rodada.

**⚠️ Publicação no Cloudflare NÃO foi disparada.** O código está pronto e o HTML foi
provado por renderização local, mas o deploy cria um **projeto Pages novo com URL
pública** contendo o material minerado do concorrente — decidi não disparar sem o
Fernando confirmar. Para publicar: botão "Publicar dossiê" na aba Dossiê, ou
`curl -X POST localhost:3000/api/autopsia/publicar -d '{"autopsia_id":"..."}'`.

**⚠️ Anthropic sem crédito:** o dossiê saiu por `gpt-4o-mini (fallback)`, não por
`claude-sonnet-4-6`. Funciona, mas a **qualidade da análise está limitada pelo modelo
barato** — e aqui a análise *é* o produto. Pôr crédito na Anthropic é o maior ganho de
qualidade disponível neste módulo. Sinal concreto: com 4 transcrições o dossiê saiu com
6777 chars; com as 8 completas, 5869 — o modelo barato ficou *mais* lacônico com *mais*
material, o que é o oposto do esperado.

**🪤 Pegadinha ao adicionar um agente NOVO (custou uma sessão de debug):** criar a pasta
`agentes/<slug>/` e sincronizar **não basta** para ele aparecer direito em `/agents`. A página
tem dois mapas hard-coded que precisam do slug:
- `ORDEM_AGENTES` — slug ausente cai no **fim da lista** (`ordenarAgentes` manda desconhecido
  pro fim). O agente *está* lá, mas no rodapé, e parece que "não sincronizou".
- `PAGINA_DO_AGENTE` — slug ausente mostra "sem página no dashboard" mesmo a rota existindo.

O `autopsia` foi registrado nos dois (posição: logo depois do `minerador`, que é o fluxo real
— minerar acha o alvo, autopsiar disseca). **O sync em si nunca esteve quebrado**: clicar o
botão devolve "10 agente(s) sincronizado(s), 0 com erro" e atualiza `ultimo_sync_em` dos 10.

**Pendente:** transcrição por API (Groq) como 2º consumidor da fila; BYOK real.

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
| **Autópsia** (10º) | ✅ `agentes/autopsia/` | ✅ `/api/autopsia/{criar,dossie,publicar}` + `scripts/worker-autopsia.py` | **Módulo completo (16/16)** — coleta, worker (download/frames/whisper), dossiê e publicação. Ver seção no topo |

---

## 🧹 Limpar o Storage ao excluir anúncio (PENDENTE)

> **Gatilho: fazer isto QUANDO o Fernando for apagar os anúncios no dashboard.** Combinado em
> 27/07/2026 — ele vai limpar o acervo e re-minerar do zero, então a exclusão precisa levar o
> arquivo do Storage embora no mesmo ato. Não é urgente antes disso (é só desperdício de espaço),
> mas se for esquecido o bucket vira lixão silencioso.

### O problema
Excluir anúncio hoje **só apaga a linha do banco**. O `.jpg` continua no bucket `criativos`,
pasta `minerados/`, para sempre — sem nada que o referencie. São dois pontos de exclusão, ambos
em `src/app/mineracao/page.tsx`:
- `excluirAnuncio()` (~linha 215) — exclusão individual pelo modal
- o purge de não-favoritos (`setIsPurging`, ~linha 265) — `delete().eq('favorito', false)`

Baseline medido em 27/07 (`storage.objects`): `minerados/` com **4 arquivos / 1,5 MB** e
`autopsia/` com **32 arquivos / 132 MB**.

### ⚠️ A restrição que decide a implementação (verificada, não suposta)
**Não dá para resolver no componente.** As duas exclusões usam o client do **navegador**
(`src/lib/supabase.ts`, anon key) e `storage.objects` tem **RLS ativo com ZERO policies** —
conferido em `pg_policies`. Anon key não apaga arquivo, e criar policy de DELETE para anon seria
pior: qualquer um com a chave pública poderia apagar o bucket inteiro.

**Só o service_role remove objeto.** Logo, a limpeza exige uma **rota server-side**.

### Como implementar
1. **Criar `src/app/api/mineracao/excluir/route.ts`** (`POST`), usando `getTenantClient()`:
   - Body: `{ ids: string[] }` ou `{ apenas_nao_favoritos: true }` para cobrir os dois botões.
   - `select id, image_storage_path` dos alvos **ANTES** de deletar — depois do delete o caminho
     do arquivo se perde e o órfão fica impossível de achar. Esta é a ordem que importa.
   - Extrair o caminho do objeto a partir da URL pública: o que vai para
     `storage.from('criativos').remove([...])` é `minerados/<id>.jpg`, **não** a URL inteira.
   - `delete()` nas linhas de `ads_minerados`.
   - Remover os objetos em lote (`remove()` aceita array) — **best-effort**: se a remoção do
     arquivo falhar, a exclusão do banco continua valendo. Mesma regra do `salvarMidia`:
     Storage nunca reprova a operação principal.
   - Devolver `{ excluidos, arquivos_removidos, arquivos_falharam }` — o mesmo padrão de
     contadores que `mineracao/run` ganhou em 27/07, que é o que dá prova sem ir ao banco.
2. **Trocar as duas chamadas em `src/app/mineracao/page.tsx`** para `fetch` nessa rota, mantendo
   a atualização otimista da UI que já existe.
3. **Limpar os órfãos já existentes** uma vez (script pontual ou a própria rota com os ids
   antigos), senão os 4 arquivos de hoje ficam lá para sempre.

### Vale estender para a autópsia?
A mesma lacuna existe lá, e é **onde o peso está**: `autopsia/` tem 132 MB (vídeos + grades de
frames). `autopsias` tem `on delete cascade` para `autopsia_criativos`, então apagar uma autópsia
já limpa o banco — mas **não** o Storage. Se a rota acima for escrita genérica o suficiente
(recebendo bucket + lista de caminhos), atende os dois casos. Decidir na hora; não bloqueia a
mineração.

---

## 🚀 Próximos Passos
- [x] ~~🔬 **RETOMAR A AUTÓPSIA**~~ → **módulo completo (16/16) e validado** em 27/07. Ver a
      seção "🔬 Autópsia de Concorrente — MÓDULO CONSTRUÍDO E VALIDADO".
- [x] ~~(Autópsia) Aplicar o fix do try/catch em `mineracao/run/route.ts`~~ → **feito em 27/07**,
      e provado com mineração real. Ver "🧹 Limpar o Storage ao excluir anúncio" abaixo.
- [ ] 🧹 **AO EXCLUIR OS ANÚNCIOS NO DASHBOARD: implementar a limpeza do Storage junto.**
      É a pendência combinada com o Fernando em 27/07 — ele vai apagar o acervo e re-minerar
      do zero, e a exclusão precisa levar o arquivo embora. **Passo a passo na seção
      "🧹 Limpar o Storage ao excluir anúncio (PENDENTE)"**, logo antes desta lista.
- [ ] Re-minerar as keywords antigas — o acervo de imagens de 21–22/07 expirou e não volta;
      agora toda mineração salva no Storage no ato.
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
