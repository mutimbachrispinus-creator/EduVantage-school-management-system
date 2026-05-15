export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { execute } from '@/lib/db';

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const name = formData.get('name') || file.name;
    const type = file.type;

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${type};base64,${base64}`;

    const id = 'f' + Date.now();
    const tenantId = session.tenantId;

    await execute(
      `INSERT INTO files (id, tenant_id, name, type, data, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, name, type, dataUrl, new Date().toISOString()]
    );

    return NextResponse.json({ ok: true, url: `/api/upload/${id}`, id });
  } catch (e) {
    console.error('[Upload API] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
