# Achados — ElevenLabs (medido em 01/08/2026)

> Task 1 do plano `2026-08-01-remotion-bancada-anuncio.md`. **RESULTADO: BLOQUEADO.**
> Não foi possível medir o contrato real da API — a chave em `.env.local` autentica,
> mas não tem nenhuma permissão liberada. As Tasks 5 e 7 **não podem** ser escritas
> em cima deste arquivo até isso ser resolvido e a sonda rodar de novo.

## O que foi tentado

Sonda descartável (`scripts/sonda-elevenlabs.mjs`, já apagada conforme o plano)
rodada com `node --env-file=.env.local`, chave lida de `process.env.ELEVENLABS_API_KEY`
(confirmado sem sombra do Windows: `node -e "console.log(process.env.ELEVENLABS_API_KEY)"`
sem `--env-file` voltou vazio).

## Resultado medido: HTTP 401 em toda rota testada

Nenhuma chamada usou uma chave errada ou digitada incorretamente — o próprio erro da
API deixa isso claro (não é `invalid_api_key`, é `missing_permissions`). São 4 rotas
diferentes, 4 escopos diferentes faltando:

| Rota | HTTP | `code` | `message` |
|---|---|---|---|
| `GET /v1/voices` | 401 | `unauthorized` | "The API key you used is missing the permission **voices_read** to execute this operation." |
| `POST /v1/text-to-speech/{voice_id}/with-timestamps` | 401 | `unauthorized` | "The API key you used is missing the permission **text_to_speech** to execute this operation." |
| `GET /v1/user` | 401 | `unauthorized` | "The API key you used is missing the permission **user_read** to execute this operation." |
| `GET /v1/user/subscription` | 401 | `unauthorized` | "The API key you used is missing the permission **user_read** to execute this operation." |
| `GET /v1/models` | 401 | `unauthorized` | "The API key you used is missing the permission **models_read** to execute this operation." |

Corpo de erro (shape idêntico nas 5 chamadas, só troca `message`/`request_id`):

```json
{
  "detail": {
    "type": "authentication_error",
    "code": "unauthorized",
    "message": "The API key you used is missing the permission <escopo> to execute this operation.",
    "status": "missing_permissions",
    "request_id": "..."
  }
}
```

O teste de `with-timestamps` usou `21m00Tcm4TlvDq8ikWAM` (voice_id "Rachel", padrão
premade que costuma existir em toda conta ElevenLabs) só para isolar se o problema
era de permissão — **não é uma voz escolhida**, e como `/voices` também falhou, não
há confirmação de que essa voz exista de fato nesta conta.

## Diagnóstico

A chave em `.env.local` existe e autentica (a API a reconhece), mas foi criada — ou
está configurada no painel da ElevenLabs — como uma **chave restrita sem nenhum
escopo marcado**. Isso não é um problema de código nem de ambiente: é configuração
do lado da ElevenLabs, na conta do Fernando.

**Ação necessária (do Fernando, não desta tarefa):** entrar no dashboard da
ElevenLabs → API Keys → editar a chave atual (ou gerar uma nova) e marcar pelo menos:
- `text_to_speech` (necessário para gerar áudio)
- `voices_read` (necessário para listar vozes e escolher uma)
- `models_read` (não estritamente obrigatório, mas útil pra confirmar `model_id`)
- `user_read` (não obrigatório para a narração; falhou só porque foi testado)

Depois disso, rodar a sonda de novo (o código dela está integralmente no Step 3 do
brief `task-1-brief.md`, recriável sem perda) para obter o achado real.

## Nome exato dos campos de alignment

**NÃO CONFIRMADO.** Não foi possível chegar à resposta de sucesso do
`with-timestamps` — todas as tentativas pararam em 401 antes de qualquer corpo de
alignment ser devolvido. O nome dos campos (`alignment` vs `normalized_alignment`,
`characters`/`character_start_times_seconds`/`character_end_times_seconds` ou
equivalentes) é o que a documentação pública da ElevenLabs sugere, mas **nada disso
foi medido nesta sessão** — não deve ser tratado como fato até a sonda rodar com
sucesso.

## Áudio

**NÃO CONFIRMADO.** Nenhum byte de áudio foi gerado ou recebido. Não há
`sonda-elevenlabs.mp3` para inspecionar.

## Voz escolhida

**NENHUMA.** `ELEVENLABS_VOICE_ID` continua vazio em `.env.local` e em
`.env.local.example`. Escolher uma voz sem ter visto a lista real de vozes da conta
seria inventar um dado — exatamente o que este arquivo existe para evitar. Isso só
pode ser feito depois que `GET /v1/voices` responder 200.

## Limites observados

- máximo de caracteres por request: não testado (bloqueado antes)
- comportamento ao estourar a cota: não testado (bloqueado antes)

## Ainda NÃO confirmado

- O shape completo da resposta de `with-timestamps` (todas as chaves de primeiro
  nível, não só a existência do endpoint).
- O nome exato dos campos de alignment por caractere.
- Se a resposta usa `alignment`, `normalized_alignment`, ou os dois — e qual é
  mais confiável para sincronizar legenda.
- O formato do áudio devolvido (base64 vs binário, campo exato, extensão/mime real).
- Quantas vozes a conta tem e quais têm `labels` indicando pt-BR/feminino.
- Se o `voice_id` de teste usado (`21m00Tcm4TlvDq8ikWAM`, "Rachel") sequer existe
  nesta conta — não confirmado, porque a chamada nem chegou a validar o voice_id
  antes de barrar por permissão.
- Limite de caracteres por request e comportamento de rate limit/cota.
- Se o endpoint `with-timestamps` existe e funciona como documentado publicamente
  (não recebemos nem um 404 nem um 200 — só 401, que é uma camada anterior à
  validação da rota em si).

## Próximo passo

1. Fernando ajusta as permissões da chave (ou gera uma nova) no dashboard da
   ElevenLabs.
2. Recriar `scripts/sonda-elevenlabs.mjs` a partir do Step 3 de
   `.superpowers/sdd/2026-08-01-remotion-bancada-anuncio/task-1-brief.md` (conteúdo
   idêntico, nada mudou no desenho da sonda).
3. Rodar de novo com `node --env-file=.env.local scripts/sonda-elevenlabs.mjs`.
4. Só então preencher as seções acima com dado medido e reescrever este arquivo.
