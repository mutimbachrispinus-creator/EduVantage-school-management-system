import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { execute } from '@/lib/db';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function safeFileName(value) {
  return String(value || 'upload')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'upload';
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const type = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 2 MB upload limit' }, { status: 413 });
    }

    const name = safeFileName(formData.get('name') || file.name);

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
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
