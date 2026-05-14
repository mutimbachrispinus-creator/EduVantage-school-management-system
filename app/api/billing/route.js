export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, kvGet } from '@/lib/db';

/**
 * GET /api/billing
 * Returns institutional subscription status and platform payment methods.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const tid = session.tenantId;

  try {
    // 1. Get Subscription Status
    const subRows = await query('SELECT plan, status, expires_at FROM subscriptions WHERE tenant_id = ?', [tid]);
    const subscription = subRows[0] || { plan: 'trial', status: 'active', expires_at: new Date(Date.now() + 86400000 * 30).toISOString() };

    // 2. Get Platform Config (for Payment Methods)
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const paymentMethods = gConf.platformPayments || [];
    const plans = gConf.plans || [];

    // Find details for current plan
    const currentPlanDetails = plans.find(p => p.id === subscription.plan) || { name: subscription.plan, price: 0, cycle: 'termly' };

    // 3. Get Student Count
    const countRes = await query('SELECT COUNT(*) as total FROM learners WHERE tenant_id = ?', [tid]);
    const studentCount = countRes[0]?.total || 0;

    return NextResponse.json({
      subscription: {
        ...subscription,
        details: currentPlanDetails
      },
      studentCount,
      platformPayments: paymentMethods,
      plans: plans.filter(p => p.id !== 'trial') // Don't show trial as an upgrade option
    });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
