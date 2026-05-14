export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseStkCallback } from '@/lib/mpesa';
import { kvRecordPayment, kvGet, kvSet, query } from '@/lib/db';

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
              adm, term: 'Platform Subscription', amount: result.amount, method: 'M-Pesa',
              ref: result.mpesaCode, by: 'M-Pesa STK', status: 'approved'
            }, tenantId);
          } else {
            // Record standard fee payment
            await kvRecordPayment({
              adm, term, amount: result.schoolAmount || result.amount, method: 'M-Pesa',
              ref: result.mpesaCode, by: 'M-Pesa STK', status: 'approved'
            }, tenantId);

            // Add to Central Settlement Queue
            if ((result.schoolAmount || result.amount) > 0) {
              const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
              queue.push({
                tenantId, adm, amount: result.schoolAmount || result.amount,
                settlementAccount: result.settlementAccount || 'Primary',
                timestamp: new Date().toISOString(), status: 'pending', ref: result.mpesaCode
              });
              await kvSet('paav_settlement_queue', queue, 'platform-master');
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

            const { sendSMS } = await import('@/lib/sms-client');
            const atCreds = (await kvGet('paav_at_creds', null, tenantId)) || (await kvGet('paav_at_creds', null, 'platform-master'));
            const msg = `✅ PAYMENT RECEIVED: KES ${result.amount.toLocaleString()} for ${l?.name || adm}. Ref: ${result.mpesaCode}. Thank you for using ${profile.name || 'EduVantage'}.`;
            await sendSMS({ to: parentPhone, message: msg, ...(atCreds || {}) });
          } catch (e) { console.warn('[M-Pesa Callback] SMS Receipt failed:', e.message); }

        } else if (!adm && checkoutRequestId) {
          // Institutional Billing
          try {
            const logs = await query('SELECT id, payload FROM nexed_mpesa_logs WHERE id = ?', [`billing_${checkoutRequestId}`]);
            if (logs.length > 0) {
              const meta = JSON.parse(logs[0].payload);
              await query(`UPDATE nexed_school_billing SET status = 'paid', mpesa_ref = ?, paid_at = ? WHERE id = ?`,
                [result.mpesaCode, new Date().toISOString(), meta.billId]);
              console.log(`[M-Pesa Callback] Institutional Bill ${meta.billId} paid.`);
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
