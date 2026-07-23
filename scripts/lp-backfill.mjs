// scripts/lp-backfill.mjs
// Backfill da Biblioteca de Páginas (lp_biblioteca):
//   1. Importa as LPs do pipeline (workflow_design com codigo_html) — upsert por design_id.
//   2. Importa páginas MANUAIS: subpastas de lps/ com index.html (ex.: lps/capa-iphone-aluminio/).
// Idempotente — rodar de novo só atualiza. Uso: node scripts/lp-backfill.mjs

import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, ROOT } from './_env.mjs';

const env = loadEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes.');

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function rest(pathQS, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathQS}`, { ...init, headers: { ...HEADERS, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${pathQS}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// --- 1. Pipeline: workflow_design → lp_biblioteca -------------------------
const designs = await rest('workflow_design?select=id,campanha_id,codigo_html,url_recurso&codigo_html=not.is.null');
const campanhas = await rest('campanhas_producao?select=id,nome_projeto');
const nomePorCampanha = new Map(campanhas.map((c) => [c.id, c.nome_projeto]));

let pipelineOk = 0;
for (const d of designs) {
  if (!d.codigo_html || !/<html|<!doctype/i.test(d.codigo_html)) continue;
  const nome = nomePorCampanha.get(d.campanha_id) || `LP ${d.id.slice(0, 8)}`;
  const slug = `${slugify(nome) || 'lp'}-${d.id.slice(0, 8)}`;
  await rest('lp_biblioteca?on_conflict=design_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      nome,
      slug,
      origem: 'pipeline',
      design_id: d.id,
      codigo_html: d.codigo_html,
      url_publicada: d.url_recurso || null,
      atualizado_em: new Date().toISOString(),
    }),
  });
  pipelineOk++;
  console.log(`  pipeline ✓ ${nome} (${slug})${d.url_recurso ? ' — no ar' : ''}`);
}

// --- 2. Manuais: lps/<pasta>/index.html → lp_biblioteca --------------------
const lpsDir = path.join(ROOT, 'lps');
let manuaisOk = 0;
if (fs.existsSync(lpsDir)) {
  for (const entry of fs.readdirSync(lpsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(lpsDir, entry.name, 'index.html');
    if (!fs.existsSync(indexPath)) continue;
    const html = fs.readFileSync(indexPath, 'utf8');
    const slug = slugify(entry.name);
    const nome = entry.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    await rest('lp_biblioteca?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        nome,
        slug,
        origem: 'manual',
        codigo_html: html,
        notas: `Importada de lps/${entry.name}/ (assets locais na pasta)`,
        atualizado_em: new Date().toISOString(),
      }),
    });
    manuaisOk++;
    console.log(`  manual   ✓ ${nome} (${slug})`);
  }
}

// --- 3. Arquivos soltos em lps/*.html (designs antigos já removidos do banco) --
//     Ignora os *-tracked.html (mesma página com pixel injetado — duplicata).
let soltosOk = 0;
if (fs.existsSync(lpsDir)) {
  const jaImportados = new Set(
    (await rest('lp_biblioteca?select=slug')).map((r) => r.slug)
  );
  for (const entry of fs.readdirSync(lpsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name.endsWith('-tracked.html')) continue;
    const slug = slugify(entry.name.replace(/\.html$/, ''));
    if (jaImportados.has(slug)) continue; // já veio do pipeline
    const html = fs.readFileSync(path.join(lpsDir, entry.name), 'utf8');
    if (!/<html|<!doctype/i.test(html)) continue;
    const nome = slug.replace(/^campanha-/, '').replace(/-[0-9a-f]{8}$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    await rest('lp_biblioteca?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        nome,
        slug,
        origem: 'pipeline',
        codigo_html: html,
        notas: `Importada do arquivo lps/${entry.name} (design antigo, fora do workflow_design)`,
        atualizado_em: new Date().toISOString(),
      }),
    });
    soltosOk++;
    console.log(`  solto    ✓ ${nome} (${slug})`);
  }
}

console.log(`\nBackfill concluído: ${pipelineOk} do pipeline + ${manuaisOk} manuais + ${soltosOk} soltos.`);
