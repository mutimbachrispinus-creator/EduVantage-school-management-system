'use client';
export const runtime = 'edge';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { usePersistedState } from '@/components/TabState';
import { useProfile } from '@/app/PortalShell';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

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
  const [paylog,  setPaylog]  = useState([]);
  const [attendance, setAttendance] = useState({});
  const [extra,   setExtra]   = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [term,    setTerm]    = usePersistedState('paav_profile_term',   'T1');
  const [assess,  setAssess]  = usePersistedState('paav_profile_assess', 'et1');
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [u, db] = await Promise.all([
          getCachedUser(),
          getCachedDBMulti(['paav6_learners', 'paav6_marks', 'paav6_feecfg', 'paav8_grad', 'paav_profiles', 'paav6_paylog', 'paav6_attendance'])
        ]);

        if (!u) { router.push('/login'); return; }
        setUser(u);

        const allLearners = db.paav6_learners || [];
        const found = allLearners.find(l => String(l.adm) === String(admNo));
        if (!found) { setError('Learner not found.'); setLoading(false); return; }

        setLearner(found);
        setMarks(db.paav6_marks || {});
        setFeeCfg(db.paav6_feecfg || {});
        setGradCfg(db.paav8_grad || null);
        setPaylog((db.paav6_paylog || []).filter(p => p.adm === admNo));
        setAttendance(db.paav6_attendance || {});
        const profiles = db.paav_profiles || {};
        setExtra(profiles[admNo] || {});
        setLoading(false);
      } catch (e) {
        setError(e.message || 'Failed to load profile.');
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
  const annualFee  = (cfg.t1 || 0) + (cfg.t2 || 0) + (cfg.t3 || 0) || cfg.annual || 5000;
  const totalPaid  = (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
  const balance    = annualFee + (learner.arrears || 0) - totalPaid;

  const marksRows = subjects.map(subj => {
    const k1  = `${term}:${learner.grade}|${subj}|${assess}`;
    const k0  = `${learner.grade}|${subj}|${assess}`;
    const sc  = marks[k1]?.[admNo] ?? marks[k0]?.[admNo];
    const inf = sc !== undefined ? gInfo(Number(sc), learner.grade, gradCfg) : null;
    return { subj, score: sc, inf };
  });
  const entered  = marksRows.filter(r => r.score !== undefined);
  const totalPts = entered.reduce((s, r) => s + (r.inf?.pts || 0), 0);
  const maxTotal = maxPts(learner.grade, subjects);

  // Build the Progress Timeline
  const timeline = buildTimeline(learner, marks, paylog, attendance, subjects, gInfo, gradCfg, TERMS, admNo);

  const tabs = [
    { key: 'overview', label: '📋 Overview' },
    { key: 'marks', label: '📊 Marks' },
    { key: 'timeline', label: '🕒 Timeline' },
    { key: 'finance', label: '💰 Finance' },
  ];

  return (
    <div className="page on">
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {learner.avatar
            ? <img src={learner.avatar} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} alt="avatar" />
            : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>{(learner.name || '?')[0]}</div>
          }
          <div>
            <h2 style={{ margin: 0 }}>🎓 {learner.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{learner.grade} · Adm: {learner.adm} · {learner.sex === 'F' ? '👩' : '👦'} {learner.sex}</p>
          </div>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners')}>← Back</button>
          <button className="btn btn-gold btn-sm no-print" onClick={() => router.push(`/report-card?adm=${encodeURIComponent(admNo)}&term=${term}&assess=${assess}`)}>📋 Report Card PDF</button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: 5, borderRadius: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key}
            className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ══════ OVERVIEW ══════ */}
      {activeTab === 'overview' && (
        <div className="sg sg2">
          <div className="space-y-6">
            <div className="panel">
              <div className="panel-hdr"><h3>📋 Bio</h3></div>
              <div className="panel-body">
                {[
                  ['Admission No.', learner.adm], ['Full Name', learner.name],
                  ['Grade', learner.grade], ['Gender', learner.sex === 'F' ? 'Female' : learner.sex === 'M' ? 'Male' : learner.sex],
                  ['Age', learner.age], ['Date of Birth', learner.dob || '—'],
                  ['Stream', learner.stream || '—'], ['Class Teacher', learner.teacher || '—'],
                  ['Parent/Guardian', learner.parent || '—'], ['Phone', learner.phone || '—'],
                  ['Address', learner.addr || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <strong style={{ textAlign: 'right' }}>{v}</strong>
                  </div>
                ))}
                {learner.bloodGroup && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, fontSize: 12, color: '#8B1A1A', fontWeight: 700 }}>🩸 Blood Group: {learner.bloodGroup} · Allergies: {learner.allergies || 'None'}</div>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-hdr">
                <h3>📊 Performance Snapshot</h3>
                <span className="badge bg-blue" style={{ fontSize: 10 }}>{term} {assess.toUpperCase()}</span>
              </div>
              <div className="panel-body">
                {entered.length > 0 ? (
                  <>
                    <div className="tbl-wrap">
                      <table style={{ border: 'none' }}>
                        <tbody>
                          {marksRows.slice(0, 4).map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ fontSize: 12, fontWeight: 700 }}>{r.subj}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span style={{ background: r.inf?.bg || '#f1f5f9', color: r.inf?.c || '#64748b', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 900 }}>
                                  {r.score !== undefined ? `${r.score}% (${r.inf?.lv})` : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button className="btn btn-ghost btn-sm w-full mt-2" onClick={() => setActiveTab('marks')}>View All {subjects.length} Subjects →</button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12 }}>No marks recorded for this term yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel">
              <div className="panel-hdr"><h3>📈 Quick Stats</h3></div>
              <div className="panel-body">
                <div className="sg sg2" style={{ marginBottom: 0 }}>
                  <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sc-inner">
                      <div className="sc-icon" style={{ background: '#eff6ff' }}>📚</div>
                      <div>
                        <div className="sc-l">Mean Score</div>
                        <div className="sc-n">{entered.length ? Math.round(entered.reduce((a,b)=>a+Number(b.score),0)/entered.length) : '—'}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: `4px solid ${balance <= 0 ? '#059669' : '#dc2626'}` }}>
                    <div className="sc-inner">
                      <div className="sc-icon" style={{ background: balance <= 0 ? '#ecfdf5' : '#fef2f2' }}>💰</div>
                      <div>
                        <div className="sc-l">Fee Balance</div>
                        <div className="sc-n" style={{ color: balance <= 0 ? '#059669' : '#dc2626', fontSize: 18 }}>
                          {balance <= 0 ? '✅ Cleared' : `KES ${fmtK(balance)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>COLLECTION PROGRESS</div>
                  <div style={{ height: 10, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, annualFee > 0 ? (totalPaid / annualFee) * 100 : 0)}%`, height: '100%', background: balance <= 0 ? '#059669' : '#2563EB', borderRadius: 10, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    <span>Paid: KES {fmtK(totalPaid)}</span>
                    <span>Annual: KES {fmtK(annualFee)}</span>
                  </div>
                </div>
                {paylog.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>RECENT PAYMENTS</div>
                    {paylog.slice(-2).reverse().map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
                        <span>{p.date?.slice(0, 10)}</span>
                        <strong style={{ color: '#059669' }}>+KES {fmtK(p.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="panel" style={{ background: '#0F172A', color: '#fff', border: 'none' }}>
              <div className="panel-body p-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h3 style={{ color: '#fff', margin: 0 }}>Institutional Rating</h3>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>PREMIUM</div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>EduVantage AI confirms that {learner.name} is {balance <= 0 ? 'fully funded' : 'partially funded'} and {entered.length > 0 ? 'academically tracked' : 'pending assessment'} for {term}.</p>
                <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></div>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>SYSTEM STATUS: OPTIMAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MARKS ══════ */}
      {activeTab === 'marks' && (
        <div className="panel">
          <div className="panel-hdr">
            <h3>📊 Academic Performance — {learner.grade}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={term} onChange={e => setTerm(e.target.value)} style={{ padding: '6px 10px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={assess} onChange={e => setAssess(e.target.value)} style={{ padding: '6px 10px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                {ASSESSMENTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>
          </div>
          {/* ── AI Performance Predictor Card ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 20 }}>
            <div className="panel" style={{ borderLeft: '4px solid #2563eb' }}>
              <div className="panel-hdr"><h3>🧠 AI Trajectory</h3></div>
              <div className="panel-body" style={{ textAlign: 'center', padding: '20px 10px' }}>
                {(() => {
                  const assessKeys = ['op1', 'mt1', 'et1'];
                  const termAverages = assessKeys.map(a => {
                    const scs = subjects.map(s => marks[`${term}:${learner.grade}|${s}|${a}`]?.[admNo]).filter(s => s !== undefined);
                    return scs.length ? scs.reduce((sum, s) => sum + Number(s), 0) / scs.length : null;
                  }).filter(a => a !== null);

                  if (termAverages.length < 2) {
                    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '20px 0' }}>Capture at least 2 assessments to see trajectory.</div>;
                  }

                  const latest = termAverages[termAverages.length - 1];
                  const prev = termAverages[termAverages.length - 2];
                  const diff = latest - prev;
                  const trajectory = diff > 2 ? 'Improving' : diff < -2 ? 'Declining' : 'Stable';
                  const info = gInfo(latest, learner.grade, null, school?.curriculum || 'CBC');
                  const color = trajectory === 'Improving' ? '#059669' : trajectory === 'Declining' ? '#dc2626' : '#2563eb';
                  const icon = trajectory === 'Improving' ? '📈' : trajectory === 'Declining' ? '📉' : '➡️';
                  const prediction = Math.min(100, Math.max(0, latest + diff));

                  return (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 5 }}>{icon}</div>
                      <div style={{ fontWeight: 900, fontSize: 18, color }}>{trajectory}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{Math.abs(diff).toFixed(1)}% {diff >= 0 ? 'gain' : 'drop'}</div>
                      <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Next Term Prediction</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b' }}>{Math.round(prediction)}%</div>
                        <div style={{ background: info.bg, color: info.c, display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 900, marginTop: 4 }}>Level: {info.lv}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="panel">
              <div className="panel-hdr"><h3>📊 Trend Analysis</h3></div>
              <div className="panel-body">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 100, padding: '10px 0', borderBottom: '2px solid var(--border)' }}>
                  {['op1', 'mt1', 'et1'].map(a => {
                    const labelMap = { op1: 'Opener', mt1: 'Mid', et1: 'End' };
                    const scs = subjects.map(s => marks[`${term}:${learner.grade}|${s}|${a}`]?.[admNo]).filter(s => s !== undefined);
                    const avg = scs.length ? scs.reduce((sum, s) => sum + Number(s), 0) / scs.length : 0;
                    return (
                      <div key={a} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: '100%', maxWidth: 30, background: avg >= 70 ? '#059669' : avg >= 50 ? '#2563eb' : '#dc2626', height: `${avg || 5}%`, borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.5s ease' }} />
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>{labelMap[a]}</div>
                        <div style={{ fontSize: 10, fontWeight: 900 }}>{avg ? Math.round(avg) + '%' : '—'}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 12, padding: 10, background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#1e293b' }}>💡 AI Strategy</div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                    {(() => {
                      const latestMarks = marksRows.filter(m => m.score !== undefined);
                      const weakest = [...latestMarks].sort((a,b) => Number(a.score) - Number(b.score))[0];
                      if (!weakest) return "Capture marks to receive personalized improvement strategies.";
                      return `Performance in ${weakest.subj} (${weakest.score}%) is a bottleneck. We recommend 15min daily targeted review in this area.`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Subject</th><th style={{ textAlign: 'center' }}>Score</th><th style={{ textAlign: 'center' }}>Level</th><th style={{ textAlign: 'center' }}>Points</th><th>Description</th></tr>
              </thead>
              <tbody>
                {marksRows.map(({ subj, score, inf }) => (
                  <tr key={subj}>
                    <td style={{ fontWeight: 700 }}>{subj}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, color: score !== undefined ? (score >= 70 ? '#059669' : score >= 50 ? '#2563EB' : '#DC2626') : 'var(--muted)' }}>{score !== undefined ? score : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{inf ? <span className="badge" style={{ background: inf.bg, color: inf.c }}>{inf.lv}</span> : '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: inf ? inf.c : 'var(--muted)' }}>{inf ? inf.pts : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{inf?.desc || '—'}</td>
                  </tr>
                ))}
                {entered.length > 0 && (
                  <tr style={{ background: 'linear-gradient(135deg,#050F1C,#0D1F3C)' }}>
                    <td colSpan="3" style={{ color: '#fff', fontWeight: 800 }}>Total ({entered.length}/{subjects.length} subjects)</td>
                    <td style={{ textAlign: 'center', color: '#FCD34D', fontWeight: 900, fontSize: 16 }}>{totalPts} / {maxTotal}</td>
                    <td style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>{Math.round((totalPts / maxTotal) * 100)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {entered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No marks entered for this selection.</div>}
        </div>
      )}

      {/* ══════ TIMELINE ══════ */}
      {activeTab === 'timeline' && (
        <div className="panel">
          <div className="panel-hdr">
            <h3>🕒 Learner Progress Timeline</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{timeline.length} events recorded</span>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            {timeline.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No timeline events yet. Marks and payments will appear here.</div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 32 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />
                {timeline.map((ev, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
                    {/* Dot */}
                    <div style={{ position: 'absolute', left: -26, top: 10, width: 14, height: 14, borderRadius: '50%', background: ev.color, border: '2px solid #fff', boxShadow: `0 0 0 3px ${ev.color}33` }} />
                    <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', border: `1px solid ${ev.color}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{ev.icon} {ev.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{ev.detail}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 700 }}>{ev.date}</div>
                      </div>
                      {ev.badge && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ background: ev.color + '22', color: ev.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{ev.badge}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ FINANCE ══════ */}
      {activeTab === 'finance' && (
        <div>
          <div className="sg sg3" style={{ marginBottom: 16 }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="sc-inner"><div className="sc-icon" style={{ background: '#ecfdf5' }}>💰</div>
                <div><div className="sc-l">Total Paid</div><div className="sc-n">KES {fmtK(totalPaid)}</div></div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: `4px solid ${balance <= 0 ? '#059669' : '#dc2626'}` }}>
              <div className="sc-inner"><div className="sc-icon" style={{ background: balance <= 0 ? '#ecfdf5' : '#fef2f2' }}>📊</div>
                <div><div className="sc-l">Balance</div><div className="sc-n" style={{ color: balance <= 0 ? '#059669' : '#dc2626' }}>{balance <= 0 ? '✅ Cleared' : `KES ${fmtK(balance)}`}</div></div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div className="sc-inner"><div className="sc-icon" style={{ background: '#f5f3ff' }}>🧾</div>
                <div><div className="sc-l">Transactions</div><div className="sc-n">{paylog.length}</div></div>
              </div>
            </div>
          </div>

          {paylog.length > 0 ? (
            <div className="panel">
              <div className="panel-hdr"><h3>💳 Payment History</h3></div>
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Term</th><th>Amount</th><th>Method</th><th>Ref</th><th>By</th></tr></thead>
                  <tbody>
                    {[...paylog].reverse().map((p, i) => (
                      <tr key={i}>
                        <td>{p.date?.slice(0, 10)}</td>
                        <td><span className="badge bg-blue">{p.term || '—'}</span></td>
                        <td style={{ fontWeight: 900, color: '#059669' }}>KES {fmtK(p.amount)}</td>
                        <td>{p.method || 'Cash'}</td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{p.ref || '—'}</td>
                        <td style={{ fontSize: 11 }}>{p.by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="panel"><div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No payment records found for this learner.</div></div>
          )}
        </div>
      )}
    </div>
  );
}

/** Build chronological timeline events from marks, payments, attendance */
function buildTimeline(learner, marks, paylog, attendance, subjects, gInfo, gradCfg, TERMS, admNo) {
  const events = [];

  // Enrollment event
  events.push({
    date: learner.dob ? new Date(learner.dob).getFullYear() + '' : '—',
    title: 'Enrolled at School',
    detail: `Admitted to ${learner.grade} as ${learner.adm}`,
    icon: '🎒', color: '#2563eb', badge: learner.grade
  });

  // Payment events
  paylog.forEach(p => {
    events.push({
      date: p.date?.slice(0, 10) || '—',
      title: 'Fee Payment Received',
      detail: `KES ${fmtK(p.amount)} via ${p.method || 'Cash'} — Ref: ${p.ref || 'N/A'}`,
      icon: '💰', color: '#059669', badge: `${p.term} · KES ${fmtK(p.amount)}`
    });
  });

  // Marks events — one event per assessment per term
  const ASSESS_LABELS = { op1: 'Opener', mt1: 'Mid-Term', et1: 'End-Term' };
  TERMS.forEach(t => {
    ['op1', 'mt1', 'et1'].forEach(assess => {
      const scores = subjects
        .map(subj => {
          const k = `${t.id}:${learner.grade}|${subj}|${assess}`;
          return marks[k]?.[admNo];
        })
        .filter(s => s !== undefined);

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + Number(b), 0) / scores.length;
        events.push({
          date: `${t.name} · ${ASSESS_LABELS[assess]}`,
          title: `${ASSESS_LABELS[assess]} Results — ${t.name}`,
          detail: `${scores.length} subjects captured · Class avg: ${avg.toFixed(1)}%`,
          icon: avg >= 70 ? '🏆' : avg >= 50 ? '📈' : '⚠️',
          color: avg >= 70 ? '#059669' : avg >= 50 ? '#2563eb' : '#dc2626',
          badge: `${avg.toFixed(1)}% average · ${scores.length}/${subjects.length} subjects`
        });
      }
    });
  });

  // Sort: payments by date (real dates first), marks last
  return events.sort((a, b) => {
    const da = Date.parse(a.date) || 0;
    const db_ = Date.parse(b.date) || 0;
    return db_ - da;
  });
}
