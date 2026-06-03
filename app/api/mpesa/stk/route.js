export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { stkPush } from '@/lib/mpesa';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';

export async function POST(req) {
  try {
    const { phone, amount, accountRef, description, term, paybillId, includeFee } = await req.json();

    if (!phone || !amount || !accountRef) {
      return NextResponse.json({ success: false, error: 'Missing required fields: phone, amount, and accountRef are required' }, { status: 400 });
    }

    const platformFee = includeFee ? 50 : 0;
    const finalAmount = Number(amount) + platformFee;

    // Rate Limiting (1 request per minute per phone)
    const rlKey = `stk_rl_${phone}`;
    const lastReq = await kvGet(rlKey, null, 'platform-master');
    if (lastReq && (Date.now() - lastReq.time < 60000)) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a minute before trying again.' }, { status: 429 });
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized. Please log in and try again.' }, { status: 401 });

    const tenantId = session.tenantId;

    // Load school's paybill accounts from KV
    const paybills = (await kvGet('paav_paybill_accounts', [], tenantId)) || [];
    const paybill = paybills.find(p => String(p.id) === String(paybillId)) || paybills[0] || {};

    const intKeys = (await kvGet('paav_integration_keys', {}, tenantId)) || {};
    // If paybill has no Daraja credentials, fall back to the school's integration keys
    // (set via Settings → Integrations tab). Does NOT override existing paybill-level creds.
    if (!paybill.consumerKey) {
      if (!paybill.consumerKey)    paybill.consumerKey    = intKeys.mpesaConsumerKey;
      if (!paybill.consumerSecret) paybill.consumerSecret = intKeys.mpesaConsumerSecret;
      if (!paybill.shortcode)      paybill.shortcode      = intKeys.mpesaShortcode;
      if (!paybill.passkey)        paybill.passkey        = intKeys.mpesaPasskey;
      if (!paybill.env)            paybill.env            = intKeys.mpesaEnv;
    }
    // Always map the custom callback url if provided (like a RequestBin)
    if (!paybill.callbackUrl) paybill.callbackUrl = intKeys.mpesaCallbackUrl;

    // Parse clean adm from accountRef which may be "2025/001:T1" or just "2025/001"
    const adm = String(accountRef).split(':')[0].trim();
    const safaricomRef = adm.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'FEES';

    // Environment and shortcode validation to prevent cryptic 500 errors
    const activeEnv = String(paybill.env || process.env.MPESA_ENV || 'sandbox').toLowerCase().trim();
    const darajaEnv = ['live', 'production', 'prod'].includes(activeEnv) ? 'production' : 'sandbox';
    const shortcode = String(paybill.shortcode || '').trim();

    const DARAJA_SANDBOX_SHORTCODE = '174379';
    const DARAJA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
    const DARAJA_SANDBOX_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    if (darajaEnv === 'sandbox' && shortcode && shortcode !== DARAJA_SANDBOX_SHORTCODE) {
      return NextResponse.json({
        success: false,
        error: `Daraja is set to sandbox but the school's Paybill shortcode is configured as "${shortcode}". Sandbox STK Push must use Safaricom's default sandbox shortcode ${DARAJA_SANDBOX_SHORTCODE} with its matching sandbox passkey. To use your custom Paybill, switch the environment to production.`,
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    if (darajaEnv === 'production' && shortcode === DARAJA_SANDBOX_SHORTCODE) {
      return NextResponse.json({
        success: false,
        error: `Daraja is set to production but the shortcode is Safaricom's sandbox test shortcode ${DARAJA_SANDBOX_SHORTCODE}. Please use your real production paybill/till shortcode and production passkey, or switch the environment back to sandbox.`,
        darajaTestUrl: DARAJA_SANDBOX_URL
      }, { status: 400 });
    }

    // Load global configuration as fallback
    const gConf = (await kvGet('paav_global_config', {}, 'platform-master')) || {};
    const gw = gConf.mpesaGateway || {};

    const finalConsumerKey = paybill.consumerKey || gw.consumerKey || process.env.MPESA_CONSUMER_KEY || process.env.DARAJA_CONSUMER_KEY || '';
    const finalConsumerSecret = paybill.consumerSecret || gw.consumerSecret || process.env.MPESA_CONSUMER_SECRET || process.env.DARAJA_CONSUMER_SECRET || '';
    const finalShortcode = paybill.shortcode || gw.shortcode || process.env.MPESA_SHORTCODE || process.env.DARAJA_SHORTCODE || '';
    let finalPasskey = paybill.passkey || gw.passkey || process.env.MPESA_PASSKEY || process.env.DARAJA_PASSKEY || '';
    const finalCallbackUrl = paybill.callbackUrl || gw.callbackUrl || gw.callbackURL || process.env.MPESA_CALLBACK_URL || process.env.DARAJA_CALLBACK_URL || '';

    // Override to correct Safaricom sandbox passkey if using the test shortcode
    if (darajaEnv === 'sandbox' && finalShortcode === DARAJA_SANDBOX_SHORTCODE) {
      finalPasskey = DARAJA_SANDBOX_PASSKEY;
    }

    // Use resolved Daraja credentials
    const stkResult = await stkPush({
      phone,
      amount: finalAmount,
      accountRef: safaricomRef,
      description: String(description || 'SchoolFees').replace(/[^a-zA-Z0-9]/g, '').slice(0, 13), // Sandbox strictness
      shortcode:      finalShortcode     || undefined,
      passkey:        finalPasskey       || undefined,
      consumerKey:    finalConsumerKey   || undefined,
      consumerSecret: finalConsumerSecret|| undefined,
      callbackUrl:    finalCallbackUrl   || undefined,
      env:            darajaEnv,
    });


    if (stkResult.success && stkResult.checkoutRequestId) {
      // Record rate limit key only on success
      await kvSet(rlKey, { time: Date.now() }, 'platform-master');

      // Track pending payment by CheckoutRequestID so the callback can reconcile
      const pendingKey = 'paav_mpesa_pending';
      const pending = (await kvGet(pendingKey, {}, tenantId)) || {};
      pending[stkResult.checkoutRequestId] = {
        adm,
        term:              term || 'T1',
        amount:            Number(amount), // base school amount
        platformFee,
        tenantId,
        phone,
        settlementAccount: paybill.shortcode || paybill.accNo || 'Primary',
        initiatedAt:       new Date().toISOString()
      };

      // Keep at most 200 pending records
      const keys = Object.keys(pending);
      if (keys.length > 200) {
        keys.slice(0, keys.length - 200).forEach(k => delete pending[k]);
      }
      await kvSet(pendingKey, pending, tenantId);
    }

    return NextResponse.json(stkResult);
  } catch (error) {
    console.error('[STK Push] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
