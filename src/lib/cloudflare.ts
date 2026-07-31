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

// ---------------------------------------------------------------------------
// DOMÍNIO PRÓPRIO (subdomínio por oferta)
//
// O deploy sozinho devolve `<slug>.pages.dev`, que serve para teste. Uma oferta
// no ar precisa de subdomínio próprio — e o caminho já estava provado na conta,
// no ArmorGlass:
//
//   armorglas.planoensino.online ──CNAME proxied──▶ armorglass-capa-iphone.pages.dev
//                                                  + registrado no projeto Pages
//
// São essas duas coisas, nesta ordem. O CNAME **precisa** estar proxied: domínio
// customizado de Pages não valida por DNS direto.
//
// ⚠️ Subdomínio é decisão quase definitiva. Depois que o Meta começa a ver o
// domínio, trocar perde histórico no pixel. Por isso a UI deixa editar antes de
// publicar, em vez de derivar do slug interno (que tem hash e fica feio).
// ---------------------------------------------------------------------------

const CF_API = 'https://api.cloudflare.com/client/v4';

function cfHeaders(): Record<string, string> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN ausente no ambiente.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function cf<T = unknown>(
  caminho: string,
  init?: RequestInit
): Promise<{ ok: boolean; result: T; errors: { code: number; message: string }[] }> {
  const res = await fetch(`${CF_API}${caminho}`, {
    ...init,
    headers: { ...cfHeaders(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return {
    ok: !!json?.success,
    result: json?.result as T,
    errors: (json?.errors ?? []) as { code: number; message: string }[],
  };
}

export interface ZonaCloudflare {
  id: string;
  nome: string;
}

/** Domínios (zonas) disponíveis na conta, para o seletor de destino. */
export async function listarZonas(): Promise<ZonaCloudflare[]> {
  const r = await cf<{ id: string; name: string; status: string }[]>(
    '/zones?per_page=50&status=active'
  );
  if (!r.ok) {
    throw new Error(
      'Falha ao listar domínios do Cloudflare: ' +
        (r.errors.map((e) => e.message).join('; ') || 'erro desconhecido')
    );
  }
  return (r.result ?? []).map((z) => ({ id: z.id, nome: z.name }));
}

/** `Meu Método!` → `meu-metodo`. Mesma regra do slugify, mas para host. */
export function slugSubdominio(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export interface SubdominioResult {
  url: string;
  host: string;
  dns: 'criado' | 'atualizado' | 'ja-correto';
  dominioPages: 'registrado' | 'ja-registrado';
}

/**
 * Aponta `<sub>.<zona>` para um projeto Pages já publicado.
 *
 * Idempotente de propósito: republicar a mesma oferta não pode falhar porque o
 * CNAME já existe. Registro apontando para OUTRO projeto é atualizado, não
 * duplicado — senão o subdomínio ficaria servindo a página errada em silêncio.
 */
export async function apontarSubdominio(opts: {
  zoneId: string;
  zoneNome: string;
  subdominio: string;
  projeto: string;
}): Promise<SubdominioResult> {
  const sub = slugSubdominio(opts.subdominio);
  if (!sub) throw new Error('Subdomínio inválido (vazio depois de normalizar).');

  const host = `${sub}.${opts.zoneNome}`;
  const alvo = `${opts.projeto}.pages.dev`;

  // 1. CNAME proxied. Se já existir com outro destino, corrige.
  const existentes = await cf<{ id: string; content: string; proxied: boolean }[]>(
    `/zones/${opts.zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(host)}`
  );
  const atual = (existentes.result ?? [])[0];

  let dns: SubdominioResult['dns'];
  if (!atual) {
    const criado = await cf(`/zones/${opts.zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: host, content: alvo, proxied: true }),
    });
    if (!criado.ok) {
      throw new Error(
        `Falha ao criar o DNS de ${host}: ` +
          (criado.errors.map((e) => e.message).join('; ') || 'erro desconhecido')
      );
    }
    dns = 'criado';
  } else if (atual.content !== alvo || !atual.proxied) {
    const upd = await cf(`/zones/${opts.zoneId}/dns_records/${atual.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ type: 'CNAME', name: host, content: alvo, proxied: true }),
    });
    if (!upd.ok) {
      throw new Error(
        `Falha ao atualizar o DNS de ${host} (apontava para ${atual.content}): ` +
          (upd.errors.map((e) => e.message).join('; ') || 'erro desconhecido')
      );
    }
    dns = 'atualizado';
  } else {
    dns = 'ja-correto';
  }

  // 2. Registrar como domínio do projeto Pages.
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!acct) throw new Error('CLOUDFLARE_ACCOUNT_ID ausente no ambiente.');

  const reg = await cf(`/accounts/${acct}/pages/projects/${opts.projeto}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: host }),
  });

  let dominioPages: SubdominioResult['dominioPages'] = 'registrado';
  if (!reg.ok) {
    const msg = reg.errors.map((e) => e.message).join('; ');
    // Republicar cai aqui: o domínio já pertence ao projeto. Não é erro.
    if (/already|exists|duplicate/i.test(msg)) dominioPages = 'ja-registrado';
    else throw new Error(`Falha ao registrar ${host} no projeto Pages: ${msg || 'erro desconhecido'}`);
  }

  return { url: `https://${host}`, host, dns, dominioPages };
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
