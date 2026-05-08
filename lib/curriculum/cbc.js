/**
 * lib/curriculum/cbc.js — Kenya CBC (Competency-Based Curriculum)
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

export const DEFAULT_WEIGHTS = { op1: 0.1, mt1: 0.3, et1: 0.6 };

export const RESOURCES = [
  { title: 'Kenya Education Cloud', url: 'https://kec.ac.ke/', desc: 'Official digital lessons and KICD e-books.', icon: '☁️', cat: 'Official' },
  { title: 'CBC Curriculum Designs', url: 'https://kicd.ac.ke/cbc-curriculum-designs/', desc: 'Standard designs for all grades.', icon: '📜', cat: 'Official' },
  { title: 'KNEC Portal', url: 'https://www.knec-portal.ac.ke/', desc: 'National exam registration and results.', icon: '🎓', cat: 'Official' },
  { title: 'KICD YouTube', url: 'https://www.youtube.com/user/KICDKenya', desc: 'Official video lessons.', icon: '🎥', cat: 'Videos' },
  { title: 'EduTV Kenya', url: 'https://www.youtube.com/@EduTVKenya', desc: 'Broadcast lessons for schools.', icon: '📺', cat: 'Videos' },
];

export const PRE    = ['KINDERGARTEN','PP1','PP2'];
export const LOWER  = ['GRADE 1','GRADE 2','GRADE 3'];
export const UPPER  = ['GRADE 4','GRADE 5','GRADE 6'];
export const JSS    = ['GRADE 7','GRADE 8','GRADE 9'];
export const SENIOR = ['GRADE 10','GRADE 11','GRADE 12'];
export const ALL_GRADES = [...PRE, ...LOWER, ...UPPER, ...JSS, ...SENIOR];

export const CATEGORIES = [
  { title: 'Pre-School', grades: PRE, color: '#8B5CF6', levelKey: 'pre' },
  { title: 'Lower Primary', grades: LOWER, color: '#10B981', levelKey: 'primary' },
  { title: 'Upper Primary', grades: UPPER, color: '#3B82F6', levelKey: 'primary' },
  { title: 'Junior Secondary', grades: JSS, color: '#F59E0B', levelKey: 'junior' },
  { title: 'Senior School', grades: SENIOR, color: '#EF4444', levelKey: 'senior' },
];

export function gradeGroup(grade) {
  if (PRE.includes(grade) || LOWER.includes(grade)) return 'primary13';
  if (UPPER.includes(grade)) return 'primary46';
  if (JSS.includes(grade)) return 'jss';
  if (SENIOR.includes(grade)) return 'senior';
  return 'primary13'; 
}

export const JSS_SCALE = [
  { min: 80, lv: 'EE1', pts: 8, c: '#065F46', bg: '#D1FAE5', desc: 'Exceeds Expectation — Outstanding' },
  { min: 70, lv: 'EE2', pts: 7, c: '#059669', bg: '#A7F3D0', desc: 'Exceeds Expectation' },
  { min: 60, lv: 'ME1', pts: 6, c: '#1D4ED8', bg: '#BFDBFE', desc: 'Meets Expectation — Above Average' },
  { min: 50, lv: 'ME2', pts: 5, c: '#2563EB', bg: '#DBEAFE', desc: 'Meets Expectation' },
  { min: 40, lv: 'AE1', pts: 4, c: '#B45309', bg: '#FDE68A', desc: 'Approaching Expectation' },
  { min: 30, lv: 'AE2', pts: 3, c: '#92400E', bg: '#FEF3C7', desc: 'Approaching Expectation — Needs Support' },
  { min: 20, lv: 'BE1', pts: 2, c: '#DC2626', bg: '#FEE2E2', desc: 'Below Expectation' },
  { min:  0, lv: 'BE2', pts: 1, c: '#991B1B', bg: '#FCA5A5', desc: 'Below Expectation — Urgent Support Needed' },
];

export const PRIMARY_SCALE = [
  { min: 80, lv: 'EE', pts: 4, c: '#065F46', bg: '#D1FAE5', desc: 'Exceeds Expectation' },
  { min: 50, lv: 'ME', pts: 3, c: '#1D4ED8', bg: '#DBEAFE', desc: 'Meets Expectation' },
  { min: 30, lv: 'AE', pts: 2, c: '#92400E', bg: '#FEF3C7', desc: 'Approaching Expectation' },
  { min:  0, lv: 'BE', pts: 1, c: '#991B1B', bg: '#FEE2E2', desc: 'Below Expectation' },
];

export const GRADING_CONFIG = [
  { key: 'k6', title: '🟢 Pre-School & Primary (K-6)', scale: PRIMARY_SCALE },
  { key: 'junior', title: '🟡 Junior School (7–9)', scale: JSS_SCALE },
  { key: 'senior', title: '🔴 Senior School (10–12)', scale: JSS_SCALE },
];

export function shouldRankByMarks(grade) {
  return [...PRE, ...LOWER, ...UPPER].includes(grade);
}

export const DEFAULT_SUBJECTS = {
  'KINDERGARTEN': ['Language','Reading','Mathematics','Environmental Activity','Creative Activity'],
  'PP1':  ['Mathematics','Languages','Environmental Activity','C.R.E','Creative Activity'],
  'PP2':  ['Language','Reading','Mathematics','Environmental Activity','Creative Activity','C.R.E','Kiswahili','Kusoma'],
  'GRADE 1': ['Mathematics','English','Kiswahili','Environmental','C.R.E','C/A'],
  'GRADE 2': ['Mathematics','English','Kiswahili','Environmental','C.R.E','C/A'],
  'GRADE 3': ['Mathematics','English','Kiswahili','Environmental','C.R.E','C/A'],
  'GRADE 4': ['Mathematics','English','Kiswahili','Science & Technology','Social Studies','CRE',
              'Agriculture','Home Science','Art & Craft','Music','Physical Education'],
  'GRADE 5': ['Mathematics','English','Kiswahili','Science & Technology','Social Studies','CRE',
              'Agriculture','Home Science','Art & Craft','Music','Physical Education'],
  'GRADE 6': ['Mathematics','English','Kiswahili','Science & Technology','Social Studies','CRE',
              'Agriculture','Home Science','Art & Craft','Music','Physical Education'],
  'GRADE 7': ['Mathematics','English','Kiswahili','Integrated Science','Social Studies',
              'Pre-Technical Studies','Agriculture & Nutrition','Creative Arts & Sports','CRE/IRE'],
  'GRADE 8': ['Mathematics','English','Kiswahili','Integrated Science','Social Studies',
              'Pre-Technical Studies','Agriculture & Nutrition','Creative Arts & Sports','CRE/IRE'],
  'GRADE 9': ['Mathematics','English','Kiswahili','Integrated Science','Social Studies',
              'Pre-Technical Studies','Agriculture & Nutrition','Creative Arts & Sports','CRE/IRE'],
  'GRADE 10': ['English Language','Kiswahili','Mathematics','Biology','Chemistry','Physics',
               'History & Government','Geography','Christian Religious Education','Business Studies',
               'Agriculture','Computer Science','Home Science','Physical Education','Life Skills Education','Community Service Learning'],
  'GRADE 11': ['English Language','Kiswahili','Mathematics','Biology','Chemistry','Physics',
               'History & Government','Geography','Christian Religious Education','Business Studies',
               'Agriculture','Computer Science','Home Science','Physical Education','Life Skills Education','Community Service Learning'],
  'GRADE 12': ['English Language','Kiswahili','Mathematics','Biology','Chemistry','Physics',
               'History & Government','Geography','Christian Religious Education','Business Studies',
               'Agriculture','Computer Science','Home Science','Physical Education','Life Skills Education','Community Service Learning'],
};


export function isJSSGrade(grade) {
  return JSS.includes(grade) || SENIOR.includes(grade);
}

export function gInfo(score, grade, cfg = null) {
  const scale = getScale(grade, cfg);
  const entry = scale.find(x => score >= x.min) || scale[scale.length - 1];
  return { lv: entry.lv, pts: entry.pts, c: entry.c, bg: entry.bg, desc: entry.desc };
}

export function getScale(grade, cfg = null) {
  if (SENIOR.includes(grade)) {
    return cfg?.senior || JSS_SCALE;
  } else if (JSS.includes(grade)) {
    return cfg?.junior || JSS_SCALE;
  } else {
    return cfg?.k6 || PRIMARY_SCALE;
  }
}

export function maxPts(grade, subjects = null) {
  const subjs = subjects || DEFAULT_SUBJECTS[grade] || [];
  return subjs.length * (isJSSGrade(grade) ? 8 : 4);
}
export function getDistributionBuckets(grade) {
  if (isJSSGrade(grade)) {
    return { EE1:0, EE2:0, ME1:0, ME2:0, AE1:0, AE2:0, BE1:0, BE2:0 };
  }
  return { EE: 0, ME: 0, AE: 0, BE: 0 };
}

export function getGradeColors() {
  return { 
    EE: '#059669', ME: '#2563EB', AE: '#D97706', BE: '#DC2626',
    EE1: '#065F46', EE2: '#059669', ME1: '#1D4ED8', ME2: '#2563EB', AE1: '#B45309', AE2: '#92400E', BE1: '#DC2626', BE2: '#991B1B'
  };
}
