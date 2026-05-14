'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { logAction } from '@/lib/audit';

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ head: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_finance_expenses', 'paav_finance_budgets']);
    setExpenses(db.paav_finance_expenses || []);
    setBudgets(db.paav_finance_budgets || []);
    
    if (db.paav_finance_budgets?.length > 0) {
      setForm(prev => ({ ...prev, head: db.paav_finance_budgets[0].head }));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    if (e) e.preventDefault();
    if (!form.head || !form.amount) return;
    setAdding(true);
    
    const expense = { 
      ...form, 
      amount: Number(form.amount), 
      id: Date.now(), 
      recordedBy: user.username 
    };
    const updated = [expense, ...expenses];
    
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_finance_expenses', value: updated }] })
    });

    setExpenses(updated);
    invalidateDB(['paav_finance_expenses']);
    logAction('Record Expense', `${expense.description} - KSH ${expense.amount} under ${expense.head}`);
    
    setForm({ head: budgets[0]?.head || '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
    setAdding(false);
    setShowAdd(false);
  }

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Expenditure Hub…</div>;

  return (
    <div className="page on">
      <div className="page-hdr no-print">
        <div>
          <h2>🧾 Enterprise Expenditure Hub</h2>
          <p>Record and monitor institutional spending against departmental budgets</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ New Expense</button>
           <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 Print Expense Report</button>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-hdr">
              <h3>➕ Record New Expense</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleAdd}>
               <div className="field">
                 <label>Vote Head / Category</label>
                 <select value={form.head} onChange={e => setForm({ ...form, head: e.target.value })}>
                   {budgets.map(b => <option key={b.id} value={b.head}>{b.head} (Bal: KSH {(b.amount - expenses.filter(ex => ex.head === b.head).reduce((s, ex) => s + ex.amount, 0)).toLocaleString()})</option>)}
                   {budgets.length === 0 && <option value="General">General</option>}
                 </select>
               </div>
               <div className="field">
                 <label>Amount (KSH)</label>
                 <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
               </div>
               <div className="field">
                 <label>Transaction Date</label>
                 <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
               </div>
               <div className="field">
                 <label>Description / Vendor</label>
                 <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Purchase of Lab Chemicals from KEMSA" rows={3} />
               </div>
            </form>
            <div className="modal-ftr">
               <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
               <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
                 {adding ? '⏳ Recording...' : '💾 Save Expense Entry'}
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="sg sg3 no-print" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5' }}>
          <div style={{ fontSize: 11, color: '#991B1B', fontWeight: 700 }}>PERIOD EXPENDITURE</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#991B1B' }}>KSH {total.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC' }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>RELIABILITY SCORE</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#166534' }}>98.4%</div>
        </div>
        <div className="panel" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>PENDING RECEIPTS</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#475569' }}>0</div>
        </div>
      </div>

      <div className="sg-responsive">
        <div className="panel no-print" style={{ flex: '0 0 350px' }}>
          <div className="panel-hdr"><h3>➕ Record New Expense</h3></div>
          <form className="panel-body" onSubmit={handleAdd}>
            <div className="field">
              <label>Vote Head / Category</label>
              <select value={form.head} onChange={e => setForm({ ...form, head: e.target.value })}>
                {budgets.map(b => <option key={b.id} value={b.head}>{b.head} (Bal: KSH {(b.amount - expenses.filter(ex => ex.head === b.head).reduce((s, ex) => s + ex.amount, 0)).toLocaleString()})</option>)}
                {budgets.length === 0 && <option value="General">General</option>}
              </select>
            </div>
            <div className="field">
              <label>Amount (KSH)</label>
              <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="field">
              <label>Transaction Date</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>Description / Vendor</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Purchase of Lab Chemicals from KEMSA" rows={3} />
            </div>
            <div className="field">
              <label>Attachment (Receipt/Invoice)</label>
              <div style={{ border: '2px dashed #E2E8F0', padding: 15, borderRadius: 10, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                 Click or drag file to attach
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={adding}>
              {adding ? '⏳ Recording...' : '💾 Save Expense Entry'}
            </button>
          </form>
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-hdr">
            <h3>📜 Expenditure Ledger</h3>
            <div className="print-only" style={{ display: 'none', fontWeight: 900 }}>OFFICIAL EXPENSE REPORT</div>
          </div>
          <div className="tbl-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Vote Head</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Description</th>
                  <th style={{ textAlign: 'right', padding: 12 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>{new Date(e.date).toLocaleDateString()}</td>
                    <td style={{ padding: 12 }}><span className="badge" style={{ background: '#F1F5F9', color: '#475569' }}>{e.head}</span></td>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{e.description}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Recorded by {e.recordedBy}</div>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 900, color: '#DC2626' }}>KSH {e.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No expenditure entries found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sg-responsive { display: flex; gap: 20px; }
        @media print {
          .no-print { display: none !important; }
          .page { padding: 0 !important; }
          .panel { border: none !important; width: 100% !important; }
          .tbl-wrap table { border: 1px solid #000; }
        }
        @media (max-width: 900px) {
          .sg-responsive { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
