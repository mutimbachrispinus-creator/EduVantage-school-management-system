/**
 * lib/curriculum/index.js — Curriculum Factory
 */

import * as cbc from './cbc.js';
import * as british from './british.js';
import * as ib from './ib.js';
import * as cambridge from './cambridge.js';
import * as montessori from './montessori.js';

import * as tvet from './tvet.js';

export const CURRICULUMS = {
  CBC: cbc,
  BRITISH: british,
  IB: ib,
  CAMBRIDGE: cambridge,
  MONTESSORI: montessori,
  TVET: tvet
};

export function getCurriculum(name = 'CBC') {
  const normalized = name.toUpperCase();
  return CURRICULUMS[normalized] || CURRICULUMS.CBC;
}

/**
 * Returns curriculum metadata for registration / selection
 */
export const CURRICULUM_LIST = [
  { id: 'CBC', name: 'Kenya CBC', desc: 'Competency-Based Curriculum (EE/ME/AE/BE)' },
  { id: 'BRITISH', name: 'British National Curriculum', desc: 'EYFS, KS1-5, IGCSE & A-Levels' },
  { id: 'CAMBRIDGE', name: 'Cambridge International', desc: 'Primary, Secondary, IGCSE & A-Levels' },
  { id: 'IB', name: 'International Baccalaureate', desc: 'PYP, MYP and Diploma Programme' },
  { id: 'MONTESSORI', name: 'Montessori Curriculum', desc: 'Holistic & Mastery-based (Nido, Toddler, Primary, Elementary)' },
  { id: 'TVET', name: 'TVET / CBET', desc: 'Technical and Vocational Education (Artisan, Certificate, Diploma)' },
];
