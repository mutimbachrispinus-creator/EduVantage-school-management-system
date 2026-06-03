export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getPaylogPaginated } from '@/lib/db';
import { getSession } from '@/lib/auth';


export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    if (!['admin', 'super-admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = session.tenantId || 'platform-master';
    const result = await getPaylogPaginated(tenantId, page, limit, search, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/Paylog] Fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
