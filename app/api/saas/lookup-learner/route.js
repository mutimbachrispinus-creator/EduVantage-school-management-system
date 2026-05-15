import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/db';

export const runtime = 'edge';

/**
 * GET /api/saas/lookup-learner?schoolId=xxx&adm=yyy
 * Public-ish lookup for parent registration to verify child name.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const adm = searchParams.get('adm');

    if (!schoolId || !adm) {
      return NextResponse.json({ error: 'schoolId and adm are required' }, { status: 400 });
    }

    // Read the learners list for the specific tenant
    const learners = await kvGet('paav6_learners', schoolId);
    
    if (!Array.isArray(learners)) {
      return NextResponse.json({ error: 'School records not found' }, { status: 404 });
    }

    const learner = learners.find(l => String(l.adm) === String(adm));
    
    if (!learner) {
      return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
    }

    // Return ONLY the name and grade (minimal info)
    return NextResponse.json({ 
      ok: true, 
      name: learner.name,
      grade: learner.grade 
    });

  } catch (err) {
    console.error('[LookupLearner] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
