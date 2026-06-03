import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function GET(req, { params }) {
  const { id } = params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const rows = await query('SELECT data, type, name FROM files WHERE id = ? AND tenant_id = ?', [id, session.tenantId]);
  if (!rows.length) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const { data, type, name } = rows[0];
  const base64Data = data.split(',')[1];
  const bytes = base64ToBytes(base64Data);

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename="${String(name).replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
    }
  });
}
