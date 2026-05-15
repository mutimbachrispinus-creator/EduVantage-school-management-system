
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || 'https://paav-school-portal-mutimba.aws-ap-south-1.turso.io';
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!token) return NextResponse.json({ error: 'TURSO_AUTH_TOKEN not configured' }, { status: 500 });
  const client = createClient({ url, authToken: token });

  try {
    const tenantId = 'paav-gitombo';
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
