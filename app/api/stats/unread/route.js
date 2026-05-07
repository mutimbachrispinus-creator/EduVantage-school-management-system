export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const tenantId = session.tenantId || 'platform-master';

  try {
    const msgRows = await query(`
      SELECT COUNT(*) as count FROM messages 
      WHERE tenant_id = ? 
        AND msg_json NOT LIKE ?
    `, [tenantId, `%${session.username}%`]);
    return NextResponse.json({ ok: true, count: msgRows[0].count });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
