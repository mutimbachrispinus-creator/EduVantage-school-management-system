export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { recoverOrphanedData } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'platform-master';
    const { countOrphanedData } = await import('@/lib/db');
    const count = await countOrphanedData(tenantId);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    const count = await recoverOrphanedData(tenantId || 'platform-master');
    return NextResponse.json({ ok: true, recovered: count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
