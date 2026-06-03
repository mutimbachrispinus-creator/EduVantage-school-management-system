import { NextResponse } from 'next/server';
import { stkQuery } from '@/lib/mpesa';
import { kvGet } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/mpesa/status?checkoutRequestId=xxx
 * 
 * Polls Safaricom to check if an STK push payment is complete.
 * Used by the frontend to show real-time payment confirmation
 * without relying solely on the callback (which may be delayed).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get('checkoutRequestId');

    if (!checkoutRequestId) {
      return NextResponse.json({ success: false, error: 'Missing checkoutRequestId' }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // 1. Check our local KV first — if callback already arrived, we have ground truth
    const pending = (await kvGet('paav_mpesa_pending', {}, tenantId)) || {};
    const record = pending[checkoutRequestId];

    // If record is gone, callback has already processed it (payment confirmed)
    if (!record && Object.keys(pending).length >= 0) {
      // Record was cleaned up after successful payment
      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        message: 'Payment received and recorded successfully.'
      });
    }

    // 2. Query Safaricom directly for live status
    const queryResult = await stkQuery(checkoutRequestId);

    if (queryResult.success) {
      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        message: 'Payment confirmed by Safaricom.'
      });
    }

    // Result code 1032 = user cancelled, 1037 = timeout
    const cancelled = queryResult.resultCode === '1032';
    const timedOut  = queryResult.resultCode === '1037';

    return NextResponse.json({
      success: false,
      status: cancelled ? 'CANCELLED' : timedOut ? 'TIMEOUT' : 'PENDING',
      resultCode: queryResult.resultCode,
      message: queryResult.resultDesc || 'Payment is still pending. Please wait...'
    });

  } catch (error) {
    console.error('[M-Pesa Status] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
