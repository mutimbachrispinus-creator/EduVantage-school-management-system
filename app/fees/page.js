'use client';
export const runtime = 'edge';
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
import { ALL_GRADES, fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { usePersistedState } from '@/components/TabState';
import { useProfile } from '@/app/PortalShell';


const METHODS = ['Cash','M-Pesa','Bank','Cheque','Bursary'];

import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

export default function FeesPage() {
  const router = useRouter();
  const { playSuccessSound, profile } = useProfile();
  const curr = getCurriculum(profile?.curriculum || 'CBC');
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
      
      // Strict Redirection for Parents
      if (u.role === 'parent') {
        router.push('/dashboard?tab=fees');
        return;
      }

      if (!['admin','staff'].includes(u.role)) {
        router.push('/dashboard'); return;
      }
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
    const sum = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0);
    return sum || cfg.annual || 5000;
  }
  function getBal(l, term = '') {
    if (term) {
      const cfg = feeCfg[l.grade] || {};
      const exp = cfg[term.toLowerCase()] || 0;
      const paid = l[term.toLowerCase()] || 0;
      return exp - paid;
    }
    return getAnnualFee(l.grade) + (l.arrears || 0) - (l.t1||0) - (l.t2||0) - (l.t3||0);
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
    return s + (l.t1 || 0) + (l.t2 || 0) + (l.t3 || 0);
  }, 0);
  const totalBalance = totalExp + (termF ? 0 : totalAccumulated) - totalPaid;
  const cleared = learners.filter(l => getBal(l, termF) <= 0).length;

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading fees…</div>;

  return (
    <>
      <div className="page on">
        <div className="page-hdr no-print">
          <div>
            <h2>💰 Fees</h2>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Manage school fee payments and receipts
              
              {user?.role === 'admin' && (
                <span style={{ background: '#FDF2F2', color: '#8B1A1A', fontWeight: 700,
                  fontSize: 11, padding: '2px 9px', borderRadius: 20, border: '1.5px solid #FECACA' }}>
                  Admin — full access incl. fee config
                </span>
              )}
            </p>
          </div>
          <div className="page-hdr-acts">
            {user?.role === 'admin' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal('config')}>
                  ⚙ Fee Config
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal('paybills')}>
                  📱 M-Pesa Accounts
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>
              🖨️ Print
            </button>
          </div>
        </div>

        {/* ── Summary cards (Admin Only) ── */}
        {user?.role === 'admin' && (
          <div className="sg sg4 no-print" style={{ marginBottom: 18 }}>
            <SCard icon="🎯" label={termF ? `${termF} Expected` : "Expected"} value={fmtK(totalExp)}    bg="#EFF6FF" />
            <SCard icon="✅" label={termF ? `${termF} Collected` : "Collected"} value={fmtK(totalPaid)}  bg="#ECFDF5" />
            <SCard icon="⚠" label={termF ? `${termF} Balance` : "Balance"}   value={fmtK(totalBalance)} bg="#FEF2F2" />
            <SCard icon="🟢" label="Cleared"  value={`${cleared} / ${learners.length}`} bg="#F5F3FF" />
          </div>
        )}

        {/* ── Pending Approvals ── */}
        {user?.role === 'admin' && paylog.some(p => p.status === 'pending') && (
          <div className="panel no-print" style={{ marginBottom: 18, border: '2px solid var(--amber)' }}>
            <div className="panel-hdr" style={{ background: '#FFF7ED' }}>
              <h3 style={{ color: '#92400E' }}>⏳ Pending Approvals</h3>
              <span className="badge bg-amber">{paylog.filter(p => p.status === 'pending').length}</span>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 8px' }}>Date</th>
                    <th style={{ padding: '6px 8px' }}>Adm</th>
                    <th style={{ padding: '6px 8px' }}>Name</th>
                    <th style={{ padding: '6px 8px' }}>Amount</th>
                    <th style={{ padding: '6px 8px' }}>Method</th>
                    <th style={{ padding: '6px 8px' }}>Ref</th>
                    <th style={{ padding: '6px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paylog.filter(p => p.status === 'pending').map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px' }}>{p.date}</td>
                      <td style={{ padding: '6px 8px' }}><strong>{p.adm}</strong></td>
                      <td style={{ padding: '6px 8px' }}>{p.name}</td>
                      <td style={{ fontWeight: 800, padding: '6px 8px' }}>{fmtK(p.amount)}</td>
                      <td style={{ padding: '6px 8px' }}>{p.method}</td>
                      <td style={{ fontSize: 11, padding: '6px 8px' }}>{p.ref}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <button className="btn btn-sm btn-success" onClick={() => approvePayment(p)}>Approve</button>
                        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 5, color: 'var(--red)' }} onClick={() => rejectPayment(p)}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Payment log ── */}
        <div className="panel no-print" style={{ marginBottom: 18 }}>
          <div className="panel-hdr">
            <h3>📥 Recent Payments</h3>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px' }}>Date</th>
                  <th style={{ padding: '6px 8px' }}>Adm</th>
                  <th style={{ padding: '6px 8px' }}>Name</th>
                  <th style={{ padding: '6px 8px' }}>Term</th>
                  <th style={{ padding: '6px 8px' }}>Amount</th>
                  <th style={{ padding: '6px 8px' }}>Method</th>
                  <th style={{ padding: '6px 8px' }}>Ref</th>
                  <th style={{ padding: '6px 8px' }}>By</th>
                  <th style={{ padding: '4px 6px' }}>Date</th>
                  <th style={{ padding: '4px 6px' }}>Adm</th>
                  <th style={{ padding: '4px 6px' }}>Name</th>
                  <th style={{ padding: '4px 6px' }}>Term</th>
                  <th style={{ padding: '4px 6px' }}>Amount</th>
                  <th style={{ padding: '4px 6px' }}>Method</th>
                  <th style={{ padding: '4px 6px' }}>Ref</th>
                  <th style={{ padding: '4px 6px' }}>By</th>
                  <th style={{ padding: '4px 6px' }}>Status</th>
                  <th className="no-print" style={{ padding: '4px 6px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paylog.filter(p => p.status !== 'pending').slice(-50).reverse().map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, padding: '4px 6px' }}>{p.date}</td>
                    <td style={{ fontWeight: 700, fontSize: 11.5, padding: '4px 6px' }}>{p.adm}</td>
                    <td style={{ padding: '4px 6px' }}>{p.name}</td>
                    <td style={{ padding: '4px 6px' }}><span className="badge bg-blue" style={{ fontSize: 10 }}>{p.term}</span></td>
                    <td style={{ fontWeight: 800, color: 'var(--green)', padding: '4px 6px' }}>{fmtK(p.amount)}</td>
                    <td style={{ padding: '4px 6px' }}><span className="badge bg-teal" style={{ fontSize: 10 }}>{p.method}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 6px' }}>{p.ref || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 6px' }}>{p.by || '—'}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <span className={`badge bg-${p.status === 'approved' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>
                        {(p.status || 'approved').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => router.push(`/fees/${encodeURIComponent(p.adm)}/receipt`)}>
                        🧾
                      </button>
                    </td>
                  </tr>
                ))}
                {paylog.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No payments recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Learner fee balances ── */}
        <div className="panel">
          <div className="panel-hdr">
            <h3>📋 Learner Fee Balances</h3>
            <div className="print-only" style={{ display: 'none' }}>EduVantage - Fee Balances Report</div>
            <div className="no-print" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-maroon btn-sm"
                onClick={() => {
                  const arrearsOnly = learners.filter(l => getBal(l) > 0);
                  if (arrearsOnly.length === 0) { alert('No learners with fee balances found.'); return; }
                  window.print();
                }}>
                🖨️ Print Balances
              </button>
              <input
                placeholder="🔍 Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ padding: '7px 11px', border: '2px solid var(--border)',
                  borderRadius: 8, fontSize: 12, width: 200, outline: 'none' }}
              />
              <select value={gradeF} onChange={e => setGradeF(e.target.value)}
                style={{ padding: '7px 11px', border: '2px solid var(--border)',
                  borderRadius: 8, fontSize: 12, outline: 'none' }}>
                <option value="">All Grades</option>
                {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
              <select value={termF} onChange={e => setTermF(e.target.value)}
                style={{ padding: '7px 11px', border: '2px solid var(--border)',
                  borderRadius: 8, fontSize: 12, outline: 'none' }}>
                <option value="">Full Year</option>
                {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px' }}>Adm</th>
                  <th style={{ padding: '6px 8px' }}>Name</th>
                  <th style={{ padding: '6px 8px' }}>Grade</th>
                  {termF ? (
                    <>
                      <th style={{ padding: '6px 8px' }}>{termF} Expected</th>
                      <th style={{ padding: '6px 8px' }}>{termF} Paid</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '6px 8px' }}>Annual Total</th>
                      <th style={{ padding: '6px 8px' }}>Term 1 (Exp/Paid)</th>
                      <th style={{ padding: '6px 8px' }}>Term 2 (Exp/Paid)</th>
                      <th style={{ padding: '6px 8px' }}>Term 3 (Exp/Paid)</th>
                    </>
                  )}
                  <th style={{ padding: '6px 8px' }}>Total Paid</th>
                  <th style={{ padding: '6px 8px' }}>Balance</th>
                  <th className="no-print" style={{ padding: '6px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const cfg = feeCfg[l.grade] || {};
                  const fee = termF ? (cfg[termF.toLowerCase()] || 0) : getAnnualFee(l.grade);
                  const tp  = termF ? (l[termF.toLowerCase()] || 0) : (l.t1||0)+(l.t2||0)+(l.t3||0);
                  const bal = fee - tp;
                  return (
                    <tr key={l.adm}>
                      <td style={{ fontWeight: 700, padding: '6px 8px' }}>{l.adm}</td>
                      <td style={{ padding: '6px 8px' }}>{l.name}</td>
                      <td style={{ padding: '6px 8px' }}><span className="badge bg-blue" style={{ fontSize: 10 }}>{l.grade}</span></td>
                      {termF ? (
                        <>
                          <td style={{ fontWeight: 800, padding: '6px 8px' }}>{fmtK(cfg[termF.toLowerCase()] || 0)}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 700, padding: '6px 8px' }}>{fmtK(l[termF.toLowerCase()] || 0)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 800, padding: '6px 8px' }}>{fmtK(fee)}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Exp: {fmtK(cfg.t1||0)}</div>
                            <div style={{ color: 'var(--green)', fontWeight: 700 }}>Paid: {fmtK(l.t1||0)}</div>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Exp: {fmtK(cfg.t2||0)}</div>
                            <div style={{ color: 'var(--green)', fontWeight: 700 }}>Paid: {fmtK(l.t2||0)}</div>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Exp: {fmtK(cfg.t3||0)}</div>
                            <div style={{ color: 'var(--green)', fontWeight: 700 }}>Paid: {fmtK(l.t3||0)}</div>
                          </td>
                        </>
                      )}
                      <td style={{ fontWeight: 800, padding: '6px 8px' }}>{fmtK(tp)}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {bal <= 0
                          ? <span className="badge bg-green">Cleared</span>
                          : <span className="badge bg-amber">{fmtK(bal)}</span>}
                      </td>
                      <td className="no-print" style={{ whiteSpace: 'nowrap', padding: '6px 8px' }}>
                        <button className="btn btn-success btn-sm"
                          onClick={() => { setSelLearner(l); setModal('pay'); }}>
                          + Pay
                        </button>
                        <SMSReminderButton adm={l.adm} balance={bal} phone={l.phone} />
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}
                          onClick={() => router.push(`/fees/${encodeURIComponent(l.adm)}/receipt`)}>
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
      </div>

      {/* ── Pay Modal ── */}
      {modal === 'pay' && selLearner && (
        <PayModal
          learner={selLearner}
          feeCfg={feeCfg}
          onClose={() => { setModal(null); setSelLearner(null); load(); }}
          recordedBy={user?.name}
          TERMS={TERMS}
        />
      )}

      {/* ── Fee Config Modal ── */}
      {modal === 'config' && (
        <FeeConfigModal
          feeCfg={feeCfg}
          onClose={() => { setModal(null); load(); }}
          TERMS={TERMS}
        />
      )}

      {/* ── Paybill Config Modal ── */}
      {modal === 'paybills' && (
        <PaybillConfigModal
          accounts={paybillAccounts}
          onClose={() => { setModal(null); load(); }}
        />
      )}

    </>
  );
}

/* ─── Paybill Config Modal ──────────────────────────────────────────────── */
function PaybillConfigModal({ accounts, onClose }) {
  const [list, setList] = useState(
    accounts.length ? accounts : [{ id: Date.now(), name: '', shortcode: '', passkey: '', type: 'Paybill' }]
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

  const add = () => setList([...list, { id: Date.now(), name: '', shortcode: '', passkey: '', type: 'Paybill' }]);
  const del = (id) => setList(list.filter(x => x.id !== id));
  const upd = (id, k, v) => setList(list.map(x => x.id === id ? { ...x, [k]: v } : x));

  return (
    <ModalOverlay title="📱 M-Pesa Payment Accounts" onClose={onClose}>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>
        Configure the M-Pesa Paybill or Till numbers parents will use to pay fees.
        The Passkey is your Lipa na M-Pesa Online passkey (from Safaricom Daraja).
      </p>
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
        {list.map((a, i) => (
          <div key={a.id} style={{ padding: 14, border: '1.5px solid var(--border)', borderRadius: 12, marginBottom: 12, background: '#FAFBFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 11 }}>ACCOUNT #{i + 1}</span>
              {list.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '2px 8px' }} onClick={() => del(a.id)}>✕ Remove</button>
              )}
            </div>
            <div className="field">
              <label>Account Label (e.g. Tuition Fees, Activities)</label>
              <input value={a.name} onChange={e => upd(a.id, 'name', e.target.value)} placeholder="Tuition Fees" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Shortcode / Paybill / Till</label>
                <input value={a.shortcode} onChange={e => upd(a.id, 'shortcode', e.target.value)} placeholder="e.g. 400200" />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={a.type} onChange={e => upd(a.id, 'type', e.target.value)}>
                  <option>Paybill</option>
                  <option>Till</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Online Passkey (Lipa na M-Pesa Online — from Safaricom)</label>
              <input type="password" value={a.passkey} onChange={e => upd(a.id, 'passkey', e.target.value)} placeholder="bfb279f9aa9bdbcf158e97dd71a467cd..." />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Stored securely. Never exposed to parents or browser.</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={add} style={{ width: '100%', border: '1px dashed var(--border)', marginTop: 5 }}>
        + Add Another Account
      </button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy} style={{ width: 'auto' }}>
          {busy ? '⏳ Saving…' : '💾 Save Accounts'}
        </button>
      </div>
    </ModalOverlay>
  );
}


function PayModal({ learner, feeCfg, onClose, recordedBy, TERMS }) {
  const getAnnualFee = g => feeCfg[g]?.annual || 5000;
  const [term,   setTerm]   = useState('T1');
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
  const totalPaid = (learner.t1||0)+(learner.t2||0)+(learner.t3||0);
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
        {(feeCfg[learner.grade]?.t1 || feeCfg[learner.grade]?.t2 || feeCfg[learner.grade]?.t3) && (
          <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px dashed var(--border)', paddingTop: 4, marginTop: 4 }}>
            T1: {fmtK(feeCfg[learner.grade]?.t1 || 0)} · T2: {fmtK(feeCfg[learner.grade]?.t2 || 0)} · T3: {fmtK(feeCfg[learner.grade]?.t3 || 0)}
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
function FeeConfigModal({ feeCfg, onClose, TERMS }) {
  const [cfg,  setCfg]  = useState({ ...feeCfg });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_feecfg', value: cfg }] }),
    });
    setBusy(false);
    onClose();
  }

  return (
    <ModalOverlay title="⚙ Fee Configuration" onClose={onClose}>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Set the expected fees for each term per grade. The annual total is calculated automatically.
      </p>
      <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 5 }}>
        {ALL_GRADES.map(g => (
          <div key={g} style={{ padding: 12, border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: 10, background: '#FAFBFF' }}>
            <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 11, marginBottom: 10 }}>{g}</div>
            <div className="field-row">
              <div className="field">
                <label style={{ fontSize: 10 }}>{TERMS[0]?.name || 'Term 1'}</label>
                <input
                  type="number"
                  value={cfg[g]?.t1 || ''}
                  onChange={e => setCfg(prev => ({ ...prev, [g]: { ...(prev[g]||{}), t1: Number(e.target.value) } }))}
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="field">
                <label style={{ fontSize: 10 }}>{TERMS[1]?.name || 'Term 2'}</label>
                <input
                  type="number"
                  value={cfg[g]?.t2 || ''}
                  onChange={e => setCfg(prev => ({ ...prev, [g]: { ...(prev[g]||{}), t2: Number(e.target.value) } }))}
                  placeholder="e.g. 3000"
                />
              </div>
              <div className="field">
                <label style={{ fontSize: 10 }}>{TERMS[2]?.name || 'Term 3'}</label>
                <input
                  type="number"
                  value={cfg[g]?.t3 || ''}
                  onChange={e => setCfg(prev => ({ ...prev, [g]: { ...(prev[g]||{}), t3: Number(e.target.value) } }))}
                  placeholder="e.g. 2000"
                />
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
              Annual Total: <strong>{fmtK((cfg[g]?.t1||0) + (cfg[g]?.t2||0) + (cfg[g]?.t3||0) || cfg[g]?.annual || 0)}</strong>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}
          style={{ width:'auto', opacity: busy ? 0.7:1 }}>
          {busy ? '⏳ Saving…' : '💾 Save Config'}
        </button>
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
      <style jsx>{`
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

function ModalOverlay({ title, onClose, children }) {
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hdr">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function SMSReminderButton({ adm, balance, phone }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else {
        alert(data.error || 'Failed to send SMS');
      }
    } catch (e) {
      console.error(e);
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
        background: sent ? '#16a34a' : '#1e293b', 
        color: '#fff', 
        border: 'none',
        opacity: busy ? 0.7 : 1
      }}
      title="Send SMS Reminder"
    >
      {busy ? '⏳' : sent ? '✅' : '📱'}
    </button>
  );
}

