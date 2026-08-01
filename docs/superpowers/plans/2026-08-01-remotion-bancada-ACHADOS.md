# Achados — ElevenLabs (medido em 01/08/2026)

> Task 1 do plano `2026-08-01-remotion-bancada-anuncio.md`. **RESULTADO: OK, com uma
> decisão de voz que precisa de confirmação humana e um achado de plano/permissão
> que afeta qual voz pode ser usada em produção.**
>
> Substitui a versão anterior deste arquivo, que registrava apenas `401
> missing_permissions` — a chave foi corrigida e a sonda rodou de ponta a ponta
> três vezes contra a API real.

## O que foi medido

Sonda descartável (`scripts/sonda-elevenlabs.mjs`, já apagada — ver Step 7),
rodada com `node --env-file=.env.local`, chave lida de
`process.env.ELEVENLABS_API_KEY` (confirmado sem sombra do Windows:
`node -e "console.log(process.env.ELEVENLABS_API_KEY ? 'set' : 'unset')"`
sem `--env-file` voltou `unset`; com `--env-file=.env.local` voltou `set`).

Três chamadas reais foram feitas:
1. `GET /v1/voices` — 1x, para listar as vozes da conta.
2. `POST /v1/text-to-speech/{voice_id}/with-timestamps` com a voz `CwhRBWXzGAHq8TQ4Fs17`
   (Roger, premade) — para medir o shape da resposta.
3. `POST /v1/text-to-speech/{voice_id}/with-timestamps` com a voz `33B4UnXyTNbgLmdEDh5P`
   (Keren, "Young Brazilian Female") — tentando usar a única voz pt-BR feminina da
   conta. **Devolveu HTTP 402**, não 200 (ver seção dedicada abaixo).
4. `POST /v1/text-to-speech/{voice_id}/with-timestamps` com a voz `EXAVITQu4vr4xnSDxMaL`
   (Sarah, premade) — voz de fallback, que funcionou (HTTP 200) e foi a escolhida.

Todas usaram o texto fixo do brief: `"Você treina há meses e o joelho ainda dói.
Não é falta de esforço."` (66 caracteres).

## Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
Header: xi-api-key: <chave>
Body: { "text": "...", "model_id": "eleven_multilingual_v2" }
```

Confirmado: existe, responde `200`, `content-type: application/json`. Não é `404`
nem `401` com a chave corrigida — o endpoint é real e funciona como documentado
publicamente.

## Resposta (chaves reais, medidas)

Chaves de primeiro nível da resposta 200: `audio_base64`, `alignment`,
`normalized_alignment`. Não há nenhum outro campo (sem `request_id`, sem
`metadata`, sem `duration` explícito no corpo — a duração se deriva do último
timestamp do alignment).

```json
{
  "audio_base64": "<string base64, ID3/MP3>",
  "alignment": {
    "characters": ["V", "o", "c", "ê", " ", ...],
    "character_start_times_seconds": [0, 0.104, 0.186, 0.244, 0.279, ...],
    "character_end_times_seconds": [0.104, 0.186, 0.244, 0.279, 0.348, ...]
  },
  "normalized_alignment": {
    "characters": [" ", "V", "o", "c", "ê", " ", ...],
    "character_start_times_seconds": [0, 0.058, 0.104, 0.186, 0.244, ...],
    "character_end_times_seconds": [0.058, 0.104, 0.186, 0.244, 0.279, ...]
  }
}
```

## Nome exato dos campos de alignment

- caracteres: `alignment.characters` (array de strings de 1 caractere cada)
- início por caractere: `alignment.character_start_times_seconds` (array de number, segundos, float)
- fim por caractere: `alignment.character_end_times_seconds` (array de number, segundos, float)
- Estrutura idêntica em `normalized_alignment` (mesmos 3 nomes de subchave).

### `alignment` vs `normalized_alignment` — medido, não suposto

Com o texto de teste de **66 caracteres**:
- `alignment.characters` tem **66** entradas — bate exatamente, 1:1, com o texto
  de entrada, caractere por caractere, na mesma ordem.
- `normalized_alignment.characters` tem **68** entradas — 2 a mais. A diferença
  observada: um espaço extra no início e um espaço extra no fim
  (`[" ", "V", "o", ...]` / `[..., "o", ".", " "]`), provavelmente reflexo do
  texto "normalizado" internamente pelo modelo (tokens de silêncio/padding), não
  do texto que o chamador enviou.

**Usar `alignment`, não `normalized_alignment`, para sincronizar legenda.** A
legenda precisa mapear janelas de tempo de volta para o texto original que o
Remotion vai desenhar — só `alignment` tem correspondência garantida 1:1 com a
string que foi enviada no `text` do request. Usar `normalized_alignment` exigiria
descobrir e descartar o padding antes de reindexar, sem ganho conhecido.

## Áudio

- Formato: base64, campo `audio_base64` (string).
- Decodificado começa com `49 44 33` (`"ID3"`) — é um MP3 real com tag ID3v2, não
  lixo nem outro formato disfarçado.
- Tamanhos observados para o mesmo texto de 66 caracteres, vozes diferentes:
  - Roger (premade, en): 59.812 bytes, base64 de 79.752 chars.
  - Sarah (premade, en): 67.753–73.186 bytes entre duas chamadas idênticas
    (variação de ~8% entre gerações do mesmo texto/voz — não é determinístico
    byte a byte).
- Duração real (do último `character_end_times_seconds` do alignment): **4,18s**
  para o texto de 66 caracteres com a voz Sarah — ~15,8 caracteres/segundo de
  fala. Plausível para narração em ritmo normal.
- Taxa de bits aproximada: 67.753 bytes / 4,18s ≈ 16,2 KB/s ≈ ~130 kbps — condiz
  com o padrão de saída da ElevenLabs (mp3 44100Hz ~128kbps).

## 🚨 Achado que muda a escolha de voz: vozes "pt-BR" da conta são bloqueadas por plano

A conta tem 23 vozes (`GET /v1/voices`). Só 2 têm label de português/Brasil:

| voice_id | nome | labels | category |
|---|---|---|---|
| `tS45q0QcrDHqHoaWdCDR` | Lax | `language:pt, accent:brazilian, gender:male` | `professional` |
| `33B4UnXyTNbgLmdEDh5P` | Keren - Young Brazilian Female | `language:pt, accent:brazilian, gender:female` | `professional` |

As outras 21 vozes são todas `category: premade`, todas `language:en` (accent
american/british/australian) — **nenhuma delas tem label pt-BR**.

Ao chamar `with-timestamps` com `33B4UnXyTNbgLmdEDh5P` (Keren, a única pt-BR
feminina), a resposta foi:

```
HTTP 402
{
  "detail": {
    "type": "payment_required",
    "code": "paid_plan_required",
    "status": "payment_required",
    "message": "Free users cannot use library voices via the API. Please upgrade your subscription to use this voice."
  }
}
```

**Interpretação medida:** vozes de categoria `professional` (biblioteca/"Voice
Library", diferente das `premade` do sistema) não podem ser chamadas pela API no
plano gratuito — é uma trava de plano, não de permissão de chave (esta é
diferente do 401 `missing_permissions` do incidente anterior). Isso vale tanto
para `Lax` (masculina) quanto para `Keren` (feminina) — ambas são `professional`.

**Consequência prática: hoje não existe, nesta conta, nenhuma voz com label
pt-BR utilizável via API.** As únicas vozes chamáveis são as 21 `premade`
en-only.

## Voz escolhida

**`ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL`** — "Sarah - Mature, Reassuring,
Confident" (`premade`, `gender:female`, `language:en`, `accent:american`,
`use_case:entertainment_tv`).

**Por quê esta e não uma das outras 20 vozes premade femininas** (Alice, Bella,
Jessica, Laura, Lily, Matilda também disponíveis): nenhuma critério objetivo
extra foi medido entre elas — todas são igualmente "en premade, não pt-BR". Sarah
foi escolhida pelo texto do label (`"Mature, Reassuring, Confident"`) parecer o
tom mais adequado para VSL/anúncio de tráfego direto, mas isso é uma leitura de
metadado, não uma audição.

**Situação encontrada, conforme antecipado nas resoluções desta tarefa:** não há
voz pt-BR premade disponível nesta conta/plano; a voz feminina pt-BR que existe
(`Keren`) está bloqueada por plano (402). Portanto o fallback aplicado foi "voz
multilíngue feminina" rodando com `model_id=eleven_multilingual_v2`, que aceita
texto em português e gera áudio válido (confirmado: HTTP 200, MP3 válido, 4,18s
de fala coerente com o texto) — mas com voz nativamente rotulada como inglês, não
como pt-BR nativa. O modelo `eleven_multilingual_v2` fala o texto em português;
o timbre/sotaque da voz em si não foi rotulado pt-BR pela ElevenLabs.

**⚠️ Nenhum humano ouviu o áudio ainda.** Este agente não consegue ouvir. O que
foi verificado objetivamente:
- o arquivo é um MP3 válido (assinatura `ID3` nos primeiros bytes);
- o tamanho é plausível para a duração e o texto (~130 kbps, ~15,8 char/s);
- o `alignment` bate 1:1 com o texto de entrada.
O que **não** foi verificado: se o sotaque em português soa natural, se a
prosódia está adequada para um anúncio, se "Sarah" é de fato a melhor entre as 6
vozes femininas premade disponíveis. **Isso precisa da audição do Fernando antes
de qualquer narração gerada por esta voz ir ao ar.** Alternativas premade
femininas na mesma conta, para comparação: `hpp4J3VqNfWAUOO0d1Us` (Bella),
`cgSgspJ2msm6clMCkdW9` (Jessica), `XrExE9yKIg1WjnnlVkGX` (Matilda),
`Xb7hH8MSUJpSbSDYk0k2` (Alice), `FGY2WhTYpPnrIDTdsKH5` (Laura),
`pFZP5JQG7iQjIQuC4Bku` (Lily).

**Decisão em aberto para o Fernando:** se a voz "sotaque inglês falando
português" não for aceitável para o anúncio, as saídas são (a) fazer upgrade do
plano ElevenLabs para liberar `Keren`/`Lax` (vozes de biblioteca), ou (b) clonar
uma voz própria (Instant/Professional Voice Cloning), ou (c) aceitar uma das
premade en como está. Isso não foi decidido nesta tarefa.

## Limites observados

- Máximo de caracteres por request: **não testado** (nenhuma chamada tentou
  estourar; o texto de teste tinha 66 caracteres). Testar isso gastaria cota sem
  necessidade para o objetivo desta tarefa.
- Comportamento ao estourar a cota mensal de caracteres: **não testado** — a
  conta não foi levada perto do limite.
- Variação de tamanho do MP3 entre chamadas idênticas (mesmo texto, mesma voz):
  **observada** — dois requests com o texto/voz idênticos (Sarah) produziram
  67.753 e 73.186 bytes. A geração não é byte-determinística; o texto de
  entrada não garante o mesmo áudio nem a mesma duração exata a cada chamada
  (a duração de 4,18s citada acima é da chamada usada para medir alignment;
  não foi conferido se a segunda chamada teve a mesma duração).
- Rate limit: nenhum header de rate limit (`x-ratelimit-*` ou similar) foi
  observado nas respostas — **não confirmado** se existe e qual é.

## Ainda NÃO confirmado

- Se o sotaque/prosódia da voz Sarah falando português soa aceitável para um
  anúncio — **nenhum humano ouviu o áudio** gerado nesta sessão.
- Máximo de caracteres por request e comportamento de rate limit/cota mensal.
- Se `Lax`/`Keren` (as únicas vozes com label pt-BR) ficariam utilizáveis com um
  upgrade de plano — não testado, exigiria mudar o plano de fato.
- Se existe uma voz pt-BR nativa entre as `premade` do catálogo global da
  ElevenLabs (fora das 23 já presentes nesta conta) que poderia ser adicionada
  sem custo adicional — não pesquisado, fora do escopo desta sonda (que só lista
  as vozes já na conta).
- Se a variação de tamanho/duração entre chamadas idênticas (~8% observado)
  é estável o suficiente para não quebrar a sincronia de legenda em produção,
  ou se cada geração precisa recalcular o alignment do zero (a resposta já traz
  o alignment por chamada, então na prática cada geração é autocontida — mas o
  impacto de duração variável no timing do vídeo Remotion não foi modelado
  aqui).
- Headers de rate limit / uso de cota — nenhum foi observado, não se sabe se
  existem.

## Próximo passo

1. Fernando ouve `EXAVITQu4vr4xnSDxMaL` (Sarah) narrando um texto real de
   anúncio (a sonda já foi apagada — as Tasks 5/7 podem gerar um teste rápido
   reusando o endpoint documentado acima) e decide se serve, ou se prefere
   upgrade de plano / voice cloning para ter pt-BR nativo.
2. Tasks 5 e 7 usam os nomes de campo confirmados acima
   (`alignment.characters` / `character_start_times_seconds` /
   `character_end_times_seconds`, `audio_base64`) sem precisar chamar a API de
   novo para descobrir o shape.
