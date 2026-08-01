# Geração de vídeo (WaveSpeed) — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa.
> Os passos usam checkbox (`- [ ]`).

> 🛑 **REGRA QUE SOBREPÕE ESTA SKILL — LEIA ANTES DE COMEÇAR.**
> O `CLAUDE.md` deste projeto proíbe `git commit` e `git push` sem o Fernando pedir,
> **inclusive dentro de execução de plano e inclusive por subagentes**. Onde este
> plano diz "PARE E PEÇA", é literal: mostre os arquivos prontos e a mensagem de
> commit sugerida, e **não execute**. Se você é um subagente, repasse esta regra.

**Goal:** Fazer o `/video-maker` gerar vídeo de verdade, a partir dos prompts que o
copywriting produz, usando a WaveSpeed AI — sem nunca cobrar duas vezes pelo mesmo clique.

**Architecture:** A rota submete (única chamada que cobra, amarrada ao clique
confirmado); um worker separado só consulta e baixa (idempotente e grátis). A fila
`video_jobs` tem uma `check` que torna o duplo-gasto impossível pelo banco.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Supabase (Postgres +
Storage + Realtime) · WaveSpeed REST API · worker Node standalone (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-07-31-video-wavespeed-remotion-design.md`

---

## Global Constraints

- **Nunca commitar.** Ver o aviso no topo. Vale para toda tarefa deste plano.
- **Não existe suíte de testes** neste repo (não há `test` no `package.json`).
  A verificação de cada tarefa é: `npx tsc --noEmit` limpo + a checagem manual
  descrita na própria tarefa. Não invente `jest`/`vitest`.
- **Type-check é `npx tsc --noEmit`.** Não existe `npm run type-check`.
- **Nada dispara sozinho.** Sem loop, sem retry de submissão, sem fallback pago.
  A WaveSpeed é a primeira coisa do projeto que queima crédito pré-pago a cada clique.
- **Chaves só via `process.env`.** Nunca hardcode. Nunca commitar `.env.local`.
- **Client Supabase:** `supabaseServer` (service_role, ignora RLS) **só** server-side;
  `supabase` (anon) só no browser. Nunca trocar.
- **Design system:** fundo `#0D0D14`, `bg-surface`, `text-secondary`, `bg-primary`
  (roxo `#6366f1`), `border-surface-elevated`. Sem fundo claro, sem `border-2`,
  sem gradiente arco-íris.
- **Português** em identificadores de domínio, comentários e texto de UI — é a
  convenção do repo (`salvarMidia`, `garantirBucket`, `chatComZen`).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260731120000_add_prompts_imagens_workflow_copywriting.sql` | resgata coluna órfã (dívida, não feature) |
| `supabase/migrations/20260731120100_add_prompts_videos_workflow_copywriting.sql` | coluna nova |
| `supabase/migrations/20260731120200_create_video_jobs.sql` | a fila + a `check` anti-duplo-gasto |
| `src/lib/wavespeed/client.ts` | falar HTTP com a WaveSpeed. Só isso. |
| `src/lib/wavespeed/precos.ts` | tabela de preços à mão + `estimarCustoUsd()` |
| `src/app/api/video/gerar/route.ts` | valida, estima, **submete**, grava a linha |
| `src/app/api/video/jobs/route.ts` | lista jobs de uma campanha |
| `scripts/worker-video.mjs` | consulta, baixa para o Storage. Processo separado. |
| `src/app/video-maker/page.tsx` | *(modificar)* a tela |
| `src/app/api/copywriting/generate/route.ts` | *(modificar)* contrato JSON + payload |
| `agentes/copywriting/SKILL.md` | *(modificar)* seção de prompts de vídeo |
| `src/app/copywriting/page.tsx` | *(modificar)* aba "Prompts de Vídeo" |
| `src/app/revisor/page.tsx` | *(modificar)* aba "Prompts de Vídeo" |

**Por que o worker é `.mjs` em `scripts/` e não dentro de `remotion/`:** ele não usa
Remotion nenhum — só consulta HTTP e sobe arquivo. Fica ao lado do
`scripts/worker-autopsia.py`, que é exatamente o mesmo tipo de bicho. O worker de
render do Remotion (P3) é outro processo, e mora em `remotion/`, porque o
`CLAUDE.md` proíbe o app Next de importar aquela pasta.

---

## Task 1: Confirmar a API real (gasta crédito — é o objetivo)

> **Esta tarefa é de descoberta, não de código.** A documentação da WaveSpeed **não
> expõe** os caminhos dos modelos (`owner/nome/versao`), **nem** o formato do corpo
> por modelo, **nem** preço por clipe. Tudo isso é entrada obrigatória das tarefas
> 3 e 4. Construir antes é construir sobre palpite.

**Files:**
- Modificar: `.env.local` (só o valor de `WAVESPEED_MODEL`) — **feito pelo Fernando**
- Criar: `docs/superpowers/plans/2026-07-31-video-wavespeed-ACHADOS.md`

**Interfaces:**
- Produces: o caminho do modelo, as chaves exatas do corpo, e o custo observado de
  um clipe curto. As tarefas 3 e 4 dependem literalmente desses três valores.

- [ ] **Passo 1: Descobrir o caminho de um modelo de vídeo**

Abrir https://wavespeed.ai/models e filtrar por vídeo. Cada página de modelo mostra
o caminho da API e os parâmetros aceitos. Preferir um modelo **barato e rápido**
(clipe de 5s) — a validação não precisa de 4K.

- [ ] **Passo 2: Submeter um clipe de teste, de verdade**

```bash
curl --fail-with-body --connect-timeout 10 --max-time 60 \
  -X POST "https://api.wavespeed.ai/api/v3/<owner>/<modelo>/<versao>" \
  -H "Authorization: Bearer $WAVESPEED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"golden retriever running on a beach at sunset, cinematic","duration":5}'
```

Esperado: HTTP 200 com `data.id` e `data.urls.get`.

⚠️ Se voltar **401**, a chave não passou por top-up — a documentação diz que a chave
só funciona depois de crédito. Se voltar **400**, as chaves do corpo estão erradas
para este modelo: leia a mensagem, ela costuma listar os campos aceitos.

- [ ] **Passo 3: Consultar até concluir**

```bash
curl -s "https://api.wavespeed.ai/api/v3/predictions/<TASK_ID>/result" \
  -H "Authorization: Bearer $WAVESPEED_API_KEY"
```

Repetir até `data.status` virar `completed`. **Anotar quanto tempo levou** — esse
número define o intervalo de consulta do worker na tarefa 5.

- [ ] **Passo 4: Anotar o custo real**

Olhar o saldo em https://wavespeed.ai antes e depois. A diferença é o custo real de
um clipe — o número que a tarefa 3 vai codificar.

- [ ] **Passo 5: Registrar os achados**

Criar `docs/superpowers/plans/2026-07-31-video-wavespeed-ACHADOS.md` com, no mínimo:

```markdown
# Achados da chamada real — WaveSpeed (31/07/2026)

- Caminho do modelo: `<owner>/<modelo>/<versao>`
- Corpo aceito: { "prompt": string, "<chave de duração>": number, "<chave de imagem>": string }
  (copiar o JSON exato que funcionou)
- Duração do clipe de teste: Ns
- Tempo até `completed`: Ns
- Custo observado: US$ 0,XX
- Resolução de saída: NNNNxNNNN
- A URL de `outputs[0]` expira? (testar de novo depois de algumas horas)
```

- [ ] **Passo 6: Gravar o modelo no `.env.local`**

O Fernando cola `WAVESPEED_MODEL=<owner>/<modelo>/<versao>`.

- [ ] **Passo 7: PARE E PEÇA**

Arquivo pronto: o de achados. Mensagem sugerida:
`docs(video): achados da chamada real a WaveSpeed`

---

## Task 2: Migrations

**Files:**
- Criar: `supabase/migrations/20260731120000_add_prompts_imagens_workflow_copywriting.sql`
- Criar: `supabase/migrations/20260731120100_add_prompts_videos_workflow_copywriting.sql`
- Criar: `supabase/migrations/20260731120200_create_video_jobs.sql`

**Interfaces:**
- Produces: tabela `video_jobs` e colunas `workflow_copywriting.prompts_videos` /
  `.prompts_imagens`. As tarefas 4, 5, 6 e 7 leem e escrevem nelas.

- [ ] **Passo 1: A migration de resgate**

`20260731120000_add_prompts_imagens_workflow_copywriting.sql`:

```sql
-- DÍVIDA, não feature. A coluna `prompts_imagens` existe no banco de producao e e
-- usada pelo codigo (copywriting/generate/route.ts:241, /copywriting, /revisor),
-- mas foi criada direto no banco e NUNCA teve migration. Quem clona o repo hoje
-- nao consegue reconstruir o schema. Corrigido aqui, enquanto se mexe na tabela
-- vizinha. `if not exists` torna isto inofensivo no banco que ja tem a coluna.
alter table workflow_copywriting add column if not exists prompts_imagens text;
```

- [ ] **Passo 2: A coluna nova**

`20260731120100_add_prompts_videos_workflow_copywriting.sql`:

```sql
-- Prompts de video gerados pelo agente Copywriting, irmaos de `prompts_imagens`.
-- `text` e nao `jsonb` de proposito: e o mesmo tipo de conteudo da irma —
-- markdown escrito para humano ler e aprovar antes de virar chamada paga.
alter table workflow_copywriting add column if not exists prompts_videos text;
```

- [ ] **Passo 3: A fila**

`20260731120200_create_video_jobs.sql`:

```sql
-- Fila de video. Dois tipos com ciclos de vida OPOSTOS dividem a tabela:
--
--   tipo='gerar'  -> WaveSpeed. Nasce em 'processando' porque a rota JA submeteu
--                    e JA pagou. O worker so consulta.
--   tipo='compor' -> Remotion (P3, ainda nao implementado). Nasce em 'pendente'
--                    e o worker pega da fila. Comecar e gratis.
--
-- RLS com policy publica e Realtime: convencao do projeto enquanto nao ha auth.

create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references campanhas_producao(id) on delete cascade,
  tipo text not null,                        -- gerar | compor
  status text not null default 'pendente',   -- pendente|processando|concluido|erro

  -- so para tipo='gerar'
  wavespeed_task_id text,
  modelo text,
  prompt text,
  image_url text,                            -- presente = image-to-video
  duracao_s int,
  custo_estimado_usd numeric(10,4),

  -- resultado
  url_saida text,                            -- caminho no STORAGE, nunca a URL da WaveSpeed
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,

  -- A TRAVA DE CUSTO, e a decisao central deste modulo.
  -- Uma linha 'gerar' nao existe sem tarefa ja submetida, entao nao sobra nada
  -- para um worker "iniciar" — e iniciar, aqui, significaria COBRAR DE NOVO.
  -- Motivo concreto: o pegar_job() do worker da autopsia incrementa `tentativas`
  -- e reprocessa job travado. Retry automatico nao pode conviver com cobranca.
  constraint gerar_exige_task_id
    check (tipo <> 'gerar' or wavespeed_task_id is not null)
);

