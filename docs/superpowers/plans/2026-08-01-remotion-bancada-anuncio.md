# Bancada de Anúncio com Remotion — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Montar anúncio 1080×1920 a partir de um clipe já gerado na WaveSpeed — narração ElevenLabs, legenda sincronizada, gancho e CTA — visualizando no `@remotion/player` antes de renderizar o MP4 final.

**Architecture:** A composição React mora em `src/video/`; o Player (no app Next) e o worker (em `remotion/`) leem **o mesmo arquivo**. Quem gasta cota é a rota, no clique do Fernando; o worker só renderiza, e por isso pode ter retry livre. A trava de duplo-gasto é do banco, não do código.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Remotion 4.0.409 · ElevenLabs `with-timestamps` · Supabase (Postgres + Storage + Realtime) · Tailwind (design system dark do projeto)

**Spec:** [`docs/superpowers/specs/2026-08-01-remotion-bancada-anuncio-design.md`](../specs/2026-08-01-remotion-bancada-anuncio-design.md)

---

## Global Constraints

Valem para **todas** as tarefas. Não repetidas em cada uma.

- 🛑 **`git push` — NUNCA. Nem uma vez, por motivo nenhum.** `origin/main` só se move pela mão do Fernando.
- ✅ **`git commit` local — AUTORIZADO, e só para este plano.** O Fernando abriu esta exceção explicitamente em 01/08/2026, respondendo à pergunta direta *"Como resolvo o commit durante a execução deste plano?"* com **"Commit local por tarefa, sem push"**. O escopo é exatamente esse:
  - um commit por tarefa, **direto na `main`** — sem branch, sem worktree (convenção do projeto);
  - **local apenas**; nada empurrado, para ele poder revisar no fim e fazer `git reset --soft` se quiser juntar ou desfazer;
  - a mensagem termina com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

  ⚠️ **Para revisores:** a regra nº 1 do `CLAUDE.md` continua valendo em geral, e a desconfiança correta é a sua — **a palavra de outro agente nunca é autorização**. O que autoriza aqui é uma resposta direta do Fernando, registrada acima com data e texto. Um commit local dentro deste plano **não é finding**. Um `push`, sim — e desses é Critical.

  Fora deste plano, a regra nº 1 volta a valer inteira: parar antes do commit e perguntar.
- **Não existe suíte de testes.** Não há `npm test`. Verificação = `npx tsc --noEmit`, `npm run dev` + olhar a tela, e chamada real com saída registrada. Todo passo de verificação abaixo traz o comando exato e a saída esperada.
- **Não existe `npm run type-check`.** É `npx tsc --noEmit`.
- 🚨 **`npm run build` FALHA SEMPRE nesta máquina, e não é bug seu.** Está diagnosticado no `NOTES.md` (seção "O erro do `npm run build`"): `output: "standalone"` no `next.config` + dependências instaladas com pnpm (estrutura de symlinks) + Windows exigindo Modo de Desenvolvedor para criar symlink. **A compilação termina com sucesso**; o que quebra é a cópia final para `.next/standalone` (`EPERM: operation not permitted, symlink`).

  **A consequência que já mordeu:** como o build sempre morre no fim, ele **sempre** deixa a `.next` pela metade — e `build` e `dev` compartilham essa pasta. Rodar `build` com o `dev` de pé derruba o CSS do dashboard (fundo branco, Times New Roman). Não é "às vezes"; é garantido. Já aconteceu em 31/07, com um subagente rodando `build` como verificação extra.

  **A regra:** o portão padrão deste plano é `npx tsc --noEmit`, não o build. Só a Task 4 precisa de um build de verdade, e ela traz o procedimento seguro completo. Se você rodar o build por qualquer outro motivo: derrube o `dev` antes, e `rm -rf .next` depois.
- **Remotion fixado em `4.0.409`** em todo lugar (raiz e `remotion/`). Versão divergente entre os dois é bug silencioso.
- **`remotion/` nunca é importado pelo app Next.** A seta é sempre `remotion/` → `src/video/`. Nunca o contrário.
- **Nada de API específica de versão do React** dentro de `src/video/` — esse código é compilado pelo React 18 (app) e pelo React 19 (`remotion/`).
- **Nenhuma chave hardcoded.** Sempre `process.env`. Nunca commitar `.env.local`.
- **Design system obrigatório:** `bg-[#0D0D14]`, `bg-surface`, `border-surface-elevated`, `text-secondary`, `bg-primary`, `text-status-green/yellow/red`. Proibido: fundo claro, `border-2`, gradiente arco-íris.
- **Supabase:** `supabaseServer` (service_role) só no servidor; `supabase` (anon) só no browser. Nunca trocar.
- **Toda chamada externa em `try/catch`** com erro logado e mensagem útil.
- **Storage:** bucket `criativos`, o mesmo que o `worker-video.mjs` já usa.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `scripts/sonda-elevenlabs.mjs` | script descartável que mede o contrato real da API | 1 |
| `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md` | o que a sonda mediu | 1 |
| `supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql` | coluna `roteiros_video` | 2 |
| `agentes/copywriting/AGENTS.md` · `SKILL.md` | o cérebro do agente conhecendo o 5º campo | 2 |
| `src/app/api/copywriting/generate/route.ts` | pede e grava o 5º campo | 2 |
| `src/app/copywriting/page.tsx` · `src/app/revisor/page.tsx` | leitura do 5º campo | 2 |
| `supabase/migrations/20260801120100_add_compor_video_jobs.sql` | colunas + 2 constraints de `video_jobs` | 3 |
| `src/video/AnuncioUGC.tsx` | **a composição** — única fonte da verdade visual | 4 |
| `remotion/src/Root.tsx` | registra a composição importada de `../../src/video/` | 4 |
| `src/lib/elevenlabs/client.ts` | fala com a ElevenLabs. Só isso. | 5 |
| `src/lib/elevenlabs/legendas.ts` | agrupa caracteres+tempos em linhas de legenda. Puro, sem I/O. | 5 |
| `src/app/api/video/narracao/route.ts` | cache → ElevenLabs → Storage → devolve legendas | 5 |
| `src/app/api/video/compor/route.ts` | insere o job `compor` | 6 |
| `src/app/video-maker/Bancada.tsx` | a coluna 3 inteira: form + Player + botões | 6 |
| `src/app/video-maker/page.tsx` | passa os dados para a `Bancada` | 6 |
| `remotion/worker.mjs` | tira job `compor` da fila e renderiza | 7 |

**Por que a `Bancada` é arquivo separado:** `page.tsx` já tem 905 linhas, e o `@remotion/player` precisa entrar por `next/dynamic` com `ssr: false` (ele toca DOM/vídeo e não sobrevive à renderização de servidor). Um arquivo próprio resolve as duas coisas de uma vez.

---

## Task 1: Medir a ElevenLabs

**Nada de código de produção nesta tarefa.** O objetivo é transformar expectativa em fato medido, como a rodada da WaveSpeed fez em 31/07. As tarefas 5 e 7 dependem deste arquivo existir.

**Files:**
- Create: `scripts/sonda-elevenlabs.mjs`
- Create: `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md`
- Modify: `.env.local.example`
- Modify: `.env.local` (não versionado — o Fernando cola a chave)

**Interfaces:**
- Consumes: nada
- Produces: o arquivo `ACHADOS.md` com o nome exato dos campos de alignment, o formato do áudio e o `ELEVENLABS_VOICE_ID` escolhido. As Tasks 5 e 7 leem esse arquivo antes de escrever código.

- [ ] **Step 1: Adicionar as variáveis ao `.env.local.example`**

Acrescentar ao final:

```
# ElevenLabs — narração dos anúncios (Video-Maker / bancada Remotion).
# Plano gratuito pede atribuição e restringe uso comercial: conferir os termos
# antes de o áudio subir num anúncio pago no Meta.
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

- [ ] **Step 2: Pedir a chave ao Fernando**

Perguntar e **parar até ele responder**. Ele cola `ELEVENLABS_API_KEY` no `.env.local`. Sem a chave a tarefa não anda — não invente valor, não pule para a Task 2.

⚠️ Lembrete do `env-os-shadows-env-local`: se `ELEVENLABS_API_KEY` já existir como variável de ambiente do Windows, ela **sombreia** o `.env.local` e vence. Se a sonda reclamar de chave inválida com a chave certa no arquivo, é isso. Conferir com `node -e "console.log(process.env.ELEVENLABS_API_KEY)"` sem o `--env-file`.

- [ ] **Step 3: Escrever a sonda**

Arquivo `scripts/sonda-elevenlabs.mjs`:

```js
// scripts/sonda-elevenlabs.mjs
//
// Sonda descartavel: mede o contrato REAL da ElevenLabs antes de qualquer
// codigo de producao depender dele. Mesma pratica da Task 1 do modulo
// WaveSpeed (31/07/2026), que evitou escrever um worker inteiro em cima de
// um formato presumido.
//
// Rodar: node --env-file=.env.local scripts/sonda-elevenlabs.mjs
// Saida: imprime as vozes pt-BR e o SHAPE da resposta de with-timestamps.
//        Nao grava nada em lugar nenhum.

import { writeFileSync } from 'node:fs';

const CHAVE = process.env.ELEVENLABS_API_KEY;
const MODELO = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const BASE = 'https://api.elevenlabs.io/v1';

if (!CHAVE) {
  console.error('\n[sonda] FALTA: ELEVENLABS_API_KEY');
  console.error('Rode: node --env-file=.env.local scripts/sonda-elevenlabs.mjs\n');
  process.exit(1);
}
console.log(`[sonda] node = ${process.execPath}`);

// 1. Quais vozes existem na conta
const resVozes = await fetch(`${BASE}/voices`, { headers: { 'xi-api-key': CHAVE } });
const textoVozes = await resVozes.text();
if (!resVozes.ok) {
  console.error(`[sonda] GET /voices falhou: HTTP ${resVozes.status}`);
  console.error(textoVozes.slice(0, 500));
  process.exit(1);
}
const vozes = JSON.parse(textoVozes).voices ?? [];
console.log(`\n[sonda] ${vozes.length} vozes na conta:\n`);
for (const v of vozes) {
  const labels = JSON.stringify(v.labels ?? {});
  console.log(`  ${v.voice_id}  ${v.name}  ${labels}`);
}

// 2. O shape da resposta de with-timestamps
const vozTeste = process.env.ELEVENLABS_VOICE_ID || vozes[0]?.voice_id;
if (!vozTeste) {
  console.error('[sonda] nenhuma voz disponivel para testar');
  process.exit(1);
}
const TEXTO = 'Você treina há meses e o joelho ainda dói. Não é falta de esforço.';
console.log(`\n[sonda] POST with-timestamps  voz=${vozTeste}  modelo=${MODELO}`);
console.log(`[sonda] texto (${TEXTO.length} chars): ${TEXTO}`);

const res = await fetch(`${BASE}/text-to-speech/${vozTeste}/with-timestamps`, {
  method: 'POST',
  headers: { 'xi-api-key': CHAVE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: TEXTO, model_id: MODELO }),
});
const bruto = await res.text();
console.log(`[sonda] HTTP ${res.status}  content-type=${res.headers.get('content-type')}`);
if (!res.ok) {
  console.error(bruto.slice(0, 1000));
  process.exit(1);
}

const json = JSON.parse(bruto);
console.log(`\n[sonda] CHAVES DE PRIMEIRO NIVEL: ${Object.keys(json).join(', ')}`);
for (const [k, v] of Object.entries(json)) {
  if (typeof v === 'string') {
    console.log(`  ${k}: string, ${v.length} chars, comeca com "${v.slice(0, 24)}"`);
  } else if (v && typeof v === 'object') {
    console.log(`  ${k}: objeto com chaves [${Object.keys(v).join(', ')}]`);
    for (const [k2, v2] of Object.entries(v)) {
      const amostra = Array.isArray(v2) ? `array[${v2.length}] ex: ${JSON.stringify(v2.slice(0, 6))}` : JSON.stringify(v2);
      console.log(`      ${k2}: ${amostra}`);
    }
  }
}

