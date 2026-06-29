import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Trava de aprovação do orquestrador (Fernando). Aprovar NÃO executa nada no
// Meta ainda — apenas marca o plano como 'aprovado', liberando a rota de
// execução (/api/meta/optimize/execute) a criar a campanha em PAUSED.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId: string | undefined = body?.plan_id;
    const decisao: string | undefined = body?.decisao; // 'aprovar' | 'rejeitar'

    if (!planId || !decisao || !['aprovar', 'rejeitar'].includes(decisao)) {
      return NextResponse.json(
        { success: false, error: 'plan_id e decisao ("aprovar"|"rejeitar") são obrigatórios' },
        { status: 400 }
      );
    }

    const novoStatus = decisao === 'aprovar' ? 'aprovado' : 'rejeitado';

    const { data, error } = await supabaseServer
      .from('meta_optimization_plans')
      .update({
        status: novoStatus,
        aprovado_em: decisao === 'aprovar' ? new Date().toISOString() : null,
      })
      .eq('id', planId)
      .eq('status', 'pendente') // só transiciona a partir de pendente
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou já não está pendente' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, plano: data });
  } catch (err: any) {
    console.error('[api/meta/optimize/approve] erro:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Falha ao registrar decisão' }, { status: 500 });
  }
}
