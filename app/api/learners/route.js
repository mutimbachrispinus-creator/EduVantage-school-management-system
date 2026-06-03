import { NextResponse } from 'next/server';
import { getLearnersPaginated } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    
    // Parents can only view their own children
    let finalSearch = search;
    if (session.role === 'parent') {
      finalSearch = session.phone || ''; // Fallback for parent filtering, or they shouldn't use this endpoint
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); // Prevent parent bulk querying for now
    }

    const tenantId = session.tenantId || 'platform-master';
    const result = await getLearnersPaginated(tenantId, page, limit, search, grade);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/Learners] Fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
