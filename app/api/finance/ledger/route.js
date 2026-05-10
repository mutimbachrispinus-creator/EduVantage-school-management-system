export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, execute } from '@/lib/db';

/**
 * Enterprise Double-Entry Ledger API
 * 
 * Every transaction MUST have a debit and a credit.
 * Accounts categories: Asset, Liability, Equity, Income, Expense
 */

export async function GET() {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ledger = await kvGet('paav7_ledger') || [];
  const accounts = await kvGet('paav7_accounts') || [
    { code: '1000', name: 'Cash at Bank', type: 'Asset' },
    { code: '1001', name: 'Petty Cash', type: 'Asset' },
    { code: '2000', name: 'Accounts Payable', type: 'Liability' },
    { code: '3000', name: 'School Equity', type: 'Equity' },
    { code: '4000', name: 'Fee Income', type: 'Income' },
    { code: '5000', name: 'Salary Expense', type: 'Expense' },
    { code: '5001', name: 'Supplies Expense', type: 'Expense' },
  ];

  return NextResponse.json({ ok: true, ledger, accounts });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { date, description, debitAcc, creditAcc, amount, reference } = await request.json();

  if (!debitAcc || !creditAcc || !amount) {
    return NextResponse.json({ ok: false, error: 'Incomplete transaction' });
  }

  const ledger = await kvGet('paav7_ledger') || [];
  const transaction = {
    id: 'tx' + Date.now(),
    date,
    description,
    reference,
    debitAcc,
    creditAcc,
    amount: Number(amount),
    recordedBy: session.username,
    createdAt: new Date().toISOString()
  };

  ledger.unshift(transaction);

  await execute(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, strftime('%s','now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, 
                 ['paav7_ledger', JSON.stringify(ledger.slice(0, 5000))]);

  return NextResponse.json({ ok: true, transaction });
}
