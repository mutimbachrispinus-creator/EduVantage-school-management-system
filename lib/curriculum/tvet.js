/**
 * lib/curriculum/tvet.js — TVET / CBET (Competency-Based Education and Training)
 * 
 * Follows CDACC (Curriculum Development, Assessment and Certification Council) 
 * and KNEC standards for vocational and technical training.
 */

export const name = 'TVET / CBET';
export const code = 'TVET';

export const TERMS = [
  { id: 'T1', name: 'Term 1 / Trimester 1' },
  { id: 'T2', name: 'Term 2 / Trimester 2' },
  { id: 'T3', name: 'Term 3 / Trimester 3' }
];

export const ASSESSMENT_TYPES = [
  { key: 'op1', label: '📝 Initial Assessment' },
  { key: 'mt1', label: '📖 Formative Assessment (CAT)' },
  { key: 'et1', label: '📋 Summative Assessment' },
];

export const LABELS = {
  grade: 'Level',
  grades: 'Levels',
  subject: 'Unit of Competency',
  subjects: 'Units of Competency',
  assessment: 'Assessment',
  assessments: 'Assessments',
  learner: 'Trainee',
  learners: 'Trainees',
  attendance: 'Attendance'
};

export const ARTISAN     = ['ARTISAN LEVEL 1', 'ARTISAN LEVEL 2', 'ARTISAN LEVEL 3'];
export const CERTIFICATE = ['CERTIFICATE LEVEL 4', 'CERTIFICATE LEVEL 5'];
export const DIPLOMA     = ['DIPLOMA LEVEL 6'];
export const ALL_GRADES  = [...ARTISAN, ...CERTIFICATE, ...DIPLOMA];

export const CATEGORIES = [
  { title: 'Artisan', grades: ARTISAN, color: '#8B5CF6', levelKey: 'artisan' },
  { title: 'Craft / Certificate', grades: CERTIFICATE, color: '#10B981', levelKey: 'certificate' },
  { title: 'Diploma', grades: DIPLOMA, color: '#3B82F6', levelKey: 'diploma' },
];

export function gradeGroup(grade) {
  if (ARTISAN.includes(grade)) return 'artisan';
  if (CERTIFICATE.includes(grade)) return 'certificate';
  if (DIPLOMA.includes(grade)) return 'diploma';
  return 'certificate';
}

export const TVET_SCALE = [
  { min: 80, lv: 'Distinction', pts: 4, c: '#065F46', bg: '#D1FAE5', desc: 'Competent with Distinction' },
  { min: 65, lv: 'Credit',      pts: 3, c: '#059669', bg: '#A7F3D0', desc: 'Competent with Credit' },
  { min: 40, lv: 'Pass',        pts: 2, c: '#1D4ED8', bg: '#DBEAFE', desc: 'Competent' },
  { min:  0, lv: 'Referral',    pts: 1, c: '#DC2626', bg: '#FEE2E2', desc: 'Not Yet Competent (Referral)' },
];

export function gInfo(score, grade, cfg = null, subject = null, mode = 'per-level') {
  const scale = TVET_SCALE;
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export const DEFAULT_SUBJECTS = {
  'ARTISAN LEVEL 1': ['Communication Skills', 'Numeracy Skills', 'Entrepreneurial Skills', 'Applied Science', 'Workshop Practice'],
  'CERTIFICATE LEVEL 4': ['Core Competency 1', 'Core Competency 2', 'Communication Skills', 'ICT Skills', 'Entrepreneurship'],
  'DIPLOMA LEVEL 6': ['Advanced Unit 1', 'Advanced Unit 2', 'Research Methods', 'Project Management', 'Financial Management'],
};

export function shouldRankByMarks(grade) {
  return true; // TVET usually uses percentage marks for ranking even if grading is competency-based
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  return subjs.length * 4;
}

export function getDistributionBuckets(grade) {
  return { 'Distinction': 0, 'Credit': 0, 'Pass': 0, 'Referral': 0 };
}

export function getGradeColors() {
  return { 
    'Distinction': '#059669', 
    'Credit': '#10B981', 
    'Pass': '#3B82F6', 
    'Referral': '#DC2626' 
  };
}
