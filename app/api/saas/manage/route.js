import { NextResponse } from 'next/server';
import { execute, batch, getClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/saas/manage
 * Actions: delete_school, update_billing
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorized. Super-Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, tenantId, amount, cycle, billingModel, plan, status, expiresAt, paybills, learnerLimit } = body;

    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    if (tenantId === 'platform-master') return NextResponse.json({ error: 'Cannot manage platform-master' }, { status: 400 });

    if (action === 'delete_school') {
      const tables = ['kv', 'learners', 'staff', 'paylog', 'marks', 'attendance', 'messages', 'staff_requests', 'presence', 'duties', 'subscriptions'];
      const stmts = tables.map(t => ({
        sql: `DELETE FROM ${t} WHERE ${t === 'subscriptions' ? 'tenant_id' : 'tenant_id'} = ?`,
        args: [tenantId]
      }));
      
      // For subscriptions the primary key is tenant_id, others have it as a column
      await batch(stmts);
      return NextResponse.json({ ok: true, msg: `School ${tenantId} and all associated data deleted.` });
    }

    if (action === 'update_billing') {
      const { curriculum } = body;

      // Audit fix: normalise expires_at to full ISO-8601 regardless of what the caller sends
      // Accepts: ISO string, bare date string ('2027-05-01'), or UNIX timestamp integer
      let normalizedExpiry = null;
      if (expiresAt) {
        const parsed = new Date(typeof expiresAt === 'number' ? expiresAt * 1000 : expiresAt);
        normalizedExpiry = isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }

      const sqlSub = `
        INSERT INTO subscriptions (tenant_id, plan, status, amount, billing_model, cycle, expires_at, learner_limit, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          plan = excluded.plan,
          status = excluded.status,
          amount = excluded.amount,
          billing_model = excluded.billing_model,
          cycle = excluded.cycle,
          expires_at = excluded.expires_at,
          learner_limit = excluded.learner_limit,
          updated_at = excluded.updated_at
      `;
      await execute(sqlSub, [
        tenantId, 
        plan || 'basic', 
        status || 'active', 
        Number(amount || 0), 
        billingModel || 'flat',
        cycle || 'annual', 
        normalizedExpiry,
        Number(learnerLimit || 0)
      ]);

      if (curriculum) {
        // Also update the curriculum in the school profile KV
        const client = await getClient();
        const res = await client.execute({ sql: `SELECT value FROM kv WHERE tenant_id = ? AND key = 'paav_school_profile'`, args: [tenantId] });
        let profile = res.rows[0]?.value ? JSON.parse(res.rows[0].value) : {};
        profile.curriculum = curriculum;
        
        await execute(`
          INSERT INTO kv (tenant_id, key, value, updated_at) VALUES (?, 'paav_school_profile', ?, strftime('%s','now'))
          ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `, [tenantId, JSON.stringify(profile)]);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'get_paybills') {
      const client = await getClient();
      const res = await client.execute({ sql: `SELECT value FROM kv WHERE tenant_id = ? AND key = 'paav_paybill_accounts'`, args: [tenantId] });
      const val = res.rows[0]?.value;
      const paybills = val ? JSON.parse(val) : [];
      return NextResponse.json({ ok: true, paybills });
    }

    if (action === 'set_paybills') {
      await execute(`
        INSERT INTO kv (tenant_id, key, value, updated_at) VALUES (?, 'paav_paybill_accounts', ?, strftime('%s','now'))
        ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `, [tenantId, JSON.stringify(paybills || [])]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'recover_orphans') {
      const { recoverOrphanedData } = await import('@/lib/db');
      const recovered = await recoverOrphanedData(tenantId);
      return NextResponse.json({ ok: true, recovered });
    }

    if (action === 'sync_nexed') {
      const { syncLearnersToNexed } = await import('@/lib/db');
      const synced = await syncLearnersToNexed(tenantId);
      return NextResponse.json({ ok: true, synced });
    }

    if (action === 'sync_learner_kv') {
      const { syncLearnerKV } = await import('@/lib/db');
      const synced = await syncLearnerKV(tenantId);
      return NextResponse.json({ ok: true, synced });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('[api/saas/manage] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
