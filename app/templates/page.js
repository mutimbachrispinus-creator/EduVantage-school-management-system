'use client';
export const runtime = 'edge';
/**
 * app/templates/page.js — Templates & Printables Hub
 *
 * Implements:
 *   • Merit Lists (by grade/stream)
 *   • Report Cards (batch printable)
 *   • Class Lists
 *   • Fee Receipts
 *   • Student IDs
 *
 * All templates include the school logo and are optimized for printing.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getAllGrades, gInfo, getDefaultSubjects, maxPts, calcLearnerReportData, getMark, isJSSGrade, getDistributionBuckets, getGradeColors, shouldRankByMarks } from '@/lib/cbe';
import { useSchoolProfile } from '@/lib/school-profile';
import { useProfile } from '@/app/PortalShell';

const LOGO = "";

export default function TemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('merit');
  const { profile: ctxProfile } = useProfile() || {};
  const localProfile = useSchoolProfile();
  const profile = ctxProfile && Object.keys(ctxProfile).length > 0 ? ctxProfile : localProfile;
  const ALL_GRADES = getAllGrades(profile?.curriculum || 'CBC');

  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [subjCfg, setSubjCfg] = useState({});
  const [fees, setFees] = useState([]);
  const [att, setAtt] = useState({});
  const [feeCfg, setFeeCfg] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('T1');
  const [assess, setAssess] = useState('et1');
  const [selLearner, setSelLearner] = useState('');
  const [regType, setRegType] = useState('monthly');

  useEffect(() => {
    if (!grade && ALL_GRADES.length > 0) setGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, grade]);

  useEffect(() => {
    async function load() {
      try {
        const auth = await getCachedUser();
        if (!auth) { router.push('/'); return; }
        setUser(auth);
        
        const db = await getCachedDBMulti([
          'paav6_learners', 'paav6_marks', 'paav8_subj', 'paav6_fees', 'paav8_grad', 'paav6_paylog', 'paav6_feecfg', 'paav_student_attendance', 'paav_school_profile'
        ]);
        
        setLearners(db.paav6_learners || []);
        setMarks(db.paav6_marks || {});
        setSubjCfg(db.paav8_subj || {});
        setGradCfg(db.paav8_grad || null);
        setFeeCfg(db.paav6_feecfg || {});
        
        const feeList = db.paav6_fees || [];
        const paylogList = db.paav6_paylog || [];
        setFees([...feeList, ...paylogList]);
        setAtt(db.paav_student_attendance || {});
        
        // Profile is now handled by the useSchoolProfile hook
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  const filteredLearners = useMemo(() => {
    let list = learners.filter(l => l.grade === grade);
    if (selLearner) list = list.filter(l => l.adm === selLearner);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [learners, grade, selLearner]);

  const allGradeLearners = useMemo(() =>
    learners.filter(l => l.grade === grade).sort((a,b) => a.name.localeCompare(b.name)),
  [learners, grade]);

  const subjects = useMemo(() =>
    (subjCfg[grade] && subjCfg[grade].length > 0) ? subjCfg[grade] : (getDefaultSubjects(grade, profile?.curriculum || 'CBC')),
  [subjCfg, grade, profile?.curriculum]);

  function triggerPrint(landscape) {
    const style = document.createElement('style');
    style.innerHTML = landscape ? '@page { size: A4 landscape; margin: 8mm; }' : '@page { size: A4 portrait; margin: 8mm; }';
    document.head.appendChild(style);
    
    if (landscape) document.body.classList.add('print-landscape');
    else document.body.classList.remove('print-landscape');
    
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-landscape');
      style.remove();
    }, 150);
  }

  function printGrade() {
    setSelLearner('');
    const landscape = tab === 'merit' || tab === 'class' || tab === 'balance' || tab === 'register' || tab === 'receipt';
    triggerPrint(landscape);
  }
  function printLearner() {
    if (!selLearner) { alert('Please select a learner first'); return; }
    const landscape = tab === 'merit' || tab === 'class' || tab === 'balance' || tab === 'register' || tab === 'receipt';
    triggerPrint(landscape);
  }

  const TABS = [
    { id: 'merit',   label: '🏆 Merit List' },
    { id: 'report',  label: '📋 Report Cards' },
    { id: 'class',   label: '🏫 Class List' },
    { id: 'balance', label: '📊 Fee Balance List' },
    { id: 'receipt', label: '💰 Fee Receipts' },
    { id: 'id',      label: '🆔 Student IDs' },
    { id: 'register',label: '📅 Attendance Register' },
  ];

  if (loading || !user) return <div className="page on"><p style={{padding:40,color:'var(--muted)'}}>Loading templates…</p></div>;

  return (
    <div className="page on" id="pg-templates">
      <div className="page-hdr no-print">
        <div>
          <h2>📄 Report Templates</h2>
          <p>Printable assets — {grade} · Term {term.replace('T','')}</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={printLearner}>🖨️ Print Learner</button>
          <button className="btn btn-primary btn-sm" onClick={printGrade}>🖨️ Print Whole Grade</button>
        </div>
      </div>

      <div className="tabs no-print" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id}
            className={`tab-btn ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel no-print" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Grade</label>
            <select value={grade} onChange={e => { setGrade(e.target.value); setSelLearner(''); }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)}>
              <option value="T1">Term 1</option>
              <option value="T2">Term 2</option>
              <option value="T3">Term 3</option>
            </select>
          </div>
          {tab === 'merit' && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Assessment</label>
              <select value={assess} onChange={e => setAssess(e.target.value)}>
                <option value="op1">Opener</option>
                <option value="mt1">Mid-Term</option>
                <option value="et1">End-Term</option>
              </select>
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Learner</label>
            <select value={selLearner} onChange={e => setSelLearner(e.target.value)}>
              <option value="">— ALL ({allGradeLearners.length}) —</option>
              {allGradeLearners.map(l => <option key={l.adm} value={l.adm}>{l.name} ({l.adm})</option>)}
            </select>
          </div>
          {tab === 'register' && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Period</label>
              <select value={regType} onChange={e => setRegType(e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
            <button className="btn btn-ghost btn-sm" onClick={printLearner}>🖨️ By Learner</button>
            <button className="btn btn-gold btn-sm" onClick={printGrade}>🖨️ By Grade</button>
          </div>
        </div>
      </div>

      {/* Instant tab switching — all tabs rendered, only active is shown */}
      <div className="print-container">
        <div style={{ display: tab === 'merit'   ? 'block' : 'none' }}>
          <MeritListTemplate learners={filteredLearners} subjects={subjects} marks={marks} grade={grade} term={term} assess={assess} gradCfg={gradCfg} profile={profile} />
        </div>
        <div style={{ display: tab === 'report'  ? 'block' : 'none' }}>
          <ReportCardTemplate learners={filteredLearners} subjects={subjects} marks={marks} grade={grade} term={term} gradCfg={gradCfg} profile={profile} />
        </div>
        <div style={{ display: tab === 'class'   ? 'block' : 'none' }}>
          <ClassListTemplate learners={filteredLearners} grade={grade} profile={profile} />
        </div>
        <div style={{ display: tab === 'balance' ? 'block' : 'none' }}>
          <FeeBalanceListTemplate learners={filteredLearners} fees={fees} grade={grade} feeCfg={feeCfg} profile={profile} />
        </div>
        <div style={{ display: tab === 'receipt' ? 'block' : 'none' }}>
          <ReceiptTemplate learners={filteredLearners} fees={fees} grade={grade} selLearner={selLearner} feeCfg={feeCfg} profile={profile} />
        </div>
        <div style={{ display: tab === 'id'      ? 'block' : 'none' }}>
          <IDCardTemplate learners={filteredLearners} grade={grade} profile={profile} />
        </div>
        <div style={{ display: tab === 'register'? 'block' : 'none' }}>
          <AttendanceRegisterTemplate learners={filteredLearners} grade={grade} type={regType} att={att} profile={profile} />
        </div>
      </div>
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

