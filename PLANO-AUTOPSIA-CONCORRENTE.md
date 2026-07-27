# 🔬 PLANO — Autópsia de Concorrente no Synapse

> **O que é este arquivo.** Um handoff escrito em **26/07/2026** de dentro do workspace
> `low-ticket`, onde o método descrito aqui foi **executado à mão e validado** num
> concorrente real. Não é ideia solta: cada peça abaixo já rodou uma vez e produziu
> entregável. O que falta é **transformar em produto dentro deste dashboard**.
>
> **Intenção do Fernando:** este módulo vai ser vendido — low ticket e/ou assinatura.
> Isso muda decisões de arquitetura, e as que mudam estão marcadas com 💰.
>
> **Como usar:** abra uma sessão nova nesta pasta e leia isto inteiro antes de codar.
> Os arquivos-fonte continuam no low-ticket (mesma máquina, caminhos absolutos abaixo)
> — **leia os originais, não confie no resumo daqui.**

---

## 1. A ideia em uma frase

**A `/mineracao` que já existe acha anúncios. A autópsia disseca um anunciante.**

| | Mineração (existe) | Autópsia (a construir) |
|---|---|---|
| Escopo | **muitos** anúncios, rasos | **um** concorrente, fundo |
| Pergunta | "quem está escalando?" | "*como* essa oferta funciona?" |
| Entrada | keyword + país | um `page_id` / anunciante escolhido |
| Saída | linha em `ads_minerados` com score | **dossiê** `.md` + `.html`, vídeos, transcrições, grades de frames |
| Custo | 1 chamada de API | minutos de CPU e centenas de MB |

São **complementares**: minerar é o funil de descoberta; autopsiar é o que se faz
depois de escolher o alvo. É por isso que a resposta à sua pergunta é **página nova** —
detalhada no §5.

---

## 2. O que JÁ existe aqui e NÃO deve ser reconstruído

Levantado lendo o código em 26/07. **Metade do trabalho está feita.**

| Peça | Onde | O que já resolve |
|---|---|---|
| Busca na Ad Library | `src/app/api/mineracao/run/route.ts` | via **ScrapeCreators API** (não scraping) |
| **Copy, headline, CTA, link** | tabela `ads_minerados` | `ad_copy`, `ad_title`, `cta_text`, `cta_type`, `link_url`, `caption` |
| URLs de mídia | `ads_minerados.video_urls`, `image_url` | os `src` dos criativos |
| Dados do anunciante | mesma tabela | `page_name`, `page_id`, `page_like_count`, `brazil_tax_id`, `page_categories` |
| Sinal de escala | `collation_count` | nº de duplicações do anúncio |
| **Dedup de criativo** | `creativeKeyFromSnap()` na mesma rota | compara o **path** da URL, ignorando querystring assinada |
| Score por IA | mesma rota + agente `minerador` | `score_escala`, `categoria_ia`, `notas_ia` |
| Blacklist | `src/lib/minerador-blacklist.ts` | filtro de lixo |
| Motor de agentes | `src/lib/agents/` | `buildSystemPrompt`, `gerarJSONComAgente` com fallback OpenAI |
| Publicação de página | `src/lib/cloudflare.ts` | `wrangler pages deploy` — **serve para publicar o dossiê HTML** |

> ⚠️ **Duas armadilhas de quem for implementar.**
>
> **(a) Não trocar ScrapeCreators por Playwright.** No low-ticket o scraping foi feito com
> Playwright MCP porque não havia API contratada. Aqui **existe**, é mais estável e não
> quebra quando o Facebook mexe no DOM. O método do low-ticket vale pelo *raciocínio*
> (o que extrair, como deduplicar, o que fazer com o material), não pela ferramenta.
>
> **(b) A dedup daqui é melhor que a de lá — manter a daqui.** O low-ticket deduplicava
> pelo `xpv_asset_id` escondido em base64 no parâmetro `efg` da URL. Engenhoso, e frágil:
> depende de um campo interno do Facebook. O `creativeKeyFromSnap()` compara o **path** do
> arquivo, que é estável e não depende de decodificar nada.

---

## 3. O que vem do low-ticket — o método já validado

**Caminhos absolutos, mesma máquina. Ler os originais.**

