import { NextResponse } from 'next/server';
import { diagnosticScan } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorized. Super-Admin access required.' }, { status: 403 });
    }

    const report = await diagnosticScan();
    return NextResponse.json({ ok: true, report });

  } catch (err) {
    console.error('[api/saas/diagnostics] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
