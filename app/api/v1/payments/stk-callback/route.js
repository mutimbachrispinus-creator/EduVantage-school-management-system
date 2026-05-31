export const runtime = 'edge';

import { db } from '@/lib/db/index';
import { transactions, mpesaLogs, students, pendingReconciliation } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';
// import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'; // Removed to avoid resolution issues

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { stkCallback } = body.Body;

    // 1. Validate Callback via Daraja Secret
    const authHeader = req.headers.get('x-daraja-token');
    if (process.env.DARAJA_SECRET && authHeader !== process.env.DARAJA_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;

    // 2. Parse M-Pesa Metadata
    const metadata = stkCallback.CallbackMetadata?.Item || [];
    const getValue = (name) => metadata.find(i => i.Name === name)?.Value;

    const amount = getValue('Amount') || 0;
    const receipt = getValue('MpesaReceiptNumber');
    const phone = getValue('PhoneNumber')?.toString();

    // Log the raw request for audit
    const [log] = await db.insert(mpesaLogs).values({
      id: generateUUID(),
      phoneNumber: phone,
      amount: amount * 100, // to cents
      receipt: receipt,
      payload: body,
      status: 'pending'
    }).returning();

    if (stkCallback.ResultCode !== 0) {
      await db.update(mpesaLogs).set({ status: 'failed' }).where(eq(mpesaLogs.id, log.id));
      return new Response('Callback received (Failed Transaction)', { status: 200 });
    }

    // 3. Find Student via Strict STK Push mapping in KV
    let foundStudent = null;
    let tenantId = 'platform-master';
    try {
      const { query } = await import('@/lib/db');
      const rows = await query(`SELECT tenant_id, value FROM kv WHERE key = 'paav_mpesa_pending'`, []);
      for (const row of rows) {
        let pending = {};
        try { pending = JSON.parse(row.value); } catch { continue; }
        if (pending[checkoutRequestId]) {
          const rec = pending[checkoutRequestId];
          tenantId = rec.tenantId || row.tenant_id;
          foundStudent = await db.query.students.findFirst({
            where: (students, { eq, and }) => and(eq(students.adm, rec.adm), eq(students.tenantId, tenantId))
          });
          break;
        }
      }
    } catch (e) {
      console.error('[STK Callback] Pending lookup error:', e);
    }

    if (foundStudent) {
      // 4. Record Transaction
      await db.insert(transactions).values({
        id: generateUUID(),
        studentId: foundStudent.id,
        amount: amount * 100,
        type: 'credit',
        method: 'mpesa',
        reference: receipt,
        description: `M-Pesa Payment ${receipt}`,
        tenantId: foundStudent.tenantId
      });

      await db.update(mpesaLogs).set({ status: 'processed' }).where(eq(mpesaLogs.id, log.id));
    } else {
      // 5. Log to Pending Reconciliation
      await db.insert(pendingReconciliation).values({
        id: generateUUID(),
        mpesaLogId: log.id,
        amount: amount * 100,
        phoneNumber: phone,
        receipt: receipt,
        reason: 'Student not found matching phone number'
      });
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
