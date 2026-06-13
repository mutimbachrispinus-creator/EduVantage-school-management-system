/**
 * lib/curriculum/index.js — Curriculum Factory
 */

import * as cbc from './cbc.js';
import * as british from './british.js';
import * as ib from './ib.js';
import * as cambridge from './cambridge.js';
import * as montessori from './montessori.js';
import * as system844 from './844.js';

import * as tvet from './tvet.js';

export const CURRICULUMS = {
  CBC: cbc,
  BRITISH: british,
  IB: ib,
  CAMBRIDGE: cambridge,
  MONTESSORI: montessori,
  TVET: tvet,
  '8-4-4': system844
};

export function getCurriculum(name = 'CBC', supportedLevels = null) {
  const normalized = name.toUpperCase();
  const base = CURRICULUMS[normalized] || CURRICULUMS.CBC;

  if (!supportedLevels || typeof supportedLevels !== 'object' || Array.isArray(supportedLevels)) {
    return base;
  }

  // Filter based on supported levels object (key: levelKey, value: boolean)
  const filteredCategories = (base.CATEGORIES || []).filter(c => {
    const key = c.levelKey || c.title.toLowerCase().replace(/ /g,'_');
    return supportedLevels[key] !== false; // Include unless explicitly false
  });

  // If everything was filtered out, fallback to base
  if (filteredCategories.length === 0) return base;

  const filteredGrades = filteredCategories.flatMap(c => c.grades);

  return {
    ...base,
    CATEGORIES: filteredCategories,
    ALL_GRADES: filteredGrades
  };
}

/**
 * Returns curriculum metadata for registration / selection
 */
export const CURRICULUM_LIST = [
  { id: 'CBC', name: 'Kenya CBC', desc: 'Competency-Based Curriculum (EE/ME/AE/BE)' },
  { id: '8-4-4', name: 'Kenya 8-4-4 System', desc: 'Primary (KCPE) and Secondary (KCSE)' },
  { id: 'BRITISH', name: 'British National Curriculum', desc: 'EYFS, KS1-5, IGCSE & A-Levels' },
  { id: 'CAMBRIDGE', name: 'Cambridge International', desc: 'Primary, Secondary, IGCSE & A-Levels' },
  { id: 'IB', name: 'International Baccalaureate', desc: 'PYP, MYP and Diploma Programme' },
  { id: 'MONTESSORI', name: 'Montessori Curriculum', desc: 'Holistic & Mastery-based (Nido, Toddler, Primary, Elementary)' },
  { id: 'TVET', name: 'TVET / CBET', desc: 'Technical and Vocational Education (Artisan, Certificate, Diploma)' },
];
