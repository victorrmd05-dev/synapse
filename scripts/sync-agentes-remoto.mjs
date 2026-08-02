// scripts/sync-agentes-remoto.mjs
//
// Popula `agentes_config` de OUTRO banco Supabase com o cerebro dos agentes
// desta pasta `agentes/`. E o mesmo que o botao de sincronizar da tela /agents
// faz no banco local — util para entregar um projeto novo ja com os agentes
// dentro, sem a pessoa precisar rodar o app primeiro.
//
//   node scripts/sync-agentes-remoto.mjs "postgresql://..."
//   node scripts/sync-agentes-remoto.mjs "postgresql://..." --dry
//
// 🚨 ESPELHA syncAgentsFromFolder() de src/app/actions/syncAgents.ts DE PROPOSITO,
// INCLUSIVE NAS LIMITACOES. Sao seis arquivos e so seis: AGENTS, SOUL, HEARTBEAT,
// TOOLS, SKILL, TEMPLATE. O WORKER.md da autopsia e o COLETA.md do minerador NAO
// vao para o banco — nem aqui, nem no sync do app. Se um dia o app passar a ler
// mais arquivos, este script tem que mudar junto, senao os dois bancos divergem
// e ninguem descobre ate a IA responder errado.
//
// 🚨 O upsert e por `slug`, entao rodar de novo ATUALIZA em vez de duplicar. E o
// que torna seguro re-sincronizar depois de editar um .md.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const AGENTES_DIR = path.join(AQUI, '..', 'agentes');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');

// 🚨 PRECEDENCIA DE PROPOSITO: argumento > REST > DATABASE_URL do ambiente.
// A env fica por ULTIMO porque neste projeto ela e comprovadamente traicoeira —
// ha uma DATABASE_URL antiga setada no ambiente do Windows, apontando para um
// projeto que nem existe mais, e ela SOBREPOE o --env-file (o Node nao
// sobrescreve process.env ja preenchido). Se a env viesse primeiro, rodar
// `node --env-file=.env.local ...` mandaria o sync para o banco errado — ou,
// pior, para um banco de producao de outra pessoa sem ninguem perceber.
const CONEXAO = args.find((a) => a.startsWith('postgres'));

// 🚨 DOIS TRANSPORTES, E NAO E FRESCURA. A conexao Postgres direta
// (db.<ref>.supabase.co) e IPv6-only desde 2024 e simplesmente NAO RESOLVE de
// muita maquina — incluindo esta. O pooler resolve, mas exige a senha do banco,
// que nem sempre se tem a mao. Ja a service_role + REST funciona de qualquer
// lugar e e a mesma porta que o proprio app usa (supabaseServer). Por isso:
//   - connection string  -> pg (bom quando voce tem a senha, ex: projeto novo)
//   - URL + service_role -> REST (bom para o seu proprio projeto, via .env.local)
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONEXAO_ENV = process.env.DATABASE_URL;
const TRANSPORTE = CONEXAO ? 'pg'
  : (URL_SUPABASE && CHAVE_SERVICE) ? 'rest'
  : CONEXAO_ENV ? 'pg-env'
  : null;
const CONEXAO_FINAL = CONEXAO ?? CONEXAO_ENV;

if (!TRANSPORTE) {
  console.error(`
[sync] Falta como chegar no banco. Duas opcoes:

  1. Connection string (precisa da senha do banco):
     node scripts/sync-agentes-remoto.mjs "postgresql://..."

  2. URL + service_role (le do .env.local):
     node --env-file=.env.local scripts/sync-agentes-remoto.mjs
`);
  process.exit(1);
}

const hostDe = (u) => { try { return new URL(u).host; } catch { return '(host ilegivel)'; } };
const lerSeExistir = async (p) => { try { return await fs.readFile(p, 'utf-8'); } catch { return null; } };

const cliente = TRANSPORTE.startsWith('pg')
  ? new pg.Client({ connectionString: CONEXAO_FINAL, ssl: { rejectUnauthorized: false } })
  : null;

