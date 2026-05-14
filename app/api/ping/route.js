export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    message: 'ScholarSync API is responsive'
  });
}
