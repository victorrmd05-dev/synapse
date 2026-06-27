// src/lib/cloudflare.ts
//
// Publicação de landing pages no Cloudflare Pages via Wrangler CLI.
//
// Por que Wrangler (CLI) e não a Direct Upload API: o fluxo `wrangler pages
// deploy` foi o validado ponta a ponta com o token atual (CLOUDFLARE_API_TOKEN),
// e cuida sozinho de hashing/upload incremental dos assets. O custo é shellar
// um processo, mas a rota roda server-side (Node) e o input perigoso (HTML) vai
// por ARQUIVO, nunca por argumento — só o slug, já sanitizado para [a-z0-9-],
// entra na linha de comando.
//
// Requer no ambiente: CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID.

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

/** Slug válido para nome de projeto Cloudflare Pages: lowercase, [a-z0-9-], <=58. */
export function slugify(input: string): string {
  const base = (input || 'lp')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54);
  return base || 'lp';
}

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

// npx resolve o wrangler instalado localmente (devDependency). shell:true é
// necessário no Windows para achar o .cmd; seguro aqui pois nenhum input livre
// do usuário entra nos args (apenas slug sanitizado e caminhos controlados).
function run(args: string[], cwd: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['wrangler', ...args], {
      cwd,
      shell: true,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (err) =>
      resolve({ code: null, stdout, stderr: stderr + '\n' + String(err) })
    );
  });
}

export interface DeployResult {
  /** URL estável de produção: https://<slug>.pages.dev */
  url: string;
  /** Alias do deploy específico (https://<hash>.<slug>.pages.dev), se capturado. */
  deploymentUrl: string | null;
  slug: string;
  log: string;
}

/**
 * Publica um HTML único como index.html de um projeto Cloudflare Pages.
 * Cria o projeto se ainda não existir (tolera "já existe") e faz o deploy.
 */
export async function deployHtmlToPages(opts: {
  slug: string;
  html: string;
}): Promise<DeployResult> {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error(
      'CLOUDFLARE_API_TOKEN e/ou CLOUDFLARE_ACCOUNT_ID ausentes no ambiente.'
    );
  }

  const slug = slugify(opts.slug);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `lp-deploy-${slug}-`));
  let log = '';

  try {
    await fs.writeFile(path.join(dir, 'index.html'), opts.html, 'utf-8');

    // 1. Criar o projeto (idempotente: se já existe, o create falha e seguimos).
    const create = await run(
      ['pages', 'project', 'create', slug, '--production-branch=main'],
      dir
    );
    log += `$ wrangler pages project create ${slug}\n${create.stdout}${create.stderr}\n`;
    const jaExiste = /already exists|already taken/i.test(
      create.stdout + create.stderr
    );
    if (create.code !== 0 && !jaExiste) {
      throw new Error(
        `Falha ao criar projeto Pages "${slug}": ${create.stderr || create.stdout}`
      );
    }

    // 2. Deploy do diretório (index.html) na branch de produção.
    const deploy = await run(
      [
        'pages',
        'deploy',
        '.',
        `--project-name=${slug}`,
        '--branch=main',
        '--commit-dirty=true',
      ],
      dir
    );
    log += `$ wrangler pages deploy . --project-name=${slug}\n${deploy.stdout}${deploy.stderr}\n`;
    if (deploy.code !== 0) {
      throw new Error(
        `Falha no deploy da página "${slug}": ${deploy.stderr || deploy.stdout}`
      );
    }

    // Alias do deploy específico (https://<hash>.<slug>.pages.dev).
    const match = (deploy.stdout + deploy.stderr).match(
      /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev/i
    );

    return {
      url: `https://${slug}.pages.dev`,
      deploymentUrl: match ? match[0] : null,
      slug,
      log,
    };
  } finally {
    // Limpa o dir temporário (best-effort).
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
