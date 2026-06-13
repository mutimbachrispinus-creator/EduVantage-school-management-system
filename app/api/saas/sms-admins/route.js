export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendBulkSMS } from '@/lib/sms-client';

/**
 * POST /api/saas/sms-admins
 * Super-Admin only: sends an SMS to all (or selected) school admin phone numbers.
 * Body: { message, tenantIds? }
 *   tenantIds — optional array; omit to target ALL tenant admins.
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized – Super-Admin only' }, { status: 403 });
    }

    const { message, tenantIds } = await request.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Fetch global SMS credentials
    const credRow = await query(
      "SELECT value FROM kv WHERE key = 'paav_at_creds' AND tenant_id = 'platform-master'",
      []
    );
    let creds = {};
    if (credRow.length) {
      try { creds = JSON.parse(credRow[0].value); } catch {}
    }

    // Fetch all admin phone numbers
    // Staff table with role = 'admin' across all tenants (excluding platform-master)
    let adminRows;
    if (tenantIds && tenantIds.length > 0) {
      const placeholders = tenantIds.map(() => '?').join(',');
      adminRows = await query(
        `SELECT s.phone, s.name, s.tenant_id
         FROM staff s
         WHERE s.role = 'admin'
           AND s.tenant_id IN (${placeholders})
           AND s.phone IS NOT NULL AND s.phone != ''`,
        tenantIds
      );
    } else {
      adminRows = await query(
        `SELECT s.phone, s.name, s.tenant_id
         FROM staff s
         WHERE s.role = 'admin'
           AND s.tenant_id != 'platform-master'
           AND s.phone IS NOT NULL AND s.phone != ''`,
        []
      );
    }

    if (!adminRows.length) {
      return NextResponse.json({ error: 'No admin phone numbers found' }, { status: 404 });
    }

    const phones = adminRows.map(r => r.phone);
    const result = await sendBulkSMS(phones, message.trim(), {
      username: creds.username || process.env.AT_USERNAME,
      apiKey: creds.apiKey || process.env.AT_API_KEY,
      senderId: creds.senderId || process.env.AT_SENDER_ID,
      schoolName: 'EduVantage'
    });

    return NextResponse.json({
      ok: true,
      total: phones.length,
      sent: result.totalSent,
      failed: result.totalFailed,
      admins: adminRows.map(r => ({ name: r.name, tenant: r.tenant_id, phone: r.phone }))
    });
  } catch (err) {
    console.error('[api/saas/sms-admins] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
