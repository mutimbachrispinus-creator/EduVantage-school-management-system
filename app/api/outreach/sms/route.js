export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendSMS } from '@/lib/sms-client';
import { getDefaultSubjects, gInfo, maxPts } from '@/lib/cbe';
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
    const curr = getCurriculum(profile?.curriculum || 'CBC', profile?.levels);
    const subjects = (subjCfg[grade]?.length > 0 ? subjCfg[grade] : getDefaultSubjects(grade, profile?.curriculum || 'CBC')) || [];

    // Find learners in the selected grade
    const gradeLearners = (learners || []).filter(l => l.grade === grade);

    if (gradeLearners.length === 0) {
      return NextResponse.json({ error: 'No learners found for the selected grade' }, { status: 400 });
    }

    // Calculate totals for each learner
    const messages = [];
    for (const learner of gradeLearners) {
      let totalPts = 0;
      let enteredCount = 0;

      subjects.forEach(subj => {
        const k = `${term}:${grade}|${subj}|${assess}`;
        const k0 = `${grade}|${subj}|${assess}`;
        const score = marks[k]?.[learner.adm] ?? marks[k0]?.[learner.adm];
        if (score !== undefined && score !== null) {
          const info = gInfo(Number(score), grade, gradCfg);
          totalPts += info.pts;
          enteredCount++;
        }
      });

      const mPts = maxPts(grade, subjects);
      const pct = mPts ? Math.round((totalPts / mPts) * 100) : 0;

      if (learner.phone) {
        const msg = `Results Notice\nTerm ${term.replace('T', '')} ${assess.toUpperCase()} results for ${learner.name} are now available.\nPerformance: ${totalPts}/${mPts} points.\nGeneral Level: ${gInfo(pct, grade, gradCfg, null)?.lv || '—'}.\nLog in to view the full report card.`;
        messages.push({ to: learner.phone, message: `[${schoolName}]\n${msg}` });
      }
    }

    // Send in batches to avoid Worker limits
    const BATCH_SIZE = 20; // Reduced from 200 to stay under limits
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const result = await sendSMS({
          to: batch.map(m => m.to),
          message: batch[0].message, // Same message for all in batch
          schoolName
        });
        if (result.success) {
          sent += result.acceptedCount || batch.length;
        } else {
          failed += batch.length;
        }
        // Small delay to avoid hitting subrequest limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        failed += batch.length;
      }
    }

    return NextResponse.json({ ok: true, sent, failed, total: messages.length });
  } catch (error) {
    console.error('Outreach SMS error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}