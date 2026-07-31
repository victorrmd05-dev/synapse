// src/app/api/design/imagens/route.ts
//
// Imagens da landing page: upload e listagem.
//
// POR QUE ISSO EXISTE: o /api/deploy sobe UM único arquivo HTML para o Cloudflare,
// sem bundle de assets. Então toda imagem da LP precisa ser URL absoluta e pública.
// O bucket `criativos` do Supabase já é público — usamos ele.
//
// A PASTA É A FONTE DA VERDADE: `lp/<campanha_id>/<arquivo>`. Não existe tabela de
// imagens. O casamento com a copy é PELO NOME DO ARQUIVO — a copy traz
// `[IMAGEM 1 · hero.png — …]` e aqui existe `hero.png`. É por isso que o Fernando
// renomeia à mão depois de baixar do gerador.
//
// GET  ?campanha_id=... → lista o que já foi subido
// POST multipart (campanha_id + files[]) → sobe e devolve as URLs

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { BUCKET_CRIATIVOS, garantirBucket } from '@/lib/storage';
import { otimizarParaWeb, pastaWeb, radical } from '@/lib/design/imagensLp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPOS_POR_EXTENSAO: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};
const TIPOS_OK = Object.values(TIPOS_POR_EXTENSAO);
const TAMANHO_MAX = 8 * 1024 * 1024; // 8 MB por arquivo

function pasta(campanhaId: string) {
  return `lp/${campanhaId}`;
}

/** Só nome de arquivo — corta caminho e caractere que quebre URL. */
function nomeSeguro(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? 'imagem.png';
  return base.replace(/[^\w.\-]/g, '_').slice(0, 80);
}

/**
 * Content-type do arquivo, pela EXTENSÃO primeiro.
 *
 * O `File.type` vem do cliente e não é confiável: cliente não-browser manda
 * `application/octet-stream`, e o próprio navegador manda string vazia quando o
 * SO não conhece a extensão. Aqui a extensão é a fonte melhor — e é ela que já
 * governa o resto do fluxo, porque o casamento com a copy é pelo nome do arquivo.
 * O tipo declarado só entra como plano B.
 *
 * @returns o mime a gravar no Storage, ou null se não for imagem suportada.
 */
function tipoDaImagem(nome: string, tipoDeclarado: string): string | null {
  const ext = nome.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (ext && TIPOS_POR_EXTENSAO[ext]) return TIPOS_POR_EXTENSAO[ext];
  if (TIPOS_OK.includes(tipoDeclarado)) return tipoDeclarado;
  return null;
}

export async function GET(request: Request) {
  try {
    const campanhaId = new URL(request.url).searchParams.get('campanha_id');
    if (!campanhaId) {
      return Response.json({ error: 'campanha_id é obrigatório' }, { status: 400 });
    }

    const [originais, derivadas] = await Promise.all([
      supabase.storage
        .from(BUCKET_CRIATIVOS)
        .list(pasta(campanhaId), { limit: 100, sortBy: { column: 'name', order: 'asc' } }),
      supabase.storage.from(BUCKET_CRIATIVOS).list(pastaWeb(campanhaId), { limit: 100 }),
    ]);

    if (originais.error) {
      return Response.json(
        { error: 'Falha ao listar', detalhe: originais.error.message },
        { status: 500 }
      );
    }

    // Peso da derivada por radical — é o número que importa para o PageSpeed.
    const webPorRadical = new Map(
      (derivadas.data ?? [])
        .filter((f) => f.id)
        .map((f) => [radical(f.name), (f.metadata as { size?: number } | null)?.size ?? null])
    );

    const imagens = (originais.data ?? [])
      // `id` nulo = entrada de PASTA (a subpasta `web/`), não é arquivo.
      .filter((f) => f.id && f.name && !f.name.startsWith('.'))
      .map((f) => ({
        nome: f.name,
        url: supabase.storage
          .from(BUCKET_CRIATIVOS)
          .getPublicUrl(`${pasta(campanhaId)}/${f.name}`).data.publicUrl,
        tamanho: (f.metadata as { size?: number } | null)?.size ?? null,
        webp_tamanho: webPorRadical.get(radical(f.name)) ?? null,
      }));

    return Response.json({ imagens });
  } catch (err) {
    console.error('[api/design/imagens GET] erro:', err);
    return Response.json({ error: 'Falha ao listar imagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const campanhaId = String(form.get('campanha_id') ?? '');
    if (!campanhaId) {
      return Response.json({ error: 'campanha_id é obrigatório' }, { status: 400 });
    }

    const arquivos = form.getAll('files').filter((f): f is File => f instanceof File);
    if (arquivos.length === 0) {
      return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    await garantirBucket(BUCKET_CRIATIVOS);

    const enviadas: {
      nome: string;
      url: string;
      bytes: number;
      webp_bytes: number | null;
    }[] = [];
    const falhas: { nome: string; motivo: string }[] = [];

    for (const arquivo of arquivos) {
      const nome = nomeSeguro(arquivo.name);

      const contentType = tipoDaImagem(nome, arquivo.type);
      if (!contentType) {
        falhas.push({
          nome,
          motivo: `não é imagem suportada (use .png, .jpg, .webp ou .avif)`,
        });
        continue;
      }
      if (arquivo.size > TAMANHO_MAX) {
        falhas.push({ nome, motivo: `passa de 8 MB (${(arquivo.size / 1e6).toFixed(1)} MB)` });
        continue;
      }

      const caminho = `${pasta(campanhaId)}/${nome}`;
      const buffer = Buffer.from(await arquivo.arrayBuffer());

      // upsert: subir de novo o mesmo nome SUBSTITUI. É o comportamento que o
      // Fernando espera ao corrigir uma imagem — não vira hero(1).png.
      const { error } = await supabase.storage
        .from(BUCKET_CRIATIVOS)
        .upload(caminho, buffer, { contentType, upsert: true });

      if (error) {
        falhas.push({ nome, motivo: error.message });
        continue;
      }

      // Derivada WebP: é ELA que entra na página. O gerador devolve PNG de 2+MB
      // a ~1500px, o que derruba o PageSpeed mobile sozinho. Best-effort — se a
      // conversão falhar, a página cai no original e só fica pesada; perder o
      // upload inteiro por causa disso seria pior.
      let webp: { nome: string; bytes: number } | null = null;
      try {
        const otimizada = await otimizarParaWeb(buffer);
        const nomeWebp = `${radical(nome)}.webp`;
        const { error: erroWebp } = await supabase.storage
          .from(BUCKET_CRIATIVOS)
          .upload(`${pastaWeb(campanhaId)}/${nomeWebp}`, otimizada.buffer, {
            contentType: 'image/webp',
            upsert: true,
          });
        if (erroWebp) throw new Error(erroWebp.message);
        webp = { nome: nomeWebp, bytes: otimizada.buffer.length };
      } catch (err) {
        console.warn(
          `[api/design/imagens] webp falhou para ${nome}:`,
          (err as Error)?.message
        );
      }

      enviadas.push({
        nome,
        url: supabase.storage.from(BUCKET_CRIATIVOS).getPublicUrl(caminho).data.publicUrl,
        bytes: arquivo.size,
        webp_bytes: webp?.bytes ?? null,
      });
    }

    return Response.json({ enviadas, falhas }, { status: falhas.length && !enviadas.length ? 502 : 200 });
  } catch (err) {
    console.error('[api/design/imagens POST] erro:', err);
    return Response.json(
      { error: 'Falha ao subir imagens', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
