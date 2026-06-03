import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username) return NextResponse.json({ taken: false });

  try {
    const rows = await query('SELECT id FROM staff WHERE LOWER(username) = ?', [username]);
    return NextResponse.json({ taken: rows.length > 0 });
  } catch (e) {
    return NextResponse.json({ taken: false });
  }
}
