/**
 * lib/curriculum/844.js — Kenya 8-4-4 System
 */

export const TERMS = [
  { id: 'T1', name: 'Term 1' },
  { id: 'T2', name: 'Term 2' },
  { id: 'T3', name: 'Term 3' }
];

export const ASSESSMENT_TYPES = [
  { key: 'op1', label: '📝 Opener'   },
  { key: 'mt1', label: '📖 Mid-Term' },
  { key: 'et1', label: '📋 End-Term' },
];

export const DEFAULT_WEIGHTS = { op1: 0, mt1: 0, et1: 1.0 }; // Typically 100% End Term for 844

export const LABELS = {
  grade: 'Class/Form',
  grades: 'Classes/Forms',
  subject: 'Subject',
  subjects: 'Subjects',
  assessment: 'Exam',
  assessments: 'Exams',
  learner: 'Student',
  learners: 'Students'
};

export const RESOURCES = [];

export const PRE    = ['BABY CLASS', 'NURSERY', 'PRE-UNIT'];
export const LOWER  = ['CLASS 1','CLASS 2','CLASS 3'];
export const UPPER  = ['CLASS 4','CLASS 5','CLASS 6','CLASS 7','CLASS 8'];
export const SECONDARY = ['FORM 1','FORM 2','FORM 3','FORM 4'];
export const ALL_GRADES = [...PRE, ...LOWER, ...UPPER, ...SECONDARY];

export const CATEGORIES = [
  { title: 'Pre-Primary', grades: PRE, color: '#8B5CF6', levelKey: 'pre' },
  { title: 'Lower Primary', grades: LOWER, color: '#10B981', levelKey: 'primary' },
  { title: 'Upper Primary', grades: UPPER, color: '#3B82F6', levelKey: 'primary' },
  { title: 'Secondary', grades: SECONDARY, color: '#EF4444', levelKey: 'senior' },
];

export function gradeGroup(grade) {
  if (PRE.includes(grade) || LOWER.includes(grade)) return 'primary13';
  if (UPPER.includes(grade)) return 'primary46';
  if (SECONDARY.includes(grade)) return 'senior';
  return 'primary13'; 
}

// 8-4-4 Grading scale typically A to E
export const KCSE_SCALE = [
  { min: 80, lv: 'A',  pts: 12, c: '#065F46', bg: '#D1FAE5', desc: 'Excellent' },
  { min: 75, lv: 'A-', pts: 11, c: '#059669', bg: '#A7F3D0', desc: 'Very Good' },
  { min: 70, lv: 'B+', pts: 10, c: '#10B981', bg: '#6EE7B7', desc: 'Good' },
  { min: 65, lv: 'B',  pts: 9,  c: '#34D399', bg: '#D1FAE5', desc: 'Good' },
  { min: 60, lv: 'B-', pts: 8,  c: '#1D4ED8', bg: '#BFDBFE', desc: 'Above Average' },
  { min: 55, lv: 'C+', pts: 7,  c: '#2563EB', bg: '#DBEAFE', desc: 'Above Average' },
  { min: 50, lv: 'C',  pts: 6,  c: '#3B82F6', bg: '#EFF6FF', desc: 'Average' },
  { min: 45, lv: 'C-', pts: 5,  c: '#60A5FA', bg: '#DBEAFE', desc: 'Average' },
  { min: 40, lv: 'D+', pts: 4,  c: '#D97706', bg: '#FEF3C7', desc: 'Below Average' },
  { min: 35, lv: 'D',  pts: 3,  c: '#EA580C', bg: '#FFEDD5', desc: 'Below Average' },
  { min: 30, lv: 'D-', pts: 2,  c: '#DC2626', bg: '#FEE2E2', desc: 'Poor' },
  { min: 0,  lv: 'E',  pts: 1,  c: '#991B1B', bg: '#FCA5A5', desc: 'Poor' },
];

