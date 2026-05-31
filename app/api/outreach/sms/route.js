export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendSMS } from '@/lib/sms-client';
import { getDefaultSubjects, gInfo, maxPts, getMark, calcLearnerReportData } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    const { term, assess, grade } = await request.json();

    if (!term || !assess || !grade) {
      return NextResponse.json({ error: 'Term, assessment, and grade are required' }, { status: 400 });
    }

    // Fetch learners and marks
    const [learners, marks, profile, subjCfg, gradCfg] = await Promise.all([
      kvGet('paav6_learners', [], tenantId),
      kvGet('paav6_marks', {}, tenantId),
      kvGet('paav_school_profile', null, tenantId),
      kvGet('paav8_subj', {}, tenantId),
      kvGet('paav8_grad', null, tenantId)
    ]);

    const schoolName = profile?.name || 'School Portal';
    const curriculum = profile?.curriculum || 'CBC';
    const curr = getCurriculum(curriculum, profile?.levels);
    const subjects = (subjCfg[grade]?.length > 0 ? subjCfg[grade] : getDefaultSubjects(grade, curriculum)) || [];

    // Find learners in the selected grade
    const gradeLearners = (learners || []).filter(l => l.grade === grade);

    if (gradeLearners.length === 0) {
      return NextResponse.json({ error: 'No learners found for the selected grade' }, { status: 400 });
    }

    const assessments = curr.ASSESSMENT_TYPES || [];
    const assessMap = assessments.reduce((acc, a) => ({ ...acc, [a.key]: a.label }), {});

    // Calculate totals for each learner
    const messages = [];
    for (const learner of gradeLearners) {
      let totalPts = 0;
      let overallLevel = '—';
      const mPts = maxPts(grade, subjects, curriculum);

      if (assess === 'term') {
        const report = calcLearnerReportData(
          marks,
          learner.adm,
          grade,
          term,
          subjects,
          gradCfg,
          curriculum,
          curr.DEFAULT_WEIGHTS
        );
        totalPts = report.totalAvgPts;
        overallLevel = report.overallInfo?.lv || '—';
      } else {
        let scoreSum = 0;
        let enteredCount = 0;
        subjects.forEach(subj => {
          const score = getMark(marks, term, grade, subj, assess, learner.adm);
          if (score !== null && score !== undefined) {
            scoreSum += Number(score);
            enteredCount++;
            const info = gInfo(Number(score), grade, gradCfg, curriculum, subj);
            totalPts += info.pts;
          }
        });
        const avgPct = enteredCount > 0 ? Math.round(scoreSum / enteredCount) : 0;
        overallLevel = enteredCount > 0 ? gInfo(avgPct, grade, gradCfg, curriculum, null)?.lv : '—';
      }

      if (learner.phone) {
        // Strip emojis from the exam label for a clean SMS text
        const rawLabel = assess === 'term' ? 'Term Average' : (assessMap[assess] || assess.toUpperCase());
        const assessLabel = rawLabel.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
        const msg = `Results Notice\nTerm ${term.replace('T', '')} ${assessLabel} results for ${learner.name} are now available.\nPerformance: ${totalPts}/${mPts} points.\nGeneral Level: ${overallLevel}.\nLog in to view the full report card.`;
        messages.push({ to: learner.phone, message: `[${schoolName}]\n${msg}` });
      }
    }

    // Send individual messages in parallel batches of 5 to preserve student privacy
    const BATCH_SIZE = 5;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (msg) => {
        try {
          const result = await sendSMS({
            to: msg.to,
            message: msg.message,
            schoolName
          });
          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
        }
      }));
      // Small delay between batches to avoid worker limits
      await new Promise(r => setTimeout(r, 150));
    }

    return NextResponse.json({ ok: true, sent, failed, total: messages.length });
  } catch (error) {
    console.error('Outreach SMS error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}