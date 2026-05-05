/**
 * lib/curriculum/british.js — British National Curriculum
 */

export const TERMS = [
  { id: 'T1', name: 'Autumn Term' },
  { id: 'T2', name: 'Spring Term' },
  { id: 'T3', name: 'Summer Term' }
];

export const RESOURCES = [
  { title: 'BBC Bitesize', url: 'https://www.bbc.co.uk/bitesize', desc: 'Standard lessons for KS1-5.', icon: '🎓', cat: 'Official' },
  { title: 'Pearson Edexcel', url: 'https://qualifications.pearson.com/', desc: 'IGCSE and A-Level resources.', icon: '📘', cat: 'Official' },
  { title: 'Cambridge International', url: 'https://www.cambridgeinternational.org/', desc: 'Syllabuses and past papers.', icon: '🏛️', cat: 'Official' },
  { title: 'TES Resources', url: 'https://www.tes.com/teaching-resources', desc: 'Teacher-made lesson plans.', icon: '🏫', cat: 'Teacher' },
  { title: 'Oxford Owl', url: 'https://www.oxfordowl.co.uk/', desc: 'Primary reading and math support.', icon: '🦉', cat: 'Primary' },
];

export const EYFS     = ['NURSERY','RECEPTION'];
export const KS1      = ['YEAR 1','YEAR 2'];
export const KS2      = ['YEAR 3','YEAR 4','YEAR 5','YEAR 6'];
export const KS3      = ['YEAR 7','YEAR 8','YEAR 9'];
export const KS4      = ['YEAR 10','YEAR 11']; // IGCSE
export const KS5      = ['YEAR 12','YEAR 13']; // A-Level
export const ALL_GRADES = [...EYFS, ...KS1, ...KS2, ...KS3, ...KS4, ...KS5];

export function gradeGroup(grade) {
  if (EYFS.includes(grade)) return 'eyfs';
  if (KS1.includes(grade))  return 'ks1';
  if (KS2.includes(grade))  return 'ks2';
  if (KS3.includes(grade))  return 'ks3';
  if (KS4.includes(grade))  return 'ks4_igcse';
  return 'ks5_alevel';
}

export function shouldRankByMarks(grade) {
  return [...EYFS, ...KS1, ...KS2].includes(grade);
}

const PRIMARY_SUBJS = ['English','Mathematics','Science','History','Geography','Computing','Art & Design','Music','Physical Education','PSHE'];
const IGCSE_SUBJS = ['English Language','Mathematics','Biology','Chemistry','Physics','ICT','Business Studies','Geography','History','Economics'];
const ALEVEL_SUBJS = ['Mathematics','Biology','Chemistry','Physics','Business','Economics','Computer Science','Psychology','Literature','Art'];

export const DEFAULT_SUBJECTS = {
  'NURSERY':   ['Communication','Physical Dev','PSED','Literacy','Mathematics','Understanding the World','Expressive Arts'],
  'RECEPTION': ['Communication','Physical Dev','PSED','Literacy','Mathematics','Understanding the World','Expressive Arts'],
  'YEAR 1': PRIMARY_SUBJS,
  'YEAR 2': PRIMARY_SUBJS,
  'YEAR 3': PRIMARY_SUBJS,
  'YEAR 4': PRIMARY_SUBJS,
  'YEAR 5': PRIMARY_SUBJS,
  'YEAR 6': PRIMARY_SUBJS,
  'YEAR 7': PRIMARY_SUBJS,
  'YEAR 8': PRIMARY_SUBJS,
  'YEAR 9': PRIMARY_SUBJS,
  'YEAR 10': IGCSE_SUBJS,
  'YEAR 11': IGCSE_SUBJS,
  'YEAR 12': ALEVEL_SUBJS,
  'YEAR 13': ALEVEL_SUBJS,
};