create index if not exists idx_video_jobs_fila on video_jobs (status, criado_em);
create index if not exists idx_video_jobs_campanha on video_jobs (campanha_id);

alter table video_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'video_jobs' and policyname = 'video_jobs_publico') then
    create policy video_jobs_publico on video_jobs for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'video_jobs') then
    alter publication supabase_realtime add table video_jobs;
  end if;
end $$;
```

- [ ] **Passo 4: Aplicar no Supabase**

Aplicar as três via MCP do Supabase (`apply_migration`) ou pelo SQL Editor.

- [ ] **Passo 5: Verificar que a trava funciona**

Este é o passo que prova a decisão central. Rodar no SQL Editor:

```sql
-- DEVE FALHAR com violacao de check constraint:
insert into video_jobs (tipo, status) values ('gerar', 'processando');

-- DEVE PASSAR:
insert into video_jobs (tipo, status, wavespeed_task_id)
values ('gerar', 'processando', 'teste-manual');

-- DEVE PASSAR (compor nao exige task_id):
insert into video_jobs (tipo) values ('compor');

-- limpar
delete from video_jobs where wavespeed_task_id = 'teste-manual' or tipo = 'compor';
```

Se o primeiro `insert` **passar**, a `check` não foi criada — pare e investigue.
Uma trava que não trava é pior que trava nenhuma, porque dá falsa confiança.

- [ ] **Passo 6: PARE E PEÇA**

Mensagem sugerida: `feat(video): tabela video_jobs + colunas de prompts`

---

## Task 3: Client e preços da WaveSpeed

**Files:**
- Criar: `src/lib/wavespeed/client.ts`
- Criar: `src/lib/wavespeed/precos.ts`

**Interfaces:**
- Consumes: os achados da Task 1 (caminho do modelo, chaves do corpo, custo).
- Produces:
  - `submeterVideo(opts): Promise<{ taskId: string }>`
  - `consultarTarefa(taskId: string): Promise<ResultadoWaveSpeed>`
  - `type StatusWaveSpeed = 'created'|'processing'|'completed'|'failed'|'cancelled'|'timeout'`
  - `interface ResultadoWaveSpeed { status: StatusWaveSpeed; outputs: string[]; erro?: string }`
  - `estimarCustoUsd(modelo: string, duracaoS: number): number | null`
  - As tarefas 4 e 5 consomem exatamente estes nomes.

- [ ] **Passo 1: Criar `src/lib/wavespeed/precos.ts`**

```ts
// src/lib/wavespeed/precos.ts
//
// POR QUE ESTA TABELA E ESCRITA A MAO: a documentacao da WaveSpeed nao expoe
// preco por modelo via API — so nas paginas de cada modelo, em HTML. Entao isto
// e ESTIMATIVA, mantida manualmente, e VAI DESATUALIZAR.
//
// A fatura da WaveSpeed e a verdade. Numero que parece exato vira promessa, por
// isso a tela precisa dizer "estimado" ao lado do valor.

