export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';
import { b2bTransfer, b2cTransfer } from '@/lib/mpesa';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
    return NextResponse.json({ queue });
  } catch (error) {
    console.error('[Settlements API] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session || (session.tenantId !== 'platform-master' && session.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'process_payouts') {
      const queue = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
      const pendingItems = queue.filter(q => q.status === 'pending');
      
      if (pendingItems.length === 0) {
        return NextResponse.json({ success: true, message: 'No pending payouts to process.' });
      }

      // Group by destination account to minimize Daraja API calls
      const groups = {};
      pendingItems.forEach(item => {
        const dest = item.settlementAccount;
        if (!groups[dest]) groups[dest] = { amount: 0, items: [], tenantId: item.tenantId };
        groups[dest].amount += item.amount;
        groups[dest].items.push(item);
      });

      let successCount = 0;
      let failedCount = 0;

      // Process each grouped destination
      for (const [dest, group] of Object.entries(groups)) {
        let transferResult;
        
        // Very basic heuristic to determine B2B vs B2C. 
        // Typically Till/Paybills are 5-7 digits. Bank accounts are 10+
        if (dest.length <= 7 && !isNaN(Number(dest))) {
           transferResult = await b2bTransfer({ amount: group.amount, destinationShortcode: dest, remarks: 'EduVantage School Fees Settlement' });
        } else {
           transferResult = await b2cTransfer({ amount: group.amount, destinationAccount: dest, remarks: 'EduVantage School Fees Settlement' });
        }

        if (transferResult.success) {
           // Mark all grouped items as completed
           group.items.forEach(i => {
             i.status = 'completed';
             i.processedAt = new Date().toISOString();
             i.conversationId = transferResult.conversationId;
           });
           successCount += group.items.length;
        } else {
           // Mark as failed
           group.items.forEach(i => {
             i.status = 'failed';
             i.error = transferResult.error;
           });
           failedCount += group.items.length;
        }
      }

      // Save updated queue back to KV
      // Only keep the last 500 items to prevent the array from growing indefinitely
      let updatedQueue = queue;
      if (updatedQueue.length > 500) {
          updatedQueue = updatedQueue.slice(updatedQueue.length - 500);
      }
      await kvSet('paav_settlement_queue', updatedQueue, 'platform-master');

      return NextResponse.json({ 
        success: true, 
        message: `Processed ${successCount} successful payouts. ${failedCount} failed.`,
        processed: successCount,
        failed: failedCount
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Settlements API] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
