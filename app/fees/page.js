'use client';
/**
 * app/fees/page.js — Fee management (all receipts)
 *
 * Features:
 *   • Search learner, record payment (T1/T2/T3)
 *   • Payment methods: Cash, M-Pesa, Bank, Cheque
 *   • M-Pesa STK Push (via /api/mpesa) for parent payments
 *   • Fee balance overview table
 *   • Bulk print class receipts
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGrades, fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { usePersistedState } from '@/components/TabState';
import { useProfile } from '@/app/PortalShell';
import { Search, Plus, Settings, CreditCard, Clock, CheckCircle, XCircle, Printer, AlertCircle } from 'lucide-react';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import FinanceNav from '@/components/FinanceNav';

const METHODS = ['Cash','M-Pesa','Bank','Cheque','Bursary'];


export default function FeesPage() {
  const router = useRouter();
  const { playSuccessSound, profile } = useProfile();
  const curr = getCurriculum(profile?.curriculum || 'CBC', profile?.levels);
  const gradesList = getAllGrades(profile?.curriculum || 'CBC', profile);
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const [user,     setUser]     = useState(null);
  const [learners, setLearners] = useState([]);
  const [feeCfg,   setFeeCfg]   = useState({});
  const [paylog,   setPaylog]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [gradeF,   setGradeF]   = usePersistedState('paav_fees_grade', '');
  const [termF,    setTermF]    = useState(''); // '' | 'T1' | 'T2' | 'T3'
  const [modal,    setModal]    = useState(null); // 'pay' | 'config' | 'paybills' | null
  const [selLearner, setSelLearner] = useState(null);
  const [paybillAccounts, setPaybillAccounts] = useState([]);
  const [alert, setAlert] = useState({ msg: '', type: '' });

  const load = useCallback(async () => {
    try {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav6_learners',
          'paav6_feecfg',
          'paav6_paylog',
          'paav_paybill_accounts'
        ])
      ]);

      if (!u) { router.push('/login'); return; }
      if (u.role === 'parent') { router.push('/dashboard?tab=fees'); return; }
      if (!['admin','staff'].includes(u.role)) { router.push('/dashboard'); return; }
      setUser(u);
      setLearners(db.paav6_learners || []);
      setFeeCfg(  db.paav6_feecfg   || {});
      setPaylog(  db.paav6_paylog   || []);
      setPaybillAccounts(db.paav_paybill_accounts || []);
    } catch (e) {
      console.error('Fees load error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function approvePayment(p) {
    if (!confirm(`Approve payment of KES ${p.amount} for ${p.name}?`)) return;
    setLoading(true);
    try {
      const dbRes = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav6_learners' },
          { type: 'get', key: 'paav6_paylog'  },
        ]}),
      });
      const db = await dbRes.json();
      const list = db.results[0]?.value || [];
      const logs = db.results[1]?.value || [];

      const pIdx = logs.findIndex(x => x.id === p.id);
      if (pIdx >= 0) logs[pIdx].status = 'approved';

      const lIdx = list.findIndex(l => l.adm === p.adm);
      const termKey = p.term.toLowerCase();
      if (lIdx >= 0) list[lIdx][termKey] = (list[lIdx][termKey]||0) + Number(p.amount);

      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav6_learners', value: list  },
          { type: 'set', key: 'paav6_paylog',   value: logs },
        ]}),
      });
      load();
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function rejectPayment(p) {
    if (!confirm(`Reject/Delete this payment of KES ${p.amount}?`)) return;
    const updated = paylog.filter(x => x.id !== p.id);
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_paylog', value: updated }] }),
    });
    setPaylog(updated);
  }

  function getAnnualFee(grade) {
    const cfg = feeCfg[grade] || {};
    // Sum across all curriculum terms (e.g. t1+t2+t3 for CBC, s1+s2 for IB)
    const termSum = TERMS.reduce((s, t) => s + (cfg[t.id.toLowerCase()] || 0), 0);
    return termSum || cfg.annual || 5000;
  }
  // Helper: total paid by a learner across all terms
  function getPaidTotal(l) {
    return TERMS.reduce((s, t) => s + (l[t.id.toLowerCase()] || 0), 0);
  }
  function getBal(l, term = '') {
    if (term) {
      const cfg = feeCfg[l.grade] || {};
      const exp  = cfg[term.toLowerCase()] || 0;
      const paid = l[term.toLowerCase()] || 0;
      return exp - paid;
    }
    return getAnnualFee(l.grade) + (l.arrears || 0) - getPaidTotal(l);
  }

  const filtered = learners.filter(l => {
    const q   = query.toLowerCase();
    const hit = !q || l.name?.toLowerCase().includes(q) || l.adm?.includes(q);
    return hit && (!gradeF || l.grade === gradeF);
  });

  const totalAccumulated = learners.reduce((s, l) => s + (l.arrears || 0), 0);
  const totalExp = learners.reduce((s, l) => {
    if (termF) return s + ((feeCfg[l.grade] || {})[termF.toLowerCase()] || 0);
    return s + getAnnualFee(l.grade);
  }, 0);
  const totalPaid = learners.reduce((s, l) => {
    if (termF) return s + (l[termF.toLowerCase()] || 0);
    return s + getPaidTotal(l);
  }, 0);
  const totalBalance = totalExp + (termF ? 0 : totalAccumulated) - totalPaid;
  const cleared = learners.filter(l => getBal(l, termF) <= 0).length;

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading collections hub…</div>;

  const pendingCount = paylog.filter(p => p.status === 'pending').length;

  return (
    <>
      <div className="page on">
        <FinanceNav />
        <div className="page-hdr no-print" style={{ marginBottom: 25 }}>
          <div>
            <h2 className="gradient-text" style={{ fontSize: 28, fontWeight: 900 }}>Collections Hub</h2>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <CreditCard size={14} /> Operational Payment Processing
            </p>
          </div>
          <div className="page-hdr-acts">
            {user?.role === 'admin' && (
              <>
                <button className="btn btn-ghost btn-sm hover-glow" onClick={() => setModal('config')}>
                  <Settings size={16} /> Fee Config
                </button>
                <button className="btn btn-ghost btn-sm hover-glow" onClick={() => setModal('paybills')}>
                  📱 M-Pesa Accounts
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm premium-shadow" onClick={() => window.print()}>
              <Printer size={16} /> Bulk Print Balances
            </button>
          </div>
        </div>

        <div className="sg sg4 no-print" style={{ marginBottom: 25 }}>
          <StatCard icon={<Clock size={20} />} label={termF ? `${termF} Expected` : "Total Expected"} value={fmtK(totalExp)} color="#2563eb" bg="rgba(37, 99, 235, 0.1)" />
          <StatCard icon={<CheckCircle size={20} />} label="Total Collected" value={fmtK(totalPaid)} color="#059669" bg="rgba(5, 150, 105, 0.1)" />
          <StatCard icon={<AlertCircle size={20} />} label="Outstanding" value={fmtK(totalBalance)} color="#dc2626" bg="rgba(220, 38, 38, 0.1)" />
          <StatCard icon={<CheckCircle size={20} />} label="Cleared" value={`${cleared} / ${learners.length}`} color="#7c3aed" bg="rgba(124, 58, 237, 0.1)" />
        </div>

        {user?.role === 'admin' && pendingCount > 0 && (
          <div className="panel premium-shadow no-print" style={{ marginBottom: 25, border: 'none', background: '#FFF7ED' }}>
            <div className="panel-hdr" style={{ background: 'transparent', border: 'none', padding: '15px 20px' }}>
              <h3 style={{ color: '#92400E', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} /> ACTION REQUIRED: Pending Approvals
              </h3>
              <span className="badge bg-amber" style={{ borderRadius: 10 }}>{pendingCount} new</span>
            </div>
            <div className="tbl-wrap">
              <table style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th>Date</th><th>Adm</th><th>Name</th><th>Amount</th><th>Method</th><th>Ref</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paylog.filter(p => p.status === 'pending').map((p, i) => (
                    <tr key={i} style={{ background: 'rgba(255,255,255,0.4)' }}>
                      <td>{p.date}</td>
                      <td><strong>{p.adm}</strong></td>
                      <td>{p.name}</td>
                      <td style={{ fontWeight: 900 }}>{fmtK(p.amount)}</td>
                      <td><span className="badge bg-blue" style={{ fontSize: 10 }}>{p.method}</span></td>
                      <td style={{ fontSize: 11 }}>{p.ref}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-sm btn-success premium-shadow" onClick={() => approvePayment(p)}>Approve</button>
                        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 5, color: 'var(--red)', border: 'none' }} onClick={() => rejectPayment(p)}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="panel premium-shadow" style={{ border: 'none', marginBottom: 25 }}>
          <div className="panel-hdr" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontWeight: 800 }}>📋 Learner Collections Status</h3>
            <div className="no-print" style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input 
                  placeholder="Quick search..." 
                  value={query} onChange={e => setQuery(e.target.value)} 
                  style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 12, width: 200, outline: 'none' }} 
                />
              </div>
              <select value={gradeF} onChange={e => setGradeF(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 12, outline: 'none' }}>
                <option value="">All Grades</option>
                {gradesList.map(g => <option key={g}>{g}</option>)}
              </select>
              <select value={termF} onChange={e => setTermF(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 12, outline: 'none' }}>
                <option value="">Full Year View</option>
                {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Adm</th>
                  <th>Learner Name</th>
                  <th>Grade</th>
                  {termF ? (
                    <>
                      <th>Expected</th>
                      <th>Paid</th>
                    </>
                  ) : (
                    <>
                      {TERMS.map(t => (
                        <th key={t.id}>{t.name} (P)</th>
                      ))}
                    </>
                  )}
                  <th>Total Paid</th>
                  <th>Balance</th>
                  <th className="no-print" style={{ paddingRight: 24, textAlign: 'right' }}>Process</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const cfg = feeCfg[l.grade] || {};
                  const fee = termF ? (cfg[termF.toLowerCase()] || 0) : getAnnualFee(l.grade);
                  const tp  = termF ? (l[termF.toLowerCase()] || 0) : getPaidTotal(l);
                  const bal = termF ? (fee - tp) : getBal(l);
                  return (
                    <tr key={l.adm} className="hover-row">
                      <td style={{ paddingLeft: 24, fontWeight: 700 }}>{l.adm}</td>
                      <td style={{ fontWeight: 600 }}>{l.name}</td>
                      <td><span className="badge bg-blue" style={{ fontSize: 10 }}>{l.grade}</span></td>
                      {termF ? (
                        <>
                          <td style={{ fontWeight: 700 }}>{fmtK(fee)}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 800 }}>{fmtK(tp)}</td>
                        </>
                      ) : (
                        <>
                          {TERMS.map(t => {
                            const tk = t.id.toLowerCase();
                            return (
                              <td key={t.id}>
                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtK(cfg[tk]||0)}</div>
                                <div style={{ fontWeight: 700 }}>{fmtK(l[tk]||0)}</div>
                              </td>
                            );
                          })}
                        </>
                      )}
                      <td style={{ fontWeight: 900 }}>{fmtK(tp)}</td>
                      <td>
                        {bal <= 0
                          ? <span className="badge bg-green" style={{ fontSize: 9 }}>CLEARED</span>
                          : <span className="badge bg-amber" style={{ fontSize: 9 }}>{fmtK(bal)} OWING</span>}
                      </td>
                      <td className="no-print" style={{ paddingRight: 24, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-primary btn-sm premium-shadow" onClick={() => { setSelLearner(l); setModal('pay'); }}>
                          <Plus size={12} /> Pay
                        </button>
                        <SMSReminderButton adm={l.adm} balance={bal} phone={l.phone} />
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, border: 'none' }} onClick={() => router.push(`/fees/${encodeURIComponent(l.adm)}/receipt`)}>
                          🧾
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel premium-shadow no-print" style={{ border: 'none' }}>
          <div className="panel-hdr" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontWeight: 800 }}>📥 Payment Journal (Recent Activity)</h3>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Date</th><th>Adm</th><th>Name</th><th>Term</th><th>Amount</th><th>Method</th><th>Ref</th><th>Status</th><th style={{ paddingRight: 24, textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paylog.filter(p => p.status !== 'pending').slice(-20).reverse().map((p, i) => (
                  <tr key={i}>
                    <td style={{ paddingLeft: 24, fontSize: 11 }}>{p.date}</td>
                    <td style={{ fontWeight: 700 }}>{p.adm}</td>
                    <td>{p.name}</td>
                    <td><span className="badge bg-blue" style={{ fontSize: 9 }}>{p.term}</span></td>
                    <td style={{ fontWeight: 900, color: 'var(--green)' }}>{fmtK(p.amount)}</td>
                    <td><span className="badge bg-teal" style={{ fontSize: 9 }}>{p.method}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{p.ref || '—'}</td>
                    <td>
                      <span className={`badge ${p.status === 'approved' ? 'bg-green' : 'bg-amber'}`} style={{ fontSize: 9 }}>
                        {(p.status || 'approved').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ paddingRight: 24, textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ border: 'none' }} onClick={() => router.push(`/fees/${encodeURIComponent(p.adm)}/receipt`)}>
                        🧾
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === 'pay' && selLearner && (
        <PayModal learner={selLearner} feeCfg={feeCfg} onClose={() => { setModal(null); setSelLearner(null); load(); }} recordedBy={user?.name} TERMS={TERMS} />
      )}
      {modal === 'config' && <FeeConfigModal feeCfg={feeCfg} grades={gradesList} onClose={() => { setModal(null); load(); }} TERMS={TERMS} />}
      {modal === 'paybills' && <PaybillConfigModal accounts={paybillAccounts} onClose={() => { setModal(null); load(); }} />}
    </>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="stat-card glass-card hover-glow" style={{ border: 'none' }}>
      <div className="sc-inner">
        <div className="sc-icon" style={{ background: bg, color: color }}>{icon}</div>
        <div>
          <div className="sc-l" style={{ fontSize: 9, letterSpacing: 1 }}>{label}</div>
          <div className="sc-n" style={{ fontSize: 20, fontWeight: 900, color: color }}>{value}</div>
        </div>
      </div>
    </div>
  );
}




/* ─── Settlement Config Modal ──────────────────────────────────────────────── */
function PaybillConfigModal({ accounts, onClose }) {
  const [list, setList] = useState(
    accounts.length ? accounts : [{ id: Date.now(), name: '', type: 'Bank', accNo: '', bank: '', branch: '' }]
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_paybill_accounts', value: list }] }),
    });
    setBusy(false);
    onClose();
  }

  const add = () => setList([...list, { id: Date.now(), name: '', type: 'Bank', accNo: '', bank: '', branch: '' }]);
  const del = (id) => setList(list.filter(x => x.id !== id));
  const upd = (id, k, v) => setList(list.map(x => x.id === id ? { ...x, [k]: v } : x));

  return (
    <ModalOverlay title="🏦 Settlement Accounts" onClose={onClose}>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>
        EduVantage processes all parent payments centrally. Configure the Bank or M-Pesa Till accounts where we should disburse your collected fees.
      </p>
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
        {list.map((a, i) => (
          <div key={a.id} style={{ padding: 14, border: '1.5px solid var(--border)', borderRadius: 12, marginBottom: 12, background: '#FAFBFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 11 }}>SETTLEMENT ROUTE #{i + 1}</span>
              {list.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '2px 8px' }} onClick={() => del(a.id)}>✕ Remove</button>
              )}
            </div>
            <div className="field">
              <label>Account Label (e.g. Tuition Fees, Transport)</label>
              <input value={a.name} onChange={e => upd(a.id, 'name', e.target.value)} placeholder="Tuition Fees" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Destination Type</label>
                <select value={a.type} onChange={e => upd(a.id, 'type', e.target.value)}>
                  <option value="Bank">Direct Bank Transfer</option>
                  <option value="M-Pesa">M-Pesa Till / Paybill</option>
                </select>
              </div>
              <div className="field">
                <label>{a.type === 'Bank' ? 'Bank Account Number' : 'Till / Paybill Number'}</label>
                <input value={a.accNo || a.shortcode || ''} onChange={e => {
                  if (a.type === 'Bank') upd(a.id, 'accNo', e.target.value);
                  else upd(a.id, 'shortcode', e.target.value);
                }} placeholder={a.type === 'Bank' ? '1234567890' : '400200'} />
              </div>
            </div>

            {a.type === 'Bank' && (
              <div className="field-row">
                <div className="field"><label>Bank Name</label><input value={a.bank} onChange={e => upd(a.id, 'bank', e.target.value)} placeholder="e.g. KCB, Equity" /></div>
                <div className="field"><label>Branch Code (Optional)</label><input value={a.branch} onChange={e => upd(a.id, 'branch', e.target.value)} placeholder="Westlands" /></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={add} style={{ width: '100%', border: '1px dashed var(--border)', marginTop: 5 }}>
        + Add Another Settlement Route
      </button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy} style={{ width: 'auto' }}>
          {busy ? '⏳ Saving…' : '💾 Save Configurations'}
        </button>
      </div>
    </ModalOverlay>
  );
}


function PayModal({ learner, feeCfg, onClose, recordedBy, TERMS }) {
  const getAnnualFee = g => feeCfg[g]?.annual || 5000;
  const [term,   setTerm]   = useState(TERMS[0]?.id || 'T1');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [ref,    setRef]    = useState('');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  async function pay() {
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return; }
    setBusy(true);

    try {
      // Use the centralized server-side payment logic
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { 
            type: 'recordPayment', 
            payment: {
              adm:    learner.adm,
              term,
              amount: Number(amount),
              method, ref,
              by: recordedBy || 'Staff',
              status: 'approved'
            }
          }
        ]}),
      });

      // Trigger email receipt (silent)
      try {
        fetch('/api/email/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adm: learner.adm,
            amount: Number(amount),
            term,
            ref,
            balance: balance - Number(amount)
          })
        });
      } catch (e) {}

      setBusy(false);
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const annualFee = getAnnualFee(learner.grade);
  const totalPaid = TERMS.reduce((s, t) => s + (learner[t.id.toLowerCase()] || 0), 0);
  const balance   = annualFee + (learner.arrears || 0) - totalPaid;

  return (
    <ModalOverlay title={`💰 Record Payment — ${learner.name}`} onClose={onClose}>
      {err && <div className="alert alert-err show" style={{ display:'flex' }}>{err}</div>}
      <div style={{ padding: '10px 14px', background: '#F8FAFF', borderRadius: 10,
        marginBottom: 14, fontSize: 12.5 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
          <span style={{ color:'var(--muted)' }}>Adm No</span>
          <strong>{learner.adm}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
          <span style={{ color:'var(--muted)' }}>Annual Fee</span>
          <strong>{fmtK(annualFee)}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
          <span style={{ color:'var(--muted)' }}>Accumulated Fee</span>
          <strong>{fmtK(learner.arrears || 0)}</strong>
        </div>
        {(TERMS.some(t => feeCfg[learner.grade]?.[t.id.toLowerCase()])) && (
          <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px dashed var(--border)', paddingTop: 4, marginTop: 4 }}>
            {TERMS.map(t => `${t.id}: ${fmtK(feeCfg[learner.grade]?.[t.id.toLowerCase()] || 0)}`).join(' · ')}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop: 4 }}>
          <span style={{ color:'var(--muted)' }}>Balance</span>
          <strong style={{ color: balance<=0 ? 'var(--green)':'var(--red)' }}>
            {fmtK(balance)}
          </strong>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}>
            {TERMS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {METHODS.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Amount (KSH)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          min="1" placeholder="e.g. 3000" />
      </div>
      <div className="field">
        <label>Reference / M-Pesa Code (optional)</label>
        <input value={ref} onChange={e => setRef(e.target.value)}
          placeholder="e.g. QA1234XYZ" />
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-success btn-sm" onClick={pay} disabled={busy}
          style={{ width:'auto', opacity: busy ? 0.7:1 }}>
          {busy ? '⏳ Recording…' : '✅ Record Payment'}
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ─── Fee Config Modal ───────────────────────────────────────────────────── */
function FeeConfigModal({ feeCfg, grades, onClose, TERMS }) {
  const [cfg,     setCfg]    = useState(() => JSON.parse(JSON.stringify(feeCfg || {})));
  const [busy,    setBusy]   = useState(false);
  const [saved,   setSaved]  = useState(false);
  const [search,  setSearch] = useState('');

  // Compute annual total for a grade from all terms
  function annualFor(g) {
    return TERMS.reduce((s, t) => s + (cfg[g]?.[t.id.toLowerCase()] || 0), 0);
  }

  // Check if a grade has any fee set
  function isConfigured(g) {
    return TERMS.some(t => (cfg[g]?.[t.id.toLowerCase()] || 0) > 0);
  }

  function updateFee(grade, termId, val) {
    const key = termId.toLowerCase();
    setCfg(prev => ({
      ...prev,
      [grade]: {
        ...(prev[grade] || {}),
        [key]: Number(val) || 0,
        // Keep the annual field in sync for backward compat
        annual: TERMS.reduce((s, t) => {
          const k = t.id.toLowerCase();
          return s + (k === key ? (Number(val) || 0) : (prev[grade]?.[k] || 0));
        }, 0)
      }
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_feecfg', value: cfg }] }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e) {
      alert('Could not save fee config: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const displayGrades = (grades || []).filter(g =>
    !search || g.toLowerCase().includes(search.toLowerCase())
  );

  const configuredCount = (grades || []).filter(isConfigured).length;

  return (
    <ModalOverlay
      title="⚙ Fee Configuration"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={busy}
            style={{ width: 'auto', opacity: busy ? 0.7 : 1, background: saved ? '#059669' : undefined, minWidth: 160, fontWeight: 800 }}
          >
            {saved ? '✅ Saved!' : busy ? '⏳ Saving…' : '💾 Save Fee Config'}
          </button>
        </>
      }
    >
      {/* Flex column so content fills modal-body */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Summary bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
          padding: '10px 14px', borderRadius: 10, background: configuredCount > 0 ? 'rgba(5,150,105,0.08)' : '#FFF7ED',
          border: `1px solid ${configuredCount > 0 ? 'rgba(5,150,105,0.2)' : '#FDE68A'}`,
          flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Set expected fees per {TERMS.length === 2 ? 'semester' : 'term'} for each grade level.
            Annual total is calculated automatically.
          </div>
          <span className={`badge ${configuredCount > 0 ? 'bg-green' : 'bg-amber'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
            {configuredCount} / {(grades||[]).length} configured
          </span>
        </div>

        {/* Grade search */}
        <input
          placeholder="🔍 Filter grades…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: '8px 12px', border: '1.5px solid var(--border)',
            borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', flexShrink: 0 }}
        />

        {/* Scrollable grades list — takes remaining space */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, minHeight: 0 }}>
          {displayGrades.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No grades match your filter.</p>
          )}
          {displayGrades.map(g => {
            const annual = annualFor(g);
            const configured = isConfigured(g);
            return (
              <div key={g} style={{ padding: 12, border: `1.5px solid ${configured ? 'rgba(5,150,105,0.35)' : 'var(--border)'}`,
                borderRadius: 10, marginBottom: 10,
                background: configured ? 'rgba(5,150,105,0.04)' : '#FAFBFF',
                transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 12 }}>{g}</span>
                  {configured
                    ? <span className="badge bg-green" style={{ fontSize: 9 }}>✓ Configured — {fmtK(annual)}/yr</span>
                    : <span className="badge bg-amber" style={{ fontSize: 9 }}>Not set</span>}
                </div>
                <div className="field-row">
                  {TERMS.map((t, idx) => (
                    <div className="field" key={t.id}>
                      <label style={{ fontSize: 10 }}>{t.name}</label>
                      <input
                        type="number"
                        min="0"
                        value={cfg[g]?.[t.id.toLowerCase()] || ''}
                        onChange={e => updateFee(g, t.id, e.target.value)}
                        placeholder={idx === 0 ? 'e.g. 15000' : idx === 1 ? 'e.g. 12000' : 'e.g. 10000'}
                        style={{ borderColor: configured ? 'rgba(5,150,105,0.4)' : undefined }}
                      />
                    </div>
                  ))}
                </div>
                {configured && (
                  <div style={{ fontSize: 10, color: '#059669', marginTop: 4, textAlign: 'right', fontWeight: 700 }}>
                    Annual Total: {fmtK(annual)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function SCard({ icon, label, value, bg }) {
  return (
    <div className="stat-card">
      <div className="sc-inner">
        <div className="sc-icon" style={{ background: bg }}>{icon}</div>
        <div>
          <div className="sc-n" style={{ fontSize: 16 }}>{value}</div>
          <div className="sc-l">{label}</div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; background: white !important; }
          .no-print, .btn, .page-hdr-acts, input, select { display: none !important; }
          .page { padding: 0 !important; margin: 0 !important; border: none !important; }
          .panel { box-shadow: none !important; border: 1px solid #ddd !important; margin-bottom: 10px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { padding: 6px 4px !important; font-size: 10px !important; border: 1px solid #eee !important; }
          .stat-card, .sg { margin-bottom: 10px !important; }
          .stat-card { border: 1px solid #eee !important; width: 25% !important; float: left !important; }
          .badge { border: 1px solid currentColor !important; }
          .page-hdr h2 { font-size: 18px !important; margin: 0 !important; }
          .page-hdr p { font-size: 10px !important; margin: 0 !important; }
          .panel-hdr h3 { font-size: 14px !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function ModalOverlay({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ overflow: 'visible', display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>
        <div className="modal-hdr">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function SMSReminderButton({ adm, balance, phone }) {
  const [busy, setBusy] = useState(false);
  const [sendState, setSendState] = useState('');

  async function send() {
    if (balance <= 0) return;
    if (!phone) { alert('No phone number set for this parent.'); return; }
    if (!confirm(`Send SMS fee reminder to ${phone}?`)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/whatsapp/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adm, balance })
      });
      const data = await res.json();
      if (data.success) {
        setSendState('submitted');
        setTimeout(() => setSendState(''), 3000);
      } else {
        setSendState('failed');
        alert(data.error || data.result?.failed?.[0]?.error || 'Failed to send SMS');
        setTimeout(() => setSendState(''), 3000);
      }
    } catch (e) {
      console.error(e);
      setSendState('failed');
      alert(e.message || 'Failed to send SMS');
      setTimeout(() => setSendState(''), 3000);
    } finally {
      setBusy(false);
    }
  }

  if (balance <= 0) return null;

  return (
    <button 
      className="btn btn-sm" 
      onClick={send} 
      disabled={busy}
      style={{ 
        marginLeft: 4, 
        background: sendState === 'submitted' ? '#d97706' : sendState === 'failed' ? '#dc2626' : '#1e293b', 
        color: '#fff', 
        border: 'none',
        opacity: busy ? 0.7 : 1
      }}
      title={sendState === 'submitted' ? 'SMS submitted to provider; waiting for carrier delivery report' : 'Send SMS Reminder'}
    >
      {busy ? '⏳' : sendState === 'submitted' ? '…' : sendState === 'failed' ? '!' : '📱'}
    </button>
  );
}
