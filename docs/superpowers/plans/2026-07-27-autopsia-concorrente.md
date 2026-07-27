# Autópsia de Concorrente — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o módulo que disseca **um** anunciante — baixa todos os criativos únicos, extrai grades de frames, transcreve o áudio e gera um dossiê `.md`/`.html` publicável.

**Architecture:** A rota de API só **enfileira**; um worker Python local consome a fila (`autopsia_jobs`) e faz o trabalho pesado (download → ffmpeg → faster-whisper), gravando de volta no Supabase. A UI acompanha por Realtime. O dossiê sai de um agente que devolve **JSON por seção**, montado em `.md`/`.html` por código determinístico.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Supabase (Postgres + Storage + Realtime) · Python 3.13 + ffmpeg 8.1.2 + faster-whisper (já instalados) · ScrapeCreators API · Cloudflare Pages (Wrangler).

**Spec:** [`docs/superpowers/specs/2026-07-26-autopsia-concorrente-design.md`](../specs/2026-07-26-autopsia-concorrente-design.md)

---

## Global Constraints

Valem para **todas** as tarefas. Copiadas do `CLAUDE.md`, do `NOTES.md` e do spec.

- **NÃO existe suíte de testes neste projeto.** Não há `jest`, `vitest` ou `pytest`. Não invente um framework de teste, não crie `tests/`. A verificação de cada tarefa é: `npx tsc --noEmit` + o comando concreto de verificação escrito na própria tarefa (curl, script `node`, SQL).
- **NÃO existe `npm run type-check`.** Use `npx tsc --noEmit`. Um erro pré-existente em `scratch/` pode aparecer — ignorar; qualquer outro é regressão sua.
- **NUNCA rodar `npm run build` com `npm run dev` ativo** — disputam a pasta `.next` e a tela fica branca. `npm run build` já falha por lint pré-existente no projeto inteiro; não é regressão e não deve ser "consertado" aqui.
- **Dois clients Supabase, nunca trocar:** `src/lib/supabase.ts` (anon key, respeita RLS, só em `"use client"`) vs `src/lib/supabase-server.ts` (service_role, ignora RLS, **só** server-side). Nesta feature, todo acesso server-side passa por `getTenantClient()` (Task 1).
- **Leitura server-side do Supabase precisa de `cache: 'no-store'`** — já resolvido na raiz em `supabase-server.ts`. Não remover.
- **Design system obrigatório:** `bg-[#0D0D14]` (fundo), `bg-surface`, `bg-surface-elevated`, `border-surface-elevated`, `text-text-primary`, `text-secondary`, `bg-primary` (#6366f1), `text-status-green` (#22c55e), `text-status-yellow` (#eab308), `text-status-red` (#ef4444). **Proibido:** fundo claro, `border-2`, gradiente arco-íris, cor fora dessa lista.
- **Env real do scraper é `SCRAPE_CREATORS_API_KEY`** (o `CLAUDE.md` documenta errado; Task 16 corrige).
- **Nomes em português** nas tabelas/colunas, seguindo `ads_minerados`. Comentário de cabeçalho em cada arquivo novo explicando o porquê, como o resto do projeto.
- **Migrations idempotentes** (`IF NOT EXISTS`) em `supabase/migrations/`, aplicadas via MCP do Supabase (`mcp__supabase__apply_migration`).
- **Git:** commitar direto na `main` (fluxo do projeto), nunca criar branch sem pedir. Conta `victorrmd05-dev`. Mensagens sem acento (o terminal do projeto tem histórico de mojibake). Rodapé `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **App de uso pessoal (D8 do spec):** guardar o material completo no Supabase do Fernando. Bucket público é aceitável. **Não** adicionar avisos legais, URLs assinadas ou cautela defensiva no código.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `src/lib/supabase-tenant.ts` | **Criar.** `getTenantClient()` — porta única para dados | 1 |
| `src/lib/storage.ts` | **Criar.** `garantirBucket()`, `salvarMidia()` | 1 |
| `supabase/migrations/20260727120000_add_storage_paths_ads_minerados.sql` | **Criar.** Colunas de Storage | 2 |
| `src/app/api/mineracao/run/route.ts` | **Modificar.** Salva imagem no Storage; exporta menos | 2, 4 |
| `src/app/mineracao/page.tsx` | **Modificar.** Prefere `image_storage_path`; botão Autopsiar | 2, 9 |
| `scripts/storage-backfill.mjs` | **Criar.** Salva as imagens dos 30 anúncios atuais | 2 |
| `supabase/migrations/20260727120100_create_autopsia.sql` | **Criar.** 3 tabelas + RLS + Realtime | 3 |
| `src/lib/minerador-media.ts` | **Modificar.** Recebe `creativeKeyFromSnap()` | 4 |
| `src/lib/autopsia/coleta.ts` | **Criar.** ScrapeCreators paginado + dedup + `parsePageId` | 5 |
| `src/app/api/autopsia/criar/route.ts` | **Criar.** Cria autópsia e enfileira | 6 |
| `src/app/autopsia/page.tsx` | **Criar.** Lista + criar nova (Realtime) | 7 |
| `src/components/layout/Sidebar.tsx` | **Modificar.** Item "Autópsia" | 7 |
| `src/app/autopsia/[id]/page.tsx` | **Criar.** Abas Criativos/Transcrições/Frames/Dossiê | 8 |
| `scripts/worker-autopsia.py` | **Criar.** Worker da fila: download, frames, transcrever | 10, 11, 12 |
| `agentes/autopsia/{AGENTS.md,SKILL.md,_agente.json}` | **Criar.** Cérebro do 10º agente | 13 |
| `src/lib/autopsia/dossie.ts` | **Criar.** `montarMarkdown()`, `montarHtml()` | 14, 15 |
| `src/app/api/autopsia/dossie/route.ts` | **Criar.** Agente → JSON → arquivos | 14 |
| `src/app/api/autopsia/publicar/route.ts` | **Criar.** HTML → Cloudflare Pages | 15 |

---

# FASE 0 — Storage (conserta bug existente)

### Task 1: `getTenantClient()` + `storage.ts` + bucket

**Files:**
- Create: `src/lib/supabase-tenant.ts`
- Create: `src/lib/storage.ts`

**Interfaces:**
- Consumes: `supabaseServer` de `src/lib/supabase-server.ts`
- Produces:
  - `getTenantClient(ctx?: TenantCtx): SupabaseClient`
  - `BUCKET_CRIATIVOS: 'criativos'`
  - `garantirBucket(nome?: string): Promise<void>`
  - `salvarMidia(opts: { url: string; caminho: string; bucket?: string }): Promise<string | null>` — devolve URL pública ou `null` (best-effort, **nunca lança**)

- [ ] **Step 1: Criar `src/lib/supabase-tenant.ts`**

```typescript
// src/lib/supabase-tenant.ts
//
// PORTA ÚNICA para os dados de tenant (ads_minerados, autopsias, workflow_*).
// Hoje o app é de uso pessoal e existe UM Supabase: esta função devolve o
// client service_role de sempre. Ela existe para que, no dia em que cada
// cliente trouxer o próprio banco (BYOK), a troca aconteça NESTE arquivo em
// vez de nas dezenas de rotas que hoje importam supabaseServer direto.
//
// Regra: código NOVO de dados usa getTenantClient(). Código de CONTROLE
// (config do app, agentes_config, assinatura no futuro) continua em
// supabaseServer — a fronteira é documentada pelo nome que se chama.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase-server';

/** Contexto do tenant. Hoje vazio; ganha userId/credenciais no BYOK. */
export interface TenantCtx {
  userId?: string;
}

export function getTenantClient(_ctx?: TenantCtx): SupabaseClient {
  return supabaseServer;
}
```

- [ ] **Step 2: Criar `src/lib/storage.ts`**

```typescript
// src/lib/storage.ts
//
// Persistência de mídia no Supabase Storage.
//
// POR QUE EXISTE: as URLs do CDN do Facebook são assinadas e EXPIRAM — o
// parâmetro `oe=` é um timestamp Unix em hexadecimal, e a validade medida em
// 26/07/2026 foi de ~5 DIAS. Todo anúncio minerado há mais de uma semana
// aponta para o nada: thumbnail quebrada no card, vídeo que não abre.
// Guardamos o arquivo e mantemos a URL do CDN só como procedência.
//
// Best-effort por decisão: se o download/upload falhar, devolve null e o
// chamador segue com a URL original. Mineração nunca pode quebrar por causa
// do Storage.

import { getTenantClient } from './supabase-tenant';

export const BUCKET_CRIATIVOS = 'criativos';

// Sem o Referer o FB CDN responde 403.
const FB_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.facebook.com/',
  Accept: '*/*',
};

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Extensão a partir do PATH da URL (a querystring assinada não conta). */
export function extensaoDaUrl(url: string, padrao = '.jpg'): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    const m = p.match(/\.(mp4|jpe?g|png|webp|gif)$/);
    return m ? m[0] : padrao;
  } catch {
    return padrao;
  }
}

/** Cria o bucket se ainda não existir. Idempotente. */
export async function garantirBucket(nome = BUCKET_CRIATIVOS): Promise<void> {
  const supabase = getTenantClient();
  const { data } = await supabase.storage.getBucket(nome);
  if (data) return;
  const { error } = await supabase.storage.createBucket(nome, {
    public: true,
    fileSizeLimit: '200MB',
  });
  // Corrida entre duas chamadas simultâneas: "already exists" não é erro.
  if (error && !/exist/i.test(error.message)) throw error;
}

/**
 * Baixa uma URL do CDN e sobe para o Storage.
 * @returns URL pública, ou null se qualquer etapa falhar.
 */