export const KCPE_SCALE = [
  { min: 80, lv: 'A',  pts: 12, c: '#065F46', bg: '#D1FAE5', desc: 'Excellent' },
  { min: 75, lv: 'A-', pts: 11, c: '#059669', bg: '#A7F3D0', desc: 'Very Good' },
  { min: 70, lv: 'B+', pts: 10, c: '#10B981', bg: '#6EE7B7', desc: 'Good' },
  { min: 65, lv: 'B',  pts: 9,  c: '#34D399', bg: '#D1FAE5', desc: 'Good' },
  { min: 60, lv: 'B-', pts: 8,  c: '#1D4ED8', bg: '#BFDBFE', desc: 'Above Average' },
  { min: 55, lv: 'C+', pts: 7,  c: '#2563EB', bg: '#DBEAFE', desc: 'Above Average' },
  { min: 50, lv: 'C',  pts: 6,  c: '#3B82F6', bg: '#EFF6FF', desc: 'Average' },
  { min: 45, lv: 'C-', pts: 5,  c: '#60A5FA', bg: '#DBEAFE', desc: 'Average' },
  { min: 40, lv: 'D+', pts: 4,  c: '#D97706', bg: '#FEF3C7', desc: 'Below Average' },
  { min: 35, lv: 'D',  pts: 3,  c: '#EA580C', bg: '#FFEDD5', desc: 'Below Average' },
  { min: 30, lv: 'D-', pts: 2,  c: '#DC2626', bg: '#FEE2E2', desc: 'Poor' },
  { min: 0,  lv: 'E',  pts: 1,  c: '#991B1B', bg: '#FCA5A5', desc: 'Poor' },
];

export const GRADING_CONFIG = [
  { key: 'primary', title: '🟢 Primary (Class 1-8)', scale: KCPE_SCALE },
  { key: 'senior', title: '🔴 Secondary (Form 1-4)', scale: KCSE_SCALE },
];

export function shouldRankByMarks(grade) {
  return true; // 844 always ranks by marks
}

export const DEFAULT_SUBJECTS = {
  'CLASS 1': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 2': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 3': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 4': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 5': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 6': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 7': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'CLASS 8': ['Mathematics','English','Kiswahili','Science','Social Studies','C.R.E'],
  'FORM 1': ['Mathematics','English','Kiswahili','Biology','Chemistry','Physics','History','Geography','C.R.E','Business Studies','Agriculture'],
  'FORM 2': ['Mathematics','English','Kiswahili','Biology','Chemistry','Physics','History','Geography','C.R.E','Business Studies','Agriculture'],
  'FORM 3': ['Mathematics','English','Kiswahili','Biology','Chemistry','Physics','History','Geography','C.R.E','Business Studies','Agriculture'],
  'FORM 4': ['Mathematics','English','Kiswahili','Biology','Chemistry','Physics','History','Geography','C.R.E','Business Studies','Agriculture'],
};

export function isJSSGrade(grade) {
  return false;
}

export function gInfo(score, grade, cfg = null, subject = null, mode = 'per-level') {
  const scale = getScale(grade, cfg, subject, mode);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null, subject = null, mode = 'per-level') {
  let levelKey = 'primary';
  if (SECONDARY.includes(grade)) levelKey = 'senior';

  if (mode === 'per-subject' && subject && cfg?.subjects?.[subject]) {
    const sCfg = cfg.subjects[subject];
    if (sCfg[levelKey]) return sCfg[levelKey];
    if (Array.isArray(sCfg)) return sCfg;
  }

  if (mode === 'uniform' && cfg?.uniform) return cfg.uniform;

  if (levelKey === 'senior') return cfg?.senior || KCSE_SCALE;
  return cfg?.primary || KCPE_SCALE;
}

export function maxPts(grade, subjects = null) {
  return 100; // Not used as CBC, out of 100 per subject
}

export function getDistributionBuckets(grade) {
  return { 'A':0, 'A-':0, 'B+':0, 'B':0, 'B-':0, 'C+':0, 'C':0, 'C-':0, 'D+':0, 'D':0, 'D-':0, 'E':0 };
}

export function getGradeColors() {
  return { 
    'A': '#065F46', 'A-': '#059669', 'B+': '#10B981', 'B': '#34D399', 'B-': '#1D4ED8', 'C+': '#2563EB', 'C': '#3B82F6', 'C-': '#60A5FA', 'D+': '#D97706', 'D': '#EA580C', 'D-': '#DC2626', 'E': '#991B1B'
  };
}
