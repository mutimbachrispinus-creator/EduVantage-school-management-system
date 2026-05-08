/**
 * lib/cbe.js — Legacy Wrapper for Multi-Curriculum Support
 *
 * This file maintains backward compatibility for the Kenya CBC system
 * while providing access to British and IB curricula.
 */

import { getCurriculum } from './curriculum/index';
import * as cbc from './curriculum/cbc';

// Re-export the curriculum factory
export { getCurriculum };

// Default (Kenya CBC) constants exported for legacy support
export const PRE         = cbc.PRE;
export const LOWER       = cbc.LOWER;
export const UPPER       = cbc.UPPER;
export const JSS         = cbc.JSS;
export const SENIOR      = cbc.SENIOR;
export const ALL_GRADES  = cbc.ALL_GRADES;
export const DEFAULT_SUBJECTS = cbc.DEFAULT_SUBJECTS;
export const JSS_SCALE   = cbc.JSS_SCALE;
export const PRIMARY_SCALE = cbc.PRIMARY_SCALE;

/**
 * Get the grades list for a specific curriculum
 */
export function getAllGrades(curriculum = 'CBC', schoolProfile = null) {
  let grades = getCurriculum(curriculum).ALL_GRADES || [];
  if (schoolProfile) {
    grades = grades.filter(g => isLevelEnabled(g, schoolProfile, curriculum));
  }
  return grades;
}

/**
 * Get default subjects for a grade and curriculum
 */
export function getDefaultSubjects(grade, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  return curr.DEFAULT_SUBJECTS?.[grade] || [];
}

export function gradeGroup(grade, curriculum = 'CBC') {
  return getCurriculum(curriculum).gradeGroup(grade);
}

/**
 * Check if a specific grade is enabled for the institution
 */
export function isLevelEnabled(grade, schoolProfile, curriculum = 'CBC') {
  if (!schoolProfile?.levels) return true;
  const group = gradeGroup(grade, curriculum);
  
  // Map internal grade groups to profile level keys
  const mapping = {
    'pre': 'pre',
    'primary13': 'primary',
    'primary46': 'primary',
    'ks1': 'primary',
    'ks2': 'primary',
    'pyp': 'primary',
    'jss': 'junior',
    'ks3': 'junior',
    'igcse': 'junior',
    'myp': 'junior',
    'senior': 'senior',
    'early_years': 'pre',
    'lower_secondary': 'junior',
    'igcse': 'junior',
    'a-level': 'senior'
  };
  
  const levelKey = mapping[group] || group; // Fallback to group key itself
  return schoolProfile.levels?.[levelKey] !== false;
}

export function isJSSGrade(grade, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (curr.isJSSGrade) return curr.isJSSGrade(grade);
  if (curr.isSecondary) return curr.isSecondary(grade);
  return false;
}

export function gInfo(score, grade, cfg = null, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (!curr.gInfo) return { lv: '—', pts: 0, c: '#333', bg: '#eee', desc: '' };
  return curr.gInfo(score, grade, cfg);
}

export function maxPts(grade, subjects = null, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (!curr.maxPts) return 0;
  return curr.maxPts(grade, subjects);
}

export function getDistributionBuckets(grade, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (!curr.getDistributionBuckets) return {};
  return curr.getDistributionBuckets(grade);
}

export function getGradeColors(curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (!curr.getGradeColors) return {};
  return curr.getGradeColors();
}

/**
 * Utility to fetch a mark for a specific student, subject, and assessment.
 */
export function getMark(marks, term, grade, subject, assess, adm) {
  if (!marks) return null;
  const k1 = `${term}:${grade}|${subject}|${assess}`;
  const k0 = `${grade}|${subject}|${assess}`;
  const score = marks[k1]?.[adm] ?? marks[k0]?.[adm];
  return (score !== undefined && score !== null && score !== '') ? Number(score) : null;
}

/**
 * Calculate total points for one learner across all their subjects.
 */
export function calcLearnerPoints(marks, adm, grade, term, assess, subjects, cfg = null, curriculum = 'CBC') {
  let totalPts = 0;
  let enteredCount = 0;
  const detail = [];
  const curr = getCurriculum(curriculum);

  for (const subj of subjects) {
    const score = getMark(marks, term, grade, subj, assess, adm);

    if (score !== null) {
      const info = gInfo(score, grade, cfg, curriculum);
      totalPts += info.pts;
      enteredCount++;
      detail.push({ subj, score, ...info });
    } else {
      detail.push({ subj, score: null, lv: '—', pts: 0, c: 'var(--muted)', bg: 'transparent', desc: '' });
    }
  }

  return { totalPts, enteredCount, maxTotal: maxPts(grade, subjects, curriculum), detail };
}

