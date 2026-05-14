export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, query } from '@/lib/db';
import { stkPush } from '@/lib/mpesa';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const { phone, planId, amount } = await request.json();
    const tid = session.tenantId;

    // 1. Get Global Config (for Gateway Credentials)
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const gw = gConf.mpesaGateway;

    if (!gw || !gw.consumerKey || !gw.shortcode) {
      return NextResponse.json({ error: 'M-Pesa Automation Gateway is not configured by the platform owner.' }, { status: 400 });
    }

    // 2. Initiate STK Push
    // We use the tenantId as the AccountReference so we can identify the school in the callback.
    const res = await stkPush({
      phone,
      amount,
      accountRef: tid.slice(0, 12), // Max 12 chars for Safaricom
      description: `EDUVANTAGE ${planId.toUpperCase()}`,
      consumerKey: gw.consumerKey,
      consumerSecret: gw.consumerSecret,
      shortcode: gw.shortcode,
      passkey: gw.passkey,
      env: gw.env
    });

    if (res.success) {
      // 3. Log the pending transaction
      // We'll use nexed_mpesa_logs to store the metadata for activation
      const logId = `billing_${res.checkoutRequestId}`;
      await query(
        `INSERT INTO nexed_mpesa_logs (id, phone_number, amount, status, payload, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          logId, 
          phone, 
          amount, 
          'pending', 
          JSON.stringify({ type: 'subscription', planId, tenantId: tid, checkoutRequestId: res.checkoutRequestId }),
          Math.floor(Date.now() / 1000)
        ]
      );

      return NextResponse.json({ success: true, message: 'STK Push initiated. Please check your phone.', checkoutRequestId: res.checkoutRequestId });
    } else {
      return NextResponse.json({ error: res.error || 'Failed to initiate STK Push' }, { status: 400 });
    }

  } catch (e) {
    console.error('[STK Push Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
