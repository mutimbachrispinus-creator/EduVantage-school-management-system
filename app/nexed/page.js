'use client';
export const runtime = 'edge';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';
import { fmtK } from '@/lib/cbe';
import QuickReceipt from '@/components/nexed/QuickReceipt';
import ExpenseVoucher from '@/components/nexed/ExpenseVoucher';
import { addSupplier, getSuppliers } from '@/lib/actions/ledger';
import { Search, Plus, User, Tag, Truck } from 'lucide-react';

export default function NexedPage() {
  const router = useRouter();
  const { profile: school } = useProfile();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [paylog, setPaylog] = useState([]);
  const [feeCfg, setFeeCfg] = useState({});
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [activeView, setActiveView] = useState('ledger'); // 'ledger' | 'suppliers'
  const [searchQ, setSearchQ] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'cleared' | 'owing' | ''
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'balance' | 'grade'
  const [suppliers, setSuppliers] = useState([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  async function load() {
    try {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners', 'paav6_paylog', 'paav6_feecfg'])
      ]);
      if (!u) { router.push('/login'); return; }
      if (!['admin', 'staff'].includes(u.role)) { router.push('/dashboard'); return; }
      setUser(u);
      setLearners(db.paav6_learners || []);
      setPaylog(db.paav6_paylog || []);
      setFeeCfg(db.paav6_feecfg || {});
      
      const s = await getSuppliers(u.tenantId);
      setSuppliers(s || []);
    } catch (e) {
      console.error('Nexed load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = (e) => {
      const changed = e.detail?.changed || [];
      if (changed.some(k => ['paav6_learners', 'paav6_paylog', 'paav6_feecfg'].includes(k))) load();
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [router]);

  function getAnnualFee(grade) { 
    const cfg = feeCfg[grade] || {};
    return (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 5000;
  }
  function getBalance(l) {
    return getAnnualFee(l.grade) + (l.arrears || 0) - (l.t1 || 0) - (l.t2 || 0) - (l.t3 || 0);
  }
  function getPaid(l) { return (l.t1 || 0) + (l.t2 || 0) + (l.t3 || 0); }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPayments = paylog.filter(p => (p.date || '').startsWith(today));
    const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalExpected = learners.reduce((sum, l) => sum + getAnnualFee(l.grade) + (l.arrears || 0), 0);
    const totalCollected = learners.reduce((sum, l) => sum + getPaid(l), 0);
    const totalOwing = learners.reduce((sum, l) => sum + Math.max(0, getBalance(l)), 0);
    const cleared = learners.filter(l => getBalance(l) <= 0).length;
    const owing = learners.filter(l => getBalance(l) > 0).length;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return { todayTotal, totalExpected, totalCollected, totalOwing, cleared, owing, collectionRate, todayCount: todayPayments.length };
  }, [learners, paylog, feeCfg]);

  const grades = useMemo(() => [...new Set(learners.map(l => l.grade))].sort(), [learners]);
  
  const filtered = useMemo(() => {
    let list = learners.map(l => ({ ...l, balance: getBalance(l), paid: getPaid(l) }));
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.adm?.includes(q));
    }
    if (filterGrade) list = list.filter(l => l.grade === filterGrade);
    if (filterStatus === 'cleared') list = list.filter(l => l.balance <= 0);
    if (filterStatus === 'owing') list = list.filter(l => l.balance > 0);
    if (sortBy === 'balance') list.sort((a, b) => b.balance - a.balance);
    else if (sortBy === 'grade') list.sort((a, b) => a.grade.localeCompare(b.grade));
    else list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [learners, searchQ, filterGrade, filterStatus, sortBy, feeCfg]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Nexed Financial Core…</div>;

  return (
    <div className="page on">
      <div className="page-hdr" style={{ marginBottom: 30 }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: 32, fontWeight: 900 }}>Financial Dashboard</h2>
          <p style={{ fontWeight: 600, color: 'var(--muted)', marginTop: 4 }}>
            <Tag size={14} className="inline mr-1" /> Institutional Ledger & Cash Flow Monitor
          </p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm hover-glow" onClick={() => setShowExpense(true)}>
            <Plus size={16} /> New Expense
          </button>
          <button className="btn btn-primary btn-sm premium-shadow" onClick={() => setShowReceipt(true)}>
            <Search size={16} /> Quick Receipt Search
          </button>
        </div>
      </div>

      <ExpenseVoucher inline isOpen={showExpense} onClose={() => setShowExpense(false)} />

      <div className="sg sg4" style={{ marginBottom: 32 }}>
        <div className="stat-card glass-card animate-float" style={{ borderLeft: '4px solid #059669', animationDelay: '0s' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}><Tag size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, letterSpacing: 1 }}>Today's Revenue</div>
              <div className="sc-n" style={{ fontSize: 24 }}>KES {fmtK(stats.todayTotal)}</div>
              <div className="sc-sub" style={{ background: '#ecfdf5', color: '#059669' }}>
                {stats.todayCount} record{stats.todayCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card glass-card animate-float" style={{ borderLeft: '4px solid #2563eb', animationDelay: '0.2s' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}><User size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, letterSpacing: 1 }}>Collection Rate</div>
              <div className="sc-n" style={{ fontSize: 24 }}>{stats.collectionRate}%</div>
              <div className="sc-sub" style={{ background: '#eff6ff', color: '#2563eb' }}>
                KES {fmtK(stats.totalCollected)}
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card glass-card animate-float" style={{ borderLeft: '4px solid #dc2626', animationDelay: '0.4s' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Truck size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, letterSpacing: 1 }}>Receivables</div>
              <div className="sc-n" style={{ fontSize: 24, color: '#dc2626' }}>KES {fmtK(stats.totalOwing)}</div>
              <div className="sc-sub" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {stats.owing} learners owing
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card glass-card animate-float" style={{ borderLeft: '4px solid #7c3aed', animationDelay: '0.6s' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}><Plus size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, letterSpacing: 1 }}>Cleared Status</div>
              <div className="sc-n" style={{ fontSize: 24, color: '#7c3aed' }}>{stats.cleared}</div>
              <div className="sc-sub" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                {learners.length} total enrolled
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel premium-shadow" style={{ marginBottom: 32, border: 'none', background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff' }}>
        <div className="panel-body p-8 flex items-center gap-12">
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#fff' }}>Collection Health Index</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Global progress of institutional fee acquisition for the current academic cycle.</p>
          </div>
          <div style={{ width: 400, textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 800 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Progress</span>
              <span style={{ fontSize: 24, color: '#10B981' }}>{stats.collectionRate}%</span>
            </div>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ width: `${stats.collectionRate}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, background: 'var(--border)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 24 }}>
        <button 
          className={`btn btn-sm ${activeView === 'ledger' ? 'btn-primary premium-shadow' : 'btn-ghost'}`} 
          style={{ border: 'none', borderRadius: 9 }}
          onClick={() => setActiveView('ledger')}
        >
          🏛️ Fee Ledger
        </button>
        <button 
          className={`btn btn-sm ${activeView === 'suppliers' ? 'btn-primary premium-shadow' : 'btn-ghost'}`} 
          style={{ border: 'none', borderRadius: 9 }}
          onClick={() => setActiveView('suppliers')}
        >
          🤝 Suppliers
        </button>
      </div>

      {activeView === 'ledger' ? (
        <div className="panel premium-shadow" style={{ border: 'none' }}>
          <div className="panel-hdr" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>🏛️ Institutional Fee Ledger</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input 
                  placeholder="Filter by adm/name..." 
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} 
                  style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 12, width: 220, outline: 'none' }} 
                />
              </div>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 12, outline: 'none' }}>
                <option value="">All Grades</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Admission</th>
                  <th>Learner Name</th>
                  <th>Grade Level</th>
                  <th>Outstanding Balance</th>
                  <th style={{ paddingRight: 24 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.adm}>
                    <td style={{ paddingLeft: 24, fontWeight: 700 }}>{l.adm}</td>
                    <td>
                      <button 
                        className="btn-link" 
                        style={{ fontWeight: 800, textDecoration: 'none' }}
                        onClick={() => router.push(`/learners/${l.adm}`)}
                      >
                        {l.name}
                      </button>
                    </td>
                    <td><span className="badge bg-blue">{l.grade}</span></td>
                    <td style={{ fontWeight: 900, color: l.balance > 0 ? '#dc2626' : '#059669' }}>
                      KES {fmtK(l.balance)}
                    </td>
                    <td style={{ paddingRight: 24 }}>
                      <span className={`badge ${l.balance <= 0 ? 'bg-green' : 'bg-red'}`} style={{ padding: '4px 12px' }}>
                        {l.balance <= 0 ? 'CLEARED' : 'OWING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel premium-shadow" style={{ border: 'none' }}>
          <div className="panel-hdr" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>🤝 Suppliers Registry</h3>
            <button className="btn btn-primary btn-sm premium-shadow" onClick={() => setShowAddSupplier(true)}>
              <Plus size={16} /> Add Supplier
            </button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Supplier Name</th>
                  <th>Category</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th style={{ paddingRight: 24, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
                    <Truck size={48} style={{ margin: '0 auto 15px', opacity: 0.2 }} />
                    <p>No registered suppliers found in the registry.</p>
                  </td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 24, fontWeight: 800 }}>{s.name}</td>
                    <td><span className="badge bg-blue">{s.category || 'General'}</span></td>
                    <td>{s.contactPerson || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{s.phone || '—'}</td>
                    <td style={{ paddingRight: 24, textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="modal-overlay open">
          <div className="modal premium-shadow" style={{ maxWidth: 450, borderRadius: 20 }}>
            <div className="modal-hdr" style={{ border: 'none', padding: '24px 30px 10px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 900 }}>New Supplier</h3>
              <button className="modal-close" onClick={() => setShowAddSupplier(false)}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.target);
              const res = await addSupplier({
                name: d.get('name'),
                category: d.get('category'),
                contactPerson: d.get('contact'),
                phone: d.get('phone'),
                email: d.get('email'),
                tenantId: user.tenantId
              });
              if (res.success) {
                load();
                setShowAddSupplier(false);
              } else alert(res.error);
            }}>
              <div className="modal-body" style={{ padding: '10px 30px 30px' }}>
                <div className="field"><label>Supplier Name *</label><input name="name" required placeholder="e.g. Acme Stationery" /></div>
                <div className="field"><label>Category</label><input name="category" placeholder="e.g. Food, Stationery, Maintenance" /></div>
                <div className="field-row">
                  <div className="field"><label>Contact Person</label><input name="contact" placeholder="John Doe" /></div>
                  <div className="field"><label>Phone</label><input name="phone" placeholder="0712..." /></div>
                </div>
                <div className="field"><label>Email Address</label><input name="email" type="email" placeholder="contact@acme.com" /></div>
                <button className="btn btn-primary w-full mt-6 premium-shadow" type="submit" style={{ height: 48, fontSize: 15 }}>Save Registry Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QuickReceipt isOpen={showReceipt} onClose={() => { setShowReceipt(false); load(); }} />
    </div>
  );
}
