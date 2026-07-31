// src/app/api/autopsia/publicar/route.ts
//
// Publica o dossiê como página única no Cloudflare Pages. Reusa o helper já
// validado do Designer (src/lib/cloudflare.ts) — o HTML vai por ARQUIVO,
// nunca por argumento de linha de comando; só o slug sanitizado entra no
// comando.

import { getTenantClient } from '@/lib/supabase-tenant';
import { deployHtmlToPages, slugify } from '@/lib/cloudflare';
import { montarHtml, type DadosDossie } from '@/lib/autopsia/dossie';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { autopsia_id } = await request.json();
    if (!autopsia_id) {
      return Response.json({ error: 'autopsia_id é obrigatório.' }, { status: 400 });
    }

    const supabase = getTenantClient();

    const { data: autopsia, error: errA } = await supabase
      .from('autopsias')
      .select('*')
      .eq('id', autopsia_id)
      .single();
    if (errA || !autopsia) {
      return Response.json({ error: 'Autópsia não encontrada.' }, { status: 404 });
    }
    if (!autopsia.dossie_json) {
      return Response.json({ error: 'Gere o dossiê antes de publicar.' }, { status: 400 });
    }

    const { data: criativos } = await supabase
      .from('autopsia_criativos')
      .select('*')
      .eq('autopsia_id', autopsia_id)
      .order('dias_no_ar', { ascending: false });

    const dados: DadosDossie = {
      page_name: autopsia.page_name,
      page_id: autopsia.page_id,
      total_anuncios: autopsia.total_anuncios,
      total_criativos: autopsia.total_criativos,
      criado_em: autopsia.criado_em,
      criativos: (criativos ?? []) as DadosDossie['criativos'],
      secoes: autopsia.dossie_json,
    };

    const html = montarHtml(dados);
    const base = slugify(autopsia.page_name ?? `page-${autopsia.page_id}`);
    const slug = `autopsia-${base}-${String(autopsia.id).slice(0, 6)}`;

    const resultado = await deployHtmlToPages({ slug, html });

    await supabase
      .from('autopsias')
      .update({ dossie_html_url: resultado.url })
      .eq('id', autopsia_id);

    return Response.json({ sucesso: true, url: resultado.url, slug: resultado.slug });
  } catch (err) {
    console.error('[api/autopsia/publicar] erro:', err);
    return Response.json(
      { error: 'Falha ao publicar o dossiê', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
