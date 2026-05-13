/**
 * lib/curriculum/tvet.js — TVET / CBET Curriculum Logic
 */

export const name = 'TVET / CBET';
export const code = 'TVET';

export const gradingScale = [
  { label: 'Distinction', min: 80, max: 100, gp: 4.0, color: '#059669', status: 'Competent' },
  { label: 'Credit', min: 65, max: 79, gp: 3.0, color: '#10B981', status: 'Competent' },
  { label: 'Pass', min: 40, max: 64, gp: 2.0, color: '#3B82F6', status: 'Competent' },
  { label: 'Referral', min: 0, max: 39, gp: 0.0, color: '#EF4444', status: 'Not Yet Competent' }
];

export const levels = [
  { id: 'LEVEL_1', name: 'Artisan (Level 1-3)', short: 'Artisan' },
  { id: 'LEVEL_2', name: 'Craft / Certificate (Level 4-5)', short: 'Certificate' },
  { id: 'LEVEL_3', name: 'Diploma (Level 6)', short: 'Diploma' }
];

/**
 * TVET uses CDACC or KNEC standards.
 * Typically assessed per Unit of Competency.
 */
export function calculateGrade(score) {
  const g = gradingScale.find(s => score >= s.min && score <= s.max);
  return g || { label: 'E', color: '#64748B', status: 'Invalid' };
}

export function formatReport(results) {
  // Results in TVET are often modular
  return results.map(r => ({
    ...r,
    grade: calculateGrade(r.score),
    competency: r.score >= 40 ? 'C' : 'NYC'
  }));
}
