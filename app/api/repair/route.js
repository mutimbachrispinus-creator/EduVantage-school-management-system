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

  const { searchParams } = new URL(request.url);
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
  const token = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'Turso database credentials are not configured' }, { status: 500 });
  const client = createClient({ url, authToken: token });

  try {
    const tenantId = searchParams.get('tenantId') || 'paav-gitombo';
    
    // 1. Check counts
    const learnersCount = await client.execute({ sql: "SELECT COUNT(*) as c FROM learners WHERE tenant_id = ?", args: [tenantId] });
    const marksCount = await client.execute({ sql: "SELECT COUNT(*) as c FROM marks WHERE tenant_id = ?", args: [tenantId] });
    
    // 2. Perform Recovery (Logic from recoverOrphanedData)
    // Find marks that don't have a learner
    const orphanedMarks = await client.execute({
      sql: "SELECT DISTINCT adm FROM marks WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)",
      args: [tenantId, tenantId]
    });

    // 3. Try to find these learners in deleted_learners
    const deleted = await client.execute({
      sql: "SELECT * FROM deleted_learners WHERE tenant_id = ?",
      args: [tenantId]
    });

    let restored = 0;
    if (deleted.rows.length > 0) {
      const stmts = [];
      for (const l of deleted.rows) {
        stmts.push({
          sql: `INSERT OR IGNORE INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar]
        });
      }
      await client.batch(stmts, 'write');
      restored = deleted.rows.length;
    }

    // 4. Sync KV
    const allLearners = await client.execute({ sql: "SELECT * FROM learners WHERE tenant_id = ?", args: [tenantId] });
    await client.execute({
      sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      args: ['paav6_learners', tenantId, JSON.stringify(allLearners.rows)]
    });

    return NextResponse.json({
      ok: true,
      initial: { learners: learnersCount.rows[0].c, marks: marksCount.rows[0].c, orphaned: orphanedMarks.rows.length },
      restored,
      finalLearners: allLearners.rows.length
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
