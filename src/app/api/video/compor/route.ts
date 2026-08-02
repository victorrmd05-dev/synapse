// src/app/api/video/compor/route.ts
//
// NAO GASTA NADA. A narracao ja foi paga pela /api/video/narracao antes de
// esta rota existir na jornada — e o banco garante isso com a check
// `compor_exige_narracao`. Por isso o job nasce 'pendente': comecar e gratis,
// e o retry do worker e livre.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, job_fonte_id, url_narracao, params_json } = body ?? {};

    if (!url_narracao || typeof url_narracao !== 'string') {
      return NextResponse.json(
        { error: 'url_narracao e obrigatoria — gere a voz antes de renderizar' },
        { status: 400 },
      );
    }
    if (!job_fonte_id) {
      return NextResponse.json({ error: 'job_fonte_id e obrigatorio' }, { status: 400 });
    }

    // O clipe de fundo tem que existir, estar pronto, e ter duracao conhecida:
    // sem `duracao_s` o Loop da composicao nao sabe onde reiniciar.
    const { data: fonte, error: erroFonte } = await supabaseServer
      .from('video_jobs')
      .select('id, status, url_saida, duracao_s')
      .eq('id', job_fonte_id)
      .maybeSingle();

    if (erroFonte) {
      return NextResponse.json(
        { error: 'falha ao ler o clipe de origem', detalhe: erroFonte.message },
        { status: 500 },
      );
    }
    if (!fonte || fonte.status !== 'concluido' || !fonte.url_saida) {
      return NextResponse.json(
        { error: 'o clipe de origem nao esta pronto' },
        { status: 400 },
      );
    }

    const params = {
      ...(params_json ?? {}),
      url_clipe: fonte.url_saida,
      duracao_clipe_s: fonte.duracao_s ?? 5,
    };

    const { data, error } = await supabaseServer
      .from('video_jobs')
      .insert({
        campanha_id: campanha_id || null,
        tipo: 'compor',
        status: 'pendente',
        job_fonte_id,
        url_narracao,
        params_json: params,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'falha ao criar o job de composicao', detalhe: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ job_id: data.id });
  } catch (err) {
    console.error('[video/compor] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao compor', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