| Arquivo | Linhas | O que é |
|---|---|---|
| `C:\Users\cerqu\Documents\Projetos_IDE\low-ticket\alimento-sagrado\baixar.py` | 27 | download dos vídeos com `Referer: facebook.com` |
| `...\alimento-sagrado\transcrever.py` | 37 | `faster-whisper` local, `medium`, CPU, `int8` |
| `...\alimento-sagrado\urls.json` | — | formato do inventário de criativos |
| `...\alimento-sagrado\dossie.md` | 424 | **o entregável** — 9 seções |
| `...\alimento-sagrado\dossie.html` | 574 | mesmo conteúdo, arquivo único, sem CDN |
| `...\alimento-sagrado\notes.md` (§ *Método de coleta*, ~linha 555) | — | os 6 passos do método |
| `...\alimento-sagrado\frames\` | 5 arquivos | grades `grid-hooks`, `grid-meio`, `grid-cta` |
| `C:\Users\cerqu\Documents\Obsidian\Nexus.AI\01_Global_Skills\🔬Skill_Logic_Autopsia_AdLibrary_V1.md` | — | a skill que orquestra tudo |

**Os 6 passos, como foram executados:**

1. Navegar a biblioteca e rolar até carregar tudo
2. `document.body.innerText` → parse por `"Identificação da biblioteca:"` → copy, datas, CTA
3. `document.querySelectorAll('video')` → `src`; dedup por asset id → **18 anúncios viraram 8 vídeos únicos**
4. Download em Python + `urllib`, com header `Referer`
5. **Frames:** `canvas` + `drawImage` na própria página do FB — contorna o taint de CORS, porque o screenshot do Playwright não é afetado
6. **Transcrição:** `faster-whisper` local, sem ffmpeg (PyAV embutido)

> 🔴 **A descoberta que justifica o passo 6 e vale ouro no produto:**
> **legenda queimada em karaokê palavra-a-palavra torna impossível ler a copy por frame.**
> Quem tentar OCR nos frames vai extrair `"VOCÊ"`, `"SABIA"`, `"QUE"` em imagens separadas
> e concluir que não dá. **Tem que transcrever o áudio.** Foi o que separou uma autópsia
> útil de uma inútil, e é o tipo de coisa que o concorrente que vende curso não conta.

---

## 4. O gap — o que falta construir

Confirmado por busca no código: **não existe nada de storage, ffmpeg ou transcrição
neste projeto** (`grep -i "storage.from|whisper|ffmpeg|transcri" src/` → zero).

| # | Falta | Dificuldade | Observação |
|---|---|---|---|
| 1 | **Persistir a mídia** | média | hoje só a URL é guardada — ver §4.1, é urgente e já afeta o produto atual |
| 2 | **Transcrição** | **alta** | é o ponto arquitetural do projeto — ver §6 |
| 3 | **Extração de frames** | média | `ffmpeg` no servidor, não mais canvas no browser |
| 4 | **Agrupar por anunciante** | baixa | `ads_minerados` é por anúncio; a autópsia é por `page_id` |
| 5 | **Gerar o dossiê `.md` + `.html`** | média | ver §7 |

### 4.1 🔴 Achado urgente, e vale para o dashboard como ele está hoje

**As URLs do CDN do Facebook expiram.** O parâmetro `oe=` é um timestamp Unix em
hexadecimal — é a validade do link assinado.

Medido em 26/07 num criativo coletado em **24/07**:

```
oe=6A699FEE  →  29/07/2026 06:38 UTC
```

**Cinco dias de vida.** O arquivo ainda respondeu HTTP 200 no teste, e morre em três dias.

**Consequência para o produto que já está no ar:** todo anúncio minerado há mais de uma
semana tem `video_urls` e `image_url` **apontando para o nada**. A tela mostra thumbnail
quebrada e o vídeo não abre. Num dashboard gratuito é um bug feio; **num dashboard pago é
pedido de reembolso** — o cliente paga por um acervo e recebe links mortos.

**Correção:** baixar para o Supabase Storage no momento da mineração e servir dali,
guardando a URL original só como referência de origem. **Isso deveria acontecer mesmo que
a autópsia nunca fosse construída.**

---

## 5. 📍 Página nova ou a de produção? — **página nova: `/autopsia`**

**Não vai em `/producao`.** Aquela tela é o kanban de `campanhas_producao`, o funil de
*criação* das nossas campanhas. Autópsia é *pesquisa* sobre o concorrente — entra antes,
e misturar as duas faz a tela de produção deixar de responder "o que estou produzindo".

**Também não vai dentro de `/mineracao`.** A mineração é uma lista larga que se percorre
rápido; a autópsia é uma peça longa que se lê. Naturezas diferentes de tela.

**O encaixe certo é uma terceira, ligada à segunda:**

```
/mineracao          →  lista de anúncios com score
   └─ [Autopsiar este anunciante]     ← botão novo na linha
        ↓