/**
 * Calculate averages across 3 assessments (Opener, Mid, End)
 */
export function calcLearnerReportData(marks, adm, grade, term, subjects, cfg = null, curriculum = 'CBC', weights = null) {
  const result = [];
  let totalAvgPts = 0;
  let totalEntered = 0;
  let totalAvgScore = 0;

  const curr = getCurriculum(curriculum);
  const assessments = curr.ASSESSMENT_TYPES || [{ key: 'mt1', label: 'Mid-Term' }];
  
  // Default equal weights if none provided
  const w = weights || assessments.reduce((acc, a) => ({ ...acc, [a.key]: 1 / assessments.length }), {});

  for (const s of subjects) {
    const scores = {};
    const infos = {};
    
    let weightSum = 0;
    let weightedScoreSum = 0;
    let count = 0;

    assessments.forEach(a => {
      const score = getMark(marks, term, grade, s, a.key, adm);
      scores[a.key] = score;
      infos[a.key] = score !== null ? gInfo(score, grade, cfg, curriculum) : { lv: '—', pts: 0 };
      
      if (score !== null) {
        weightSum += (w[a.key] || 0);
        weightedScoreSum += score * (w[a.key] || 0);
        count++;
      }
    });
    
    const avg = weightSum > 0 ? Number((weightedScoreSum / weightSum).toFixed(2)) : 0;
    const avgInfo = count > 0 ? gInfo(avg, grade, cfg, curriculum) : { lv: '—', pts: 0 };

    if (count > 0) {
      totalAvgPts += avgInfo.pts;
      totalAvgScore += avg;
      totalEntered++;
    }

    result.push({
      subj: s,
      scores,      // New: dynamic scores map
      infos,       // New: dynamic info map
      avg, 
      avgLv: avgInfo.lv,
      pts: avgInfo.pts,
      desc: avgInfo.desc,
      // Compatibility fields (though UI should ideally use scores[key])
      op: scores.op1, opLv: infos.op1?.lv,
      mt: scores.mt1, mtLv: infos.mt1?.lv,
      et: scores.et1, etLv: infos.et1?.lv
    });
  }

  return {
    subjects: result,
    totalAvgPts,
    totalAvgScore,
    totalEntered,
    overallInfo: totalEntered ? gInfo(Number((totalAvgScore / totalEntered).toFixed(2)), grade, cfg, curriculum) : { lv: '—', pts: 0 }
  };
}

export function shouldRankByMarks(grade, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  if (curr.shouldRankByMarks) return curr.shouldRankByMarks(grade);
  return false;
}

/**
 * Build a ranked merit list for a grade / assessment.
 */
export function buildMeritList(learners, marks, grade, term = 'T1', assess = 'mt1', cfg = null, curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  const subjects = curr.DEFAULT_SUBJECTS?.[grade] || [];
  
  const prevAssess = assess === 'et1' ? 'mt1' : assess === 'mt1' ? 'op1' : null;

  const graded = learners
    .filter(l => l.grade === grade)
    .map(l => {
      const current = calcLearnerPoints(marks, l.adm, grade, term, assess, subjects, cfg, curriculum);
      
      // Pre-calculate total marks for ranking
      let totalMarks = 0;
      subjects.forEach(s => {
        const score = getMark(marks, term, grade, s, assess, l.adm);
        if (score !== null) totalMarks += score;
      });

      let vap = 0;
      if (prevAssess) {
        const prev = calcLearnerPoints(marks, l.adm, grade, term, prevAssess, subjects, cfg, curriculum);
        if (prev.enteredCount > 0) {
          vap = current.totalPts - prev.totalPts;
        }
      }

      return { ...l, ...current, totalMarks, vap };
    })
    .filter(l => l.enteredCount > 0)
    .sort((a, b) => {
      // Rank by Total Marks if the curriculum/grade group requires it
      if (shouldRankByMarks(grade, curriculum)) return b.totalMarks - a.totalMarks;
      return b.totalPts - a.totalPts;
    });

  let rank = 1;
  for (let i = 0; i < graded.length; i++) {
    if (i > 0 && graded[i].totalPts < graded[i - 1].totalPts) {
      rank = i + 1;
    }
    graded[i].rank = rank;
  }

  return graded;
}

export function promotionStatus(totalPts, maxTotal) {
  if (maxTotal === 0) return 'review';
  const pct = (totalPts / maxTotal) * 100;
  if (pct >= 50) return 'promote';
  if (pct >= 30) return 'review';
  return 'retain';
}

export function fmtK(n) {
  return 'KSH ' + Number(n || 0).toLocaleString('en-KE');
}

export function today() {
  return new Date().toISOString().split('T')[0];
}
