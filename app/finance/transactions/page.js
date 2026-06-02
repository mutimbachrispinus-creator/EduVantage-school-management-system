'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { logAction } from '@/lib/audit';
import FinanceNav from '@/components/FinanceNav';

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', debitAcc: '', creditAcc: '', reference: '' });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_finance_ledger']);
    setLedger(db.paav_finance_ledger || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function saveTx(e) {
    if (e) e.preventDefault();
    if (!form.description || !form.amount) return;
    setBusy(true);

    const tx = { ...form, id: Date.now(), amount: Number(form.amount), recordedBy: user.username };
    const updated = [tx, ...ledger];

    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_finance_ledger', value: updated }] })
    });

    setLedger(updated);
    invalidateDB(['paav_finance_ledger']);
    logAction('Record Transaction', `${tx.description} - KSH ${tx.amount}`);
    
    setForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', debitAcc: '', creditAcc: '', reference: '' });
    setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Transactions…</div>;

  return (
    <div className="page on finance-page">
      <FinanceNav />
      <div className="page-hdr">
        <div>
          <h2>📜 Financial Ledger</h2>
          <p>Record and monitor all institutional financial movements</p>
        </div>
      </div>

      <div className="sg-responsive" style={{ display: 'flex', gap: 20 }}>
        <div className="panel" style={{ width: 350, flexShrink: 0 }}>
          <div className="panel-hdr"><h3>➕ Record Transaction</h3></div>
          <form className="panel-body" onSubmit={saveTx}>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="field">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Electricity Bill Jan" required />
            </div>
            <div className="field">
              <label>Amount (KSH)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Debit Acc</label>
                <input value={form.debitAcc} onChange={e => setForm({...form, debitAcc: e.target.value})} placeholder="e.g. 5001" />
              </div>
              <div className="field">
                <label>Credit Acc</label>
                <input value={form.creditAcc} onChange={e => setForm({...form, creditAcc: e.target.value})} placeholder="e.g. 1001" />
              </div>
            </div>
            <div className="field">
              <label>Reference / Receipt No</label>
              <input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="e.g. KPLC-789-X" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={busy}>
              {busy ? '⏳ Saving...' : '💾 Save Transaction'}
            </button>
          </form>
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-hdr"><h3>📜 Transaction History</h3></div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Debit/Credit</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: 12 }}>{tx.date}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{tx.description}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Ref: {tx.reference || 'N/A'} · By {tx.recordedBy}</div>
                    </td>
                    <td style={{ fontSize: 11 }}>{tx.debitAcc} / {tx.creditAcc}</td>
                    <td style={{ textAlign: 'right', fontWeight: 900 }}>KSH {tx.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
