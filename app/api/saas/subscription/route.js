import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas/subscription?tenant=...
 * Returns subscription status for a specific school.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const db = await getClient();
    const res = await db.execute({
      sql: 'SELECT * FROM subscriptions WHERE tenant_id = ?',
      args: [tenantId]
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);

  } catch (err) {
    console.error('[Subscription API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
