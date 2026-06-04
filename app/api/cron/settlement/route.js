export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { POST as runDisbursement } from '@/app/api/mpesa/disburse/route';

/**
 * GET /api/cron/settlement
 * Cron job endpoint for automating daily M-Pesa disbursements.
 * 
 * Invoked by Vercel Cron or similar schedulers.
 * Must include the CRON_SECRET authorization header.
 */
export async function GET(request) {
  try {
    // Check for Vercel Cron authentication
    const authHeader = request.headers.get('authorization');
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorised. Valid cron secret required.' }, { status: 403 });
    }

    console.log('[Cron] Starting automated daily settlement...');

    // We reuse the existing disbursement logic by calling its POST method directly,
    // passing the incoming request so the auth headers are maintained.
    const res = await runDisbursement(request);
    const data = await res.json();

    console.log('[Cron] Settlement completed:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Cron Settlement] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
