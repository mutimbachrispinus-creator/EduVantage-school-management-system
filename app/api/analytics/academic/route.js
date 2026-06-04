export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAcademicStats } from '@/lib/actions/analytics';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade') || '';
  const term = searchParams.get('term') || '';
  const stream = searchParams.get('stream') || '';
  const curriculum = searchParams.get('curriculum') || 'CBC';
  const headerTenant = request.headers.get('x-tenant-id');
  const tenantId = session.role === 'super-admin' && headerTenant
    ? headerTenant
    : (session.tenantId || session.tenant_id || 'platform-master');

  if (!grade || !term) {
    return NextResponse.json({ success: false, error: 'Grade and term are required' }, { status: 400 });
  }

  const result = await getAcademicStats({ tenantId, grade, term, stream, curriculum });
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
