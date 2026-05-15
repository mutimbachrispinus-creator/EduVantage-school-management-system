export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { sendSMS, getFeeReminderSMS } from '@/lib/sms-client';
import { kvGet } from '@/lib/db';

export async function POST(req) {
  try {
    const { adm, balance } = await req.json();

    if (!adm) return NextResponse.json({ error: 'Admission number required' }, { status: 400 });

    const [learners, accounts, savedCreds] = await Promise.all([
      kvGet('paav6_learners'),
      kvGet('paav_paybill_accounts'),
      kvGet('paav_at_creds', {}, 'platform-master')
    ]);

    const paybill = accounts?.[0]?.shortcode || (await kvGet('paav_paybill')) || '';

    const learner = (learners || []).find(l => l.adm === adm);

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
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error('SMS Reminder API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
