export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { sendEmail, getReceiptTemplate } from '@/lib/mail';
import { kvGet } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req) {
  const session = await getSession();
  // Allow if authenticated (staff) OR if it's an internal fetch from the same origin
  const isInternal = req.headers.get('host') === new URL(req.url).host;
  
  if (!session && !isInternal) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const { adm, amount, term, date, ref, balance } = await req.json();

    if (!adm) return NextResponse.json({ error: 'Admission number required' }, { status: 400 });

    // Fetch learner to get parent email
    const learners = await kvGet('paav6_learners') || [];
    const learner = learners.find(l => l.adm === adm);

    if (!learner) return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
    if (!learner.parentEmail) {
      return NextResponse.json({ error: 'Parent email not set for this learner' }, { status: 400 });
    }

    const html = getReceiptTemplate({
      learnerName: learner.name,
      adm: learner.adm,
      amount,
      term,
      date: date || new Date().toLocaleDateString('en-KE'),
      ref,
      balance
    });

    const result = await sendEmail({
      to: learner.parentEmail,
      subject: `Fee Payment Receipt - ${learner.name} (${adm})`,
      html,
      text: `Fee payment of KSH ${amount} recorded for ${learner.name}. Remaining balance: KSH ${balance}.`
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Receipt API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
