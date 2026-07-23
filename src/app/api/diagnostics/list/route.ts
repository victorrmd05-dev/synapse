import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Lista diagnósticos salvos no Supabase.
 * GET /api/diagnostics/list?campaignId=X&limit=20
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  try {
    let query = supabaseServer
      .from('meta_ai_diagnostics')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limit);

    if (campaignId) {
      query = query.eq('meta_campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, diagnostics: data || [] });
  } catch (error: any) {
    console.error('Falha ao listar diagnósticos:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}