export async function salvarMidia(opts: {
  url: string;
  caminho: string;
  bucket?: string;
}): Promise<string | null> {
  const bucket = opts.bucket ?? BUCKET_CRIATIVOS;
  try {
    await garantirBucket(bucket);

    const res = await fetch(opts.url, { headers: FB_HEADERS, cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[storage] download falhou (${res.status}): ${opts.caminho}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
      console.warn(`[storage] arquivo suspeito (${buffer.length} bytes): ${opts.caminho}`);
      return null;
    }

    const ext = extensaoDaUrl(opts.url);
    const supabase = getTenantClient();
    const { error } = await supabase.storage.from(bucket).upload(opts.caminho, buffer, {
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
      upsert: true,
    });
    if (error) {
      console.warn(`[storage] upload falhou: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(opts.caminho);
    return data.publicUrl;
  } catch (err) {
    console.warn('[storage] erro inesperado:', (err as Error)?.message);
    return null;
  }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erro novo (pode haver um pré-existente em `scratch/`).

- [ ] **Step 4: Provar que funciona de verdade contra o Supabase real**

Crie `scratch-storage-teste.mjs` na raiz (temporário, apagado no fim do passo):

```javascript
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './scripts/_env.mjs';

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: existe } = await sb.storage.getBucket('criativos');
if (!existe) {
  const { error } = await sb.storage.createBucket('criativos', { public: true, fileSizeLimit: '200MB' });
  console.log('createBucket:', error?.message ?? 'OK');
}

// Pega uma imagem real de um anúncio já minerado e sobe.
const { data: ads } = await sb
  .from('ads_minerados')
  .select('id,image_url')
  .not('image_url', 'is', null)
  .limit(1);

const url = ads[0].image_url;
const res = await fetch(url, {
  headers: { Referer: 'https://www.facebook.com/', 'User-Agent': 'Mozilla/5.0' },
});
console.log('download HTTP', res.status);
const buf = Buffer.from(await res.arrayBuffer());
console.log('bytes:', buf.length);

const { error } = await sb.storage
  .from('criativos')
  .upload(`teste/${ads[0].id}.jpg`, buf, { contentType: 'image/jpeg', upsert: true });
console.log('upload:', error?.message ?? 'OK');

const { data: pub } = sb.storage.from('criativos').getPublicUrl(`teste/${ads[0].id}.jpg`);
console.log('publicUrl:', pub.publicUrl);
const check = await fetch(pub.publicUrl);
console.log('publicUrl HTTP', check.status, check.headers.get('content-length'), 'bytes');
```

Run: `node scratch-storage-teste.mjs`
Expected: `download HTTP 200`, bytes > 1000, `upload: OK`, e o `publicUrl HTTP 200` com content-length parecido com os bytes baixados. **Se o download vier 403, o `Referer` não está sendo enviado — pare e corrija antes de seguir.**

Depois: `rm scratch-storage-teste.mjs` e remova o objeto de teste:
`node -e "import('@supabase/supabase-js').then(async({createClient})=>{const{loadEnv}=await import('./scripts/_env.mjs');const e=loadEnv();const sb=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY);const{data}=await sb.storage.from('criativos').list('teste');console.log(await sb.storage.from('criativos').remove(data.map(f=>'teste/'+f.name)));})"`

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase-tenant.ts src/lib/storage.ts
git commit -m "feat(storage): salvarMidia + bucket criativos + getTenantClient

As URLs do CDN do Facebook expiram em ~5 dias (parametro oe=), entao todo
anuncio minerado ha mais de uma semana fica com thumbnail quebrada. Este
modulo baixa a midia com Referer: facebook.com e guarda no Supabase
Storage, mantendo a URL original so como procedencia.

salvarMidia e best-effort de proposito: devolve null em vez de lancar, para
que a mineracao nunca quebre por causa do Storage.

getTenantClient e a porta unica dos dados: hoje devolve o supabaseServer de
sempre, e no dia do BYOK a troca acontece num arquivo so.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Mineração salva a imagem + backfill dos 30 anúncios atuais

⚠️ **O backfill é a primeira coisa a rodar.** Os 30 anúncios foram minerados em 21–22/07 e as URLs vencem ~5 dias depois. Cada dia de atraso perde acervo.

**Files:**
- Create: `supabase/migrations/20260727120000_add_storage_paths_ads_minerados.sql`
- Create: `scripts/storage-backfill.mjs`
- Modify: `src/app/api/mineracao/run/route.ts` (bloco do insert)
- Modify: `src/app/mineracao/page.tsx:63` e `:87` (mapeamento de `image_url`)

**Interfaces:**
- Consumes: `salvarMidia`, `BUCKET_CRIATIVOS` da Task 1
- Produces: colunas `ads_minerados.image_storage_path` (text) e `ads_minerados.video_storage_paths` (text[])

- [ ] **Step 1: Criar a migration**

```sql
-- supabase/migrations/20260727120000_add_storage_paths_ads_minerados.sql
--
-- As URLs do CDN do Facebook expiram em ~5 dias. Guardamos a midia no
-- Supabase Storage e mantemos image_url/video_urls como procedencia.
-- Colunas NOVAS, nao substituicao: anuncio antigo continua funcionando pelo
-- fallback image_storage_path ?? image_url ?? placeholder.

alter table ads_minerados
  add column if not exists image_storage_path text,
  add column if not exists video_storage_paths text[];

comment on column ads_minerados.image_storage_path is
  'URL publica da imagem no Supabase Storage (bucket criativos). Preenchida na mineracao.';
comment on column ads_minerados.video_storage_paths is
  'URLs publicas dos videos no Storage. Preenchida sob demanda (favorito/autopsia), nao na mineracao.';
```

- [ ] **Step 2: Aplicar a migration**

Use `mcp__supabase__apply_migration` com `name: "add_storage_paths_ads_minerados"` e o SQL acima.
Verifique: `mcp__supabase__execute_sql` com
`select column_name from information_schema.columns where table_name='ads_minerados' and column_name in ('image_storage_path','video_storage_paths');`
Expected: 2 linhas.

- [ ] **Step 3: Backfill — criar `scripts/storage-backfill.mjs`**

```javascript
// scripts/storage-backfill.mjs
//
// Salva no Supabase Storage a imagem dos anuncios que ainda nao tem
// image_storage_path. Idempotente: rodar de novo so pega os que faltam.
//
// URGENTE por natureza: as URLs do CDN do FB expiram em ~5 dias. O que nao
// for baixado a tempo esta perdido (so re-minerando).
//
// Rodar: node scripts/storage-backfill.mjs
//
// NOTA: a extracao de miniatura esta duplicada aqui numa versao mini, porque
// este script e .mjs e o helper original (src/lib/minerador-media.ts) e TS.
// Sao 10 linhas e o script e de uso unico — duplicar custa menos que montar
// build de TS so para isso.

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.facebook.com/',
  Accept: '*/*',
};

function firstUrl(arr, keys) {
  for (const item of arr ?? []) for (const k of keys) if (typeof item?.[k] === 'string' && item[k]) return item[k];
  return null;
}

function pickThumbnail(snap) {
  if (!snap) return null;
  const imgs = [...(snap.images ?? []), ...(snap.extra_images ?? [])];
  const cards = snap.cards ?? [];
  return (
    firstUrl(imgs, ['original_image_url', 'resized_image_url']) ||
    firstUrl(cards, ['original_image_url', 'resized_image_url']) ||
    firstUrl([...(snap.videos ?? []), ...(snap.extra_videos ?? []), ...cards], ['video_preview_image_url'])
  );
}

const { data: existe } = await sb.storage.getBucket('criativos');
if (!existe) {
  const { error } = await sb.storage.createBucket('criativos', { public: true, fileSizeLimit: '200MB' });
  if (error && !/exist/i.test(error.message)) throw error;
  console.log('bucket criativos criado');
}

const { data: ads, error } = await sb
  .from('ads_minerados')
  .select('id, image_url, raw_json')
  .is('image_storage_path', null);
if (error) throw error;

console.log(`${ads.length} anuncios sem imagem no Storage`);
let ok = 0;
let falha = 0;

for (const ad of ads) {
  let url = ad.image_url;
  try {
    const raw = typeof ad.raw_json === 'string' ? JSON.parse(ad.raw_json) : ad.raw_json;
    url = pickThumbnail(raw?.snapshot) || url;
  } catch {
    /* usa image_url */
  }
  if (!url) {
    console.log(`- ${ad.id}: sem URL de imagem`);
    falha++;
    continue;
  }

  try {
    const res = await fetch(url, { headers: HDRS });
    if (!res.ok) {
      console.log(`- ${ad.id}: HTTP ${res.status} (URL provavelmente expirada)`);
      falha++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const caminho = `minerados/${ad.id}.jpg`;
    const up = await sb.storage.from('criativos').upload(caminho, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (up.error) throw up.error;
    const { data: pub } = sb.storage.from('criativos').getPublicUrl(caminho);
    await sb.from('ads_minerados').update({ image_storage_path: pub.publicUrl }).eq('id', ad.id);
    console.log(`+ ${ad.id}: ${(buf.length / 1024).toFixed(0)} KB`);
    ok++;
  } catch (e) {
    console.log(`- ${ad.id}: ${e.message}`);
    falha++;
  }
}

console.log(`\nCONCLUIDO — ${ok} salvos, ${falha} falharam`);
```

- [ ] **Step 4: Rodar o backfill AGORA**

Run: `node scripts/storage-backfill.mjs`
Expected: `30 anuncios sem imagem no Storage` e a maioria com `+ <id>: NNN KB`. Falhas por `HTTP 403/410` são URLs já expiradas — registre quantas foram, é dado real sobre a janela de validade.

Confirme no banco com `mcp__supabase__execute_sql`:
`select count(*) filter (where image_storage_path is not null) as salvos, count(*) as total from ads_minerados;`

- [ ] **Step 5: Mineração passa a salvar a imagem**

Em `src/app/api/mineracao/run/route.ts`, adicione o import no topo:

```typescript
import { salvarMidia } from '@/lib/storage';
```

Localize o bloco que monta o objeto do insert (onde `image_url` é atribuído a partir de `pickThumbnail`). **Depois** do insert em `ads_minerados` — e só para os anúncios efetivamente inseridos — persista a imagem. O insert atual devolve os registros; use `.select()` nele se ainda não usar, e acrescente:

```typescript
    // Persistir a miniatura no Storage. As URLs do FB CDN expiram em ~5 dias;
    // sem isso o card fica com imagem quebrada em uma semana.
    // Best-effort e em paralelo: uma falha aqui NUNCA reprova a mineração.
    if (inseridos.length > 0) {
      await Promise.all(
        inseridos.map(async (registro: any) => {
          if (!registro.image_url) return;
          const publica = await salvarMidia({
            url: registro.image_url,
            caminho: `minerados/${registro.id}.jpg`,
          });
          if (publica) {
            await supabase
              .from('ads_minerados')
              .update({ image_storage_path: publica })
              .eq('id', registro.id);
          }
        })
      );
    }
```

Ajuste o nome `inseridos` para a variável que a rota já usa no retorno do insert. Se o insert hoje não faz `.select()`, mude para `.insert(linhas).select('id, image_url')`.

- [ ] **Step 6: Front prefere o Storage**

Em `src/app/mineracao/page.tsx`, na função `fetchProdutos`:

Linha ~63, troque:
```typescript
        let hdImage: string | null = ad.image_url || null;
```
por:
```typescript
        // Storage primeiro: a URL do FB CDN expira em ~5 dias e o card quebra.
        let hdImage: string | null = ad.image_storage_path || ad.image_url || null;
```

E no bloco `try` logo abaixo, o `pickThumbnail(snap) || hdImage` só deve rodar quando **não** houver Storage — senão a URL morta do CDN sobrescreve a boa. Troque:
```typescript
              hdImage = pickThumbnail(snap) || hdImage;
```
por:
```typescript
              if (!ad.image_storage_path) hdImage = pickThumbnail(snap) || hdImage;
```

- [ ] **Step 7: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com `npm run dev` rodando, abra http://localhost:3000/mineracao e confirme que os cards mostram imagem. Depois confirme que a imagem vem do Storage: no DevTools, o `src` do `<img>` deve apontar para `…supabase.co/storage/v1/object/public/criativos/minerados/…`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260727120000_add_storage_paths_ads_minerados.sql scripts/storage-backfill.mjs src/app/api/mineracao/run/route.ts src/app/mineracao/page.tsx
git commit -m "feat(mineracao): persiste a imagem no Storage (URLs do FB expiram em ~5 dias)

O parametro oe= das URLs do FB CDN e um timestamp de validade: medido em
26/07, ~5 dias. Todo anuncio minerado ha mais de uma semana ficava com
thumbnail quebrada no card.

Agora a mineracao baixa a miniatura para o bucket criativos e o front usa
image_storage_path com fallback para image_url. O backfill salvou os
anuncios ja minerados, que estavam no limite da validade.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FASE 1 — Esqueleto navegável

### Task 3: Migration das 3 tabelas da autópsia

**Files:**
- Create: `supabase/migrations/20260727120100_create_autopsia.sql`

**Interfaces:**
- Produces: tabelas `autopsias`, `autopsia_criativos`, `autopsia_jobs` (colunas exatas no SQL abaixo — as tarefas seguintes dependem desses nomes)

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/20260727120100_create_autopsia.sql
--
-- MODULO AUTOPSIA — disseca UM anunciante (a mineracao acha MUITOS anuncios).
--
-- Tres tabelas:
--   autopsias           uma analise de um anunciante numa data
--   autopsia_criativos  um criativo unico (pos-dedup) dentro da autopsia
--   autopsia_jobs       a FILA — e o que permite trocar o worker local por uma
--                       API de transcricao depois sem reescrever o modulo
--
-- Idempotente (IF NOT EXISTS). RLS com policy publica: convencao do projeto
-- enquanto nao ha autenticacao (mesma divida do resto do app).

create table if not exists autopsias (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  page_name text,
  page_profile_pic_url text,
  status text not null default 'coletando',   -- coletando|processando|montando|pronta|erro
  progresso int not null default 0,           -- 0-100
  total_anuncios int default 0,               -- antes da dedup
  total_criativos int default 0,              -- depois da dedup
  total_transcritos int default 0,
  dossie_json jsonb,
  dossie_md text,
  dossie_html_url text,
  erro text,
  criado_em timestamptz default now(),
  concluido_em timestamptz
);

create table if not exists autopsia_criativos (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  ad_archive_id text,
  creative_key text not null,
  tipo text not null default 'video',         -- video|imagem
  duracao_s int,
  dias_no_ar int,
  is_active boolean,
  ad_copy text,
  ad_title text,
  cta_text text,
  link_url text,
  url_origem text,                            -- CDN do FB (expira ~5 dias)
  storage_path text,                          -- o arquivo de verdade
  transcricao text,
  transcricao_srt text,
  frames_paths text[],
  raw_json jsonb,
  criado_em timestamptz default now(),
  unique (autopsia_id, creative_key)
);

create table if not exists autopsia_jobs (
  id uuid primary key default gen_random_uuid(),
  autopsia_id uuid not null references autopsias(id) on delete cascade,
  criativo_id uuid references autopsia_criativos(id) on delete cascade,
  tipo text not null,                         -- download|frames|transcrever
  status text not null default 'pendente',    -- pendente|processando|concluido|erro
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);

create index if not exists idx_autopsia_criativos_autopsia on autopsia_criativos (autopsia_id);
create index if not exists idx_autopsia_jobs_fila on autopsia_jobs (status, criado_em);
create index if not exists idx_autopsia_jobs_autopsia on autopsia_jobs (autopsia_id);

alter table autopsias enable row level security;
alter table autopsia_criativos enable row level security;
alter table autopsia_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'autopsias' and policyname = 'autopsias_publico') then
    create policy autopsias_publico on autopsias for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'autopsia_criativos' and policyname = 'autopsia_criativos_publico') then
    create policy autopsia_criativos_publico on autopsia_criativos for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'autopsia_jobs' and policyname = 'autopsia_jobs_publico') then
    create policy autopsia_jobs_publico on autopsia_jobs for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsias') then
    alter publication supabase_realtime add table autopsias;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsia_criativos') then
    alter publication supabase_realtime add table autopsia_criativos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'autopsia_jobs') then
    alter publication supabase_realtime add table autopsia_jobs;
  end if;
end $$;
```

- [ ] **Step 2: Aplicar via MCP**

`mcp__supabase__apply_migration` com `name: "create_autopsia"`.

- [ ] **Step 3: Verificar**

`mcp__supabase__execute_sql`:
```sql
select table_name from information_schema.tables
where table_name in ('autopsias','autopsia_criativos','autopsia_jobs');
select tablename, policyname from pg_policies where tablename like 'autopsia%';
select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename like 'autopsia%';
```
Expected: 3 tabelas, 3 policies, 3 tabelas no Realtime.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727120100_create_autopsia.sql
git commit -m "feat(autopsia): tabelas autopsias, autopsia_criativos e autopsia_jobs

A fila (autopsia_jobs) e o ponto arquitetural: transcricao leva minutos por
video e nao cabe em rota de API (maxDuration=300). A rota so enfileira; um
worker consome. Trocar o worker local por API de transcricao depois e
escrever outro consumidor desta tabela, nao reescrever o modulo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Extrair `creativeKeyFromSnap()` para o lib compartilhado

A função vive hoje dentro de `src/app/api/mineracao/run/route.ts` (linhas ~42–58) e a coleta da autópsia precisa da mesma assinatura de dedup. É **extração pura**: o corpo não muda.

**Files:**
- Modify: `src/lib/minerador-media.ts` (adicionar a função)
- Modify: `src/app/api/mineracao/run/route.ts:42-58` (remover a local, importar)

**Interfaces:**
- Produces: `creativeKeyFromSnap(snap: any): string | null` exportada de `src/lib/minerador-media.ts`

- [ ] **Step 1: Adicionar em `src/lib/minerador-media.ts`**

No fim do arquivo:

```typescript
/**
 * Assinatura ESTÁVEL do criativo, para dedup de duplicata real.
 *
 * As URLs do FB CDN trazem querystring assinada que muda toda hora
 * (oh=, oe=, _nc_gid=…), então comparamos só o PATH do arquivo — o token do
 * vídeo/imagem é estável e idêntico quando o criativo é o mesmo, mesmo com
 * ad_archive_id diferente (o mesmo vídeo aparece em várias páginas da marca).
 *
 * Prefixo 'v:' para vídeo e 'i:' para imagem, para nunca colidirem.
 */
export function creativeKeyFromSnap(snap: any): string | null {
  const vid =
    (Array.isArray(snap?.videos) ? snap.videos : [])[0] ??
    (Array.isArray(snap?.extra_videos) ? snap.extra_videos : [])[0];
  const vurl = vid?.video_hd_url || vid?.video_sd_url;
  if (vurl) {
    try { return 'v:' + new URL(vurl).pathname; } catch { /* url inválida */ }
  }
  const img =
    (Array.isArray(snap?.images) ? snap.images : [])[0] ??
    (Array.isArray(snap?.extra_images) ? snap.extra_images : [])[0];
  const iurl = img?.original_image_url || img?.resized_image_url;
  if (iurl) {
    try { return 'i:' + new URL(iurl).pathname; } catch { /* url inválida */ }
  }
  return null;
}
```

- [ ] **Step 2: Remover a cópia local da rota**

Em `src/app/api/mineracao/run/route.ts`, apague a `function creativeKeyFromSnap` inteira (com o bloco de comentário acima dela) e acrescente ao import existente:

```typescript
import { pickThumbnail, pickVideos, pickImages, creativeKeyFromSnap } from '@/lib/minerador-media';
```

(o import atual usa caminho relativo ou `@/lib/minerador-media` — mantenha o estilo que já está lá, só some `creativeKeyFromSnap` à lista.)

- [ ] **Step 3: Verificar que nada mudou de comportamento**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Run: `node -e "console.log(require('fs').readFileSync('src/app/api/mineracao/run/route.ts','utf8').includes('function creativeKeyFromSnap'))"`
Expected: `false` (a cópia local sumiu).

- [ ] **Step 4: Commit**

```bash
git add src/lib/minerador-media.ts src/app/api/mineracao/run/route.ts
git commit -m "refactor(minerador): move creativeKeyFromSnap para minerador-media

A coleta da autopsia precisa da MESMA assinatura de dedup da mineracao —
duas copias divergiriam e o modulo passaria a deduplicar diferente do resto
do app. minerador-media ja e puro e ja e compartilhado entre rota e client.

Extracao pura: o corpo da funcao nao mudou.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `coleta.ts` — ScrapeCreators paginado + dedup

**Files:**
- Create: `src/lib/autopsia/coleta.ts`

**Interfaces:**
- Consumes: `creativeKeyFromSnap`, `pickVideos`, `pickThumbnail` de `@/lib/minerador-media`
- Produces:
  - `parsePageId(entrada: string): string | null`
  - `decodeEfg(url: string): { duration_s?: number; asset_age_days?: number } | null`
  - `interface CriativoColetado` (campos no código)
  - `coletarAnunciante(pageId: string, opts?: { maxPaginas?: number }): Promise<ResultadoColeta>`

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/autopsia/coleta.ts
//
// COLETA DE UM ANUNCIANTE INTEIRO na Biblioteca de Anúncios do Meta.
//
// A mineração busca por KEYWORD (muitos anunciantes, poucos anúncios de cada).
// A autópsia busca por PAGE_ID: todos os anúncios de UM anunciante.
// Endpoint verificado em 26/07/2026: devolve 30 anúncios por chamada + um
// `cursor` para a próxima página, e cobra 1 crédito por chamada.
//
// A razão entre total de anúncios e criativos únicos é sinal de leitura: 18
// anúncios para 8 vídeos significa copy travada com criativo em rotação —
// operação que já achou a mensagem e agora só compra volume.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { creativeKeyFromSnap, pickVideos, pickThumbnail } from '@/lib/minerador-media';

const COMPANY_ADS_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads';

export interface CriativoColetado {
  ad_archive_id: string | null;
  creative_key: string;
  tipo: 'video' | 'imagem';
  duracao_s: number | null;
  dias_no_ar: number | null;
  is_active: boolean | null;
  ad_copy: string | null;
  ad_title: string | null;
  cta_text: string | null;
  link_url: string | null;
  url_origem: string | null;
  raw_json: any;
}

export interface ResultadoColeta {
  page_id: string;
  page_name: string | null;
  page_profile_pic_url: string | null;
  total_anuncios: number;
  criativos: CriativoColetado[];
  paginas_lidas: number;
  creditos_gastos: number;
}

/**
 * Aceita page_id puro ("1130979790090955") ou URL da Biblioteca de Anúncios
 * (…?view_all_page_id=123… ou …&id=123…). Devolve null se não achar dígitos.
 */
export function parsePageId(entrada: string): string | null {
  const txt = (entrada ?? '').trim();
  if (!txt) return null;
  if (/^\d{5,}$/.test(txt)) return txt;
  try {
    const u = new URL(txt);
    const cand =
      u.searchParams.get('view_all_page_id') ||
      u.searchParams.get('page_id') ||
      u.searchParams.get('id');
    if (cand && /^\d{5,}$/.test(cand)) return cand;
  } catch {
    /* não é URL */
  }
  const m = txt.match(/\d{8,}/);
  return m ? m[0] : null;
}

/**
 * O parâmetro `efg` da URL do vídeo no FB CDN é base64 de um JSON com
 * `duration_s` e `asset_age_days`. Vem de graça na URL que já temos — o
 * worker corrige a duração com o valor real do ffprobe depois.
 */
export function decodeEfg(url: string): { duration_s?: number; asset_age_days?: number } | null {
  try {
    const efg = new URL(url).searchParams.get('efg');
    if (!efg) return null;
    const json = JSON.parse(Buffer.from(efg, 'base64').toString('utf8'));
    return {
      duration_s: typeof json.duration_s === 'number' ? json.duration_s : undefined,
      asset_age_days: typeof json.asset_age_days === 'number' ? json.asset_age_days : undefined,
    };
  } catch {
    return null;
  }
}

/** Dias que o anúncio ficou (ou está) no ar. start_date/end_date vêm em segundos. */
function calcularDiasNoAr(start?: number, end?: number): number | null {
  if (!start) return null;
  const fim = end ? Math.min(end * 1000, Date.now()) : Date.now();
  const dias = Math.floor((fim - start * 1000) / 86_400_000);
  return dias >= 0 ? dias : null;
}

export async function coletarAnunciante(
  pageId: string,
  opts: { maxPaginas?: number } = {}
): Promise<ResultadoColeta> {
  const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
  if (!apiKey) throw new Error('SCRAPE_CREATORS_API_KEY não configurada no .env.local.');

  // Teto de segurança: cada página custa 1 crédito. 10 páginas = 300 anúncios,
  // suficiente para qualquer operação real sem torrar crédito num anunciante gigante.
  const maxPaginas = opts.maxPaginas ?? 10;

  const porChave = new Map<string, CriativoColetado>();
  let cursor: string | null = null;
  let totalAnuncios = 0;
  let paginas = 0;
  let pageName: string | null = null;
  let pageProfilePic: string | null = null;

  while (paginas < maxPaginas) {
    const url = new URL(COMPANY_ADS_URL);
    url.searchParams.set('pageId', pageId);
    url.searchParams.set('trim', 'false');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalhe = (await res.text()).slice(0, 500);
      throw new Error(`ScrapeCreators respondeu ${res.status}: ${detalhe}`);
    }
    const data: any = await res.json();
    paginas++;

    const results: any[] = Array.isArray(data.results) ? data.results : [];
    totalAnuncios += results.length;

    for (const ad of results) {
      const snap = ad?.snapshot;
      if (!snap) continue;
      if (!pageName) pageName = snap.page_name ?? ad.page_name ?? null;
      if (!pageProfilePic) pageProfilePic = snap.page_profile_picture_url ?? null;

      const chave = creativeKeyFromSnap(snap);
      if (!chave) continue;
      if (porChave.has(chave)) continue; // duplicata real — mesmo criativo

      const videos = pickVideos(snap);
      const ehVideo = videos.length > 0;
      const urlOrigem = ehVideo ? videos[0] : pickThumbnail(snap);
      const efg = ehVideo && urlOrigem ? decodeEfg(urlOrigem) : null;

      porChave.set(chave, {
        ad_archive_id: ad.ad_archive_id ? String(ad.ad_archive_id) : null,
        creative_key: chave,
        tipo: ehVideo ? 'video' : 'imagem',
        duracao_s: efg?.duration_s ?? null,
        dias_no_ar: calcularDiasNoAr(ad.start_date, ad.end_date),
        is_active: typeof ad.is_active === 'boolean' ? ad.is_active : null,
        ad_copy: snap.body?.text ?? snap.body ?? null,
        ad_title: snap.title ?? null,
        cta_text: snap.cta_text ?? null,
        link_url: snap.link_url ?? null,
        url_origem: urlOrigem,
        raw_json: ad,
      });
    }

    cursor = typeof data.cursor === 'string' && data.cursor ? data.cursor : null;
    if (!cursor || results.length === 0) break;
  }

  return {
    page_id: pageId,
    page_name: pageName,
    page_profile_pic_url: pageProfilePic,
    total_anuncios: totalAnuncios,
    criativos: [...porChave.values()],
    paginas_lidas: paginas,
    creditos_gastos: paginas,
  };
}
```

⚠️ `snap.body` na ScrapeCreators às vezes é `{ text: "…" }` e às vezes string — o `??` acima cobre os dois. Se vier objeto sem `text`, o valor cai em `null` e o dossiê registra a copy ausente em vez de gravar `[object Object]`.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

- [ ] **Step 3: Provar contra o anunciante-gabarito**

Crie `scratch-coleta-teste.mjs` (temporário) — chama a API direto com a mesma lógica, para conferir o número mágico **8 criativos únicos** do *Alimento Sagrado*:

```javascript
import { loadEnv } from './scripts/_env.mjs';
const env = loadEnv();

const res = await fetch(
  'https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?pageId=1130979790090955&trim=false',
  { headers: { 'x-api-key': env.SCRAPE_CREATORS_API_KEY } }
);
const d = await res.json();
console.log('HTTP', res.status, '| creditos gastos:', d.credits_charged, '| restantes:', d.credits_remaining);
console.log('anuncios nesta pagina:', d.results.length, '| cursor:', d.cursor ? 'sim' : 'nao');

const chaves = new Map();
for (const ad of d.results) {
  const s = ad.snapshot;
  const v = (s.videos ?? [])[0] ?? (s.extra_videos ?? [])[0];
  const u = v?.video_hd_url || v?.video_sd_url;
  if (!u) continue;
  const efg = new URL(u).searchParams.get('efg');
  const meta = efg ? JSON.parse(Buffer.from(efg, 'base64').toString()) : {};
  chaves.set('v:' + new URL(u).pathname, meta.duration_s);
}
console.log('criativos de video unicos:', chaves.size);
console.log('duracoes:', [...chaves.values()].sort((a, b) => a - b).join('s, ') + 's');
```

Run: `node scratch-coleta-teste.mjs`
Expected: HTTP 200; `criativos de video unicos` próximo de **8** e durações no intervalo **31s–130s** (o gabarito de 24/07 em `low-ticket/alimento-sagrado/videos/` é 31, 82, 91, 105, 109, 110, 111, 130). Divergência é aceitável **se explicável** por anúncio novo/removido desde 24/07 — divergência grande (ex.: 30 chaves únicas) significa dedup quebrada, e aí pare e investigue.

Depois: `rm scratch-coleta-teste.mjs`

- [ ] **Step 4: Commit**

```bash
git add src/lib/autopsia/coleta.ts
git commit -m "feat(autopsia): coleta o anunciante inteiro por page_id, com dedup

Endpoint company/ads da ScrapeCreators: 30 anuncios por chamada + cursor, 1
credito cada. Substitui os passos 1-3 e 5 do metodo manual (Playwright,
scroll, parse de innerText, dedup por xpv_asset_id) — a API e estavel e nao
quebra quando o Facebook mexe no DOM.

Dedup pela MESMA creativeKeyFromSnap da mineracao. A razao entre anuncios e
criativos unicos e sinal de leitura: copy travada com criativo em rotacao.

Teto de 10 paginas para nao torrar credito em anunciante gigante.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `POST /api/autopsia/criar`

**Files:**
- Create: `src/app/api/autopsia/criar/route.ts`

**Interfaces:**
- Consumes: `coletarAnunciante`, `parsePageId` (Task 5); `getTenantClient` (Task 1)
- Produces: `POST /api/autopsia/criar` com body `{ page_id?, url?, ad_minerado_id? }` → `{ sucesso, autopsia_id, total_anuncios, total_criativos, creditos_gastos }`

- [ ] **Step 1: Criar a rota**

```typescript
// src/app/api/autopsia/criar/route.ts
//
// Cria uma autópsia e ENFILEIRA o trabalho. Não baixa nem transcreve nada:
// transcrição leva minutos por vídeo e não cabe em rota de API (o teto de
// maxDuration é 300s). Quem processa é scripts/worker-autopsia.py.
//
// Body: { page_id } | { url } (da Ad Library) | { ad_minerado_id }
//
// Só o job de `download` entra na fila aqui. `frames` e `transcrever` são
// enfileirados pelo worker quando o download conclui — dependem do arquivo
// existir.

import { getTenantClient } from '@/lib/supabase-tenant';
import { coletarAnunciante, parsePageId } from '@/lib/autopsia/coleta';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getTenantClient();

    // 1. Descobrir o page_id
    let pageId: string | null = null;
    if (body.ad_minerado_id) {
      const { data, error } = await supabase
        .from('ads_minerados')
        .select('page_id')
        .eq('id', body.ad_minerado_id)
        .single();
      if (error || !data?.page_id) {
        return Response.json({ error: 'Anúncio não encontrado ou sem page_id.' }, { status: 404 });
      }
      pageId = String(data.page_id);
    } else {
      pageId = parsePageId(body.page_id ?? body.url ?? '');
    }
    if (!pageId) {
      return Response.json(
        { error: 'Informe page_id, url da Biblioteca de Anúncios ou ad_minerado_id.' },
        { status: 400 }
      );
    }

    // 2. Coletar
    const coleta = await coletarAnunciante(pageId);
    if (coleta.criativos.length === 0) {
      return Response.json(
        { error: 'Nenhum criativo encontrado para esse anunciante.', page_id: pageId },
        { status: 404 }
      );
    }

    // 3. Gravar a autópsia
    const { data: autopsia, error: errAutopsia } = await supabase
      .from('autopsias')
      .insert({
        page_id: coleta.page_id,
        page_name: coleta.page_name,
        page_profile_pic_url: coleta.page_profile_pic_url,
        status: 'processando',
        total_anuncios: coleta.total_anuncios,
        total_criativos: coleta.criativos.length,
        progresso: 0,
      })
      .select('id')
      .single();
    if (errAutopsia || !autopsia) {
      return Response.json(
        { error: 'Falha ao criar a autópsia', detalhe: errAutopsia?.message },
        { status: 500 }
      );
    }

    // 4. Gravar os criativos
    const { data: criativos, error: errCriativos } = await supabase
      .from('autopsia_criativos')
      .insert(
        coleta.criativos.map((c) => ({
          autopsia_id: autopsia.id,
          ad_archive_id: c.ad_archive_id,
          creative_key: c.creative_key,
          tipo: c.tipo,
          duracao_s: c.duracao_s,
          dias_no_ar: c.dias_no_ar,
          is_active: c.is_active,
          ad_copy: c.ad_copy,
          ad_title: c.ad_title,
          cta_text: c.cta_text,
          link_url: c.link_url,
          url_origem: c.url_origem,
          raw_json: c.raw_json,
        }))
      )
      .select('id');
    if (errCriativos || !criativos) {
      await supabase.from('autopsias').delete().eq('id', autopsia.id);
      return Response.json(
        { error: 'Falha ao gravar os criativos', detalhe: errCriativos?.message },
        { status: 500 }
      );
    }

    // 5. Enfileirar um download por criativo
    const { error: errJobs } = await supabase.from('autopsia_jobs').insert(
      criativos.map((c) => ({
        autopsia_id: autopsia.id,
        criativo_id: c.id,
        tipo: 'download',
        status: 'pendente',
      }))
    );
    if (errJobs) {
      return Response.json(
        { error: 'Autópsia criada, mas a fila falhou', detalhe: errJobs.message, autopsia_id: autopsia.id },
        { status: 500 }
      );
    }

    return Response.json({
      sucesso: true,
      autopsia_id: autopsia.id,
      page_id: coleta.page_id,
      page_name: coleta.page_name,
      total_anuncios: coleta.total_anuncios,
      total_criativos: coleta.criativos.length,
      paginas_lidas: coleta.paginas_lidas,
      creditos_gastos: coleta.creditos_gastos,
    });
  } catch (err) {
    console.error('[api/autopsia/criar] erro:', err);
    return Response.json(
      { error: 'Falha ao criar a autópsia', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

- [ ] **Step 3: Rodar de verdade**

Com `npm run dev` ativo:

```bash
curl -s -X POST http://localhost:3000/api/autopsia/criar \
  -H "Content-Type: application/json" \
  -d '{"page_id":"1130979790090955"}' | head -c 600
```
Expected: `"sucesso":true` com `total_criativos` próximo de 8 e um `autopsia_id`.

Confirme a fila com `mcp__supabase__execute_sql`:
```sql
select a.page_name, a.total_anuncios, a.total_criativos,
       (select count(*) from autopsia_jobs j where j.autopsia_id = a.id) as jobs
from autopsias a order by a.criado_em desc limit 1;
```
Expected: `jobs` = `total_criativos`, todos `pendente`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/autopsia/criar/route.ts
git commit -m "feat(autopsia): rota criar — coleta e enfileira

Aceita page_id, URL da Biblioteca de Anuncios ou ad_minerado_id (o botao da
tela de mineracao). Coleta, deduplica, grava autopsia + criativos e enfileira
um job de download por criativo.

A rota NAO baixa nem transcreve: isso e do worker. Se os criativos falharem
ao gravar, a autopsia orfa e apagada em vez de ficar zumbi na lista.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Página `/autopsia` (lista) + item na Sidebar

**Files:**
- Create: `src/app/autopsia/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `POST /api/autopsia/criar` (Task 6); tabela `autopsias`
- Produces: rota `/autopsia`

- [ ] **Step 1: Criar `src/app/autopsia/page.tsx`**

```tsx
"use client";

// Lista de autópsias. A mineração acha muitos anúncios rasos; a autópsia
// disseca UM anunciante a fundo. Telas separadas de propósito: mineração é
// lista larga que se percorre rápido, autópsia é peça longa que se lê.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Microscope, Loader2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Autopsia {
  id: string;
  page_id: string;
  page_name: string | null;
  page_profile_pic_url: string | null;
  status: string;
  progresso: number;
  total_anuncios: number;
  total_criativos: number;
  total_transcritos: number;
  erro: string | null;
  criado_em: string;
}

const STATUS_COR: Record<string, string> = {
  coletando: 'text-status-yellow',
  processando: 'text-status-yellow',
  montando: 'text-primary',
  pronta: 'text-status-green',
  erro: 'text-status-red',
};

export default function AutopsiaPage() {
  const [autopsias, setAutopsias] = useState<Autopsia[]>([]);
  const [loading, setLoading] = useState(true);
  const [entrada, setEntrada] = useState('');
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAutopsias();
    const channel = supabase
      .channel('autopsias_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsias' }, fetchAutopsias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAutopsias() {
    const { data, error } = await supabase
      .from('autopsias')
      .select('*')
      .order('criado_em', { ascending: false });
    if (!error && data) setAutopsias(data as Autopsia[]);
    setLoading(false);
  }

  async function criar() {
    if (!entrada.trim() || criando) return;
    setCriando(true);
    setMsg(null);
    try {
      const res = await fetch('/api/autopsia/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: entrada.trim(), url: entrada.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? 'Falha ao criar a autópsia.');
      } else {
        setMsg(
          `${json.total_anuncios} anúncios → ${json.total_criativos} criativos únicos. ` +
          `Rode o worker para processar: node/py scripts/worker-autopsia.py`
        );
        setEntrada('');
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
    setCriando(false);
  }

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Microscope className="text-primary" size={26} />
          Autópsia de Concorrente
        </h1>
        <p className="text-secondary text-sm mt-1">
          A mineração acha anúncios. A autópsia disseca um anunciante — todos os criativos,
          a copy falada, a estrutura da oferta.
        </p>
      </div>

      <div className="bg-surface border border-surface-elevated rounded-xl p-5 mb-8">
        <label className="text-xs uppercase tracking-wider text-secondary font-semibold">
          Nova autópsia
        </label>
        <div className="flex gap-3 mt-2">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && criar()}
            placeholder="page_id (ex: 1130979790090955) ou URL da Biblioteca de Anúncios"
            className="flex-1 bg-[#0D0D14] border border-surface-elevated rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-secondary focus:outline-none focus:border-primary"
          />
          <button
            onClick={criar}
            disabled={criando || !entrada.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all"
          >
            {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {criando ? 'Coletando…' : 'Autopsiar'}
          </button>
        </div>
        {msg && <p className="text-xs text-secondary mt-3">{msg}</p>}
      </div>

      {loading ? (
        <div className="text-secondary text-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Carregando…
        </div>
      ) : autopsias.length === 0 ? (
        <div className="text-center py-20 text-secondary">
          <Microscope size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma autópsia ainda. Cole um page_id acima ou use o botão em Mineração.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {autopsias.map((a) => (
            <Link
              key={a.id}
              href={`/autopsia/${a.id}`}
              className="bg-surface border border-surface-elevated hover:border-primary/40 rounded-xl p-5 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {a.page_profile_pic_url ? (
                  <img src={a.page_profile_pic_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface-elevated" />
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{a.page_name ?? a.page_id}</p>
                  <p className="text-secondary text-[11px]">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs mb-3">
                <span className={`font-semibold uppercase tracking-wide ${STATUS_COR[a.status] ?? 'text-secondary'}`}>
                  {a.status === 'pronta' ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                  {a.status}
                </span>
                {a.erro && <AlertCircle size={12} className="text-status-red" />}
              </div>

              <div className="h-1.5 bg-[#0D0D14] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary transition-all" style={{ width: `${a.progresso}%` }} />
              </div>

              <div className="flex gap-4 text-[11px] text-secondary">
                <span>{a.total_anuncios} anúncios</span>
                <span className="text-white">{a.total_criativos} criativos</span>
                <span>{a.total_transcritos} transcritos</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar o item na Sidebar**

Em `src/components/layout/Sidebar.tsx`, adicione `Microscope` à lista de ícones importados de `lucide-react` e insira o link **logo depois** do bloco `/mineracao` (a autópsia é o passo seguinte à mineração no fluxo real):

```tsx
        <Link 
          href="/autopsia" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname.startsWith('/autopsia') ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Microscope size={18} />
          Autópsia
        </Link>
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com o dev rodando: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/autopsia`
Expected: `200`. Abra no navegador: a autópsia criada na Task 6 aparece no grid, com o item "Autópsia" ativo na sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/app/autopsia/page.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(autopsia): pagina de lista + item na sidebar

Rota propria, nao aba escondida: a mineracao e commodity (dez ferramentas
listam a Ad Library), a autopsia e o diferencial. Lista com Realtime e barra
de progresso por autopsia, seguindo o padrao de /producao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Página `/autopsia/[id]` com abas

**Files:**
- Create: `src/app/autopsia/[id]/page.tsx`

**Interfaces:**
- Consumes: tabelas `autopsias`, `autopsia_criativos`, `autopsia_jobs`
- Produces: rota `/autopsia/<id>`

- [ ] **Step 1: Criar a página**

```tsx
"use client";

// Detalhe de uma autópsia: o material coletado e o dossiê.
// Abas em vez de página longa porque as naturezas são diferentes — grade de
// criativos se percorre, transcrição se lê.
//
// O aviso de "worker offline" existe porque a fila é consumida por um script
// na máquina do Fernando: sem ele a tela ficaria em 0% para sempre, sem
// explicação nenhuma.

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Loader2, FileText, Film, Image as ImageIcon, Mic, AlertTriangle } from 'lucide-react';

interface Autopsia {
  id: string; page_id: string; page_name: string | null; page_profile_pic_url: string | null;
  status: string; progresso: number; total_anuncios: number; total_criativos: number;
  total_transcritos: number; dossie_md: string | null; dossie_html_url: string | null;
  erro: string | null; criado_em: string;
}
interface Criativo {
  id: string; ad_archive_id: string | null; tipo: string; duracao_s: number | null;
  dias_no_ar: number | null; is_active: boolean | null; ad_copy: string | null;
  ad_title: string | null; cta_text: string | null; link_url: string | null;
  url_origem: string | null; storage_path: string | null; transcricao: string | null;
  frames_paths: string[] | null;
}
interface Job { id: string; tipo: string; status: string; erro: string | null; iniciado_em: string | null; criado_em: string; }

type Aba = 'criativos' | 'transcricoes' | 'frames' | 'dossie';

export default function AutopsiaDetalhePage() {
  const params = useParams();
  const id = String(params.id);
  const [autopsia, setAutopsia] = useState<Autopsia | null>(null);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [aba, setAba] = useState<Aba>('criativos');
  const [loading, setLoading] = useState(true);

  const fetchTudo = useCallback(async () => {
    const [a, c, j] = await Promise.all([
      supabase.from('autopsias').select('*').eq('id', id).single(),
      supabase.from('autopsia_criativos').select('*').eq('autopsia_id', id).order('dias_no_ar', { ascending: false }),
      supabase.from('autopsia_jobs').select('id,tipo,status,erro,iniciado_em,criado_em').eq('autopsia_id', id),
    ]);
    if (a.data) setAutopsia(a.data as Autopsia);
    if (c.data) setCriativos(c.data as Criativo[]);
    if (j.data) setJobs(j.data as Job[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTudo();
    const channel = supabase
      .channel(`autopsia_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsias' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsia_criativos' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsia_jobs' }, fetchTudo)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchTudo]);

  // Job pendente há mais de 10 minutos sem ninguém pegar = worker parado.
  const pendentes = jobs.filter((j) => j.status === 'pendente');
  const workerParece0ffline =
    pendentes.length > 0 &&
    pendentes.every((j) => Date.now() - new Date(j.criado_em).getTime() > 10 * 60 * 1000);
  const jobsComErro = jobs.filter((j) => j.status === 'erro');

  if (loading) {
    return <div className="text-secondary text-sm flex items-center gap-2 p-8"><Loader2 size={16} className="animate-spin" /> Carregando…</div>;
  }
  if (!autopsia) {
    return <div className="p-8 text-secondary text-sm">Autópsia não encontrada.</div>;
  }

  const abas: { chave: Aba; rotulo: string; icone: React.ReactNode; contador: number }[] = [
    { chave: 'criativos', rotulo: 'Criativos', icone: <Film size={15} />, contador: criativos.length },
    { chave: 'transcricoes', rotulo: 'Transcrições', icone: <Mic size={15} />, contador: criativos.filter((c) => c.transcricao).length },
    { chave: 'frames', rotulo: 'Frames', icone: <ImageIcon size={15} />, contador: criativos.filter((c) => c.frames_paths?.length).length },
    { chave: 'dossie', rotulo: 'Dossiê', icone: <FileText size={15} />, contador: autopsia.dossie_md ? 1 : 0 },
  ];

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <Link href="/autopsia" className="text-secondary hover:text-white text-sm flex items-center gap-2 mb-6">
        <ArrowLeft size={15} /> Autópsias
      </Link>

      <div className="flex items-center gap-4 mb-6">
        {autopsia.page_profile_pic_url && (
          <img src={autopsia.page_profile_pic_url} alt="" className="w-12 h-12 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{autopsia.page_name ?? autopsia.page_id}</h1>
          <p className="text-secondary text-sm">
            {autopsia.total_anuncios} anúncios → <span className="text-white">{autopsia.total_criativos} criativos únicos</span>
            {' · '}{autopsia.total_transcritos} transcritos · status <span className="text-white">{autopsia.status}</span>
          </p>
        </div>
      </div>

      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-6">
        <div className="h-full bg-primary transition-all" style={{ width: `${autopsia.progresso}%` }} />
      </div>

      {workerParece0ffline && (
        <div className="bg-status-yellow/10 border border-status-yellow/30 rounded-lg p-4 mb-6 flex gap-3">
          <AlertTriangle size={18} className="text-status-yellow shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-status-yellow font-semibold">O worker parece estar parado.</p>
            <p className="text-secondary text-xs mt-1">
              {pendentes.length} job(s) esperando há mais de 10 minutos. Rode na raiz do projeto:{' '}
              <code className="text-white">py -3 scripts/worker-autopsia.py</code>
            </p>
          </div>
        </div>
      )}

      {jobsComErro.length > 0 && (
        <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4 mb-6 text-sm">
          <p className="text-status-red font-semibold">{jobsComErro.length} job(s) falharam</p>
          <ul className="text-secondary text-xs mt-1 space-y-0.5">
            {jobsComErro.slice(0, 5).map((j) => <li key={j.id}>· {j.tipo}: {j.erro}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-2 border-b border-surface-elevated mb-6">
        {abas.map((t) => (
          <button
            key={t.chave}
            onClick={() => setAba(t.chave)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              aba === t.chave ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'
            }`}
          >
            {t.icone} {t.rotulo}
            <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded">{t.contador}</span>
          </button>
        ))}
      </div>

      {aba === 'criativos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {criativos.map((c) => (
            <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl overflow-hidden">
              {c.storage_path && c.tipo === 'video' ? (
                <video src={c.storage_path} controls className="w-full aspect-[9/16] object-cover bg-black" />
              ) : c.storage_path ? (
                <img src={c.storage_path} alt="" className="w-full aspect-[9/16] object-cover bg-black" />
              ) : (
                <div className="w-full aspect-[9/16] bg-[#0D0D14] flex items-center justify-center text-secondary text-xs">
                  aguardando download
                </div>
              )}
              <div className="p-4">
                <div className="flex gap-3 text-[11px] text-secondary mb-2">
                  {c.duracao_s && <span className="text-white">{c.duracao_s}s</span>}
                  {c.dias_no_ar !== null && <span>{c.dias_no_ar} dias no ar</span>}
                  {c.is_active && <span className="text-status-green">ativo</span>}
                </div>
                <p className="text-xs text-secondary line-clamp-4 whitespace-pre-wrap">{c.ad_copy ?? '—'}</p>
                {c.cta_text && <p className="text-[11px] text-primary mt-2">{c.cta_text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'transcricoes' && (
        <div className="space-y-4">
          {criativos.filter((c) => c.transcricao).length === 0 ? (
            <p className="text-secondary text-sm">
              Nenhuma transcrição ainda. A legenda queimada dos anúncios é karaokê palavra-a-palavra —
              ler a copy por frame é inviável, por isso o áudio é transcrito.
            </p>
          ) : (
            criativos.filter((c) => c.transcricao).map((c) => (
              <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl p-5">
                <p className="text-[11px] text-secondary mb-2">
                  {c.duracao_s}s · {c.dias_no_ar} dias no ar {c.is_active ? '· ativo' : ''}
                </p>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{c.transcricao}</p>
              </div>
            ))
          )}
        </div>
      )}

      {aba === 'frames' && (
        <div className="space-y-6">
          {criativos.filter((c) => c.frames_paths?.length).map((c) => (
            <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl p-5">
              <p className="text-[11px] text-secondary mb-3">{c.duracao_s}s · {c.dias_no_ar} dias no ar</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {c.frames_paths!.map((url) => (
                  <img key={url} src={url} alt="" className="w-full rounded-lg border border-surface-elevated" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'dossie' && (
        <div className="bg-surface border border-surface-elevated rounded-xl p-6">
          {autopsia.dossie_md ? (
            <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
              {autopsia.dossie_md}
            </pre>
          ) : (
            <p className="text-secondary text-sm">
              O dossiê é gerado depois que os criativos estiverem transcritos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com o dev rodando, pegue o id da autópsia criada na Task 6 e abra `http://localhost:3000/autopsia/<id>`.
Expected: HTTP 200, cabeçalho com o nome do anunciante, os criativos listados com "aguardando download", e — como o worker ainda não existe — o aviso amarelo de worker parado depois de 10 min.

- [ ] **Step 3: Commit**

```bash
git add "src/app/autopsia/[id]/page.tsx"
git commit -m "feat(autopsia): pagina de detalhe com abas Criativos/Transcricoes/Frames/Dossie

Realtime nas tres tabelas: o worker roda fora do app e a tela precisa
refletir o progresso sem F5.

O aviso de worker offline existe porque a fila e consumida por um script
local — sem ele a tela ficaria em 0% para sempre sem explicar por que.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Botão "Autopsiar este anunciante" em `/mineracao`

**Files:**
- Modify: `src/app/mineracao/page.tsx`

**Interfaces:**
- Consumes: `POST /api/autopsia/criar` com `{ ad_minerado_id }` (Task 6)

- [ ] **Step 1: Adicionar `page_id` ao objeto mapeado**

Em `fetchProdutos`, no objeto retornado pelo `map` (perto de `page_name`), acrescente:

```typescript
          page_id: ad.page_id || null,
```

E na interface/tipo do item (se houver tipagem explícita no arquivo), acrescente `page_id: string | null;`.

- [ ] **Step 2: Adicionar o estado e a função**

Junto dos outros `useState` do componente:

```typescript
  const [autopsiando, setAutopsiando] = useState<string | null>(null);
```

E a função, junto das outras ações:

```typescript
  // Autopsiar = analisar o ANUNCIANTE inteiro (todos os criativos dele), não
  // só este anúncio. É o passo seguinte depois de escolher um alvo na lista.
  async function autopsiar(adId: string, pageName: string) {
    if (autopsiando) return;
    if (!confirm(`Autopsiar "${pageName}"? Isso coleta todos os anúncios ativos desse anunciante (1 crédito da ScrapeCreators por página de 30).`)) return;
    setAutopsiando(adId);
    try {
      const res = await fetch('/api/autopsia/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_minerado_id: adId }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? 'Falha ao criar a autópsia.');
      } else {
        window.location.href = `/autopsia/${json.autopsia_id}`;
      }
    } catch (e) {
      alert((e as Error).message);
    }
    setAutopsiando(null);
  }
```

- [ ] **Step 3: Adicionar o botão no modal do anúncio**

No modal (perto do link "Ver na Biblioteca de Anúncios", por volta da linha 483 em diante), acrescente:

```tsx
                <button
                  onClick={() => autopsiar(selectedAd.id, selectedAd.page_name)}
                  disabled={autopsiando === selectedAd.id}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                >
                  {autopsiando === selectedAd.id ? <Loader2 size={15} className="animate-spin" /> : <Microscope size={15} />}
                  {autopsiando === selectedAd.id ? 'Coletando…' : 'Autopsiar este anunciante'}
                </button>
```

Adicione `Microscope` ao import de `lucide-react` no topo do arquivo (`Loader2` já está lá).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com o dev rodando: abra `/mineracao`, clique num anúncio, clique em "Autopsiar este anunciante", confirme. Expected: redireciona para `/autopsia/<id>` com os criativos daquele anunciante.

- [ ] **Step 5: Commit**

```bash
git add src/app/mineracao/page.tsx
git commit -m "feat(mineracao): botao Autopsiar este anunciante no modal

Fecha o fluxo: minerar e o funil de descoberta, autopsiar e o que se faz
depois de escolher o alvo. O confirm avisa do custo em creditos porque a
coleta pagina o anunciante inteiro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FASE 2 — Worker: download e frames

### Task 10: Worker + job `download`

**Files:**
- Create: `scripts/worker-autopsia.py`

**Interfaces:**
- Consumes: tabelas `autopsia_jobs`, `autopsia_criativos`, `autopsias`; bucket `criativos`
- Produces: script rodável `py -3 scripts/worker-autopsia.py`; ao concluir um `download`, enfileira `frames` e `transcrever` do mesmo criativo

**Contexto para quem implementa:** o worker usa **só a stdlib** para falar com o Supabase (REST via `urllib`), evitando instalar `supabase-py`. `faster_whisper` e `ffmpeg` já estão na máquina. Ele lê `.env.local` da raiz, igual ao `scripts/_env.mjs`.

- [ ] **Step 1: Criar o worker com o loop e o job `download`**

```python
# scripts/worker-autopsia.py
#
# WORKER DA AUTOPSIA — consome a fila autopsia_jobs.
#
# POR QUE UM WORKER, E NAO UMA ROTA: transcrever um video com faster-whisper
# leva minutos de CPU. Uma autopsia de 8 videos passa de 20 minutos, e o teto
# de uma rota Next e maxDuration=300s (5 min) — limite de plataforma, nao
# escolha. Nao adianta otimizar: e categoria errada de lugar.
#
# A FILA e o contrato que protege o futuro: trocar transcricao local por API
# (Groq/Deepgram) e escrever outro consumidor desta mesma tabela.
#
# Rodar (na raiz do projeto):  py -3 scripts/worker-autopsia.py
# Parar: Ctrl+C
#
# Dependencias: Python 3.13, ffmpeg no PATH, faster-whisper (ja instalados).
# Fala com o Supabase por REST + urllib (stdlib) para nao exigir supabase-py.

import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "criativos"
INTERVALO_OCIOSO = 5      # segundos entre varreduras quando nao ha job
MAX_TENTATIVAS = 3

FB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://www.facebook.com/",   # sem isso o FB CDN devolve 403
    "Accept": "*/*",
}


def carregar_env():
    """Le .env.local da raiz. Mesmo formato que scripts/_env.mjs."""
    caminho = os.path.join(ROOT, ".env.local")
    if not os.path.exists(caminho):
        sys.exit(".env.local nao encontrado na raiz do projeto.")
    env = {}
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", linha)
            if not m:
                continue
            v = m.group(2).strip()
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            env[m.group(1)] = v
    return env


ENV = carregar_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]


def rest(metodo, caminho, corpo=None, params=None, prefer=None):
    """Chamada REST no PostgREST do Supabase com a service_role."""
    url = f"{SUPABASE_URL}/rest/v1/{caminho}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(url, data=dados, method=metodo)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    with urllib.request.urlopen(req, timeout=60) as r:
        txt = r.read().decode()
        return json.loads(txt) if txt.strip() else None


def subir_storage(caminho_arquivo, destino, content_type):
    """Sobe um arquivo para o Storage e devolve a URL publica."""
    with open(caminho_arquivo, "rb") as f:
        dados = f.read()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(destino)}"
    req = urllib.request.Request(url, data=dados, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", content_type)
    req.add_header("x-upsert", "true")
    try:
        urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode()[:300]
        raise RuntimeError(f"upload falhou ({e.code}): {detalhe}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(destino)}"


def pegar_job():
    """Pega o job pendente mais antigo e marca como processando (lock)."""
    pendentes = rest(
        "GET", "autopsia_jobs",
        params={"status": "eq.pendente", "order": "criado_em.asc", "limit": "1", "select": "*"},
    )
    if not pendentes:
        return None
    job = pendentes[0]
    # Lock: so pega se AINDA estiver pendente (protege contra dois workers).
    atualizado = rest(
        "PATCH", "autopsia_jobs",
        corpo={"status": "processando", "iniciado_em": "now()", "tentativas": job["tentativas"] + 1},
        params={"id": f"eq.{job['id']}", "status": "eq.pendente"},
        prefer="return=representation",
    )
    return job if atualizado else None


def concluir_job(job_id, erro=None, tentativas=0):
    if erro is None:
        rest("PATCH", "autopsia_jobs",
             corpo={"status": "concluido", "concluido_em": "now()", "erro": None},
             params={"id": f"eq.{job_id}"})
    else:
        # Volta para a fila ate MAX_TENTATIVAS; depois desiste com o motivo.
        final = "erro" if tentativas >= MAX_TENTATIVAS else "pendente"
        rest("PATCH", "autopsia_jobs",
             corpo={"status": final, "erro": str(erro)[:500]},
             params={"id": f"eq.{job_id}"})


def atualizar_progresso(autopsia_id):
    jobs = rest("GET", "autopsia_jobs",
                params={"autopsia_id": f"eq.{autopsia_id}", "select": "status"})
    total = len(jobs)
    prontos = sum(1 for j in jobs if j["status"] in ("concluido", "erro"))
    progresso = int(prontos * 100 / total) if total else 0

    criativos = rest("GET", "autopsia_criativos",
                     params={"autopsia_id": f"eq.{autopsia_id}", "select": "transcricao"})
    transcritos = sum(1 for c in criativos if c.get("transcricao"))

    corpo = {"progresso": progresso, "total_transcritos": transcritos}
    if prontos == total and total > 0:
        corpo["status"] = "montando"
    rest("PATCH", "autopsias", corpo=corpo, params={"id": f"eq.{autopsia_id}"})


def buscar_criativo(criativo_id):
    r = rest("GET", "autopsia_criativos", params={"id": f"eq.{criativo_id}", "select": "*"})
    return r[0] if r else None


def job_download(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    url = criativo.get("url_origem")
    if not url:
        raise RuntimeError("criativo sem url_origem")

    ext = ".mp4" if criativo["tipo"] == "video" else ".jpg"
    destino_local = os.path.join(tempfile.gettempdir(), f"autopsia_{criativo['id']}{ext}")

    req = urllib.request.Request(url, headers=FB_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=300) as r, open(destino_local, "wb") as o:
            o.write(r.read())
    except urllib.error.HTTPError as e:
        if e.code in (403, 410):
            raise RuntimeError(f"URL do CDN expirada (HTTP {e.code}) — recoletar o anunciante")
        raise

    tamanho = os.path.getsize(destino_local)
    if tamanho < 10000:
        raise RuntimeError(f"arquivo suspeito: {tamanho} bytes")

    content_type = "video/mp4" if ext == ".mp4" else "image/jpeg"
    publica = subir_storage(destino_local,
                            f"autopsia/{job['autopsia_id']}/{criativo['id']}{ext}",
                            content_type)

    rest("PATCH", "autopsia_criativos",
         corpo={"storage_path": publica}, params={"id": f"eq.{criativo['id']}"})
    print(f"  baixado {tamanho/1e6:.1f} MB -> {publica.rsplit('/', 1)[-1]}")

    # Encadeia o resto do trabalho: so agora o arquivo existe.
    if criativo["tipo"] == "video":
        rest("POST", "autopsia_jobs", corpo=[
            {"autopsia_id": job["autopsia_id"], "criativo_id": criativo["id"], "tipo": "frames", "status": "pendente"},
            {"autopsia_id": job["autopsia_id"], "criativo_id": criativo["id"], "tipo": "transcrever", "status": "pendente"},
        ])

    try:
        os.remove(destino_local)
    except OSError:
        pass


HANDLERS = {
    "download": job_download,
}


def main():
    print("worker-autopsia iniciado. Ctrl+C para parar.")
    print(f"Supabase: {SUPABASE_URL}")
    while True:
        try:
            job = pegar_job()
            if not job:
                time.sleep(INTERVALO_OCIOSO)
                continue
            print(f"[{job['tipo']}] job {job['id'][:8]} (tentativa {job['tentativas'] + 1})")
            handler = HANDLERS.get(job["tipo"])
            if not handler:
                concluir_job(job["id"], f"tipo desconhecido: {job['tipo']}", MAX_TENTATIVAS)
                continue
            try:
                handler(job)
                concluir_job(job["id"])
            except Exception as e:
                print(f"  FALHOU: {e}")
                concluir_job(job["id"], e, job["tentativas"] + 1)
            atualizar_progresso(job["autopsia_id"])
        except KeyboardInterrupt:
            print("\nencerrado.")
            return
        except Exception as e:
            print(f"erro no loop: {e}")
            time.sleep(INTERVALO_OCIOSO)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar contra a fila real**

A autópsia da Task 6 já deixou jobs `pendente`.

Run: `py -3 scripts/worker-autopsia.py`
Expected: para cada criativo, `[download] job xxxxxxxx` seguido de `baixado N.N MB -> <id>.mp4`. Deixe rodar até esvaziar e pare com Ctrl+C.

Verifique com `mcp__supabase__execute_sql`:
```sql
select tipo, status, count(*) from autopsia_jobs group by 1,2 order by 1,2;
select count(*) filter (where storage_path is not null) as baixados, count(*) as total
from autopsia_criativos;
```
Expected: os `download` concluídos, `frames` e `transcrever` pendentes (enfileirados pelo worker), e `baixados` = `total`.

Abra `/autopsia/<id>` — os vídeos agora tocam na aba Criativos.

- [ ] **Step 3: Commit**

```bash
git add scripts/worker-autopsia.py
git commit -m "feat(autopsia): worker da fila + job de download

Transcricao leva minutos por video e nao cabe em rota (maxDuration=300s), e
esse limite e de plataforma. O worker consome autopsia_jobs, baixa com
Referer: facebook.com (sem o header o CDN devolve 403) e sobe pro Storage.

Fala com o Supabase por REST/urllib (stdlib) para nao exigir supabase-py.
Lock por UPDATE condicionado a status=pendente, 3 tentativas e depois erro
com o motivo — a autopsia segue com os outros criativos.

Download concluido encadeia frames + transcrever: so entao o arquivo existe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Job `frames` — 3 grades com ffmpeg

Replica o que o método manual produziu à mão: `grid-hooks` (primeiro terço, onde mora o gancho), `grid-meio` (desenvolvimento) e `grid-cta` (fechamento). Cada grade é 3×3 = 9 frames.

**Files:**
- Modify: `scripts/worker-autopsia.py`

**Interfaces:**
- Consumes: `autopsia_criativos.storage_path` (Task 10)
- Produces: `autopsia_criativos.frames_paths: text[]` com 3 URLs públicas; `autopsia_criativos.duracao_s` corrigida pelo ffprobe

- [ ] **Step 1: Adicionar as funções de vídeo**

Em `scripts/worker-autopsia.py`, **antes** de `HANDLERS`:

```python
def duracao_video(caminho):
    """Duracao real em segundos via ffprobe (o efg da URL pode estar ausente)."""
    saida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", caminho],
        capture_output=True, text=True, check=True,
    )
    return float(saida.stdout.strip())


def baixar_do_storage(url, destino):
    """Baixa de volta o arquivo que ja subimos (o worker nao guarda estado em disco)."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=300) as r, open(destino, "wb") as o:
        o.write(r.read())


def gerar_grade(video, inicio, duracao, destino):
    """
    Monta uma grade 3x3 com 9 frames igualmente espacados no trecho.

    -ss ANTES do -i faz seek rapido (por keyframe). fps=9/duracao pega 9
    quadros no trecho; tile=3x3 monta a grade num PNG unico.
    """
    if duracao <= 0:
        raise RuntimeError("trecho de duracao zero")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-ss", f"{inicio:.2f}", "-t", f"{duracao:.2f}", "-i", video,
         "-vf", f"fps=9/{duracao:.2f},scale=320:-1,tile=3x3",
         "-frames:v", "1", destino],
        check=True, capture_output=True,
    )


def job_frames(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    if not criativo.get("storage_path"):
        raise RuntimeError("criativo ainda sem storage_path — o download nao concluiu")

    local = os.path.join(tempfile.gettempdir(), f"autopsia_frames_{criativo['id']}.mp4")
    baixar_do_storage(criativo["storage_path"], local)

    try:
        total = duracao_video(local)
        terco = total / 3.0
        grades = [
            ("grid-hooks", 0.0, terco),
            ("grid-meio", terco, terco),
            ("grid-cta", terco * 2, terco),
        ]
        urls = []
        for nome, inicio, dur in grades:
            png = os.path.join(tempfile.gettempdir(), f"autopsia_{criativo['id']}_{nome}.png")
            gerar_grade(local, inicio, dur, png)
            urls.append(subir_storage(
                png, f"autopsia/{job['autopsia_id']}/{criativo['id']}_{nome}.png", "image/png"
            ))
            try:
                os.remove(png)
            except OSError:
                pass

        rest("PATCH", "autopsia_criativos",
             corpo={"frames_paths": urls, "duracao_s": int(round(total))},
             params={"id": f"eq.{criativo['id']}"})
        print(f"  3 grades geradas ({total:.0f}s de video)")
    finally:
        try:
            os.remove(local)
        except OSError:
            pass
```

E registre no dicionário:

```python
HANDLERS = {
    "download": job_download,
    "frames": job_frames,
}
```

- [ ] **Step 2: Rodar**

Run: `py -3 scripts/worker-autopsia.py`
Expected: `[frames] job xxxxxxxx` seguido de `3 grades geradas (NNs de video)` para cada vídeo.

Verifique:
```sql
select count(*) filter (where array_length(frames_paths,1) = 3) as com_grades,
       count(*) as videos
from autopsia_criativos where tipo = 'video';
```
Expected: `com_grades` = `videos`.

Abra a aba **Frames** em `/autopsia/<id>`: as 3 grades de cada vídeo devem aparecer, e dá pra ler a progressão do anúncio nelas.

- [ ] **Step 3: Commit**

```bash
git add scripts/worker-autopsia.py
git commit -m "feat(autopsia): job de frames — 3 grades 3x3 por video

Replica o que o metodo manual produzia: grid-hooks (primeiro terco, onde
mora o gancho), grid-meio e grid-cta. Uma chamada de ffmpeg por grade
(fps + tile=3x3), com -ss antes do -i para seek rapido.

Aproveita para corrigir duracao_s com o valor real do ffprobe — o efg da URL
nem sempre traz.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FASE 3 — Transcrição

### Task 12: Job `transcrever` — faster-whisper local

🔴 **A descoberta que justifica esta tarefa:** a legenda queimada dos anúncios é **karaokê palavra-a-palavra**. Quem tentar OCR nos frames extrai `"VOCÊ"`, `"SABIA"`, `"QUE"` em imagens separadas e conclui que não dá. **Tem que transcrever o áudio.** Foi o que separou uma autópsia útil de uma inútil.

**Files:**
- Modify: `scripts/worker-autopsia.py`

**Interfaces:**
- Consumes: `autopsia_criativos.storage_path`
- Produces: `autopsia_criativos.transcricao` (texto corrido) e `.transcricao_srt` (com timestamps)

- [ ] **Step 1: Adicionar o handler**

No topo do arquivo, junto dos outros imports globais, **não** importe `faster_whisper` — o modelo pesa e só é carregado quando o primeiro job de transcrição chega. Antes de `HANDLERS`:

```python
_MODELO = None


def modelo_whisper():
    """
    Carrega o faster-whisper uma vez por processo (leva ~30s no primeiro job).

    Parametros identicos aos validados no transcrever.py do low-ticket:
    medium/cpu/int8, pt, vad_filter e condition_on_previous_text=False (sem
    isso o modelo repete a frase anterior quando o audio tem musica alta).
    """
    global _MODELO
    if _MODELO is None:
        from faster_whisper import WhisperModel
        print("  carregando modelo whisper medium (primeira vez, ~30s)...")
        _MODELO = WhisperModel("medium", device="cpu", compute_type="int8")
    return _MODELO


def formatar_tempo_srt(segundos):
    horas = int(segundos // 3600)
    minutos = int((segundos % 3600) // 60)
    seg = segundos % 60
    return f"{horas:02d}:{minutos:02d}:{seg:06.3f}".replace(".", ",")


def job_transcrever(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    if not criativo.get("storage_path"):
        raise RuntimeError("criativo ainda sem storage_path — o download nao concluiu")

    local = os.path.join(tempfile.gettempdir(), f"autopsia_transc_{criativo['id']}.mp4")
    baixar_do_storage(criativo["storage_path"], local)

    try:
        modelo = modelo_whisper()
        segmentos, _info = modelo.transcribe(
            local, language="pt", beam_size=5, vad_filter=True,
            condition_on_previous_text=False,
        )

        linhas_srt = []
        texto = []
        for i, s in enumerate(segmentos, start=1):
            trecho = s.text.strip()
            if not trecho:
                continue
            texto.append(trecho)
            linhas_srt.append(
                f"{i}\n{formatar_tempo_srt(s.start)} --> {formatar_tempo_srt(s.end)}\n{trecho}\n"
            )

        corrido = " ".join(texto)
        rest("PATCH", "autopsia_criativos",
             corpo={"transcricao": corrido, "transcricao_srt": "\n".join(linhas_srt)},
             params={"id": f"eq.{criativo['id']}"})
        print(f"  transcrito: {len(corrido)} caracteres, {len(linhas_srt)} segmentos")
    finally:
        try:
            os.remove(local)
        except OSError:
            pass
```

E registre:

```python
HANDLERS = {
    "download": job_download,
    "frames": job_frames,
    "transcrever": job_transcrever,
}
```

- [ ] **Step 2: Rodar (demora — é o passo caro)**

Run: `py -3 scripts/worker-autopsia.py`
Expected: `carregando modelo whisper medium` uma vez, depois `[transcrever] …` + `transcrito: NNNN caracteres, NN segmentos` por vídeo. **Conte ~2–4 min por vídeo**; 8 vídeos levam 20–30 min. Deixe rodar até a fila esvaziar.

Verifique:
```sql
select count(*) filter (where transcricao is not null) as transcritos,
       count(*) as videos,
       (select status || ' ' || progresso::text from autopsias order by criado_em desc limit 1) as autopsia
from autopsia_criativos where tipo='video';
```
Expected: `transcritos` = `videos`, e a autópsia em `montando 100`.

- [ ] **Step 3: Conferir contra o gabarito**

Compare uma transcrição com a versão feita à mão em 24/07:

```bash
cat "c:/Users/cerqu/Documents/Projetos_IDE/low-ticket/alimento-sagrado/transcricoes/v0_970325545773038_31s.txt"
```

Abra a aba **Transcrições** em `/autopsia/<id>` e localize o vídeo de 31s. Expected: o conteúdo bate em substância (palavra por palavra pode variar levemente — é o mesmo modelo, mas o áudio pode ter sido recortado diferente).

- [ ] **Step 4: Commit**

```bash
git add scripts/worker-autopsia.py
git commit -m "feat(autopsia): job de transcricao com faster-whisper local

A legenda dos anuncios e karaoke palavra-a-palavra queimada no video: ler a
copy por frame extrai VOCE / SABIA / QUE em imagens separadas e nao chega a
lugar nenhum. Transcrever o audio e o que separa uma autopsia util de uma
inutil.

Parametros identicos aos validados no low-ticket (medium/cpu/int8, pt,
vad_filter, condition_on_previous_text=False). Modelo carregado sob demanda,
uma vez por processo. Custo R$ 0; ~2-4 min por video.

Guarda texto corrido (para a IA ler) e SRT com timestamps (para achar o
momento exato de um gancho).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FASE 4 — O dossiê

### Task 13: Cérebro do agente `autopsia`

**Files:**
- Create: `agentes/autopsia/_agente.json`
- Create: `agentes/autopsia/AGENTS.md`
- Create: `agentes/autopsia/SKILL.md`

**Interfaces:**
- Produces: registro `autopsia` em `agentes_config` (após o sync), consumido por `getAgentConfig('autopsia')`

⚠️ **Depois de criar os arquivos é obrigatório rodar o sync** — senão o agente existe em disco mas não existe para a IA. Foi exatamente o bug do Tracking em 27/06.

- [ ] **Step 1: `agentes/autopsia/_agente.json`**

```json
{
  "slug": "autopsia",
  "nome": "Autópsia de Concorrente",
  "modelo": "claude-sonnet-4-6",
  "max_tokens": 8000,
  "ativo": true
}
```

- [ ] **Step 2: `agentes/autopsia/AGENTS.md`**

```markdown
# Agente — Autópsia de Concorrente

## Quem você é
Você disseca a operação de UM anunciante a partir do material coletado da
Biblioteca de Anúncios do Meta: todos os criativos únicos, a copy escrita, a
copy **falada** (transcrições do áudio) e os metadados de veiculação.

Você não é um resumidor. Você é o analista que lê o que a operação revela
sobre si mesma e entrega um dossiê que permite decidir o que modelar.

## O que você recebe
- Ficha do anunciante (nome, page_id, total de anúncios, criativos únicos)
- Por criativo: duração, dias no ar, se está ativo, copy, CTA, link de destino
- **A transcrição completa do áudio de cada vídeo**

## As duas regras que não se negociam

**1. Você não decide estratégia por default de documento.**
Se o material não sustenta uma conclusão, ela vai para `em_aberto` — não para
o texto. Um dossiê que inventa posicionamento é PIOR que um incompleto,
porque quem lê age em cima e não sabe que era chute. Você sempre CONSEGUE
preencher; a disciplina é não preencher.

**2. Separar o que se modela do que se rejeita.**
O concorrente faz coisas que funcionam e coisas que dão ban ou processo. Um
relatório que só descreve não protege ninguém. `modelar_x_rejeitar` é
obrigatório e específico — nada de "adaptar ao nosso contexto".

## Como ler o material

**Razão anúncios ÷ criativos únicos.** 18 anúncios para 8 vídeos = copy travada
com criativo em rotação: a operação já achou a mensagem e agora só compra
volume. O ativo de valor é o argumento, não o vídeo.

**Dias no ar.** Ninguém queima verba duas semanas em algo que não converte.
Criativo antigo e ativo é criativo que paga. Vários criativos que subiram no
mesmo dia = injeção de criativo novo em campanha que já performa.

**A copy falada vs a copy escrita.** Divergência é sinal, não erro. Um anúncio
que promete menos do que a VSL entrega está subvendendo de propósito, para a
percepção de valor explodir na hora da decisão.

**O link de destino.** WhatsApp, checkout direto, página de vendas e quiz são
funis diferentes, com economias diferentes.

## Formato de saída
JSON, no contrato que a rota anexa ao seu prompt. Sem markdown fora dos
campos de texto, sem cercas de código em volta do JSON.
```

- [ ] **Step 3: `agentes/autopsia/SKILL.md`**

```markdown
# SKILL — Autópsia de Anunciante

## Rubrica das 9 seções

**0. sumario_executivo** — o que essa operação é, em um parágrafo, mais 3 a 5
achados numerados com a consequência prática de cada um. É a única seção que
alguém com pressa vai ler. Nada de "eles fazem marketing digital".

**1. alvo** — ficha objetiva: página, page_id, nicho, nº de anúncios, criativos
únicos, faixa de duração, funil, ticket (se declarado no material). Mais os
**sinais de que a campanha está pagando**, cada um ancorado num dado concreto
(datas, dias no ar, quantidade de criativos simultâneos).

**2. metodo_coleta** — como este material foi obtido. Preenchido pela rota, não
por você: você recebe o texto pronto e o repete.

**3. anatomia** — a parte longa. O funil ponta a ponta; o esqueleto da copy em
blocos reutilizáveis; a estrutura da VSL com timings reais tirados das
transcrições; os ângulos distintos testados (mesma oferta, dores diferentes);
as frases que carregam a conversão, **citadas literalmente**.

**4. vulnerabilidades** — onde a operação é atacável ou frágil: afirmação
verificável que está errada, uso de imagem de terceiro, promessa que o produto
não sustenta, deslize de produção. Cada uma com a evidência.

**5. modelar_x_rejeitar** — duas listas explícitas. Modelar: o que funciona e é
legítimo copiar. Rejeitar: o que funciona mas traz risco (ban, jurídico,
reputação), com o motivo. **Seção obrigatória.**

**6. plano** — o que fazer com isso. Só o que o material sustenta.

**7. restricoes** — limites do que foi coletado: janela de tempo, anúncios
possivelmente ausentes, o que não dá para saber por fora (ticket real, volume
de venda, margem).

**8. anexos** — inventário dos criativos: id, duração, dias no ar, ativo,
primeira linha da copy.

**em_aberto** — lista de perguntas que o material NÃO responde e que precisam
de decisão humana. Uma linha cada. **Se esta lista vier vazia num material
real, você provavelmente inventou alguma coisa.**

## Padrões de qualidade

- **Cite, não parafraseie.** "A frase que carrega a conversão" precisa vir entre
  aspas, literal da transcrição.
- **Ancore em número.** "Rodando há pelo menos 2 meses (criativo mais antigo: 70
  dias no ar)" vale; "rodando há bastante tempo" não vale.
- **Nunca invente URL, preço ou depoimento.** Se não está no material, não existe.
- **Português do Brasil, tom de análise seca.** Sem "incrível", sem "poderoso",
  sem exclamação.
```

- [ ] **Step 4: Sincronizar o agente**

Com o dev rodando, abra http://localhost:3000/agents e clique em **"Sincronizar da pasta agentes/"**.

Verifique com `mcp__supabase__execute_sql`:
```sql
select slug, nome, modelo, ativo, length(agents_md) as agents, length(skill_md) as skill
from agentes_config where slug = 'autopsia';
```
Expected: 1 linha, `ativo = true`, `agents` e `skill` com tamanho > 0.

- [ ] **Step 5: Commit**

```bash
git add agentes/autopsia/
git commit -m "feat(autopsia): cerebro do agente (AGENTS.md + SKILL.md)

Decimo agente da esteira. Regua de decisao, nao tutorial: como ler a razao
anuncios/criativos unicos, dias no ar, copy falada vs escrita e link de
destino.

As duas regras que valem no produto: nao preencher slot em aberto por
inferencia (um dossie que inventa posicionamento e pior que um incompleto) e
separar modelar de rejeitar (relatorio que so descreve nao protege ninguem).

Sincronizado em /agents — sem o sync o agente existe em disco e nao existe
para a IA (foi o bug do Tracking em 27/06).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: `/api/autopsia/dossie` + montador de Markdown

**Files:**
- Create: `src/lib/autopsia/dossie.ts`
- Create: `src/app/api/autopsia/dossie/route.ts`

**Interfaces:**
- Consumes: `getAgentConfig`, `buildSystemPrompt` de `@/lib/agents/buildSystemPrompt`; `gerarJSONComAgente`, `parseJSONFlexivel` de `@/lib/agents/generateWithProvider`
- Produces:
  - `interface DossieJSON` e `interface DadosDossie` em `dossie.ts`
  - `montarMarkdown(dados: DadosDossie): string`
  - `POST /api/autopsia/dossie` body `{ autopsia_id }` → `{ sucesso, provider, dossie_md }`

- [ ] **Step 1: Criar `src/lib/autopsia/dossie.ts`**

```typescript
// src/lib/autopsia/dossie.ts
//
// Montagem determinística do dossiê. A IA devolve JSON por seção; ESTE
// arquivo decide o formato.
//
// Mesmo padrão de src/lib/tracking/fop.ts: a IA decide a inteligência, o
// código decide a forma. Deixar o modelo escrever o markdown inteiro faria a
// estrutura variar a cada geração, e o HTML (Task 15) precisa de estrutura
// estável para renderizar.
//
// `em_aberto` é campo de primeira classe de propósito: transforma a regra "o
// dossiê não preenche slot em aberto" em schema, em vez de depender de o
// modelo se comportar.

export interface DossieJSON {
  sumario_executivo: string;
  alvo: string;
  anatomia: string;
  vulnerabilidades: string;
  modelar_x_rejeitar: string;
  plano: string;
  restricoes: string;
  em_aberto: string[];
}

export interface CriativoDossie {
  ad_archive_id: string | null;
  duracao_s: number | null;
  dias_no_ar: number | null;
  is_active: boolean | null;
  ad_copy: string | null;
  cta_text: string | null;
  link_url: string | null;
  transcricao: string | null;
  storage_path: string | null;
  frames_paths: string[] | null;
}

export interface DadosDossie {
  page_name: string | null;
  page_id: string;
  total_anuncios: number;
  total_criativos: number;
  criado_em: string;
  criativos: CriativoDossie[];
  secoes: DossieJSON;
}

/** Texto fixo da seção 2 — é fato de engenharia, não análise da IA. */
export function metodoDeColeta(dados: DadosDossie): string {
  return [
    `1. Coleta via **ScrapeCreators** (endpoint \`company/ads\`), paginada por \`cursor\` — ` +
      `${dados.total_anuncios} anúncios lidos do \`page_id\` \`${dados.page_id}\`.`,
    `2. Dedup por **path do arquivo** no CDN do Facebook (a querystring é assinada e muda a ` +
      `toda hora; o path é estável) → **${dados.total_criativos} criativos únicos**.`,
    `3. Download com header \`Referer: facebook.com\` (sem ele o CDN devolve 403) e guarda no ` +
      `Supabase Storage — as URLs do CDN expiram em ~5 dias.`,
    `4. Frames: \`ffmpeg\` monta 3 grades 3×3 por vídeo (gancho · meio · CTA).`,
    `5. Transcrição: \`faster-whisper\` \`medium\`, local, CPU.`,
    ``,
    `> ⚠️ A legenda dos anúncios é karaokê palavra-a-palavra queimada no vídeo. Ler a copy por ` +
      `frame é inviável — o áudio precisa ser transcrito.`,
  ].join('\n');
}

function tabelaCriativos(criativos: CriativoDossie[]): string {
  const linhas = criativos.map((c, i) => {
    const primeira = (c.ad_copy ?? '').split('\n')[0].slice(0, 70).replace(/\|/g, '\\|');
    return `| ${i} | \`${c.ad_archive_id ?? '—'}\` | ${c.duracao_s ?? '—'}s | ${c.dias_no_ar ?? '—'} | ` +
      `${c.is_active ? 'sim' : 'não'} | ${c.transcricao ? 'sim' : 'não'} | ${primeira || '—'} |`;
  });
  return [
    '| # | ad_archive_id | Duração | Dias no ar | Ativo | Transcrito | Primeira linha da copy |',
    '|---|---|---|---|---|---|---|',
    ...linhas,
  ].join('\n');
}

export function montarMarkdown(dados: DadosDossie): string {
  const s = dados.secoes;
  const data = new Date(dados.criado_em).toLocaleDateString('pt-BR');
  const semTranscricao = dados.criativos.filter((c) => !c.transcricao).length;

  const emAberto = s.em_aberto?.length
    ? s.em_aberto.map((q) => `- ⬜ ${q}`).join('\n')
    : '_A análise não registrou pontos em aberto. Em material real isso é raro — confira se ' +
      'alguma conclusão foi preenchida por inferência._';

  return `# 🔬 DOSSIÊ — Autópsia: *${dados.page_name ?? dados.page_id}*

> Gerado pelo Alavanca Synapse em ${data} · \`page_id\` \`${dados.page_id}\`
> ${dados.total_anuncios} anúncios coletados → **${dados.total_criativos} criativos únicos**${
    semTranscricao > 0 ? ` · ⚠️ ${semTranscricao} criativo(s) sem transcrição` : ''
  }

---

## 0. Sumário executivo

${s.sumario_executivo}

---

## 1. O alvo

${s.alvo}

---

## 2. Método de coleta

${metodoDeColeta(dados)}

---

## 3. Anatomia da operação

${s.anatomia}

---

## 4. Vulnerabilidades

${s.vulnerabilidades}

---

## 5. O que modelamos × o que rejeitamos

${s.modelar_x_rejeitar}

---

## 6. Plano

${s.plano}

---

## 7. Restrições

${s.restricoes}

---

## 8. Em aberto — decisão humana, não preenchida por inferência

${emAberto}

---

## 9. Anexos — inventário de criativos

${tabelaCriativos(dados.criativos)}
`;
}
```

- [ ] **Step 2: Criar `src/app/api/autopsia/dossie/route.ts`**

```typescript
// src/app/api/autopsia/dossie/route.ts
//
// Gera o dossiê: monta o contexto (ficha + criativos + TRANSCRIÇÕES), chama o
// agente `autopsia` e transforma o JSON devolvido em markdown.
//
// O contrato de saída é anexado aqui, não no AGENTS.md: o cérebro descreve
// COMO analisar (e é lido por humano em /agents); a rota impõe o FORMATO de
// que este consumidor precisa. Mesmo padrão de /api/meta/diagnose.

import { getTenantClient } from '@/lib/supabase-tenant';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { gerarJSONComAgente, parseJSONFlexivel } from '@/lib/agents/generateWithProvider';
import { montarMarkdown, type DossieJSON, type DadosDossie } from '@/lib/autopsia/dossie';

export const maxDuration = 300;

const CONTRATO = `
Responda APENAS com um objeto JSON válido, sem cercas de código, neste formato:

{
  "sumario_executivo": "string em markdown",
  "alvo": "string em markdown (tabela de ficha + sinais de que a campanha paga)",
  "anatomia": "string em markdown (funil, blocos de copy, timings da VSL, ângulos, frases que convertem — citadas literalmente)",
  "vulnerabilidades": "string em markdown",
  "modelar_x_rejeitar": "string em markdown com DUAS listas explícitas: o que modelar e o que rejeitar (com o motivo do risco)",
  "plano": "string em markdown",
  "restricoes": "string em markdown",
  "em_aberto": ["pergunta que o material NÃO responde", "outra"]
}

Regras:
- Cite trechos das transcrições literalmente, entre aspas.
- Ancore afirmações em números concretos (dias no ar, durações, quantidades).
- O que o material não sustenta vai para "em_aberto", NUNCA para o texto das seções.
- Nunca invente URL, preço, depoimento ou nome de pessoa.
`;

export async function POST(request: Request) {
  try {
    const { autopsia_id } = await request.json();
    if (!autopsia_id) {
      return Response.json({ error: 'autopsia_id é obrigatório.' }, { status: 400 });
    }

    const supabase = getTenantClient();

    const { data: autopsia, error: errA } = await supabase
      .from('autopsias')
      .select('*')
      .eq('id', autopsia_id)
      .single();
    if (errA || !autopsia) {
      return Response.json({ error: 'Autópsia não encontrada.' }, { status: 404 });
    }

    const { data: criativos, error: errC } = await supabase
      .from('autopsia_criativos')
      .select('*')
      .eq('autopsia_id', autopsia_id)
      .order('dias_no_ar', { ascending: false });
    if (errC || !criativos?.length) {
      return Response.json({ error: 'Autópsia sem criativos.' }, { status: 400 });
    }

    const config = await getAgentConfig('autopsia');
    if (!config) {
      return Response.json(
        { error: 'Agente "autopsia" não sincronizado ou inativo. Rode a sincronização em /agents.' },
        { status: 400 }
      );
    }

    // Contexto: os metadados que revelam a operação + a copy falada.
    const ficha = [
      `ANUNCIANTE: ${autopsia.page_name ?? '(sem nome)'} (page_id ${autopsia.page_id})`,
      `ANÚNCIOS COLETADOS: ${autopsia.total_anuncios}`,
      `CRIATIVOS ÚNICOS APÓS DEDUP: ${autopsia.total_criativos}`,
      `RAZÃO ANÚNCIOS/CRIATIVOS: ${(autopsia.total_anuncios / Math.max(autopsia.total_criativos, 1)).toFixed(1)}x`,
    ].join('\n');

    const blocos = criativos.map((c, i) => {
      return [
        `--- CRIATIVO ${i} ---`,
        `duração: ${c.duracao_s ?? '?'}s | dias no ar: ${c.dias_no_ar ?? '?'} | ativo: ${c.is_active ? 'sim' : 'não'}`,
        `CTA: ${c.cta_text ?? '—'} | destino: ${c.link_url ?? '—'}`,
        `COPY ESCRITA:\n${c.ad_copy ?? '(sem copy)'}`,
        `TRANSCRIÇÃO DO ÁUDIO:\n${c.transcricao ?? '(não transcrito)'}`,
      ].join('\n');
    });

    const system = buildSystemPrompt(config) + '\n\n' + CONTRATO;
    const user = `${ficha}\n\n${blocos.join('\n\n')}`;

    const { raw, provider } = await gerarJSONComAgente(config, system, user);
    const secoes = parseJSONFlexivel<DossieJSON>(raw);

    const dados: DadosDossie = {
      page_name: autopsia.page_name,
      page_id: autopsia.page_id,
      total_anuncios: autopsia.total_anuncios,
      total_criativos: autopsia.total_criativos,
      criado_em: autopsia.criado_em,
      criativos: criativos as DadosDossie['criativos'],
      secoes,
    };

    const markdown = montarMarkdown(dados);

    await supabase
      .from('autopsias')
      .update({
        dossie_json: secoes,
        dossie_md: markdown,
        status: 'pronta',
        progresso: 100,
        concluido_em: new Date().toISOString(),
      })
      .eq('id', autopsia_id);

    return Response.json({ sucesso: true, provider, tamanho: markdown.length });
  } catch (err) {
    console.error('[api/autopsia/dossie] erro:', err);
    return Response.json(
      { error: 'Falha ao gerar o dossiê', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Botão na aba Dossiê**

Em `src/app/autopsia/[id]/page.tsx`, adicione o estado junto aos outros:

```typescript
  const [gerando, setGerando] = useState(false);
```

E a função:

```typescript
  async function gerarDossie() {
    setGerando(true);
    try {
      const res = await fetch('/api/autopsia/dossie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopsia_id: id }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? 'Falha ao gerar o dossiê.');
    } catch (e) {
      alert((e as Error).message);
    }
    setGerando(false);
  }
```

E, no bloco `aba === 'dossie'`, substitua o parágrafo do estado vazio por:

```tsx
            <div className="text-center py-10">
              <p className="text-secondary text-sm mb-4">
                O dossiê é gerado a partir das transcrições e dos metadados dos criativos.
              </p>
              <button
                onClick={gerarDossie}
                disabled={gerando || autopsia.total_transcritos === 0}
                className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg inline-flex items-center gap-2"
              >
                {gerando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {gerando ? 'Analisando…' : 'Gerar dossiê com IA'}
              </button>
              {autopsia.total_transcritos === 0 && (
                <p className="text-secondary text-xs mt-3">Nenhum criativo transcrito ainda — rode o worker.</p>
              )}
            </div>
```

E, quando `autopsia.dossie_md` existir, mantenha o `<pre>` e adicione acima dele um botão "Regerar" chamando a mesma `gerarDossie()`.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com o dev rodando:
```bash
curl -s -X POST http://localhost:3000/api/autopsia/dossie \
  -H "Content-Type: application/json" \
  -d "{\"autopsia_id\":\"<ID>\"}" | head -c 400
```
Expected: `"sucesso":true` com o `provider` (Claude, ou `gpt-4o-mini (fallback)` se a Anthropic estiver sem crédito).

Abra a aba **Dossiê**: as 9 seções devem estar preenchidas, a seção 8 com pontos em aberto reais, e a tabela de anexos com um criativo por linha.

- [ ] **Step 5: Commit**

```bash
git add src/lib/autopsia/dossie.ts src/app/api/autopsia/dossie/route.ts "src/app/autopsia/[id]/page.tsx"
git commit -m "feat(autopsia): dossie em 9 secoes — agente devolve JSON, codigo monta o markdown

Mesmo padrao do fop.ts: a IA decide a inteligencia, o codigo decide a forma.
Deixar o modelo escrever o markdown inteiro faria a estrutura variar a cada
geracao, e o HTML precisa de estrutura estavel.

em_aberto e campo de primeira classe: transforma a regra 'o dossie nao
preenche slot em aberto' em schema, em vez de depender do modelo se comportar.

O contrato de saida fica na rota, nao no AGENTS.md — o cerebro descreve COMO
analisar (e e lido por humano em /agents), a rota impoe o formato.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FASE 5 — HTML publicável

### Task 15: `montarHtml()` + `/api/autopsia/publicar`

**Files:**
- Modify: `src/lib/autopsia/dossie.ts` (adicionar `montarHtml`)
- Create: `src/app/api/autopsia/publicar/route.ts`
- Modify: `src/app/autopsia/[id]/page.tsx` (botão publicar)

**Interfaces:**
- Consumes: `deployHtmlToPages`, `slugify` de `@/lib/cloudflare`; `DadosDossie` (Task 14)
- Produces: `montarHtml(dados: DadosDossie): string`; `POST /api/autopsia/publicar` body `{ autopsia_id }` → `{ sucesso, url }`

⚠️ **A armadilha desta tarefa:** o HTML do método manual usava caminhos **relativos** (`frames/…`) porque vivia numa pasta. Aqui os assets estão no Storage — **tudo precisa ser URL absoluta**, ou o dossiê publicado abre sem imagem nenhuma.

- [ ] **Step 1: Adicionar `montarHtml` no fim de `src/lib/autopsia/dossie.ts`**

```typescript
function escapar(txt: string): string {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Markdown mínimo → HTML. Só o que o dossiê usa: títulos, negrito, itálico,
 * código, listas, citação, tabela e parágrafo.
 *
 * Deliberadamente sem biblioteca: o HTML precisa ser um ARQUIVO ÚNICO e
 * autocontido, que abre com duplo clique e não depende de CDN nenhum.
 */
function markdownParaHtml(md: string): string {
  const linhas = escapar(md).split('\n');
  const out: string[] = [];
  let emLista = false;
  let emTabela = false;

  const inline = (t: string) =>
    t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const fecharLista = () => { if (emLista) { out.push('</ul>'); emLista = false; } };
  const fecharTabela = () => { if (emTabela) { out.push('</tbody></table>'); emTabela = false; } };

  for (const linha of linhas) {
    const l = linha.trimEnd();

    if (/^\|(\s*:?-+:?\s*\|)+$/.test(l)) continue; // separador da tabela

    if (l.startsWith('|')) {
      const celulas = l.split('|').slice(1, -1).map((c) => inline(c.trim()));
      if (!emTabela) {
        fecharLista();
        out.push('<table><thead><tr>' + celulas.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
        emTabela = true;
      } else {
        out.push('<tr>' + celulas.map((c) => `<td>${c}</td>`).join('') + '</tr>');
      }
      continue;
    }
    fecharTabela();

    if (/^#{1,4}\s/.test(l)) {
      fecharLista();
      const nivel = l.match(/^#+/)![0].length;
      out.push(`<h${nivel}>${inline(l.replace(/^#+\s/, ''))}</h${nivel}>`);
    } else if (/^[-*]\s/.test(l)) {
      if (!emLista) { out.push('<ul>'); emLista = true; }
      out.push(`<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`);
    } else if (l.startsWith('&gt; ')) {
      fecharLista();
      out.push(`<blockquote>${inline(l.slice(5))}</blockquote>`);
    } else if (l === '---') {
      fecharLista();
      out.push('<hr>');
    } else if (l.trim() === '') {
      fecharLista();
    } else {
      fecharLista();
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  fecharLista();
  fecharTabela();
  return out.join('\n');
}

/**
 * HTML de arquivo ÚNICO: CSS inline, sem CDN, sem build, abre com duplo clique.
 *
 * ⚠️ As imagens usam as URLs ABSOLUTAS do Supabase Storage. O dossiê do método
 * manual usava caminhos relativos porque vivia numa pasta com os arquivos ao
 * lado; publicado no Cloudflare, relativo abriria sem imagem nenhuma.
 */
export function montarHtml(dados: DadosDossie): string {
  const corpo = markdownParaHtml(montarMarkdown(dados));

  const galeria = dados.criativos
    .filter((c) => c.frames_paths?.length)
    .map((c, i) => {
      const imgs = c.frames_paths!
        .map((u) => `<img src="${u}" alt="frames do criativo ${i}" loading="lazy">`)
        .join('\n');
      return `<section class="criativo">
  <h3>Criativo ${i} — ${c.duracao_s ?? '?'}s · ${c.dias_no_ar ?? '?'} dias no ar${c.is_active ? ' · ativo' : ''}</h3>
  <div class="grades">${imgs}</div>
  ${c.transcricao ? `<details><summary>Transcrição</summary><p class="transc">${escapar(c.transcricao)}</p></details>` : ''}
</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dossiê — ${escapar(dados.page_name ?? dados.page_id)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 3rem 1.25rem 6rem; background: #0D0D14; color: #E5E7EB;
         font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 1.5rem; color: #fff; }
  h2 { font-size: 1.4rem; margin: 3rem 0 1rem; color: #fff; border-bottom: 1px solid #2A2A38; padding-bottom: .5rem; }
  h3 { font-size: 1.1rem; margin: 2rem 0 .75rem; color: #fff; }
  h4 { font-size: 1rem; margin: 1.5rem 0 .5rem; color: #A5B4FC; }
  p { margin: 0 0 1rem; }
  a { color: #818CF8; }
  code { background: #16161F; padding: .15em .4em; border-radius: 4px; font-size: .875em; color: #A5B4FC; }
  blockquote { margin: 1.25rem 0; padding: .75rem 1rem; border-left: 3px solid #6366f1;
               background: #16161F; border-radius: 0 6px 6px 0; color: #9CA3AF; }
  ul { padding-left: 1.25rem; margin: 0 0 1rem; }
  li { margin: .35rem 0; }
  hr { border: 0; border-top: 1px solid #2A2A38; margin: 2.5rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .875rem; display: block; overflow-x: auto; }
  th, td { border: 1px solid #2A2A38; padding: .5rem .65rem; text-align: left; vertical-align: top; }
  th { background: #16161F; color: #fff; font-weight: 600; }
  .criativo { margin: 2.5rem 0; padding: 1.25rem; background: #16161F; border: 1px solid #2A2A38; border-radius: 10px; }
  .grades { display: grid; gap: .75rem; grid-template-columns: 1fr; }
  @media (min-width: 720px) { .grades { grid-template-columns: repeat(3, 1fr); } }
  .grades img { width: 100%; border-radius: 6px; display: block; }
  details { margin-top: 1rem; }
  summary { cursor: pointer; color: #818CF8; font-size: .9rem; }
  .transc { margin-top: .75rem; color: #9CA3AF; font-size: .9rem; white-space: pre-wrap; }
  footer { max-width: 860px; margin: 4rem auto 0; padding-top: 1.5rem; border-top: 1px solid #2A2A38;
           color: #6B7280; font-size: .8rem; }
</style>
</head>
<body>
<main>
${corpo}

<h2>Galeria de criativos</h2>
${galeria || '<p>Nenhuma grade de frames gerada.</p>'}
</main>
<footer>Gerado pelo Alavanca Synapse · ${new Date(dados.criado_em).toLocaleDateString('pt-BR')}</footer>
</body>
</html>`;
}
```

- [ ] **Step 2: Criar `src/app/api/autopsia/publicar/route.ts`**

```typescript
// src/app/api/autopsia/publicar/route.ts
//
// Publica o dossiê como página única no Cloudflare Pages. Reusa o helper já
// validado do Designer (src/lib/cloudflare.ts) — o HTML vai por ARQUIVO,
// nunca por argumento de linha de comando; só o slug sanitizado entra no
// comando.

import { getTenantClient } from '@/lib/supabase-tenant';
import { deployHtmlToPages, slugify } from '@/lib/cloudflare';
import { montarHtml, type DadosDossie } from '@/lib/autopsia/dossie';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { autopsia_id } = await request.json();
    if (!autopsia_id) {
      return Response.json({ error: 'autopsia_id é obrigatório.' }, { status: 400 });
    }

    const supabase = getTenantClient();

    const { data: autopsia, error: errA } = await supabase
      .from('autopsias')
      .select('*')
      .eq('id', autopsia_id)
      .single();
    if (errA || !autopsia) {
      return Response.json({ error: 'Autópsia não encontrada.' }, { status: 404 });
    }
    if (!autopsia.dossie_json) {
      return Response.json({ error: 'Gere o dossiê antes de publicar.' }, { status: 400 });
    }

    const { data: criativos } = await supabase
      .from('autopsia_criativos')
      .select('*')
      .eq('autopsia_id', autopsia_id)
      .order('dias_no_ar', { ascending: false });

    const dados: DadosDossie = {
      page_name: autopsia.page_name,
      page_id: autopsia.page_id,
      total_anuncios: autopsia.total_anuncios,
      total_criativos: autopsia.total_criativos,
      criado_em: autopsia.criado_em,
      criativos: (criativos ?? []) as DadosDossie['criativos'],
      secoes: autopsia.dossie_json,
    };

    const html = montarHtml(dados);
    const base = slugify(autopsia.page_name ?? `page-${autopsia.page_id}`);
    const slug = `autopsia-${base}-${String(autopsia.id).slice(0, 6)}`;

    const resultado = await deployHtmlToPages({ slug, html });

    await supabase
      .from('autopsias')
      .update({ dossie_html_url: resultado.url })
      .eq('id', autopsia_id);

    return Response.json({ sucesso: true, url: resultado.url, slug: resultado.slug });
  } catch (err) {
    console.error('[api/autopsia/publicar] erro:', err);
    return Response.json(
      { error: 'Falha ao publicar o dossiê', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Botão publicar na aba Dossiê**

Em `src/app/autopsia/[id]/page.tsx`, adicione o estado `const [publicando, setPublicando] = useState(false);` e a função:

```typescript
  async function publicar() {
    setPublicando(true);
    try {
      const res = await fetch('/api/autopsia/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopsia_id: id }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? 'Falha ao publicar.');
    } catch (e) {
      alert((e as Error).message);
    }
    setPublicando(false);
  }
```

No bloco onde `autopsia.dossie_md` existe, acima do `<pre>`:

```tsx
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-surface-elevated">
              <button
                onClick={gerarDossie}
                disabled={gerando}
                className="text-secondary hover:text-white text-sm px-3 py-2 rounded-lg border border-surface-elevated"
              >
                {gerando ? 'Analisando…' : 'Regerar'}
              </button>
              <button
                onClick={publicar}
                disabled={publicando}
                className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                {publicando ? 'Publicando…' : autopsia.dossie_html_url ? 'Republicar' : 'Publicar dossiê'}
              </button>
              {autopsia.dossie_html_url && (
                <a
                  href={autopsia.dossie_html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-status-green text-sm hover:underline"
                >
                  No ar — abrir
                </a>
              )}
            </div>
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

Com o dev rodando:
```bash
curl -s -X POST http://localhost:3000/api/autopsia/publicar \
  -H "Content-Type: application/json" -d "{\"autopsia_id\":\"<ID>\"}"
```
Expected: `"sucesso":true` com uma URL `https://autopsia-….pages.dev`.

**Prova das URLs absolutas** — abra a URL publicada e confirme que os frames aparecem:
```bash
curl -s https://autopsia-<slug>.pages.dev | grep -o 'src="https://[^"]*storage[^"]*"' | head -3
```
Expected: pelo menos uma URL absoluta apontando para `…supabase.co/storage/v1/object/public/criativos/…`. **Se aparecer `src="frames/…"` ou caminho relativo, a armadilha do §7 não foi evitada — corrija antes de commitar.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/autopsia/dossie.ts src/app/api/autopsia/publicar/route.ts "src/app/autopsia/[id]/page.tsx"
git commit -m "feat(autopsia): dossie em HTML autocontido publicado no Cloudflare

Arquivo unico, CSS inline, sem CDN, abre com duplo clique — e agora tambem
por link compartilhavel, reusando o deployHtmlToPages ja validado no Designer.

Renderizador de markdown proprio (sem biblioteca) justamente para o HTML ser
autocontido.

As imagens usam URL ABSOLUTA do Storage: o dossie do metodo manual usava
caminho relativo porque vivia numa pasta com os arquivos ao lado; publicado,
relativo abriria sem imagem nenhuma.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# FECHAMENTO

### Task 16: Validação ponta a ponta + documentação

**Files:**
- Modify: `NOTES.md`
- Modify: `CLAUDE.md` (correção da env)
- Modify: `PLANO-AUTOPSIA-CONCORRENTE.md` (marcar o que foi feito)

- [ ] **Step 1: Rodar a autópsia inteira do zero contra o gabarito**

Apague a autópsia de teste e refaça o ciclo completo, cronometrando:

```bash
# 1. cria
curl -s -X POST http://localhost:3000/api/autopsia/criar \
  -H "Content-Type: application/json" \
  -d '{"page_id":"1130979790090955"}'

# 2. processa (deixe terminar)
py -3 scripts/worker-autopsia.py

# 3. dossiê + publicação pela UI em /autopsia/<id>
```

Confira os 6 critérios de aceite do spec (§8) e anote o resultado real de cada um:

| # | Critério | Resultado |
|---|---|---|
| 1 | Dedup chega a ~8 criativos únicos | |
| 2 | Durações entre 31s e 130s | |
| 3 | Transcrições batem com `low-ticket/alimento-sagrado/transcricoes/` | |
| 4 | 3 grades de frames por vídeo | |
| 5 | Dossiê com 9 seções, `modelar_x_rejeitar` preenchida, nada inventado | |
| 6 | HTML publicado abre e **mostra os frames** | |

Divergência nos itens 1 e 2 é aceitável **se explicável** (a operação mudou desde 24/07). Divergência nos itens 3–6 é bug.

- [ ] **Step 2: Corrigir a env no `CLAUDE.md`**

Na lista de variáveis de ambiente, troque `SCRAPECREATORS_API_KEY=` por `SCRAPE_CREATORS_API_KEY=` e acrescente ao bloco de "Estado Real do Código":

```markdown
9. **A env do scraper é `SCRAPE_CREATORS_API_KEY`** (com underscore entre SCRAPE e
   CREATORS) — este documento já documentou errado como `SCRAPECREATORS_API_KEY`.
   O código (`mineracao/run`, `autopsia/coleta`) usa a primeira.
```

- [ ] **Step 3: Atualizar o `NOTES.md`**

Adicione uma seção antes de "📊 Status por agente", com os números **reais** medidos no Step 1 (não os previstos):

```markdown
## 🔬 Autópsia de Concorrente — MÓDULO CONSTRUÍDO (27/07/2026)
10º agente. A mineração acha anúncios; a autópsia disseca um anunciante.

**Arquitetura:** a rota só enfileira, um worker Python local consome
(`autopsia_jobs`). Transcrever leva minutos por vídeo e não cabe em rota
(`maxDuration=300` é limite de plataforma). Trocar por API de transcrição
depois = outro consumidor da mesma fila.

**Fase 0 (conserta bug real):** as URLs do FB CDN expiram em ~5 dias (o `oe=`
é a validade). Mineração agora salva a imagem no Storage (`bucket criativos`,
coluna `image_storage_path`); backfill salvou os já minerados. Vídeo só baixa
sob demanda.

**Coleta:** ScrapeCreators `company/ads` por `page_id` — 30 anúncios/chamada +
cursor, 1 crédito cada. Substitui os passos de Playwright/scroll/parse do
método manual. Dedup pela mesma `creativeKeyFromSnap()` da mineração (extraída
para `minerador-media.ts`).

**Worker** (`scripts/worker-autopsia.py`, stdlib + REST): download com
`Referer: facebook.com` → ffmpeg 3 grades 3×3 (hook/meio/CTA) → faster-whisper
`medium` local. Custo R$ 0.

**Dossiê:** agente `autopsia` devolve JSON por seção; montador determinístico
gera `.md` e `.html` autocontido (URLs absolutas do Storage) publicado no
Cloudflare. `em_aberto[]` é campo de schema — o dossiê não preenche slot em
aberto por inferência.

**Validado contra gabarito:** rodado no mesmo anunciante do low-ticket
(*Alimento Sagrado*, `page_id 1130979790090955`), cujo dossiê manual de 24/07
deu 18 anúncios → 8 criativos, 31s–130s. Resultado: <PREENCHER com os números
reais do Step 1>.

**Pendente:** transcrição por API (Groq) como 2º consumidor da fila; BYOK.
```

Atualize também a tabela "📊 Status por agente" com a linha do agente Autópsia, e o "Última atualização" no topo do arquivo.

- [ ] **Step 4: Marcar o plano original como implementado**

No topo de `PLANO-AUTOPSIA-CONCORRENTE.md`, acrescente:

```markdown
> ✅ **IMPLEMENTADO em 27/07/2026.** Fases 0–5 construídas. Ver o spec em
> `docs/superpowers/specs/2026-07-26-autopsia-concorrente-design.md`, o plano
> em `docs/superpowers/plans/2026-07-27-autopsia-concorrente.md` e o registro
> em `NOTES.md`. As decisões §6 (transcrição) e §10.4 (hospedagem) foram
> resolvidas: worker local com fila, e app de uso pessoal guarda o material
> completo. §11 (BYOK) segue como fase futura, com `getTenantClient()` no lugar.
```

- [ ] **Step 5: Atualizar o segundo cérebro (regra fixa do projeto)**

Conforme o `CLAUDE.md` e o `NOTES.md`, ao validar uma tarefa:
1. Atualize `02_Projetos/Alavanca_Synapse.md` no vault Obsidian (**Nexus.AI**, nunca outro vault) via MCP, e o canvas em `03_Workflows/`.
2. Rode o Graphify na raiz do cofre: `C:\Python313\python.exe -m graphify update . --force`

- [ ] **Step 6: Verificação final e commit**

Run: `npx tsc --noEmit`
Expected: limpo (exceto o erro pré-existente em `scratch/`).

```bash
git add NOTES.md CLAUDE.md PLANO-AUTOPSIA-CONCORRENTE.md
git commit -m "docs(autopsia): registra o modulo construido e validado

NOTES.md com a arquitetura, os numeros reais da validacao contra o gabarito
do Alimento Sagrado e o que ficou pendente.

CLAUDE.md: corrige a env do scraper para SCRAPE_CREATORS_API_KEY (estava
documentada sem o underscore, e o codigo sempre usou a forma com underscore).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Auto-revisão do plano

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| §3 D1 worker local + fila | 3, 10, 12 |
| §3 D2 storage só de imagem na mineração | 2 |
| §3 D4 rota nunca processa mídia | 6, 10 |
| §3 D5 JSON por seção + montador | 14 |
| §3 D6 `getTenantClient()` | 1 (usado em 6, 14, 15) |
| §3 D7 página nova `/autopsia` | 7, 8, 9 |
| §3 D8 uso pessoal, guardar tudo | Global Constraints |
| §4 extração do `creativeKeyFromSnap` | 4 |
| §5 schema (3 tabelas + colunas fase 0) | 2, 3 |
| §6.1 coleta paginada + dedup + `efg` | 5, 6 |
| §6.2 worker download/frames/transcrever | 10, 11, 12 |
| §6.3 dossiê 9 seções + `em_aberto` | 13, 14 |
| §6.4 publicar no Cloudflare | 15 |
| §7 erros (tentativas, worker offline, CDN expirado) | 8, 10 |
| §8 verificação contra o gabarito | 5, 12, 16 |
| §9 ordem das fases | ordem das tasks |

Sem lacunas.

**Consistência de tipos:** `creativeKeyFromSnap` (4) → usado em 5. `CriativoColetado` (5) → consumido em 6. `salvarMidia`/`BUCKET_CRIATIVOS` (1) → usados em 2. `DossieJSON`/`DadosDossie`/`montarMarkdown` (14) → `montarHtml` e a rota publicar (15) usam os mesmos nomes. Colunas do SQL (3) batem com os campos usados em 6, 8, 10, 11, 12, 14, 15. `HANDLERS` cresce em 10 → 11 → 12 com as chaves `download`/`frames`/`transcrever`, iguais aos valores de `autopsia_jobs.tipo` inseridos em 6 e 10.

**Placeholders:** o único `<PREENCHER>` é intencional — são os números da validação real, que só existem depois de rodar (Task 16, Step 1/3).
