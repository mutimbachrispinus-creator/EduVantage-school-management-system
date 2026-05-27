'use client';
/**
 * app/fees/pay/page.js — Parent self-service M-Pesa payment
 *
 * Fees are broken down termly. Parents see exactly what each
 * term costs, what they've paid, and the outstanding balance per term.
 *
 * The STK push works for ANY admission number format:
 *   - Numeric:       101, 1023, 20250001
 *   - Long numeric:  2025001234
 *   - Alphanumeric:  2025/001, STD-4A-023, FORM4B/001
 * 
 * We track payments via Safaricom's CheckoutRequestID (not AccountReference),
 * so the 12-char limit on AccountReference is irrelevant for identification.
 */

import { useState, useEffect } from 'react';
import { fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';



function getTermFee(feeCfg, grade, termKey, termsArr) {
  const cfg = feeCfg[grade] || {};
  const val = cfg[termKey.toLowerCase()];
  if (val !== undefined) return Number(val);
  return cfg.annual ? Math.round(cfg.annual / (termsArr?.length || 3)) : 0;
}

export default function PayPage() {
  const [adm,     setAdm]     = useState('');
  const [learner, setLearner] = useState(null);
  const [feeCfg,  setFeeCfg]  = useState({});
  const [paybillAccounts, setPaybillAccounts] = useState([]);
  const [looking, setLooking] = useState(false);
  const [profile, setProfile] = useState({ name: 'SCHOOL PORTAL' });
  const [err,     setErr]     = useState('');

  const [phone,   setPhone]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [term,    setTerm]    = useState('T1');
  const [paying,  setPaying]  = useState(false);
  const [payMsg,  setPayMsg]  = useState('');
  const [success, setSuccess] = useState(false);
  
  const curr = getCurriculum(profile?.curriculum || 'CBC', profile?.levels);
  const TERMS = curr.TERMS?.map(t => ({ key: t.id, label: t.name, col: t.id.toLowerCase() })) || [
    { key: 'T1', label: 'Term 1', col: 't1' },
    { key: 'T2', label: 'Term 2', col: 't2' },
    { key: 'T3', label: 'Term 3', col: 't3' },
  ];

  useEffect(() => {
    fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'get', key: 'paav_school_profile' }] })
    }).then(r => r.json()).then(db => {
      const p = db.results?.[0]?.value;
      if (p) setProfile(typeof p === 'string' ? JSON.parse(p) : p);
    }).catch(() => {});
  }, []);

  async function lookup(e) {
    e?.preventDefault();
    setErr(''); setLearner(null);
    const q = adm.trim();
    if (!q) { setErr('Enter an admission number'); return; }
    setLooking(true);

    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav6_learners' },
          { type: 'get', key: 'paav6_feecfg'  },
          { type: 'get', key: 'paav_paybill_accounts' },
        ]}),
      });
      const db  = await res.json();
      const all  = db.results[0]?.value || [];
      const cfg  = db.results[1]?.value || {};
      const pbas = db.results[2]?.value || [];

      // Case-insensitive, whitespace-trimmed match — works for any adm format
      const found = all.find(l =>
        String(l.adm).trim().toLowerCase() === q.toLowerCase()
      );

      if (!found) { setErr(`Learner "${q}" not found. Check the admission number and try again.`); return; }

      setLearner(found);
      setFeeCfg(cfg);
      setPaybillAccounts(pbas);

      // Auto-select the first term with an outstanding balance
      let autoSet = false;
      for (const t of TERMS) {
        const due  = getTermFee(cfg, found.grade, t.key, TERMS);
        const paid = found[t.col] || 0;
        if (due > 0 && paid < due) { setTerm(t.key); setAmount(String(due - paid)); autoSet = true; break; }
      }
      if (!autoSet && TERMS.length > 0) setTerm(TERMS[0].key);
    } catch (e) {
      setErr('Network error. Please try again.');
    } finally {
      setLooking(false);
    }
  }

  async function doStkPush(acc) {
    if (!phone.trim()) { setErr('Enter your M-Pesa phone number'); return; }
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return; }
    setPaying(true); setErr('');

    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone:       phone.trim(),
          amount:      Number(amount),
          accountRef:  learner.adm,   // Full adm — server truncates to 12 for Safaricom display only
          term,
          description: `${(learner.name || '').slice(0, 8)} Fees`,
          paybillId:   acc.id,        // Server resolves shortcode+passkey securely
        }),
      });
      const data = await res.json();
      if (!data.success) { setErr(data.error || 'M-Pesa STK Push failed. Please try again.'); return; }
      setPayMsg(data.message || 'Check your phone for the M-Pesa PIN prompt.');
      setSuccess(true);
    } catch (e) {
      setErr('Network error initiating payment.');
    } finally {
      setPaying(false);
    }
  }

  /* ── Computed per-term balances ── */
  const termData = learner ? TERMS.map(t => {
    const expected = getTermFee(feeCfg, learner.grade, t.key, TERMS);
    const paid     = learner[t.col] || 0;
    const balance  = Math.max(0, expected - paid);
    const cleared  = expected > 0 && balance <= 0;
    return { ...t, expected, paid, balance, cleared };
  }) : [];

  const annualExpected = termData.reduce((s, t) => s + t.expected, 0);
  const annualPaid     = termData.reduce((s, t) => s + t.paid, 0);
  const annualBalance  = termData.reduce((s, t) => s + t.balance, 0) + (learner?.arrears || 0);

  const selectedTermData = termData.find(t => t.key === term);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#050F1C,#0D1F3C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 80px rgba(0,0,0,.4)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', padding: '28px 28px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>🏫</div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 17, fontFamily: 'Sora,sans-serif', letterSpacing: 1 }}>
            {profile.name?.toUpperCase() || 'SCHOOL PORTAL'}
          </div>
          <div style={{ color: '#C4B5FD', fontSize: 12, marginTop: 3 }}>Secure Fee Payment Portal · Powered by EduVantage</div>
        </div>

        <div style={{ padding: '28px 28px 32px' }}>
          {err && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
            padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{err}</div>}

          {/* ── Step 1: Lookup ── */}
          {!learner && (
            <form onSubmit={lookup}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Learner&apos;s Admission Number
                </label>
                <input value={adm} onChange={e => setAdm(e.target.value)}
                  placeholder="e.g. 101 or 2025/001 or STD-4A-23"
                  autoFocus autoCapitalize="none"
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10,
                    fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: 1 }} />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Supports all formats — numeric, alphanumeric, or with slashes</div>
              </div>
              <button type="submit" disabled={looking}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
                  cursor: looking ? 'not-allowed' : 'pointer', opacity: looking ? 0.7 : 1 }}>
                {looking ? '🔍 Searching…' : '🔍 Find Learner'}
              </button>
            </form>
          )}

          {/* ── Step 2: Termly Breakdown + Pay ── */}
          {learner && !success && (
            <>
              {/* Learner card */}
              <div style={{ background: '#F5F3FF', border: '2px solid #DDD6FE', borderRadius: 14,
                padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#1E1B4B' }}>{learner.name}</div>
                    <div style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>
                      {learner.grade} &nbsp;·&nbsp; Adm: <strong style={{ fontFamily: 'monospace' }}>{learner.adm}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Annual Balance</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: annualBalance <= 0 ? '#16A34A' : '#DC2626' }}>
                      {annualBalance <= 0 ? '✅ Cleared' : fmtK(annualBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Termly fee breakdown */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase',
                  letterSpacing: 1, marginBottom: 10 }}>Fee Breakdown by Term</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {termData.map(t => (
                    <div key={t.key}
                      onClick={() => { if (!t.cleared && t.expected > 0) { setTerm(t.key); setAmount(String(t.balance)); } }}
                      style={{
                        padding: '10px 8px', borderRadius: 12, textAlign: 'center', cursor: t.cleared || t.expected === 0 ? 'default' : 'pointer',
                        border: `2px solid ${term === t.key ? '#4F46E5' : t.cleared ? '#DCFCE7' : '#E5E7EB'}`,
                        background: term === t.key ? '#EEF2FF' : t.cleared ? '#F0FDF4' : '#FAFAFA',
                        transition: '0.15s'
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', marginBottom: 4 }}>{t.label}</div>
                      {t.expected === 0 ? (
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>Not set</div>
                      ) : t.cleared ? (
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#16A34A' }}>✅ Paid</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#DC2626' }}>{fmtK(t.balance)}</div>
                          <div style={{ fontSize: 10, color: '#9CA3AF' }}>owed</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {/* Annual summary row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10,
                  padding: '8px 12px', background: '#F9FAFB', borderRadius: 10, fontSize: 12 }}>
                  <span style={{ color: '#6B7280' }}>Expected: <strong>{fmtK(annualExpected)}</strong></span>
                  <span style={{ color: '#16A34A' }}>Paid: <strong>{fmtK(annualPaid)}</strong></span>
                  <span style={{ color: '#DC2626' }}>Due: <strong>{fmtK(annualBalance)}</strong></span>
                </div>
                {(learner.arrears || 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A',
                    borderRadius: 8, padding: '6px 10px', marginTop: 6 }}>
                    ⚠ Includes KES {fmtK(learner.arrears)} carried over from previous year
                  </div>
                )}
              </div>

              {annualBalance <= 0 ? (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12,
                  padding: '16px', textAlign: 'center', color: '#065F46', fontWeight: 700 }}>
                  ✅ All fees fully paid! No payment needed.
                </div>
              ) : (
                <>
                  {/* Payment form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Paying For</label>
                      <select value={term} onChange={e => { setTerm(e.target.value); const td = termData.find(t=>t.key===e.target.value); if(td) setAmount(String(td.balance)); }}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 13, outline: 'none' }}>
                        {TERMS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Amount (KES)</label>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        min="1" max={selectedTermData?.balance || undefined}
                        style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 13,
                          outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {selectedTermData && selectedTermData.expected > 0 && (
                    <div style={{ fontSize: 11, color: '#4B5563', background: '#F3F4F6', borderRadius: 8,
                      padding: '6px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{selectedTermData.label} Expected: <strong>{fmtK(selectedTermData.expected)}</strong></span>
                      <span>Paid: <strong style={{color:'#16A34A'}}>{fmtK(selectedTermData.paid)}</strong></span>
                      <span>Due: <strong style={{color:'#DC2626'}}>{fmtK(selectedTermData.balance)}</strong></span>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                      M-Pesa Phone Number
                    </label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 0712 345 678"
                      style={{ width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10,
                        fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {paybillAccounts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '14px', color: '#9CA3AF', fontSize: 12,
                      border: '1px dashed #E5E7EB', borderRadius: 10 }}>
                      Payment not yet configured for this school. Please contact the school office.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Select Payment Account
                      </div>
                      {paybillAccounts.map(acc => (
                        <button key={acc.id} type="button" disabled={paying}
                          onClick={() => doStkPush(acc)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 18px', borderRadius: 12, border: '2px solid #4F46E5',
                            background: paying ? '#F9FAFB' : 'linear-gradient(135deg,#4F46E5,#6D28D9)',
                            color: paying ? '#9CA3AF' : '#fff', cursor: paying ? 'not-allowed' : 'pointer',
                            fontWeight: 700, transition: '0.2s'
                          }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 14 }}>{acc.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.8 }}>Paybill: {acc.shortcode} · Acc: {learner.adm}</div>
                          </div>
                          <div style={{ fontSize: 24 }}>{paying ? '⏳' : '💚'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <button onClick={() => { setLearner(null); setAdm(''); setErr(''); }}
                style={{ width: '100%', marginTop: 16, padding: '10px', background: 'transparent',
                  border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>
                ← Search a different learner
              </button>
            </>
          )}

          {/* ── Step 3: Success ── */}
          {success && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>📱</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#4F46E5', marginBottom: 8 }}>Payment Initiated!</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>{payMsg}</div>
              <div style={{ marginTop: 16, padding: 14, background: '#ECFDF5', borderRadius: 12,
                fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                ✅ Enter your M-Pesa PIN when prompted on your phone.
                <br />The payment will be reflected automatically.
              </div>
              <div style={{ marginTop: 10, padding: '8px 14px', background: '#EEF2FF', borderRadius: 10,
                fontSize: 12, color: '#4338CA' }}>
                Paying: <strong>{TERMS.find(t=>t.key===term)?.label || term}</strong> · Amount: <strong>{fmtK(Number(amount))}</strong> · Adm: <strong>{learner?.adm}</strong>
              </div>
              <button onClick={() => { setSuccess(false); setLearner(null); setAdm(''); }}
                style={{ marginTop: 16, padding: '10px 20px', background: 'transparent',
                  border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>
                Make another payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
