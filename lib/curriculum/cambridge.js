/**
 * lib/curriculum/cambridge.js — Cambridge Assessment International Education
 */

export const TERMS = [
  { id: 'T1', name: 'Advent Term' },
  { id: 'T2', name: 'Lent Term' },
  { id: 'T3', name: 'Trinity Term' }
];

export const ASSESSMENT_TYPES = [
  { key: 'op1', label: '📝 Diagnostic' },
  { key: 'mt1', label: '📖 Mid-Term' },
  { key: 'et1', label: '📋 Final Exam' },
];

export const DEFAULT_WEIGHTS = { op1: 0.1, mt1: 0.3, et1: 0.6 };

export const RESOURCES = [
  { title: 'Cambridge International', url: 'https://www.cambridgeinternational.org/', desc: 'Syllabuses, past papers, and training.', icon: '🏛️', cat: 'Official' },
  { title: 'Cambridge Primary', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-primary/', desc: 'Resources for Stages 1-6.', icon: '🧒', cat: 'Primary' },
  { title: 'Cambridge Lower Secondary', url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-lower-secondary/', desc: 'Resources for Stages 7-9.', icon: '🧑', cat: 'Secondary' },
  { title: 'PapaCambridge', url: 'https://papacambridge.com/', desc: 'Largest collection of past papers.', icon: '📚', cat: 'Resources' },
  { title: 'GCE Guide', url: 'https://gceguide.com/', desc: 'Past papers and resources for IGCSE/A-Level.', icon: '📖', cat: 'Resources' },
];

export const PRIMARY    = ['STAGE 1','STAGE 2','STAGE 3','STAGE 4','STAGE 5','STAGE 6'];
export const SECONDARY1 = ['STAGE 7','STAGE 8','STAGE 9']; // Lower Secondary / Checkpoint
export const IGCSE      = ['STAGE 10','STAGE 11']; // IGCSE
export const ALEVEL     = ['STAGE 12','STAGE 13']; // AS & A Level
export const ALL_GRADES = ['KINDERGARTEN', 'RECEPTION', ...PRIMARY, ...SECONDARY1, ...IGCSE, ...ALEVEL];

export const CATEGORIES = [
  { title: 'Early Years', grades: ['KINDERGARTEN', 'RECEPTION'], color: '#8B5CF6' },
  { title: 'Primary', grades: PRIMARY, color: '#10B981' },
  { title: 'Lower Secondary', grades: SECONDARY1, color: '#3B82F6' },
  { title: 'IGCSE', grades: IGCSE, color: '#F59E0B' },
  { title: 'A-Level', grades: ALEVEL, color: '#EF4444' },
];

export function gradeGroup(grade) {
  if (['KINDERGARTEN','RECEPTION'].includes(grade)) return 'ks1';
  if (PRIMARY.includes(grade))    return 'ks2';
  if (SECONDARY1.includes(grade)) return 'ks3';
  if (IGCSE.includes(grade))      return 'igcse';
  if (ALEVEL.includes(grade))     return 'senior';
  return 'ks2';
}

export const IGCSE_SCALE = [
  { min: 90, lv: 'A*', pts: 8, c: '#065F46', bg: '#D1FAE5', desc: 'Outstanding' },
  { min: 80, lv: 'A',  pts: 7, c: '#059669', bg: '#A7F3D0', desc: 'Excellent' },
  { min: 70, lv: 'B',  pts: 6, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Very Good' },
  { min: 60, lv: 'C',  pts: 5, c: '#2563EB', bg: '#DBEAFE', desc: 'Good' },
  { min: 50, lv: 'D',  pts: 4, c: '#B45309', bg: '#FDE68A', desc: 'Satisfactory' },
  { min: 40, lv: 'E',  pts: 3, c: '#92400E', bg: '#FEF3C7', desc: 'Pass' },
  { min: 30, lv: 'F',  pts: 2, c: '#DC2626', bg: '#FEE2E2', desc: 'Fail' },
  { min: 20, lv: 'G',  pts: 1, c: '#991B1B', bg: '#FCA5A5', desc: 'Fail' },
  { min:  0, lv: 'U',  pts: 0, c: '#000000', bg: '#F1F5F9', desc: 'Ungraded' },
];

export const ALEVEL_SCALE = [
  { min: 80, lv: 'A*', pts: 6, c: '#065F46', bg: '#D1FAE5', desc: 'Outstanding' },
  { min: 70, lv: 'A',  pts: 5, c: '#059669', bg: '#A7F3D0', desc: 'Excellent' },
  { min: 60, lv: 'B',  pts: 4, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Very Good' },
  { min: 50, lv: 'C',  pts: 3, c: '#B45309', bg: '#FDE68A', desc: 'Good' },
  { min: 40, lv: 'D',  pts: 2, c: '#92400E', bg: '#FEF3C7', desc: 'Satisfactory' },
  { min: 30, lv: 'E',  pts: 1, c: '#DC2626', bg: '#FEE2E2', desc: 'Pass' },
  { min:  0, lv: 'U',  pts: 0, c: '#000000', bg: '#F1F5F9', desc: 'Ungraded' },
];

export const CAMBRIDGE_STAGE_SCALE = [
  { min: 85, lv: 'Gold',   pts: 4, c: '#92400E', bg: '#FEF3C7', desc: 'Exceeding Expectations' },
  { min: 65, lv: 'Silver', pts: 3, c: '#475569', bg: '#F1F5F9', desc: 'Meeting Expectations' },
  { min: 40, lv: 'Bronze', pts: 2, c: '#B45309', bg: '#FFedd5', desc: 'Approaching Expectations' },
  { min:  0, lv: 'Below',  pts: 1, c: '#991B1B', bg: '#FEE2E2', desc: 'Below Expectations' },
];

export const GRADING_CONFIG = [
  { key: 'stage', title: '🟢 Primary & Lower Secondary (Stages 1-9)', scale: CAMBRIDGE_STAGE_SCALE },
  { key: 'igcse', title: '🟡 IGCSE (Stages 10-11)', scale: IGCSE_SCALE },
  { key: 'alevel', title: '🔴 A-Level (Stages 12-13)', scale: ALEVEL_SCALE },
];

export function shouldRankByMarks(grade) {
  return [...PRIMARY, ...SECONDARY1].includes(grade);
}

const PRIMARY_SUBJS = ['English','Mathematics','Science','ICT Starters','Art & Design','Music','Physical Education','Global Perspectives'];
const SECONDARY_SUBJS = ['English','Mathematics','Science','ICT','Global Perspectives','History','Geography','Art & Design','Music'];
const IGCSE_SUBJS = ['English Language','Mathematics','Biology','Chemistry','Physics','ICT','Business Studies','Geography','Economics','History'];
const ALEVEL_SUBJS = ['Mathematics','Biology','Chemistry','Physics','Business','Economics','Computer Science','Accounting','Sociology','Psychology'];

export const DEFAULT_SUBJECTS = {
  'KINDERGARTEN': ['Communication','Physical Dev','Literacy','Mathematics','Understanding the World','Expressive Arts'],
  'RECEPTION':    ['Communication','Physical Dev','Literacy','Mathematics','Understanding the World','Expressive Arts'],
  'STAGE 1': PRIMARY_SUBJS,
  'STAGE 2': PRIMARY_SUBJS,
  'STAGE 3': PRIMARY_SUBJS,
  'STAGE 4': PRIMARY_SUBJS,
  'STAGE 5': PRIMARY_SUBJS,
  'STAGE 6': PRIMARY_SUBJS,
  'STAGE 7': SECONDARY_SUBJS,
  'STAGE 8': SECONDARY_SUBJS,
  'STAGE 9': SECONDARY_SUBJS,
  'STAGE 10': IGCSE_SUBJS,
  'STAGE 11': IGCSE_SUBJS,
  'STAGE 12': ALEVEL_SUBJS,
  'STAGE 13': ALEVEL_SUBJS,
};

// Cambridge IGCSE A*-G Scale (Alternative to British 9-1)

export function isSecondary(grade) {
  return IGCSE.includes(grade) || ALEVEL.includes(grade);
}

export function gInfo(score, grade, cfg = null) {
  const scale = getScale(grade, cfg);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null) {
  if (ALEVEL.includes(grade)) return cfg?.alevel || ALEVEL_SCALE;
  if (IGCSE.includes(grade)) return cfg?.igcse  || IGCSE_SCALE;
  return cfg?.stage || CAMBRIDGE_STAGE_SCALE;
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  if (ALEVEL.includes(grade)) return subjs.length * 6;
  if (IGCSE.includes(grade)) return subjs.length * 8;
  return subjs.length * 4;
}

export function getDistributionBuckets(grade) {
  if (ALEVEL.includes(grade)) return { 'A*':0, 'A':0, 'B':0, 'C':0, 'D':0, 'E':0, 'U':0 };
  if (IGCSE.includes(grade))  return { 'A*':0, 'A':0, 'B':0, 'C':0, 'D':0, 'E':0, 'F':0, 'G':0, 'U':0 };
  return { 'Gold':0, 'Silver':0, 'Bronze':0, 'Below':0 };
}

export function getGradeColors() {
  return { 
    'A*': '#065F46', 'A': '#059669', 'B': '#1D4ED8', 'C': '#2563EB', 'D': '#B45309', 'E': '#92400E', 'F': '#DC2626', 'G': '#991B1B', 'U': '#64748B',
    'Gold': '#B45309', 'Silver': '#64748B', 'Bronze': '#92400E', 'Below': '#DC2626'
  };
}