/** US$ por segundo de video, por caminho de modelo. Preencher com os achados da Task 1. */
const USD_POR_SEGUNDO: Record<string, number> = {
  // 'wavespeed-ai/<modelo>/<versao>': 0.0000,
};

/** Conferido em: preencher com a data da ultima checagem manual dos precos. */
export const PRECOS_CONFERIDOS_EM = '2026-07-31';

/**
 * Estimativa de custo. Devolve `null` quando o modelo nao esta na tabela — e o
 * chamador PRECISA tratar esse null mostrando "custo desconhecido", nunca zero.
 * Mostrar R$ 0,00 para um modelo desconhecido faria o usuario aprovar um gasto
 * que ele acha que e de graca.
 */
export function estimarCustoUsd(modelo: string, duracaoS: number): number | null {
  const porSegundo = USD_POR_SEGUNDO[modelo];
  if (porSegundo === undefined) return null;
  return Number((porSegundo * duracaoS).toFixed(4));
}
```

- [ ] **Passo 2: Criar `src/lib/wavespeed/client.ts`**

⚠️ Ajustar `CHAVE_DURACAO` e `CHAVE_IMAGEM` para as chaves reais anotadas na Task 1 —
o corpo é específico por modelo.

```ts
// src/lib/wavespeed/client.ts
//
// Falar HTTP com a WaveSpeed. So isso: nao grava no banco, nao baixa arquivo,
// nao decide nada de negocio.
//
// 💸 `submeterVideo` E A UNICA FUNCAO DO PROJETO QUE GASTA CREDITO PRE-PAGO.
// Ela so pode ser chamada a partir de um clique confirmado, nunca de um worker,
// nunca em loop, nunca como fallback.

const BASE = 'https://api.wavespeed.ai/api/v3';

// Chaves do corpo, confirmadas na Task 1 (variam por modelo).
const CHAVE_DURACAO = 'duration';
const CHAVE_IMAGEM = 'image';

