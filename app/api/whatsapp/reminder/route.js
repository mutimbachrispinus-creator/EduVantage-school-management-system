export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { sendFeeReminderSMS } from '@/lib/sms-client';
import { kvGet, kvSet } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { findLearner, getTenantId } from '@/lib/learner-lookup';

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const tid = getTenantId(session);

    const { adm, balance } = await req.json();

    if (!adm) return NextResponse.json({ error: 'Admission number required' }, { status: 400 });

    const [learners, accounts, savedCreds] = await Promise.all([
      kvGet('paav6_learners', [], tid),
      kvGet('paav_paybill_accounts', [], tid),
      kvGet('paav_at_creds', {}, 'platform-master')
    ]);

    const paybill = accounts?.[0]?.shortcode || accounts?.[0]?.value || (await kvGet('paav_paybill', '', tid)) || '';

    const learner = findLearner(learners, adm);

    if (!learner) return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
    if (!learner.phone) {
      return NextResponse.json({ error: 'Parent phone number not set' }, { status: 400 });
    }

    const creds = {
      username: savedCreds?.username || process.env.AT_USERNAME || 'sandbox',
      apiKey:   savedCreds?.apiKey   || process.env.AT_API_KEY  || '',
      senderId: savedCreds?.senderId || process.env.AT_SENDER_ID || '',
    };

    const result = await sendFeeReminderSMS({
      parentPhone: learner.phone,
      learnerName: learner.name,
      balance,
      paybill: paybill || '',
      admNo: learner.adm
    }, creds);

    if (!result.success) {
      return NextResponse.json({
        error: result.error || result.failed?.[0]?.error || 'SMS was not accepted by the provider',
        result
      }, { status: 502 });
    }

    const recipient = result.recipients?.[0] || null;
    await logSmsDispatch({
      tenantId: tid,
      to: learner.phone,
      message: `Fee reminder: ${learner.name}, Balance KSH ${Number(balance || 0).toLocaleString()}`,
      type: 'fee_reminder',
      status: 'submitted',
      sentBy: session.username || session.name,
      atMessageId: recipient?.messageId || result.messageIds?.[0] || '',
      providerStatus: recipient?.status || '',
      providerStatusCode: recipient?.statusCode || null
    });

    return NextResponse.json({
      success: true,
      queued: true,
      message: 'SMS submitted to Africa’s Talking. Delivery confirmation depends on the carrier report.',
      data: result.data,
      recipient
    });
  } catch (err) {
    console.error('SMS Reminder API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function logSmsDispatch(entry) {
  const { tenantId, atMessageId } = entry;
  const logs = await kvGet('paav7_sms', [], tenantId) || [];
  const id = atMessageId || 's' + Date.now() + Math.random().toString(36).slice(2, 7);
  logs.unshift({
    ...entry,
    id,
    date: new Date().toISOString()
  });
  await kvSet('paav7_sms', logs.slice(0, 500), tenantId);

  if (atMessageId) {
    const index = await kvGet('paav_sms_message_index', {}, 'platform-master') || {};
    index[atMessageId] = { tenantId, logId: id, updatedAt: new Date().toISOString() };
    await kvSet('paav_sms_message_index', index, 'platform-master');
  }
}