// Upsert por `slug` nos dois caminhos. No REST, quem faz o "on conflict do
// update" e o header Prefer: resolution=merge-duplicates + on_conflict=slug —
// e exatamente o que o supabase-js manda por baixo no .upsert().
async function upsert(row) {
  if (cliente) {
    const cols = Object.keys(row);
    const vals = cols.map((_, i) => `$${i + 1}`).join(',');
    const set = cols.filter((c) => c !== 'slug').map((c) => `${c} = excluded.${c}`).join(', ');
    await cliente.query(
      `insert into public.agentes_config (${cols.join(',')}) values (${vals})
       on conflict (slug) do update set ${set}`,
      cols.map((c) => row[c]),
    );
    return;
  }
  const res = await fetch(`${URL_SUPABASE}/rest/v1/agentes_config?on_conflict=slug`, {
    method: 'POST',
    headers: {
      apikey: CHAVE_SERVICE,
      Authorization: `Bearer ${CHAVE_SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`REST ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function listar() {
  if (cliente) {
    const { rows } = await cliente.query(
      `select slug, nome, modelo, max_tokens, ativo,
              coalesce(length(agents_md),0) as agents, coalesce(length(skill_md),0) as skill
         from public.agentes_config order by slug`,
    );
    return rows;
  }
  const res = await fetch(
    `${URL_SUPABASE}/rest/v1/agentes_config?select=slug,nome,modelo,max_tokens,ativo,agents_md,skill_md&order=slug`,
    { headers: { apikey: CHAVE_SERVICE, Authorization: `Bearer ${CHAVE_SERVICE}` } },
  );
  const j = await res.json();
  return j.map((r) => ({ ...r, agents: (r.agents_md ?? '').length, skill: (r.skill_md ?? '').length }));
}

console.log(`\n=== sync de agentes ===`);
console.log(`alvo: ${cliente ? hostDe(CONEXAO_FINAL) : hostDe(URL_SUPABASE)}  (via ${TRANSPORTE})${dryRun ? '   [DRY-RUN]' : ''}`);
console.log(`origem: ${AGENTES_DIR}\n`);

try {
  if (cliente) await cliente.connect();

  const entradas = await fs.readdir(AGENTES_DIR, { withFileTypes: true });
  const pastas = entradas.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  let ok = 0;
  let pulados = 0;

  for (const dir of pastas) {
    const pasta = path.join(AGENTES_DIR, dir);

    let meta = {};
    const metaRaw = await lerSeExistir(path.join(pasta, '_agente.json'));
    if (metaRaw) {
      try { meta = JSON.parse(metaRaw); } catch { /* json invalido — ignora, igual ao app */ }
    }

    const slug = meta.slug || dir;
    const nome = meta.nome || dir;

    const md = {
      agents_md: await lerSeExistir(path.join(pasta, 'AGENTS.md')),
      soul_md: await lerSeExistir(path.join(pasta, 'SOUL.md')),
      heartbeat_md: await lerSeExistir(path.join(pasta, 'HEARTBEAT.md')),
      tools_md: await lerSeExistir(path.join(pasta, 'TOOLS.md')),
      skill_md: await lerSeExistir(path.join(pasta, 'SKILL.md')),
      template_md: await lerSeExistir(path.join(pasta, 'TEMPLATE.md')),
    };

    // Mesma regra do app: sem AGENTS.md nem SKILL.md, nao ha cerebro nenhum.
    if (!md.agents_md && !md.skill_md) {
      console.log(`  ⚠ ${slug} — sem AGENTS.md nem SKILL.md, pulado`);
      pulados++;
      continue;
    }

    const tamanhos = Object.entries(md)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace('_md', '')}:${v.length}`)
      .join(' ');

    if (dryRun) {
      console.log(`  ~ ${slug} (${nome}) — ${tamanhos}`);
      continue;
    }

    const agora = new Date().toISOString();

    // Metadados so entram no row quando o _agente.json realmente traz o campo.
    // Mandar `modelo: null` sobrescreveria com nulo o que ja estava no banco —
    // e o app tem agente rodando em gpt-4o-mini que se perderia assim.
    const row = {
      slug, nome, ...md,
      ultimo_sync_em: agora,
      data_atualizacao: agora,
    };
    if (meta.modelo) row.modelo = meta.modelo;
    if (typeof meta.max_tokens === 'number') row.max_tokens = meta.max_tokens;
    if (typeof meta.ativo === 'boolean') row.ativo = meta.ativo;

    await upsert(row);

    console.log(`  ✓ ${slug} (${nome}) — ${tamanhos}`);
    ok++;
  }

  console.log(`\n=== ${dryRun ? 'dry-run' : `${ok} agente(s) sincronizado(s), ${pulados} pulado(s)`} ===`);

  if (!dryRun) {
    const rows = await listar();
    console.log('\nno banco agora:');
    for (const r of rows) {
      console.log(`  ${r.slug.padEnd(20)} ${String(r.modelo).padEnd(22)} max_tokens=${String(r.max_tokens).padEnd(6)} ativo=${r.ativo}  agents=${r.agents} skill=${r.skill}`);
    }
  }
} catch (err) {
  console.error(`\n=== PAROU ===\n${err.message}`);
  process.exitCode = 1;
} finally {
  if (cliente) await cliente.end().catch(() => {});
}