export type StatusWaveSpeed =
  | 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface ResultadoWaveSpeed {
  status: StatusWaveSpeed;
  outputs: string[];
  erro?: string;
}

function chave(): string {
  const k = process.env.WAVESPEED_API_KEY;
  if (!k) {
    throw new Error(
      'WAVESPEED_API_KEY ausente. A chave so funciona apos um top-up na WaveSpeed.',
    );
  }
  return k;
}

/** 💸 COBRA. Submete e devolve o id da tarefa. Nao espera o video ficar pronto. */
export async function submeterVideo(opts: {
  modelo: string; // 'owner/nome/versao'
  prompt: string;
  imageUrl?: string;
  duracaoS?: number;
}): Promise<{ taskId: string }> {
  const body: Record<string, unknown> = { prompt: opts.prompt };
  if (opts.duracaoS) body[CHAVE_DURACAO] = opts.duracaoS;
  if (opts.imageUrl) body[CHAVE_IMAGEM] = opts.imageUrl;

  const res = await fetch(`${BASE}/${opts.modelo}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const texto = await res.text();
  if (!res.ok) {
    // O corpo do erro da WaveSpeed costuma listar os campos aceitos — vale ouro
    // quando o modelo espera chaves diferentes. Nunca engolir.
    throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 500)}`);
  }

  const json = JSON.parse(texto);
  const taskId = json?.data?.id;
  if (!taskId) throw new Error(`WaveSpeed nao devolveu data.id: ${texto.slice(0, 300)}`);
  return { taskId };
}

/** Gratis e idempotente. Pode ser chamada quantas vezes quiser. */
export async function consultarTarefa(taskId: string): Promise<ResultadoWaveSpeed> {
  const res = await fetch(`${BASE}/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${chave()}` },
    cache: 'no-store',
  });

  const texto = await res.text();
  if (!res.ok) throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 500)}`);

  const d = JSON.parse(texto)?.data ?? {};
  return {
    status: (d.status ?? 'processing') as StatusWaveSpeed,
    outputs: Array.isArray(d.outputs) ? d.outputs : [],
    erro: d.error ?? undefined,
  };
}
```

- [ ] **Passo 3: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: sem erro.

- [ ] **Passo 4: PARE E PEÇA**

Mensagem sugerida: `feat(video): client da WaveSpeed + tabela de precos`

---

## Task 4: Rotas `/api/video/gerar` e `/api/video/jobs`

**Files:**
- Criar: `src/app/api/video/gerar/route.ts`
- Criar: `src/app/api/video/jobs/route.ts`

**Interfaces:**
- Consumes: `submeterVideo`, `estimarCustoUsd` (Task 3); tabela `video_jobs` (Task 2).
- Produces:
  - `POST /api/video/gerar` body `{ campanha_id, prompt, image_url?, duracao_s?, modelo? }`
    → `200 { job_id, task_id, custo_estimado_usd }`
  - `GET /api/video/jobs?campanha_id=<uuid>` → `200 { jobs: [...] }`
  - A Task 7 (tela) consome as duas.

- [ ] **Passo 1: Criar `src/app/api/video/gerar/route.ts`**

