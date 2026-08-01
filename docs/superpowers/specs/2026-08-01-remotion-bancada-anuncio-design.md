# Design — Bancada de anúncio com Remotion (P3)

> Data: 01/08/2026 · Status: **aprovado, não implementado**
> Origem: `NOTA-REMOTION-BANCADA.md` (raiz) + as duas respostas do Fernando fechadas nesta
> data. Esta spec **substitui** a nota — a nota pode ser apagada depois que o plano nascer.
> Próximo passo: plano de execução (skill `writing-plans`).

---

## 1. O que é

Uma **bancada de montagem de anúncio** dentro da `/video-maker`: você seleciona um clipe
já gerado na WaveSpeed, escreve/ajusta gancho, roteiro e CTA, **ouve** a narração, vê o
anúncio montado num player e manda renderizar o MP4 final.

O que não é: não é uma tela nova, não é o Remotion Studio embutido, não é render na nuvem.

**A divisão que organiza tudo:** a WaveSpeed gera o **clipe cru** (caro, remoto, uma vez);
o Remotion faz as **variações** em cima dele (barato, local, quantas quiser). Variação
nunca é trabalho da WaveSpeed.

### 1.1. O fluxo em uma linha

```
[Gerar voz]   →  a ROTA chama a ElevenLabs  →  mp3 no Storage  →  você OUVE no Player
[Renderizar]  →  cria o job 'compor'        →  o WORKER só junta clipe + mp3 + texto
```

Quando você aperta "Renderizar", a narração já existe e já foi paga. O worker pode
reprocessar à vontade — render é grátis. E você nunca renderiza uma voz que não ouviu.

---

## 2. Decisões fechadas

| Decisão | Escolha | Por quê |
|---|---|---|
| O que embutir agora | **`@remotion/player`** | Studio é a rodada seguinte |
| Anatomia do template | **C — faixa branca estilo UGC** | escolha do Fernando |
| Áudio e legenda | **narração ElevenLabs + legenda dela** | §4 |
| Fonte do texto narrado | **campo novo `roteiros_video`** | §3 |
| Onde mora a composição | **`src/video/`; o `remotion/` importa dela** | §7 |
| Narração > clipe | **clipe entra em loop** | frame congelado lê como vídeo travado em feed; loop lê como b-roll |
| Formatos de saída | **só 1080×1920 nesta rodada** | 1:1 e 16:9 são a mesma composição com outro tamanho |
| Legenda | **timestamps da ElevenLabs**, não `faster-whisper` | apaga uma dependência (Python) inteira |
| Worker | **rodado à mão**, como o `worker-video.mjs` | mesma operação já conhecida |

### 2.1. O achado que decidiu a arquitetura

O `pegar_job()` do padrão da autópsia **incrementa `tentativas` e reprocessa job travado**.
Se o worker do Remotion chamasse a ElevenLabs, um job que trava no meio do render — Chrome
que morre, máquina que dorme — voltaria para a fila e **geraria a narração de novo**.

> É a mesma frase que decidiu o módulo da WaveSpeed:
> **retry automático e cobrança não podem morar no mesmo lugar.**

Daí a divisão do §1.1: **quem gasta é a rota, no seu clique; o worker só renderiza.**
Cota gratuita também acaba — mas o motivo mais forte dos dois botões nunca foi dinheiro:
é **ouvir antes de renderizar**.

---

## 3. O campo `roteiros_video` no agente de Copywriting

### 3.1. Por que existe

`meta_ads_copy` é escrito para ser **lido** — escaneável, com quebra de linha, emoji,
"clique no link abaixo". Roteiro é escrito para ser **ouvido**. Reaproveitar um como o
outro obriga a cortar texto à mão em todo vídeo.

O ganho maior é o **pareamento**: o roteiro sai junto do `prompts_videos`, roteiro N é a
narração do vídeo N. A bancada pré-preenche por índice, sem adivinhar separador.

### 3.2. O contrato passa de 4 para 5 campos

```json
{
  "meta_ads_copy": "...",
  "pagina_vendas": "...",
  "prompts_imagens": "...",
  "prompts_videos": "...",
  "roteiros_video": "..."
}
```

### 3.3. Formato: o mesmo `<<< >>>`

