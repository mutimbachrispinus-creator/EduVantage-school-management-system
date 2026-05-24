export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { parseStkCallback } from '@/lib/mpesa';
import { kvRecordPayment, kvGet, kvSet, query, execute } from '@/lib/db';

/**
 * Resolve which tenant owns a given Paybill shortcode.
 */
async function resolveTenantByShortcode(shortcode) {
  if (!shortcode) return 'platform-master';
  try {
    const rows = await query(`SELECT tenant_id, value FROM kv WHERE key = 'paav_paybill_accounts'`, []);
    for (const row of rows) {
      let accounts = [];
      try { accounts = JSON.parse(row.value); } catch { continue; }
      const match = accounts.find(acc => String(acc.shortcode).trim() === String(shortcode).trim());
      if (match) return row.tenant_id;
    }
  } catch (e) { console.error('[M-Pesa Callback] resolveTenantByShortcode error:', e); }
  return 'platform-master';
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('[M-Pesa Callback] Received Body:', JSON.stringify(body, null, 2));

    const result = parseStkCallback(body);

    // 1. Immediately acknowledge Safaricom to prevent retries (Zeraki-Style)
    const { backgroundTask } = await import('@/lib/background-tasks');
    
    backgroundTask(req, async () => {
      try {
        if (!result.paid) {
          console.log('[M-Pesa Callback] Payment cancelled/failed:', result.resultDesc);
          return;
        }

        const checkoutRequestId = body?.Body?.stkCallback?.CheckoutRequestID;
        const businessShortcode  = String(body?.Body?.stkCallback?.BusinessShortCode || '');
        let adm, term, tenantId, pendingKey;

        // Strategy 1: Look up the pending payment record by CheckoutRequestID
        if (checkoutRequestId) {
          try {
            const rows = await query(`SELECT tenant_id, value FROM kv WHERE key = 'paav_mpesa_pending'`, []);
            for (const row of rows) {
              let pending = {};
              try { pending = JSON.parse(row.value); } catch { continue; }
              if (pending[checkoutRequestId]) {
                const rec = pending[checkoutRequestId];
                adm      = rec.adm;
                term     = rec.term;
                tenantId = rec.tenantId || row.tenant_id;
                if (rec.platformFee) result.schoolAmount = Math.max(0, result.amount - rec.platformFee);
                result.settlementAccount = rec.settlementAccount || 'Primary';
                pendingKey = { tenantId: row.tenant_id, pending, id: checkoutRequestId };
                break;
              }
            }
          } catch (e) { console.error('[M-Pesa Callback] Pending lookup error:', e); }
        }

        // Strategy 2: Fallback — parse AccountReference + resolve by shortcode
        if (!adm) {
          const parts = String(result.accountRef || '').split(':');
          adm      = parts[0]?.trim() || result.accountRef;
          term     = parts[1]?.trim() || 'T1';
          tenantId = await resolveTenantByShortcode(businessShortcode);
        }

        if (tenantId && adm) {
          // Idempotency check: Ensure the payment hasn't been recorded already
          if (result.mpesaCode) {
            const existing = await query('SELECT id FROM paylog WHERE ref = ? AND tenant_id = ? LIMIT 1', [result.mpesaCode, tenantId]);
            if (existing.length > 0) {
              console.log('[M-Pesa Callback] Duplicate transaction ignored:', result.mpesaCode);
              return;
            }
            const lock = await execute(
              `INSERT INTO kv (key, tenant_id, value, updated_at)
               VALUES (?, ?, ?, strftime('%s','now'))
               ON CONFLICT(key, tenant_id) DO NOTHING`,
              [`mpesa_receipt_${result.mpesaCode}`, tenantId, JSON.stringify({ checkoutRequestId, lockedAt: new Date().toISOString() })]
            );
            if (Number(lock.rowsAffected || 0) === 0) {
              console.log('[M-Pesa Callback] Duplicate receipt lock ignored:', result.mpesaCode);
              return;
            }
          }

          // Process Subscription
          if (term && term.startsWith('SUB_')) {
            const durationMap = { 'SUB_DAILY': 1, 'SUB_WEEKLY': 7, 'SUB_MONTHLY': 30 };
            const days = durationMap[term] || 1;
            const subs = (await kvGet('paav_learning_subs', {}, tenantId)) || {};
            const now = Date.now();
            const currentExp = (subs[adm] && subs[adm].expires > now) ? subs[adm].expires : now;
            subs[adm] = { expires: currentExp + (days * 24 * 60 * 60 * 1000), updatedAt: now };
            await kvSet('paav_learning_subs', subs, tenantId);
            
            await kvRecordPayment({
              id: result.mpesaCode ? `mpesa_${result.mpesaCode}` : undefined,
              adm, term: 'Platform Subscription', amount: result.amount, method: 'M-Pesa',
              ref: result.mpesaCode, by: 'M-Pesa STK', status: 'approved'
            }, tenantId);
          } else {
            // Record standard fee payment
            await kvRecordPayment({
              id: result.mpesaCode ? `mpesa_${result.mpesaCode}` : undefined,
              adm, term, amount: result.schoolAmount || result.amount, method: 'M-Pesa',
              ref: result.mpesaCode, by: 'M-Pesa STK', status: 'approved'
            }, tenantId);

            // Add to Central Settlement Queue
            if ((result.schoolAmount || result.amount) > 0) {
              const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
              if (!queue.some(item => item.ref && item.ref === result.mpesaCode)) {
                queue.push({
                  tenantId, adm, amount: result.schoolAmount || result.amount,
                  settlementAccount: result.settlementAccount || 'Primary',
                  timestamp: new Date().toISOString(), status: 'pending', ref: result.mpesaCode
                });
                await kvSet('paav_settlement_queue', queue, 'platform-master');
              }
            }
          }

          // Cleanup pending
          if (pendingKey && checkoutRequestId) {
            delete pendingKey.pending[checkoutRequestId];
            await kvSet('paav_mpesa_pending', pendingKey.pending, pendingKey.tenantId);
          }

          // SMS Receipt
          try {
            const profile = await kvGet('paav_school_profile', {}, tenantId) || {};
            const learners = await kvGet('paav6_learners', [], tenantId) || [];
            const l = learners.find(x => x.adm === adm);
            const parentPhone = l?.phone || result.phone;
            const schoolName = profile.name || 'EduVantage';

            const { sendSMS } = await import('@/lib/sms-client');
            const atCreds = (await kvGet('paav_at_creds', null, tenantId)) || (await kvGet('paav_at_creds', null, 'platform-master'));
            const msg = `✅ PAYMENT RECEIVED: KES ${result.amount.toLocaleString()} for ${l?.name || adm}. Ref: ${result.mpesaCode}. Thank you!`;
            await sendSMS({ to: parentPhone, message: msg, schoolName, ...(atCreds || {}) });
          } catch (e) { console.warn('[M-Pesa Callback] SMS Receipt failed:', e.message); }

        } else if (!adm && checkoutRequestId) {
          // Institutional Billing
          try {
            const logs = await query('SELECT id, payload FROM nexed_mpesa_logs WHERE id = ?', [`billing_${checkoutRequestId}`]);
            if (logs.length > 0) {
              const meta = JSON.parse(logs[0].payload);
              
              if (meta.type === 'subscription') {
                const tenantId = meta.tenantId;
                const planId = meta.planId;
                
                const gConf = await kvGet('paav_global_config', {}, 'platform-master');
                const planData = (gConf.plans || []).find(p => p.id === planId) || {};
                const cycle = planData.cycle || 'termly';
                
                const countRes = await query('SELECT COUNT(*) as total FROM learners WHERE tenant_id = ?', [tenantId]);
                const studentCount = countRes[0]?.total || 0;
                
                const subRows = await query('SELECT expires_at FROM subscriptions WHERE tenant_id = ?', [tenantId]);
                const currentExpiry = subRows[0]?.expires_at ? new Date(subRows[0].expires_at) : null;
                const expiresAt = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
                if (cycle === 'annually' || cycle === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                else expiresAt.setMonth(expiresAt.getMonth() + 4);
                
                const limit = planData.billingModel === 'per-learner' ? Math.max(studentCount, 1) : 99999;
                
                await execute(`
                  INSERT INTO subscriptions (tenant_id, plan, status, expires_at, learner_limit, billing_model, cycle, amount, updated_at)
                  VALUES (?, ?, 'active', ?, ?, ?, ?, ?, strftime('%s','now'))
                  ON CONFLICT(tenant_id) DO UPDATE SET 
                    status = 'active', 
                    expires_at = excluded.expires_at, 
                    plan = excluded.plan,
                    learner_limit = excluded.learner_limit,
                    billing_model = excluded.billing_model,
                    cycle = excluded.cycle,
                    amount = excluded.amount,
                    updated_at = excluded.updated_at
                `, [
                  tenantId, 
                  planId, 
                  expiresAt.toISOString(), 
                  limit, 
                  planData.billingModel || 'per-learner', 
                  cycle, 
                  result.amount
                ]);
                console.log(`[M-Pesa Callback] Subscription activated for ${tenantId}`);
                
              } else if (meta.billId) {
                await query(`UPDATE nexed_school_billing SET status = 'paid', mpesa_ref = ?, paid_at = ? WHERE id = ?`,
                  [result.mpesaCode, new Date().toISOString(), meta.billId]);
                console.log(`[M-Pesa Callback] Institutional Bill ${meta.billId} paid.`);
              }
            }
          } catch (e) { console.error('[M-Pesa Callback] Billing lookup error:', e); }
        }
      } catch (procErr) {
        console.error('[M-Pesa Callback Background Error]:', procErr);
      }
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('[M-Pesa Callback] Top-level Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
