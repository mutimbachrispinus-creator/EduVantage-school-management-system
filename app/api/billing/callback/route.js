export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { parseStkCallback } from '@/lib/mpesa';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Billing Callback Received]', JSON.stringify(body));

    const result = parseStkCallback(body);

    if (result.paid) {
      const checkoutRequestId = body.Body.stkCallback.CheckoutRequestID;
      const logId = `billing_${checkoutRequestId}`;

      // 1. Find the pending transaction
      const logRows = await query('SELECT payload FROM nexed_mpesa_logs WHERE id = ?', [logId]);
      if (!logRows.length) {
        console.error('[Billing Callback] Transaction not found:', logId);
        return NextResponse.json({ ok: true }); // Still return ok to Safaricom
      }

      const meta = JSON.parse(logRows[0].payload);
      const { tenantId, planId, amount } = meta;

      // 2. Update Transaction Log
      await execute(
        'UPDATE nexed_mpesa_logs SET status = ?, receipt = ?, payload = ? WHERE id = ?',
        ['processed', result.mpesaCode, JSON.stringify({ ...meta, callback: result }), logId]
      );

      // 3. Calculate New Expiry Date
      // We'll extend from today or from the current expiry if it's in the future
      const subRows = await query('SELECT expires_at, cycle FROM subscriptions WHERE tenant_id = ?', [tenantId]);
      const currentExpiry = subRows[0]?.expires_at;
      const cycle = subRows[0]?.cycle || 'termly'; // Fallback to termly
      
      let startDate = new Date();
      if (currentExpiry) {
        const curExpDate = new Date(currentExpiry);
        if (curExpDate > startDate) startDate = curExpDate;
      }

      // Add 4 months for termly, 12 months for annual
      const monthsToAdd = cycle === 'annual' ? 12 : 4;
      const newExpiryDate = new Date(startDate);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);
      const newExpiryStr = newExpiryDate.toISOString();

      // 4. Update Subscription
      // We update plan, status, and expires_at
      await execute(`
        INSERT INTO subscriptions (tenant_id, plan, status, expires_at, updated_at) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id) DO UPDATE SET 
          plan = excluded.plan, 
          status = excluded.status, 
          expires_at = excluded.expires_at, 
          updated_at = excluded.updated_at
      `, [tenantId, planId, 'active', newExpiryStr, Math.floor(Date.now() / 1000)]);

      console.log(`[Billing Success] Activated ${planId} for ${tenantId}. New Expiry: ${newExpiryStr}`);

    } else {
      console.warn('[Billing Callback] Payment failed or cancelled:', result.resultDesc);
      // Optional: Update log status to failed
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Billing Callback Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