```ts
// src/app/api/video/gerar/route.ts
//
// 💸 A UNICA ROTA DO PROJETO QUE GASTA CREDITO PRE-PAGO.
//
// A ORDEM DOS PASSOS E DELIBERADA: submete PRIMEIRO, grava DEPOIS.
// Se gravasse antes, a linha existiria sem `wavespeed_task_id` — e a `check`
// `gerar_exige_task_id` recusaria o insert. Isso nao e acidente: e a trava
// funcionando. Uma linha 'gerar' so pode nascer de uma submissao que ja aconteceu.
//
// O caso ruim conhecido: submissao da certo e o insert falha. Ai gastamos sem
// registrar. Por isso o task_id vai para o LOG antes do insert — e a unica forma
// de rastrear o gasto orfao na fatura.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { submeterVideo } from '@/lib/wavespeed/client';
import { estimarCustoUsd } from '@/lib/wavespeed/precos';

export const dynamic = 'force-dynamic';

const DURACAO_PADRAO_S = 5;
const DURACAO_MAX_S = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, prompt, image_url, duracao_s, modelo: modeloBody } = body ?? {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'prompt e obrigatorio e precisa ter ao menos 10 caracteres' },
        { status: 400 },
      );
    }

    const modelo = modeloBody || process.env.WAVESPEED_MODEL;
    if (!modelo) {
      return NextResponse.json(
        { error: 'WAVESPEED_MODEL nao configurado no .env.local' },
        { status: 400 },
      );
    }

    // Teto de duracao: a WaveSpeed aceita ate 20s, mas custo cresce com a
    // duracao e anuncio raramente passa de 10s. Teto barato de manter.
    const duracao = Math.min(Number(duracao_s) || DURACAO_PADRAO_S, DURACAO_MAX_S);
    const custo = estimarCustoUsd(modelo, duracao);

    // 💸 A partir daqui, cobrou.
    const { taskId } = await submeterVideo({
      modelo,
      prompt: prompt.trim(),
      imageUrl: image_url || undefined,
      duracaoS: duracao,
    });

    // Antes do insert: se o insert falhar, este log e a unica pista do gasto.
    console.log(`[video/gerar] SUBMETIDO task=${taskId} modelo=${modelo} dur=${duracao}s`);

    const { data, error } = await supabaseServer
      .from('video_jobs')
      .insert({
        campanha_id: campanha_id || null,
        tipo: 'gerar',
        status: 'processando', // NUNCA 'pendente': ja foi submetido e pago
        wavespeed_task_id: taskId,
        modelo,
        prompt: prompt.trim(),
        image_url: image_url || null,
        duracao_s: duracao,
        custo_estimado_usd: custo,
        iniciado_em: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[video/gerar] GASTO ORFAO task=${taskId}:`, error.message);
      return NextResponse.json(
        { error: 'video foi submetido mas nao gravou', task_id: taskId, detalhe: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      job_id: data.id,
      task_id: taskId,
      custo_estimado_usd: custo,
    });
  } catch (err) {
    console.error('[video/gerar] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao gerar video', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
```

- [ ] **Passo 2: Criar `src/app/api/video/jobs/route.ts`**

```ts
// src/app/api/video/jobs/route.ts
// Leitura pura. Nao cobra nada.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campanhaId = searchParams.get('campanha_id');

  let q = supabaseServer
    .from('video_jobs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50);

  if (campanhaId) q = q.eq('campanha_id', campanhaId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}
```

- [ ] **Passo 3: Verificar tipos**

Run: `npx tsc --noEmit` — sem erro.

- [ ] **Passo 4: Testar de verdade (gasta 1 clipe)**

Com `npm run dev` rodando:

```bash
curl -X POST http://localhost:3000/api/video/gerar \
  -H "Content-Type: application/json" \
  -d '{"prompt":"golden retriever running on a beach at sunset, cinematic","duracao_s":5}'
```

Esperado: `{ job_id, task_id, custo_estimado_usd }`. Conferir que a linha nasceu
com `status='processando'` e `wavespeed_task_id` preenchido:

```bash
curl "http://localhost:3000/api/video/jobs"
```

- [ ] **Passo 5: PARE E PEÇA**

Mensagem sugerida: `feat(video): rota de geracao e listagem de jobs`

---

## Task 5: Worker que consulta e baixa

**Files:**
- Criar: `scripts/worker-video.mjs`
- Modificar: `package.json` (script `video:worker`)

**Interfaces:**
- Consumes: tabela `video_jobs` (Task 2); a API da WaveSpeed direto (processo
  separado — **não** importa `src/lib`, que é TypeScript do Next).
- Produces: preenche `url_saida`, `status`, `concluido_em`, `erro`. A Task 7 lê isso.

- [ ] **Passo 1: Criar `scripts/worker-video.mjs`**

```js
// scripts/worker-video.mjs
//
// Consulta as tarefas de video na WaveSpeed e baixa o resultado para o Storage.
//
// 🚨 ESTE WORKER NUNCA SUBMETE NADA. Consultar e baixar sao operacoes GRATIS e
// IDEMPOTENTES — podem ser repetidas sem custo. Submeter cobra, e por isso mora
// na rota, amarrado a um clique confirmado. Se um dia alguem for tentado a
// "reenviar job travado" daqui: nao. Isso cobra de novo.
//
// Rodar:  node scripts/worker-video.mjs
// Parar:  Ctrl+C

import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHAVE_WAVESPEED = process.env.WAVESPEED_API_KEY;
const BUCKET = 'criativos';
const INTERVALO_MS = 15_000; // ajustar com o tempo medido na Task 1

function checarDependencias() {
  const faltando = [];
  if (!URL_SUPABASE) faltando.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!CHAVE_SERVICE) faltando.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!CHAVE_WAVESPEED) faltando.push('WAVESPEED_API_KEY');
  if (faltando.length) {
    console.error(`\n[worker-video] FALTA: ${faltando.join(', ')}`);
    console.error('Rode com as variaveis carregadas. Ex: node --env-file=.env.local scripts/worker-video.mjs\n');
    process.exit(1);
  }
}

// Mesma licao do worker da autopsia: falhar na largada, dizendo QUAL interpretador
// esta em uso, em vez de quebrar 40 minutos depois no primeiro job real.
checarDependencias();
console.log(`[worker-video] node = ${process.execPath}`);
console.log(`[worker-video] intervalo = ${INTERVALO_MS / 1000}s. Ctrl+C para parar.`);

const supabase = createClient(URL_SUPABASE, CHAVE_SERVICE, {
  auth: { persistSession: false },
});

async function consultar(taskId) {
  const res = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${CHAVE_WAVESPEED}` },
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 300)}`);
  const d = JSON.parse(texto)?.data ?? {};
  return { status: d.status ?? 'processing', outputs: d.outputs ?? [], erro: d.error };
}

