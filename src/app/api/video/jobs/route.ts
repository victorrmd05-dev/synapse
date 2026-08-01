// src/app/api/video/jobs/route.ts
// Leitura pura. Nao cobra nada.

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campanhaId = searchParams.get('campanha_id');

  let q = supabaseServer
    .from('video_jobs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50);

  if (campanhaId) q = q.eq('campanha_id', campanhaId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}
