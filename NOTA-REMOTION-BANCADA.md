# Nota — Bancada de anúncio com Remotion no dashboard

> Escrita em 01/08/2026, no fim da conversa de brainstorming. **Nada foi implementado.**
> É o desenho fechado, esperando sua leitura.
>
> 📍 Arquivo na raiz de propósito, a seu pedido — para você ler com calma e responder.
> Quando aprovar, vira spec em `docs/superpowers/specs/` e depois plano de execução.
>
> **Não há pergunta bloqueando.** O desenho está completo e implementável do jeito que
> está. A seção final lista o que você pode mudar se quiser — mas se você só responder
> "pode tocar", eu toco.

---

## 0. O que você já decidiu nesta conversa

| Pergunta | Sua resposta |
|---|---|
| O que embutir no dashboard | **Os dois — Player primeiro, Remotion Studio depois** |
| Para que serve o Player | **Montar anúncio a partir da copy** (não só visualizar) |
| Escopo desta rodada | **Bancada + render de verdade** (o P3 inteiro) |
| Anatomia do template | **C — faixa branca estilo UGC** |
| Áudio e legenda | **Narração ElevenLabs + legenda dela** |
| Fonte do texto narrado | **Reaproveitar o texto do anúncio** (`meta_ads_copy`) |
| Onde mora a composição | **A — no app Next; o `remotion/` importa dela** |

E você informou que **a ElevenLabs tem plano gratuito robusto** para este uso. Isso muda a
natureza da torneira (cota, não fatura), mas não muda o desenho — ver §1.
Resposta: Se tivermos outra opção gratuita que já esteja instalado no projeto legal, mas se não usaremos o elevenlabs sempre com voz feminina português br , acho que o elevenlabs seria legal , mas podemos testar , aceito sua opinião

## 0.1. O que eu decidi por você (você disse "faça seu melhor")

| Decisão | O que escolhi | Por quê |
|---|---|---|
| Narração mais longa que o clipe | **clipe entra em loop** | frame congelado lê como vídeo travado em feed; loop lê como b-roll |
| Voz da ElevenLabs | `ELEVENLABS_VOICE_ID` no `.env.local` | trocar vira edição de variável, não de código |
| Formatos de saída | **só 1080×1920 nesta rodada** | 1:1 e 16:9 são a mesma composição com outro tamanho |
| Legenda | **timestamps da ElevenLabs**, não `faster-whisper` | ver §2 — apaga uma dependência inteira |
| Worker | **rodado à mão**, como o da autópsia | mesma operação que você já conhece |

---

## 1. Achados que mudaram o desenho

### 1.1. A pasta `remotion/` ainda é o scaffold

`remotion/src/` tem só `HelloWorld/` (Arc, Atom, Logo, Subtitle, Title) e o `Root.tsx`
registra **uma** composição: `Anuncio-Sapatenis`, que é o HelloWorld renomeado — a logo do
Remotion girando com título e preço. O `package.json` ainda se chama `my-video`.

**Consequência:** não existe nada do projeto para "visualizar" hoje. A composição real é
construída nesta rodada.

E o `Root.tsx` tem um erro de tipo já presente (`remotion/src/Root.tsx:16-20`): passa
`titleColor` e `priceText` em `defaultProps` que não existem no schema. Some junto com o
scaffold.

### 1.2. Nada no banco hoje é roteiro falado

O contrato JSON do Copywriting tem quatro campos
(`src/app/api/copywriting/generate/route.ts:203`):

```
{ "meta_ads_copy": "...", "pagina_vendas": "...", "prompts_imagens": "...", "prompts_videos": "..." }
```

E `prompts_videos` é instrução de **câmera e movimento** para a Sora — *"descreva
MOVIMENTO: câmera, ação, ritmo"* — não texto para alguém ler em voz alta.

Você decidiu reaproveitar o texto do anúncio (`meta_ads_copy`). Ver §3 para como, e para
a ressalva de tamanho.
Resposta: Essa parte ainda estou confuso , talvez possamos ter tambem na parte de copy a parte de texto para ser usando , o que acha 

### 1.3. 🚨 A ElevenLabs cai na MESMA armadilha que a WaveSpeed

Este é o achado mais importante da conversa.

