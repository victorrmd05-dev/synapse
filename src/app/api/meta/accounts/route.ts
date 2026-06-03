import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    accounts: [
      {
        id: 'acc1',
        name: 'Minha Loja Drop',
        status: 'ACTIVE'
      }
    ]
  });
}
