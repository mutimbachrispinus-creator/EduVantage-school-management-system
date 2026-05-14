export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * POST /api/auth/recovery
 * Simple password reset for multi-tenant users.
 * In production, this would send an SMS/Email.
 */
export async function POST(req) {
  try {
    const { tenant, username, phone, newPassword } = await req.json();
    if (!tenant || !username || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getClient();
    const hp = await hashPassword(newPassword);

    // Verify user exists with that phone number for extra security
    const userRes = await db.execute({
      sql: 'SELECT id FROM staff WHERE tenant_id = ? AND username = ? AND phone = ?',
      args: [tenant, username, phone]
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found or phone mismatch' }, { status: 404 });
    }

    await db.execute({
      sql: 'UPDATE staff SET password = ? WHERE tenant_id = ? AND username = ?',
      args: [hp, tenant, username]
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' });

  } catch (err) {
    console.error('[Recovery API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