async function baixarParaStorage(url, caminho) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`arquivo suspeito: ${buffer.length} bytes`);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`upload falhou: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

async function processarUmaVolta() {
  const { data: jobs, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('tipo', 'gerar')
    .eq('status', 'processando')
    .order('criado_em', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[worker-video] erro ao ler fila:', error.message);
    return;
  }
  if (!jobs?.length) return;

  for (const job of jobs) {
    try {
      const r = await consultar(job.wavespeed_task_id);

      if (r.status === 'created' || r.status === 'processing') {
        continue; // ainda cozinhando; consultar de novo na proxima volta
      }

      if (r.status === 'completed' && r.outputs[0]) {
        // A URL de saida da WaveSpeed e TEMPORARIA. Mesma licao que a autopsia
        // pagou com o CDN do Facebook: baixar antes de qualquer outra coisa,
        // senao o criativo evapora e ninguem entende por que.
        const caminho = `video/${job.id}.mp4`;
        const urlPublica = await baixarParaStorage(r.outputs[0], caminho);

        await supabase
          .from('video_jobs')
          .update({
            status: 'concluido',
            url_saida: urlPublica,
            concluido_em: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(`[worker-video] OK ${job.id} -> ${urlPublica}`);
        continue;
      }

      // failed | cancelled | timeout, ou completed sem outputs
      await supabase
        .from('video_jobs')
        .update({
          status: 'erro',
          erro: r.erro || `WaveSpeed devolveu status=${r.status} sem saida`,
          concluido_em: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.warn(`[worker-video] ERRO ${job.id}: ${r.status}`);
    } catch (err) {
      // Consultar falhou (rede, 5xx). NAO marca erro: a tarefa pode estar viva
      // do lado deles, e ja foi paga. Contar a tentativa e tentar de novo.
      await supabase
        .from('video_jobs')
        .update({ tentativas: (job.tentativas ?? 0) + 1, erro: err.message })
        .eq('id', job.id);
      console.warn(`[worker-video] consulta falhou ${job.id}: ${err.message}`);
    }
  }
}

// 🚨 O try/catch AQUI e obrigatorio, e a PRIMEIRA VERSAO DESTE PLANO O ESQUECEU.
// O comentario do topo diz "mesma licao do worker da autopsia" — e o
// scripts/worker-autopsia.py de fato envolve TODO o corpo do loop em
// try/except. Sem isso, uma excecao fora do try por-job (o proprio .select() da
// fila falhando, DNS, Supabase fora do ar) mata o processo EM SILENCIO, e um
// video JA PAGO fica sem ninguem consultando ate alguem perceber.
process.on('unhandledRejection', (err) => {
  console.error('[worker-video] rejeicao nao tratada:', err?.message ?? err);
});

while (true) {
  try {
    await processarUmaVolta();
  } catch (err) {
    console.error('[worker-video] erro inesperado na volta:', err?.message ?? err);
  }
  await new Promise((r) => setTimeout(r, INTERVALO_MS));
}
```

⚠️ **O `catch` por job precisa separar as duas etapas — a primeira versão deste
plano também errou isso.** Usava um `catch` só para `consultar()` e
`baixarParaStorage()`, sem teto de tentativas. São falhas de natureza oposta:

| Falhou | Significa | O certo |
|---|---|---|
| `consultar()` | a tarefa provavelmente segue viva lá | tentar de novo |
| `baixarParaStorage()` | a WaveSpeed já disse `completed` — pode ser rede passageira, **ou a URL temporária expirou** | tentar algumas vezes e **desistir** |

Sem teto, um job cuja URL expirou reincrementa `tentativas` **para sempre**, nunca
virando `concluido` nem `erro`, e o log só repete a mesma linha. Use
`MAX_TENTATIVAS = 5` e, ao estourar, marque `erro` com uma mensagem que diga **o
que aconteceu com o dinheiro**: *"vídeo foi gerado e cobrado, mas o download falhou
N vezes; a URL de saída da WaveSpeed pode ter expirado"*. Quem lê precisa entender
que pagou e perdeu, e por quê — sem isso vira uma hora de investigação.

- [ ] **Passo 2: Adicionar o script no `package.json`**

Dentro de `"scripts"`:

```json
"video:worker": "node --env-file=.env.local scripts/worker-video.mjs"
```

- [ ] **Passo 3: Rodar o worker contra o job real da Task 4**

```bash
npm run video:worker
```

Esperado: o banner com o caminho do node, e em poucas voltas
`[worker-video] OK <id> -> https://...supabase.co/storage/.../video/<id>.mp4`

- [ ] **Passo 4: Provar que o vídeo está mesmo no Storage**

Abrir a `url_saida` no navegador. Tem que tocar. Se abrir e não tocar, o download
pegou uma página de erro em vez do mp4 — conferir o tamanho do arquivo.

- [ ] **Passo 5: PARE E PEÇA**

Mensagem sugerida: `feat(video): worker que consulta a WaveSpeed e baixa pro Storage`

---

## Task 6: P1 — prompts de vídeo no copywriting

**Files:**
- Modificar: `src/app/api/copywriting/generate/route.ts` (~linhas 188-196 e ~241)
- Modificar: `agentes/copywriting/AGENTS.md` — **o system prompt**
- Modificar: `agentes/copywriting/SKILL.md`
- Modificar: `src/app/copywriting/page.tsx:10,55,144-162`
- Modificar: `src/app/revisor/page.tsx`

> 🚨 **O `AGENTS.md` é o que mais importa aqui, e foi esquecido na primeira versão
> deste plano.** Ele é concatenado no **system prompt** por
> `src/lib/agents/buildSystemPrompt.ts:55-57` e declara *"Formato de saída
> obrigatório — TRÊS campos"*. Pedir o 4º campo só no user prompt cria uma
> instrução enfática e anterior brigando com um pedido posterior: o JSON volta sem
> `prompts_videos`, e o `route.ts` engole em silêncio (`?? ''` → grava `null`, sem
> erro, sem log). **A tarefa pareceria pronta com o campo sempre vazio.**
>
> Regra geral que vale além desta tarefa: **ao adicionar campo ao contrato JSON de
> um agente, o `AGENTS.md` dele tem que mudar junto.** O user prompt sozinho não
> basta.
>
> Cuidado também com a ORDEM das seções no `SKILL.md`: as subseções "Anatomia" e
> "Regras que evitam retrabalho" não têm heading próprio e pertencem ao bloco de
> imagens. Inserir a seção de vídeo antes delas as deixa órfãs sob o heading
> errado — e o modelo passa a ler "idioma do texto na arte" como regra de vídeo,
> contradizendo a proibição de texto na tela. A seção de vídeo entra **depois**
> delas.

