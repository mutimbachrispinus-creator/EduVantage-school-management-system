/**
 * lib/curriculum/index.js — Curriculum Factory
 */

import * as cbc from './cbc';
import * as british from './british';
import * as ib from './ib';
import * as cambridge from './cambridge';

export const CURRICULUMS = {
  CBC: cbc,
  BRITISH: british,
  IB: ib,
  CAMBRIDGE: cambridge
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
];
