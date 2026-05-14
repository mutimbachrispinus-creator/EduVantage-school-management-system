
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export async function GET() {
  const url = 'https://paav-school-portal-mutimba.aws-ap-south-1.turso.io';
  const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgyNjIwMDIsImlkIjoiMDE5ZGM2NWYtODkwMS03MjA1LWIyYzEtOWQ1ODE2NDczMWU1IiwicmlkIjoiMWFmMzc1N2MtZjNlOS00YzI5LThlMjYtNTg3ODViNzJkMGNiIn0.mq7xtXfkF_DnT9fXb0o7axIxGoK2Vo-nP5VsvuoDsrvk0xjkXro9wOiCoBsaAh-EDIPBQ5-5shu4If-dnzagAQ';
  const client = createClient({ url, authToken: token });

  try {
    const tenantId = 'paav-gitombo';
    
    // 1. Check if learners exist in deleted_learners
    const deleted = await client.execute({
      sql: "SELECT * FROM deleted_learners WHERE tenant_id = ?",
      args: [tenantId]
    });

    if (deleted.rows.length > 0) {
      // Restore from deleted_learners
      const stmts = [];
      for (const l of deleted.rows) {
        stmts.push({
          sql: `INSERT INTO learners (
                  adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies, medicalCondition, emergencyContact
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(adm, tenant_id) DO UPDATE SET 
                  name=excluded.name, grade=excluded.grade, sex=excluded.sex, age=excluded.age, dob=excluded.dob,
                  stream=excluded.stream, teacher=excluded.teacher, parent=excluded.parent, phone=excluded.phone,
                  parentEmail=excluded.parentEmail, addr=excluded.addr, t1=excluded.t1, t2=excluded.t2, t3=excluded.t3,
                  arrears=excluded.arrears, avatar=excluded.avatar`,
          args: [
            l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar, l.bloodGroup, l.allergies, l.medicalCondition, l.emergencyContact
          ]
        });
        stmts.push({
          sql: "DELETE FROM deleted_learners WHERE adm = ? AND tenant_id = ?",
          args: [l.adm, tenantId]
        });
      }
      await client.batch(stmts, 'write');
      return NextResponse.json({ ok: true, message: `Restored ${deleted.rows.length} learners from deleted_learners.` });
    }

    // 2. If not in deleted_learners, check if they are orphaned (marks exist but learners don't)
    // Actually, the user says "restore before the last CSV upload". 
    // If the last CSV upload REPLACED them (different ADMs but same kids?), we need a backup.
    
    // But since I can't see the local.db, I'll try to find any other place.
    
    return NextResponse.json({ ok: false, message: "No learners found in deleted_learners. Please check local.db logs." });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
