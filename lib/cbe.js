/**
 * lib/cbe.js — Legacy Wrapper for Multi-Curriculum Support
 *
 * This file maintains backward compatibility for the Kenya CBC system
 * while providing access to British and IB curricula.
 */

import { getCurriculum } from './curriculum/index.js';
import * as cbc from './curriculum/cbc.js';

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
 * Get curriculum-specific terminology labels
 */
export function getLabels(curriculum = 'CBC') {
  const curr = getCurriculum(curriculum);
  return curr.LABELS || {
    grade: 'Grade',
    grades: 'Grades',
    subject: 'Subject',
    subjects: 'Subjects',
    assessment: 'Assessment',
    assessments: 'Assessments',
    learner: 'Learner',
    learners: 'Learners',
    attendance: 'Attendance'
  };
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
    'elementary': 'primary',
    'secondary': 'junior',
    'lower_secondary': 'junior',
    'a-level': 'senior',
    'artisan': 'artisan',
    'certificate': 'certificate',
    'diploma': 'diploma'
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

export function gInfo(score, grade, cfg = null, curriculum = 'CBC', subject = null, mode = 'per-level') {
  const curr = getCurriculum(curriculum);
  if (!curr.gInfo) return { lv: '—', pts: 0, c: '#333', bg: '#eee', desc: '' };
  return curr.gInfo(score, grade, cfg, subject, mode);
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
  const numMatch = String(term || '').match(/(\d+)/);
  const aliases = new Set([term]);
  if (numMatch) {
    aliases.add(`T${numMatch[1]}`);
    aliases.add(`TERM ${numMatch[1]}`);
  }
  
  let score;
  for (const t of aliases) {
    if (t) {
      const k1 = `${t}:${grade}|${subject}|${assess}`;
      if (marks[k1]?.[adm] !== undefined) {
        score = marks[k1][adm];
        break;
      }
    }
  }

  if (score === undefined) {
    const k0 = `${grade}|${subject}|${assess}`;
    score = marks[k0]?.[adm];
  }
  return (score !== undefined && score !== null && score !== '') ? Number(score) : null;
}

/**
 * Calculate total points for one learner across all their subjects.
 */
export function calcLearnerPoints(marks, adm, grade, term, assess, subjects, cfg = null, curriculum = 'CBC', mode = 'per-level') {
  let totalPts = 0;
  let enteredCount = 0;
  const detail = [];
  const curr = getCurriculum(curriculum);

  for (const subj of subjects) {
    const score = getMark(marks, term, grade, subj, assess, adm);

    if (score !== null) {
      const info = gInfo(score, grade, cfg, curriculum, subj, mode);
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
export function calcLearnerReportData(marks, adm, grade, term, subjects, cfg = null, curriculum = 'CBC', weights = null, mode = 'per-level') {
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
      infos[a.key] = score !== null ? gInfo(score, grade, cfg, curriculum, s, mode) : { lv: '—', pts: 0 };
      
      if (score !== null) {
        weightSum += (w[a.key] || 0);
        weightedScoreSum += score * (w[a.key] || 0);
        count++;
      }
    });
    
    const avg = weightSum > 0 ? Number((weightedScoreSum / weightSum).toFixed(2)) : 0;
    const avgInfo = count > 0 ? gInfo(avg, grade, cfg, curriculum, s, mode) : { lv: '—', pts: 0 };

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
    overallInfo: totalEntered ? gInfo(Number((totalAvgScore / totalEntered).toFixed(2)), grade, cfg, curriculum, null, mode) : { lv: '—', pts: 0 }
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
export function buildMeritList(learners, marks, grade, term = 'T1', assess = 'mt1', cfg = null, curriculum = 'CBC', subjectsOverride = null, mode = 'per-level') {
  const curr = getCurriculum(curriculum);
  const subjects = subjectsOverride || curr.DEFAULT_SUBJECTS?.[grade] || [];
  
  const prevAssess = assess === 'et1' ? 'mt1' : assess === 'mt1' ? 'op1' : null;

  const graded = learners
    .filter(l => l.grade === grade)
    .map(l => {
      const current = calcLearnerPoints(marks, l.adm, grade, term, assess, subjects, cfg, curriculum, mode);
      
      // Pre-calculate total marks for ranking
      let totalMarks = 0;
      subjects.forEach(s => {
        const score = getMark(marks, term, grade, s, assess, l.adm);
        if (score !== null) totalMarks += score;
      });

      let vap = 0;
      if (prevAssess) {
        const prev = calcLearnerPoints(marks, l.adm, grade, term, prevAssess, subjects, cfg, curriculum, mode);
        if (prev.enteredCount > 0) {
          vap = current.totalPts - prev.totalPts;
        }
      }

      return { ...l, ...current, totalMarks, vap };
    })

    .sort((a, b) => {
      // Rank by Total Marks if the curriculum/grade group requires it
      if (shouldRankByMarks(grade, curriculum)) return b.totalMarks - a.totalMarks;
      return b.totalPts - a.totalPts;
    });

  let rank = 1;
  for (let i = 0; i < graded.length; i++) {
    const val = shouldRankByMarks(grade, curriculum) ? graded[i].totalMarks : graded[i].totalPts;
    const prevVal = i > 0 ? (shouldRankByMarks(grade, curriculum) ? graded[i-1].totalMarks : graded[i-1].totalPts) : null;
    if (i > 0 && val < prevVal) {
      rank = i + 1;
    }
    graded[i].rank = rank;
  }

  // Calculate Subject Ranks
  subjects.forEach(subj => {
    // 1. Collect scores for this subject from everyone who has one
    const subjectScores = graded
      .map(l => {
        const d = l.detail.find(x => x.subj === subj);
        return { adm: l.adm, score: (d && d.score !== null) ? d.score : null };
      })
      .filter(s => s.score !== null)
      .sort((a, b) => b.score - a.score);

    // 2. Assign ranks for this subject
    let sRank = 1;
    for (let i = 0; i < subjectScores.length; i++) {
      if (i > 0 && subjectScores[i].score < subjectScores[i - 1].score) {
        sRank = i + 1;
      }
      // 3. Attach rank to the learner's detail
      const learner = graded.find(l => l.adm === subjectScores[i].adm);
      const detail = learner.detail.find(d => d.subj === subj);
      if (detail) detail.sRank = sRank;
    }
  });

  return graded;
}

export function getProfessionalRemarks(pct, curriculum = 'CBC', tier = 'teacher', learnerId = '') {
  // Simple hash function for deterministic variation
  let hash = 0;
  const key = String(learnerId || '');
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const idx = Math.abs(hash);

  if (curriculum === 'CBC') {
    if (pct >= 80) {
      const teacherRemarks = [
        "An exceptional performance! You have shown mastery of the concepts. Keep it up.",
        "Outstanding performance. You have demonstrated superb conceptual understanding and consistent effort.",
        "Brilliant academic output! Your mastery of the learning areas is highly impressive.",
        "Excellent skills and work ethic. You consistently exceed expectations. Well done!"
      ];
      const principalRemarks = [
        "Outstanding result. You are a role model for academic excellence.",
        "A stellar report card. Your dedication to learning is exemplary.",
        "Superb work. Keep leading the school in academic brilliance.",
        "An exceptional profile of capability and diligence. Keep up the high standards."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 60) {
      const teacherRemarks = [
        "Good work! You meet the expectations in most areas. Aim higher next term.",
        "Commendable progress. Focus on polishing the few weak areas to reach the top level.",
        "Steady and quality performance. With slightly more attention to detail, you will excel.",
        "Active participation and good concept retention. Keep striving for better results."
      ];
      const principalRemarks = [
        "A commendable performance. Keep working hard to reach the top level.",
        "Solid results. You have shown continuous improvement. Aim for the highest band.",
        "Very promising grades. Continue focusing on your academic goals.",
        "A good set of results that reflects steady application. Keep pushing."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 40) {
      const teacherRemarks = [
        "Steady progress. You are approaching the required standards; more focus is needed in weaker areas.",
        "A fair performance. Consistently doing your homework and asking questions will boost your grade.",
        "Average output. You possess the capability to do much better with more focus.",
        "Showing potential, but concentration in class needs to improve to secure better marks."
      ];
      const principalRemarks = [
        "Fair performance. With more dedication, you can achieve better results.",
        "Average grades. Focus on regular revision and clarify doubts with your teachers.",
        "You are on the right track. Dedicate more hours to independent study.",
        "A satisfactory effort. Pushing yourself harder will unlock your true potential."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else {
      const teacherRemarks = [
        "Performance is below expectations. You need to put in more effort and seek guidance in challenging subjects.",
        "Needs close attention. Regular consultation with teachers and extra practice are highly recommended.",
        "Struggling to meet basic expectations. Let us work together to raise these grades next term.",
        "More effort required in basic conceptual areas. Daily revision is essential."
      ];
      const principalRemarks = [
        "A disappointing result. Urgent intervention and parent consultation are required.",
        "Immediate remedial support is recommended to help bridge the learning gap.",
        "Academic recovery plan is needed. Please consult with the class teacher.",
        "Needs to show significant change in attitude and study habits. Remedial action is urgent."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    }
  } else if (curriculum === 'CAMBRIDGE' || curriculum === 'BRITISH') {
    if (pct >= 80) {
      const teacherRemarks = [
        "An outstanding achievement. You consistently demonstrate deep understanding of the syllabus.",
        "Excellent examination performance. Your critical thinking and application are top-notch.",
        "Superb mastery of all subject content. An exemplary student in class.",
        "Highly analytical and precise work. Keep maintaining this exceptional standard."
      ];
      const principalRemarks = [
        "Excellent academic profile. Your commitment to your studies is highly commendable.",
        "An outstanding set of grades that places you among the top achievers.",
        "Exceptional results. You have set a high benchmark for your peers.",
        "Superb performance. This is the product of hard work and talent."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 70) {
      const teacherRemarks = [
        "Very good performance. You show a strong grasp of most subject areas.",
        "Highly commendable effort. Keep up the high level of interest and focus.",
        "A very strong report. Minor corrections in exam techniques will yield higher marks.",
        "Good analytical skills. Continue to participate actively in all discussions."
      ];
      const principalRemarks = [
        "A strong set of results. Keep up the consistent effort to reach the highest grades.",
        "Commendable academic progress. Pushing a bit harder will secure A* grades next term.",
        "Very good outcomes. You are showing excellent potential for leadership and academic success.",
        "Good progress. Keep fine-tuning your revision habits."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 60) {
      const teacherRemarks = [
        "Good effort overall, but there is room for improvement in specific topics.",
        "Satisfactory application. Pay more attention to structure in written responses.",
        "Solid work. Focus on consistent homework submissions and active revision.",
        "A steady performance. Ensure you review feedback from class tests carefully."
      ];
      const principalRemarks = [
        "Solid academic progress. Focus on refining your revision techniques for better outcomes.",
        "Good work. With more intensive study, you can elevate your performance further.",
        "Commendable grades. Build on this foundation for a stronger finish next term.",
        "Average results showing steady progression. Maintain this positive trajectory."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 50) {
      const teacherRemarks = [
        "Fair performance. More consistent revision and active class participation are required.",
        "Average output. Focus on understanding key definitions and applying them correctly.",
        "Passing mark, but you have potential for much higher grades with disciplined revision.",
        "More attentiveness and dedication in class are key to improving this score."
      ];
      const principalRemarks = [
        "Average results. You must dedicate more time to independent study to improve your grades.",
        "A fair report. Focus on establishing a structured daily study plan.",
        "Consistent work is key. You can achieve better results with more practice.",
        "Steady but needs improvement. Work closely with subject teachers."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else {
      const teacherRemarks = [
        "Below expected standard. Significant improvement is needed across multiple subjects.",
        "Struggling with fundamental concepts. Daily remedial work and tutoring are advised.",
        "Inadequate preparation for exams. A more serious approach to studies is required.",
        "Requires urgent attention. Regular consultations with teachers must be scheduled."
      ];
      const principalRemarks = [
        "Results are concerning. A meeting with parents is necessary to discuss an academic recovery plan.",
        "Urgent academic intervention is needed to help support the student's learning progress.",
        "Immediate change in focus and effort is required. Parents must monitor homework.",
        "A weak performance. Consistent guidance and remedial support are highly recommended."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    }
  } else if (curriculum === 'IB') {
    if (pct >= 85) {
      const teacherRemarks = [
        "Exceptional inquiry and critical thinking skills demonstrated across all subjects.",
        "Outstanding commitment to the IB learner profile. Your critical analysis is mature.",
        "Superb reflective practice and independent research skills. Keep it up.",
        "Excellent performance. You construct balanced and well-substantiated arguments."
      ];
      const principalRemarks = [
        "An outstanding profile reflecting the true traits of an IB learner.",
        "Stellar academic record. Your dedication to the rigors of the program is exemplary.",
        "Outstanding achievement. You excel in both academic coursework and creative thinking.",
        "A mature and highly successful academic output. Commendable work."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 70) {
      const teacherRemarks = [
        "Strong academic performance. Continue to develop your analytical and research skills.",
        "Very good progress. You demonstrate good inquiry and critical reflection.",
        "Commendable conceptual understanding. Focus on refining your essay structure.",
        "Good understanding of subject criteria. Keep up the high standard of work."
      ];
      const principalRemarks = [
        "Very good progress. Your dedication to the rigorous IB curriculum is evident.",
        "A strong report card. Maintain the momentum to reach the highest bands.",
        "Commendable application. With more effort, you can score top marks.",
        "Solid performance. Keep participating actively in collaborative learning."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 50) {
      const teacherRemarks = [
        "Satisfactory effort. Focus on deepening your conceptual understanding and application.",
        "Meeting requirements. Pay closer attention to the IB assessment criteria details.",
        "Average work. You need to show more initiative in classroom discussions.",
        "Steady progression, but more analytical depth is needed in assignments."
      ];
      const principalRemarks = [
        "Steady progress. More engagement with the core components will enhance your overall profile.",
        "Average performance. Establish a study schedule to manage coursework efficiently.",
        "Passing results. Consistent practice on past papers will build better exam confidence.",
        "Fair effort. Work with subject teachers to clarify challenging concepts."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else {
      const teacherRemarks = [
        "Performance requires significant attention. Seek support to grasp the fundamental concepts.",
        "Struggling with the conceptual framework. Daily review of lesson notes is critical.",
        "Coursework submission is irregular. A more serious commitment is needed immediately.",
        "Academic standing is weak. Immediate consultation with the IB coordinator is required."
      ];
      const principalRemarks = [
        "Academic intervention is required. Let us work together to build a stronger foundation.",
        "Urgent support and parent consultation are required to redirect study habits.",
        "Remedial assistance is recommended to help keep up with class work.",
        "An academic warning. Immediate improvement in performance and attendance is required."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    }
  } else {
    // Default fallback
    if (pct >= 80) {
      const teacherRemarks = [
        "Excellent performance. Keep up the high standard of work.",
        "Outstanding results. Your consistency and dedication are laudable.",
        "Excellent work ethics and class leadership. Keep shining.",
        "An impressive report. Your effort is well-rewarded. Congratulations."
      ];
      const principalRemarks = [
        "Outstanding academic achievement.",
        "A brilliant report. You are showing exemplary academic dedication.",
        "Stellar result. Keep up this magnificent performance.",
        "An exceptional outcome. The school is proud of your effort."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 60) {
      const teacherRemarks = [
        "Good work overall. Aim to push your boundaries further.",
        "Commendable progress. Focus on refining key weak areas.",
        "Solid achievement. With a bit more preparation, you can achieve an A grade.",
        "Good attentiveness and consistent assignment completions. Well done."
      ];
      const principalRemarks = [
        "Commendable effort and steady progress.",
        "Good progress. Keep working hard to reach the top tier.",
        "Solid grades. You are capable of even better scores with extra effort.",
        "A good set of results. Keep the momentum going."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else if (pct >= 40) {
      const teacherRemarks = [
        "Fair result. More focus and dedication will yield better outcomes.",
        "Average performance. Dedicate more time to daily review of notes.",
        "Satisfactory performance. You have the potential to excel with disciplined study.",
        "Fair attempt. Regular attendance and homework completion will improve this score."
      ];
      const principalRemarks = [
        "Average performance. Additional effort is required.",
        "Fair results. Organize your study time better to improve.",
        "Potential is clear but requires more consistent study habits.",
        "Satisfactory progress. Dedicate more focus to weaker subjects."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    } else {
      const teacherRemarks = [
        "Below average. You must work harder and seek help where needed.",
        "Struggling to keep up. Regular revision and remedial classes are advised.",
        "Inconsistent effort. A more disciplined approach to learning is necessary.",
        "Requires immediate remedial support. Please consult your subject teacher."
      ];
      const principalRemarks = [
        "Academic performance needs immediate improvement.",
        "Immediate remedial intervention is recommended.",
        "A concerning result. Please meet the class teacher to discuss progress.",
        "Parents are advised to closely monitor academic tasks and study habits."
      ];
      return tier === 'teacher' ? teacherRemarks[idx % teacherRemarks.length] : principalRemarks[idx % principalRemarks.length];
    }
  }
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