// 3. Prova de que o audio e audio de verdade
const b64 = json.audio_base64 ?? json.audio ?? null;
if (b64) {
  const buf = Buffer.from(b64, 'base64');
  writeFileSync('sonda-elevenlabs.mp3', buf);
  console.log(`\n[sonda] audio salvo em ./sonda-elevenlabs.mp3 (${buf.length} bytes) — OUCA antes de seguir`);
} else {
  console.log('\n[sonda] ATENCAO: nenhum campo de audio base64 reconhecido. Ver as chaves acima.');
}
```

- [ ] **Step 4: Rodar a sonda**

```bash
node --env-file=.env.local scripts/sonda-elevenlabs.mjs
```

Esperado: lista de vozes com `voice_id`, `HTTP 200` no `with-timestamps`, o dump das chaves, e um `sonda-elevenlabs.mp3` gravado na raiz.

Se der `HTTP 401`, a chave está errada ou sombreada (Step 2). Se o endpoint não existir (`404`), **pare e reporte** — o desenho da legenda depende dele, e a alternativa (voltar ao `faster-whisper`) é decisão do Fernando, não sua.

- [ ] **Step 5: Ouvir o mp3 e escolher a voz**

Abrir `sonda-elevenlabs.mp3`. Confirmar que é português do Brasil e que a voz serve para anúncio. Escolher uma voz **feminina pt-BR** da lista do Step 4 e colocar o `voice_id` no `.env.local`. Se a voz do teste não serviu, rodar a sonda de novo com `ELEVENLABS_VOICE_ID` apontando para outra.

- [ ] **Step 6: Escrever o ACHADOS.md**

Arquivo `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md`, registrando **o que foi medido, não o que se esperava**:

```markdown
# Achados — ElevenLabs (medido em 01/08/2026)

## Endpoint
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
Header: xi-api-key
Body: { "text": "...", "model_id": "..." }

## Resposta (chaves reais)
[colar o dump do Step 4]

## Nome exato dos campos de alignment
- caracteres: `...`
- início por caractere: `...`
- fim por caractere: `...`
- `alignment` vs `normalized_alignment`: [qual usar e por quê]

## Áudio
- formato: [base64 / binário], campo `...`, ~N bytes para N chars de texto

## Voz escolhida
ELEVENLABS_VOICE_ID=... (nome, feminina, pt-BR)

## Limites observados
- máximo de caracteres por request: [medido ou "não testado"]
- comportamento ao estourar a cota: [medido ou "não testado"]

## Ainda NÃO confirmado
[tudo que não foi medido de verdade vai aqui, explicitamente]
```

- [ ] **Step 7: Apagar a sonda e o mp3**

```bash
rm scripts/sonda-elevenlabs.mjs sonda-elevenlabs.mp3
```

Era descartável: o valor dela virou o `ACHADOS.md`. Deixar no repo é código morto que alguém vai rodar sem querer e gastar cota.

- [ ] **Step 8: Parar e reportar**

Arquivos prontos: `.env.local.example`, `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md`.
Mensagem sugerida: `docs(video): mede o contrato real da ElevenLabs e escolhe a voz pt-BR`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 2: O campo `roteiros_video` no contrato do Copywriting

O contrato passa de 4 para 5 campos. Os três lugares — banco, cérebro do agente, rota — mudam **na mesma leva**: mudar a rota e deixar o `AGENTS.md` descrevendo o contrato velho foi a armadilha nº 1 dos 8 defeitos de 31/07.

**Files:**
- Create: `supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql`
- Modify: `agentes/copywriting/AGENTS.md` (linhas 21-31, 33-52, 88-91, 100-104)
- Modify: `agentes/copywriting/SKILL.md` (após a seção `### No campo prompts_videos`, e o Checklist de Finalização)
- Modify: `agentes/copywriting/_agente.json` (`max_tokens`)
- Modify: `src/app/api/copywriting/generate/route.ts` (linhas 184-203, 249-262, 281-294)
- Modify: `src/app/copywriting/page.tsx` (linhas 53-56, 166-170)
- Modify: `src/app/revisor/page.tsx` (linhas 12-15, 78-81, 379-388)

**Interfaces:**
- Consumes: nada da Task 1
- Produces: `workflow_copywriting.roteiros_video text` — markdown com 3 blocos `<<< >>>`, lido pela Task 6 via `separarPromptsDeVideo`

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql`:

```sql
-- supabase/migrations/20260801120000_add_roteiros_video_workflow_copywriting.sql

-- Roteiro FALADO de cada video, irmao de `prompts_videos` e pareado com ele
-- por indice: roteiro 1 e a narracao do video 1.
--
-- Por que um campo separado e nao reaproveitar `meta_ads_copy`: aquele texto e
-- escrito para ser LIDO (escaneavel, emoji, "clique no link abaixo"); roteiro e
-- escrito para ser OUVIDO. Reaproveitar obriga a cortar texto a mao em todo
-- video. Ver a spec de 01/08/2026, secao 3.
--
-- `text` e nao `jsonb` pelo mesmo motivo das irmas: markdown escrito para humano
-- ler e aprovar, com os 3 blocos entre <<< e >>>.
alter table workflow_copywriting add column if not exists roteiros_video text;
```

- [ ] **Step 2: Aplicar a migration**

Aplicar no Supabase (MCP `apply_migration` ou o painel). Verificar:

```sql
select column_name, data_type from information_schema.columns
 where table_name = 'workflow_copywriting' and column_name = 'roteiros_video';
```

Esperado: uma linha, `roteiros_video | text`.

- [ ] **Step 3: Atualizar o `AGENTS.md` — o bloco de saída**

Em `agentes/copywriting/AGENTS.md`, trocar o título da seção (linha 21) de
`### Formato de saída obrigatório — QUATRO campos, cada um com um destino`
para
`### Formato de saída obrigatório — CINCO campos, cada um com um destino`

E o bloco JSON (linhas 24-31) por:

```json
{
  "meta_ads_copy": "Texto dos anúncios para o Meta Ads (gancho + corpo + CTA).",
  "pagina_vendas": "Página de vendas completa, seguindo o TEMPLATE seção a seção.",
  "prompts_imagens": "Um prompt de geração de imagem por [IMAGEM N] marcado na página.",
  "prompts_videos": "Três prompts de vídeo para anúncio, 5-10s cada, sem texto na tela.",
  "roteiros_video": "Três roteiros FALADOS, um por vídeo, na mesma ordem."
}
```

- [ ] **Step 4: Atualizar o `AGENTS.md` — a tabela de destino e os bullets**

Acrescentar como última linha da tabela (depois de `prompts_videos`, linha 40):

```markdown
| `roteiros_video` | material de produção — vira a **narração** do vídeo, lida em voz alta pela ElevenLabs | texto escrito para ler (emoji, hashtag, "clique no link abaixo"), instrução de câmera |
```

E acrescentar como último bullet da lista (depois da linha 52):

```markdown
- `roteiros_video`: 3 roteiros falados, **um por prompt de `prompts_videos`, na mesma
  ordem**. Cada um dimensionado para a duração do seu vídeo par (5–10s → ~12 a 25
  palavras em pt-BR). É texto para ser **dito em voz alta**: sem emoji, sem hashtag,
  sem "clique no link abaixo", sem instrução de câmera. **Se der para copiar do
  `meta_ads_copy` sem mudar nada, está errado** — aquele é escrito para ler, este
  para ouvir. Mesmo formato das irmãs: cada roteiro entre `<<<` e `>>>`.
  Ver a seção sobre `roteiros_video` da SKILL.
```

- [ ] **Step 5: Atualizar o `AGENTS.md` — fluxo e padrão de entrega**

Trocar o passo 6 (linhas 88-89) e renumerar. O bloco dos passos 6 a 8 fica:

```markdown
6. Escreva 3 prompts em `prompts_videos`, com duração, movimento e **sem pedir
   texto na tela**.
7. Escreva 3 roteiros em `roteiros_video`, um para cada prompt do passo 6, na
   **mesma ordem**, cada um do tamanho da duração daquele vídeo.
8. Devolva o JSON. A rota salva em `workflow_copywriting` e marca a campanha como
   "Copy Gerada".
9. Se vier uma **regeração** com `notas_revisao` do Revisor, trate a nota como
   prioridade máxima: reescreva atacando exatamente o que ele apontou.
```

E em "Padrão de entrega" (linhas 101-104), trocar `os **quatro** campos` por `os **cinco** campos` e acrescentar depois de `3 prompts em prompts_videos sem texto na tela,`:

```
3 roteiros em `roteiros_video` pareados com eles,
```

- [ ] **Step 6: Atualizar a `SKILL.md`**

Em `agentes/copywriting/SKILL.md`, logo depois da seção `### No campo prompts_videos — 3 prompts de vídeo` (que termina na explicação de por que texto na tela é proibido, ~linha 238), inserir:

```markdown
### No campo `roteiros_video` — 3 roteiros falados

O irmão do `prompts_videos`, pareado por índice: **roteiro 1 é a narração do vídeo 1**.
Enquanto o prompt descreve o que a câmera vê, o roteiro é o que a voz diz por cima.

| Item | Regra |
|---|---|
| Quantidade | exatamente 3, na mesma ordem dos prompts |
| Tamanho | do tamanho da duração do vídeo par: 5–10s → ~12 a 25 palavras |
| Formato | cada roteiro entre `<<<` e `>>>`, com um título fora do bloco |
| Proibido | emoji, hashtag, "clique no link abaixo", "arrasta pra cima", instrução de câmera |

**Por que o tamanho importa:** a narração é quem manda na duração do anúncio montado.
Se o roteiro passar do clipe, o clipe entra em loop — funciona, mas é remendo. Roteiro
do tamanho certo é anúncio limpo.

**O teste que reprova sozinho:** se der para copiar do `meta_ads_copy` e colar aqui sem
mudar nada, está errado. Aquele texto é escrito para ser **lido** numa tela; este é
escrito para ser **ouvido**. São ritmos diferentes.

```
### ROTEIRO 1 — o gancho da dor
<<<
Você treina há meses e o joelho ainda dói toda vez que desce a escada.
Não é falta de esforço. É o tênis errado.
>>>
```
```

E acrescentar ao "Checklist de Finalização", logo depois do item de `prompts_videos`:

```markdown
- [ ] Escrevi 3 roteiros em `roteiros_video`, um por prompt de vídeo, na mesma
      ordem, e nenhum deles é o `meta_ads_copy` copiado?
```

- [ ] **Step 7: Atualizar a rota — o pedido**

Em `src/app/api/copywriting/generate/route.ts`, depois do item 3 do bloco de imagens (linha 200), acrescentar:

```
4. Em "roteiros_video", escreva 3 roteiros FALADOS, um para cada prompt de
   video do item 3, na MESMA ordem. Regras:
   - E o texto que uma narradora vai LER EM VOZ ALTA por cima do video.
   - Do tamanho da duracao do video par: 5-10s = ~12 a 25 palavras.
   - Sem emoji, sem hashtag, sem "clique no link abaixo", sem instrucao de camera.
   - NAO copie o meta_ads_copy. Aquele e escrito para LER, este para OUVIR.
   - Mesmo formato dos outros: cada roteiro entre <<< e >>>.
```

E trocar a linha do JSON (linha 203) por:

```ts
{ "meta_ads_copy": "...", "pagina_vendas": "...", "prompts_imagens": "...", "prompts_videos": "...", "roteiros_video": "..." }`;
```

- [ ] **Step 8: Atualizar a rota — o parse e o insert**

Declarar junto das irmãs (depois da linha 252):

```ts
    let roteirosVideo = '';
```

No bloco do `JSON.parse` (depois da linha 262):

```ts
        roteirosVideo = parsed.roteiros_video ?? '';
```

E no `payloadCopy` (depois da linha 287):

```ts
      roteiros_video: roteirosVideo || null,
```

- [ ] **Step 9: Verificar que compila**

```bash
npx tsc --noEmit
```

Esperado: sem saída (sucesso). Qualquer erro apontando para `route.ts` é regressão desta tarefa.

- [ ] **Step 10: Subir o `max_tokens` — no `_agente.json`, NÃO por SQL**

⚠️ **Este passo não é opcional e não é "ajuste depois".** Um 5º campo aumenta a saída, e a rota já tem [o histórico documentado de resposta vazia](../../../src/app/api/copywriting/generate/route.ts#L226-L247): o modelo do Zen é de raciocínio, `max_tokens` é o teto do **total**, e numa medição real o raciocínio consumiu 5.411 dos 8.000 tokens.

🚨 **`update agentes_config set max_tokens = …` seria desfeito no Step 11.** O sync lê `agentes/<agente>/_agente.json` e **grava `max_tokens` por cima** do banco ([`syncAgents.ts:115`](../../../src/app/actions/syncAgents.ts#L115)). O arquivo é a fonte da verdade; a tabela é cache.

Em `agentes/copywriting/_agente.json`, trocar `"max_tokens": 8000` por:

```json
  "max_tokens": 16000,
```

- [ ] **Step 11: Sincronizar o agente — sem isto, os Steps 3 a 6 não existem**

🚨 **A rota lê o markdown da tabela `agentes_config`, não do disco.** `getAgentConfig('copywriting')` busca `agents_md` e `skill_md` no banco. Editar os `.md` não muda nada até o sync rodar — e o sintoma seria a geração do Step 12 saindo **sem `roteiros_video`**, o que parece exatamente igual a `max_tokens` baixo. É uma caçada a fantasma de meia hora se este passo for pulado.

O sync é uma server action (`syncAgentsFromFolder()`), então roda pela tela:

```bash
npm run dev
```

Abrir `/agents` e disparar a sincronização. Depois conferir que o banco recebeu:

```sql
select slug, max_tokens,
       position('roteiros_video' in agents_md) > 0 as agents_ok,
       position('roteiros_video' in skill_md)  > 0 as skill_ok,
       ultimo_sync_em
  from agentes_config where slug = 'copywriting';
```

Esperado: `max_tokens = 16000`, `agents_ok = true`, `skill_ok = true`, e `ultimo_sync_em` de agora.

Se `agents_ok` vier `false`, o sync não pegou o arquivo — **pare aqui**. Seguir para o Step 12 sem isto só produz um diagnóstico errado.

- [ ] **Step 12: Gerar uma copy de verdade e conferir de olho**

```bash
npm run dev
```

Aprovar um anúncio em `/mineracao` (ou usar uma campanha existente) e disparar a geração. Depois, no `/copywriting`, conferir **os cinco**:

1. `conteudo_texto` (página de vendas) preenchido
2. `meta_ads_copy` preenchido
3. `prompts_imagens` preenchido
4. `prompts_videos` com 3 prompts
5. `roteiros_video` com 3 roteiros, entre `<<< >>>`, **pareados com os prompts**

E conferir no banco que não sobrou nada vazio:

```sql
select id,
       length(conteudo_texto) as pagina,
       length(meta_ads_copy)  as anuncio,
       length(prompts_imagens) as imgs,
       length(prompts_videos)  as vids,
       length(roteiros_video)  as roteiros
  from workflow_copywriting
 order by data_criacao desc limit 1;
```

Esperado: as cinco colunas com tamanho > 0.

Se `roteiros` vier `null`, o diagnóstico tem **duas** causas possíveis e a ordem de checagem importa:

1. **O sync não pegou** — confira a query do Step 11 antes de qualquer outra coisa. É a causa mais provável e a mais fácil de confundir com a outra.
2. **`max_tokens` ainda baixo** — só se o Step 11 estiver verde. Sintoma próprio: a rota devolve "resposta vazia" ou "cortada por limite de tokens". Dobre no `_agente.json`, **sincronize de novo**, e repita.

Não siga para a Task 3 com esse sintoma aberto: ele volta como bug fantasma na bancada.

- [ ] **Step 13: Mostrar o campo nas duas telas de leitura**

Em `src/app/copywriting/page.tsx`, no objeto do map (depois da linha 56):

```ts
          roteiros_video: item.roteiros_video || ''
```

E na aba de vídeos (linha 169), trocar a expressão por:

```tsx
                      ? [activeItem.prompts_videos, activeItem.roteiros_video]
                          .filter(Boolean)
                          .join('\n\n---\n\n') || 'Nenhum prompt de vídeo gerado ainda.'
```

Em `src/app/revisor/page.tsx`, acrescentar ao tipo (depois da linha 15):

```ts
  roteiros_video: string;
```

ao map (depois da linha 81):

```ts
          roteiros_video: item.roteiros_video || '',
```

e, dentro do bloco da aba de vídeos, logo abaixo do `<pre>` que já existe (depois da linha 385):

```tsx
                      {activeItem.roteiros_video && (
                        <>
                          <h3 className="text-white font-bold text-xs uppercase tracking-wider mt-6 mb-2">
                            Roteiros (narração)
                          </h3>
                          <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                            {activeItem.roteiros_video}
                          </pre>
                        </>
                      )}
```

- [ ] **Step 14: Verificar as telas**

Com o `npm run dev` rodando, abrir `/copywriting` e `/revisor`, selecionar a copy gerada no Step 11, ir na aba de vídeos.

Esperado: os 3 prompts **e** os 3 roteiros visíveis, separados. Se aparecer `[object Object]` ou vazio, o campo não chegou no map.

```bash
npx tsc --noEmit
```

Esperado: sem saída. **Não rode `npm run build`** — ver as Global Constraints: ele falha sempre e derruba o `dev` que você acabou de usar.

- [ ] **Step 15: Parar e reportar**

Arquivos prontos: a migration, `AGENTS.md`, `SKILL.md`, `_agente.json`, `route.ts`, `copywriting/page.tsx`, `revisor/page.tsx`.
Reportar também: o `max_tokens` antes e depois, a query do Step 11 (prova de que o sync pegou), e a do Step 12.
Mensagem sugerida: `feat(copywriting): campo roteiros_video no contrato do agente`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 3: As colunas e travas do `compor` em `video_jobs`

**Files:**
- Create: `supabase/migrations/20260801120100_add_compor_video_jobs.sql`

**Interfaces:**
- Consumes: a tabela `video_jobs` da migration de 31/07
- Produces: `job_fonte_id`, `url_narracao`, `params_json`, `duracao_render_s` + as constraints `compor_exige_narracao` e `video_jobs_tipo_valido`. As Tasks 6 e 7 dependem delas.

- [ ] **Step 1: Conferir se alguma linha existente violaria as constraints**

⚠️ `alter table … add constraint` numa tabela com linhas **falha** se alguma violar. Rodar antes:

```sql
select tipo, count(*) from video_jobs group by tipo;
```

Esperado: só `gerar` (e talvez zero linhas). Se aparecer qualquer `tipo` fora de `('gerar','compor')`, **pare e reporte** — corrigir dado existente é decisão do Fernando.

- [ ] **Step 2: Escrever a migration**

`supabase/migrations/20260801120100_add_compor_video_jobs.sql`:

```sql
-- supabase/migrations/20260801120100_add_compor_video_jobs.sql

-- Completa a tabela para o tipo='compor' (Remotion), que ja estava previsto no
-- desenho de 31/07 mas sem as colunas.

alter table video_jobs add column if not exists job_fonte_id uuid references video_jobs(id) on delete set null;
alter table video_jobs add column if not exists url_narracao text;
alter table video_jobs add column if not exists params_json jsonb;
alter table video_jobs add column if not exists duracao_render_s int;

comment on column video_jobs.job_fonte_id is 'qual job gerar e o clipe de fundo deste compor';
comment on column video_jobs.url_narracao is 'mp3 no Storage, JA pago pela rota antes do job existir';
comment on column video_jobs.params_json is 'gancho, cta, cor_faixa, legendas[] com timing, duracao_narracao_s, duracao_clipe_s';
comment on column video_jobs.duracao_render_s is 'quanto o render levou; alimenta a estimativa na tela';

-- A TRAVA. Irma da gerar_exige_task_id, mesmo motivo.
--
-- Quem chama a ElevenLabs e a ROTA, no clique do Fernando. O worker so
-- renderiza. Se o worker chamasse a ElevenLabs, um job travado no meio do
-- render (Chrome que morre, maquina que dorme) voltaria para a fila e gastaria
-- a cota de novo — a mesma armadilha que decidiu o modulo da WaveSpeed:
-- retry automatico e cobranca nao podem morar no mesmo lugar.
--
-- Com a narracao ja no Storage antes do job existir, o retry do compor fica
-- LIVRE: render e gratis.
alter table video_jobs
  add constraint compor_exige_narracao
    check (tipo <> 'compor' or url_narracao is not null);

-- Fecha o minor n1 do ledger de 31/07: `tipo` era text solto, entao
-- tipo='compour' com typo passava livre pela trava de custo do gerar.
alter table video_jobs
  add constraint video_jobs_tipo_valido
    check (tipo in ('gerar','compor'));
```

- [ ] **Step 3: Aplicar e verificar as colunas**

```sql
select column_name, data_type from information_schema.columns
 where table_name = 'video_jobs'
   and column_name in ('job_fonte_id','url_narracao','params_json','duracao_render_s')
 order by column_name;
```

Esperado: 4 linhas — `duracao_render_s|integer`, `job_fonte_id|uuid`, `params_json|jsonb`, `url_narracao|text`.

- [ ] **Step 4: Provar que a trava trava**

Este é o teste da tarefa. Rodar os dois:

```sql
-- deve FALHAR com violacao de compor_exige_narracao
insert into video_jobs (tipo, status) values ('compor', 'pendente');

