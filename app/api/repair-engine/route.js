
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get('confirm') === 'true';
  const tenantId = 'paav-gitombo';

  const url = 'https://paav-school-portal-mutimba.aws-ap-south-1.turso.io';
  const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgyNjIwMDIsImlkIjoiMDE5ZGM2NWYtODkwMS03MjA1LWIyYzEtOWQ1ODE2NDczMWU1IiwicmlkIjoiMWFmMzc1N2MtZjNlOS00YzI5LThlMjYtNTg3ODViNzJkMGNiIn0.mq7xtXfkF_DnT9fXb0o7axIxGoK2Vo-nP5VsvuoDsrvk0xjkXro9wOiCoBsaAh-EDIPBQ5-5shu4If-dnzagAQ';
  const client = createClient({ url, authToken: token });

  try {
    // 1. Identify orphaned ADMs from marks and paylog
    const orphansRes = await client.execute({
      sql: `
        SELECT DISTINCT adm FROM (
          SELECT adm FROM marks WHERE tenant_id = ?
          UNION
          SELECT adm FROM paylog WHERE tenant_id = ?
        ) WHERE adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
      `,
      args: [tenantId, tenantId, tenantId]
    });
    
    const orphanAdms = orphansRes.rows.map(r => r.adm);
    
    if (orphanAdms.length === 0) {
      return NextResponse.json({ ok: true, message: 'No orphaned learners found.' });
    }

    if (!confirm) {
      return NextResponse.json({ 
        ok: true, 
        message: `Found ${orphanAdms.length} orphaned ADMs. Pass ?confirm=true to restore.`,
        orphans: orphanAdms 
      });
    }

    let restoredFromDeleted = 0;
    let reconstructedFromPaylog = 0;
    const restoredAdms = new Set();

    // 2. Try restoring from deleted_learners
    const deletedRes = await client.execute({
      sql: `SELECT * FROM deleted_learners WHERE tenant_id = ? AND adm IN (${orphanAdms.map(() => '?').join(',')})`,
      args: [tenantId, ...orphanAdms]
    });

    if (deletedRes.rows.length > 0) {
      const stmts = deletedRes.rows.map(l => ({
        sql: `INSERT OR IGNORE INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar]
      }));
      await client.batch(stmts, 'write');
      restoredFromDeleted = deletedRes.rows.length;
      deletedRes.rows.forEach(r => restoredAdms.add(r.adm));
    }

    // 3. Reconstruct remaining from paylog
    const remainingAdms = orphanAdms.filter(adm => !restoredAdms.has(adm));
    if (remainingAdms.length > 0) {
      const paylogRes = await client.execute({
        sql: `
          SELECT adm, name, grade FROM paylog 
          WHERE tenant_id = ? AND adm IN (${remainingAdms.map(() => '?').join(',')})
          GROUP BY adm ORDER BY date DESC
        `,
        args: [tenantId, ...remainingAdms]
      });

      if (paylogRes.rows.length > 0) {
        const stmts = paylogRes.rows.map(p => ({
          sql: `INSERT OR IGNORE INTO learners (adm, tenant_id, name, grade) VALUES (?, ?, ?, ?)`,
          args: [p.adm, tenantId, p.name, p.grade]
        }));
        await client.batch(stmts, 'write');
        reconstructedFromPaylog = paylogRes.rows.length;
      }
    }

    // 4. Final Sync to KV
    const allLearners = await client.execute({ 
      sql: "SELECT * FROM learners WHERE tenant_id = ?", 
      args: [tenantId] 
    });
    
    await client.execute({
      sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      args: ['paav6_learners', tenantId, JSON.stringify(allLearners.rows)]
    });

    return NextResponse.json({
      ok: true,
      summary: {
        totalOrphansFound: orphanAdms.length,
        restoredFromDeleted,
        reconstructedFromPaylog,
        totalLearnersNow: allLearners.rows.length
      }
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
