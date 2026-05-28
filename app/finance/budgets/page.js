'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from '@/components/DynamicCharts';
import FinanceNav from '@/components/FinanceNav';

export default function BudgetingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBudget, setNewBudget] = useState({ head: '', amount: '', term: 'T1' });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_finance_budgets', 'paav_finance_expenses']);
    setBudgets(db.paav_finance_budgets || []);
    setExpenses(db.paav_finance_expenses || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const heads = {};
    // Calculate consumption from recorded expenses
    budgets.forEach(b => {
      const consumption = expenses
        .filter(ex => ex.head === b.head)
        .reduce((sum, ex) => sum + Number(ex.amount), 0);
      heads[b.head] = { 
        head: b.head, 
        budget: b.amount, 
        actual: consumption,
        variance: b.amount - consumption,
        pct: Math.round((consumption / b.amount) * 100) || 0
      };
    });
    return Object.values(heads);
  }, [budgets, expenses]);

  async function saveBudget() {
    if (!newBudget.head || !newBudget.amount) return;
    const updated = [...budgets, { ...newBudget, amount: Number(newBudget.amount), id: Date.now() }];
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_finance_budgets', value: updated }] })
    });
    setBudgets(updated);
    invalidateDB(['paav_finance_budgets']);
    setShowAdd(false);
    setNewBudget({ head: '', amount: '', term: 'T1' });
  }

  if (loading) return <div style={{ padding: 40 }}>Loading Budget Hub...</div>;

  return (
    <div className="page on">
      <FinanceNav />
      <div className="page-hdr">
        <div>
          <h2>📊 Budgeting & Variance Analysis</h2>
          <p>Plan school expenditure and monitor vote-head consumption</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ New Vote Head</button>
        </div>
      </div>

      <div className="sg sg3" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ background: '#F8FAFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>TOTAL ALLOCATED</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>KSH {budgets.reduce((s, b) => s + b.amount, 0).toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#F0FDF4' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>TOTAL CONSUMED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#166534' }}>KSH {stats.reduce((s, b) => s + b.actual, 0).toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#FEF2F2' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B' }}>TOTAL VARIANCE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#991B1B' }}>KSH {stats.reduce((s, b) => s + b.variance, 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hdr"><h3>📈 Consumption Trends</h3></div>
        <div className="panel-body" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} />
              <YAxis dataKey="head" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: 11, fontWeight: 600 }} />
              <Tooltip />
              <Bar dataKey="actual" fill="#0369A1" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="budget" fill="#E2E8F0" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr"><h3>📋 Vote Head Details</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th>Vote Head</th>
                <th>Term Allocation</th>
                <th>Actual Spent</th>
                <th>Remaining</th>
                <th style={{ width: 200 }}>Consumption %</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.head}>
                  <td style={{ fontWeight: 700 }}>{s.head}</td>
                  <td style={{ color: '#64748B' }}>KSH {s.budget.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: s.actual > s.budget ? '#DC2626' : '#1E293B' }}>KSH {s.actual.toLocaleString()}</td>
                  <td style={{ fontWeight: 800, color: s.variance < 0 ? '#DC2626' : '#059669' }}>KSH {s.variance.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(s.pct, 100)}%`, height: '100%', background: s.pct > 90 ? '#DC2626' : '#0369A1', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{s.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-hdr">
              <h3>Create New Vote Head</h3>
              <button className="btn-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Vote Head Name (e.g., Science Lab)</label>
                <input value={newBudget.head} onChange={e => setNewBudget({...newBudget, head: e.target.value})} placeholder="Maintenance, Food, etc." />
              </div>
              <div className="field">
                <label>Budget Amount (KES)</label>
                <input type="number" value={newBudget.amount} onChange={e => setNewBudget({...newBudget, amount: e.target.value})} placeholder="50,000" />
              </div>
              <div className="field">
                <label>Period</label>
                <select value={newBudget.term} onChange={e => setNewBudget({...newBudget, term: e.target.value})}>
                  <option value="T1">Term 1</option>
                  <option value="T2">Term 2</option>
                  <option value="T3">Term 3</option>
                  <option value="YEAR">Annual</option>
                </select>
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveBudget}>Save Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
