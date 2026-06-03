import { NextResponse } from 'next/server';
import { callDiagnostic } from '@/lib/anthropic';

export async function POST(req: Request) {
  const { campaignName, metrics } = await req.json();
  
  try {
    const diagnostic = await callDiagnostic(campaignName, metrics);
    return NextResponse.json({ success: true, diagnostic });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha na IA' }, { status: 500 });
  }
}
