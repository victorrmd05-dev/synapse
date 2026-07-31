# Plano — Variações de vídeo com Remotion

> Escrito em 29/07/2026, no fim da sessão. **Nada deste plano foi implementado ainda.**
> O que JÁ existe é só a base: a pasta `remotion/` no monorepo, funcionando.
>
> 📍 Arquivo temporário na raiz, combinado com o Fernando. Mover para
> `docs/superpowers/plans/` quando for executar.

---

## 0. O que já está pronto (feito em 29/07)

| Item | Estado |
|---|---|
| `remotion/` no monorepo (era `Projetos_IDE/my-video`) | ✅ movido, `.git` aninhado removido |
| Remotion 4.0.409 rodando do novo local | ✅ `remotion versions` OK |
| Render real a partir do monorepo | ✅ **59,6s para 5s de vídeo**, 5,3 MB |
| `tsconfig.json` do Next excluindo `remotion/` | ✅ (React 19 de lá × React 18 daqui) |
| Exceção de monorepo no `CLAUDE.md` | ✅ nomeada, com o motivo |
| `ELEVENLABS_API_KEY` | ✅ no `.env.local` |
| Composição existente | `Anuncio-Sapatenis`, 1080×1920, 150f @30fps |

---

## 1. A restrição que define a arquitetura

**Medido, não estimado: 59,6 segundos para renderizar 5 segundos de vídeo.** ~12× o tempo
real. Um anúncio de 30s leva ~6 minutos; três variações do mesmo, ~18 minutos.

Route handler do Next tem `maxDuration` (o `/api/deploy` usa 120s). **Não cabe.**

E o projeto já decidiu isso antes, na **decisão D4 da autópsia**:

> *"A rota nunca processa mídia, só enfileira."*

Existe o precedente completo: `scripts/worker-autopsia.py` consumindo `autopsia_jobs`
(`tipo`, `status`, `tentativas`, `iniciado_em`, `concluido_em`). **Copiar esse padrão**, não
inventar outro.

### Regra que não pode ser quebrada

**`remotion/` NUNCA é importado pelo app Next.** O `@remotion/renderer` traz binário nativo
(~48 MB no Windows) e baixa um Chrome headless — nada disso pode entrar no bundle do Next.
A comunicação entre os dois é **só pela fila no Supabase**.

---

## 2. Arquitetura

```
/video-maker (UI)
      │  clica "Gerar variações"
      ▼
POST /api/video/variacoes  ──────► INSERT em video_jobs (status='pendente')
      │  responde na hora (não renderiza)
      ▼
remotion/worker.mjs  (processo separado, rodado à mão)
      │  1. pega job pendente
      │  2. baixa o vídeo-fonte do Storage
      │  3. (se legenda) transcreve
      │  4. (se narração) ElevenLabs → mp3
      │  5. bundle + renderMedia
      │  6. sobe o MP4 pro Storage
      ▼
video_jobs.status='concluido' + url_saida
      │  Realtime
      ▼
UI atualiza sozinha
```

---

## 3. Schema — `video_jobs`

Espelha `autopsia_jobs` de propósito: mesmos nomes de coluna, mesma semântica, para quem
conhece um entender o outro.

```sql
create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  -- origem do vídeo. Um dos dois é preenchido:
  video_id uuid,                    -- workflow_video, quando o Video Maker existir
  criativo_id uuid,                 -- autopsia_criativos (fonte que JÁ existe hoje)
  campanha_id uuid,

  url_fonte text not null,          -- MP4 de entrada (Storage ou CDN)
  variacao text not null,           -- 'legenda' | 'narracao' | 'legenda_narracao' | 'limpo'
  composicao text not null default 'VariacaoAnuncio',
  params_json jsonb,                -- texto, cor, voz, etc.

  status text not null default 'pendente',   -- pendente|processando|concluido|erro
  tentativas int not null default 0,
  erro text,
  url_saida text,                   -- MP4 renderizado no Storage
  duracao_render_s int,             -- para calibrar expectativa na UI

  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index on video_jobs (status, criado_em);
```

⚠️ **RLS:** o projeto tem 6 tabelas que já quebraram por RLS ligado sem policy (frontend
cego). Criar as policies públicas junto da tabela, como nas outras.

---

## 4. As quatro variações

