import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.role !== 'super-admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant');

  if (!tenantId || tenantId === 'platform-master') {
    return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
  }

  try {
    // Delete all data for this tenant
    await query('DELETE FROM subscriptions WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM kv WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM staff WHERE tenant_id = ?', [tenantId]);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