/autopsia           →  lista de autópsias (rodando / prontas)
   └─ /autopsia/[id]   →  o dossiê renderizado + abas
                            Criativos · Transcrições · Frames · Dossiê · Baixar
```

**Por que é a arquitetura certa comercialmente, e não só tecnicamente:** a mineração é
commodity — existem dez ferramentas que listam anúncio da Ad Library. **A autópsia é o
diferencial**, é o que ninguém entrega pronto. Ela merece rota própria, nome próprio e
lugar próprio no menu, porque é ela que justifica a assinatura. Enterrada como aba de um
detalhe de anúncio, vira recurso escondido que ninguém percebe ter comprado.

**Reaproveitar o que já existe na UI:** o padrão de realtime do Supabase usado em
`src/app/producao/page.tsx` (canal `postgres_changes`) serve igual para acompanhar o
progresso da autópsia sem polling.

---

## 6. ⚠️ A decisão arquitetural que trava tudo — onde roda a transcrição

**É o item que precisa ser decidido antes de escrever qualquer linha.** Errar aqui custa
retrabalho grande.

**O problema:** `faster-whisper` é Python, consome CPU pesado e leva **minutos por vídeo**.
Uma autópsia com 8 vídeos pode passar de **20 minutos**. A rota `/api/mineracao/run` já
está no teto com `maxDuration = 300` (5 min) — e isso é limite de plataforma, não escolha.
**Transcrição não cabe numa rota de API.** Não adianta otimizar; é categoria errada de lugar.

| Opção | Como | Custo | Prós | Contras |
|---|---|---|---|---|
| **A. Worker local** | Python na máquina do Fernando, puxando fila do Supabase | **R$ 0** | zero custo por minuto; nada sai da máquina; usa `transcrever.py` quase como está | **só funciona com a máquina ligada** — inviável para cliente pagante |
| **B. API de transcrição** | Groq/Deepgram/OpenAI a partir da rota | ~centavos por vídeo | escala sozinho, sem infra | custo por uso; áudio do concorrente sai da máquina |
| **C. Worker em container** | fila + container com Python | mensalidade fixa | escala e roda 24/7 | é infra nova para manter |

**Recomendação: começar em A, com a fila já modelada para B.** Ou seja: implementar o
worker local, **mas** com uma tabela `autopsia_jobs` e um contrato de fila desde o
primeiro dia. Assim o Fernando valida o produto sem gastar, e trocar para B na hora de
vender é **substituir um consumidor da fila**, não reescrever o módulo.

> 💰 **Ponto de atenção comercial:** a regra do low-ticket é *"transcrição sempre local"*,
> e ela está certa **lá** — pesquisa nossa, máquina nossa, custo zero. **Vendendo assinatura
> a regra não se sustenta**, porque o cliente não vai ligar o PC do Fernando. Não é
> contradição, é contexto diferente. **Registrar a mudança quando ela acontecer**, senão
> daqui a três meses alguém "corrige" o worker de volta para local citando a regra antiga.

---

## 7. O dossiê — o que fez ele funcionar

Foi a parte que o Fernando destacou, então vale dizer **por que** ficou bom, para não se
perder na tradução para dashboard.

**Duas saídas do mesmo conteúdo:** `.md` (fonte, versionável, lida por agente) e `.html`
(leitura humana — **arquivo único, autocontido, sem CDN, sem build, abre com duplo clique**).

**As 9 seções do `dossie.md`:**

```
0. Sumário executivo          5. O que modelamos × o que rejeitamos
1. O alvo                     6. Plano de criação do produto
2. Método de coleta           7. Restrições de projeto
3. Anatomia da operação       8. Anexos (inventário + índice de criativos)
4. Vulnerabilidades
```

**As duas regras de conteúdo que valem no produto também:**

1. **O dossiê não decide estratégia.** Slot em aberto **fica** em aberto, marcado como
   pauta. Preencher "por inferência" faz a decisão ser tomada por default de documento.
   Numa ferramenta com IA a tentação é dobrada — o modelo *sempre* consegue preencher.
   **Um dossiê que inventa posicionamento é pior que um dossiê incompleto**, porque o
   cliente age em cima e não sabe que era chute.
2. **Separar `modelar × rejeitar`.** A seção 5 é a que dá valor real: o concorrente faz
   coisas que funcionam e coisas que dão ban. Um relatório que só descreve não protege
   ninguém.

**Como gerar aqui:** o `.md` sai do agente (motor `src/lib/agents/` já existe), o `.html`
sai de uma conversão com template próprio. **Reaproveitar `src/lib/cloudflare.ts` para
publicar o HTML** dá de graça um "compartilhar dossiê por link" — que é feature vendável,
não só conveniência.

⚠️ **O HTML do low-ticket usa links relativos** (`frames/…`, `transcricoes/…`) porque vive
numa pasta. No dashboard os assets vão para o Storage — **o template precisa de URLs
absolutas ou os arquivos embutidos**. É o erro mais provável de quem for portar rápido.

---

## 8. Esboço de schema

Proposta, não decisão. Nomes seguem o padrão em português do `ads_minerados`.

```sql
-- Uma autópsia = um anunciante analisado numa data
autopsias (
  id uuid pk, page_id text, page_name text,
  status text,              -- fila | coletando | transcrevendo | montando | pronta | erro
  progresso int,            -- 0-100, para a barra na UI
  total_criativos int, total_transcritos int,
  dossie_md text, dossie_html_url text,
  criado_em, concluido_em, erro text
)

