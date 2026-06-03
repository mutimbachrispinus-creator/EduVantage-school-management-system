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
    const redFlags = await query(`
      SELECT 
        SUBSTR(grade_date_adm, INSTR(grade_date_adm, '|') + 12) as adm,
        COUNT(*) as absent_count
      FROM attendance 
      WHERE tenant_id = ? 
        AND status = 'A'
        AND grade_date_adm LIKE '%|' || STRFTIME('%Y-%m', 'now') || '%'
      GROUP BY adm
      HAVING absent_count >= 3
      ORDER BY absent_count DESC
      LIMIT 12
    `, [tenantId]);

    let redFlagDetails = [];
    if (redFlags.length > 0) {
      const adms = redFlags.map(r => r.adm);
      const placeholders = adms.map(() => '?').join(',');
      const learnerNames = await query(`SELECT adm, name, phone FROM learners WHERE tenant_id = ? AND adm IN (${placeholders})`, [tenantId, ...adms]);
      redFlagDetails = redFlags.map(rf => {
        const l = learnerNames.find(n => n.adm === rf.adm);
        return { ...rf, name: l?.name || 'Unknown', phone: l?.phone || '' };
      });
    }

    return NextResponse.json({ ok: true, redFlags: redFlagDetails });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
