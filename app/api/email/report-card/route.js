export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { sendEmail, getReportCardTemplate } from '@/lib/mail';
import { kvGet } from '@/lib/db';
import { DEFAULT_SUBJECTS, gInfo, maxPts, promotionStatus } from '@/lib/cbe';

export async function POST(req) {
  try {
    const { adm, term } = await req.json();

    if (!adm || !term) return NextResponse.json({ error: 'ADM and Term required' }, { status: 400 });

    // 1. Fetch data
    const [learners, marks, feeCfg, gradCfg] = await Promise.all([
      kvGet('paav6_learners'),
      kvGet('paav6_marks'),
      kvGet('paav6_feecfg'),
      kvGet('paav8_grad'),
    ]);

    const learner = (learners || []).find(l => l.adm === adm);
    if (!learner) return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
    if (!learner.parentEmail) {
      return NextResponse.json({ error: 'Parent email not set for this learner' }, { status: 400 });
    }

    // 2. Calculate performance (simplified for the email summary)
    const subjects = DEFAULT_SUBJECTS[learner.grade] || [];
    let totalPts = 0;
    let enteredCount = 0;

    subjects.forEach(subj => {
      const assessments = ['op1', 'mt1', 'et1'];
      const scores = assessments
        .map(a => {
          const k1 = `${term}:${learner.grade}|${subj}|${a}`;
          const k0 = `${learner.grade}|${subj}|${a}`;
          return marks[k1]?.[adm] ?? marks[k0]?.[adm];
        })
        .filter(s => s !== undefined && s !== null);

      if (scores.length > 0) {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const info = gInfo(avg, learner.grade, gradCfg);
        totalPts += info.pts;
        enteredCount++;
      }
    });

    const mPts = maxPts(learner.grade, subjects);
    const promoSt = promotionStatus(totalPts, mPts);
    const pct = mPts ? Math.round((totalPts / mPts) * 100) : 0;

    // 3. Generate template
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://paav.school'; // Adjust as needed
    const link = `${baseUrl}/grades/report-card/${adm}?term=${term}`;

    const html = getReportCardTemplate({
      learnerName: learner.name,
      term: term.replace('T', ''),
      year: new Date().getFullYear(),
      totalPts,
      maxPts: mPts,
      pct,
      promoStatus: promoSt,
      link
    });

    // 4. Send email
    const result = await sendEmail({
      to: learner.parentEmail,
      subject: `Academic Report Card - ${learner.name} (Term ${term.replace('T', '')})`,
      html,
      text: `The academic report for ${learner.name} is available. Total Points: ${totalPts}/${mPts}.`
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Report Card API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