O `pegar_job()` do padrão da autópsia **incrementa `tentativas` e reprocessa job travado**.
Se o worker do Remotion for quem chama a ElevenLabs, um job que trava no meio do render —
Chrome que morre, máquina que dorme — volta para a fila e **gera a narração de novo**.

> É a mesma frase que decidiu o módulo da WaveSpeed:
> **retry automático e cobrança não podem morar no mesmo lugar.**

A saída é a mesma, e cai bem porque a bancada já quer isso: **quem paga é a rota, no seu
clique; o worker só renderiza.**

```
[Gerar voz]   →  rota chama ElevenLabs  →  mp3 no Storage  →  você OUVE no Player
[Renderizar]  →  cria o job 'compor'    →  worker só junta clipe + mp3 + texto
```

Quando você aperta "Renderizar", a narração já existe e já foi paga. O worker pode
reprocessar à vontade — render é grátis. E você nunca renderiza uma voz que não ouviu.

**Sobre o plano gratuito:** cota também acaba, então o cache de §2.3 continua valendo. Mas
o motivo mais forte dos dois botões nunca foi dinheiro — é **ouvir antes de renderizar**.

⚠️ **Ressalva factual para conferir antes de subir anúncio pago:** o plano gratuito da
ElevenLabs pede atribuição e restringe uso comercial. Não trava nada agora; vale ler os
termos antes de o áudio ir para o Meta.

---

## 2. Dados

### 2.1. A tabela já estava pronta pela metade

`video_jobs` já nasceu prevendo `tipo='compor'` com o ciclo de vida certo — nasce
`pendente` e o worker pega, porque *"começar é grátis"*, ao contrário do `gerar`. A fila
não precisa ser reinventada.

**Colunas novas:**

| Coluna | Para quê |
|---|---|
| `job_fonte_id uuid` | qual job `gerar` é o clipe de fundo (referência à própria tabela) |
| `url_narracao text` | o mp3 no Storage, pago antes |
| `params_json jsonb` | gancho, CTA, cor da faixa, e as legendas com timing |
| `duracao_render_s int` | alimenta a estimativa de tempo na tela |

### 2.2. A trava vai no banco, igual à do `gerar`

```sql
alter table video_jobs
  add constraint compor_exige_narracao
    check (tipo <> 'compor' or url_narracao is not null);
```

Um job de composição não existe sem o mp3 já pronto. Mesma lógica do
`gerar_exige_task_id`, mesmo motivo.

**De brinde, fecha o minor nº1 do ledger:** `tipo` é `text` solto hoje, então
`tipo='compour'` com typo passa livre pela trava de custo. Vira:

```sql
check (tipo in ('gerar','compor'))
```

### 2.3. O cache da narração, sem tabela nova

O mp3 vai para `narracao/<campanha_id>/<hash do texto+voz>.mp3`.

Mesmo texto e mesma voz = mesmo caminho, então a rota confere se o arquivo existe **antes**
de chamar a ElevenLabs. Você ajusta a cor da faixa dez vezes e gasta a cota uma. O caminho
no Storage é a chave — não precisa de tabela.

---

## 3. A composição `AnuncioUGC`

Arquivo único em `src/video/AnuncioUGC.tsx`, com schema `zod`. **A mesma coisa que o Player
toca e o worker renderiza** — se as duas metades divergirem, a bancada mente: você aprova
vendo uma coisa e recebe outra.

### 3.1. A matemática do template C fecha redonda

Em 1080×1920, um clipe 1:1 ocupa 1080px de altura = **56,25% exatos**. Sobram 43,75%
(840px) para dividir entre a faixa branca e o CTA. Nenhum corte, nenhum letterbox.

```
┌─────────────┐  0    → 422px    faixa branca, gancho em preto
│   gancho    │
├─────────────┤  422  → 1502px   clipe 1:1, áudio MUDO
│    clipe    │                  legenda queimada na base
│    (1:1)    │
├─────────────┤  1502 → 1920px   CTA laranja
│     CTA     │
└─────────────┘
```

### 3.2. Props

```ts
{ urlClipe, gancho, cta, urlNarracao, legendas[], corFaixa }
```

Uma composição parametrizada, não uma por variação — **a variação é dado, não código**.