Cada roteiro entre `<<<` e `>>>`, com um título fora do bloco — idêntico a
`prompts_imagens` e `prompts_videos`. Isso deixa
[`separarPromptsDeVideo`](../../../src/app/video-maker/page.tsx#L27-L58) servir aos dois
campos **sem uma linha de código novo**, inclusive o fallback por heading e a regra de
nunca esconder o texto cru quando nada casa.

⚠️ Essa função **não é exportada** de propósito — em `page.tsx` o Next valida os exports
permitidos e um export extra vira `invalid export field` no build. A bancada mora no mesmo
arquivo, então a reutiliza direto. Não mover para um módulo compartilhado só por causa disso.

```
### ROTEIRO 1 — o gancho da dor
<<<
Você treina há meses e o joelho ainda dói toda vez que desce a escada.
Não é falta de esforço. É o tênis errado.
>>>
```

### 3.4. Regras de conteúdo

| Item | Regra |
|---|---|
| Quantidade | **3**, um por prompt em `prompts_videos`, na mesma ordem |
| Tamanho | dimensionado para a duração do vídeo par (5–10s → ~12 a 25 palavras em pt-BR) |
| Proibido | emoji, hashtag, "clique no link abaixo", "arrasta pra cima", instrução de câmera |
| Teste | se dá para copiar do `meta_ads_copy` sem mudar nada, está errado |

Dimensionar pelo clipe faz o caso normal **não precisar de loop nenhum**. O loop do §6.4
vira rede de segurança para quando *você* editar o texto na bancada — não o padrão.

### 3.5. O que muda, arquivo por arquivo

| Arquivo | Mudança |
|---|---|
| `agentes/copywriting/AGENTS.md` | 5ª chave no JSON de saída; linha na tabela "Cada campo vira o quê"; bullet de regra; passo no "Processo"; item no "Padrão de entrega" |
| `agentes/copywriting/SKILL.md` | seção `### No campo roteiros_video`, irmã da que já existe para `prompts_videos`; item no "Checklist de Finalização" |
| `supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql` | `alter table workflow_copywriting add column if not exists roteiros_video text;` |
| `src/app/api/copywriting/generate/route.ts` | instrução no `userPrompt` (junto do item 3 de vídeo); `roteiros = parsed.roteiros_video ?? ''`; `roteiros_video: roteiros \|\| null` no insert |
| `src/app/copywriting/page.tsx` | o campo aparece na aba de vídeos, abaixo dos prompts |
| `src/app/revisor/page.tsx` | idem, leitura pura, mesmo padrão dos prompts |
| `agentes_config` (dado, não código) | **subir o `max_tokens` do agente `copywriting`** |

⚠️ **`AGENTS.md` e `SKILL.md` mudam junto com a rota.** Foi a armadilha nº 1 dos 8 defeitos
de 31/07: mudar o contrato na rota e deixar o cérebro do agente descrevendo o contrato
velho. Os três têm que sair na mesma leva.

### 3.6. O risco real, e é o único

A rota já tem [o histórico documentado de resposta vazia](../../../src/app/api/copywriting/generate/route.ts#L226-L247):
o modelo do Zen é de raciocínio, `max_tokens` é o teto do **total**, e o raciocínio já comeu
o orçamento inteiro deixando `content` vazio com HTTP 200.

Um 5º campo aumenta a saída. Então:

- **Subir o `max_tokens` do `copywriting` em `agentes_config` é passo da mudança**, não
  ajuste depois.
- A primeira geração pós-mudança é **conferida de olho** antes de seguir: os 5 campos
  preenchidos, 3 roteiros, `finish_reason` diferente de `length`.

As duas guardas que já existem na rota (erro explícito em resposta vazia, erro explícito
em JSON cortado com `finish_reason === 'length'`) continuam cobrindo o resto.

### 3.7. Compatibilidade

Campanhas antigas não têm roteiro. A bancada usa `roteiros_video[N]` quando existe e cai
em `meta_ads_copy` quando não existe. **Nunca fica em branco** — a regra de nunca esconder
conteúdo por falha de parse já pegou bug antes neste projeto.

---

## 4. Narração — ElevenLabs

### 4.1. Por que ElevenLabs, e não outra coisa

Não existe TTS gratuito no projeto hoje. O `openai` (^6.44.0) está instalado e tem TTS,
mas é pago e **não devolve timestamps** — usá-lo ressuscitaria o `faster-whisper` que o
§6.3 acabou de apagar. O SAPI do Windows é grátis e offline, mas robótico demais para
anúncio e também sem timestamps.

O endpoint `with-timestamps` devolve o áudio **e** o tempo de cada caractere na mesma
chamada. É o único que entrega áudio + legenda sincronizada num request só.

### 4.2. Variáveis de ambiente

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=     # voz feminina pt-BR
ELEVENLABS_MODEL_ID=     # default eleven_multilingual_v2
```

Voz e modelo são variáveis pelo mesmo motivo: trocar vira edição de `.env.local`, não de
código. O `ELEVENLABS_VOICE_ID` é escolhido na implementação rodando `GET /v1/voices` na
conta real — **nenhum ID entra nesta spec de cabeça.**

### 4.3. O contrato da API tem que ser medido, não presumido

O formato esperado é `POST /v1/text-to-speech/{voice_id}/with-timestamps`, header
`xi-api-key`, resposta JSON com `audio_base64` e um objeto de `alignment` contendo os
caracteres e seus tempos de início/fim.

**Isso é expectativa, não fato medido.** A primeira tarefa do plano é uma chamada real
registrando o formato exato da resposta num `…-ACHADOS.md`, exatamente como a rodada da
WaveSpeed fez em 31/07. O resto do módulo só é escrito depois desse arquivo existir.

Pontos a confirmar nessa chamada: o nome exato dos campos de alignment, se o áudio vem em
base64 ou binário, o limite de caracteres por request, e o comportamento da cota gratuita
ao estourar.

### 4.4. O cache, sem tabela nova

```
narracao/<campanha_id>/<sha256(texto + voice_id + model_id)>.mp3
```

Mesmo texto, mesma voz e mesmo modelo = mesmo caminho. A rota confere se o arquivo existe
**antes** de chamar a ElevenLabs. Você ajusta a cor da faixa dez vezes e gasta a cota uma.
O caminho no Storage é a chave — não precisa de tabela.

⚠️ Os três entram no hash. Só o texto não basta: você trocaria a voz no `.env` e receberia
o mp3 antigo, sem entender por quê.

### 4.5. Da alignment para as legendas

O agrupamento de caracteres em linhas de legenda acontece **na rota**, uma vez, e o
resultado vai para `params_json.legendas`:

```ts
[{ texto: "Você treina há meses", inicio_s: 0.0, fim_s: 1.7 }, …]
```

Regra: agrupa caractere em palavra, palavra em linha, quebrando em pontuação forte ou ao
passar de ~28 caracteres. **Na rota e não no componente** porque o Player e o worker
precisam ler exatamente os mesmos dados — se cada um agrupasse por conta própria, a
bancada mentiria.

### 4.6. Licença

O plano gratuito da ElevenLabs pede atribuição e restringe uso comercial. Não trava o
desenvolvimento nem o teste. **Antes de o áudio subir num anúncio pago no Meta, conferir
os termos** — o Starter (~US$ 5/mês) remove a restrição. É decisão do Fernando, fora do
escopo técnico.

---

## 5. Dados

### 5.1. A tabela já estava pronta pela metade

[`video_jobs`](../../../supabase/migrations/20260731120200_create_video_jobs.sql) já nasceu
prevendo `tipo='compor'` com o ciclo de vida certo — nasce `pendente` e o worker pega,
porque *"começar é grátis"*, ao contrário do `gerar`. A fila não precisa ser reinventada.

### 5.2. Colunas novas

| Coluna | Para quê |
|---|---|
| `job_fonte_id uuid references video_jobs(id)` | qual job `gerar` é o clipe de fundo |
| `url_narracao text` | o mp3 no Storage, pago antes |
| `params_json jsonb` | gancho, CTA, cor da faixa, e as legendas com timing |
| `duracao_render_s int` | alimenta a estimativa de tempo na tela |

### 5.3. A trava vai no banco, igual à do `gerar`

```sql
alter table video_jobs
  add constraint compor_exige_narracao
    check (tipo <> 'compor' or url_narracao is not null);
```

Um job de composição não existe sem o mp3 já pronto. Mesma lógica do `gerar_exige_task_id`,
mesmo motivo.

**De brinde, fecha o minor nº 1 do ledger:** `tipo` é `text` solto hoje, então
`tipo='compour'` com typo passa livre pela trava de custo.

```sql
alter table video_jobs
  add constraint video_jobs_tipo_valido
    check (tipo in ('gerar','compor'));
```

⚠️ Ambas as constraints são `alter table … add constraint` numa tabela que já tem linhas.
Se alguma linha existente violar, o `alter` falha — a migration confere antes.

---

## 6. A composição `AnuncioUGC`

Arquivo único em `src/video/AnuncioUGC.tsx`, com schema `zod`. **A mesma coisa que o Player
toca e o worker renderiza** — se as duas metades divergirem, a bancada mente: você aprova
vendo uma coisa e recebe outra.

### 6.1. A matemática do template C fecha redonda

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

1080×1920, 30fps. A duração da composição é a **duração da narração**, arredondada para
cima em frames.

### 6.2. Props

```ts
{ urlClipe, gancho, cta, urlNarracao, legendas[], corFaixa }
```

Uma composição parametrizada, não uma por variação — **a variação é dado, não código**.

### 6.3. A legenda sai da ElevenLabs, não do Whisper

Sincronia exata, sem custo extra, **sem `faster-whisper`, sem Python, sem transcrever um
áudio que nós mesmos escrevemos**. Isso apaga uma dependência inteira que o plano de 29/07
(`PLANO-REMOTION-VARIACOES.md` §4) previa.

### 6.4. Quem manda na duração é a narração

O caso real vai acontecer: você paga 7s de Sora e escreve um roteiro de 9s.

- Cortar a narração no meio da frase estraga o anúncio.
- Esticar o último frame congela a tela — **lê como vídeo travado** em feed.
- **Loop** lê como b-roll. É o menos pior, e é o escolhido.

A bancada avisa em texto: *"narração 2,1s mais longa que o clipe"*. Você vê o loop
acontecendo no Player e decide encurtar. Se a sobra passar de ~2s, nenhuma opção salva —
o problema é o texto, e é isso que a tela te mostra.

Com o `roteiros_video` do §3 dimensionado pelo clipe, esse caso deixa de ser o normal.

### 6.5. A fonte é declarada uma vez, no arquivo da composição

Parece detalhe e é **a forma mais provável de a bancada mentir**: fonte diferente quebra a
linha em outro lugar, e o gancho que cabia em duas linhas na tela sai em três no MP4.

A regra é: a fonte é declarada **uma vez, no arquivo da composição**, e nunca herdada do
CSS do app. Nesta rodada ela é uma fonte de sistema, e isso é seguro porque o Player e o
render rodam na mesma máquina, no mesmo Chrome.

⚠️ No dia em que o render sair para a nuvem (Remotion Lambda), isso deixa de valer — a
máquina de lá não tem as fontes desta. Aí a fonte tem que virar embutida.

### 6.6. O áudio do clipe é mudo

`<Video muted />`. O clipe da Sora pode vir com áudio; se tocar junto da narração, o
anúncio sai com duas vozes.

---

## 7. Por que a composição mora no app Next

O Player precisa do código da composição **dentro do bundle do Next**. O worker precisa do
**mesmo** código para renderizar. Três formas foram avaliadas:

| | Abordagem | Veredito |
|---|---|---|
| **A** | Composição em `src/video/`; o `remotion/` importa dela | ✅ **escolhida** |
| B | Composição em `remotion/src/`; o Next importa via alias | quebra a regra do `CLAUDE.md` de frente |
| C | Pasta neutra `video-shared/` na raiz | exigiria uma segunda exceção de monorepo |

**Por que A:** a seta inverte. A regra do `CLAUDE.md` — *"`remotion/` nunca é importado
pelo app Next"* — continua **literalmente verdadeira**, e o `@remotion/renderer` com seus
48 MB de binário nativo e o Chrome headless ficam onde sempre estiveram. A raiz ganha só
JS puro. E respeita a outra regra: código do app mora em `src/`.

**Por que B é perigosa:** assim que alguém importar de `remotion/src/` um arquivo que por
acaso puxe `@remotion/renderer`, o binário nativo entra no bundle do Next e o build quebra
de um jeito difícil de ler. A regra existe porque esse erro é fácil de cometer.

### 7.1. Dependências

| Onde | Adicionar | Observação |
|---|---|---|
| raiz | `remotion`, `@remotion/player`, `zod` | JS puro. **Mesma versão do `remotion/`: 4.0.409** |
| `remotion/` | `@remotion/bundler`, `@remotion/renderer` | hoje só existem como dependência transitiva do `@remotion/cli`; o worker os importa direto, então viram explícitas |

### 7.2. O preço da escolha A

O `remotion/` roda React 19 e o app roda React 18, então o componente é compilado por duas
versões diferentes. Funciona (código de 18 roda em 19), mas é restrição real:

- **nada de API específica de versão** dentro de `src/video/`
- o `tsconfig.json` do `remotion/` passa a incluir `../src/video/`

### 7.3. Limpeza do scaffold

`remotion/src/` hoje tem só o `HelloWorld/` renomeado para `Anuncio-Sapatenis`. Ele sai
junto — inclusive o erro de tipo já presente em `remotion/src/Root.tsx:16-20`, que passa
`titleColor` e `priceText` em `defaultProps` fora do schema. O `Root.tsx` passa a registrar
a `AnuncioUGC` importada de `../../src/video/`. O `package.json` do `remotion/` deixa de se
chamar `my-video`.

---

## 8. A bancada

Não é tela nova. A `/video-maker` reconstruída em 31/07 já tem a coluna 3 como player —
**ela vira a bancada** quando você seleciona um vídeo pronto.

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

### 8.1. Pré-preenchimento

- **Roteiro:** `roteiros_video[N]` do §3, pareado por índice com o prompt do vídeo. Sem
  roteiro (campanha antiga), cai em `meta_ads_copy` cru.
- **Gancho e CTA:** vazios, digitados por você. Não há campo no banco para eles hoje e
  inventar um parser que adivinhe qual linha do anúncio é o gancho é exatamente o tipo de
  chute que a §5.1 da nota original queria evitar.
- A query da coluna 1 já lê `workflow_copywriting`; ganha `roteiros_video` no `select`.

### 8.2. Os campos são editáveis, sempre

A duração estimada aparece do lado do contador de caracteres, e é ela que te diz quanto
cortar.

### 8.3. "Renderizar" nasce desabilitado

Só acende quando existe narração. Isso torna a trava do banco (§5.3) **visível na tela**,
em vez de virar um 400 depois do clique.

### 8.4. Rotas novas

| Rota | O que faz | Custa? |
|---|---|---|
| `POST /api/video/narracao` | confere o cache, chama a ElevenLabs, sobe o mp3, devolve `{ url_narracao, legendas, duracao_s }` | **sim** (cota) |
| `POST /api/video/compor` | insere o job `compor` com `url_narracao` e `params_json` | não |

A rota de narração **não cria job nenhum**. Se a ElevenLabs falhar ou a cota estourar, ela
devolve erro e pronto — sem narração não há o que renderizar.

---

## 9. O worker

`remotion/worker.mjs`, rodado à mão como o `worker-video.mjs`:

```
npm run video:compor   →   node --env-file=.env.local remotion/worker.mjs
```

Roda da raiz: o `--env-file` resolve o `.env.local` da raiz, e o Node resolve
`@remotion/renderer` a partir de `remotion/node_modules` porque é onde o arquivo mora.

Copia o padrão do `worker-video.mjs`, **incluindo as correções que custaram caro**:

- `bundle()` **uma vez por processo** (leva ~5s; não repetir por job)
- checagem de dependências na largada, com banner mostrando o `process.execPath`
- o `while` envolto em `try/catch` **externo** — o defeito nº 5 do módulo passado foi
  exatamente isso: exceção fora do try por-job matando o processo em silêncio
- `process.on('unhandledRejection')` logando sem derrubar

**Uma diferença que vale registrar:** aqui o retry é **livre**. No `gerar` a trava existia
porque reprocessar significava cobrar; no `compor` a narração já foi paga e está no
Storage, então o worker pode tentar de novo à vontade. Teto de tentativas só para não girar
eternamente em job impossível.

Ao concluir: grava `url_saida` (caminho no Storage), `duracao_render_s` e `concluido_em`.

---

## 10. O que vai dar errado

| Modo de falha | Como o desenho responde |
|---|---|
| Primeiro render baixa Chrome headless (~150–300 MB) | banner do worker avisa; acontece uma vez |
| Render leva ~12× o tempo do vídeo (**medido: 59,6s para 5s**) | estimativa na tela a partir do `duracao_render_s` dos jobs anteriores |
| Worker parado e ninguém percebe | alerta medindo tempo desde a **última conclusão**, não idade da fila — lógica já corrigida na `/autopsia/[id]` |
| ElevenLabs falha ou estoura a cota | a rota devolve erro e **não cria o job** |
| Player não carrega o clipe | vem do bucket público do Storage, mesmo caminho do player de hoje |
| Narração mais longa que o clipe | loop + aviso em texto (§6.4) |
| Copy sai vazia após o 5º campo | os dois erros explícitos já na rota (§3.6) + `max_tokens` subido + conferência da primeira geração |
| Fonte diferente entre Player e render | fonte declarada na composição (§6.5) |

---

## 11. Fora de escopo

- **Remotion Studio embutido** — rodada seguinte. ⚠️ Ressalva já no `NOTES.md`: é servidor
  de **desenvolvimento**, sobe na porta 3000 (a mesma do `next dev`), só existe enquanto o
  processo roda, e é local. É conveniência de desenvolvimento, não funcionalidade de produto.
- Formatos 1:1 e 16:9
- Render na nuvem (Remotion Lambda)
- Campos de gancho e CTA no contrato do Copywriting (§8.1)
- Auth / RLS de verdade — segue a convenção de policy pública do projeto

---

## 12. Ordem de implementação

A ordem importa: nada de código de render antes do formato da ElevenLabs estar medido.

1. **Medir a ElevenLabs.** Chamada real, `GET /v1/voices` + um `with-timestamps`; registrar
   em `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md`. Escolher o
   `ELEVENLABS_VOICE_ID`.
2. **`roteiros_video`** — migration, `AGENTS.md`, `SKILL.md`, rota, `max_tokens`, e uma
   geração real conferida de olho.
3. **Migrations do `video_jobs`** — colunas novas + as duas constraints.
4. **`src/video/AnuncioUGC.tsx`** + deps na raiz; limpeza do scaffold do `remotion/`.
5. **`POST /api/video/narracao`** — cache, chamada, upload, agrupamento das legendas.
6. **A bancada** na coluna 3 da `/video-maker` + `POST /api/video/compor`.
7. **`remotion/worker.mjs`** + script `video:compor`.
8. **Ponta a ponta:** clipe existente → voz → player → render → MP4 no Storage.

---

## 13. Critérios de aceitação

- [ ] Uma geração de copy real devolve os **5** campos preenchidos, com 3 roteiros
      separados pelo `separarPromptsDeVideo` sem cair no fallback de texto cru.
- [ ] Clicar "Gerar voz" duas vezes com o mesmo texto chama a ElevenLabs **uma** vez
      (segunda vez sai do cache do Storage).
- [ ] O Player toca o anúncio montado — clipe mudo, narração, legenda sincronizada,
      gancho e CTA nas faixas.
- [ ] "Renderizar" fica desabilitado até existir narração.
- [ ] Um `insert` de `tipo='compor'` sem `url_narracao` é **rejeitado pelo banco**.
- [ ] O worker produz um MP4 1080×1920 no Storage, e **o MP4 é visualmente igual ao que o
      Player mostrou** — mesma quebra de linha do gancho, mesma legenda no mesmo tempo.
- [ ] `npx tsc --noEmit` passa na raiz; `npm run lint` passa no `remotion/`.
- [ ] O bundle do Next **não** contém `@remotion/renderer`.

⚠️ **`npm run build` não entra como critério.** Ele falha sempre nesta máquina, por um
defeito de ambiente pré-existente e já diagnosticado no `NOTES.md` (`output: "standalone"`
+ pnpm + Windows sem Modo de Desenvolvedor). A compilação termina; o que quebra é a cópia
para `.next/standalone`. Pior: como ele morre no fim, deixa a `.next` pela metade e derruba
o CSS do `npm run dev`. Enquanto o ambiente não for corrigido — as três saídas estão no
`NOTES.md` —, o portão é o `tsc`.

---

## 14. Registro

⚠️ **Nada commitado** — regra nº 1 do `CLAUDE.md`. Este arquivo fica pronto para o Fernando
revisar e decidir quando entra no histórico.

Ao validar a implementação, o processo obrigatório do `CLAUDE.md` vale: atualizar o
`NOTES.md` e a nota `02_Projetos/Alavanca_Synapse.md` no Nexus.AI.
