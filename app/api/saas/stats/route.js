export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas/stats
 * Returns global platform metrics for Super Admins.
 */
export async function GET() {
  try {
    const session = await getSession();
    // Only allow platform-master tenant admins or a specific super-admin role
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorized. Super-Admin access required.' }, { status: 403 });
    }

    const db = await getClient();
    
    // 1. Fetch all schools — union across subscriptions, staff AND learners tables
    //    so schools that exist but never bought a plan still show up.
    const statsQuery = await db.execute(`
      SELECT 
        t.tenant_id as id,
        COALESCE(sub.plan, 'trial') as plan,
        COALESCE(sub.status, 'active') as status,
        COALESCE(sub.amount, 0) as amount,
        COALESCE(sub.billing_model, 'flat') as billingModel,
        COALESCE(sub.cycle, 'termly') as cycle,
        sub.expires_at as expiresAt,
        COALESCE(sub.learner_limit, 0) as learnerLimit,
        sub.updated_at as updatedAt,
        (SELECT COUNT(*) FROM learners l WHERE l.tenant_id = t.tenant_id) as students,
        (SELECT COUNT(DISTINCT adm) FROM marks m WHERE m.tenant_id = t.tenant_id) as activityCount,
        (SELECT SUM(amount) FROM paylog p WHERE p.tenant_id = t.tenant_id) as paylogRevenue,
        (SELECT value FROM kv k WHERE k.key = 'paav_school_profile' AND k.tenant_id = t.tenant_id) as profileJson,
        (SELECT value FROM kv k WHERE k.key = 'paav_finance_ledger' AND k.tenant_id = t.tenant_id) as ledgerJson
      FROM (
        SELECT DISTINCT tenant_id FROM subscriptions WHERE tenant_id != 'platform-master'
        UNION
        SELECT DISTINCT tenant_id FROM staff WHERE tenant_id != 'platform-master'
        UNION
        SELECT DISTINCT tenant_id FROM learners WHERE tenant_id != 'platform-master'
      ) t
      LEFT JOIN subscriptions sub ON t.tenant_id = sub.tenant_id
    `);

    const schools = statsQuery.rows;

    const schoolStats = schools.map((s) => {
      let name = s.id;
      let curriculum = 'CBC';
      
      try {
        if (s.profileJson) {
          const profile = JSON.parse(s.profileJson);
          name = profile.name || s.id;
          curriculum = profile.curriculum || 'CBC';
        }
      } catch (e) {}

      let totalRevenue = Number(s.paylogRevenue || 0);
      try {
        if (s.ledgerJson) {
          const ledger = JSON.parse(s.ledgerJson);
          const ledgerTotal = ledger
            .filter(entry => entry.creditAcc === '4001-FEES')
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
          totalRevenue += ledgerTotal;
        }
      } catch (e) {}

      const studentsCount = Number(s.students || 0);
      const activityCount = Number(s.activityCount || 0);
      const planAmount = s.amount || 0;
      const billingModel = s.billingModel || 'flat';
      const expectedPay = billingModel === 'per-learner' ? Math.max(studentsCount, activityCount) * planAmount : planAmount;

      return {
        id: s.id,
        name: name,
        plan: s.plan,
        curriculum: curriculum,
        status: s.status,
        amount: planAmount,
        billingModel: billingModel,
        expectedPay: expectedPay,
        cycle: s.cycle,
        expiresAt: s.expiresAt,
        students: studentsCount,
        activityCount: activityCount,
        learnerLimit: Number(s.learnerLimit || 0),
        revenue: totalRevenue,
        lastSync: s.updatedAt ? new Date(s.updatedAt * 1000).toLocaleString() : 'Never'
      };
    });

    return NextResponse.json({
      totalSchools: schools.length,
      activeSchools: schoolStats.filter(s => !['expired', 'suspended', 'cancelled'].includes(s.status)).length,
      totalRevenue: schoolStats.reduce((acc, s) => acc + s.revenue, 0),
      schools: schoolStats
    });

  } catch (err) {
    console.error('[api/saas/stats] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
