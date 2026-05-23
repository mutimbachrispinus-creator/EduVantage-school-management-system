export const runtime = 'edge';
/**
 * POST /api/sms/delivery
 * Africa's Talking Delivery Report Webhook
 *
 * AT calls this URL with a form-encoded body containing:
 *   id            — the AT message ID
 *   status        — "Success" | "Failed" | "Buffered" | "Rejected" | "Risk Hold"
 *   phoneNumber   — the recipient
 *   networkCode   — carrier code
 *   failureReason — (if failed)
 *   retryCount
 *
 * Register this URL in your AT application dashboard:
 *   Delivery Reports Callback: https://<domain>/api/sms/delivery
 *
 * Audit Fix (May 2026): Adds delivery receipt tracking & cross-references smsLog.
 */

import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/db';

export async function POST(req) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);

    const messageId    = params.get('id')            || '';
    const status       = params.get('status')        || '';
    const phoneNumber  = params.get('phoneNumber')   || '';
    const networkCode  = params.get('networkCode')   || '';
    const failureReason= params.get('failureReason') || '';
    const retryCount   = parseInt(params.get('retryCount') || '0', 10);

    if (!messageId || !status) {
      // Still return 200 — AT retries on non-200 which could flood the queue
      console.warn('[SMS Delivery] Missing id or status in webhook payload');
      return new NextResponse('OK', { status: 200 });
    }

    console.log(`[SMS Delivery] id=${messageId} status=${status} phone=${phoneNumber} network=${networkCode}`);

    // 1. Structured receipt log (rolling array)
    const receiptKey = 'paav_sms_delivery_log';
    const deliveryLog = (await kvGet(receiptKey, [], 'platform-master')) || [];
    deliveryLog.unshift({
      messageId,
      status,
      phoneNumber,
      networkCode,
      failureReason,
      retryCount,
      timestamp: new Date().toISOString(),
    });

    // Rolling window: keep last 2000 delivery receipts
    if (deliveryLog.length > 2000) deliveryLog.splice(2000);
    await kvSet(receiptKey, deliveryLog, 'platform-master');

    // 2. Cross-reference: update matching tenant smsLog so the portal UI shows status
    try {
      const index = (await kvGet('paav_sms_message_index', {}, 'platform-master')) || {};
      const tenantId = index[messageId]?.tenantId || 'platform-master';
      const smsLog = (await kvGet('paav7_sms', [], tenantId)) || [];
      const entry = smsLog.find(e => e.id === messageId || e.atMessageId === messageId);
      if (entry) {
        entry.deliveryStatus = status;
        entry.deliveryAt     = new Date().toISOString();
        if (failureReason) entry.failureReason = failureReason;
        await kvSet('paav7_sms', smsLog, tenantId);
      }
    } catch (logErr) {
      console.warn('[SMS Delivery] Could not update smsLog cross-reference:', logErr.message);
    }

    // Africa's Talking expects a plain 200 OK — any non-200 triggers retries
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[SMS Delivery Webhook Error]:', err);
    // Return 200 even on internal errors to prevent AT retry storms
    return new NextResponse('OK', { status: 200 });
  }
}