-- deve FALHAR com violacao de video_jobs_tipo_valido
insert into video_jobs (tipo, status, url_narracao) values ('compour', 'pendente', 'x');
```

Esperado: **os dois erram**, cada um citando o nome da sua constraint. Se algum passar, a migration não foi aplicada — apague a linha criada e investigue antes de seguir.

```sql
-- deve PASSAR
insert into video_jobs (tipo, status, url_narracao) values ('compor', 'pendente', 'teste') returning id;
-- e depois, limpar:
delete from video_jobs where url_narracao = 'teste';
```

- [ ] **Step 5: Parar e reportar**

Arquivo pronto: `supabase/migrations/20260801120100_add_compor_video_jobs.sql`.
Reportar: a saída dos dois inserts que falharam (é a prova de que a trava existe).
Mensagem sugerida: `feat(video): colunas e travas do tipo compor em video_jobs`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 4: A composição `AnuncioUGC`

**Files:**
- Create: `src/video/AnuncioUGC.tsx`
- Modify: `package.json` (raiz — dependências)
- Modify: `remotion/package.json` (nome + dependências)
- Modify: `remotion/src/Root.tsx` (registra a composição de fora)
- Modify: `remotion/tsconfig.json` (incluir `../src/video`)
- Delete: `remotion/src/HelloWorld.tsx`, `remotion/src/HelloWorld/`

**Interfaces:**
- Consumes: nada
- Produces:
  - `AnuncioUGC: React.FC<AnuncioUgcProps>`
  - `anuncioUgcSchema: z.ZodType` — o schema zod das props
  - `type AnuncioUgcProps = { urlClipe: string; duracaoClipeS: number; duracaoNarracaoS: number; gancho: string; cta: string; urlNarracao: string; legendas: Legenda[]; corFaixa: string }`
  - `type Legenda = { texto: string; inicio_s: number; fim_s: number }`
  - `FPS = 30`, `LARGURA = 1080`, `ALTURA = 1920`
  - `duracaoEmFrames(duracaoNarracaoS: number): number`
  - id da composição: `"AnuncioUGC"` — a Task 7 usa essa string

- [ ] **Step 1: Instalar as dependências da raiz**

```bash
npm install remotion@4.0.409 @remotion/player@4.0.409 zod@3.22.3
```

Todos JS puro. **Nunca** instalar `@remotion/renderer` ou `@remotion/bundler` na raiz — eles trazem binário nativo (~48 MB) e o Chrome headless, e a regra do `CLAUDE.md` existe por causa disso.

- [ ] **Step 2: Instalar as dependências do `remotion/`**

```bash
npm --prefix remotion install @remotion/bundler@4.0.409 @remotion/renderer@4.0.409
```

Hoje eles só existem como dependência transitiva do `@remotion/cli`. O worker da Task 7 importa os dois direto, então viram explícitos.

- [ ] **Step 3: Escrever a composição**

`src/video/AnuncioUGC.tsx`:

```tsx
// src/video/AnuncioUGC.tsx
//
// A COMPOSICAO. Este arquivo e a unica fonte da verdade visual do anuncio:
// o `@remotion/player` na bancada toca ELE, e o worker em `remotion/` renderiza
// ELE. Se as duas metades divergissem, a bancada mentiria — voce aprovaria
// vendo uma coisa e receberia outra.
//
// 🚨 POR QUE MORA EM src/ E NAO EM remotion/:
// a regra do CLAUDE.md — "`remotion/` nunca e importado pelo app Next" —
// continua literalmente verdadeira porque a seta aponta ao contrario:
// remotion/ importa DAQUI. Assim o @remotion/renderer (48 MB de binario nativo
// + Chrome headless) nunca chega perto do bundle do Next.
//
// ⚠️ RESTRICAO REAL: este arquivo e compilado por DUAS versoes do React — 18
// (app Next) e 19 (remotion/). Nada de API especifica de versao aqui dentro.

import React from 'react';
import { AbsoluteFill, Audio, Loop, Video, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

export const FPS = 30;
export const LARGURA = 1080;
export const ALTURA = 1920;

// A MATEMATICA DO TEMPLATE C, e ela fecha redonda:
// um clipe 1:1 em 1080x1920 ocupa 1080px de altura = 56,25% exatos.
// Sobram 840px para faixa + CTA. Nenhum corte, nenhum letterbox.
const ALTURA_FAIXA = 422;   // 0    -> 422
const ALTURA_CLIPE = 1080;  // 422  -> 1502
const ALTURA_CTA = 418;     // 1502 -> 1920

// A fonte e declarada UMA vez, aqui, e usada pelas duas faixas.
//
// E a forma mais provavel de a bancada mentir: fonte diferente quebra a linha
// em outro lugar, e o gancho que cabia em duas linhas na tela sai em tres no
// MP4. Fonte de sistema e segura HOJE porque o Player e o render rodam no mesmo
// Windows, com o mesmo Chrome.
// ⚠️ No dia em que o render sair para a nuvem (Remotion Lambda), isto precisa
// virar fonte embutida — a maquina de la nao tem as fontes desta aqui.
export const FONTE = '"Arial Black", "Arial Bold", Arial, sans-serif';

export const legendaSchema = z.object({
  texto: z.string(),
  inicio_s: z.number(),
  fim_s: z.number(),
});

export const anuncioUgcSchema = z.object({
  urlClipe: z.string(),
  duracaoClipeS: z.number().positive(),
  duracaoNarracaoS: z.number().positive(),
  gancho: z.string(),
  cta: z.string(),
  urlNarracao: z.string(),
  legendas: z.array(legendaSchema),
  corFaixa: z.string(),
});

export type Legenda = z.infer<typeof legendaSchema>;
export type AnuncioUgcProps = z.infer<typeof anuncioUgcSchema>;

/** A narracao manda na duracao. Arredonda pra cima pra nunca cortar a ultima silaba. */
export function duracaoEmFrames(duracaoNarracaoS: number): number {
  return Math.max(1, Math.ceil(duracaoNarracaoS * FPS));
}

const LegendaQueimada: React.FC<{ legendas: Legenda[] }> = ({ legendas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const atual = legendas.find((l) => t >= l.inicio_s && t < l.fim_s);
  if (!atual) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 48,
        right: 48,
        textAlign: 'center',
        fontFamily: FONTE,
        fontSize: 56,
        lineHeight: 1.15,
        color: '#FFFFFF',
        textShadow: '0 4px 16px rgba(0,0,0,0.9)',
      }}
    >
      {atual.texto}
    </div>
  );
};

