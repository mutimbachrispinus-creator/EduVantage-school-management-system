export const runtime = 'edge';

import { db } from '@/lib/db/index';
import { transactions, mpesaLogs, students, pendingReconciliation } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';
// import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'; // Removed to avoid resolution issues

export async function POST(req) {
  try {
    const body = await req.json();
    const { stkCallback } = body.Body;

    // 1. Validate Callback (Mocking Daraja validation or API Secret check)
    // In production, you might check a custom header or a pre-shared token in the query params
    const authHeader = req.headers.get('x-daraja-token');
    if (process.env.DARAJA_SECRET && authHeader !== process.env.DARAJA_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse M-Pesa Metadata
    const metadata = stkCallback.CallbackMetadata.Item;
    const getValue = (name) => metadata.find(i => i.Name === name)?.Value;

    const amount = getValue('Amount');
    const receipt = getValue('MpesaReceiptNumber');
    const phone = getValue('PhoneNumber')?.toString();

    // Log the raw request for audit
    const [log] = await db.insert(mpesaLogs).values({
      id: crypto.randomUUID(),
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

    // 3. Find Student
    // Try matching by phone or a custom metadata field (e.g., account number in description)
    const foundStudent = await db.query.students.findFirst({
      where: or(
        eq(students.phone, phone),
        // This is a simplified lookup, ideally you'd have an account mapping
        like(students.metadata, `%${phone}%`)
      )
    });

    if (foundStudent) {
      // 4. Record Transaction
      await db.insert(transactions).values({
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
