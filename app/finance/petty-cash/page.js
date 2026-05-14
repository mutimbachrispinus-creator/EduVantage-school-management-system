'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { logAction } from '@/lib/audit';

export default function PettyCashPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cashbook, setCashbook] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: '', type: 'expense', category: 'General' });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_petty_cash']);
    setCashbook(db.paav_petty_cash || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const balance = useMemo(() => {
    return cashbook.reduce((sum, tx) => tx.type === 'income' ? sum + tx.amount : sum - tx.amount, 0);
  }, [cashbook]);

  async function saveTx() {
    if (!newTx.description || !newTx.amount) return;
    const entry = { ...newTx, amount: Number(newTx.amount), date: new Date().toISOString(), id: Date.now(), user: user.username };
    const updated = [entry, ...cashbook];
    
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_petty_cash', value: updated }] })
    });
    
    setCashbook(updated);
    invalidateDB(['paav_petty_cash']);
    logAction(newTx.type === 'income' ? 'Top-up Petty Cash' : 'Petty Cash Expense', `${newTx.description} - KSH ${newTx.amount}`);
    setShowAdd(false);
    setNewTx({ description: '', amount: '', type: 'expense', category: 'General' });
  }

  if (loading) return <div style={{ padding: 40 }}>Loading Petty Cashbook...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>💵 Petty Cash Management</h2>
          <p>Track small office expenses and daily cash movements</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Record Transaction</button>
        </div>
      </div>

      <div className="sg sg2" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
          <div className="panel-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: 1 }}>Current Cash Balance</div>
            <div style={{ fontSize: 42, fontWeight: 900 }}>KSH {balance.toLocaleString()}</div>
          </div>
        </div>
        <div className="panel" style={{ background: '#F8FAFC' }}>
          <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>TOTAL IN</div>
               <div style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>KSH {cashbook.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
            </div>
            <div style={{ width: 1, height: 40, background: '#E2E8F0' }} />
            <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>TOTAL OUT</div>
               <div style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>KSH {cashbook.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr"><h3>📖 Transaction Ledger</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {cashbook.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(t.date).toLocaleDateString()}</td>
                  <td><span className="badge" style={{ background: '#F1F5F9', color: '#475569' }}>{t.category}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.description}</td>
                  <td>
                    <span style={{ 
                      fontSize: 10, 
                      fontWeight: 900, 
                      color: t.type === 'income' ? '#059669' : '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {t.type === 'income' ? '▲ TOP UP' : '▼ EXPENSE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: t.type === 'income' ? '#059669' : '#DC2626' }}>
                    {t.type === 'income' ? '+' : '-'} KSH {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {cashbook.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No petty cash transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-hdr">
              <h3>Record Cash Transaction</h3>
              <button className="btn-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Transaction Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className={`btn btn-sm ${newTx.type === 'expense' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setNewTx({...newTx, type: 'expense'})}
                    style={{ flex: 1 }}
                  >Expense</button>
                  <button 
                    className={`btn btn-sm ${newTx.type === 'income' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setNewTx({...newTx, type: 'income'})}
                    style={{ flex: 1 }}
                  >Income/Top-up</button>
                </div>
              </div>
              <div className="field">
                <label>Category</label>
                <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Refreshments">Refreshments</option>
                  <option value="Transport">Transport</option>
                  <option value="Repairs">Repairs</option>
                  <option value="Office Supplies">Office Supplies</option>
                </select>
              </div>
              <div className="field">
                <label>Description</label>
                <input value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} placeholder="e.g. Bought Printer Ink" />
              </div>
              <div className="field">
                <label>Amount (KES)</label>
                <input type="number" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="1,500" />
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTx}>Record Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