function PrintHeader({ title, grade, profile = {} }) {
  return (
    <div style={{ textAlign: 'center', borderBottom: '3px double #8B1A1A', paddingBottom: 12, marginBottom: 16 }}>
      {/* School logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={profile.logo || "/ev-brand-v3.png"} alt="School Logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'contain', margin: '0 auto 8px', border: '2px solid #D97706', background: '#fff', padding: 4 }} />
      <h1 style={{ fontFamily: 'Sora', fontSize: 17, fontWeight: 800, color: '#8B1A1A', margin: 0 }}>{profile.name?.toUpperCase() || 'SCHOOL PORTAL'}</h1>
      <p style={{ fontSize: 10, margin: '2px 0', color: '#555' }}>{profile.address || '—'} | {profile.phone || '—'} | {profile.email || '—'}</p>
      <p style={{ fontSize: 10, fontStyle: 'italic', color: '#D97706', fontWeight: 700, margin: '2px 0' }}>{profile.motto || '—'}</p>
      <div style={{ background: '#8B1A1A', color: '#fff', display: 'inline-block', padding: '3px 16px', borderRadius: 4, marginTop: 6, fontWeight: 700, fontSize: 12 }}>
        {title} — {grade}
      </div>
    </div>
  );
}

function MeritListTemplate({ learners, subjects, marks, grade, term, assess, gradCfg, profile }) {
  const curr = profile?.curriculum || 'CBC';
  const data = learners.map(l => {
    let total = 0;
    let totalMarks = 0;
    let count = 0;
    subjects.forEach(s => {
      const score = getMark(marks, term, grade, s, assess, l.adm);
      if (score !== null) {
        total += gInfo(score, grade, gradCfg, curr).pts;
        totalMarks += score;
        count++;
      }
    });
    const maxPoss = maxPts(grade, subjects, curr);
    return { ...l, total, totalMarks, count, avg: count > 0 ? (total / (maxPoss || 1) * 100).toFixed(1) : 0 };
  }).sort((a, b) => {
    if (shouldRankByMarks(grade, curr)) return b.totalMarks - a.totalMarks;
    return b.total - a.total;
  });

  const colStats = subjects.map(s => {
    let sum = 0;
    let count = 0;
    data.forEach(l => {
      const score = getMark(marks, term, grade, s, assess, l.adm);
      if (score !== null) {
        sum += score;
        count++;
      }
    });
    const avgScore = count > 0 ? Number((sum / count).toFixed(2)) : null;
    const avgInfo = avgScore !== null ? gInfo(avgScore, grade, gradCfg, curr) : null;
    return { avgScore, avgInfo };
  });

  const totalPtsSum = data.reduce((acc, l) => acc + l.total, 0);
  const totalAvgPts = data.length > 0 ? Number((totalPtsSum / data.length).toFixed(2)) : 0;
  const totalMarksSum = data.reduce((acc, l) => acc + l.totalMarks, 0);
  const totalAvgMarks = data.length > 0 ? Number((totalMarksSum / data.length).toFixed(2)) : 0;
  const avgPct = data.length > 0 ? (data.reduce((acc, l) => acc + parseFloat(l.avg), 0) / data.length).toFixed(1) : 0;

  // Distribution stats — dynamically initialized based on curriculum
  const dist = getDistributionBuckets(grade, curr);
  const subjectDistribution = {};
  subjects.forEach(s => { subjectDistribution[s] = getDistributionBuckets(grade, curr); });
    
  data.forEach(l => {
    const info = gInfo(parseFloat(l.avg), grade, gradCfg, curr);
    if (dist[info.lv] !== undefined) dist[info.lv]++;

    // Subject-wise distribution
    subjects.forEach(s => {
      const score = getMark(marks, term, grade, s, assess, l.adm);
      if (score !== null) {
        const sInfo = gInfo(score, grade, gradCfg, curr);
        if (subjectDistribution[s][sInfo.lv] !== undefined) {
          subjectDistribution[s][sInfo.lv]++;
        }
      }
    });
  });

  return (
    <div>
      <PrintHeader title="MERIT LIST" grade={grade} profile={profile} />
      

      <div style={{ textAlign: 'center', marginBottom: 15, fontSize: 13, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: 1 }}>
        TERM {term.replace('T','')} — {assess === 'op1' ? 'OPENER' : assess === 'mt1' ? 'MID-TERM' : 'END-TERM'} EXAMINATION
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 2, textAlign: 'center' }}>Pos</th>
            <th style={{ border: '1px solid #ddd', padding: 2, textAlign: 'center' }}>ADM</th>
            <th style={{ border: '1px solid #ddd', padding: 2, textAlign: 'left' }}>Name</th>
            {subjects.map(s => <th key={s} style={{ border: '1px solid #ddd', padding: 2, fontSize: 7.5, textAlign: 'center' }}>{s.slice(0,5)}</th>)}
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Total Marks</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Total Pts</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Avg Pts</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Level</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l, i) => {
            const lInfo = gInfo(parseFloat(l.avg), grade, gradCfg, curr);
            return (
              <tr key={l.adm}>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{l.adm}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5 }}>{l.name}</td>
                {subjects.map(s => {
                  const score = marks[`${term}:${grade}|${s}|${assess}`]?.[l.adm];
                  const info = score !== undefined ? gInfo(Number(score), grade, gradCfg, profile?.curriculum || 'CBC') : null;
                  return (
                    <td key={s} style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>
                      {score !== undefined ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{score}</span>
                          <span style={{ fontSize: 7.5, color: info.c, fontWeight: 800 }}>{info.lv}</span>
                        </div>
                      ) : '—'}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 700, color: '#059669' }}>{l.totalMarks}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 800, color: 'var(--navy)' }}>{l.total}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 700, color: '#0369A1' }}>
                  {l.count > 0 ? (l.total / l.count).toFixed(2) : '0'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>
                  <span style={{ color: lInfo.c, fontWeight: 800, fontSize: 8.5 }}>{lInfo.lv}</span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{l.avg}%</td>
              </tr>
            );
          })}
          {data.length > 0 && (
            <>
              <tr style={{ background: '#f0fdf4', borderTop: '2px solid #000' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>TOTAL MARKS</td>
                {subjects.map((s, i) => {
                  let sum = 0;
                  data.forEach(l => {
                    const score = getMark(marks, term, grade, s, assess, l.adm);
                    if (score !== null) sum += score;
                  });
                  return (
                    <td key={i} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800 }}>
                      {sum || '—'}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800 }}>{totalMarksSum}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800 }}>{totalPtsSum}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800 }}>{(totalPtsSum / (data.length * (subjects.length || 1))).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
              </tr>
              <tr style={{ background: '#f9f9f9', borderTop: '1px solid #000' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>AVERAGE SCORE</td>
                {colStats.map((stat, i) => (
                  <td key={i} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>
                    {stat.avgScore !== null ? stat.avgScore : '—'}
                  </td>
                ))}
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{totalAvgMarks}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{totalAvgPts}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{(totalAvgPts / (subjects.length || 1)).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{avgPct}%</td>
              </tr>
              <tr style={{ background: '#f9f9f9' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>AVERAGE LEVEL</td>
                {colStats.map((stat, i) => (
                  <td key={i} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                    {stat.avgInfo ? <span style={{ color: stat.avgInfo.c, fontWeight: 800, fontSize: 10 }}>{stat.avgInfo.lv}</span> : '—'}
                  </td>
                ))}
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                  {avgPct > 0 ? (
                    <span style={{ color: gInfo(parseFloat(avgPct), grade, gradCfg, curr).c, fontWeight: 900 }}>
                      {gInfo(parseFloat(avgPct), grade, gradCfg, curr).lv}
                    </span>
                  ) : '—'}
                </td>
              </tr>
              <tr style={{ background: '#f9f9f9' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>AVERAGE POINTS</td>
                {colStats.map((stat, i) => (
                  <td key={i} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>
                    {stat.avgInfo ? stat.avgInfo.pts : '—'}
                  </td>
                ))}
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800, color: '#8B1A1A' }}>{totalAvgPts}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800, color: '#8B1A1A' }}>{(totalAvgPts / (subjects.length || 1)).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                  {avgPct > 0 ? (
                    <span style={{ fontWeight: 800 }}>{gInfo(parseFloat(avgPct), grade, gradCfg, curr).pts}</span>
                  ) : '—'}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* Distribution Graph (at bottom) */}
      <div style={{ marginTop: 25, padding: 12, border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFF', display: 'flex', alignItems: 'center', gap: 24, pageBreakInside: 'avoid' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Class Performance Distribution</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
            {Object.entries(dist).map(([k, v]) => {
              const maxVal = Math.max(...Object.values(dist), 1);
              const h = (v / maxVal) * 100;
              const colors = getGradeColors(profile?.curriculum || 'CBC');
              return (
                <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 8, fontWeight: 800, marginBottom: 2 }}>{v}</div>
                  <div style={{ width: '100%', height: `${h}%`, background: colors[k] || '#cbd5e1', borderRadius: '3px 3px 0 0' }}></div>
                  <div style={{ fontSize: 8, fontWeight: 800, marginTop: 5, color: '#475569' }}>{k}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: 140, borderLeft: '2px solid #E2E8F0', paddingLeft: 24 }}>
          <div style={{ fontSize: 8, color: '#64748B', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>SUMMARY</div>
          {Object.entries(dist).map(([k, v]) => (
            <div key={k} style={{ fontSize: 10, fontWeight: 700, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#475569' }}>{k}:</span> <span>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject-wise Distribution Table */}
      <div style={{ marginTop: 20, pageBreakInside: 'avoid' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject-wise Distribution Analysis</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ border: '1px solid #ddd', padding: 4, textAlign: 'left' }}>Subject</th>
              {Object.keys(getDistributionBuckets(grade, curr)).map(lv => (
                <th key={lv} style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{lv}</th>
              ))}
              <th style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(subjectDistribution).map(([subj, counts]) => (
              <tr key={subj}>
                <td style={{ border: '1px solid #ddd', padding: 3, fontWeight: 700 }}>{subj}</td>
                {Object.values(counts).map((count, i) => (
                  <td key={i} style={{ border: '1px solid #ddd', padding: 3, textAlign: 'center', fontWeight: count > 0 ? 800 : 400, color: count > 0 ? '#1e293b' : '#cbd5e1' }}>
                    {count || '—'}
                  </td>
                ))}
                <td style={{ border: '1px solid #ddd', padding: 3, textAlign: 'center', fontWeight: 900, background: '#f8fafc' }}>
                  {Object.values(counts).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportCardTemplate({ learners, subjects, marks, grade, term, gradCfg, profile }) {
  const curr = profile?.curriculum || 'CBC';
  // Pre-calculate ranks based on average marks or points
  const rankedData = learners.map(l => {
    const report = calcLearnerReportData(marks, l.adm, grade, term, subjects, gradCfg, curr);
    return { ...l, report };
  }).sort((a, b) => {
    if (shouldRankByMarks(grade, curr)) return b.report.totalAvgScore - a.report.totalAvgScore;
    return b.report.totalAvgPts - a.report.totalAvgPts;
  });

  let r = 1;
  for (let i = 0; i < rankedData.length; i++) {
    const val = shouldRankByMarks(grade, curr) ? rankedData[i].report.totalAvgScore : rankedData[i].report.totalAvgPts;
    const prevVal = i > 0 ? (shouldRankByMarks(grade, curr) ? rankedData[i - 1].report.totalAvgScore : rankedData[i - 1].report.totalAvgPts) : null;
    
    if (i > 0 && val < prevVal) r = i + 1;
    rankedData[i].rank = r;
  }

  return (
    <div className="rc-batch">
      {rankedData.map(l => (
        <div key={l.adm} className="rc-page" style={{ background: '#FFFDF9', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle watermark or texture could go here */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: 150, color: 'rgba(139, 26, 26, 0.03)', fontWeight: 900, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 0 }}>
            {profile.name?.split(' ')[0] || 'SCHOOL'}
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <PrintHeader title="STUDENT PROGRESS REPORT" grade={grade} profile={profile} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 25, border: '1.5px solid #8B1A1A', padding: 15, borderRadius: 8 }}>
            <div><strong>NAME:</strong> {l.name}</div>
            <div><strong>ADM NO:</strong> {l.adm}</div>
            <div><strong>SEX:</strong> {l.sex || '—'}</div>
            <div><strong>GRADE:</strong> {grade}</div>
            <div><strong>TERM:</strong> {term}</div>
            <div><strong>YEAR:</strong> {new Date().getFullYear()}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 25 }}>
            <thead>
              <tr style={{ background: '#8B1A1A', color: '#fff' }}>
                <th style={{ border: '1px solid #333', padding: 6, textAlign: 'left' }}>Subject</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>Opener</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>Mid-Term</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>End-Term</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>Average</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>Level</th>
                <th style={{ border: '1px solid #333', padding: 6 }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {l.report.subjects.map(s => (
                <tr key={s.subj}>
                  <td style={{ border: '1px solid #333', padding: 4, fontWeight: 600 }}>{s.subj}</td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center' }}>{s.op || '—'} <small className={`grade-pill-${s.opLv}`} style={{ display: 'inline-block', fontSize: 8, padding: '1px 4px', borderRadius: 3, marginTop: 1 }}>{s.opLv}</small></td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center' }}>{s.mt || '—'} <small className={`grade-pill-${s.mtLv}`} style={{ display: 'inline-block', fontSize: 8, padding: '1px 4px', borderRadius: 3, marginTop: 1 }}>{s.mtLv}</small></td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center' }}>{s.et || '—'} <small className={`grade-pill-${s.etLv}`} style={{ display: 'inline-block', fontSize: 8, padding: '1px 4px', borderRadius: 3, marginTop: 1 }}>{s.etLv}</small></td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center', background: '#f9f9f9', fontWeight: 700 }}>{s.avg}</td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center' }}>
                    <span className={`grade-pill-${s.avgLv}`} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, display:'inline-block' }}>{s.avgLv}</span>
                  </td>
                  <td style={{ border: '1px solid #333', padding: 4, textAlign: 'center' }}>{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Performance Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 15, marginBottom: 20 }}>
            <div style={{ border: '1px solid #eee', padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#666', marginBottom: 8 }}>ASSESSMENT TRENDS</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 60, padding: '0 10px' }}>
                {[
                  { l: 'OP', v: l.report.subjects.reduce((a, s) => a + (s.op || 0), 0) / (subjects.length || 1) },
                  { l: 'MT', v: l.report.subjects.reduce((a, s) => a + (s.mt || 0), 0) / (subjects.length || 1) },
                  { l: 'ET', v: l.report.subjects.reduce((a, s) => a + (s.et || 0), 0) / (subjects.length || 1) },
                  { l: 'AVG', v: l.report.totalAvgPts / (subjects.length || 1) * 25 } // Normalized
                ].map((d, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: `${d.v}%`, background: idx === 3 ? 'var(--maroon)' : '#cbd5e1', borderRadius: '2px 2px 0 0' }}></div>
                    <div style={{ fontSize: 7, fontWeight: 800, marginTop: 4 }}>{d.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid #eee', padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#666', marginBottom: 8 }}>SUBJECT PROFICIENCY</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {l.report.subjects.map((s, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: `${s.avg}%`, background: '#8B1A1A', borderRadius: '1px 1px 0 0' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 10 }}>
            <div style={{ border: '1.5px solid #333', padding: 15, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee' }}>SUMMARY</h4>
              <p><strong>Total Points:</strong> {l.report.totalAvgPts} / {maxPts(grade, subjects, profile?.curriculum || 'CBC')}</p>
              <p><strong>Overall Level:</strong> <span style={{ background: '#8B1A1A', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{l.report.overallInfo.lv}</span></p>
              <p><strong>Class Rank:</strong> {l.rank} out of {learners.length}</p>
              <p><strong>Performance:</strong> {l.report.overallInfo.desc}</p>
            </div>
            <div style={{ border: '1.5px solid #333', padding: 15, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee' }}>EXAM TOTALS (MARKS)</h4>
              <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <div>Opener: <strong>{l.report.subjects.reduce((acc, s) => acc + (s.op || 0), 0)}</strong></div>
                <div>Mid-Term: <strong>{l.report.subjects.reduce((acc, s) => acc + (s.mt || 0), 0)}</strong></div>
                <div>End-Term: <strong>{l.report.subjects.reduce((acc, s) => acc + (s.et || 0), 0)}</strong></div>
                <div>Average: <strong>{l.report.subjects.reduce((acc, s) => acc + (s.avg || 0), 0)}</strong></div>
              </div>
              <div style={{ marginTop: 10, borderTop: '1px dotted #ccc', paddingTop: 10 }}>
                <div style={{ fontSize: 11, marginBottom: 5 }}>Class Teacher's Remarks: _________________</div>
                <div style={{ fontSize: 11, marginBottom: 5 }}>Headteacher's Remarks: _________________</div>
                <div style={{ fontSize: 11 }}>Parent's Remarks: ______________________</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#666' }}>
            <p>This is an official document of {profile.name || 'the institution'}. Any alterations make it invalid.</p>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-around' }}>
              <div>Stamp: [ ________________ ]</div>
              <div>Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassListTemplate({ learners, grade, profile }) {
  return (
    <div>
      <PrintHeader title="OFFICIAL CLASS LIST" grade={grade} profile={profile} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: 5 }}>#</th>
            <th style={{ border: '1px solid #ddd', padding: 5 }}>ADM</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'left' }}>Full Name</th>
            <th style={{ border: '1px solid #ddd', padding: 5 }}>Gender</th>
            <th style={{ border: '1px solid #ddd', padding: 5 }}>Parent Phone</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l, i) => (
            <tr key={l.adm}>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{l.adm}</td>
              <td style={{ border: '1px solid #ddd', padding: 4 }}>{l.name}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{l.sex === 'F' ? 'Female' : (l.sex === 'M' ? 'Male' : l.sex)}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{l.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeeBalanceListTemplate({ learners, fees, grade, feeCfg, profile }) {
  const getAnnualFee = g => feeCfg[g]?.annual || 5000;
  
  let totalExpected = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  const data = learners.map(l => {
    const expected = getAnnualFee(l.grade);
    const paid = (l.t1||0) + (l.t2||0) + (l.t3||0);
    const bal = expected - paid;
    
    totalExpected += expected;
    totalPaid += paid;
    totalBalance += bal;
    
    return { ...l, expected, paid, bal };
  });

  return (
    <div>
      <PrintHeader title="FEE BALANCE LIST" grade={grade} profile={profile} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>#</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>ADM</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'left' }}>Full Name</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Term 1 (Exp/Paid)</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Term 2 (Exp/Paid)</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Term 3 (Exp/Paid)</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Expected Total</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Paid Total</th>
            <th style={{ border: '1px solid #ddd', padding: 5, textAlign: 'center' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l, i) => (
            <tr key={l.adm}>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', fontWeight: 600 }}>{l.adm}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, fontWeight: 700 }}>{l.name}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', fontSize: 9 }}>
                Exp: {((feeCfg[l.grade]||{}).t1||0).toLocaleString()} / Paid: {(l.t1||0).toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', fontSize: 9 }}>
                Exp: {((feeCfg[l.grade]||{}).t2||0).toLocaleString()} / Paid: {(l.t2||0).toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', fontSize: 9 }}>
                Exp: {((feeCfg[l.grade]||{}).t3||0).toLocaleString()} / Paid: {(l.t3||0).toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', fontWeight: 600 }}>{l.expected.toLocaleString()}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', color: '#059669', fontWeight: 600 }}>{l.paid.toLocaleString()}</td>
              <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center', color: l.bal > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
                {l.bal.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr style={{ background: '#f9f9f9', fontWeight: 800 }}>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: 10, textAlign: 'right' }}>TOTAL:</td>
            <td style={{ border: '1px solid #ddd', padding: 10 }}></td>
            <td style={{ border: '1px solid #ddd', padding: 10 }}></td>
            <td style={{ border: '1px solid #ddd', padding: 10 }}></td>
            <td style={{ border: '1px solid #ddd', padding: 10, textAlign: 'center' }}>{totalExpected.toLocaleString()}</td>
            <td style={{ border: '1px solid #ddd', padding: 10, textAlign: 'center', color: '#059669' }}>{totalPaid.toLocaleString()}</td>
            <td style={{ border: '1px solid #ddd', padding: 10, textAlign: 'center', color: totalBalance > 0 ? '#DC2626' : '#059669' }}>
              {totalBalance.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ReceiptTemplate({ learners, fees, grade, selLearner, feeCfg, profile }) {
  const targetLearners = learners.filter(l => {
    if (grade && l.grade !== grade) return false;
    if (selLearner && l.adm !== selLearner) return false;
    return true;
  });

  if (targetLearners.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No learners found</div>
        <div style={{ fontSize: 12 }}>Check your grade/learner selection.</div>
      </div>
    );
  }

  const fmtK = (v) => 'KES ' + (v || 0).toLocaleString();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 148mm)', gap: 30, justifyContent: 'center' }}>
      {targetLearners.map((l, i) => {
        const cfg = feeCfg[l.grade] || {};
        const t1Fee = cfg.t1 || 0;
        const t2Fee = cfg.t2 || 0;
        const t3Fee = cfg.t3 || 0;
        const annualFee = t1Fee + t2Fee + t3Fee;
        const paylog = fees.filter(f => f.adm === l.adm).sort((a,b) => new Date(b.date) - new Date(a.date));
        const paid = (l.t1||0) + (l.t2||0) + (l.t3||0);
        const arrears = l.arrears || 0;
        const bal = annualFee + arrears - paid;

        return (
          <div key={l.adm || i} style={{ 
            pageBreakInside: 'avoid', 
            margin: '0 auto', 
            padding: '10mm', 
            background: '#fff', 
            border: '1px solid #ddd', 
            borderRadius: 8, 
            width: '148mm', 
            minHeight: '105mm',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }} className="standard-statement">
            
            {/* Letterhead */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: '2px solid #8B1A1A', paddingBottom: 10 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#8B1A1A', letterSpacing: -0.5 }}>{profile.name || 'SCHOOL PORTAL'}</div>
                <div style={{ fontSize: 10, color: '#444', fontWeight: 600 }}>{profile.motto || '✝ More Than Academics!'}</div>
                <div style={{ fontSize: 9, color: '#666' }}>Tel: {profile.phone || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 12, background: '#8B1A1A', color: '#fff', padding: '4px 12px', borderRadius: 4 }}>FEES STATEMENT</div>
                <div style={{ fontSize: 9, marginTop: 4, color: '#666' }}>Year: {new Date().getFullYear()}</div>
              </div>
            </div>

            {/* Learner Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15 }}>
              <div>
                <div style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Learner</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: '#444' }}>ADM: <strong>{l.adm}</strong> | {l.grade}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Summary Grid */}
            <div style={{ background: '#F8FAFF', padding: '12px', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 15 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 700 }}>ARREARS</div>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{arrears.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 700 }}>ANNUAL</div>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{annualFee.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 700 }}>PAYABLE</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#8B1A1A' }}>{(annualFee + arrears).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 700 }}>PAID</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#059669' }}>{paid.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '5px 0' }}>
                <div>
                  <div style={{ fontSize: 7, color: '#666' }}>T1 EXP</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{t1Fee.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 7, color: '#666' }}>T2 EXP</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{t2Fee.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 7, color: '#666' }}>T3 EXP</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{t3Fee.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 8, color: '#666', fontWeight: 800 }}>BALANCE</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: bal > 0 ? '#DC2626' : '#059669' }}>{bal.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Termly Breakdown */}
            {(t1Fee > 0 || t2Fee > 0 || t3Fee > 0) && (
              <div style={{ marginTop: 15 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#4A5568', marginBottom: 5, textTransform: 'uppercase' }}>Termly Fee Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #EDF2F7' }}>
                    <div style={{ fontSize: 8, color: '#718096' }}>Term 1</div>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>Exp: {fmtK(t1Fee)}</div>
                    <div style={{ fontSize: 9, color: '#059669' }}>Paid: {fmtK(l.t1||0)}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #EDF2F7' }}>
                    <div style={{ fontSize: 8, color: '#718096' }}>Term 2</div>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>Exp: {fmtK(t2Fee)}</div>
                    <div style={{ fontSize: 9, color: '#059669' }}>Paid: {fmtK(l.t2||0)}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #EDF2F7' }}>
                    <div style={{ fontSize: 8, color: '#718096' }}>Term 3</div>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>Exp: {fmtK(t3Fee)}</div>
                    <div style={{ fontSize: 9, color: '#059669' }}>Paid: {fmtK(l.t3||0)}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '15px 0' }}></div>

            {/* Payment History */}
            <div style={{ fontSize: 10, marginBottom: 5, fontWeight: 700 }}>PAYMENT HISTORY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                  <th style={{ padding: 5, borderBottom: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: 5, borderBottom: '1px solid #ddd' }}>Term</th>
                  <th style={{ padding: 5, borderBottom: '1px solid #ddd' }}>Method</th>
                  <th style={{ padding: 5, borderBottom: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paylog.slice(0, 8).map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{p.date.split('-').slice(1).join('/')}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{p.term}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{p.method}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700 }}>{p.amount || p.amt}</td>
                  </tr>
                ))}
                {paylog.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 15, textAlign: 'center', color: '#999' }}>No payments.</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#8B1A1A', marginTop: 15 }}>
              Thank you for your payment!
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IDCardTemplate({ learners, grade, profile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
      {learners.map(l => (
        <div key={l.adm} style={{ width: 340, height: 215, border: '1.5px solid #8B1A1A', borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ background: '#8B1A1A', color: '#fff', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={profile.logo || "/ev-brand-v3.png"} alt="L" style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', padding: 2 }} />
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.5 }}>{profile.name?.toUpperCase() || 'EDUVANTAGE SCHOOL MANAGEMENT SYSTEM'}</div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', padding: 10, gap: 12 }}>
            {/* Photo Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 75, height: 85, border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {l.avatar ? (
                  <img src={l.avatar} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 30 }}>👤</span>
                )}
              </div>
              <div style={{ background: '#8B1A1A', color: '#fff', fontSize: 8, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>STUDENT</div>
            </div>

            {/* Info Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #eee' }}>{l.name}</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: 9 }}>
                <div><span style={{ color: '#64748B' }}>ADM NO:</span> <strong style={{ color: '#1E293B' }}>{l.adm}</strong></div>
                <div><span style={{ color: '#64748B' }}>GRADE:</span> <strong style={{ color: '#1E293B' }}>{l.grade}</strong></div>
                <div><span style={{ color: '#64748B' }}>SEX:</span> <strong style={{ color: '#1E293B' }}>{l.sex || '—'}</strong></div>
                <div><span style={{ color: '#64748B' }}>D.O.B:</span> <strong style={{ color: '#1E293B' }}>{l.dob || '—'}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748B' }}>CONTACT:</span> <strong style={{ color: '#1E293B' }}>{l.phone || '—'}</strong></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 7, color: '#94A3B8', fontStyle: 'italic' }}>{profile.motto || 'Education Portal'}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#1E293B' }}>{profile.name || 'PORTAL'}</div>
              <div style={{ fontSize: 6, color: '#94A3B8' }}>{profile.address || 'Kenya'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceRegisterTemplate({ learners, grade, type, att, profile }) {
  // Helper to generate days for the register
  const getDays = () => {
    const year = new Date().getFullYear();
    const today = new Date();
    
    if (type === 'weekly') {
      const mon = new Date(today);
      mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      return [...Array(5)].map((_, i) => {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        return d.toISOString().split('T')[0];
      });
    }
    
    if (type === 'monthly') {
      const month = today.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      return [...Array(numDays)].map((_, i) => {
        return new Date(year, month, i + 1).toISOString().split('T')[0];
      });
    }

    if (type === 'termly') {
      // 14 weeks summary or select a specific month? 
      // User asked for termly register. We'll show first 31 days or a specific term span
      return [...Array(31)].map((_, i) => {
        const d = new Date(year, 0, i + 6); // Just a sample span for T1
        return d.toISOString().split('T')[0];
      });
    }
    
    // Annually (Show months)
    return ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `${year}-${m}`);
  };

  const dayList = getDays();
  const isAnnual = type === 'annually';

  return (
    <div style={{ pageBreakInside: 'avoid' }}>
      <PrintHeader title={`ATTENDANCE REGISTER (${type.toUpperCase()})`} grade={grade} profile={profile} />
      <div style={{ marginBottom: 15, fontSize: 13, display: 'flex', gap: 30, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
        <div><strong>Period:</strong> {isAnnual ? new Date().getFullYear() : new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        <div><strong>Teacher:</strong> ____________________</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            <th style={{ border: '1px solid #333', padding: '3px 4px', width: 30 }}>#</th>
            <th style={{ border: '1px solid #333', padding: '3px 4px', textAlign: 'left', width: 220 }}>Student Name / ADM</th>
            {dayList.map((d, i) => (
              <th key={d} style={{ border: '1px solid #333', padding: 1, width: 25, fontSize: 7.5 }}>
                {isAnnual ? d.split('-')[1] : d.split('-')[2]}
              </th>
            ))}
            <th style={{ border: '1px solid #333', padding: 2, width: 50 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Dynamic learner rows */}
          {learners.map((l, idx) => {
            let presentCount = 0;
            return (
              <tr key={l.adm}>
                <td style={{ border: '1px solid #333', padding: '3px 4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #333', padding: '3px 4px' }}>
                  <div style={{ fontWeight: 700 }}>{l.name}</div>
                  <div style={{ fontSize: 7.5, color: '#666' }}>{l.adm}</div>
                </td>
                {dayList.map(d => {
                  const status = att[`${grade}|${d}|${l.adm}`] || '';
                  if (status === 'P' || status === 'L') presentCount++;
                  return (
                    <td key={d} style={{ border: '1px solid #333', padding: 0, height: 32, textAlign: 'center', fontWeight: 800 }}>
                      {status || ''}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #333', padding: 0, textAlign: 'center', fontWeight: 800 }}>{presentCount}</td>
              </tr>
            );
          })}
          {/* Always add 5 blank rows for manual entries/new students */}
          {[...Array(5)].map((_, idx) => (
            <tr key={`blank-${idx}`}>
              <td style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'center' }}>{learners.length + idx + 1}</td>
              <td style={{ border: '1px solid #333', padding: '6px 8px', height: 32 }}></td>
              {dayList.map(d => (
                <td key={d} style={{ border: '1px solid #333', padding: 0 }}></td>
              ))}
              <td style={{ border: '1px solid #333', padding: 0 }}></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 25, fontSize: 11, display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: 15 }}>
        <div style={{ display: 'flex', gap: 15 }}>
          <strong>KEY:</strong>
          <span>[ P ] Present</span>
          <span>[ A ] Absent</span>
          <span>[ L ] Late</span>
          <span>[ E ] Excused</span>
        </div>
        <div>Class Teacher's Signature: __________________________</div>
      </div>
    </div>
  );
}