-- Um criativo dentro de uma autópsia
autopsia_criativos (
  id uuid pk, autopsia_id uuid fk,
  ad_archive_id text,       -- liga em ads_minerados, não duplica a copy
  creative_key text,        -- MESMA função de creativeKeyFromSnap()
  duracao_s int,
  storage_path text,        -- Supabase Storage: o vídeo de verdade
  url_origem text,          -- CDN do FB, só como procedência (expira em ~5 dias)
  transcricao text, transcricao_srt text,
  frames_paths text[]
)

-- A fila (§6) — o que permite trocar worker local por API sem reescrever
autopsia_jobs (
  id uuid pk, autopsia_id uuid fk, criativo_id uuid fk,
  tipo text,                -- download | transcrever | frames
  status text, tentativas int, erro text,
  criado_em, iniciado_em, concluido_em
)
```

**Não duplicar em `autopsia_criativos` o que já está em `ads_minerados`** (copy, CTA,
link). Referenciar por `ad_archive_id`. Duplicar cria duas verdades e uma delas envelhece.

---

## 9. Ordem sugerida

| Fase | Entrega | Por que nesta ordem |
|---|---|---|
| **0** | **Storage dos criativos na mineração** | §4.1 — conserta bug que já existe; e é pré-requisito de tudo |
| **1** | Tabelas + `/autopsia` listando + botão em `/mineracao` | esqueleto navegável antes de processamento pesado |
| **2** | Fila + worker de download e frames (`ffmpeg`) | a parte barata do processamento |
| **3** | Transcrição (decisão do §6) | a cara; isolada, dá para trocar de motor |
| **4** | Geração do dossiê `.md` pelo agente | precisa do material dos passos anteriores |
| **5** | Render `.html` + publicar por link | vira feature de compartilhamento |
| **6** | 💰 Multi-tenant, limites por plano, billing | só depois que o núcleo funciona para um usuário |

**A fase 0 vale sozinha.** Se o Fernando parar aí, o dashboard já melhora.

---

## 10. 💰 O que muda por ser produto pago — decidir com o Fernando

Não implementar nada disto por conta própria; são decisões de negócio.

> 📌 **Os itens 1, 2 e 3 mudam de forma se o modelo for BYOK — leia o §11 junto.**

1. **Custo por autópsia.** Vídeo, storage e transcrição custam por uso. Sem teto por
   plano, **um usuário entusiasmado consome a margem de dez**. Precisa de limite antes
   do primeiro cliente, não depois. *(BYOK resolve — §11.)*
2. **Multi-tenant.** As tabelas de hoje não têm `user_id` e a RLS de `ads_minerados` é
   `USING (true)` — **qualquer um lê tudo**. Isso é aceitável em ferramenta interna e
   **inaceitável** em produto pago. Trocar antes de vender, não depois. *(BYOK resolve
   de outro jeito — §11.)*
3. **Retenção.** Vídeo é caro de guardar. Definir por quanto tempo o acervo fica de pé.
   *(BYOK transfere para o cliente — §11.)*
4. **⚖️ Redistribuição de material de terceiros.** Baixar criativo alheio para *pesquisa
   própria* é uma coisa. **Hospedar e servir esse vídeo para clientes pagantes é outra** —
   deixa de ser uso interno e vira distribuição de conteúdo protegido de terceiros. As
   opções vão de "guardar só transcrição e frames, com link para o original" até
   "hospedar tudo". **Não é decisão de implementação; é decisão do dono do produto**, e
   convém tomá-la de olhos abertos antes de ter clientes — depois fica caro mudar.
   *(O `CLAUDE.md` do low-ticket já trava "nunca usar imagem/nome de terceiros sem
   autorização". Aqui a pergunta é mais estreita e mais séria: não é usar no anúncio, é
   revender acesso.)* **Este é o único que o BYOK melhora bastante mas não elimina** —
   se o vídeo é baixado pela chave do cliente, para o Storage do cliente, o Synapse é
   ferramenta e não distribuidor. Vale confirmar com quem entende, não comigo.

---

## 11. 🔑 Modelo BYOK — cada cliente com as próprias credenciais

**Direção definida pelo Fernando em 26/07:** no começo o dashboard é de uso próprio;
depois, o cliente assina barato e **cola as credenciais dele** em `/configuracoes`
(Supabase, Anthropic, ScrapeCreators, Meta Ads), e o app **provisiona o schema no banco
dele**. *Bring Your Own Keys.*

### 11.1 Por que é uma boa escolha — e resolve o problema mais difícil do §10

**O maior risco de um SaaS de IA low ticket é a margem negativa.** Assinatura de R$ 29
com um usuário que roda 40 autópsias no primeiro mês dá prejuízo, e a defesa normal
(cota, rate limit, plano por consumo) é justamente o que empurra o produto para caro e
complicado.

**No BYOK esse risco simplesmente não existe:** a conta da Anthropic é dele, o token do
scraper é dele, o storage do vídeo é dele. **O seu custo por cliente vira quase só o
servidor da aplicação** — e a assinatura passa a ser margem de software, não revenda de
API. É o que torna "assinatura barata" sustentável em vez de aspiracional.

**De quebra, três outras coisas melhoram:**
- **Item 2 do §10 (multi-tenant) muda de natureza.** Não é preciso RLS por `user_id` no
  banco compartilhado — **os dados de cada cliente nascem separados**, porque estão em
  bancos diferentes. Isolamento por arquitetura é mais forte que isolamento por policy.
- **Item 3 (retenção)** vira problema do cliente: é o Storage dele.
- **Vazamento de dados entre clientes fica quase impossível** — não existe tabela comum
  para vazar.

### 11.2 O que o modelo cria de problema novo — e nenhum é pequeno

**1. Guarda de credenciais.** O servidor passa a guardar chaves que abrem a conta inteira
do cliente. **Se você for comprometido, vazam N contas de Supabase, Anthropic e Meta de
uma vez.** Não dá para tratar como campo de texto:
   - cifrar em repouso (AES-GCM), com a chave-mestra **em variável de ambiente, nunca na
     mesma tabela do texto cifrado**
   - **nunca** logar, nem em erro, nem em telemetria
   - mascarar na UI (mostrar só os 4 últimos), permitir rotação e exclusão
   - considerar pedir a chave de **menor privilégio** que resolve cada função

**2. Rodar SQL no banco do cliente.** O PostgREST do Supabase **não executa DDL** — não
dá para `CREATE TABLE` pela API REST normal. Os caminhos reais:

| Caminho | Como | Custo de confiança |
|---|---|---|
| **Copiar e colar** | a tela mostra o SQL, o cliente cola no SQL Editor do Supabase dele | **nenhum** — você não guarda nada |
| Connection string | ele cola o `DATABASE_URL`, você roda com o driver `pg` | alto — acesso total ao banco dele |
| Management API | token pessoal do Supabase dele | **altíssimo** — o token vale a conta inteira, não um projeto |

> **Recomendação: começar por copiar e colar, com um botão "Verificar instalação".**
> O botão faz um `select` nas tabelas esperadas e mostra ✅/❌ item por item. Você não
> assume a custódia da credencial mais perigosa de todas, e o botão faz o trabalho de
> suporte que seria seu de qualquer jeito. **Se os dados de churn mostrarem que é no
> passo do "colar" que as pessoas desistem**, aí sim vale automatizar — mas aí é decisão
> tomada com evidência, e não medo antecipado.

**3. Migração em N bancos — o custo de longo prazo que ninguém antecipa.** Quando o
schema mudar na v2, existem 40 bancos de clientes na v1. **Sem isso resolvido desde o
início, vira armadilha sem saída:**
   - tabela `synapse_schema_version` **dentro do banco do cliente**
   - a aplicação **verifica a versão a cada sessão** e avisa quando está atrasada
   - todo código novo tolera banco antigo (ou bloqueia com mensagem clara — nunca quebra
     com stack trace)
   - migração é **sempre aditiva**: coluna nova com default, nunca `DROP` nem `RENAME`

**4. Separar plano de controle de plano de dados.** Hoje o app tem **um** Supabase para
tudo. No BYOK são dois papéis:

| | Banco | Contém |
|---|---|---|
| **Controle** (seu) | Supabase da Alavanca | contas, assinatura, credenciais cifradas, versão de schema de cada cliente |
| **Dados** (dele) | Supabase do cliente | `ads_minerados`, `autopsias`, criativos, Storage |

**Este é o maior refactor do projeto**, e por isso está no §11.4.

**5. Atrito de ativação é o risco de churn número um.** Um comprador que não consegue
tirar a chave da Anthropic **nunca usa o produto e pede reembolso na semana 1**. O
antídoto não é documentação, é:
   - assistente de configuração passo a passo, uma credencial por vez
   - **teste de conexão real por credencial** — chamada de verdade, ✅ verde ou ❌ com o
     erro em português. Sem isso, todo suporte vira "não funciona" sem diagnóstico
   - o produto tem que ser **utilizável em modo degradado**: sem chave de scraper, ainda
     mostra o que já existe

**6. Quais chaves são mesmo BYOK?** Anthropic e Supabase têm cadastro gratuito e são
razoáveis de pedir. **ScrapeCreators é pago e tem fricção maior** — vale decidir se essa
continua sua (e entra no preço da assinatura) ou é dele. **Não precisa ser tudo ou nada**,
e essa é provavelmente a decisão comercial mais importante do modelo.

### 11.3 ⚠️ O estado real de `/configuracoes` hoje — é uma casca

Lido em 26/07. A tela existe e está bonita, **mas não faz nada**:

- os `<input>` **não têm `value` nem `onChange`** — só `placeholder`/`defaultValue`. Nada
  é lido, nada é guardado
- **não existe rota de API** para salvar (`src/app/api/` não tem `configuracoes` nem
  `settings`)
- o botão diz **"Salvar Alterações (.env)"** — e escrever `.env` é conceito de máquina
  única. **Em multi-tenant não existe `.env` por cliente**; o destino tem que ser tabela
  cifrada no banco de controle. A label vai enganar quem for implementar
- 🔴 **tem um `defaultValue` com o Meta App ID real hard-coded** no arquivo
  (`src/app/configuracoes/page.tsx`, aba *Chaves Meta Ads*). Hoje é um detalhe; **no dia
  em que houver cliente, é a sua credencial aparecendo no formulário dele**. Tirar antes
  de qualquer coisa
- existem **duas** telas — `/configuracoes` (227 linhas) e `/settings` (60 linhas).
  Decidir qual sobrevive antes de investir na errada

**Conclusão prática: `/configuracoes` é protótipo visual, não base.** A boa notícia é que
o desenho de abas já é o certo para BYOK — o que falta é tudo que fica atrás dele.

### 11.4 O que fazer AGORA, mesmo enquanto é só para seu uso

**Aqui está o ponto que mais importa deste capítulo.** BYOK muda **onde as tabelas da
autópsia nascem**. Se as fases 1–5 do §9 forem construídas assumindo "o Supabase do app",
elas nascem no banco errado e são reescritas depois.

**Não é preciso construir o BYOK agora.** É preciso **não fechar a porta** — e isso custa
pouco se for feito desde o início:

1. **Todo acesso a banco de dados de dados passa por UM módulo** — por exemplo
   `src/lib/supabase-tenant.ts`, exportando `getTenantClient(ctx)`. Hoje ele devolve
   sempre o cliente atual, lendo do `.env`. No dia do BYOK, **muda um arquivo** em vez de
   sessenta. **É a diferença entre uma tarde e um mês de trabalho.**
2. **Separar desde já, no código, o que é controle e o que é dado.** Mesmo apontando os
   dois para o mesmo Supabase hoje, chamar pelo nome certo (`supabaseControle` ×
   `getTenantClient`) já documenta a fronteira e impede que ela seja atravessada por
   descuido.
3. **Escrever o SQL da autópsia como migração numerada e idempotente** (`IF NOT EXISTS`),
   num arquivo só — é exatamente o texto que o cliente vai colar depois. `banco_de_dados/`
   já segue esse padrão; manter.
4. **Nada de credencial em `localStorage` nem em campo de texto puro**, nem no protótipo.
   Hábito de protótipo vira produção mais vezes do que se admite.

### 11.5 Ordem revisada

O §9 continua valendo, com uma mudança e uma inserção:

| Fase | Mudança |
|---|---|
| **0** | ⬅️ **fazer o item 1 do §11.4 junto** (o módulo `getTenantClient`) — é o momento mais barato |
| 1–5 | inalteradas, mas **usando o módulo desde a primeira linha** |
| **5.5** | 🆕 **`/configuracoes` de verdade**: salvar cifrado + teste de conexão por chave |
| **6** | vira **BYOK**: banco de controle, provisionamento por SQL colado, `schema_version` |

---

## 12. Sobre trazer o `notes.md` do low-ticket

**Recomendação: não copiar o arquivo.** Ele tem ~1.050 linhas e é o **diário de bordo de
um produto de pão bíblico** — 90% é receita, versículo, capa de PDF e checkout da Ticto.
Copiar traria muito ruído e criaria uma **segunda cópia que envelhece** no dia seguinte.

**O que fazer em vez disso**, e já está feito neste arquivo:
- o **método** foi extraído para o §3
- os **caminhos absolutos** dos originais estão no §3, e as duas pastas vivem na mesma
  máquina — uma sessão aqui consegue abrir e ler os arquivos de lá quando precisar
- o que é **decisão do low-ticket** (transcrição local, hospedagem, Ticto) foi filtrado,
  e onde o contexto muda está marcado 💰

**Vale a pena ler de lá, sob demanda:** `dossie.md` inteiro (é o alvo de qualidade da
saída), o § *Método de coleta* do `notes.md`, e a skill `🔬Skill_Logic_Autopsia_AdLibrary_V1`.

---

## 13. Resumo para quem abrir a próxima sessão aqui

1. **Metade já existe** — busca, copy, CTA, dedup e score estão prontos em
   `/api/mineracao/run` + `ads_minerados`. Não reconstruir.
2. **Falta o que vem depois de escolher o alvo** — baixar, transcrever, frames, dossiê.
3. **Comece pela fase 0** (§9): storage dos criativos. Conserta um bug real de hoje.
4. **Decida o §6 antes de codar a transcrição.** É a única escolha difícil de engenharia.
5. **Página nova `/autopsia`**, com botão de entrada em `/mineracao`. Não em `/producao`.
6. **O destino é BYOK (§11).** Não construir agora — mas **todo acesso a dados passa por
   `getTenantClient()` desde a primeira linha** (§11.4). É o que separa uma tarde de um
   mês de retrabalho.
7. **`/configuracoes` é casca** (§11.3): inputs sem binding, sem rota de salvar, botão
   escrito ".env". E tem um **Meta App ID real hard-coded** para tirar.
8. **Leia os originais no low-ticket** antes de reimplementar (§3).

> **Origem deste documento:** escrito por Claude em 26/07/2026, a partir do trabalho real
> feito no workspace `low-ticket` (Fase 1 do produto *alimento-sagrado*) somado a uma
> leitura do código deste projeto — rotas, schema e libs. **Nada foi alterado neste
> repositório além da criação deste arquivo.**
