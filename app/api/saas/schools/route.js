import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas/schools
 * Publicly returns a list of active schools for registration.
 */
export async function GET() {
  try {
    const db = await getClient();
    
    // Fetch active schools
    const res = await db.execute("SELECT tenant_id FROM subscriptions WHERE status = 'active' AND tenant_id != 'platform-master'");
    const rows = res.rows;

    const schools = await Promise.all(rows.map(async (r) => {
      const profileRes = await db.execute({
        sql: "SELECT value FROM kv WHERE key = 'paav_school_profile' AND tenant_id = ?",
        args: [r.tenant_id]
      });
      
      let name = r.tenant_id;
      let curriculum = 'CBC';
      try {
        if (profileRes.rows.length) {
          const profile = JSON.parse(profileRes.rows[0].value);
          name = profile.name || r.tenant_id;
          if (profile.curriculum) curriculum = profile.curriculum;
        }
      } catch (e) {}

      return { id: r.tenant_id, name, curriculum };
    }));

    return NextResponse.json({ ok: true, schools });

  } catch (err) {
    console.error('[api/saas/schools] Error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to load school list', details: err.message }, { status: 500 });
  }
}
