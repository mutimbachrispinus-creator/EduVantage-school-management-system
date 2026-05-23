import { NextResponse } from 'next/server';
import { getAcademicStats } from '@/lib/actions/analytics';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'platform-master';
    const grade = searchParams.get('grade') || 'KINDERGARTEN';
    const result = await getAcademicStats({
      tenantId,
      grade,
      term: 'T1',
      curriculum: 'CBC'
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
