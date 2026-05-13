/**
 * lib/curriculum/montessori.js — Montessori Curriculum Definition
 */

export const TERMS = [
  { id: 'T1', name: 'Term 1' },
  { id: 'T2', name: 'Term 2' },
  { id: 'T3', name: 'Term 3' }
];

export const ASSESSMENT_TYPES = [
  { key: 'op1', label: '🌱 Observations' },
  { key: 'mt1', label: '📖 Mid-Cycle Assessment' },
  { key: 'et1', label: '🏆 Final Review' },
];

export const DEFAULT_WEIGHTS = { op1: 0.2, mt1: 0.3, et1: 0.5 };

export const LABELS = {
  grade: 'Level',
  grades: 'Levels',
  subject: 'Learning Area',
  subjects: 'Learning Areas',
  assessment: 'Observation',
  assessments: 'Observations',
  learner: 'Learner',
  learners: 'Learners'
};

export const RESOURCES = [
  { title: 'AMI Global', url: 'https://montessori-ami.org/', desc: 'Association Montessori Internationale official resources.', icon: '🌍', cat: 'Official' },
  { title: 'American Montessori Society', url: 'https://amshq.org/', desc: 'AMS curriculum and research hub.', icon: '🏛️', cat: 'Official' },
  { title: 'Montessori Guide', url: 'https://montessoriguide.org/', desc: 'Video-based resources for Montessori teachers.', icon: '🎥', cat: 'Videos' },
  { title: 'Living Montessori Now', url: 'https://livingmontessorinow.com/', desc: 'Practical activity ideas and printables.', icon: '🏠', cat: 'Practical' },
];

export const INFANT     = ['NIDO (0-1.5Y)', 'TODDLER (1.5-3Y)'];
export const PRIMARY    = ['CHILDRENS HOUSE (3-6Y)'];
export const LOWER_ELEM = ['LOWER ELEMENTARY (6-9Y)'];
export const UPPER_ELEM = ['UPPER ELEMENTARY (9-12Y)'];
export const SECONDARY  = ['ERDKINDER (12-15Y)', 'SENIOR (15-18Y)'];

export const ALL_GRADES = [...INFANT, ...PRIMARY, ...LOWER_ELEM, ...UPPER_ELEM, ...SECONDARY];

export const CATEGORIES = [
  { title: 'Infant & Toddler', grades: INFANT, color: '#EC4899', levelKey: 'pre' },
  { title: 'Primary', grades: PRIMARY, color: '#8B5CF6', levelKey: 'pre' },
  { title: 'Lower Elementary', grades: LOWER_ELEM, color: '#10B981', levelKey: 'primary' },
  { title: 'Upper Elementary', grades: UPPER_ELEM, color: '#3B82F6', levelKey: 'primary' },
  { title: 'Secondary School', grades: SECONDARY, color: '#F59E0B', levelKey: 'junior' },
];

export function gradeGroup(grade) {
  if (INFANT.includes(grade) || PRIMARY.includes(grade)) return 'early_years';
  if (LOWER_ELEM.includes(grade) || UPPER_ELEM.includes(grade)) return 'elementary';
  return 'secondary';
}

export const MASTERY_SCALE = [
  { min: 90, lv: 'M', pts: 4, c: '#065F46', bg: '#D1FAE5', desc: 'Mastered — Demonstrates independence and can teach others.' },
  { min: 70, lv: 'P', pts: 3, c: '#1D4ED8', bg: '#DBEAFE', desc: 'Proficient — Working comfortably and consistently.' },
  { min: 40, lv: 'D', pts: 2, c: '#B45309', bg: '#FEF3C7', desc: 'Developing — Working with some assistance.' },
  { min:  0, lv: 'E', pts: 1, c: '#991B1B', bg: '#FEE2E2', desc: 'Emerging — Initial interest and introduction.' },
];

export const GRADING_CONFIG = [
  { key: 'montessori', title: '🌀 Montessori Mastery Scale', scale: MASTERY_SCALE },
];

export function shouldRankByMarks(grade) {
  return false; // Montessori typically avoids competitive ranking
}

export const DEFAULT_SUBJECTS = {
  'NIDO (0-1.5Y)': ['Sensory-Motor','Language Development','Physical Development','Social-Emotional'],
  'TODDLER (1.5-3Y)': ['Practical Life','Language','Sensorial','Fine Motor','Large Motor'],
  'CHILDRENS HOUSE (3-6Y)': ['Practical Life','Sensorial','Language','Mathematics','Cultural Subjects'],
  'LOWER ELEMENTARY (6-9Y)': ['Mathematics','Geometry','Language Arts','History','Geography','Biology','Creative Arts'],
  'UPPER ELEMENTARY (9-12Y)': ['Mathematics','Geometry','Language Arts','History','Geography','Biology','Physics','Chemistry','Creative Arts'],
  'ERDKINDER (12-15Y)': ['Mathematics','Science','Humanities','Occupations','Creative Expression','Language Arts'],
  'SENIOR (15-18Y)': ['Advanced Mathematics','Natural Sciences','Social Studies','Literature','Physical Education','Community Service'],
};

export function gInfo(score, grade, cfg = null, subject = null, mode = 'per-level') {
  const scale = getScale(grade, cfg, subject, mode);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null, subject = null, mode = 'per-level') {
  // Montessori generally uses a uniform scale across all levels
  if (mode === 'per-subject' && subject && cfg?.subjects?.[subject]) {
    return cfg.subjects[subject];
  }
  if (mode === 'uniform' && cfg?.uniform) return cfg.uniform;
  return cfg?.montessori || MASTERY_SCALE;
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  return subjs.length * 4;
}

export function getDistributionBuckets(grade) {
  return { M: 0, P: 0, D: 0, E: 0 };
}

export function getGradeColors() {
  return { 
    M: '#059669', P: '#2563EB', D: '#D97706', E: '#DC2626'
  };
}