| `variacao` | O que faz | Depende de |
|---|---|---|
| `limpo` | só re-encoda no formato/duração alvo | — |
| `legenda` | queima legenda no vídeo | transcrição |
| `narracao` | troca/adiciona faixa de voz | ElevenLabs |
| `legenda_narracao` | as duas | ambas |

### Legendas — usar o que já existe, não API paga

O worker da autópsia **já roda `faster-whisper` local** (`scripts/worker-autopsia.py`,
`modelo_whisper()`). Reaproveitar: transcreve com timestamps → `@remotion/captions` consome
o formato. **Custo zero.**

⚠️ Lembrar do achado de 28/07: usar `C:\Python313\python.exe`, **não** `python` — o venv
vem primeiro no PATH e não tem `faster-whisper`.

### Narração — ElevenLabs

`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` → mp3 → `<Audio>` do Remotion.
Chave já em `.env.local`. **É pago por caractere** — respeitar a política de custo do
`CLAUDE.md` (nada dispara sozinho; só por clique explícito).

---

## 5. Tarefas

### Fase 1 — fila e worker (o núcleo)

1. **Migration `video_jobs`** + policies RLS públicas.
2. **Composição `VariacaoAnuncio`** em `remotion/src/`, com `inputProps` tipados:
   `{ urlFonte, legendas?, urlNarracao?, titulo? }`. Uma composição parametrizada, não
   quatro — a variação é dado, não código.
   - ⚠️ Corrigir antes: `Root.tsx` passa `titleColor`/`priceText` em `defaultProps` que não
     existem no schema. Erro de tipo real, já presente.
3. **`remotion/worker.mjs`** — loop igual ao da autópsia:
   - `checar_dependencias()` na largada (falha cedo se faltar ffmpeg/python/chrome)
   - `pegar_job()` incrementa `tentativas` ao travar
   - `bundle()` uma vez por processo (leva ~5s, não repetir por job)
   - `renderMedia()` por job
   - sobe pro Storage, grava `url_saida` e `duracao_render_s`
   - **banner com `process.execPath`** — mesma lição do worker Python
4. **`npm run video:worker`** no `package.json` da raiz apontando para `remotion/worker.mjs`.

### Fase 2 — rota e UI

5. **`POST /api/video/variacoes`** — valida, insere N jobs, responde. **Nunca renderiza.**
6. **`GET /api/video/variacoes?campanha_id=`** — lista com status.
7. **Item na sidebar** abaixo de *Video Maker* → `/video-maker/variacoes`.
8. **Tela**: fonte do vídeo, quais variações marcar, botão gerar, lista com status via
   Realtime, player do resultado, download.
   - Mostrar **estimativa de tempo** baseada em `duracao_render_s` de jobs anteriores. Sem
     isso o usuário acha que travou (60s por 5s de vídeo é muito).
   - Alerta de "worker parado" — reaproveitar a lógica já corrigida na `/autopsia/[id]`:
     medir tempo desde a **última conclusão**, não a idade da fila.

### Fase 3 — integração

9. Botão "Gerar variações" no card da `/autopsia/[id]` (os criativos do concorrente **já
   estão no Storage** — é a fonte de vídeo que existe hoje).
10. Ligar ao `workflow_video` quando o Video Maker existir de fato.

---

## 6. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Render longo dá impressão de travado | mostrar estimativa a partir do histórico + alerta de worker parado |
| Chrome headless baixa ~150–300 MB no 1º render | avisar no banner do worker; é uma vez só |
| Dois `node_modules` (raiz + remotion) confundem | `npm` sempre rodado de dentro de `remotion/` para coisas de Remotion |
| ElevenLabs é pago por caractere | só por clique; nunca em loop; registrar custo no NOTES |
| Concorrência de worker | um worker por vez, como na autópsia. Se paralelizar, usar `select ... for update skip locked` |

---

## 7. Decisões em aberto (do Fernando)

1. **Voz da ElevenLabs** — qual `voice_id`? Fixa por produto ou escolhida na UI?
2. **Formato de saída** — só 1080×1920, ou também 1:1 e 16:9?
3. **Estilo da legenda** — fonte, tamanho, posição, cor. Vale herdar do `marca.md` do
   produto, como a LP faz (ver skill `landing-page-vendas` §2.0).
4. **O worker roda à mão** (como o da autópsia) ou vira serviço que sobe junto com o `dev`?

---

## 8. Fora de escopo

Render na nuvem (Remotion Lambda), edição visual no dashboard, geração de vídeo do zero
(isso é o Video Maker/Higgsfield), e legendas por API paga.
