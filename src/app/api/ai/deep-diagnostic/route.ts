import { NextResponse } from 'next/server';
import { callDeepDiagnostic } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST { campaignName, analysis } → diagnóstico de media buyer sobre as quebras. */
export async function POST(req: Request) {
  try {
    const { campaignName, analysis } = await req.json();
    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'analysis é obrigatório.' },
        { status: 400 }
      );
    }
    const diagnostic = await callDeepDiagnostic(campaignName || 'Campanha', analysis);
    return NextResponse.json({ success: true, diagnostic });
  } catch (error: any) {
    console.error('Falha na IA profunda:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Falha na IA.' },
      { status: 500 }
    );
  }
}
