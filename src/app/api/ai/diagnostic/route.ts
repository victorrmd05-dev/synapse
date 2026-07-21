import { NextResponse } from 'next/server';
import { callDiagnostic } from '@/lib/anthropic';

export async function POST(req: Request) {
  const { campaignName, metrics } = await req.json();
  
  try {
    const diagnostic = await callDiagnostic(campaignName, metrics);
    return NextResponse.json({ success: true, diagnostic });
  } catch (error: any) {
    console.error('Falha no diagnóstico IA:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Falha na IA' },
      { status: 500 }
    );
  }
}
