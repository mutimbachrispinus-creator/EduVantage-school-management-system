import { getAcademicStats } from './lib/actions/analytics.js';
import { getClient } from './lib/db.js';

async function run() {
  try {
    const stats = await getAcademicStats({ tenantId: 'tenant_1716616093883_t0y0j', grade: 'GRADE 1', term: 'TERM 1' });
    console.log(JSON.stringify(stats, null, 2));
  } catch(e) {
    console.error("CRASHED:", e);
  }
}
run();
