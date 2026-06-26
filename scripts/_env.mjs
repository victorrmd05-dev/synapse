// scripts/_env.mjs
// Lê .env.local sem dependência externa (dotenv) e devolve um objeto { CHAVE: valor }.
// Usado pelos scripts de sync de agentes para pegar as credenciais do Supabase.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv() {
  const env = {};
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) {
    throw new Error('.env.local não encontrado na raiz do projeto.');
  }
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

export const ROOT = root;
export const AGENTES_DIR = path.join(root, 'agentes');

// Mapeia coluna do Supabase <-> nome de arquivo local.
export const FILE_MAP = [
  { col: 'agents_md', file: 'AGENTS.md' },
  { col: 'soul_md', file: 'SOUL.md' },
  { col: 'heartbeat_md', file: 'HEARTBEAT.md' },
  { col: 'tools_md', file: 'TOOLS.md' },
  { col: 'skill_md', file: 'SKILL.md' },
];
