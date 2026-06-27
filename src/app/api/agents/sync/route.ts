// src/app/api/agents/sync/route.ts
//
// Sincroniza o conteúdo dos agentes do repositório GitHub
// (victorrmd05-dev/agents) para a tabela `agentes_config` no Supabase.
//
// Fonte da verdade: GitHub. Esta rota é um "pull" manual disparado
// pelo botão "Sincronizar Agentes" em /configuracoes.
//
// Fluxo:
//   1. Para cada agente em AGENT_MAP, busca os arquivos .md
//      correspondentes via GitHub Contents API
//   2. Decodifica o conteúdo (vem em base64)
//   3. Faz upsert na tabela agentes_config
//   4. Retorna um relatório por agente (sucesso/erro) para a UI exibir

import { supabaseServer as supabase } from '@/lib/supabase-server';

const GITHUB_OWNER = 'victorrmd05-dev';
const GITHUB_REPO = 'agents';
const GITHUB_API = 'https://api.github.com';

// Mapa explícito slug -> caminhos no GitHub.
// Os nomes de pasta em agents/ e skills/ NÃO seguem a mesma convenção
// (ex: designer-webmaster vs webmaster-skill), então não dá pra adivinhar
// por convenção — precisa ser explícito.
const AGENT_MAP: Record<
  string,
  { nome: string; agentPath: string; skillPath: string | null }
> = {
  'alavanca-ceo': {
    nome: 'Alavanca CEO',
    agentPath: 'agents/alavanca-ceo',
    skillPath: 'skills/alavanca-ceo-skill',
  },
  cto: {
    nome: 'CTO',
    agentPath: 'agents/cto',
    skillPath: 'skills/infra-tech-skill',
  },
  minerador: {
    nome: 'Minerador',
    agentPath: 'agents/minerador',
    skillPath: 'skills/minerador-skill',
  },
  copywriting: {
    nome: 'Copywriting',
    agentPath: 'agents/copywriting',
    skillPath: 'skills/copywriting',
  },
  revisor: {
    nome: 'Revisor',
    agentPath: 'agents/revisor',
    skillPath: 'skills/quality-check-skill',
  },
  'designer-webmaster': {
    nome: 'Designer-Webmaster',
    agentPath: 'agents/designer-webmaster',
    skillPath: 'skills/webmaster-skill',
  },
  'video-maker': {
    nome: 'Video-Maker',
    agentPath: 'agents/video-maker',
    skillPath: 'skills/video-maker-skill',
  },
  tracking: {
    nome: 'Tracking',
    agentPath: 'agents/tracking',
    skillPath: 'skills/tracking-skill',
  },
  'gestor-meta-ads': {
    nome: 'Gestor-Meta-Ads',
    agentPath: 'agents/gestor-meta-ads',
    skillPath: 'skills/gestor-meta-ads',
  },
};

// Arquivos possíveis dentro de uma pasta de agente.
// Nem todo agente tem todos — buscamos e ignoramos 404 silenciosamente.
const AGENT_FILES = ['AGENTS.md', 'SOUL.md', 'HEARTBEAT.md', 'HEARTBEAR.md', 'TOOLS.md'];

interface GithubFileResponse {
  content: string; // base64
  sha: string;
}

async function fetchGithubFile(path: string): Promise<{ content: string; sha: string } | null> {
  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ao buscar ${path}: ${await res.text()}`);
  }

  const data = (await res.json()) as GithubFileResponse;
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

async function fetchAgentFolderContent(folderPath: string): Promise<{
  agents_md: string | null;
  soul_md: string | null;
  heartbeat_md: string | null;
  tools_md: string | null;
  lastSha: string | null;
}> {
  let agents_md: string | null = null;
  let soul_md: string | null = null;
  let heartbeat_md: string | null = null;
  let tools_md: string | null = null;
  let lastSha: string | null = null;

  for (const filename of AGENT_FILES) {
    const result = await fetchGithubFile(`${folderPath}/${filename}`);
    if (!result) continue;

    lastSha = result.sha; // guarda o sha do último arquivo lido como referência de versão
    const upper = filename.toUpperCase();
    if (upper === 'AGENTS.MD') agents_md = result.content;
    else if (upper === 'SOUL.MD') soul_md = result.content;
    else if (upper === 'HEARTBEAT.MD' || upper === 'HEARTBEAR.MD') heartbeat_md = result.content;
    else if (upper === 'TOOLS.MD') tools_md = result.content;
  }

  return { agents_md, soul_md, heartbeat_md, tools_md, lastSha };
}

async function fetchSkillContent(skillPath: string | null): Promise<string | null> {
  if (!skillPath) return null;
  const result = await fetchGithubFile(`${skillPath}/SKILL.md`);
  return result ? result.content : null;
}

export async function POST() {
  if (!process.env.GITHUB_TOKEN) {
    // Repositório público funciona sem token, mas o rate limit é bem mais
    // baixo (60 req/hora vs 5000 req/hora). Avisamos, mas não bloqueamos.
    console.warn('[agents/sync] GITHUB_TOKEN não configurado — usando rate limit anônimo do GitHub.');
  }

  const resultados: Array<{
    slug: string;
    status: 'ok' | 'erro';
    mensagem?: string;
  }> = [];

  for (const [slug, info] of Object.entries(AGENT_MAP)) {
    try {
      const [agentFiles, skillContent] = await Promise.all([
        fetchAgentFolderContent(info.agentPath),
        fetchSkillContent(info.skillPath),
      ]);

      if (!agentFiles.agents_md && !skillContent) {
        resultados.push({
          slug,
          status: 'erro',
          mensagem: `Nenhum conteúdo encontrado em ${info.agentPath} ou ${info.skillPath}. Verifique se os caminhos no GitHub estão corretos.`,
        });
        continue;
      }

      const { error } = await supabase
        .from('agentes_config')
        .upsert(
          {
            slug,
            nome: info.nome,
            github_agent_path: info.agentPath,
            github_skill_path: info.skillPath,
            agents_md: agentFiles.agents_md,
            soul_md: agentFiles.soul_md,
            heartbeat_md: agentFiles.heartbeat_md,
            tools_md: agentFiles.tools_md,
            skill_md: skillContent,
            ultimo_sync_em: new Date().toISOString(),
            ultimo_commit_sha: agentFiles.lastSha,
          },
          { onConflict: 'slug' }
        );

      if (error) throw error;

      resultados.push({ slug, status: 'ok' });
    } catch (err) {
      resultados.push({
        slug,
        status: 'erro',
        mensagem: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }

  const totalOk = resultados.filter((r) => r.status === 'ok').length;
  const totalErro = resultados.filter((r) => r.status === 'erro').length;

  return Response.json({
    resumo: `${totalOk} agente(s) sincronizado(s), ${totalErro} com erro.`,
    resultados,
  });
}
