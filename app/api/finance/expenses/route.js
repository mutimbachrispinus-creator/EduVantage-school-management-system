export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, execute } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const expenses = await kvGet('paav7_expenses') || [];
  return NextResponse.json({ ok: true, expenses });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { category, amount, date, description } = await request.json();
  
  if (!category || !amount || !date) {
    return NextResponse.json({ ok: false, error: 'Missing fields' });
  }

  const expenses = await kvGet('paav7_expenses') || [];
  const newExpense = {
    id: 'exp' + Date.now(),
    category,
    amount: Number(amount),
    date,
    description,
    recordedBy: session.username,
    createdAt: new Date().toISOString()
  };

  expenses.unshift(newExpense);
  
  await execute(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, strftime('%s','now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, 
                 ['paav7_expenses', JSON.stringify(expenses.slice(0, 1000))]);

  return NextResponse.json({ ok: true, expense: newExpense });
}
