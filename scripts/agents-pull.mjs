// scripts/agents-pull.mjs
//
// Supabase (agentes_config)  ->  arquivos locais em agentes/<slug>/
//
// Roda UMA vez para tornar visível, como arquivos editáveis, o conteúdo
// dos agentes que hoje só existe no banco. Depois de editar localmente,
// use `npm run agents:push` para mandar de volta.
//
//   npm run agents:pull

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

const { data, error } = await supabase
  .from('agentes_config')
  .select('*')
  .order('slug');

if (error) {
  console.error('Erro ao ler agentes_config:', error.message);
  process.exit(1);
}

fs.mkdirSync(AGENTES_DIR, { recursive: true });

for (const row of data) {
  const dir = path.join(AGENTES_DIR, row.slug);
  fs.mkdirSync(dir, { recursive: true });

  let escritos = [];
  for (const { col, file } of FILE_MAP) {
    const conteudo = row[col];
    if (conteudo && String(conteudo).trim().length > 0) {
      fs.writeFileSync(path.join(dir, file), conteudo, 'utf8');
      escritos.push(file);
    }
  }

  // Metadados que não fazem parte do conteúdo markdown.
  const meta = {
    slug: row.slug,
    nome: row.nome,
    modelo: row.modelo,
    max_tokens: row.max_tokens,
    ativo: row.ativo,
  };
  fs.writeFileSync(
    path.join(dir, '_agente.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  );

  console.log(`✓ ${row.slug.padEnd(20)} ${escritos.join(', ') || '(sem conteúdo)'}`);
}

console.log(`\nPronto. ${data.length} agente(s) exportado(s) para a pasta agentes/.`);
console.log('Edite os .md à vontade e rode `npm run agents:push` para subir pro Supabase.');
