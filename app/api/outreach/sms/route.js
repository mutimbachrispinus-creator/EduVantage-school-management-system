export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendSMS } from '@/lib/sms-client';
import { getDefaultSubjects, gInfo, maxPts, getMark, calcLearnerReportData } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';

function cleanSmsLabel(value) {
  return String(value || '').replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
}

/**
 * Returns a human-readable, curriculum-aware grade label.
 * e.g. 'GRADE 7' → 'Grade 7 (Junior Secondary)'
 *      'MYP 2'   → 'MYP 2 (Middle School)'
 *      'YEAR 8'  → 'Year 8 (Key Stage 3)'
 */
function gradeDisplayLabel(grade, curr) {
  if (!grade) return grade;
  // Title-case the raw grade key
  const pretty = grade
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  // Find which CATEGORY this grade belongs to
  const cat = (curr.CATEGORIES || []).find(c => c.grades?.includes(grade));
  if (cat) return `${pretty} (${cat.title})`;
  return pretty;
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'super-admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    const { term, assess, grade, message } = await request.json();

    if (!term || !assess || !grade) {
      return NextResponse.json({ error: 'Term, assessment, and grade are required' }, { status: 400 });
    }
    const adminMessage = String(message || '').trim().slice(0, 320);

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
    const labels = curr.LABELS || {
      grade: 'Grade',
      subject: 'Subject',
      subjects: 'Subjects',
      assessment: 'Assessment'
    };
    const termName = curr.TERMS?.find(t => t.id === term)?.name || term;
    const subjects = (subjCfg[grade]?.length > 0 ? subjCfg[grade] : getDefaultSubjects(grade, curriculum)) || [];

    // Find learners in the selected grade
    const gradeLearners = (learners || []).filter(l => l.grade === grade);

    if (gradeLearners.length === 0) {
      return NextResponse.json({ error: 'No learners found for the selected grade' }, { status: 400 });
    }

    const assessments = curr.ASSESSMENT_TYPES || [];
    const assessMap = assessments.reduce((acc, a) => ({ ...acc, [a.key]: a.label }), {});
    const rawAssessLabel = assess === 'term' ? `Whole ${labels.assessment} Average` : (assessMap[assess] || assess.toUpperCase());
    const assessLabel = cleanSmsLabel(rawAssessLabel);

    // Curriculum-aware grade display label (e.g. "Grade 7 (Junior Secondary)")
    const gradeLabel = gradeDisplayLabel(grade, curr);

    // Calculate totals for each learner
    const messages = [];
    for (const learner of gradeLearners) {
      let totalPts = 0;
      // Store full info object so we get both the code and the description
      let overallInfo = { lv: '—', desc: '' };
      let enteredCount = 0;
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
        overallInfo = report.overallInfo || { lv: '—', desc: '' };
        enteredCount = subjects.filter(subj => assessments.some(a => {
          const score = getMark(marks, term, grade, subj, a.key, learner.adm);
          return score !== null && score !== undefined;
        })).length;
      } else {
        let scoreSum = 0;
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
        overallInfo = enteredCount > 0
          ? (gInfo(avgPct, grade, gradCfg, curriculum, null) || { lv: '—', desc: '' })
          : { lv: '—', desc: '' };
      }

      // Build a clean, human-readable level string:
      // e.g. "ME1 — Meeting Expectation (Good)"  or  "EE" for primary
      const lvCode = overallInfo.lv || '—';
      const lvDesc = overallInfo.desc ? cleanSmsLabel(overallInfo.desc) : '';
      const generalLevelText = lvCode === '—'
        ? '—'
        : lvDesc ? `${lvCode} — ${lvDesc}` : lvCode;

      if (learner.phone) {
        const defaultMsg = `${termName} ${assessLabel} results are now available. Log in to view the full report card.`;
        const msg = [
          adminMessage || defaultMsg,
          `Learner: ${learner.name}`,
          `${labels.grade}: ${gradeLabel}`,
          `${labels.assessment}: ${assessLabel}`,
          `Term: ${termName}`,
          `Curriculum: ${curr.name || curriculum}`,
          `Performance: ${totalPts}/${mPts} pts`,
          `${labels.subjects}: ${enteredCount}/${subjects.length} recorded`,
          `General Level: ${generalLevelText}`
        ].join('\n');
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
