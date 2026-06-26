// scripts/agents-push.mjs
//
// arquivos locais em agentes/<slug>/  ->  Supabase (agentes_config)
//
// Lê cada subpasta de agentes/, junta os .md e faz upsert na tabela
// agentes_config. É o passo que faz o conteúdo que editamos aqui
// aparecer no dashboard e ser usado pelos agentes nas chamadas de IA.
//
//   npm run agents:push            (sobe todos os agentes)
//   npm run agents:push minerador  (sobe só um)

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnv, AGENTES_DIR, FILE_MAP } from './_env.mjs';

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const filtro = process.argv[2]; // slug opcional

if (!fs.existsSync(AGENTES_DIR)) {
  console.error('Pasta agentes/ não existe. Rode `npm run agents:pull` primeiro.');
  process.exit(1);
}

const slugs = fs
  .readdirSync(AGENTES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((s) => !filtro || s === filtro);

if (slugs.length === 0) {
  console.error(filtro ? `Agente "${filtro}" não encontrado em agentes/.` : 'Nenhum agente em agentes/.');
  process.exit(1);
}

let ok = 0;
let erros = 0;

for (const slug of slugs) {
  const dir = path.join(AGENTES_DIR, slug);

  const payload = { slug, ultimo_sync_em: new Date().toISOString() };

  // Metadados (nome/modelo/etc) a partir do _agente.json, se existir.
  const metaPath = path.join(dir, '_agente.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.nome) payload.nome = meta.nome;
      if (meta.modelo) payload.modelo = meta.modelo;
      if (meta.max_tokens != null) payload.max_tokens = meta.max_tokens;
      if (meta.ativo != null) payload.ativo = meta.ativo;
    } catch {
      console.warn(`! ${slug}: _agente.json inválido, ignorando metadados.`);
    }
  }
  if (!payload.nome) payload.nome = slug; // nome é NOT NULL na tabela

  // Conteúdo markdown.
  for (const { col, file } of FILE_MAP) {
    const fp = path.join(dir, file);
    payload[col] = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
  }

  const { error } = await supabase
    .from('agentes_config')
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    console.error(`✗ ${slug}: ${error.message}`);
    erros++;
  } else {
    console.log(`✓ ${slug} atualizado no Supabase.`);
    ok++;
  }
}

console.log(`\n${ok} ok, ${erros} com erro.`);
process.exit(erros > 0 ? 1 : 0);
