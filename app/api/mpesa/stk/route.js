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

    // If paybill has no Daraja credentials, fall back to the school's integration keys
    // (set via Settings → Integrations tab). Does NOT override existing paybill-level creds.
    if (!paybill.consumerKey) {
      const intKeys = (await kvGet('paav_integration_keys', {}, tenantId)) || {};
      if (!paybill.consumerKey)    paybill.consumerKey    = intKeys.mpesaConsumerKey;
      if (!paybill.consumerSecret) paybill.consumerSecret = intKeys.mpesaConsumerSecret;
      if (!paybill.shortcode)      paybill.shortcode      = intKeys.mpesaShortcode;
      if (!paybill.passkey)        paybill.passkey        = intKeys.mpesaPasskey;
      if (!paybill.env)            paybill.env            = intKeys.mpesaEnv;
    }

    // Parse clean adm from accountRef which may be "2025/001:T1" or just "2025/001"
    const adm = String(accountRef).split(':')[0].trim();
    const safaricomRef = adm.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'FEES';

    // Use school-level Daraja credentials if configured, else fall back to env vars
    const stkResult = await stkPush({
      phone,
      amount: finalAmount,
      accountRef: safaricomRef,
      description: description || 'School Fees',
      shortcode:      paybill.shortcode     || undefined,
      passkey:        paybill.passkey       || undefined,
      consumerKey:    paybill.consumerKey   || undefined,
      consumerSecret: paybill.consumerSecret|| undefined,
      env:            paybill.env           || process.env.MPESA_ENV || 'sandbox',
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
