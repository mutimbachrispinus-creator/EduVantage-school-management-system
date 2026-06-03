export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet, query } from '@/lib/db';
import { stkPush } from '@/lib/mpesa';

const DARAJA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const DARAJA_SANDBOX_SHORTCODE = '174379';

function normalizeDarajaEnv(env) {
  const value = String(env || 'sandbox').toLowerCase().trim();
  return ['live', 'production', 'prod'].includes(value) ? 'production' : 'sandbox';
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const { phone, planId, amount } = await request.json();
    const tid = session.tenantId;
    const payableAmount = Math.round(Number(amount));

    if (!phone || !planId || !Number.isFinite(payableAmount) || payableAmount < 1) {
      return NextResponse.json({ error: 'Phone, plan, and a valid billing amount are required.' }, { status: 400 });
    }

    // 0. Rate Limiting (1 request per minute per phone)
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
        consumerKey:    process.env.MPESA_CONSUMER_KEY    || process.env.DARAJA_CONSUMER_KEY    || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || process.env.DARAJA_CONSUMER_SECRET || '',
        shortcode:      process.env.MPESA_SHORTCODE       || process.env.DARAJA_SHORTCODE       || '',
        passkey:        process.env.MPESA_PASSKEY         || process.env.DARAJA_PASSKEY         || '',
        callbackUrl:    process.env.MPESA_CALLBACK_URL   || process.env.DARAJA_CALLBACK_URL || '',
        env:            process.env.MPESA_ENV            || 'sandbox',
      };
    }

    const darajaEnv = normalizeDarajaEnv(gw.env);
    const shortcode = String(gw.shortcode || '').trim();
    let passkey = String(gw.passkey || '').trim();

    const DARAJA_SANDBOX_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    // Override passkey to official sandbox passkey when using sandbox test shortcode
    if (darajaEnv === 'sandbox' && shortcode === DARAJA_SANDBOX_SHORTCODE) {
      passkey = DARAJA_SANDBOX_PASSKEY;
    }

    if (!gw.consumerKey || !gw.consumerSecret || !shortcode || !passkey) {
      return NextResponse.json({
        error: 'M-Pesa Automation Gateway is not fully configured. Add the Daraja consumer key, consumer secret, shortcode, and passkey.',
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    if (darajaEnv === 'sandbox' && shortcode !== DARAJA_SANDBOX_SHORTCODE) {
      return NextResponse.json({
        error: `Daraja is set to sandbox but the shortcode is ${shortcode}. Sandbox STK Push must use shortcode ${DARAJA_SANDBOX_SHORTCODE} with the matching sandbox passkey, or switch the gateway environment to production for your real paybill.`,
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    if (darajaEnv === 'production' && shortcode === DARAJA_SANDBOX_SHORTCODE) {
      return NextResponse.json({
        error: `Daraja is set to production but the shortcode is the sandbox test shortcode ${DARAJA_SANDBOX_SHORTCODE}. Use your real production paybill/till shortcode and production passkey, or switch the gateway environment back to sandbox.`,
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    const callbackUrl = gw.callbackUrl || gw.callbackURL || process.env.MPESA_CALLBACK_URL || process.env.DARAJA_CALLBACK_URL || '';
    if (!callbackUrl) {
      return NextResponse.json({
        error: 'M-Pesa callback URL is missing. Set MPESA_CALLBACK_URL or DARAJA_CALLBACK_URL to your public callback endpoint, for example https://your-domain.com/api/mpesa/callback.',
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    // 2. Initiate STK Push
    // We use the tenantId as the AccountReference so we can identify the school in the callback.
    const res = await stkPush({
      phone,
      amount: payableAmount,
      accountRef: tid.slice(0, 12), // Max 12 chars for Safaricom
      description: `EDU ${String(planId).toUpperCase()}`,
      consumerKey: gw.consumerKey,
      consumerSecret: gw.consumerSecret,
      shortcode,
      passkey,
      callbackUrl,
      env: darajaEnv
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
          payableAmount, 
          'pending', 
          JSON.stringify({ type: 'subscription', planId, tenantId: tid, checkoutRequestId: res.checkoutRequestId }),
          Math.floor(Date.now() / 1000)
        ]
      );

      return NextResponse.json({ success: true, message: 'STK Push initiated. Please check your phone.', checkoutRequestId: res.checkoutRequestId });
    } else {
      return NextResponse.json({
        error: res.error || 'Failed to initiate STK Push',
        darajaEnv,
        shortcode,
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

  } catch (e) {
    console.error('[STK Push Error]', e);
    return NextResponse.json({
      error: `Could not initiate M-Pesa billing prompt: ${e.message}`,
      darajaTestUrl: DARAJA_SANDBOX_URL
    }, { status: 502 });
  }
}
