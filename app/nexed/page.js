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
import { Search, Plus, User, Phone, Mail, Tag, Truck } from 'lucide-react';

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

  function getAnnualFee(grade) { return feeCfg[grade]?.annual || 0; }
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
      <div className="page-hdr">
        <div>
          <h2>💳 Nexed Financial Core</h2>
          <p>Institutional Ledger & Fee Management — {learners.length} enrolled learners</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExpense(true)}>
            💸 New Expense
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReceipt(true)}>
            🖨️ Quick Receipt
          </button>
        </div>
      </div>

      <ExpenseVoucher inline isOpen={showExpense} onClose={() => setShowExpense(false)} />

      <div className="sg sg4" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#ecfdf5' }}>💰</div>
            <div>
              <div className="sc-l">Today's Collections</div>
              <div className="sc-n">KES {fmtK(stats.todayTotal)}</div>
              <div className="sc-sub" style={{ background: '#ecfdf5', color: '#059669' }}>
                {stats.todayCount} transaction{stats.todayCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#eff6ff' }}>📊</div>
            <div>
              <div className="sc-l">Collection Rate</div>
              <div className="sc-n">{stats.collectionRate}%</div>
              <div className="sc-sub" style={{ background: '#eff6ff', color: '#2563eb' }}>
                KES {fmtK(stats.totalCollected)}
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#fef2f2' }}>⚠️</div>
            <div>
              <div className="sc-l">Total Outstanding</div>
              <div className="sc-n" style={{ color: '#dc2626' }}>KES {fmtK(stats.totalOwing)}</div>
              <div className="sc-sub" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {stats.owing} owing
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#f5f3ff' }}>✅</div>
            <div>
              <div className="sc-l">Cleared</div>
              <div className="sc-n" style={{ color: '#7c3aed' }}>{stats.cleared}</div>
              <div className="sc-sub" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                learners
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button className={`btn btn-sm ${activeView === 'ledger' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveView('ledger')}>🏛️ Fee Ledger</button>
        <button className={`btn btn-sm ${activeView === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveView('suppliers')}>🤝 Suppliers</button>
      </div>

      {activeView === 'ledger' ? (
        <div className="panel">
          <div className="panel-hdr">
            <h3>🏛️ Learner Fee Ledger</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="🔍 Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, width: 150 }} />
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                <option value="">All Grades</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm</th><th>Name</th><th>Grade</th><th>Balance</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.adm}>
                    <td>{l.adm}</td>
                    <td><button className="btn-link" onClick={() => router.push(`/learners/${l.adm}`)}>{l.name}</button></td>
                    <td>{l.grade}</td>
                    <td style={{ fontWeight: 800 }}>KES {fmtK(l.balance)}</td>
                    <td><span className={`badge ${l.balance <= 0 ? 'bg-green' : 'bg-red'}`}>{l.balance <= 0 ? 'Cleared' : 'Owing'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <h3>🤝 Suppliers Registry</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddSupplier(true)}>+ Add Supplier</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Contact</th><th>Phone</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No suppliers registered.</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td><span className="badge bg-blue">{s.category || 'General'}</span></td>
                    <td>{s.contactPerson || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td><button className="btn btn-ghost btn-sm">✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-hdr">
              <h3>➕ Add New Supplier</h3>
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
              <div className="modal-body">
                <div className="field"><label>Supplier Name *</label><input name="name" required /></div>
                <div className="field"><label>Category</label><input name="category" placeholder="e.g. Food, Stationery" /></div>
                <div className="field"><label>Contact Person</label><input name="contact" /></div>
                <div className="field"><label>Phone</label><input name="phone" /></div>
                <div className="field"><label>Email</label><input name="email" type="email" /></div>
                <button className="btn btn-primary w-full mt-4" type="submit">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QuickReceipt isOpen={showReceipt} onClose={() => { setShowReceipt(false); load(); }} />
    </div>
  );
}
