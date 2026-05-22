export const runtime = 'edge';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/recovery
 * Legacy direct-reset endpoint.
 *
 * This route used to reset passwords with only tenant + username + phone.
 * That is not enough proof of account ownership for a production school portal,
 * so password recovery must go through /api/auth request_otp + verify_otp_reset.
 */
export async function POST(req) {
  return NextResponse.json(
    {
      error: 'Direct password recovery is disabled. Use the OTP password-reset flow.',
      nextAction: '/api/auth action=request_otp then action=verify_otp_reset',
    },
    { status: 410 }
  );
}