**Interfaces:**
- Consumes: coluna `prompts_videos` (Task 2).
- Produces: `workflow_copywriting.prompts_videos` preenchido. A Task 7 lê para
  oferecer os prompts na tela de vídeo.

- [ ] **Passo 1: Estender o contrato JSON na rota**

Em `src/app/api/copywriting/generate/route.ts`, na instrução (perto da linha 191),
adicionar depois do item sobre `prompts_imagens`:

```
3. Em "prompts_videos", escreva 3 prompts de video para anuncio. Regras:
   - 5 a 10 segundos cada.
   - Descreva MOVIMENTO: camera, acao, ritmo. E o que separa video de imagem.
   - Se o video deve partir de uma imagem ja gerada, cite [IMAGEM N] no inicio.
   - NUNCA peca texto na tela. Modelo de video escreve texto embolado, e a
     legenda e queimada depois no Remotion. Pedir texto aqui gasta dinheiro
     para produzir um defeito que o passo seguinte teria que cobrir.
```

E na linha do formato de retorno (~196):

```ts
Retorne em JSON estruturado:
{ "meta_ads_copy": "...", "pagina_vendas": "...", "prompts_imagens": "...", "prompts_videos": "..." }`;
```

- [ ] **Passo 2: Ler e gravar o campo novo**

Perto da linha 228, ao lado de `promptsImagens`:

```ts
promptsVideos = parsed.prompts_videos ?? '';
```

Declarar `let promptsVideos = '';` junto das outras, e no payload (~linha 241):

```ts
prompts_videos: promptsVideos || null,
```

- [ ] **Passo 3: Documentar no SKILL do agente**

Em `agentes/copywriting/SKILL.md`, seção nova espelhando a das imagens:

```markdown
### No campo `prompts_videos` — 3 prompts de vídeo

Mesmo espírito de `prompts_imagens`, com quatro diferenças que importam:

| Item | Regra |
|---|---|
| Duração | 5–10s. A WaveSpeed aceita 1–20s, mas anúncio raramente passa de 10 |
| Movimento | descreva câmera, ação e ritmo — é o que separa vídeo de imagem |
| Origem | citar `[IMAGEM N]` no início faz o vídeo partir daquela imagem |
| **Texto na tela** | **proibido** |

**Por que texto é proibido:** modelo de vídeo escreve texto embolado, e a legenda
é queimada depois no Remotion. Pedir texto aqui gasta dinheiro para produzir um
defeito que o passo seguinte teria que cobrir.
```

E no checklist do fim do arquivo:

```markdown
- [ ] Escrevi 3 prompts em `prompts_videos`, cada um com duração, movimento e
      **sem pedir texto na tela**?
```

- [ ] **Passo 4: Aba na `/copywriting`**

Em `src/app/copywriting/page.tsx`:

Linha 10 — estender o tipo:
```tsx
const [activeTab, setActiveTab] = useState<'legendas' | 'pagina' | 'imagens' | 'videos'>('pagina');
```

Linha 55 — no objeto mapeado, ao lado de `prompts_imagens`:
```tsx
prompts_videos: item.prompts_videos || ''
```

Depois do botão de "Prompts de Imagem" (linha 147), o botão novo. Importar
`Video` de `lucide-react`:
```tsx
<button
  onClick={() => setActiveTab('videos')}
  className={`pb-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'}`}>
  <Video size={16} /> Prompts de Vídeo
</button>
```

E na cadeia de renderização (linha 158-162), inserir antes do fallback:
```tsx
: activeTab === 'videos'
? (activeItem.prompts_videos || 'Nenhum prompt de vídeo gerado ainda.')
```

- [ ] **Passo 5: Mesma aba na `/revisor`**

Repetir o passo 4 em `src/app/revisor/page.tsx`, seguindo o padrão de abas que já
existe lá para `prompts_imagens`. (Não copie às cegas: confira os nomes de estado
do arquivo, que podem diferir dos da `/copywriting`.)

- [ ] **Passo 6: Verificar**

Run: `npx tsc --noEmit` — sem erro.

Com `npm run dev`, abrir `/copywriting`, escolher um item da fila e clicar a aba
nova. Item antigo mostra o texto de vazio — é o comportamento certo, porque a
coluna nasceu nula para tudo que já existia.

- [ ] **Passo 7: Gerar uma copy nova e conferir**

Na `/producao`, clicar "Gerar copy" numa campanha que tenha `autopsia_id`. Conferir
que `prompts_videos` veio preenchido com 3 prompts, e que **nenhum deles pede texto
na tela**. Se pedirem, a instrução do passo 1 não pegou — ajuste o texto do prompt.

- [ ] **Passo 8: PARE E PEÇA**

Mensagem sugerida: `feat(copywriting): prompts de video alimentados pelo dossie`

---

## Task 7: Tela no `/video-maker`

**Files:**
- Modificar: `src/app/video-maker/page.tsx`

**Interfaces:**
- Consumes: `POST /api/video/gerar` e `GET /api/video/jobs` (Task 4);
  `workflow_copywriting.prompts_videos` (Task 6); `video_jobs` via Realtime (Task 2).

- [ ] **Passo 1: Carregar os jobs e escutar em tempo real**

No componente, ao lado do que já existe para `workflow_video`:

```tsx
const [jobs, setJobs] = useState<any[]>([]);

