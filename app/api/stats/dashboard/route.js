export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getAnnualFee, PRE, LOWER, UPPER, JSS, SENIOR } from '@/lib/school-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const tenantId = session.tenantId || 'platform-master';

  try {
    // 1. Basic counts
    const countRows = await query('SELECT COUNT(*) as count FROM learners WHERE tenant_id = ?', [tenantId]);
    const totalLearners = countRows[0].count;

    // 2. Financial summary
    const finRows = await query('SELECT SUM(t1 + t2 + t3) as totalPaid FROM learners WHERE tenant_id = ?', [tenantId]);
    const totalPaid = finRows[0].totalPaid || 0;

    // 2.5 Fetch Learner Limit
    const subRows = await query('SELECT learner_limit FROM subscriptions WHERE tenant_id = ?', [tenantId]);
    const learnerLimit = Number(subRows[0]?.learner_limit || 50);

    // 3. Enrolment by grade
    const gradeRows = await query('SELECT grade, COUNT(*) as count FROM learners WHERE tenant_id = ? GROUP BY grade', [tenantId]);
    const enrolmentByGrade = {};
    gradeRows.forEach(r => { enrolmentByGrade[r.grade] = r.count; });

    // 4. Calculate total expected
    let totalExpected = 0;
    gradeRows.forEach(r => {
      totalExpected += r.count * getAnnualFee(r.grade);
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalLearners,
        learnerLimit,
        totalPaid,
        totalExpected,
        enrolmentByGrade,
        collectionPct: totalExpected ? Math.round((totalPaid / totalExpected) * 100) : 0
      }
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
