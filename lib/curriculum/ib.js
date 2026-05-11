/**
 * lib/curriculum/ib.js — International Baccalaureate (IB)
 */

export const TERMS = [
  { id: 'T1', name: 'Term 1' },
  { id: 'T2', name: 'Term 2' },
  { id: 'T3', name: 'Term 3' }
];

export const ASSESSMENT_TYPES = [
  { key: 'f1', label: '📝 Formative' },
  { key: 's1', label: '📖 Summative' },
  { key: 'p1', label: '📋 Project'   },
];

export const DEFAULT_WEIGHTS = { f1: 0.3, s1: 0.5, p1: 0.2 };

export const RESOURCES = [
  { title: 'IBO Official Site', url: 'https://www.ibo.org/', desc: 'Global standards for PYP, MYP, DP.', icon: '🌐', cat: 'Official' },
  { title: 'ManageBac', url: 'https://www.managebac.com/', desc: 'Common IB management platform.', icon: '🎓', cat: 'Tools' },
  { title: 'InThinking', url: 'https://www.thinkib.net/', desc: 'Resources for IB Diploma teachers.', icon: '💡', cat: 'Teacher' },
  { title: 'Pamoja Education', url: 'https://pamojaeducation.com/', desc: 'IB authorized online courses.', icon: '💻', cat: 'Courses' },
  { title: 'Kognity', url: 'https://kognity.com/', desc: 'Intelligent textbooks for IB.', icon: '📖', cat: 'Materials' },
];

export const PYP = ['PYP 1','PYP 2','PYP 3','PYP 4','PYP 5'];
export const MYP = ['MYP 1','MYP 2','MYP 3','MYP 4','MYP 5']; // Grade 6-10
export const DP  = ['DP 1','DP 2']; // Grade 11-12
export const ALL_GRADES = [...PYP, ...MYP, ...DP];

export const CATEGORIES = [
  { title: 'PYP (Primary)', grades: PYP, color: '#10B981', levelKey: 'primary' },
  { title: 'MYP (Middle)', grades: MYP, color: '#2563EB', levelKey: 'junior' },
  { title: 'DP (Diploma)', grades: DP, color: '#EF4444', levelKey: 'senior' },
];

export function gradeGroup(grade) {
  if (PYP.includes(grade)) return 'pyp';
  if (MYP.includes(grade)) return 'myp';
  return 'senior';
}

export const IB_SCALE = [
  { min: 85, lv: '7', pts: 7, c: '#065F46', bg: '#D1FAE5', desc: 'Excellent' },
  { min: 75, lv: '6', pts: 6, c: '#059669', bg: '#A7F3D0', desc: 'Very Good' },
  { min: 65, lv: '5', pts: 5, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Good' },
  { min: 50, lv: '4', pts: 4, c: '#2563EB', bg: '#DBEAFE', desc: 'Satisfactory' },
  { min: 40, lv: '3', pts: 3, c: '#B45309', bg: '#FDE68A', desc: 'Mediocre' },
  { min: 25, lv: '2', pts: 2, c: '#92400E', bg: '#FEF3C7', desc: 'Poor' },
  { min:  0, lv: '1', pts: 1, c: '#DC2626', bg: '#FEE2E2', desc: 'Very Poor' },
];

export const GRADING_CONFIG = [
  { key: 'scale', title: '🌐 IB Unified Scale (1-7)', scale: IB_SCALE },
];

export function shouldRankByMarks(grade) {
  return PYP.includes(grade);
}

const PYP_SUBJS = ['Language','Mathematics','Science','Social Studies','Arts','Physical Education'];
const MYP_SUBJS = ['Language & Literature','Language Acquisition','Individuals & Societies','Sciences','Mathematics','Arts','Physical Education','Design'];
const DP_SUBJS  = ['Language A','Language B','Individuals & Societies','Experimental Sciences','Mathematics','The Arts'];

export const DEFAULT_SUBJECTS = {
  'PYP 1': PYP_SUBJS, 'PYP 2': PYP_SUBJS, 'PYP 3': PYP_SUBJS, 'PYP 4': PYP_SUBJS, 'PYP 5': PYP_SUBJS,
  'MYP 1': MYP_SUBJS, 'MYP 2': MYP_SUBJS, 'MYP 3': MYP_SUBJS, 'MYP 4': MYP_SUBJS, 'MYP 5': MYP_SUBJS,
  'DP 1':  DP_SUBJS,  'DP 2':  DP_SUBJS,
};


export function gInfo(score, grade, cfg = null, subject = null) {
  const scale = getScale(grade, cfg, subject);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null, subject = null) {
  // IB typically uses a unified scale, but we support subject-specific overrides
  const levelKey = 'scale';
  if (subject && cfg?.subjects?.[subject]?.[levelKey]) return cfg.subjects[subject][levelKey];
  if (subject && cfg?.subjects?.[subject] && Array.isArray(cfg.subjects[subject])) return cfg.subjects[subject];

  if (cfg?.uniform) return cfg.uniform;
  return cfg?.scale || IB_SCALE;
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  return subjs.length * 7;
}
export function getDistributionBuckets() {
  return { '7':0, '6':0, '5':0, '4':0, '3':0, '2':0, '1':0 };
}

export function getGradeColors() {
  return { 
    '7': '#065F46', '6': '#059669', '5': '#1D4ED8', '4': '#2563EB', '3': '#B45309', '2': '#92400E', '1': '#DC2626'
  };
}