async function fetchJobs() {
  const res = await fetch('/api/video/jobs');
  const json = await res.json();
  setJobs(json.jobs ?? []);
}

useEffect(() => {
  fetchJobs();
  const channel = supabase.channel('video_jobs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'video_jobs' }, fetchJobs)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

- [ ] **Passo 2: Confirmação com custo antes de gerar**

```tsx
const [gerando, setGerando] = useState(false);

async function gerarVideo(prompt: string, imageUrl?: string) {
  const duracao = 5;
  const modelo = 'confira no .env.local'; // exibido só para o texto da confirmação
  const ok = confirm(
    `Gerar 1 vídeo de ${duracao}s?\n\n` +
    `Modelo: ${modelo}\n` +
    `Custo ESTIMADO: consulte a tela após enviar.\n\n` +
    `💸 Isto consome crédito pré-pago da WaveSpeed e não tem como desfazer.`
  );
  if (!ok) return;

  setGerando(true);
  try {
    const res = await fetch('/api/video/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_url: imageUrl, duracao_s: duracao }),
    });
    const json = await res.json();
    if (!res.ok) { alert(`Falhou: ${json.error ?? 'erro desconhecido'}`); return; }
    await fetchJobs();
  } finally {
    setGerando(false);
  }
}
```

- [ ] **Passo 3: Lista de jobs com status**

```tsx
<div className="space-y-2">
  {jobs.map((j) => (
    <div key={j.id} className="bg-surface border border-surface-elevated rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white truncate">{j.prompt}</p>
        <span className={`text-xs px-2 py-1 rounded shrink-0 ${
          j.status === 'concluido' ? 'text-status-green'
          : j.status === 'erro' ? 'text-status-red'
          : 'text-status-yellow animate-pulse'
        }`}>
          {j.status}
        </span>
      </div>
      <p className="text-xs text-secondary mt-2">
        {j.modelo} · {j.duracao_s}s ·{' '}
        {j.custo_estimado_usd != null
          ? `US$ ${Number(j.custo_estimado_usd).toFixed(4)} (estimado)`
          : 'custo desconhecido — modelo fora da tabela de preços'}
      </p>
      {j.erro && <p className="text-xs text-status-red mt-1">{j.erro}</p>}
      {j.url_saida && (
        <video src={j.url_saida} controls className="mt-3 rounded max-w-full" />
      )}
    </div>
  ))}
</div>
```

⚠️ O texto **"(estimado)"** e o fallback **"custo desconhecido"** não são
decoração. A tabela de preços é mantida à mão e vai desatualizar; e mostrar
`US$ 0,0000` para um modelo fora da tabela faria o usuário aprovar um gasto
achando que é de graça.

- [ ] **Passo 4: Aviso de worker parado**

Se houver job em `processando` há mais de 10 minutos, mostrar:

```tsx
{jobs.some((j) => j.status === 'processando' &&
   Date.now() - new Date(j.criado_em).getTime() > 10 * 60_000) && (
  <div className="bg-surface border border-status-yellow/30 rounded-lg p-3 mb-4">
    <p className="text-sm text-status-yellow">
      Há vídeo esperando há mais de 10 minutos. O worker está rodando?
      <code className="ml-2 text-xs">npm run video:worker</code>
    </p>
  </div>
)}
```

- [ ] **Passo 5: Verificar**

Run: `npx tsc --noEmit` — sem erro.

Com `npm run dev` **e** `npm run video:worker` rodando: gerar um vídeo pela tela,
ver o status virar `processando` → `concluido` sozinho (Realtime, sem F5), e o
player aparecer tocando.

- [ ] **Passo 6: PARE E PEÇA**

Mensagem sugerida: `feat(video-maker): tela de geracao com custo e acompanhamento`

---

## Auto-revisão deste plano

**Cobertura do spec:** §4 → Task 2 · §5 (P1) → Task 6 · §6 (P2) → Tasks 3, 4, 5, 7 ·
§7 (ordem) → seguida, com a verificação real primeiro · §8 (armadilhas): URL que
expira → Task 5 passo 1 · worker nunca submete → Task 5 (banner + comentário) ·
custo é estimativa → Task 3 e Task 7 passo 3 · nada dispara sozinho → Global Constraints.

**Consistência de tipos:** `submeterVideo` / `consultarTarefa` / `estimarCustoUsd` /
`StatusWaveSpeed` / `ResultadoWaveSpeed` — mesmos nomes nas Tasks 3, 4 e 5. Colunas
de `video_jobs` idênticas entre a migration (Task 2), o insert (Task 4), o update
(Task 5) e a leitura (Task 7).

**Lacuna conhecida e aceita:** `CHAVE_DURACAO` e `CHAVE_IMAGEM` na Task 3 estão com
palpite (`duration` / `image`) e **têm que ser trocadas pelos valores reais da
Task 1**. Está marcado com ⚠️ no passo. Não é placeholder por descuido — é a
consequência honesta de a documentação não expor o formato do corpo por modelo.
