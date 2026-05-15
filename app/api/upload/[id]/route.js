export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req, { params }) {
  const { id } = params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const rows = await query('SELECT data, type, name FROM files WHERE id = ? AND tenant_id = ?', [id, session.tenantId]);
  if (!rows.length) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const { data, type, name } = rows[0];
  const base64Data = data.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename="${name}"`
    }
  });
}
