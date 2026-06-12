export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet, query, execute } from '@/lib/db';

/**
 * POST /api/mpesa/disburse
 *
 * Admin-triggered (or cron-triggered) disbursement of school fees
 * from the EduVantage shared shortcode to each school's own M-Pesa account.
 *
 * Flow:
 *  1. Authenticate — only super-admin or platform-master can trigger.
 *  2. Read `paav_settlement_queue` from the platform-master KV store.
 *  3. Group pending items by tenantId.
 *  4. For each school, look up their configured paybill shortcode.
 *  5. Fire Safaricom B2B transfer to the school's shortcode.
 *  6. Mark each item as disbursed / failed in the queue.
 *  7. Notify school admin by SMS (optional, best-effort).
 *
 * Body params:
 *   { tenantId?: string }  — if omitted, disburses ALL pending schools.
 */
export async function POST(request) {
  try {
    const session = await getSession();
    
    // Check for Vercel Cron authentication
    const authHeader = request.headers.get('authorization');
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin'))) {
      return NextResponse.json({ error: 'Unauthorised. Super-admin access or valid cron secret required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const filterTenant = body.tenantId || null; // optional — disburse one school only

    // 1. Load global platform config (Daraja gateway credentials)
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const gw = gConf?.mpesaGateway;
    if (!gw?.consumerKey || !gw?.shortcode) {
      return NextResponse.json({ error: 'EduVantage M-Pesa gateway not configured in platform settings.' }, { status: 400 });
    }

    // 2. Load settlement queue
    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    const pending = queue.filter(item =>
      item.status === 'pending' &&
      (!filterTenant || item.tenantId === filterTenant)
    );

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'No pending disbursements found.', disbursed: 0 });
    }

    // 3. Group by tenantId and sum amounts
    const byTenant = {};
    for (const item of pending) {
      if (!byTenant[item.tenantId]) {
        byTenant[item.tenantId] = { items: [], total: 0, settlementAccount: item.settlementAccount };
      }
      byTenant[item.tenantId].items.push(item);
      byTenant[item.tenantId].total += Number(item.amount || 0);
    }

    const results = [];
    const updatedQueue = [...queue];

    for (const [tenantId, group] of Object.entries(byTenant)) {
      if (group.total < 1) continue;

      // 4. Get school profile for name and paybill shortcode
      const schoolProfile = await kvGet('paav_school_profile', {}, tenantId).catch(() => ({}));
      const paybills = (await kvGet('paav_paybill_accounts', [], tenantId).catch(() => [])) || [];
      const primaryPaybill = paybills.find(p => p.type === 'M-Pesa') || paybills[0] || {};
      const destShortcode = primaryPaybill.shortcode || group.settlementAccount;

      if (!destShortcode || destShortcode === 'Primary') {
        // School has no shortcode configured — cannot disburse
        const reason = 'School has no M-Pesa shortcode configured for disbursement.';
        group.items.forEach(item => {
          const idx = updatedQueue.findIndex(q => q.ref === item.ref && q.tenantId === item.tenantId);
          if (idx >= 0) updatedQueue[idx] = { ...updatedQueue[idx], status: 'no_account', failReason: reason };
        });
        results.push({ tenantId, school: schoolProfile.name, status: 'skipped', reason });
        continue;
      }

      // 5. Fire Safaricom B2B transfer
      try {
        const b2bResult = await disburseMpesaB2B({
          amount: Math.floor(group.total),
          destShortcode,
          destType: primaryPaybill.type === 'Till' ? 'TillNumber' : 'PaybillAccount',
          remarks: `EduVantage Disbursement - ${schoolProfile.name || tenantId}`,
          consumerKey: gw.consumerKey,
          consumerSecret: gw.consumerSecret,
          initiatorName: gw.initiatorName || 'EduVantageAPI',
          securityCredential: gw.securityCredential || '',
          shortcode: gw.shortcode,
          env: gw.env || 'production',
        });

        if (b2bResult.success) {
          // 6. Mark all items for this tenant as processing_b2b (final confirmation comes via ResultURL)
          group.items.forEach(item => {
            const idx = updatedQueue.findIndex(q => q.ref === item.ref && q.tenantId === item.tenantId);
            if (idx >= 0) {
              updatedQueue[idx] = {
                ...updatedQueue[idx],
                status: 'processing_b2b',
                b2bRequestedAt: new Date().toISOString(),
                disbursementRef: b2bResult.conversationId,
                originConvId: b2bResult.originConvId,
                disbursedTo: destShortcode
              };
            }
          });

          results.push({
            tenantId,
            school: schoolProfile.name,
            amount: group.total,
            destShortcode,
            status: 'processing_b2b',
            ref: b2bResult.conversationId
          });

          // Note: SMS notification moved to ResultURL callback where we are 100% sure it succeeded.

        } else {
          group.items.forEach(item => {
            const idx = updatedQueue.findIndex(q => q.ref === item.ref && q.tenantId === item.tenantId);
            if (idx >= 0) updatedQueue[idx] = { ...updatedQueue[idx], status: 'failed', failReason: b2bResult.error };
          });
          results.push({ tenantId, school: schoolProfile.name, status: 'failed', error: b2bResult.error });
        }
      } catch (txErr) {
        group.items.forEach(item => {
          const idx = updatedQueue.findIndex(q => q.ref === item.ref && q.tenantId === item.tenantId);
          if (idx >= 0) updatedQueue[idx] = { ...updatedQueue[idx], status: 'failed', failReason: txErr.message };
        });
        results.push({ tenantId, status: 'error', error: txErr.message });
      }
    }

    // Persist updated queue
    await kvSet('paav_settlement_queue', updatedQueue, 'platform-master');

    // Log to audit
    await execute(
      `INSERT INTO audit_log (tenant_id, action, details, created_at) VALUES (?, ?, ?, ?)`,
      ['platform-master', 'DISBURSE', JSON.stringify(results), Math.floor(Date.now() / 1000)]
    ).catch(() => {});

    const initiated = results.filter(r => r.status === 'processing_b2b').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    return NextResponse.json({
      ok: true,
      initiated,
      failed,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
      message: `${initiated} school(s) initiated for disbursement. Confirmation arrives via Safaricom callback.`
    });

  } catch (e) {
    console.error('[Disburse] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/mpesa/disburse — view the current settlement queue status
 */
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 });
    }

    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    const pending = queue.filter(q => q.status === 'pending');
    const disbursed = queue.filter(q => q.status === 'disbursed');
    const failed = queue.filter(q => q.status === 'failed' || q.status === 'error');

    // Group pending by tenant with totals
    const summary = {};
    for (const item of pending) {
      if (!summary[item.tenantId]) summary[item.tenantId] = { count: 0, total: 0, tenantId: item.tenantId };
      summary[item.tenantId].count++;
      summary[item.tenantId].total += Number(item.amount || 0);
    }

    return NextResponse.json({
      ok: true,
      totals: { pending: pending.length, disbursed: disbursed.length, failed: failed.length },
      pendingBySchool: Object.values(summary),
      recentDisbursed: disbursed.slice(-20).reverse(),
      recentFailed: failed.slice(-10).reverse()
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ── Safaricom B2B helper ── */
async function disburseMpesaB2B({ amount, destShortcode, destType, remarks, consumerKey, consumerSecret, initiatorName, securityCredential, shortcode, env }) {
  const base = env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  // Get access token
  const authRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`) }
  });
  if (!authRes.ok) throw new Error('Failed to get M-Pesa access token');
  const { access_token } = await authRes.json();

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: 'BusinessToBusinessTransfer',
    Amount: amount,
    PartyA: shortcode,
    SenderIdentifierType: '4', // Shortcode
    PartyB: destShortcode,
    RecieverIdentifierType: destType === 'TillNumber' ? '2' : '4',
    Remarks: remarks.slice(0, 100),
    QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.eduvantage.co.ke'}/api/mpesa/disburse/timeout`,
    ResultURL: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.eduvantage.co.ke'}/api/mpesa/disburse/result`,
    AccountReference: 'EduVantageSettlement',
  };

  const b2bRes = await fetch(`${base}/mpesa/b2b/v1/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await b2bRes.json();
  if (data.ResponseCode === '0') {
    return { success: true, conversationId: data.ConversationID, originConvId: data.OriginatorConversationID };
  } else {
    return { success: false, error: data.ResponseDescription || data.errorMessage || 'B2B transfer failed' };
  }
}
