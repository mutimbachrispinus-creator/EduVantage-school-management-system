export function normalizeLearnerKey(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function findLearner(learners, adm) {
  const target = normalizeLearnerKey(adm);
  if (!target) return null;
  return (learners || []).find(l => normalizeLearnerKey(l?.adm) === target) || null;
}

export function getTenantId(session) {
  return session?.tenantId || session?.tenant_id || 'platform-master';
}
