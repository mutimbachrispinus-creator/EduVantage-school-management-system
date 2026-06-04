export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, execute, query } from '@/lib/db';

/**
 * POST /api/mpesa/disburse/result
 * Safaricom Daraja B2B ResultURL callback endpoint.
 * This is called asynchronously by Safaricom after processing a B2B request.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[M-Pesa B2B Result] Received:', JSON.stringify(body, null, 2));

    const result = body?.Result;
    if (!result) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;
    const conversationId = result.ConversationID;
    
    let transactionId = '';
    const resultParams = result.ResultParameters?.ResultParameter || [];
    const txParam = resultParams.find(p => p.Key === 'TransactionID' || p.Key === 'TransactionReceipt');
    if (txParam) transactionId = txParam.Value;

    if (!conversationId) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Load settlement queue
    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    let updatedQueue = [...queue];
    let itemsUpdated = 0;
    
    const tenantIdsToNotify = new Set();
    const groupTotals = {};

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === 'processing_b2b' && item.disbursementRef === conversationId) {
        if (resultCode === 0 || resultCode === '0') {
          // Success
          updatedQueue[i] = {
            ...item,
            status: 'disbursed',
            disbursedAt: new Date().toISOString(),
            safaricomTxId: transactionId || ''
          };
          
          tenantIdsToNotify.add(item.tenantId);
          if (!groupTotals[item.tenantId]) groupTotals[item.tenantId] = { total: 0, dest: item.disbursedTo };
          groupTotals[item.tenantId].total += Number(item.amount || 0);

        } else {
          // Failure
          updatedQueue[i] = {
            ...item,
            status: 'failed',
            failReason: resultDesc
          };
        }
        itemsUpdated++;
      }
    }

    if (itemsUpdated > 0) {
      await kvSet('paav_settlement_queue', updatedQueue, 'platform-master');

      // If success, notify the school admin
      if (resultCode === 0 || resultCode === '0') {
        const { backgroundTask } = await import('@/lib/background-tasks');
        
        backgroundTask(request, async () => {
          for (const tenantId of tenantIdsToNotify) {
            try {
              const { total, dest } = groupTotals[tenantId];
              const { sendSMS } = await import('@/lib/sms-client');
              
              const atCreds = await kvGet('paav_at_creds', null, tenantId).catch(() => null)
                || await kvGet('paav_at_creds', null, 'platform-master').catch(() => null);
                
              const adminUsers = await query(
                `SELECT phone FROM users WHERE tenant_id = ? AND role = 'admin' AND phone IS NOT NULL LIMIT 1`,
                [tenantId]
              ).catch(() => []);
              
              if (adminUsers[0]?.phone) {
                await sendSMS({
                  to: adminUsers[0].phone,
                  message: `EduVantage: KES ${total.toLocaleString()} has been successfully disbursed to your M-Pesa account (${dest}). Reference: ${transactionId || conversationId}.`,
                  schoolName: 'EduVantage',
                  ...(atCreds || {})
                });
              }
            } catch (notifyErr) {
              console.warn('[B2B Result] SMS notification failed for', tenantId, notifyErr.message);
            }
          }
        });
      }
      
      // Log to audit
      await execute(
        `INSERT INTO audit_log (tenant_id, action, details, created_at) VALUES (?, ?, ?, ?)`,
        ['platform-master', 'B2B_RESULT', JSON.stringify({ conversationId, resultCode, resultDesc }), Math.floor(Date.now() / 1000)]
      ).catch(() => {});
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error('[M-Pesa B2B Result] Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
