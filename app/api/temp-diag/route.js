export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export async function GET(request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
  const token = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'Turso database credentials are not configured' }, { status: 500 });
  const client = createClient({ url, authToken: token });

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'paav-gitombo';
    const learners = await client.execute({ sql: "SELECT COUNT(*) as c FROM learners WHERE tenant_id = ?", args: [tenantId] });
    const marks = await client.execute({ sql: "SELECT COUNT(*) as c FROM marks WHERE tenant_id = ?", args: [tenantId] });
    const paylog = await client.execute({ sql: "SELECT COUNT(*) as c FROM paylog WHERE tenant_id = ?", args: [tenantId] });
    const deleted = await client.execute({ sql: "SELECT COUNT(*) as c FROM deleted_learners WHERE tenant_id = ?", args: [tenantId] });
    const kv = await client.execute({ sql: "SELECT key, length(value) as len FROM kv WHERE tenant_id = ?", args: [tenantId] });

    return NextResponse.json({
      ok: true,
      counts: {
        learners: learners.rows[0].c,
        marks: marks.rows[0].c,
        paylog: paylog.rows[0].c,
        deleted_learners: deleted.rows[0].c
      },
      kv_keys: kv.rows
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
