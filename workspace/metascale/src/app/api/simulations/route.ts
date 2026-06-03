import { NextResponse } from 'next/server';

export async function POST() {
  // Save to supabase scale_simulations
  
  return NextResponse.json({ success: true, id: 'sim_123' });
}
