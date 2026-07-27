// src/app/api/autopsia/criar/route.ts
//
// Cria uma autópsia e ENFILEIRA o trabalho. Não baixa nem transcreve nada:
// transcrição leva minutos por vídeo e não cabe em rota de API (o teto de
// maxDuration é 300s). Quem processa é scripts/worker-autopsia.py.
//
// Body: { page_id } | { url } (da Ad Library) | { ad_minerado_id }
//
// Só o job de `download` entra na fila aqui. `frames` e `transcrever` são
// enfileirados pelo worker quando o download conclui — dependem do arquivo
// existir.

import { getTenantClient } from '@/lib/supabase-tenant';
import { coletarAnunciante, parsePageId } from '@/lib/autopsia/coleta';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getTenantClient();

    // 1. Descobrir o page_id
    let pageId: string | null = null;
    if (body.ad_minerado_id) {
      const { data, error } = await supabase
        .from('ads_minerados')
        .select('page_id')
        .eq('id', body.ad_minerado_id)
        .single();
      if (error || !data?.page_id) {
        return Response.json({ error: 'Anúncio não encontrado ou sem page_id.' }, { status: 404 });
      }
      pageId = String(data.page_id);
    } else {
      pageId = parsePageId(body.page_id ?? body.url ?? '');
    }
    if (!pageId) {
      return Response.json(
        { error: 'Informe page_id, url da Biblioteca de Anúncios ou ad_minerado_id.' },
        { status: 400 }
      );
    }

    // 2. Coletar
    const coleta = await coletarAnunciante(pageId);
    if (coleta.criativos.length === 0) {
      return Response.json(
        { error: 'Nenhum criativo encontrado para esse anunciante.', page_id: pageId },
        { status: 404 }
      );
    }

    // 3. Gravar a autópsia
    const { data: autopsia, error: errAutopsia } = await supabase
      .from('autopsias')
      .insert({
        page_id: coleta.page_id,
        page_name: coleta.page_name,
        page_profile_pic_url: coleta.page_profile_pic_url,
        status: 'processando',
        total_anuncios: coleta.total_anuncios,
        total_criativos: coleta.criativos.length,
        progresso: 0,
      })
      .select('id')
      .single();
    if (errAutopsia || !autopsia) {
      return Response.json(
        { error: 'Falha ao criar a autópsia', detalhe: errAutopsia?.message },
        { status: 500 }
      );
    }

    // 4. Gravar os criativos
    const { data: criativos, error: errCriativos } = await supabase
      .from('autopsia_criativos')
      .insert(
        coleta.criativos.map((c) => ({
          autopsia_id: autopsia.id,
          ad_archive_id: c.ad_archive_id,
          creative_key: c.creative_key,
          tipo: c.tipo,
          duracao_s: c.duracao_s,
          dias_no_ar: c.dias_no_ar,
          is_active: c.is_active,
          ad_copy: c.ad_copy,
          ad_title: c.ad_title,
          cta_text: c.cta_text,
          link_url: c.link_url,
          url_origem: c.url_origem,
          raw_json: c.raw_json,
        }))
      )
      .select('id');
    if (errCriativos || !criativos) {
      await supabase.from('autopsias').delete().eq('id', autopsia.id);
      return Response.json(
        { error: 'Falha ao gravar os criativos', detalhe: errCriativos?.message },
        { status: 500 }
      );
    }

    // 5. Enfileirar um download por criativo
    const { error: errJobs } = await supabase.from('autopsia_jobs').insert(
      criativos.map((c) => ({
        autopsia_id: autopsia.id,
        criativo_id: c.id,
        tipo: 'download',
        status: 'pendente',
      }))
    );
    if (errJobs) {
      return Response.json(
        { error: 'Autópsia criada, mas a fila falhou', detalhe: errJobs.message, autopsia_id: autopsia.id },
        { status: 500 }
      );
    }

    return Response.json({
      sucesso: true,
      autopsia_id: autopsia.id,
      page_id: coleta.page_id,
      page_name: coleta.page_name,
      total_anuncios: coleta.total_anuncios,
      total_criativos: coleta.criativos.length,
      paginas_lidas: coleta.paginas_lidas,
      creditos_gastos: coleta.creditos_gastos,
    });
  } catch (err) {
    console.error('[api/autopsia/criar] erro:', err);
    return Response.json(
      { error: 'Falha ao criar a autópsia', detalhe: (err as Error)?.message },
      { status: 500 }
    );
  }
}