### 3.3. A legenda sai da ElevenLabs, não do Whisper

O endpoint `with-timestamps` devolve o áudio **e** o tempo de cada caractere na mesma
chamada. Sincronia exata, sem custo extra, **sem `faster-whisper`, sem Python, sem
transcrever um áudio que nós mesmos escrevemos**.

Isso apaga uma dependência inteira que o plano de 29/07
(`PLANO-REMOTION-VARIACOES.md` §4) previa.

### 3.4. Quem manda na duração é a narração

O caso real vai acontecer: você paga 7s de Sora e escreve um roteiro de 9s.

- Cortar a narração no meio da frase estraga o anúncio.
- Esticar o último frame congela a tela — **lê como vídeo travado** em feed.
- **Loop** lê como b-roll. É o menos pior, e é o escolhido.

A bancada avisa em texto: *"narração 2,1s mais longa que o clipe"*. Você vê o loop
acontecendo no Player e decide encurtar. Se a sobra passar de ~2s, nenhuma opção salva —
o problema é o texto, e é isso que a tela te mostra.

### 3.5. A fonte é declarada uma vez, no arquivo da composição

Parece detalhe e é **a forma mais provável de a bancada mentir**: fonte diferente quebra a
linha em outro lugar, e o gancho que cabia em duas linhas na tela sai em três no MP4.

---

## 4. Por que a composição mora no app Next (e não em `remotion/`)

O Player precisa do código da composição **dentro do bundle do Next**. O worker precisa do
**mesmo** código para renderizar. Foram avaliadas três formas:

| | Abordagem | Veredito |
|---|---|---|
| **A** | Composição em `src/video/`; o `remotion/` importa dela | ✅ **escolhida** |
| B | Composição em `remotion/src/`; o Next importa via alias | quebra a regra do `CLAUDE.md` de frente |
| C | Pasta neutra `video-shared/` na raiz | exigiria uma segunda exceção de monorepo |

**Por que A:** a seta inverte. A regra do `CLAUDE.md` — *"`remotion/` nunca é importado
pelo app Next"* — continua **literalmente verdadeira**, e o `@remotion/renderer` com seus
48 MB de binário nativo e o Chrome headless ficam onde sempre estiveram. A raiz ganha só
`remotion` + `@remotion/player`, que são JS puro. E respeita a outra regra: código do app
mora em `src/`.

**Por que B é perigosa:** não quebra a regra de um jeito inofensivo. Assim que alguém
importar de `remotion/src/` um arquivo que por acaso puxe `@remotion/renderer`, o binário
nativo entra no bundle do Next e o build quebra de um jeito difícil de ler. A regra existe
porque esse erro é fácil de cometer.

**O preço da A:** o `remotion/` roda React 19 e o app roda React 18, então o componente é
compilado por duas versões diferentes. Funciona (código de 18 roda em 19), mas é restrição
real — **nada de API específica de versão dentro da composição**, e o `tsconfig` do
`remotion/` passa a typecheckar arquivo de fora.

---

## 5. A bancada

Não é tela nova. A `/video-maker` que foi reconstruída em 31/07 já tem a coluna 3 como
player — **ela vira a bancada** quando você seleciona um vídeo pronto.

```
┌─ ofertas ─┬─ prompts ──┬─ BANCADA ─────────────┐
│ Método do │ VÍDEO 1 ✓  │  ┌───────┐            │
│ Corredor  │ VÍDEO 2 ✓  │  │Player │  Gancho    │
│           │ VÍDEO 3    │  │ 9:16  │  Roteiro   │
│ Saga      │            │  └───────┘  CTA       │
│           │            │  ▶ 0:03/0:09  Cor     │
│           │            │  [Gerar voz] 214 car. │
│           │            │  [Renderizar]         │
└───────────┴────────────┴───────────────────────┘
```

### 5.1. O pré-preenchimento e o separador

`meta_ads_copy` guarda os 5 anúncios num campo de texto só, então precisa de um separador.
**Já existe o padrão certo no projeto:** o `separarPromptsDeVideo()` tenta blocos, depois
headings, e **se nada casar mostra o texto cru**.

Mesmo desenho aqui. Nunca esconder conteúdo por não ter conseguido parsear é regra que já
pegou bug antes.

### 5.2. Os campos são editáveis, sempre

