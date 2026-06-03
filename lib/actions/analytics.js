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
        `SELECT m.grade_subj_assess, m.adm, m.score, l.sex, l.stream 
         FROM marks m 
         INNER JOIN learners l ON m.adm = l.adm AND m.tenant_id = l.tenant_id 
         WHERE m.tenant_id = ? AND l.grade = ?`,
        [tenantId, grade]
      ).then(gradeMarks => {
        // We only fetch marks for learners in this specific grade, dramatically reducing memory usage.
        return gradeMarks;
      }).catch(async (err) => {
        console.error('[Analytics] SQL marks join failed, using kv fallback:', err.message);
        try {
          const allMarks = await kvGet('paav6_marks', {}, tenantId);
          const rows = [];
          Object.entries(allMarks || {}).forEach(([key, students]) => {
            Object.entries(students || {}).forEach(([adm, score]) =>
              rows.push({ grade_subj_assess: key, adm, score })
            );
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
        assessmentComparison: [], levelDistribution: [], historicalProgression: [],
        studentCount: gradeLearners.length, enteredLearners: 0,
        totalEntries: 0, completionRate: 0, classAverage: 0,
        riskCount: 0, excellenceCount: 0, labels, curriculum
      }
    };

    // Filter marks just for these learners
    const learnerAdms = new Set(gradeLearners.map(l => String(l.adm)));
    const allLearnerMarks = markRows
      .map(row => ({ key: row.grade_subj_assess, adm: String(row.adm), score: Number(row.score) }))
      .filter(row => learnerAdms.has(row.adm) && Number.isFinite(row.score));

    // Separate current term marks from historical marks
    const marksForGrade = allLearnerMarks.filter(row => targetPrefixes.some(p => row.key.startsWith(p)));

    if (marksForGrade.length === 0) return emptyResult;

    // ── Aggregate per subject, per assessment, per learner (Current Term) ──
    const subjectMap = {};
    const learnerTotals = {};
    const assessmentMap = {};
    const distBucketsTemplate = getDistributionBuckets(grade, curriculum);

    marksForGrade.forEach(m => {
      const parts = m.key.split('|');
      const subject = parts[1] || 'Unknown';
      const assess  = parts[2] || 'assessment';

      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0, scores: [], dist: { ...distBucketsTemplate } };
      subjectMap[subject].total += m.score;
      subjectMap[subject].count++;
      subjectMap[subject].scores.push(m.score);
      
      const info = gInfo(m.score, grade, null, curriculum);
      if (info?.lv && subjectMap[subject].dist[info.lv] !== undefined) {
        subjectMap[subject].dist[info.lv]++;
      }

      if (!assessmentMap[assess]) assessmentMap[assess] = { total: 0, count: 0 };
      assessmentMap[assess].total += m.score;
      assessmentMap[assess].count++;

      if (!learnerTotals[m.adm]) learnerTotals[m.adm] = { total: 0, count: 0 };
      learnerTotals[m.adm].total += m.score;
      learnerTotals[m.adm].count++;
    });

    // ── Value Add & Historical Progression ──
    const historicalMap = {}; // { 'T1': { total, count }, 'T2': ... }
    const pastSubjectMap = {}; // { 'Mathematics': { total, count } }
    
    // Determine previous term prefix loosely
    const matchedIdx = currTerms.findIndex(t => t.id === term || t.name === term);
    const prevTermObj = matchedIdx > 0 ? currTerms[matchedIdx - 1] : null;
    const prevPrefixes = prevTermObj ? [
      `${prevTermObj.id}:${grade}|`, `${prevTermObj.name}:${grade}|`, `T${matchedIdx}:${grade}|`, `TERM ${matchedIdx}:${grade}|`
    ] : [];

    allLearnerMarks.forEach(m => {
      const parts = m.key.split('|');
      const termGradePart = parts[0] || '';
      const tName = termGradePart.split(':')[0] || 'Unknown';
      
      if (!historicalMap[tName]) historicalMap[tName] = { total: 0, count: 0 };
      historicalMap[tName].total += m.score;
      historicalMap[tName].count++;

      // Track past subject averages for Value Add
      if (prevPrefixes.some(p => m.key.startsWith(p))) {
        const subject = parts[1] || 'Unknown';
        if (!pastSubjectMap[subject]) pastSubjectMap[subject] = { total: 0, count: 0 };
        pastSubjectMap[subject].total += m.score;
        pastSubjectMap[subject].count++;
      }
    });

    const historicalProgression = Object.entries(historicalMap).map(([tName, data]) => ({
      name: tName,
      average: Number((data.total / data.count).toFixed(2))
    })).filter(h => !targetPrefixes.some(p => p.startsWith(h.name + ':'))); // Exclude current term to show past

    // ── Subject mastery (Zeraki-level metrics) ─────────────────────────────
    const subjectMastery = Object.entries(subjectMap).map(([name, data]) => {
      const avg  = Number((data.total / data.count).toFixed(2));
      const info = gInfo(avg, grade, null, curriculum);
      
      // Calculate Standard Deviation
      const variance = data.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / data.count;
      const stdDev = Number(Math.sqrt(variance).toFixed(2));
      
      // Calculate Subject Value Add (SVA)
      let sva = 0;
      if (pastSubjectMap[name] && pastSubjectMap[name].count > 0) {
        const pastAvg = pastSubjectMap[name].total / pastSubjectMap[name].count;
        sva = Number((avg - pastAvg).toFixed(2));
      }

      return { 
        name, 
        average: avg, 
        entries: data.count, 
        level: info?.lv || '—', 
        color: info?.c || '#8B1A1A',
        stdDev,
        sva,
        distribution: data.dist
      };
    }).sort((a, b) => b.average - a.average);

    // ── Assessment progression (Current Term) ──────────────────────────────
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
        assessmentComparison, levelDistribution, historicalProgression,
        studentCount:   gradeLearners.length,
        enteredLearners, totalEntries,
        completionRate: Number(((totalEntries / expectedEntries) * 100).toFixed(1)),
        classAverage, riskCount, excellenceCount,
        labels, curriculum, distBucketsTemplate
      }))
    };

  } catch (error) {
    console.error('Analytics Error:', error);
    return { success: false, error: error.message };
  }
}