// IGCSE 9-1 Scale
export const IGCSE_SCALE = [
  { min: 90, lv: '9', pts: 9, c: '#065F46', bg: '#D1FAE5', desc: 'Outstanding' },
  { min: 80, lv: '8', pts: 8, c: '#059669', bg: '#A7F3D0', desc: 'Excellent' },
  { min: 70, lv: '7', pts: 7, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Very Good' },
  { min: 60, lv: '6', pts: 6, c: '#2563EB', bg: '#DBEAFE', desc: 'Good' },
  { min: 50, lv: '5', pts: 5, c: '#B45309', bg: '#FDE68A', desc: 'Strong Pass' },
  { min: 40, lv: '4', pts: 4, c: '#92400E', bg: '#FEF3C7', desc: 'Standard Pass' },
  { min: 30, lv: '3', pts: 3, c: '#DC2626', bg: '#FEE2E2', desc: 'Working Towards' },
  { min: 20, lv: '2', pts: 2, c: '#991B1B', bg: '#FCA5A5', desc: 'Below Pass' },
  { min:  0, lv: 'U', pts: 0, c: '#000000', bg: '#F1F5F9', desc: 'Ungraded' },
];

// A-Level Scale
export const ALEVEL_SCALE = [
  { min: 80, lv: 'A*', pts: 6, c: '#065F46', bg: '#D1FAE5', desc: 'Outstanding' },
  { min: 70, lv: 'A',  pts: 5, c: '#059669', bg: '#A7F3D0', desc: 'Excellent' },
  { min: 60, lv: 'B',  pts: 4, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Very Good' },
  { min: 50, lv: 'C',  pts: 3, c: '#B45309', bg: '#FDE68A', desc: 'Good' },
  { min: 40, lv: 'D',  pts: 2, c: '#92400E', bg: '#FEF3C7', desc: 'Satisfactory' },
  { min: 30, lv: 'E',  pts: 1, c: '#DC2626', bg: '#FEE2E2', desc: 'Pass' },
  { min:  0, lv: 'U',  pts: 0, c: '#000000', bg: '#F1F5F9', desc: 'Ungraded' },
];

// Primary Scale (Emerging/Expected/Exceeding)
export const PRIMARY_SCALE = [
  { min: 80, lv: 'Exceeding', pts: 4, c: '#065F46', bg: '#D1FAE5', desc: 'Exceeding Expectations' },
  { min: 50, lv: 'Expected',  pts: 3, c: '#1D4ED8', bg: '#DBEAFE', desc: 'Meeting Expectations' },
  { min: 30, lv: 'Emerging',  pts: 2, c: '#92400E', bg: '#FEF3C7', desc: 'Working Towards Expectations' },
  { min:  0, lv: 'Below',     pts: 1, c: '#991B1B', bg: '#FEE2E2', desc: 'Below Expectations' },
];

export function isSecondary(grade) {
  return KS4.includes(grade) || KS5.includes(grade);
}

export function gInfo(score, grade, cfg = null) {
  const scale = getScale(grade, cfg);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null) {
  if (KS5.includes(grade)) {
    return cfg?.ks5 || ALEVEL_SCALE;
  } else if (KS4.includes(grade)) {
    return cfg?.ks4 || IGCSE_SCALE;
  } else {
    return cfg?.primary || PRIMARY_SCALE;
  }
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  if (KS5.includes(grade)) return subjs.length * 6;
  if (KS4.includes(grade)) return subjs.length * 9;
  return subjs.length * 4;
}
export function getDistributionBuckets(grade) {
  if (KS5.includes(grade)) {
    return { 'A*':0, 'A':0, 'B':0, 'C':0, 'D':0, 'E':0, 'U':0 };
  } else if (KS4.includes(grade)) {
    return { '9':0, '8':0, '7':0, '6':0, '5':0, '4':0, '3':0, '2':0, 'U':0 };
  } else {
    return { 'Exceeding':0, 'Expected':0, 'Emerging':0, 'Below':0 };
  }
}

export function getGradeColors() {
  return { 
    '9': '#065F46', '8': '#059669', '7': '#1D4ED8', '6': '#2563EB', '5': '#B45309', '4': '#92400E', '3': '#DC2626', '2': '#991B1B', 'U': '#64748B',
    'A*': '#065F46', 'A': '#059669', 'B': '#1D4ED8', 'C': '#B45309', 'D': '#92400E', 'E': '#DC2626',
    'Exceeding': '#059669', 'Expected': '#2563EB', 'Emerging': '#D97706', 'Below': '#DC2626'
  };
}
