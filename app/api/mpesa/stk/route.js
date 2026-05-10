export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { stkPush } from '@/lib/mpesa';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';

export async function POST(req) {
  try {
    const { phone, amount, accountRef, description, term, paybillId, includeFee } = await req.json();

    if (!phone || !amount || !accountRef) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const platformFee = includeFee ? 50 : 0;
    const finalAmount = Number(amount) + platformFee;

    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const tenantId = session.tenantId;

    const paybills = (await kvGet('paav_paybill_accounts', [], tenantId)) || [];
    const paybill = paybills.find(p => String(p.id) === String(paybillId)) || paybills[0] || {};

    // Parse adm from accountRef which may be "2025/001:T1" or just "2025/001"
    // We send just the raw adm number as AccountReference (Safaricom limit: 12 chars)
    // The adm number itself is what parents & schools recognise.
    // Term + tenantId are tracked separately via the CheckoutRequestID record below.
    const adm = String(accountRef).split(':')[0].trim();
    const safaricomRef = adm.slice(0, 12); // Max 12 chars enforced by Safaricom

    const result = await stkPush({
      phone,
      amount: finalAmount,
      accountRef: safaricomRef,
      description: description || 'School Fees'
    });

    if (result.success && result.checkoutRequestId) {
      // Store a pending payment record keyed by CheckoutRequestID.
      // The callback will look this up to know exactly which student, term,
      // and school to credit — works for ANY length admission number.
      const pendingKey = 'paav_mpesa_pending';
      const pending = (await kvGet(pendingKey, {}, tenantId)) || {};
      pending[result.checkoutRequestId] = {
        adm,
        term:     term || 'T1',
        amount:   Number(amount), // Original base amount for school ledger
        platformFee,
        tenantId,
        phone,
        settlementAccount: paybill.shortcode || paybill.accNo || 'Primary', // Where EduVantage should send funds
        initiatedAt: new Date().toISOString()
      };
      // Keep at most 200 pending records (auto-cleanup of old ones)
      const keys = Object.keys(pending);
      if (keys.length > 200) {
        const oldest = keys.slice(0, keys.length - 200);
        oldest.forEach(k => delete pending[k]);
      }
      await kvSet(pendingKey, pending, tenantId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('STK Push API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
