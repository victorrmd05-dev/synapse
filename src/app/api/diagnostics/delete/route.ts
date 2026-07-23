import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Exclui um diagnóstico salvo do histórico (tabela meta_ai_diagnostics).
 * POST { id: string }
 * Só apaga o registro do banco — os arquivos .md em analises-ia/ ficam
 * intactos (são deletados manualmente na pasta, se quiser).
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const { id } = body || {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'id é obrigatório.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer.from('meta_ai_diagnostics').delete().eq('id', String(id));
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Falha ao excluir diagnóstico:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
