export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { stkPush } from '@/lib/mpesa';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';

const DARAJA_SANDBOX_SHORTCODE = '174379';
const DARAJA_SANDBOX_URL       = 'https://sandbox.safaricom.co.ke';
const DARAJA_SANDBOX_PASSKEY   = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

export async function POST(req) {
  try {
    const { phone, amount, accountRef, description, term, paybillId, includeFee } = await req.json();

    if (!phone || !amount || !accountRef) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: phone, amount, and accountRef are required' },
        { status: 400 }
      );
    }

    const platformFee  = includeFee ? 50 : 0;
    const finalAmount  = Number(amount) + platformFee;

    // Rate Limiting — 1 request per minute per phone
    const rlKey  = `stk_rl_${phone}`;
    const lastReq = await kvGet(rlKey, null, 'platform-master');
    if (lastReq && (Date.now() - lastReq.time < 60000)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in and try again.' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    // ──────────────────────────────────────────────────────────────────────────
    // CENTRALIZED PAYMENT MODEL
    // All parent fee payments go through the platform-master Daraja gateway.
    // The school's settlement account (till / paybill shortcode) is recorded so
    // the callback engine can automatically disburse collected funds.
    // ──────────────────────────────────────────────────────────────────────────

    // 1. Load platform-master global Daraja config — the ONLY gateway used
    const gConf = (await kvGet('paav_global_config', {}, 'platform-master')) || {};
    const gw    = gConf.mpesaGateway || {};

    const finalConsumerKey    = gw.consumerKey    || process.env.MPESA_CONSUMER_KEY    || process.env.DARAJA_CONSUMER_KEY    || '';
    const finalConsumerSecret = gw.consumerSecret || process.env.MPESA_CONSUMER_SECRET || process.env.DARAJA_CONSUMER_SECRET || '';
    const finalShortcode      = gw.shortcode      || process.env.MPESA_SHORTCODE       || process.env.DARAJA_SHORTCODE       || '';
    const finalCallbackUrl    = gw.callbackUrl    || gw.callbackURL || process.env.MPESA_CALLBACK_URL || process.env.DARAJA_CALLBACK_URL || '';
    let   finalPasskey        = gw.passkey        || process.env.MPESA_PASSKEY         || process.env.DARAJA_PASSKEY         || '';

    const activeEnv = String(gw.env || process.env.MPESA_ENV || 'sandbox').toLowerCase().trim();
    const darajaEnv = ['live', 'production', 'prod'].includes(activeEnv) ? 'production' : 'sandbox';

    // Use official sandbox passkey when testing with the Safaricom sandbox shortcode
    if (darajaEnv === 'sandbox' && finalShortcode === DARAJA_SANDBOX_SHORTCODE) {
      finalPasskey = DARAJA_SANDBOX_PASSKEY;
    }

    if (!finalConsumerKey || !finalConsumerSecret || !finalShortcode || !finalPasskey) {
      return NextResponse.json({
        success: false,
        error: 'The platform M-Pesa gateway is not fully configured. The platform administrator must set the Daraja Consumer Key, Consumer Secret, Shortcode, and Passkey in Super Admin → Global Settings.',
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 503 });
    }

    if (!finalCallbackUrl) {
      return NextResponse.json({
        success: false,
        error: 'M-Pesa callback URL is not configured. Set it in Super Admin → Global Settings → M-Pesa Automation Gateway.',
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 503 });
    }

    // 2. Resolve the school's settlement destination (for post-payment disbursement only)
    //    Schools no longer configure Daraja credentials — only their till/paybill shortcode.
    const schoolPaybills      = (await kvGet('paav_paybill_accounts', [], tenantId)) || [];
    const settlementAcct      = schoolPaybills.find(p => String(p.id) === String(paybillId)) || schoolPaybills[0] || {};
    const settlementShortcode = settlementAcct.shortcode || settlementAcct.accNo || '';

    // 3. Build a Safaricom-safe account reference (ADM number, max 12 chars)
    const adm         = String(accountRef).split(':')[0].trim();
    const safaricomRef = adm.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'FEES';

    // 4. Initiate STK Push via platform-master gateway
    const stkResult = await stkPush({
      phone,
      amount:         finalAmount,
      accountRef:     safaricomRef,
      description:    String(description || 'SchoolFees').replace(/[^a-zA-Z0-9]/g, '').slice(0, 13),
      shortcode:      finalShortcode,
      passkey:        finalPasskey,
      consumerKey:    finalConsumerKey,
      consumerSecret: finalConsumerSecret,
      callbackUrl:    finalCallbackUrl,
      env:            darajaEnv,
    });

    if (stkResult.success && stkResult.checkoutRequestId) {
      // Record rate limit key only on success
      await kvSet(rlKey, { time: Date.now() }, 'platform-master');

      // 5. Track pending payment — the callback uses CheckoutRequestID to reconcile
      //    and auto-disburse the school's share to their settlement account.
      const pendingKey = 'paav_mpesa_pending';
      const pending    = (await kvGet(pendingKey, {}, tenantId)) || {};
      pending[stkResult.checkoutRequestId] = {
        adm,
        term:              term || 'T1',
        amount:            Number(amount),  // base school amount (before platform fee)
        platformFee,
        tenantId,
        phone,
        settlementAccount: settlementShortcode, // school's M-Pesa till/paybill for disbursement
        initiatedAt:       new Date().toISOString()
      };

      // Keep at most 200 pending records
      const keys = Object.keys(pending);
      if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => delete pending[k]);
      await kvSet(pendingKey, pending, tenantId);
    }

    return NextResponse.json(stkResult);
  } catch (error) {
    console.error('[STK Push] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