Texto de anúncio é escrito para **ler**, não para **ouvir** — o corte vai ser necessário
quase sempre. A duração estimada aparece do lado do contador de caracteres, e é ela que te
diz quanto cortar.

### 5.3. "Renderizar" nasce desabilitado

Só acende quando existe narração. Isso torna a trava do banco (§2.2) **visível na tela**,
em vez de virar um 400 depois do clique.

---

## 6. O worker

`remotion/worker.mjs`, rodado à mão como o da autópsia — `npm run video:compor` na raiz.

Copia o padrão que já existe, **incluindo as correções que custaram caro**:

- `bundle()` **uma vez por processo** (leva ~5s; não repetir por job)
- checagem de dependências na largada, com banner mostrando o `process.execPath`
- o `while` envolto em `try/catch` **externo** — o defeito nº5 do módulo passado foi
  exatamente isso: exceção fora do try por-job matando o processo em silêncio, deixando
  vídeo já pago sem ninguém consultando

**Uma diferença que vale registrar:** aqui o retry é **livre**. No `gerar` a trava existia
porque reprocessar significava cobrar; no `compor` a narração já foi paga e está no
Storage, então o worker pode tentar de novo à vontade. Teto de tentativas só para não
girar eternamente em job impossível.

---

## 7. O que vai dar errado

| Modo de falha | Como o desenho responde |
|---|---|
| Primeiro render baixa Chrome headless (~150–300 MB) | banner do worker avisa; acontece uma vez |
| Render leva ~12× o tempo do vídeo (**medido: 59,6s para 5s**) | estimativa na tela a partir do `duracao_render_s` dos jobs anteriores |
| Worker parado e ninguém percebe | alerta medindo tempo desde a **última conclusão**, não idade da fila — lógica já corrigida na `/autopsia/[id]` |
| ElevenLabs falha ou estoura a cota | a rota devolve erro e **não cria o job**; sem narração não há o que renderizar |
| Player não carrega o clipe | vem do bucket público do Storage, mesmo caminho que o player de hoje já usa |
| Narração mais longa que o clipe | loop + aviso em texto (§3.4) |

---

## 8. Fora de escopo desta rodada

- **Remotion Studio embutido** — você pediu "os dois, começando pelo Player". O Studio é a
  rodada seguinte. ⚠️ Lembrar da ressalva já registrada no `NOTES.md`: é servidor de
  **desenvolvimento**, sobe na porta 3000 (a mesma do `next dev`), só existe enquanto o
  processo roda, e é local. É conveniência de desenvolvimento, não funcionalidade de
  produto.
- Formatos 1:1 e 16:9
- Render na nuvem (Remotion Lambda)
- Campo `roteiros_video` no agente de Copywriting — foi descartado nesta rodada por
  reaproveitar `meta_ads_copy`. Se o corte manual virar trabalho chato demais, este é o
  próximo passo natural. ⚠️ Se for fazer: **o `AGENTS.md` do agente muda junto** — foi a
  armadilha nº1 dos 8 defeitos de 31/07.

---

## 9. Se você quiser mudar alguma coisa

Nenhum destes bloqueia. São os pontos onde eu escolhi por você e onde outra escolha é
defensável:

1. **Loop × congelar** o clipe quando a narração é mais longa (§3.4).
2. **Voz da ElevenLabs** — qual `voice_id`? Hoje vira variável de ambiente com um padrão
   pt-BR.
3. **Só 1080×1920** nesta rodada, ou já quer 1:1 e 16:9 junto?
4. **Cor da faixa** — hoje é campo editável na bancada. Poderia sair do `marca.md` do
   produto, como a LP faz.
5. **A coluna 3 vira a bancada**, ou você prefere tela separada (`/video-maker/montar`)?

**Se você só responder "pode tocar", eu sigo com tudo acima como está.**

---

## 10. Próximo passo do processo

1. Você lê esta nota e responde
2. Vira spec em `docs/superpowers/specs/2026-08-01-remotion-bancada-anuncio-design.md`
3. Vira plano de execução (skill `writing-plans`)
4. Execução

⚠️ **Nada commitado** — conforme a regra nº1 do `CLAUDE.md`.


Acho que está tudo ok,  vamos implementar ok 