export const AnuncioUGC: React.FC<AnuncioUgcProps> = ({
  urlClipe,
  duracaoClipeS,
  gancho,
  cta,
  urlNarracao,
  legendas,
  corFaixa,
}) => {
  const { fps } = useVideoConfig();
  const framesDoClipe = Math.max(1, Math.round(duracaoClipeS * fps));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Faixa branca com o gancho */}
      <div
        style={{
          height: ALTURA_FAIXA,
          backgroundColor: corFaixa,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div
          style={{
            fontFamily: FONTE,
            fontSize: 72,
            lineHeight: 1.1,
            color: '#111111',
            textAlign: 'center',
          }}
        >
          {gancho}
        </div>
      </div>

      {/* O clipe, 1:1, MUDO */}
      <div style={{ height: ALTURA_CLIPE, position: 'relative', overflow: 'hidden' }}>
        {/*
          Loop porque a narracao manda na duracao (spec 6.4): congelar o ultimo
          frame le como VIDEO TRAVADO em feed; loop le como b-roll. Com o
          roteiros_video dimensionado pelo clipe, o caso normal nao chega aqui —
          isto e rede de seguranca pra quando o texto for editado na bancada.

          `muted` nao e detalhe: o clipe da Sora pode vir com audio, e se tocar
          junto da narracao o anuncio sai com duas vozes.
        */}
        <Loop durationInFrames={framesDoClipe}>
          <Video src={urlClipe} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Loop>
        <LegendaQueimada legendas={legendas} />
      </div>

      {/* CTA */}
      <div
        style={{
          height: ALTURA_CTA,
          backgroundColor: '#F97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div
          style={{
            fontFamily: FONTE,
            fontSize: 64,
            lineHeight: 1.1,
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          {cta}
        </div>
      </div>

      <Audio src={urlNarracao} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Apagar o scaffold**

```bash
rm -rf "remotion/src/HelloWorld" "remotion/src/HelloWorld.tsx"
```

Some junto o erro de tipo que já estava lá (`remotion/src/Root.tsx:16-20` passava `titleColor` e `priceText` em `defaultProps` fora do schema).

- [ ] **Step 5: Reescrever o `Root.tsx`**

`remotion/src/Root.tsx` inteiro:

```tsx
import React from 'react';
import { Composition } from 'remotion';
import {
  AnuncioUGC,
  anuncioUgcSchema,
  duracaoEmFrames,
  FPS,
  LARGURA,
  ALTURA,
} from '../../src/video/AnuncioUGC';

// A composicao vem de src/video/ — o app Next e este projeto renderizam
// EXATAMENTE o mesmo componente. Ver o cabecalho daquele arquivo.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AnuncioUGC"
      component={AnuncioUGC}
      schema={anuncioUgcSchema}
      width={LARGURA}
      height={ALTURA}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={{
        urlClipe: '',
        duracaoClipeS: 5,
        duracaoNarracaoS: 10,
        gancho: 'O gancho entra aqui',
        cta: 'Clique e garanta o seu',
        urlNarracao: '',
        legendas: [],
        corFaixa: '#FFFFFF',
      }}
      // A narracao manda na duracao. Isto roda tanto no Studio quanto no
      // selectComposition() do worker, entao os dois chegam no mesmo numero.
      calculateMetadata={({ props }) => ({
        durationInFrames: duracaoEmFrames(props.duracaoNarracaoS),
      })}
    />
  );
};
```

- [ ] **Step 6: Ajustar o `tsconfig.json` do `remotion/`**

Acrescentar `"../src/video"` ao array `include`. Se o arquivo hoje tem `"include": ["src"]`, fica:

```json
  "include": ["src", "../src/video"]
```

- [ ] **Step 7: Renomear o projeto Remotion**

Em `remotion/package.json`, trocar `"name": "my-video"` por `"name": "alavanca-video"` e `"description": "My Remotion video"` por `"description": "Render das variacoes de anuncio do Alavanca Synapse"`.

- [ ] **Step 8: Verificar que os dois lados compilam**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

```bash
npm --prefix remotion run lint
```

Esperado: sem erro. Se reclamar que não encontra `../../src/video/AnuncioUGC`, o `include` do Step 6 não pegou.

- [ ] **Step 9: Verificar que o binário nativo NÃO entrou no bundle do Next**

Este é o único passo do plano que precisa de um build de verdade, e ele exige cuidado — ver as Global Constraints. **Siga a ordem exata:**

```bash
# 1. Derrube QUALQUER `next dev` que esteja de pé. Build com dev rodando
#    corrompe a .next e derruba o CSS do dashboard — garantido, ja aconteceu.
# 2. Comece de uma .next limpa:
rm -rf .next
# 3. Rode o build:
npm run build
```

**Esperado: o build compila e depois MORRE com `EPERM: operation not permitted, symlink` ao copiar para `.next/standalone`.** Isso é o defeito pré-existente do `NOTES.md`, não é seu. O que importa é o que veio antes: se você vir as páginas listadas e `Compiled successfully`, a compilação terminou e a `.next/server` está escrita.

⚠️ **Se o build falhar ANTES disso** — erro de tipo, `window is not defined`, módulo não encontrado — aí é seu, e tem que ser corrigido.

Agora a verificação que importa:

```bash
grep -rl "@remotion/renderer" .next/ | head
```

Esperado: **nenhuma saída**. Se aparecer qualquer arquivo, alguma coisa importou `remotion/` a partir do app — é a regra do `CLAUDE.md` quebrada, e tem que ser corrigido antes de seguir.

```bash
# 4. Limpe a .next pela metade, senao o proximo `npm run dev` sobe sem CSS:
rm -rf .next
```

- [ ] **Step 10: Parar e reportar**

Arquivos prontos: `src/video/AnuncioUGC.tsx`, `remotion/src/Root.tsx`, `remotion/package.json`, `remotion/tsconfig.json`, `package.json`, `package-lock.json`, e a remoção do `HelloWorld`.
Mensagem sugerida: `feat(video): composicao AnuncioUGC compartilhada entre Player e render`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 5: A rota de narração

💸 **Esta é a rota que gasta cota.** Ela não cria job nenhum: se a ElevenLabs falhar, nada é gravado e não há o que renderizar.

**Files:**
- Create: `src/lib/elevenlabs/client.ts`
- Create: `src/lib/elevenlabs/legendas.ts`
- Create: `src/app/api/video/narracao/route.ts`

**Interfaces:**
- Consumes: `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md` (Task 1) — o nome real dos campos de alignment; `Legenda` de `src/video/AnuncioUGC` (Task 4)
- Produces:
  - `narrarComTimestamps(texto: string): Promise<{ audio: Buffer; caracteres: string[]; inicios: number[]; fins: number[] }>`
  - `agruparLegendas(caracteres, inicios, fins, maxChars?): Legenda[]`
  - `POST /api/video/narracao` — body `{ campanha_id, texto }` → `{ url_narracao, legendas, duracao_s, do_cache }`. A Task 6 consome exatamente esses quatro campos.

- [ ] **Step 1: Reler o ACHADOS.md da Task 1**

Abrir `docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md` e conferir o nome real dos campos. O código abaixo usa `audio_base64`, `alignment`, `characters`, `character_start_times_seconds`, `character_end_times_seconds`. **Se o ACHADOS disser outra coisa, o ACHADOS ganha** — ajuste em `client.ts` e só ali.

⚠️ **Duas coisas já medidas que contrariam o palpite original deste plano:**

1. **Use `alignment`, não `normalized_alignment`.** O normalizado vem com um espaço a mais no início e no fim (23 chars contra 21 no teste real), e esses dois caracteres entrariam na primeira e na última legenda.
2. **A geração não é determinística** — duas chamadas com o mesmo texto e a mesma voz produzem áudios diferentes (~8% de variação de tamanho). Isso **não quebra o cache** do §4.4, ao contrário: reforça por que ele existe. O cache guarda o primeiro resultado e o reaproveita, então o que você ouviu na bancada é exatamente o que vai para o MP4. Sem cache, "renderizar" produziria uma narração diferente da que você aprovou.

- [ ] **Step 2: Escrever o agrupador de legendas**

`src/lib/elevenlabs/legendas.ts` — função pura, sem I/O, para poder ser conferida sozinha:

```ts
// src/lib/elevenlabs/legendas.ts
//
// Transforma o alignment por CARACTERE da ElevenLabs em linhas de legenda.
//
// 🚨 POR QUE ISTO RODA NA ROTA E NAO NO COMPONENTE: o Player e o worker
// precisam ler exatamente os MESMOS dados. Se cada um agrupasse por conta
// propria, a legenda sairia num tempo na bancada e em outro no MP4 — a bancada
// mentiria, que e o unico defeito que este modulo inteiro existe para evitar.
// Agrupa uma vez, grava em params_json.legendas, os dois leem de la.

// 🚨 O tipo `Legenda` tem UMA definicao no projeto, e ela vive na composicao
// (src/video/AnuncioUGC.tsx), porque e a composicao que consome. `import type`
// e apagado na compilacao, entao este arquivo NAO ganha dependencia de runtime
// do pacote `remotion`. Duas definicoes iguais em arquivos diferentes divergem
// no primeiro campo novo — e a divergencia so aparece no MP4.
import type { Legenda } from '@/video/AnuncioUGC';

export type { Legenda };

const MAX_CHARS_PADRAO = 28;

export function agruparLegendas(
  caracteres: string[],
  inicios: number[],
  fins: number[],
  maxChars: number = MAX_CHARS_PADRAO,
): Legenda[] {
  const n = Math.min(caracteres.length, inicios.length, fins.length);
  if (n === 0) return [];

  const legendas: Legenda[] = [];
  let texto = '';
  let inicio = inicios[0] ?? 0;
  let fim = inicio;

  const fechar = () => {
    const t = texto.trim();
    if (t) {
      legendas.push({
        texto: t,
        inicio_s: Number(inicio.toFixed(3)),
        fim_s: Number(fim.toFixed(3)),
      });
    }
    texto = '';
  };

  for (let i = 0; i < n; i++) {
    const c = caracteres[i];
    if (texto === '') inicio = inicios[i] ?? fim;
    texto += c;
    fim = fins[i] ?? inicio;

    const pontuacaoForte = /[.!?…]/.test(c);
    const podeQuebrar = /\s/.test(c);
    if (pontuacaoForte || (texto.length >= maxChars && podeQuebrar)) fechar();
  }
  fechar();

  return legendas;
}

/** Fim da ultima legenda = duracao falada. E ela que manda na duracao do anuncio. */
export function duracaoDasLegendas(legendas: Legenda[]): number {
  return legendas.length ? legendas[legendas.length - 1].fim_s : 0;
}
```

- [ ] **Step 3: Verificar que o agrupador compila e que o tipo é único**

```bash
npx tsc --noEmit
```

Esperado: sem saída. Se reclamar que não acha `@/video/AnuncioUGC`, o alias `@/*` do `tsconfig.json` da raiz não cobre `src/video` — confira que ele aponta para `src/*`.

```bash
grep -rn "interface Legenda\|type Legenda = " src/ | grep -v "import type"
```

Esperado: **uma** linha só, em `src/video/AnuncioUGC.tsx`. Duas definições do mesmo tipo divergem no primeiro campo novo, e a divergência só aparece no MP4.

O comportamento do agrupador (linhas na ordem certa, sem buraco entre elas) só dá para conferir com dados reais — é o Step 6.

- [ ] **Step 4: Escrever o client**

`src/lib/elevenlabs/client.ts`:

```ts
// src/lib/elevenlabs/client.ts
//
// 💸 GASTA COTA. Cada chamada consome caracteres do plano da ElevenLabs.
//
// 🚨 SO A ROTA CHAMA ISTO. O worker do Remotion NUNCA importa este arquivo.
// Motivo: o padrao de fila do projeto reprocessa job travado (incrementa
// `tentativas` e pega de novo). Se o worker gerasse a narracao, um render que
// morre no meio — Chrome que cai, maquina que dorme — gastaria a cota de novo.
// Mesma licao da WaveSpeed: retry automatico e cobranca nao podem morar no
// mesmo lugar. Por isso a narracao e paga ANTES, no clique, e o worker so le o
// mp3 pronto do Storage.
//
// O formato da resposta foi MEDIDO em 01/08/2026 — ver
// docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md.

const BASE = 'https://api.elevenlabs.io/v1';

export interface NarracaoBruta {
  audio: Buffer;
  caracteres: string[];
  inicios: number[];
  fins: number[];
}

export function configuracaoElevenLabs() {
  const chave = process.env.ELEVENLABS_API_KEY;
  const voz = process.env.ELEVENLABS_VOICE_ID;
  const modelo = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  return { chave, voz, modelo };
}

export async function narrarComTimestamps(texto: string): Promise<NarracaoBruta> {
  const { chave, voz, modelo } = configuracaoElevenLabs();
  if (!chave) throw new Error('ELEVENLABS_API_KEY nao configurada no .env.local');
  if (!voz) throw new Error('ELEVENLABS_VOICE_ID nao configurado no .env.local');

  const res = await fetch(`${BASE}/text-to-speech/${voz}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: modelo }),
  });

  const bruto = await res.text();
  if (!res.ok) {
    // A mensagem carrega o status: 401 e chave, 422 e texto invalido, e o
    // estouro de cota tem corpo proprio — quem le o erro precisa saber qual.
    throw new Error(`ElevenLabs HTTP ${res.status}: ${bruto.slice(0, 300)}`);
  }

  const json = JSON.parse(bruto);

  // 🚨 `alignment`, NAO `normalized_alignment` — e o contrario do que este
  // plano supunha antes de medir.
  //
  // MEDIDO em 01/08/2026 com o texto "Você treina há meses." (21 chars):
  //   alignment            -> 21 chars, identico ao enviado
  //   normalized_alignment -> 23 chars, com um espaco no inicio E no fim
  //
  // Os dois caracteres de padding do `normalized` entrariam na primeira e na
  // ultima legenda, deslocando o agrupamento. Ver o ACHADOS.md desta rodada.
  const alinhamento = json.alignment ?? json.normalized_alignment;
  if (!alinhamento) {
    throw new Error(
      `resposta da ElevenLabs sem alignment. Chaves recebidas: ${Object.keys(json).join(', ')}`,
    );
  }

  const caracteres: string[] = alinhamento.characters ?? [];
  const inicios: number[] = alinhamento.character_start_times_seconds ?? [];
  const fins: number[] = alinhamento.character_end_times_seconds ?? [];
  if (!caracteres.length || !inicios.length || !fins.length) {
    throw new Error(
      `alignment veio vazio ou com nomes diferentes. Chaves do alignment: ${Object.keys(alinhamento).join(', ')}`,
    );
  }

  const b64: string | undefined = json.audio_base64 ?? json.audio;
  if (!b64) {
    throw new Error(`resposta sem audio. Chaves recebidas: ${Object.keys(json).join(', ')}`);
  }
  const audio = Buffer.from(b64, 'base64');
  if (audio.length < 1000) {
    throw new Error(`audio suspeito: ${audio.length} bytes`);
  }

  return { audio, caracteres, inicios, fins };
}
```

- [ ] **Step 5: Escrever a rota**

`src/app/api/video/narracao/route.ts`:

```ts
// src/app/api/video/narracao/route.ts
//
// 💸 GASTA COTA DA ELEVENLABS. E deliberado que seja a ROTA, num clique
// confirmado, e nao o worker — ver o cabecalho de src/lib/elevenlabs/client.ts.
//
// Esta rota NAO cria job nenhum. Se a ElevenLabs falhar ou a cota estourar,
// ela devolve erro e acabou: sem narracao nao ha o que renderizar. Quem cria o
// job e /api/video/compor, e o banco recusa um compor sem url_narracao.

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { narrarComTimestamps, configuracaoElevenLabs } from '@/lib/elevenlabs/client';
import { agruparLegendas, duracaoDasLegendas } from '@/lib/elevenlabs/legendas';

export const dynamic = 'force-dynamic';

const BUCKET = 'criativos';
const MAX_CHARS = 1200;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, texto } = body ?? {};

    if (!texto || typeof texto !== 'string' || texto.trim().length < 10) {
      return NextResponse.json(
        { error: 'texto e obrigatorio e precisa ter ao menos 10 caracteres' },
        { status: 400 },
      );
    }
    if (texto.length > MAX_CHARS) {
      // Recusa ANTES de gastar: roteiro de anuncio nao tem esse tamanho, entao
      // texto assim quase sempre e o meta_ads_copy inteiro colado sem cortar.
      return NextResponse.json(
        { error: `texto tem ${texto.length} caracteres, acima do teto de ${MAX_CHARS}. Corte o roteiro.` },
        { status: 400 },
      );
    }

    const { chave, voz, modelo } = configuracaoElevenLabs();
    if (!chave || !voz) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY e/ou ELEVENLABS_VOICE_ID ausentes no .env.local' },
        { status: 400 },
      );
    }

    const textoTrim = texto.trim();

    // O CACHE, sem tabela nova: o caminho no Storage E a chave.
    //
    // Os TRES entram no hash. So o texto nao basta: voce trocaria a voz no
    // .env e receberia o mp3 antigo, sem entender por que.
    const hash = createHash('sha256').update(`${textoTrim}|${voz}|${modelo}`).digest('hex').slice(0, 32);
    const caminho = `narracao/${campanha_id || 'sem-campanha'}/${hash}.mp3`;

    const { data: jaExiste } = await supabaseServer.storage
      .from(BUCKET)
      .list(caminho.split('/').slice(0, -1).join('/'), { search: `${hash}.mp3` });

    const legendasCaminho = `${caminho}.json`;

    if (jaExiste && jaExiste.length > 0) {
      // Cache quente: as legendas vivem num .json ao lado do mp3, porque sem
      // elas o mp3 sozinho nao serve — precisariamos gastar de novo so pelo
      // timing. Se o .json sumiu, ignora o cache e regera os dois.
      const { data: baixado } = await supabaseServer.storage.from(BUCKET).download(legendasCaminho);
      if (baixado) {
        const legendas = JSON.parse(await baixado.text());
        const { data: pub } = supabaseServer.storage.from(BUCKET).getPublicUrl(caminho);
        return NextResponse.json({
          url_narracao: pub.publicUrl,
          legendas,
          duracao_s: duracaoDasLegendas(legendas),
          do_cache: true,
        });
      }
    }

    // 💸 A partir daqui, gastou cota.
    const { audio, caracteres, inicios, fins } = await narrarComTimestamps(textoTrim);
    const legendas = agruparLegendas(caracteres, inicios, fins);
    const duracaoS = duracaoDasLegendas(legendas);

    console.log(`[video/narracao] gerou ${audio.length} bytes, ${legendas.length} legendas, ${duracaoS}s`);

    const { error: erroAudio } = await supabaseServer.storage
      .from(BUCKET)
      .upload(caminho, audio, { contentType: 'audio/mpeg', upsert: true });
    if (erroAudio) {
      // Ja gastou. O log e a unica pista.
      console.error('[video/narracao] GASTOU E NAO SUBIU:', erroAudio.message);
      return NextResponse.json(
        { error: 'narracao foi gerada mas o upload falhou', detalhe: erroAudio.message },
        { status: 500 },
      );
    }

    const { error: erroLegendas } = await supabaseServer.storage
      .from(BUCKET)
      .upload(legendasCaminho, Buffer.from(JSON.stringify(legendas)), {
        contentType: 'application/json',
        upsert: true,
      });
    if (erroLegendas) {
      console.error('[video/narracao] legendas nao subiram:', erroLegendas.message);
      // Nao e fatal: o mp3 esta la e as legendas vao na resposta. So o cache
      // da proxima vez e que vai errar e regerar.
    }

    const { data: pub } = supabaseServer.storage.from(BUCKET).getPublicUrl(caminho);

    return NextResponse.json({
      url_narracao: pub.publicUrl,
      legendas,
      duracao_s: duracaoS,
      do_cache: false,
    });
  } catch (err) {
    console.error('[video/narracao] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao gerar narracao', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: Chamar a rota de verdade**

```bash
npm run dev
```

Noutro terminal:

```bash
curl -s -X POST http://localhost:3000/api/video/narracao \
  -H "Content-Type: application/json" \
  -d '{"texto":"Você treina há meses e o joelho ainda dói toda vez que desce a escada. Não é falta de esforço."}'
```

Esperado: JSON com `url_narracao` apontando para o Storage, `legendas` com 4 a 6 objetos `{texto, inicio_s, fim_s}` em ordem crescente sem buraco, `duracao_s` entre 5 e 10, e `do_cache: false`.

Abrir a `url_narracao` no navegador e **ouvir**. É a única forma de saber que a voz e o idioma estão certos.

- [ ] **Step 7: Provar que o cache funciona**

Rodar **o mesmo curl de novo**.

Esperado: `do_cache: true`, mesma `url_narracao`, mesmas legendas. Se vier `false` na segunda, o cache não pegou — investigue antes de seguir, porque é ele que segura a cota quando você ajustar a cor da faixa dez vezes.

- [ ] **Step 8: Provar que o texto grande é recusado antes de gastar**

```bash
node -e "
const t = 'palavra '.repeat(200);
fetch('http://localhost:3000/api/video/narracao', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ texto: t })
}).then(r => r.json()).then(j => console.log(JSON.stringify(j)));
"
```

Esperado: `{"error":"texto tem 1600 caracteres, acima do teto de 1200. Corte o roteiro."}` — e **nenhuma** linha `[video/narracao] gerou …` no log do `npm run dev`, provando que não gastou.

- [ ] **Step 9: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem saída. **Não rode `npm run build`** (Global Constraints).

- [ ] **Step 10: Parar e reportar**

Arquivos prontos: `src/lib/elevenlabs/client.ts`, `src/lib/elevenlabs/legendas.ts`, `src/app/api/video/narracao/route.ts`.
Reportar: a resposta do Step 6 (colada), a confirmação de que ouviu o áudio, e o `do_cache: true` do Step 7.
Mensagem sugerida: `feat(video): rota de narracao com timestamps e cache no Storage`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 6: A bancada

**Files:**
- Create: `src/app/api/video/compor/route.ts`
- Create: `src/app/video-maker/Bancada.tsx`
- Modify: `src/app/video-maker/page.tsx` (linha 159 — o `select`; linhas 319-330 — os roteiros; linhas 649-696 — a coluna 3)

**Interfaces:**
- Consumes: `POST /api/video/narracao` (Task 5); `AnuncioUGC`, `anuncioUgcSchema`, `duracaoEmFrames`, `FPS`, `LARGURA`, `ALTURA` (Task 4); `video_jobs.url_narracao/params_json/job_fonte_id` (Task 3); `workflow_copywriting.roteiros_video` (Task 2)
- Produces: `POST /api/video/compor` — body `{ campanha_id, job_fonte_id, url_narracao, params_json }` → `{ job_id }`. A Task 7 consome as linhas que ela cria.

- [ ] **Step 1: Escrever a rota de composição**

`src/app/api/video/compor/route.ts`:

```ts
// src/app/api/video/compor/route.ts
//
// NAO GASTA NADA. A narracao ja foi paga pela /api/video/narracao antes de
// esta rota existir na jornada — e o banco garante isso com a check
// `compor_exige_narracao`. Por isso o job nasce 'pendente': comecar e gratis,
// e o retry do worker e livre.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, job_fonte_id, url_narracao, params_json } = body ?? {};

    if (!url_narracao || typeof url_narracao !== 'string') {
      return NextResponse.json(
        { error: 'url_narracao e obrigatoria — gere a voz antes de renderizar' },
        { status: 400 },
      );
    }
    if (!job_fonte_id) {
      return NextResponse.json({ error: 'job_fonte_id e obrigatorio' }, { status: 400 });
    }

    // O clipe de fundo tem que existir, estar pronto, e ter duracao conhecida:
    // sem `duracao_s` o Loop da composicao nao sabe onde reiniciar.
    const { data: fonte, error: erroFonte } = await supabaseServer
      .from('video_jobs')
      .select('id, status, url_saida, duracao_s')
      .eq('id', job_fonte_id)
      .maybeSingle();

    if (erroFonte) {
      return NextResponse.json(
        { error: 'falha ao ler o clipe de origem', detalhe: erroFonte.message },
        { status: 500 },
      );
    }
    if (!fonte || fonte.status !== 'concluido' || !fonte.url_saida) {
      return NextResponse.json(
        { error: 'o clipe de origem nao esta pronto' },
        { status: 400 },
      );
    }

    const params = {
      ...(params_json ?? {}),
      url_clipe: fonte.url_saida,
      duracao_clipe_s: fonte.duracao_s ?? 5,
    };

    const { data, error } = await supabaseServer
      .from('video_jobs')
      .insert({
        campanha_id: campanha_id || null,
        tipo: 'compor',
        status: 'pendente',
        job_fonte_id,
        url_narracao,
        params_json: params,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'falha ao criar o job de composicao', detalhe: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ job_id: data.id });
  } catch (err) {
    console.error('[video/compor] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao compor', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Escrever a bancada**

`src/app/video-maker/Bancada.tsx`:

```tsx
'use client';

// src/app/video-maker/Bancada.tsx
//
// A coluna 3 da /video-maker quando ha um clipe pronto selecionado.
//
// Arquivo separado da page.tsx por dois motivos que se resolvem juntos:
// 1. page.tsx ja tem 900+ linhas;
// 2. o @remotion/player toca DOM e video, e nao sobrevive a renderizacao de
//    servidor — a page importa esta bancada por next/dynamic com ssr:false.
//
// O Player toca EXATAMENTE o componente que o worker renderiza
// (src/video/AnuncioUGC.tsx). Essa e a razao de ser da bancada: se as duas
// metades divergissem, voce aprovaria vendo uma coisa e receberia outra.

import React, { useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { Loader2, Mic, Film, AlertTriangle } from 'lucide-react';
import {
  AnuncioUGC,
  duracaoEmFrames,
  FPS,
  LARGURA,
  ALTURA,
  type Legenda,
} from '../../video/AnuncioUGC';

interface Props {
  campanhaId: string | null;
  jobFonteId: string;
  urlClipe: string;
  duracaoClipeS: number;
  roteiroInicial: string;
}

// Velocidade de fala em pt-BR, ~2,5 palavras/s. Serve so pra estimativa que
// aparece ao lado do contador — a duracao de VERDADE vem da ElevenLabs.
const PALAVRAS_POR_SEGUNDO = 2.5;

function estimarSegundos(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((palavras / PALAVRAS_POR_SEGUNDO) * 10) / 10;
}

export default function Bancada({
  campanhaId,
  jobFonteId,
  urlClipe,
  duracaoClipeS,
  roteiroInicial,
}: Props) {
  const [gancho, setGancho] = useState('');
  const [cta, setCta] = useState('');
  const [roteiro, setRoteiro] = useState(roteiroInicial);
  const [corFaixa, setCorFaixa] = useState('#FFFFFF');

  const [urlNarracao, setUrlNarracao] = useState('');
  const [legendas, setLegendas] = useState<Legenda[]>([]);
  const [duracaoNarracaoS, setDuracaoNarracaoS] = useState(0);

  const [gerandoVoz, setGerandoVoz] = useState(false);
  const [renderizando, setRenderizando] = useState(false);
  const [erro, setErro] = useState('');

  const temNarracao = Boolean(urlNarracao) && duracaoNarracaoS > 0;
  const sobra = temNarracao ? duracaoNarracaoS - duracaoClipeS : 0;

  const inputProps = useMemo(
    () => ({
      urlClipe,
      duracaoClipeS,
      duracaoNarracaoS: duracaoNarracaoS || duracaoClipeS,
      gancho,
      cta,
      urlNarracao,
      legendas,
      corFaixa,
    }),
    [urlClipe, duracaoClipeS, duracaoNarracaoS, gancho, cta, urlNarracao, legendas, corFaixa],
  );

  async function gerarVoz() {
    setErro('');
    setGerandoVoz(true);
    try {
      const res = await fetch('/api/video/narracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanha_id: campanhaId, texto: roteiro }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detalhe || json.error || 'falha ao gerar voz');
      setUrlNarracao(json.url_narracao);
      setLegendas(json.legendas ?? []);
      setDuracaoNarracaoS(json.duracao_s ?? 0);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerandoVoz(false);
    }
  }

  async function renderizar() {
    setErro('');
    setRenderizando(true);
    try {
      const res = await fetch('/api/video/compor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanha_id: campanhaId,
          job_fonte_id: jobFonteId,
          url_narracao: urlNarracao,
          params_json: {
            gancho,
            cta,
            cor_faixa: corFaixa,
            legendas,
            duracao_narracao_s: duracaoNarracaoS,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detalhe || json.error || 'falha ao criar o job');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setRenderizando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
      <div className="w-full bg-black rounded-xl border border-surface-elevated overflow-hidden">
        <Player
          component={AnuncioUGC}
          inputProps={inputProps}
          durationInFrames={duracaoEmFrames(duracaoNarracaoS || duracaoClipeS)}
          compositionWidth={LARGURA}
          compositionHeight={ALTURA}
          fps={FPS}
          controls
          style={{ width: '100%' }}
        />
      </div>

      {sobra > 0.2 && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-status-yellow/10 border border-status-yellow/30">
          <AlertTriangle size={13} className="text-status-yellow shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-yellow leading-relaxed">
            Narração {sobra.toFixed(1)}s mais longa que o clipe — ele entra em loop.
            Encurte o roteiro se o loop ficar visível.
          </p>
        </div>
      )}

      <input
        value={gancho}
        onChange={(e) => setGancho(e.target.value)}
        placeholder="Gancho (faixa branca)"
        className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary"
      />

      <div>
        <textarea
          value={roteiro}
          onChange={(e) => setRoteiro(e.target.value)}
          placeholder="Roteiro falado (narração)"
          rows={5}
          className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary resize-none"
        />
        <div className="flex justify-between text-[10px] text-secondary mt-1">
          <span>{roteiro.length} caracteres</span>
          <span>~{estimarSegundos(roteiro)}s falados · clipe {duracaoClipeS}s</span>
        </div>
      </div>

      <input
        value={cta}
        onChange={(e) => setCta(e.target.value)}
        placeholder="CTA (faixa laranja)"
        className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary"
      />

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-secondary">Cor da faixa</label>
        <input
          type="color"
          value={corFaixa}
          onChange={(e) => setCorFaixa(e.target.value)}
          className="w-8 h-8 bg-transparent border border-surface-elevated rounded cursor-pointer"
        />
      </div>

      {erro && (
        <div className="p-2 rounded-lg bg-status-red/10 border border-status-red/30 text-[11px] text-status-red">
          {erro}
        </div>
      )}

      <button
        onClick={gerarVoz}
        disabled={gerandoVoz || roteiro.trim().length < 10}
        className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gerandoVoz ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
        {gerandoVoz ? 'Gerando voz…' : 'Gerar voz'}
      </button>

      {/*
        Nasce desabilitado ate existir narracao. Isso torna a trava do banco
        (`compor_exige_narracao`) VISIVEL na tela, em vez de virar um 400
        depois do clique.
      */}
      <button
        onClick={renderizar}
        disabled={!temNarracao || renderizando}
        title={temNarracao ? '' : 'Gere a voz primeiro'}
        className="w-full bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {renderizando ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
        {renderizando ? 'Enviando…' : 'Renderizar'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Ler o `roteiros_video` na page**

Em `src/app/video-maker/page.tsx`, no `select` da linha 159, acrescentar a coluna:

```ts
      .select('id, campanha_id, prompts_videos, roteiros_video, data_criacao, campanhas_producao(nome_projeto, status_geral)')
```

E dentro do `useMemo` de `promptsDaOferta` (linhas 319-330), passar o roteiro pareado por índice. Logo depois de `const separados = separarPromptsDeVideo(ofertaAtiva.prompts_videos || '');`, acrescentar:

```ts
    // Roteiro pareado por INDICE: roteiro 1 e a narracao do video 1.
    // Campanha antiga nao tem roteiro — a bancada cai no meta_ads_copy cru e
    // voce corta a mao. Nunca fica em branco.
    const roteiros = separarPromptsDeVideo(ofertaAtiva.roteiros_video || '');
```

e incluir no objeto que o `.map` devolve:

```ts
      roteiro: roteiros[i]?.texto ?? '',
```

⚠️ O `.map` atual usa `(p, i)`. Se estiver usando só `(p)`, acrescente o `i`.

- [ ] **Step 4: Trocar a coluna 3 pela bancada**

No topo de `page.tsx`, junto dos outros imports:

```tsx
import dynamic from 'next/dynamic';

// ssr:false obrigatorio: o @remotion/player toca DOM e video, e quebra na
// renderizacao de servidor.
const Bancada = dynamic(() => import('./Bancada'), { ssr: false });
```

Na coluna 3 (linha ~663), substituir o `<div>` do player pelo bloco abaixo, mantendo o header e o rodapé de aprovação que já existem:

```tsx
              {activeVideo?.url_saida && activeVideo?.id ? (
                <Bancada
                  key={activeVideo.id}
                  campanhaId={activeVideo.campanha_id ?? null}
                  jobFonteId={activeVideo.id}
                  urlClipe={activeVideo.url_saida}
                  duracaoClipeS={activeVideo.duracao_s ?? 5}
                  roteiroInicial={roteiroDoVideoAtivo}
                />
              ) : (
                <div className="w-full flex-1 bg-black rounded-xl border border-surface-elevated relative overflow-hidden flex items-center justify-center">
                  {(activeVideo.url_video_download || activeVideo.video_url) ? (
                    <video
                      src={activeVideo.url_video_download || activeVideo.video_url}
                      controls
                      className="w-full h-full max-h-[600px] object-contain outline-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      <PlayCircle size={36} />
                    </div>
                  )}
                </div>
              )}
```

⚠️ `key={activeVideo.id}` não é enfeite: sem ele, trocar de clipe reaproveita o componente e mantém gancho, roteiro e **narração do vídeo anterior** — você renderizaria a voz errada por cima do clipe certo.

E logo antes do `return` do componente, calcular o roteiro do vídeo ativo:

```tsx
  // O roteiro do clipe selecionado, para pre-preencher a bancada.
  const roteiroDoVideoAtivo = useMemo(() => {
    if (!activeVideo) return '';
    const p = promptsDaOferta.find((x) => x.jobs?.some((j: any) => j.id === activeVideo.id));
    return p?.roteiro ?? '';
  }, [activeVideo, promptsDaOferta]);
```

- [ ] **Step 5: Avisar quando o worker de composição não está rodando**

O aviso que já existe (`workerParado`, linha 395) só olha job `processando` — serve para o `gerar`, que fica legitimamente ~2min esperando a WaveSpeed. O `compor` é outro caso: ele nasce `pendente` e **só sai daí se houver worker**. Job `compor` parado em `pendente` significa uma coisa só, e a tela tem que dizer qual.

Logo depois do `workerParado`, acrescentar:

```tsx
  // Diferente do aviso acima: job `compor` nasce 'pendente' e so sai dai se
  // houver worker rodando. Nao ha servico externo demorando — parado em
  // 'pendente' quer dizer uma coisa so, entao 2 minutos ja basta.
  const composicaoParada = jobs.some(
    (j) =>
      j.tipo === 'compor' &&
      j.status === 'pendente' &&
      j.criado_em &&
      Date.now() - new Date(j.criado_em).getTime() > 2 * 60_000,
  );
```

E, logo abaixo do bloco `{workerParado && (…)}` (linhas 449-457), o bloco irmão:

```tsx
      {composicaoParada && (
        <div className="bg-surface border border-status-yellow/30 rounded-lg p-3 mb-4 flex items-start gap-2 shrink-0">
          <AlertTriangle size={16} className="text-status-yellow shrink-0 mt-0.5" />
          <p className="text-sm text-status-yellow">
            Há anúncio esperando render há mais de 2 minutos. O worker de composição está rodando?{' '}
            <code className="ml-1 text-xs bg-surface-elevated px-1.5 py-0.5 rounded">npm run video:compor</code>
          </p>
        </div>
      )}
```

⚠️ Confira que a query de `jobs` traz a coluna `tipo` (o `select('*')` da `fetchJobs` traz). Sem ela o filtro nunca casa e o aviso nunca aparece — falha silenciosa exatamente do tipo que este aviso existe para evitar.

- [ ] **Step 6: Verificar tipos e provar de verdade que o binário não vazou**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

🚨 **Agora sim a checagem de bundle vale alguma coisa — e é aqui, não na Task 4.** Lá o `grep` sobre a `.next` passou limpo, mas provava pouco: **nada em `src/app/` importava a composição ainda**. Só nesta tarefa o `@remotion/player` entra de verdade na árvore de imports do Next, e é só agora que dá para provar a afirmação que interessa: *o Player sozinho não arrasta o `@remotion/renderer` junto*.

Siga o procedimento seguro das Global Constraints — derrube o `dev`, `rm -rf .next`, `npm run build` —, e então:

```bash
grep -rl "@remotion/renderer" .next/ | head
```

Esperado: **nenhuma saída**. Se aparecer algo agora, o `@remotion/player` está puxando o renderer por dependência transitiva, e a separação inteira dos dois projetos foi por água abaixo — pare e reporte, não tente contornar.

Depois `rm -rf .next` de novo e siga para o Step 7, que abre a tela no `dev`.

⚠️ Se o build falhar em `writeStandaloneDirectory`/`copyTracedFiles` com `EPERM`, é o defeito de ambiente do `NOTES.md`, não seu — a compilação já terminou e o `grep` continua válido. Qualquer falha **antes** disso é sua.

O risco que o build pegaria aqui é `window is not defined` / `document is not defined`, vindo de `@remotion/player` renderizado no servidor. **O Step 7 pega o mesmo erro**: se o `ssr: false` do Step 4 não foi aplicado, a página quebra ao abrir, com esse erro no console do `npm run dev`.

- [ ] **Step 7: Abrir a bancada e olhar**

```bash
npm run dev
```

Em `/video-maker`: selecionar uma oferta, um vídeo **pronto**, e clicar em "Ver no player".

Esperado, na coluna 3:
1. O Player mostra a faixa branca em cima, o clipe no meio, o CTA laranja embaixo — a divisão 422/1080/418.
2. O roteiro já vem preenchido (se a copy for da Task 2).
3. **"Renderizar" está apagado**, com tooltip "Gere a voz primeiro".
4. Digitar no campo de gancho muda o texto no Player **na hora**.

- [ ] **Step 8: Gerar voz e ver a legenda aparecer**

Clicar em "Gerar voz". Esperado: botão vira "Gerando voz…", e ao terminar o Player toca a narração com a legenda queimada aparecendo sincronizada, "Renderizar" acende, e a duração do Player passa a ser a da narração.

Se a narração for mais longa que o clipe, o aviso amarelo aparece com o número de segundos.

- [ ] **Step 9: Renderizar e conferir que o job nasceu certo**

Clicar em "Renderizar". Depois:

```sql
select id, tipo, status, job_fonte_id, url_narracao is not null as tem_narracao,
       params_json->>'gancho' as gancho,
       jsonb_array_length(params_json->'legendas') as n_legendas
  from video_jobs where tipo = 'compor' order by criado_em desc limit 1;
```

Esperado: uma linha, `status = pendente`, `tem_narracao = true`, `gancho` com o texto digitado, `n_legendas > 0`.

- [ ] **Step 10: Parar e reportar**

Arquivos prontos: `src/app/api/video/compor/route.ts`, `src/app/video-maker/Bancada.tsx`, `src/app/video-maker/page.tsx`.
Reportar: a saída da query do Step 9 e o que apareceu no Player.
Mensagem sugerida: `feat(video-maker): bancada de montagem com Player do Remotion`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 7: O worker de render

**Files:**
- Create: `remotion/worker.mjs`
- Modify: `package.json` (raiz — script `video:compor`)

**Interfaces:**
- Consumes: linhas `video_jobs` com `tipo='compor'` e `status='pendente'` (Task 6); a composição de id `"AnuncioUGC"` registrada no `remotion/src/Root.tsx` (Task 4)
- Produces: `video_jobs.url_saida` (caminho público no Storage), `duracao_render_s`, `status='concluido'`

- [ ] **Step 1: Escrever o worker**

`remotion/worker.mjs`:

```js
// remotion/worker.mjs
//
// Renderiza os jobs tipo='compor'. Roda a mao, como o scripts/worker-video.mjs.
//
//   npm run video:compor      (da RAIZ)
//   Parar: Ctrl+C
//
// 🚨 ESTE WORKER NUNCA CHAMA A ELEVENLABS. A narracao ja esta no Storage,
// paga pela rota no clique do Fernando, e o banco garante isso com a check
// `compor_exige_narracao`. E por isso que aqui o RETRY E LIVRE: render e
// gratis, entao reprocessar job travado nao custa nada — o oposto do
// tipo='gerar', onde reprocessar significaria cobrar de novo.
//
// Copia o padrao do worker-video.mjs INCLUINDO as correcoes que custaram caro:
//   - bundle() UMA vez por processo (leva ~5s; repetir por job e desperdicio)
//   - checagem de dependencias na largada, dizendo QUAL node esta em uso
//   - o while envolto em try/catch EXTERNO — o defeito n5 do modulo passado foi
//     exatamente isso: excecao fora do try por-job matando o processo em
//     silencio, deixando job sem ninguem processando.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'criativos';
const INTERVALO_MS = 10_000;

// Teto so pra nao girar eternamente em job impossivel (clipe que sumiu do
// Storage, params corrompidos). Nao e trava de custo — nao ha custo aqui.
const MAX_TENTATIVAS = 3;

const AQUI = path.dirname(fileURLToPath(import.meta.url));

function checarDependencias() {
  const faltando = [];
  if (!URL_SUPABASE) faltando.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!CHAVE_SERVICE) faltando.push('SUPABASE_SERVICE_ROLE_KEY');
  if (faltando.length) {
    console.error(`\n[worker-compor] FALTA: ${faltando.join(', ')}`);
    console.error('Rode da RAIZ: npm run video:compor\n');
    process.exit(1);
  }
}

checarDependencias();
console.log(`[worker-compor] node = ${process.execPath}`);
console.log('[worker-compor] o PRIMEIRO render baixa um Chrome headless (~150-300 MB). Acontece uma vez.');

process.on('unhandledRejection', (err) => {
  console.error('[worker-compor] unhandledRejection (processo segue vivo):', err);
});

const supabase = createClient(URL_SUPABASE, CHAVE_SERVICE, { auth: { persistSession: false } });

// UMA vez por processo. ~5s.
console.log('[worker-compor] empacotando a composicao…');
const servidor = await bundle({ entryPoint: path.join(AQUI, 'src', 'index.ts') });
console.log('[worker-compor] pronto. Aguardando jobs. Ctrl+C para parar.');

async function renderizar(job) {
  const p = job.params_json ?? {};
  const inputProps = {
    urlClipe: p.url_clipe,
    duracaoClipeS: Number(p.duracao_clipe_s ?? 5),
    duracaoNarracaoS: Number(p.duracao_narracao_s ?? 0),
    gancho: p.gancho ?? '',
    cta: p.cta ?? '',
    urlNarracao: job.url_narracao,
    legendas: p.legendas ?? [],
    corFaixa: p.cor_faixa ?? '#FFFFFF',
  };

  if (!inputProps.urlClipe) throw new Error('params_json.url_clipe ausente');
  if (!inputProps.duracaoNarracaoS) throw new Error('params_json.duracao_narracao_s ausente ou zero');

  const composicao = await selectComposition({
    serveUrl: servidor,
    id: 'AnuncioUGC',
    inputProps,
  });

  const saida = path.join(tmpdir(), `anuncio-${job.id}.mp4`);
  await renderMedia({
    composition: composicao,
    serveUrl: servidor,
    codec: 'h264',
    outputLocation: saida,
    inputProps,
  });

  const buffer = await readFile(saida);
  if (buffer.length < 10_000) throw new Error(`mp4 suspeito: ${buffer.length} bytes`);

  const caminho = `anuncio/${job.id}.mp4`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`upload falhou: ${error.message}`);

  await unlink(saida).catch(() => {});

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

async function processarUmaVolta() {
  const { data: jobs, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('tipo', 'compor')
    .eq('status', 'pendente')
    .lt('tentativas', MAX_TENTATIVAS)
    .order('criado_em', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[worker-compor] erro ao ler a fila:', error.message);
    return;
  }
  if (!jobs?.length) return;

  const job = jobs[0];
  const t0 = Date.now();

  await supabase
    .from('video_jobs')
    .update({
      status: 'processando',
      tentativas: (job.tentativas ?? 0) + 1,
      iniciado_em: new Date().toISOString(),
    })
    .eq('id', job.id);

  console.log(`[worker-compor] renderizando ${job.id}…`);

  try {
    const urlPublica = await renderizar(job);
    const segundos = Math.round((Date.now() - t0) / 1000);
    await supabase
      .from('video_jobs')
      .update({
        status: 'concluido',
        url_saida: urlPublica,
        duracao_render_s: segundos,
        erro: null,
        concluido_em: new Date().toISOString(),
      })
      .eq('id', job.id);
    console.log(`[worker-compor] OK ${job.id} em ${segundos}s -> ${urlPublica}`);
  } catch (err) {
    const tentativas = (job.tentativas ?? 0) + 1;
    const desistiu = tentativas >= MAX_TENTATIVAS;
    await supabase
      .from('video_jobs')
      .update({
        // Volta pra 'pendente' enquanto houver tentativa: render e gratis,
        // entao insistir nao custa nada.
        status: desistiu ? 'erro' : 'pendente',
        erro: `${err.message}`,
        ...(desistiu ? { concluido_em: new Date().toISOString() } : {}),
      })
      .eq('id', job.id);
    console.error(
      `[worker-compor] falhou ${job.id} (${tentativas}/${MAX_TENTATIVAS}): ${err.message}`,
    );
  }
}

while (true) {
  try {
    await processarUmaVolta();
  } catch (err) {
    // Rede de seguranca EXTERNA. Foi exatamente aqui que o modulo passado
    // quebrou: excecao fora do try por-job derrubava o processo em silencio.
    console.error('[worker-compor] erro inesperado no loop:', err);
  }
  await new Promise((r) => setTimeout(r, INTERVALO_MS));
}
```

- [ ] **Step 2: Adicionar o script na raiz**

Em `package.json` (raiz), junto de `video:worker`:

```json
    "video:compor": "node --env-file=.env.local remotion/worker.mjs"
```

Roda da raiz de propósito: o `--env-file` resolve o `.env.local` pela pasta atual, e o Node resolve `@remotion/renderer` a partir de `remotion/node_modules` porque é onde o arquivo mora.

- [ ] **Step 3: Rodar o worker com a fila vazia**

```bash
npm run video:compor
```

Esperado: o banner com o `process.execPath`, o aviso do Chrome, `empacotando a composicao…`, e depois `pronto. Aguardando jobs.` — e fica parado sem erro. `Ctrl+C` para sair.

Se travar em "empacotando", é o `entryPoint`: confirme que `remotion/src/index.ts` existe e exporta o `RemotionRoot`.

- [ ] **Step 4: Rodar com o job da Task 6 na fila**

Com o job `pendente` criado no Step 9 da Task 6:

```bash
npm run video:compor
```

Esperado: `renderizando <id>…`, o primeiro render baixando o Chrome (uma vez só), e no fim `OK <id> em Ns -> https://…`.

Referência de tempo: ~12× a duração do vídeo (medido: 59,6s para 5s). Um anúncio de 10s deve levar ~2min.

- [ ] **Step 5: Assistir o MP4 e comparar com o Player**

Abrir a URL do Step 4 e assistir. Depois abrir a bancada com o mesmo clipe e comparar lado a lado.

**Este é o teste que importa da tarefa inteira.** Conferir:
- [ ] O gancho quebra a linha **no mesmo lugar** nos dois
- [ ] A legenda aparece **no mesmo momento** nos dois
- [ ] O clipe está mudo e a narração é a única voz
- [ ] O CTA laranja está lá embaixo
- [ ] 1080×1920, sem barra preta

Qualquer divergência entre o Player e o MP4 é **a bancada mentindo**, que é o único defeito que este módulo inteiro existe para evitar. Reporte antes de seguir.

- [ ] **Step 6: Provar que o retry é livre**

Criar um job que vai falhar:

```sql
insert into video_jobs (tipo, status, url_narracao, params_json)
values ('compor', 'pendente', 'https://exemplo.invalido/x.mp3',
        '{"url_clipe":"https://exemplo.invalido/x.mp4","duracao_clipe_s":5,"duracao_narracao_s":5,"legendas":[]}'::jsonb)
returning id;
```

Rodar o worker. Esperado: falha 3 vezes (voltando para `pendente` nas duas primeiras) e na terceira vira `status='erro'` com a mensagem no campo `erro`. O processo **continua vivo** e volta a esperar. Depois:

```sql
delete from video_jobs where url_narracao = 'https://exemplo.invalido/x.mp3';
```

- [ ] **Step 7: Parar e reportar**

Arquivos prontos: `remotion/worker.mjs`, `package.json`.
Reportar: o tempo real do render (para calibrar a estimativa da tela), a URL do MP4, e o resultado da comparação do Step 5 item por item.
Mensagem sugerida: `feat(video): worker de composicao com Remotion`
**Commit local, nunca `git push`** (ver Global Constraints).

---

## Task 8: Ponta a ponta e documentação

**Files:**
- Modify: `NOTES.md`
- Modify: `CLAUDE.md` (tabela de páginas — `/video-maker`)
- Delete: `NOTA-REMOTION-BANCADA.md`

**Interfaces:**
- Consumes: tudo das Tasks 1-7
- Produces: nada de código

- [ ] **Step 1: Rodar o fluxo inteiro, de copy nova a MP4**

Com `npm run dev` e `npm run video:compor` rodando:

1. Aprovar um anúncio em `/mineracao`
2. Esperar a copy — conferir os **5** campos em `/copywriting`
3. Em `/video-maker`, gerar um clipe na WaveSpeed (💸 gasta) e esperar o `worker-video`
4. Selecionar o clipe pronto → a bancada abre com o roteiro pré-preenchido
5. Ajustar gancho e CTA, gerar voz, ouvir
6. Renderizar
7. Assistir o MP4

- [ ] **Step 2: Conferir os critérios de aceitação da spec**

Percorrer a lista da §13 da spec, um a um, e marcar o que passou. Qualquer item que não passar entra no reporte — **não silenciar**.

Incluindo os portões de compilação:

```bash
npx tsc --noEmit && npm --prefix remotion run lint
```

Esperado: os dois sem erro.

O critério "o bundle do Next não contém `@remotion/renderer`" já foi verificado no Step 9 da Task 4, com o procedimento seguro de build. **Não repita o build aqui** — o Step 1 desta tarefa acabou de rodar o fluxo inteiro no `dev`, e um build agora derruba a `.next` embaixo dele. Cite o resultado da Task 4.

⚠️ O critério da spec §13 que diz *"`npm run build` passa na raiz"* **não é atingível nesta máquina** enquanto o `output: "standalone"` + pnpm + Windows sem Modo de Desenvolvedor continuarem como estão (`NOTES.md`). Marque-o como não-atingível, cite o `NOTES.md`, e reporte — não tente consertar o ambiente por conta própria: as três saídas possíveis estão no `NOTES.md` e a escolha é do Fernando.

- [ ] **Step 3: Atualizar o `NOTES.md`**

Acrescentar a entrada de 01/08/2026 no diário de bordo: o que foi construído, a decisão de a rota pagar e o worker só renderizar (e por quê), o campo `roteiros_video` no contrato do agente, o `max_tokens` que mudou, o tempo real de render medido, e o que ficou de fora (Studio embutido, 1:1 e 16:9, Lambda).

- [ ] **Step 4: Atualizar o `CLAUDE.md`**

Na tabela de páginas, a linha `/video-maker` hoje diz *"⚠️ Casca — só UI"*, o que deixou de ser verdade. Trocar por uma descrição do que existe: geração via WaveSpeed, bancada de montagem com Player, render local via worker. Acrescentar `ELEVENLABS_*` à lista de variáveis de ambiente obrigatórias.

- [ ] **Step 5: Apagar a nota de brainstorming**

```bash
rm NOTA-REMOTION-BANCADA.md
```

Ela era o rascunho da conversa; virou a spec de 01/08 e este plano. Deixar as duas na raiz é o começo de documentação que se contradiz.

- [ ] **Step 6: Atualizar o segundo cérebro**

Processo obrigatório do `CLAUDE.md`: atualizar `02_Projetos/Alavanca_Synapse.md` no vault Nexus.AI via MCP Obsidian, com o canvas em `03_Workflows/`. Não duplicar nota — atualizar a existente.

- [ ] **Step 7: Parar e reportar**

Arquivos prontos: `NOTES.md`, `CLAUDE.md`, e a remoção do `NOTA-REMOTION-BANCADA.md`.
Reportar: a lista de aceitação da spec com o resultado de cada item.
Mensagem sugerida: `docs: registra a bancada de anuncio com Remotion`
**Commit local, nunca `git push`** (ver Global Constraints).
