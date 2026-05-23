'use server';

import { ensureSchema, kvGet, query } from '@/lib/db';
import { getCurriculum, getDefaultSubjects, gInfo, getDistributionBuckets } from '@/lib/cbe';

/**
 * lib/actions/analytics.js — Curriculum-aware academic aggregations
 */

export async function getAcademicStats({ tenantId, grade, term, curriculum = 'CBC' }) {
  console.log(`[Analytics] getAcademicStats: tenant=${tenantId}, grade=${grade}, term=${term}, curriculum=${curriculum}`);
  try {
    await ensureSchema();
    const curr = getCurriculum(curriculum);
    const currTerms = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];

    // Build exhaustive term aliases so marks keyed as T1:, TERM 1:, or "Autumn Term:" all resolve
    const termAliases = new Set([term]);
    const numMatch = String(term || '').match(/(\d+)/);
    if (numMatch) {
      const n = numMatch[1];
      termAliases.add(`T${n}`);
      termAliases.add(`TERM ${n}`);
    }
    // Match by curriculum-specific term ID or display name
    const matchedTerm = currTerms.find(t => t.id === term || t.name === term);
    if (matchedTerm) {
      termAliases.add(matchedTerm.id);
      termAliases.add(matchedTerm.name);
      const idx = currTerms.indexOf(matchedTerm) + 1;
      termAliases.add(`T${idx}`);
      termAliases.add(`TERM ${idx}`);
    }

    const targetPrefixes = [...termAliases].map(t => `${t}:${grade}|`);

    const [gradeLearners, markRows, subjCfg] = await Promise.all([
      query(
        'SELECT adm, name, grade, sex, stream FROM learners WHERE tenant_id = ? AND grade = ?',
        [tenantId, grade]
      ).catch(async (err) => {
        try {
          const learners = await kvGet('paav6_learners', [], tenantId);
          return (learners || []).filter(l => l?.grade === grade);
        } catch (e) {
          console.error('[Analytics] learners fallback failed', e);
          return [];
        }
      }),
      query(
        `SELECT grade_subj_assess, adm, score FROM marks WHERE tenant_id = ?`,
        [tenantId]
      ).then(allRows => {
        return allRows.filter(r => targetPrefixes.some(p => String(r.grade_subj_assess).startsWith(p)));
      }).catch(async (err) => {
        try {
          const allMarks = await kvGet('paav6_marks', {}, tenantId);
          const rows = [];
          Object.entries(allMarks || {}).forEach(([key, students]) => {
            if (targetPrefixes.some(p => key.startsWith(p))) {
              Object.entries(students || {}).forEach(([adm, score]) =>
                rows.push({ grade_subj_assess: key, adm, score })
              );
            }
          });
          return rows;
        } catch (e) {
          console.error('[Analytics] marks fallback failed', e);
          return [];
        }
      }),
      kvGet('paav8_subj', {}, tenantId).catch(() => ({}))
    ]);

    const learnerMap = new Map();
    gradeLearners.forEach(l => learnerMap.set(l.adm, l));

    const marksForGrade = markRows
      .map(row => ({ key: row.grade_subj_assess, adm: row.adm, score: Number(row.score) }))
      .filter(row => Number.isFinite(row.score));

    // Curriculum labels for UI terminology
    const labels = curr.LABELS || {
      grade: 'Grade', grades: 'Grades',
      subject: 'Subject', subjects: 'Subjects',
      learner: 'Learner', learners: 'Learners',
      assessment: 'Assessment', assessments: 'Assessments'
    };

    // Curriculum-specific assessment key → display name map
    const assessTypes = curr.ASSESSMENT_TYPES || [];
    const assessLabelMap = assessTypes.reduce((acc, a) => {
      acc[a.key] = a.label.replace(/\p{Emoji}/gu, '').trim();
      return acc;
    }, {});

    const emptyResult = {
      success: true,
      data: {
        subjectMastery: [], genderComparison: [], streamComparison: [],
        assessmentComparison: [], levelDistribution: [],
        studentCount: gradeLearners.length, enteredLearners: 0,
        totalEntries: 0, completionRate: 0, classAverage: 0,
        riskCount: 0, excellenceCount: 0, labels, curriculum
      }
    };

    if (marksForGrade.length === 0) return emptyResult;

    // ── Aggregate per subject, per assessment, per learner ──────────────────
    const subjectMap = {};
    const learnerTotals = {};
    const assessmentMap = {};

    marksForGrade.forEach(m => {
      const parts = m.key.split('|');
      const subject = parts[1] || 'Unknown';
      const assess  = parts[2] || 'assessment';

      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0 };
      subjectMap[subject].total += m.score;
      subjectMap[subject].count++;

      if (!assessmentMap[assess]) assessmentMap[assess] = { total: 0, count: 0 };
      assessmentMap[assess].total += m.score;
      assessmentMap[assess].count++;

      if (!learnerTotals[m.adm]) learnerTotals[m.adm] = { total: 0, count: 0 };
      learnerTotals[m.adm].total += m.score;
      learnerTotals[m.adm].count++;
    });

    // ── Subject mastery (curriculum-aware gInfo) ─────────────────────────────
    const subjectMastery = Object.entries(subjectMap).map(([name, data]) => {
      const avg  = Number((data.total / data.count).toFixed(2));
      const info = gInfo(avg, grade, null, curriculum);
      return { name, average: avg, entries: data.count, level: info?.lv || '—', color: info?.c || '#8B1A1A' };
    }).sort((a, b) => b.average - a.average);

    // ── Assessment progression ───────────────────────────────────────────────
    const assessmentComparison = Object.entries(assessmentMap).map(([key, data]) => ({
      name:    assessLabelMap[key] || key,
      rawKey:  key,
      average: Number((data.total / data.count).toFixed(2)),
      entries: data.count
    })).sort((a, b) => a.rawKey.localeCompare(b.rawKey));

    // ── Learner averages ─────────────────────────────────────────────────────
    const learnerAverages = Object.entries(learnerTotals).map(([adm, data]) => ({
      adm,
      average: data.count ? data.total / data.count : 0,
      entries: data.count
    }));

    const classAverage = learnerAverages.length
      ? Number((learnerAverages.reduce((s, l) => s + l.average, 0) / learnerAverages.length).toFixed(2))
      : 0;

    // Risk / excellence thresholds (percentage-based, universal)
    const riskCount      = learnerAverages.filter(l => l.average < 40).length;
    const excellenceCount = learnerAverages.filter(l => l.average >= 80).length;

    // ── Curriculum-specific level distribution ───────────────────────────────
    const distBuckets   = getDistributionBuckets(grade, curriculum);
    const levelMap      = { ...distBuckets };
    const gradeColors   = curr.getGradeColors ? curr.getGradeColors() : {};

    learnerAverages.forEach(l => {
      const info = gInfo(l.average, grade, null, curriculum);
      const lv   = info?.lv || '—';
      if (lv in levelMap) levelMap[lv]++;
    });

    const levelDistribution = Object.entries(levelMap).map(([name, count]) => ({
      name, count, color: gradeColors[name] || '#64748B'
    }));

    // ── Gender & Stream ──────────────────────────────────────────────────────
    const genderStats = { Boys: { total: 0, count: 0 }, Girls: { total: 0, count: 0 } };
    const streamMap   = {};

    marksForGrade.forEach(m => {
      const student = learnerMap.get(m.adm);
      if (!student) return;
      const sex = String(student.sex || student.gender || '').toLowerCase().startsWith('f') ? 'Girls' : 'Boys';
      if (genderStats[sex]) { genderStats[sex].total += m.score; genderStats[sex].count++; }
      if (student.stream) {
        if (!streamMap[student.stream]) streamMap[student.stream] = { total: 0, count: 0 };
        streamMap[student.stream].total += m.score;
        streamMap[student.stream].count++;
      }
    });

    const genderComparison = Object.entries(genderStats).map(([name, data]) => ({
      name, average: data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0, entries: data.count
    }));
    const streamComparison = Object.entries(streamMap).map(([name, data]) => ({
      name, average: Number((data.total / data.count).toFixed(2)), entries: data.count
    }));

    // ── Coverage calculation ─────────────────────────────────────────────────
    const enteredLearners      = learnerAverages.length;
    const totalEntries         = marksForGrade.length;
    const defaultSubjects      = getDefaultSubjects(grade, curriculum);
    const expectedSubjectsCount = (subjCfg?.[grade]?.length > 0)
      ? subjCfg[grade].length
      : defaultSubjects.length || Object.keys(subjectMap).length || 1;
    const expectedEntries      = Math.max(1, gradeLearners.length * expectedSubjectsCount);

    console.log(`[Analytics] Done. Entered: ${enteredLearners}/${gradeLearners.length}, curriculum: ${curriculum}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        subjectMastery, genderComparison, streamComparison,
        assessmentComparison, levelDistribution,
        studentCount:   gradeLearners.length,
        enteredLearners, totalEntries,
        completionRate: Number(((totalEntries / expectedEntries) * 100).toFixed(1)),
        classAverage, riskCount, excellenceCount,
        labels, curriculum
      }))
    };

  } catch (error) {
    console.error('Analytics Error:', error);
    return { success: false, error: error.message };
  }
}
