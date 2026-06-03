'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from '@/components/DynamicCharts';
import FinanceNav from '@/components/FinanceNav';

export default function FinanceDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const [learners, setLearners] = useState([]);
  const [feeCfg, setFeeCfg] = useState({});

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_finance_ledger', 'paav_finance_budgets', 'paav_petty_cash', 'paav6_learners', 'paav6_feecfg']);
    setLedger(db.paav_finance_ledger || []);
    setBudgets(db.paav_finance_budgets || []);
    setPettyCash(db.paav_petty_cash || []);
    setLearners(db.paav6_learners || []);
    setFeeCfg(db.paav6_feecfg || {});
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const [budgets, setBudgets] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);

  const stats = useMemo(() => {
    const months = {};
    let totalIncome = 0;
    let totalExpense = 0;

    ledger.forEach(tx => {
      const month = tx.date.slice(0, 7); // YYYY-MM
      if (!months[month]) months[month] = { month, income: 0, expense: 0 };
      
      if (tx.creditAcc.startsWith('4')) {
        months[month].income += tx.amount;
        totalIncome += tx.amount;
      } else if (tx.debitAcc.startsWith('5')) {
        months[month].expense += tx.amount;
        totalExpense += tx.amount;
      }
    });

    const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
    const pettyBalance = pettyCash.reduce((sum, tx) => tx.type === 'income' ? sum + tx.amount : sum - tx.amount, 0);

    // Revenue Integrity Engine Calculations
    let expectedRevenue = 0;
    let collectedRevenue = 0;
    let ghostDiscrepancy = 0;
    
    learners.forEach(l => {
      const cfg = feeCfg[l.grade] || {};
      const annual = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 0;
      expectedRevenue += annual + (l.arrears || 0);
      collectedRevenue += (l.t1||0) + (l.t2||0) + (l.t3||0);
    });

    return { 
      chartData: Object.values(months).sort((a,b) => a.month.localeCompare(b.month)),
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      budgetTotal,
      pettyBalance,
      expectedRevenue,
      collectedRevenue,
      leakage: expectedRevenue - collectedRevenue
    };
  }, [ledger, budgets, pettyCash, learners, feeCfg]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Finance Hub…</div>;

  return (
    <div className="page on finance-page">
      <FinanceNav />
      <div className="page-hdr">
        <div>
          <h2>💎 Enterprise Finance Hub</h2>
          <p>Real-time institutional liquidity and strategic financial analytics</p>
        </div>
      </div>

      <div className="sg sg4" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ textAlign: 'center', background: '#F0FDF4' }}>
          <div style={{ fontSize: 10, color: '#166534', fontWeight: 800 }}>REVENUE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#166534' }}>KSH {stats.totalIncome.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ textAlign: 'center', background: '#FEF2F2' }}>
          <div style={{ fontSize: 10, color: '#991B1B', fontWeight: 800 }}>EXPENDITURE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#991B1B' }}>KSH {stats.totalExpense.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ textAlign: 'center', background: '#F0F9FF' }}>
          <div style={{ fontSize: 10, color: '#0369A1', fontWeight: 800 }}>PETTY CASH</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1' }}>KSH {stats.pettyBalance.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ textAlign: 'center', background: '#FFF7ED', border: '2px solid #EA580C' }}>
          <div style={{ fontSize: 10, color: '#9A3412', fontWeight: 800 }}>BUDGET TARGET</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#9A3412' }}>KSH {stats.budgetTotal.toLocaleString()}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff', border: 'none' }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 24 }}>🧠</span>
              <h3 style={{ margin: 0, color: '#fff' }}>Strategic Sustainability Forecast</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Based on current burn rate of <strong>KSH {Math.round(stats.totalExpense / (stats.chartData.length || 1)).toLocaleString()} / mo</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Financial Runway</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#FCD34D' }}>
              {stats.balance > 0 ? `${Math.floor(stats.balance / (stats.totalExpense / (stats.chartData.length || 1) || 1))} Months` : 'Immediate Attention Required'}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20, border: '2px dashed #DC2626', background: '#FEF2F2' }}>
        <div className="panel-hdr" style={{ borderBottom: '1px solid #FECACA', background: 'transparent' }}>
          <h3 style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: 10 }}>
            🛡️ EduVantage Revenue Integrity Engine
          </h3>
          <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 800 }}>LIVE AUDIT</span>
        </div>
        <div className="panel-body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 15 }}>
              This engine cross-references the physical student registry ({learners.length} active learners) against expected institutional fees to prevent "ghost student" leakage and unbilled attendance.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#fff', padding: 15, borderRadius: 10, border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#991B1B' }}>EXPECTED YIELD</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#7F1D1D' }}>KSH {stats.expectedRevenue.toLocaleString()}</div>
              </div>
              <div style={{ background: '#fff', padding: 15, borderRadius: 10, border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#047857' }}>COLLECTED YIELD</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#065F46' }}>KSH {stats.collectedRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div style={{ width: 250, background: '#7F1D1D', color: '#fff', padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.8, marginBottom: 5 }}>DETECTED REVENUE LEAKAGE</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#FECACA' }}>KSH {stats.leakage.toLocaleString()}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 5, textAlign: 'center' }}>Uncollected balances from active learners.</div>
          </div>
        </div>
      </div>

      <div className="sg-responsive">
        <div className="panel">
          <div className="panel-hdr"><h3>📊 Liquidity Trends</h3></div>
          <div className="panel-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="income" fill="#16A34A" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#DC2626" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr"><h3>⚡ Finance Command Center</h3></div>
          <div className="panel-body" style={{ overflowY: 'auto', maxHeight: 380, padding: '8px 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '📊', label: 'Budgets',      sub: 'Annual budget planning',     path: '/finance/budgets',      accent: '#6366F1' },
                { icon: '📜', label: 'Transactions', sub: 'Full ledger & journals',     path: '/finance/transactions', accent: '#0EA5E9' },
                { icon: '🧾', label: 'Expenses',     sub: 'Track institutional spend',  path: '/finance/expenses',     accent: '#F59E0B' },
                { icon: '💵', label: 'Petty Cash',   sub: 'Imprest & cash controls',    path: '/finance/petty-cash',   accent: '#10B981' },
                { icon: '💸', label: 'Payroll',      sub: 'Staff salaries & payslips',  path: '/finance/payroll',      accent: '#8B5CF6' },
                { icon: '📄', label: 'Invoicing',    sub: 'Generate fee invoices',      path: '/finance/invoices',     accent: '#EC4899' },
                { icon: '🔁', label: 'Reconcile',    sub: 'Bank reconciliation',        path: '/finance/reconcile',    accent: '#DC2626' },
              ].map(({ icon, label, sub, path, accent }) => (
                <button key={path} className="fin-cmd-btn" onClick={() => router.push(path)}
                  style={{ '--fin-accent': accent }}>
                  <span className="fin-cmd-icon">{icon}</span>
                  <span className="fin-cmd-text">
                    <span className="fin-cmd-label">{label}</span>
                    <span className="fin-cmd-sub">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-hdr"><h3>📜 Recent Ledger Transactions</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Debit</th>
                <th>Credit</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 10).map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontSize: 12 }}>{tx.date}</td>
                  <td style={{ fontWeight: 600 }}>{tx.description}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{tx.reference}</td>
                  <td style={{ fontSize: 11 }}>{tx.debitAcc}</td>
                  <td style={{ fontSize: 11 }}>{tx.creditAcc}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900 }}>KSH {tx.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .sg-responsive {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        .fin-cmd-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-left: 3.5px solid var(--fin-accent, #6366F1);
          border-radius: 12px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all 0.18s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .fin-cmd-btn:hover {
          border-color: var(--fin-accent, #6366F1);
          background: #F8FAFF;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.10);
        }
        .fin-cmd-btn:active { transform: translateY(0); }
        .fin-cmd-icon { font-size: 22px; flex-shrink: 0; }
        .fin-cmd-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .fin-cmd-label { font-weight: 800; font-size: 13px; color: #0F172A; }
        .fin-cmd-sub   { font-size: 10.5px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 800px) {
          .sg-responsive { grid-template-columns: 1fr; }
          .fin-cmd-btn { padding: 10px 12px; }
        }
      `}</style>
    </div>
  );
}
