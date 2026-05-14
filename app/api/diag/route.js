export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const start = Date.now();
    const rows = await query('SELECT 1 as connected');
    const end = Date.now();
    
    return NextResponse.json({
      ok: true,
      connected: rows[0]?.connected === 1,
      latency: `${end - start}ms`,
      env: {
        has_url: !!process.env.TURSO_URL,
        has_token: !!process.env.TURSO_TOKEN,
        runtime: process.env.NEXT_RUNTIME,
      }
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      stack: err.stack,
      env: {
        has_url: !!process.env.TURSO_URL,
        has_token: !!process.env.TURSO_TOKEN,
        runtime: process.env.NEXT_RUNTIME,
      }
    }, { status: 500 });
  }
}
