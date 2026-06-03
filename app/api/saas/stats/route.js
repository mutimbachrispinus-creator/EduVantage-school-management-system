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
    
    // 1. Fetch all schools from subscriptions (excluding the platform owner)
    const schoolsRes = await db.execute("SELECT * FROM subscriptions WHERE tenant_id != 'platform-master' ORDER BY updated_at DESC");
    const schools = schoolsRes.rows;

    const schoolStats = await Promise.all(schools.map(async (s) => {
      // Get student count for this tenant
      const learnerCount = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM learners WHERE tenant_id = ?',
        args: [s.tenant_id]
      });
      
      // Get school name from KV (paav_school_profile)
      const profileRes = await db.execute({
        sql: "SELECT value FROM kv WHERE key = 'paav_school_profile' AND tenant_id = ?",
        args: [s.tenant_id]
      });
      
      let name = s.tenant_id;
      let curriculum = 'CBC';
      try {
        if (profileRes.rows.length) {
          const profile = JSON.parse(profileRes.rows[0].value);
          name = profile.name || s.tenant_id;
          curriculum = profile.curriculum || 'CBC';
        }
      } catch (e) {}

      // Actualised Revenue logic: Sum up successful paylog entries and double-entry finance ledgers
      let totalRevenue = 0;
      try {
        const revenueRes = await db.execute({
          sql: "SELECT SUM(amount) as total FROM paylog WHERE tenant_id = ? AND status = 'approved'",
          args: [s.tenant_id]
        });
        totalRevenue += Number(revenueRes.rows[0]?.total || 0);

        // Also aggregate directly from the KV finance ledger
        const ledgerRes = await db.execute({
          sql: "SELECT value FROM kv WHERE key = 'paav_finance_ledger' AND tenant_id = ?",
          args: [s.tenant_id]
        });
        if (ledgerRes.rows.length > 0) {
          const ledger = JSON.parse(ledgerRes.rows[0].value);
          const ledgerTotal = ledger
            .filter(entry => entry.creditAcc === '4001-FEES')
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
          totalRevenue += ledgerTotal;
        }
      } catch (e) {
        console.error('[SAAS Stats] Failed to parse revenue for tenant:', s.tenant_id, e);
      }

      // Get unique students in marks table for pattern analysis (anti-fraud)
      const activityRes = await db.execute({
        sql: 'SELECT COUNT(DISTINCT adm) as count FROM marks WHERE tenant_id = ?',
        args: [s.tenant_id]
      });

      const studentsCount = Number(learnerCount.rows[0]?.count || 0);
      const activityCount = Number(activityRes.rows[0]?.count || 0);
      const planAmount = s.amount || 0;
      const billingModel = s.billing_model || 'flat';
      const expectedPay = billingModel === 'per-learner' ? Math.max(studentsCount, activityCount) * planAmount : planAmount;

      return {
        id: s.tenant_id,
        name: name,
        plan: s.plan,
        curriculum: curriculum,
        status: s.status,
        amount: planAmount,
        billingModel: billingModel,
        expectedPay: expectedPay,
        cycle: s.cycle || 'annual',
        expiresAt: s.expires_at,
        students: studentsCount,
        activityCount: activityCount,
        learnerLimit: Number(s.learner_limit || 0), // 0 means unlimited
        revenue: totalRevenue,
        lastSync: s.updated_at ? new Date(s.updated_at * 1000).toLocaleString() : 'Never'
      };
    }));

    return NextResponse.json({
      totalSchools: schools.length,
      activeSchools: schools.filter(s => s.status === 'active').length,
      totalRevenue: schoolStats.reduce((acc, s) => acc + s.revenue, 0),
      schools: schoolStats
    });

  } catch (err) {
    console.error('[api/saas/stats] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
