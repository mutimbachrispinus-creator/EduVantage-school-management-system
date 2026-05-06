'use client';
export const runtime = 'edge';
/**
 * app/learners/[id]/page.js — Individual learner profile + academic results
 *
 * Shows:
 *   • Bio card (name, grade, age, sex, parent, phone, address)
 *   • Fee statement (term by term)
 *   • Marks across all subjects for each term/assessment
 *   • CBC grade levels and total points
 *   • Quick-action buttons (record payment, print report card)
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { usePersistedState } from '@/components/TabState';
import { useProfile } from '@/app/PortalShell';
import { getCachedUser } from '@/lib/client-cache';

const ASSESSMENTS = [
  { key: 'op1', label: '📝 Opener' },
  { key: 'mt1', label: '📖 Mid-Term' },
  { key: 'et1', label: '📋 End-Term' },
];


export default function LearnerProfilePage() {
  const router  = useRouter();
  const params  = useParams();
  const admNo   = params?.id;

  const { profile } = useProfile();
  const [user,    setUser]    = useState(null);
  const [learner, setLearner] = useState(null);
  const [marks,   setMarks]   = useState({});
  const [feeCfg,  setFeeCfg]  = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [term,    setTerm]    = usePersistedState('paav_profile_term',   'T1');
  const [assess,  setAssess]  = usePersistedState('paav_profile_assess', 'mt1');
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [u, dbRes] = await Promise.all([
          getCachedUser(),
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [
              { type: 'get', key: 'paav6_learners' },
              { type: 'get', key: 'paav6_marks'    },
              { type: 'get', key: 'paav6_feecfg'   },
              { type: 'get', key: 'paav8_grad'     },
            ]}),
            signal: AbortSignal.timeout(15000)
          })
        ]);

        if (!u || dbRes.status === 401) { 
          router.push('/login?callback=' + encodeURIComponent(window.location.pathname)); 
          return; 
        }

        if (!dbRes.ok) {
          throw new Error(`Server error (${dbRes.status})`);
        }

        const ct = dbRes.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) throw new Error('Invalid server response (non-JSON)');
        
        const db = await dbRes.json();
        if (!db.results || !Array.isArray(db.results)) throw new Error('Failed to parse database results');

        const allLearners = db.results[0]?.value || [];
        const found = allLearners.find(l => String(l.adm) === String(admNo));
        
        if (!found) {
          setError('Learner not found.');
          setLoading(false);
          return;
        }

        setLearner(found);
        setMarks(  db.results[1]?.value || {});
        setFeeCfg( db.results[2]?.value || {});
        setGradCfg(db.results[3]?.value || null);
        setLoading(false);
      } catch (e) {
        console.error('[Profile] Load failed:', e);
        let msg = 'Failed to load learner profile.';
        if (e.name === 'TimeoutError' || e.message?.includes('timeout')) msg = 'Connection timed out. Please check your internet.';
        else if (e.message) msg = e.message;
        
        setError(msg);
        setLoading(false);
      }
    }
    if (admNo) load();
  }, [admNo, router]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading profile…</div>;
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  if (!learner) return null;

  const curr = getCurriculum(profile?.curriculum || 'CBC');
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const { gInfo, maxPts, DEFAULT_SUBJECTS } = curr;

  const subjects   = DEFAULT_SUBJECTS[learner.grade] || [];
  const cfg        = feeCfg[learner.grade] || {};
  const t1Fee      = cfg.t1 || 0;
  const t2Fee      = cfg.t2 || 0;
  const t3Fee      = cfg.t3 || 0;
  const annualFee  = (t1Fee + t2Fee + t3Fee) || cfg.annual || 5000;
  const totalPaid  = (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
  const balance    = annualFee + (learner.arrears || 0) - totalPaid;

  /* ── Marks for selected term + assessment ── */
  const marksRows = subjects.map(subj => {
    const k1  = `${term}:${learner.grade}|${subj}|${assess}`;
    const k0  = `${learner.grade}|${subj}|${assess}`;
    const sc  = marks[k1]?.[admNo] ?? marks[k0]?.[admNo];
    const inf = sc !== undefined ? gInfo(Number(sc), learner.grade, gradCfg) : null;
    return { subj, score: sc, inf };
  });

  const entered    = marksRows.filter(r => r.score !== undefined);
  const totalPts   = entered.reduce((s, r) => s + (r.inf?.pts || 0), 0);
  const maxTotal   = maxPts(learner.grade, subjects);

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎓 {learner.name}</h2>
          <p>{learner.grade} · Adm: {learner.adm}</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners')}>
            ← Back
          </button>
          <button className="btn btn-gold btn-sm"
            onClick={() => router.push(`/grades/report-card/${encodeURIComponent(admNo)}`)}>
            📋 Report Card
          </button>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="sg sg2">
        {/* ── Bio card ── */}
        <div className="panel">
          <div className="panel-hdr"><h3>📋 Profile</h3></div>
          <div className="panel-body">
            {[
              ['Admission No.', learner.adm],
              ['Full Name',     learner.name],
              ['Grade',         learner.grade],
              ['Gender',        learner.sex === 'F' ? 'Female' : (learner.sex === 'M' ? 'Male' : learner.sex)],
              ['Age',           learner.age],
              ['Date of Birth', learner.dob || '—'],
              ['Stream',        learner.stream || '—'],
              ['Class Teacher', learner.teacher || '—'],
              ['Parent/Guardian', learner.parent || '—'],
              ['Phone',         learner.phone || '—'],
              ['Parent Email',  learner.parentEmail || '—'],
              ['Address',       learner.addr  || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fee statement ── */}
        {user?.role === 'admin' && (
          <div className="panel">
            <div className="panel-hdr">
              <h3>💰 Fee Statement</h3>
              {user?.role === 'admin' && (
                <button className="btn btn-success btn-sm"
                  onClick={() => router.push(`/fees/${encodeURIComponent(admNo)}/receipt`)}>
                  🧾 Receipt
                </button>
              )}
            </div>
            <div className="panel-body">
              {[
                ['Accumulated Fee', fmtK(learner.arrears || 0)],
                ['Annual Total', fmtK(annualFee)],
                ...(t1Fee || t2Fee || t3Fee ? [
                  [`${TERMS[0]?.name || 'T1'} (Expected: ${fmtK(t1Fee)})`, `Paid: ${fmtK(learner.t1||0)}`],
                  [`${TERMS[1]?.name || 'T2'} (Expected: ${fmtK(t2Fee)})`, `Paid: ${fmtK(learner.t2||0)}`],
                  [`${TERMS[2]?.name || 'T3'} (Expected: ${fmtK(t3Fee)})`, `Paid: ${fmtK(learner.t3||0)}`],
                ] : [
                  [TERMS[0]?.name || 'T1 Paid',     fmtK(learner.t1||0)],
                  [TERMS[1]?.name || 'T2 Paid',     fmtK(learner.t2||0)],
                  [TERMS[2]?.name || 'T3 Paid',     fmtK(learner.t3||0)],
                ]),
                ['Total Paid',  fmtK(totalPaid)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px dashed var(--border)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', fontWeight: 800, fontSize: 14 }}>
                <span>Balance</span>
                <span style={{ color: balance <= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtK(balance)} {balance <= 0 ? '✅' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Academic performance ── */}
      <div className="panel">
        <div className="panel-hdr">
          <h3>📊 Academic Performance</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={term} onChange={e => setTerm(e.target.value)}
              style={{ padding: '6px 10px', border: '2px solid var(--border)',
                borderRadius: 8, fontSize: 12, outline: 'none' }}>
              {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={assess} onChange={e => setAssess(e.target.value)}
              style={{ padding: '6px 10px', border: '2px solid var(--border)',
                borderRadius: 8, fontSize: 12, outline: 'none' }}>
              {ASSESSMENTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th style={{ textAlign: 'center' }}>Level</th>
                <th style={{ textAlign: 'center' }}>Points</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {marksRows.map(({ subj, score, inf }) => (
                <tr key={subj}>
                  <td>{subj}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {score !== undefined ? score : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inf ? (
                      <span className="badge"
                        style={{ background: inf.bg, color: inf.c }}>
                        {inf.lv}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800,
                    color: inf ? inf.c : 'var(--muted)' }}>
                    {inf ? inf.pts : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {inf?.desc || '—'}
                  </td>
                </tr>
              ))}
              {entered.length > 0 && (
                <tr style={{ background: 'linear-gradient(135deg,#050F1C,#0D1F3C)' }}>
                  <td colSpan="3" style={{ color: '#fff', fontWeight: 800 }}>
                    Total ({entered.length}/{subjects.length} subjects)
                  </td>
                  <td style={{ textAlign: 'center', color: '#FCD34D', fontWeight: 800, fontSize: 15 }}>
                    {totalPts} / {maxTotal}
                  </td>
                  <td style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>
                    {Math.round((totalPts/maxTotal)*100)}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {entered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            No marks entered for this term / assessment yet.
          </div>
        )}
      </div>
    </div>
  );
}
