export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, execute } from '@/lib/db';

/**
 * GET /api/cron/settlement
 * Vercel Cron job — runs daily at 21:00 UTC (midnight EAT).
 * Triggers automated M-Pesa B2B disbursement for all pending schools.
 *
 * Auth: Must include Authorization: Bearer <CRON_SECRET>
 * Query: ?dry_run=1 to simulate without firing real B2B calls.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorised. Valid cron secret required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry_run') === '1';

    console.log(`[Cron Settlement] Starting automated daily settlement... (dry_run=${dryRun})`);

    // Load global platform config
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const gw = gConf?.mpesaGateway;

    if (!gw?.consumerKey || !gw?.shortcode) {
      return NextResponse.json({
        ok: false,
        error: 'M-Pesa gateway not configured. Visit Platform Settings.',
        dry_run: dryRun
      }, { status: 400 });
    }

    // Load settlement queue
    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    const pending = queue.filter(item => item.status === 'pending');

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'No pending disbursements.', initiated: 0, dry_run: dryRun });
    }

    if (dryRun) {
      // Simulate: group and return what WOULD be disbursed
      const byTenant = {};
      for (const item of pending) {
        if (!byTenant[item.tenantId]) byTenant[item.tenantId] = { items: [], total: 0 };
        byTenant[item.tenantId].items.push(item);
        byTenant[item.tenantId].total += Number(item.amount || 0);
      }
      return NextResponse.json({
        ok: true,
        dry_run: true,
        message: `DRY RUN: Would disburse to ${Object.keys(byTenant).length} school(s).`,
        preview: Object.entries(byTenant).map(([tenantId, g]) => ({
          tenantId,
          items: g.items.length,
          total: g.total
        }))
      });
    }

    // Call the existing POST handler by constructing a synthetic request
    const disburseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.eduvantage.co.ke'}/api/mpesa/disburse`;
    const res = await fetch(disburseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({}) // No tenantId filter — disburse all pending
    });

    const data = await res.json();
    console.log('[Cron Settlement] Completed:', data);

    return NextResponse.json({ ...data, dry_run: false, triggeredByVercelCron: true });

  } catch (error) {
    console.error('[Cron Settlement] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
