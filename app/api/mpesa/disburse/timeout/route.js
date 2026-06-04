export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, execute } from '@/lib/db';

/**
 * POST /api/mpesa/disburse/timeout
 * Safaricom Daraja B2B QueueTimeOutURL callback endpoint.
 * This is called asynchronously by Safaricom if the B2B request times out in their queue.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[M-Pesa B2B Timeout] Received:', JSON.stringify(body, null, 2));

    const result = body?.Result;
    if (!result) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const conversationId = result.ConversationID;
    const resultDesc = result.ResultDesc || 'Request timed out in Daraja queue';

    if (!conversationId) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Load settlement queue
    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    let updatedQueue = [...queue];
    let itemsUpdated = 0;
    
    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === 'processing_b2b' && item.disbursementRef === conversationId) {
        // Mark as failed due to timeout
        updatedQueue[i] = {
          ...item,
          status: 'failed',
          failReason: resultDesc
        };
        itemsUpdated++;
      }
    }

    if (itemsUpdated > 0) {
      await kvSet('paav_settlement_queue', updatedQueue, 'platform-master');
      
      // Log to audit
      await execute(
        `INSERT INTO audit_log (tenant_id, action, details, created_at) VALUES (?, ?, ?, ?)`,
        ['platform-master', 'B2B_TIMEOUT', JSON.stringify({ conversationId, resultDesc }), Math.floor(Date.now() / 1000)]
      ).catch(() => {});
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error('[M-Pesa B2B Timeout] Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
