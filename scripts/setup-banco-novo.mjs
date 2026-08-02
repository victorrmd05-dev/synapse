// scripts/setup-banco-novo.mjs
//
// Prepara um projeto Supabase NOVO com o mesmo schema deste aqui: aplica as
// migrations na ordem, cria o bucket de arquivos e liga o Realtime.
//
//   node --env-file=.env.local scripts/setup-banco-novo.mjs                  (usa DATABASE_URL)
//   node scripts/setup-banco-novo.mjs "postgresql://postgres:SENHA@host:5432/postgres"
//   node --env-file=.env.local scripts/setup-banco-novo.mjs --dry            (so lista, nao aplica)
//
// 🔒 A connection string NUNCA e impressa nem gravada. So o host aparece no log,
// para voce confirmar que apontou para o banco certo antes de aplicar.
//
// 🚨 POR QUE ELE E IDEMPOTENTE E NAO SO "roda os .sql": duas migrations criam
// policy com `EXECUTE format('CREATE POLICY ...')` SEM `IF NOT EXISTS`. Rodar
// duas vezes derruba tudo com "policy already exists". Como este script existe
// justamente para ser rodado mais de uma vez (e para reparar um banco meio
// aplicado), ele trata os erros de "ja existe" como sucesso e segue.
//
// 🚨 O BUCKET NAO ESTA NAS MIGRATIONS. No app ele nasce em runtime, pelo
// garantirBucket() de src/lib/storage.ts. Um banco novo so com as migrations
// fica com as tabelas certas e SEM lugar para guardar arquivo — mineracao,
// autopsia e video quebram no primeiro upload. Por isso o passo 2 aqui.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR_MIGRATIONS = path.join(AQUI, '..', 'supabase', 'migrations');

const BUCKET = 'criativos';
// Teto medido neste projeto: 52MB passa, 55MB falha ("object exceeded the
// maximum allowed size"). 50MB deixa margem e cobre criativo de anuncio (4-5MB).
const BUCKET_LIMITE_BYTES = 50 * 1024 * 1024;

// Codigos do Postgres que significam "isso ja estava la" — nao sao falha.
const JA_EXISTE = new Set([
  '42P07', // relation already exists
  '42710', // duplicate object (policy, trigger, publication member)
  '42701', // duplicate column
  '42P06', // schema already exists
  '42723', // duplicate function
]);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const urlDaLinha = args.find((a) => a.startsWith('postgres'));
const CONEXAO = urlDaLinha || process.env.DATABASE_URL;

if (!CONEXAO) {
  console.error(`
[setup] Falta a connection string do banco.

  Passe como argumento:
    node scripts/setup-banco-novo.mjs "postgresql://postgres:SENHA@HOST:5432/postgres"

  Ou tenha DATABASE_URL no .env.local e rode:
    node --env-file=.env.local scripts/setup-banco-novo.mjs

  Onde achar: painel do Supabase > Project Settings > Database > Connection string (URI).
`);
  process.exit(1);
}

// So o host, nunca a senha.
function hostDe(url) {
  try {
    return new URL(url).host;
  } catch {
    return '(nao consegui ler o host)';
  }
}

const cliente = new pg.Client({
  connectionString: CONEXAO,
  // O pooler do Supabase exige TLS, e o certificado e de uma CA que o Node nao
  // traz por padrao. Sem isto: "self signed certificate in certificate chain".
  ssl: { rejectUnauthorized: false },
});

async function aplicarMigrations() {
  const arquivos = (await readdir(DIR_MIGRATIONS))
    .filter((n) => n.endsWith('.sql'))
    .sort(); // o nome comeca com timestamp — ordem alfabetica E a ordem cronologica

  console.log(`\n[1/3] ${arquivos.length} migrations em ordem\n`);

  let aplicadas = 0;
  let puladas = 0;

  for (const nome of arquivos) {
    const sql = await readFile(path.join(DIR_MIGRATIONS, nome), 'utf8');
    if (dryRun) {
      console.log(`  ~ ${nome} (dry-run, nao aplicado)`);
      continue;
    }
    try {
      await cliente.query(sql);
      console.log(`  ✓ ${nome}`);
      aplicadas++;
    } catch (err) {
      if (JA_EXISTE.has(err.code)) {
        console.log(`  · ${nome} — ja existia (${err.code}), pulando`);
        puladas++;
        continue;
      }
      console.error(`\n  ✗ ${nome} FALHOU`);
      console.error(`    ${err.code ?? ''} ${err.message}`);
      throw new Error(`migration ${nome} falhou — nada depois dela foi aplicado`);
    }
  }
  return { aplicadas, puladas, total: arquivos.length };
}

async function criarBucket() {
  console.log(`\n[2/3] bucket "${BUCKET}"\n`);
  if (dryRun) {
    console.log('  ~ dry-run, nao criado');
    return;
  }
  // Direto no storage.buckets: pela connection string somos superusuario, entao
  // nao precisamos da service_role key so para isto.
  const { rowCount } = await cliente.query(
    `insert into storage.buckets (id, name, public, file_size_limit)
     values ($1, $1, true, $2)
     on conflict (id) do nothing`,
    [BUCKET, BUCKET_LIMITE_BYTES],
  );
  console.log(rowCount > 0 ? '  ✓ criado (publico, 50MB)' : '  · ja existia, mantido como estava');
}

async function conferir() {
  console.log('\n[3/3] conferencia\n');

  const { rows: tabelas } = await cliente.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
  );
  const { rows: [{ n: policies }] } = await cliente.query(
    `select count(*)::int as n from pg_policies where schemaname = 'public'`,
  );
  const { rows: realtime } = await cliente.query(
    `select tablename from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
      order by tablename`,
  );
  const { rows: buckets } = await cliente.query(
    `select id, public from storage.buckets where id = $1`, [BUCKET],
  );

  console.log(`  tabelas em public: ${tabelas.length}`);
  console.log(`    ${tabelas.map((t) => t.table_name).join(', ')}`);
  console.log(`  policies RLS: ${policies}`);
  console.log(`  Realtime ligado em: ${realtime.map((r) => r.tablename).join(', ') || '(nenhuma)'}`);
  console.log(`  bucket ${BUCKET}: ${buckets.length ? (buckets[0].public ? 'existe, publico' : 'existe, PRIVADO ⚠️') : 'NAO EXISTE ⚠️'}`);

  return tabelas.length;
}

console.log(`\n=== setup de banco novo ===`);
console.log(`alvo: ${hostDe(CONEXAO)}${dryRun ? '   [DRY-RUN]' : ''}`);

try {
  await cliente.connect();
  const r = await aplicarMigrations();
  await criarBucket();
  const nTabelas = await conferir();

  console.log(`\n=== pronto ===`);
  if (!dryRun) {
    console.log(`migrations: ${r.aplicadas} aplicadas, ${r.puladas} ja existiam (de ${r.total})`);
  }
  console.log(`\nFalta fazer NO APP, nao aqui:`);
  console.log(`  1. preencher o .env.local com as 3 chaves do projeto novo`);
  console.log(`  2. abrir /agents e clicar em sincronizar — e isso que popula`);
  console.log(`     agentes_config a partir da pasta agentes/. Sem esse passo as`);
  console.log(`     rotas de IA respondem "agente nao configurado".`);
  console.log(`\n(${nTabelas} tabelas no banco)`);
} catch (err) {
  console.error(`\n=== PAROU ===\n${err.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
