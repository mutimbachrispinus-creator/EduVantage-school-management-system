export const runtime = 'edge';
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

    // 0. Rate Limiting (1 request per minute per phone)
    const { kvSet } = await import('@/lib/db');
    const rlKey = `stk_rl_${phone}`;
    const lastReq = await kvGet(rlKey, null, 'platform-master');
    if (lastReq && (Date.now() - lastReq.time < 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute before trying again.' }, { status: 429 });
    }

    // 1. Get Global Config (for Gateway Credentials)
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    let gw = gConf.mpesaGateway;

    // Fallback to platform-level env vars if global config is not set
    if (!gw || !gw.consumerKey || !gw.shortcode) {
      gw = {
        consumerKey:    process.env.MPESA_CONSUMER_KEY    || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        shortcode:      process.env.MPESA_SHORTCODE      || '',
        passkey:        process.env.MPESA_PASSKEY        || '',
        env:            process.env.MPESA_ENV            || 'sandbox',
      };
    }

    if (!gw.consumerKey || !gw.shortcode) {
      return NextResponse.json({ error: 'M-Pesa Automation Gateway is not configured.' }, { status: 400 });
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
      // Record rate limit key only on success
      await kvSet(rlKey, { time: Date.now() }, 'platform-master');

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
