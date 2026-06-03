export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { query, getCachedDBMulti } from '@/lib/db';
import { getSession } from '@/lib/auth';


export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId || 'platform-master';
    
    // Get grade counts and sums
    const rows = await query(`
      SELECT grade, 
             COUNT(*) as count, 
             SUM(COALESCE(t1, 0)) as t1, 
             SUM(COALESCE(t2, 0)) as t2, 
             SUM(COALESCE(t3, 0)) as t3, 
             SUM(COALESCE(arrears, 0)) as arrears 
      FROM learners 
      WHERE tenant_id = ?
      GROUP BY grade
    `, [tenantId]);

    // Fetch fee config from KV
    const { kvGet } = await import('@/lib/db');
    const feeCfg = await kvGet('paav6_feecfg', {}, tenantId);

    let totalAccumulated = 0;
    let totalExp = 0;
    let totalPaid = 0;

    for (const row of rows) {
      const gCount = row.count;
      totalAccumulated += row.arrears;
      totalPaid += (row.t1 + row.t2 + row.t3);

      const cfg = feeCfg[row.grade] || {};
      const annual = (cfg.t1 || 0) + (cfg.t2 || 0) + (cfg.t3 || 0) || cfg.annual || 5000;
      totalExp += annual * gCount;
    }

    return NextResponse.json({
      totalAccumulated,
      totalExp,
      totalPaid,
      totalBalance: totalExp + totalAccumulated - totalPaid,
      cleared: -1 // Computationally heavy to calculate perfectly here without complex JOINs, returning -1 to hide
    });

  } catch (error) {
    console.error('[API/FeesSummary] Fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
