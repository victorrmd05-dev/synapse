'use server';

// Sincroniza o "cérebro" dos agentes (os .md da pasta local `agentes/`) com a
// tabela `agentes_config` — que é a MESMA fonte que a IA consome via
// getAgentConfig()/buildSystemPrompt(). Ou seja: o que você lê e edita na página
// Agents Config é exatamente o que o agente recebe como system prompt.
//
// Fluxo: pasta agentes/<slug>/{AGENTS,SOUL,TOOLS,SKILL,HEARTBEAT}.md (+ _agente.json
// com modelo/max_tokens/ativo) → upsert em agentes_config.
//
// Edições na página gravam no banco E espelham de volta no arquivo .md local
// (fonte da verdade), pra um re-sync futuro não sobrescrever o que você mudou.

import { promises as fs } from 'fs';
import path from 'path';
import { supabaseServer } from '@/lib/supabase-server';
import type { AgenteConfigRow, SyncResult } from './agentTypes';

const AGENTES_DIR = path.join(process.cwd(), 'agentes');

// Coluna em agentes_config  ->  arquivo .md correspondente na pasta do agente.
const FIELD_TO_FILE: Record<string, string> = {
  agents_md: 'AGENTS.md',
  soul_md: 'SOUL.md',
  heartbeat_md: 'HEARTBEAT.md',
  tools_md: 'TOOLS.md',
  skill_md: 'SKILL.md',
  template_md: 'TEMPLATE.md',
};

const SELECT_COLS =
  'slug, nome, agents_md, soul_md, heartbeat_md, tools_md, skill_md, template_md, modelo, max_tokens, ativo, ultimo_sync_em';

export async function getAgentesConfig(): Promise<AgenteConfigRow[]> {
  const { data, error } = await supabaseServer
    .from('agentes_config')
    .select(SELECT_COLS)
    .order('slug');

  if (error) {
    console.error('[getAgentesConfig]', error);
    return [];
  }
  return (data ?? []) as AgenteConfigRow[];
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function syncAgentsFromFolder(): Promise<SyncResult> {
  const resultados: SyncResult['resultados'] = [];

  let dirs: string[] = [];
  try {
    const entries = await fs.readdir(AGENTES_DIR, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return {
      resumo: `Pasta "agentes/" não encontrada (${AGENTES_DIR}). Rode localmente (npm run dev).`,
      resultados,
    };
  }

  for (const dir of dirs) {
    try {
      const folder = path.join(AGENTES_DIR, dir);

      // Metadados do agente (modelo, max_tokens, ativo) — opcional.
      let meta: { slug?: string; nome?: string; modelo?: string; max_tokens?: number; ativo?: boolean } = {};
      const metaRaw = await readIfExists(path.join(folder, '_agente.json'));
      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch {
          /* json inválido — ignora metadados */
        }
      }
      const slug = meta.slug || dir;
      const nome = meta.nome || dir;

      const agents_md = await readIfExists(path.join(folder, 'AGENTS.md'));
      const soul_md = await readIfExists(path.join(folder, 'SOUL.md'));
      const heartbeat_md = await readIfExists(path.join(folder, 'HEARTBEAT.md'));
      const tools_md = await readIfExists(path.join(folder, 'TOOLS.md'));
      const skill_md = await readIfExists(path.join(folder, 'SKILL.md'));
      const template_md = await readIfExists(path.join(folder, 'TEMPLATE.md'));

      if (!agents_md && !skill_md) {
        resultados.push({
          slug,
          status: 'erro',
          mensagem: `Sem AGENTS.md nem SKILL.md em agentes/${dir}.`,
        });
        continue;
      }

      const row: Record<string, unknown> = {
        slug,
        nome,
        agents_md,
        soul_md,
        heartbeat_md,
        tools_md,
        skill_md,
        template_md,
        ultimo_sync_em: new Date().toISOString(),
        data_atualizacao: new Date().toISOString(),
      };
      if (meta.modelo) row.modelo = meta.modelo;
      if (typeof meta.max_tokens === 'number') row.max_tokens = meta.max_tokens;
      if (typeof meta.ativo === 'boolean') row.ativo = meta.ativo;

      const { error } = await supabaseServer
        .from('agentes_config')
        .upsert(row, { onConflict: 'slug' });
      if (error) throw error;

      resultados.push({ slug, status: 'ok' });
    } catch (err) {
      resultados.push({
        slug: dir,
        status: 'erro',
        mensagem: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }

  const ok = resultados.filter((r) => r.status === 'ok').length;
  const erro = resultados.filter((r) => r.status === 'erro').length;
  return { resumo: `${ok} agente(s) sincronizado(s), ${erro} com erro.`, resultados };
}

export async function saveAgentMarkdown(slug: string, field: string, content: string) {
  if (!(field in FIELD_TO_FILE)) {
    throw new Error(`Campo inválido: ${field}`);
  }

  // 1. Grava na tabela que a IA consome (efeito imediato no system prompt).
  const { error } = await supabaseServer
    .from('agentes_config')
    .update({ [field]: content, data_atualizacao: new Date().toISOString() })
    .eq('slug', slug);
  if (error) throw new Error('Falha ao salvar no banco: ' + error.message);

  // 2. Espelha de volta no .md local (mantém a pasta como fonte da verdade).
  //    Best-effort: em produção sem filesystem isso falha silenciosamente.
  try {
    const folder = path.join(AGENTES_DIR, slug);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, FIELD_TO_FILE[field]), content, 'utf-8');
  } catch (e) {
    console.warn('[saveAgentMarkdown] não consegui espelhar no arquivo local:', e);
  }

  return { ok: true };
}

export async function setAgenteAtivo(slug: string, ativo: boolean) {
  const { error } = await supabaseServer
    .from('agentes_config')
    .update({ ativo, data_atualizacao: new Date().toISOString() })
    .eq('slug', slug);
  if (error) throw new Error('Falha ao atualizar status: ' + error.message);
  return { ok: true };
}
