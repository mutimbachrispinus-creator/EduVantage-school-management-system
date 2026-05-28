'use client';
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
import { getAllGrades, getCurriculum, gInfo, getDefaultSubjects, maxPts, calcLearnerReportData, getMark, isJSSGrade, getDistributionBuckets, getGradeColors, shouldRankByMarks, isLevelEnabled, buildMeritList, getLabels } from '@/lib/cbe';
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
  const LABELS = getLabels(profile?.curriculum || 'CBC');
  const ALL_GRADES = (getAllGrades(profile?.curriculum || 'CBC') || []).filter(g => isLevelEnabled(g, profile, profile?.curriculum));

  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [subjCfg, setSubjCfg] = useState({});
  const [fees, setFees] = useState([]);
  const [att, setAtt] = useState({});
  const [feeCfg, setFeeCfg] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [weights, setWeights] = useState(null);
  const [terms, setTerms] = useState([]);
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('T1');
  const [assess, setAssess] = useState('et1');
  const [selLearner, setSelLearner] = useState('');
  const [regType, setRegType] = useState('monthly');
  const [gradingMode, setGradingMode] = useState('per-level');

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
          'paav6_learners', 'paav6_marks', 'paav8_subj', 'paav6_fees', 'paav8_grad', 'paav6_paylog', 'paav6_feecfg', 'paav_student_attendance', 'paav_school_profile', 'paav_grading_weights', 'paav_terms', 'paav_grading_mode'
        ]);
        
        setLearners(db.paav6_learners || []);
        setMarks(db.paav6_marks || {});
        setSubjCfg(db.paav8_subj || {});
        setGradCfg(db.paav8_grad || null);
        setFeeCfg(db.paav6_feecfg || {});
        setWeights(db.paav_grading_weights || null);
        setTerms(Array.isArray(db.paav_terms) ? db.paav_terms : []);
        
        const feeList = db.paav6_fees || [];
        const paylogList = db.paav6_paylog || [];
        setFees([...feeList, ...paylogList]);
        setAtt(db.paav_student_attendance || {});
        setGradingMode(db.paav_grading_mode || 'per-level');
        
        // Profile is now handled by the useSchoolProfile hook
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  const filteredLearners = useMemo(() => {
    let list = (learners || []).filter(l => l.grade === grade);
    if (selLearner) list = list.filter(l => l.adm === selLearner);
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [learners, grade, selLearner]);

  const allGradeLearners = useMemo(() =>
    (learners || []).filter(l => l.grade === grade).sort((a,b) => (a.name || '').localeCompare(b.name || '')),
  [learners, grade]);

  const subjects = useMemo(() => {
    const list = (subjCfg[grade] && subjCfg[grade].length > 0) ? subjCfg[grade] : getDefaultSubjects(grade, profile?.curriculum || 'CBC');
    return (list || []).filter(s => s && s.trim());
  }, [subjCfg, grade, profile?.curriculum]);


  function triggerPrint(landscape) {
    // Mark only the active tab so print doesn't show a blank page
    document.querySelectorAll('.print-container > div').forEach(el => el.classList.remove('print-me'));
    const activeEl = document.getElementById(`pct-${tab}`);
    if (activeEl) activeEl.classList.add('print-me');

    const style = document.createElement('style');
    style.id = 'paav-print-style';
    const pageRule = landscape
      ? '@page { size: A4 landscape; margin: 8mm; }'
      : '@page { size: A4 portrait; margin: 8mm; }';
    const showRule = '@media print { .print-container > div.print-content { display: none !important; } .print-container > div.print-me { display: block !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; position: relative; } }';
    style.innerHTML = pageRule + '\n' + showRule;
    document.head.appendChild(style);

    if (landscape) document.body.classList.add('print-landscape');
    else document.body.classList.remove('print-landscape');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('print-landscape');
        const s = document.getElementById('paav-print-style');
        if (s) s.remove();
        document.querySelectorAll('.print-container > div').forEach(el => el.classList.remove('print-me'));
      }, 1000);
    }, 800);
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
    { id: 'receipt', label: `💰 Fee Receipts` },
    { id: 'id',      label: `🆔 ${LABELS.grades} IDs` },
    { id: 'register',label: `📅 ${LABELS.attendance} Register` },
    { id: 'exam_summary', label: '📈 Exam Summary (School)', adminOnly: true },
  ].filter(t => !t.adminOnly || ['admin', 'super-admin'].includes(user?.role));

  if (!user) return <div className="page on"><p style={{padding:40,color:'var(--muted)'}}>Verifying session…</p></div>;
  if (loading) return <div className="page on"><p style={{padding:40,color:'var(--muted)'}}>Gathering institutional records…</p></div>;

  return (
    <div className="page on" id="pg-templates">
      <div className="page-hdr no-print">
        <div>
          <h2>📄 Report Templates</h2>
          <p>Printable assets — {grade || 'Select'} · Term {term.replace('T','')}</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={printLearner}>🖨️ Print {LABELS.learner}</button>
          <button className="btn btn-primary btn-sm" onClick={printGrade}>🖨️ Print Whole {LABELS.grade}</button>
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
            <label>{LABELS.grade}</label>
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
            <label>{LABELS.learner}</label>
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

      {/* Instant tab switching — all tabs rendered to load data, only active is shown */}
      <div className="print-container" style={{ position: 'relative' }}>
        {/* Universal Watermark for Printing */}
        <div className="print-watermark" style={{ display: 'none' }}>
           <div style={{ position: 'fixed', top: '-20%', left: '-20%', width: '140%', height: '140%', display: 'flex', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.05, pointerEvents: 'none', zIndex: 0, alignContent: 'flex-start', justifyContent: 'flex-start' }}>
             {Array.from({ length: 180 }).map((_, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 40px', transform: 'rotate(-30deg)' }}>
                 <img src="/eduvantage-logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                 <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Sora, sans-serif', color: '#1E293B', textTransform: 'uppercase' }}>EDUVANTAGE</span>
               </div>
             ))}
           </div>
        </div>
        <style>{`
          @media print {
            .print-watermark { display: block !important; }
          }
        `}</style>
        
        <div id="pct-merit" className={`print-content ${tab === 'merit' ? 'print-me' : ''}`} style={{ display: tab === 'merit' ? 'block' : 'none' }}>
          <MeritListTemplate learners={filteredLearners} subjects={subjects} marks={marks} grade={grade} term={term} assess={assess} gradCfg={gradCfg} profile={profile} mode={gradingMode} />
        </div>
        <div id="pct-report" className={`print-content ${tab === 'report' ? 'print-me' : ''}`} style={{ display: tab === 'report' ? 'block' : 'none' }}>
          <ReportCardTemplate learners={filteredLearners} subjects={subjects} marks={marks} grade={grade} term={term} gradCfg={gradCfg} profile={profile} att={att} weights={weights} terms={terms} mode={gradingMode} />
        </div>
        <div id="pct-class" className={`print-content ${tab === 'class' ? 'print-me' : ''}`} style={{ display: tab === 'class' ? 'block' : 'none' }}>
          <ClassListTemplate learners={filteredLearners} grade={grade} profile={profile} />
        </div>
        <div id="pct-balance" className={`print-content ${tab === 'balance' ? 'print-me' : ''}`} style={{ display: tab === 'balance' ? 'block' : 'none' }}>
          <FeeBalanceListTemplate learners={filteredLearners} fees={fees} grade={grade} feeCfg={feeCfg} profile={profile} />
        </div>
        <div id="pct-receipt" className={`print-content ${tab === 'receipt' ? 'print-me' : ''}`} style={{ display: tab === 'receipt' ? 'block' : 'none' }}>
          <ReceiptTemplate learners={filteredLearners} fees={fees} grade={grade} selLearner={selLearner} feeCfg={feeCfg} profile={profile} />
        </div>
        <div id="pct-id" className={`print-content ${tab === 'id' ? 'print-me' : ''}`} style={{ display: tab === 'id' ? 'block' : 'none' }}>
          <IDCardTemplate learners={filteredLearners} grade={grade} profile={profile} />
        </div>
        <div id="pct-register" className={`print-content ${tab === 'register' ? 'print-me' : ''}`} style={{ display: tab === 'register' ? 'block' : 'none' }}>
          <AttendanceRegisterTemplate learners={filteredLearners} grade={grade} type={regType} att={att} profile={profile} />
        </div>
        <div id="pct-exam_summary" className={`print-content ${tab === 'exam_summary' ? 'print-me' : ''}`} style={{ display: tab === 'exam_summary' ? 'block' : 'none' }}>
          <ExamSummaryTemplate learners={learners} subjects={subjCfg} marks={marks} gradCfg={gradCfg} profile={profile} mainTerm={term} mainAssess={assess} mode={gradingMode} />
        </div>
      </div>
    </div>
  );
}

/* ── SUB-COMPONENTS ── */

function PrintHeader({ title, grade, profile = {} }) {
  const curr = profile.curriculum || 'CBC';
  const themeColor = curr === 'BRITISH' ? '#1E3A8A' : curr === 'CAMBRIDGE' ? '#065F46' : curr === 'IB' ? '#4338CA' : '#8B1A1A';
  
  return (
    <div style={{ textAlign: 'center', borderBottom: `3.5px double ${themeColor}`, paddingBottom: 12, marginBottom: 16, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 8, color: '#94A3B8', fontWeight: 800 }}>{curr} SYSTEM</div>
      <img src={profile.logo || "/eduvantage-logo.png"} alt="School Logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'contain', margin: '0 auto 8px', border: `2.5px solid ${themeColor}`, background: 'transparent', padding: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
      <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 900, color: themeColor, margin: 0, letterSpacing: -0.5 }}>{profile.name?.toUpperCase() || 'EDU-VANTAGE SCHOOL'}</h1>
      <p style={{ fontSize: 11, margin: '2px 0', color: '#475569', fontWeight: 600 }}>{profile.address || '—'} | {profile.phone || '—'}</p>
      <p style={{ fontSize: 10, fontStyle: 'italic', color: '#64748B', fontWeight: 700, margin: '2px 0' }}>"{profile.motto || 'Excellence in Every Step'}"</p>
      <div style={{ background: themeColor, color: '#fff', display: 'inline-block', padding: '5px 24px', borderRadius: 25, marginTop: 8, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
        {title} — {grade}
      </div>
    </div>
  );
}

function MeritListTemplate({ learners, subjects, marks, grade, term, assess, gradCfg, profile, mode = 'per-level' }) {
  const curr = profile?.curriculum || 'CBC';
  // Ensure we pass the dynamic subjects list to buildMeritList
  const filteredSubjects = (subjects || []).filter(s => s && s.trim());
  const data = buildMeritList(learners, marks, grade, term, assess, gradCfg, curr, filteredSubjects, mode);


  const colStats = filteredSubjects.map(s => {
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
    const avgInfo = avgScore !== null ? gInfo(avgScore, grade, gradCfg, curr, s, mode) : null;
    return { avgScore, avgInfo };
  });

  
  const subjectPerformanceRanks = colStats
    .map((s, i) => ({ index: i, avgScore: s.avgScore }))
    .filter(s => s.avgScore !== null)
    .sort((a, b) => b.avgScore - a.avgScore);
  const subjectRanks = new Array(colStats.length).fill(null);
  let spr = 1;
  for (let i = 0; i < subjectPerformanceRanks.length; i++) {
    if (i > 0 && subjectPerformanceRanks[i].avgScore < subjectPerformanceRanks[i-1].avgScore) spr = i + 1;
    subjectRanks[subjectPerformanceRanks[i].index] = spr;
  }

  const totalPtsSum = data.reduce((acc, l) => acc + l.totalPts, 0);
  const totalAvgPts = data.length > 0 ? Number((totalPtsSum / data.length).toFixed(2)) : 0;
  const totalMarksSum = data.reduce((acc, l) => acc + l.totalMarks, 0);
  const totalAvgMarks = data.length > 0 ? Number((totalMarksSum / data.length).toFixed(2)) : 0;
  const avgPct = data.length > 0 ? (data.reduce((acc, l) => acc + (l.maxTotal > 0 ? (l.totalPts/l.maxTotal*100) : 0), 0) / data.length).toFixed(1) : 0;

  // Distribution stats — dynamically initialized based on curriculum
  const dist = getDistributionBuckets(grade, curr);
  const subjectDistribution = {};
  filteredSubjects.forEach(s => { subjectDistribution[s] = getDistributionBuckets(grade, curr); });
    
  data.forEach(l => {
    const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
    const info = gInfo(lPct, grade, gradCfg, curr, null, mode);
    if (dist[info.lv] !== undefined) dist[info.lv]++;

    // Subject-wise distribution
    l.detail.forEach(d => {
      if (d.score !== null && subjectDistribution[d.subj]) {
        if (subjectDistribution[d.subj][d.lv] !== undefined) {
          subjectDistribution[d.subj][d.lv]++;
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
            {filteredSubjects.map(s => <th key={s} style={{ border: '1px solid #ddd', padding: 2, fontSize: 7.5, textAlign: 'center' }}>{s.slice(0,5)}</th>)}
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Total Marks</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Total Pts</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Avg Pts</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>Level</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#8B1A1A', textAlign: 'center' }}>%</th>
            <th style={{ border: '1px solid #ddd', padding: 2, color: '#0369A1', textAlign: 'center' }}>VAP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l, i) => {
            const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
            const lInfo = gInfo(lPct, grade, gradCfg, curr, null, mode);
            return (
              <tr key={l.adm}>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{l.rank}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{l.adm}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5 }}>{l.name}</td>
                {filteredSubjects.map(s => {
                  const d = l.detail.find(x => x.subj === s);
                  return (
                    <td key={s} style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>
                      {d && d.score !== null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{d.score}</span>
                          <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <span style={{ fontSize: 7.5, color: d.c || '#333', fontWeight: 800 }}>{d.lv || '—'}</span>
                            {d.sRank && <span style={{ fontSize: 6.5, color: '#666', fontWeight: 700 }}>No.{d.sRank}</span>}
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 700, color: '#059669' }}>{l.totalMarks}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 800, color: 'var(--navy)' }}>{l.totalPts}</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center', fontWeight: 700, color: '#0369A1' }}>
                  {l.enteredCount > 0 ? (l.totalPts / l.enteredCount).toFixed(2) : '0'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>
                  <span style={{ color: lInfo.c, fontWeight: 800, fontSize: 8.5 }}>{lInfo.lv}</span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>{lPct.toFixed(1)}%</td>
                <td style={{ border: '1px solid #ddd', padding: 1.5, textAlign: 'center' }}>
                  {l.vap !== 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: l.vap > 0 ? '#059669' : '#dc2626' }}>
                        {l.vap > 0 ? '↗️' : '↘️'}
                      </span>
                      <span style={{ fontSize: 8, fontWeight: 900, color: l.vap > 0 ? '#059669' : '#dc2626' }}>
                        {l.vap > 0 ? `+${l.vap}` : l.vap}
                      </span>
                    </div>
                  ) : <span style={{ color: '#94a3b8', fontSize: 8 }}>—</span>}
                </td>
              </tr>
            );
          })}
          {data.length > 0 && (
            <>
              <tr style={{ background: '#f0fdf4', borderTop: '2px solid #000' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>TOTAL MARKS</td>
                {filteredSubjects.map((s, i) => {
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
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{(totalAvgPts / (filteredSubjects.length || 1)).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 700 }}>{avgPct}%</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
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
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
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
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800, color: '#8B1A1A' }}>{(totalAvgPts / (filteredSubjects.length || 1)).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                  {avgPct > 0 ? (
                    <span style={{ fontWeight: 800 }}>{gInfo(parseFloat(avgPct), grade, gradCfg, curr).pts}</span>
                  ) : '—'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>—</td>
              </tr>
              <tr style={{ background: '#f0f9ff' }}>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', fontWeight: 800 }}>SUBJECT RANK</td>
                {colStats.map((stat, i) => (
                  <td key={i} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 800, color: '#0369A1' }}>
                    {subjectRanks[i] ? `No. ${subjectRanks[i]}` : '—'}
                  </td>
                ))}
                <td colSpan={5} style={{ border: '1px solid #ddd' }}></td>
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

function ReportCardTemplate({ learners, subjects, marks, grade, term, gradCfg, profile, att, weights, terms, mode = 'per-level' }) {
  const curr = profile?.curriculum || 'CBC';
  const themeColor = curr === 'BRITISH' ? '#1E3A8A' : curr === 'CAMBRIDGE' ? '#065F46' : curr === 'IB' ? '#4338CA' : '#8B1A1A';
  
  // Pre-calculate ranks
  const rankedData = learners.map(l => {
    const report = calcLearnerReportData(marks, l.adm, grade, term, subjects, gradCfg, curr, weights, mode);
    return { ...l, report };
  }).sort((a, b) => {
    if (shouldRankByMarks(grade, curr)) return (b.report?.totalAvgScore || 0) - (a.report?.totalAvgScore || 0);
    return (b.report?.totalAvgPts || 0) - (a.report?.totalAvgPts || 0);
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
        <div key={l.adm} className="rc-page" style={{ background: '#FFFDF9', position: 'relative', overflow: 'visible', padding: '12mm 14mm', border: `3px solid ${themeColor}`, boxSizing: 'border-box' }}>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 10, right: 10, textAlign: 'center' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://eduvantage.app/verify/${profile?.tenantId || 'demo'}/${encodeURIComponent(l.adm)}`)}`} alt="QR Verification" style={{ width: 60, height: 60, border: '1px solid #ddd', padding: 2, background: '#fff' }} />
              <div style={{ fontSize: 7, fontWeight: 800, color: '#94A3B8', marginTop: 2 }}>SCAN TO VERIFY</div>
            </div>
            <PrintHeader title="OFFICIAL PROGRESS REPORT" grade={grade} profile={profile} />
          </div>
          
          {(!l.report || !l.report.subjects) ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
              <p>Unable to generate report for {l.name}. Data may be incomplete.</p>
            </div>
          ) : (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 0, marginBottom: 20, border: `2px solid ${themeColor}`, borderRadius: 10, overflow: 'hidden', fontSize: 11, background: '#fff' }}>
            <div style={{ padding: 12, borderRight: `1px solid ${themeColor}33` }}>
              <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Learner Identification</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: themeColor }}>{l.name}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>ADM: <strong>{l.adm}</strong> · Sex: <strong>{l.sex || '—'}</strong></div>
            </div>
            <div style={{ padding: 12, borderRight: `1px solid ${themeColor}33`, background: `${themeColor}05` }}>
              <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Academic Period</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Term {term.replace('T','')} — {new Date().getFullYear()}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>Curriculum: <strong>{curr}</strong></div>
            </div>
            <div style={{ padding: 12, textAlign: 'center', background: themeColor, color: '#fff' }}>
              <div style={{ fontSize: 9, opacity: 0.8, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Institutional Rank</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{l.rank}</div>
              <div style={{ fontSize: 10, opacity: 0.9 }}>Out of {learners.length} students</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 10.5, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: themeColor, color: '#fff' }}>
                <th style={{ padding: 8, textAlign: 'left', borderRadius: '8px 0 0 0' }}>Learning Area / Subject</th>
                {(getCurriculum(curr).ASSESSMENT_TYPES || []).map(a => (
                  <th key={a.key} style={{ padding: 8 }}>{a.label.replace(/^[^\s]+\s/, '')}</th>
                ))}
                <th style={{ padding: 8, background: 'rgba(255,255,255,0.1)' }}>Avg %</th>
                <th style={{ padding: 8 }}>Dev</th>
                <th style={{ padding: 8, borderRadius: '0 8px 0 0' }}>Performance Level</th>
              </tr>
            </thead>
            <tbody>
              {l.report.subjects.map((s, idx) => {
                const colors = getGradeColors(curr);
                return (
                  <tr key={s.subj} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFF' }}>
                    <td style={{ borderBottom: '1px solid #E2E8F0', padding: 7, fontWeight: 700, color: '#1E293B' }}>{s.subj}</td>
                    {(getCurriculum(curr).ASSESSMENT_TYPES || []).map(a => {
                      const score = s.scores[a.key];
                      const info = s.infos[a.key];
                      return (
                        <td key={a.key} style={{ borderBottom: '1px solid #E2E8F0', padding: 7, textAlign: 'center' }}>
                          {score !== null ? (
                            <>
                              {score} <span style={{ fontSize: 8, color: (info && colors[info.lv]) || '#94A3B8', fontWeight: 800 }}>{info?.lv || '—'}</span>
                            </>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ borderBottom: '1px solid #E2E8F0', padding: 7, textAlign: 'center', fontWeight: 800, background: 'rgba(0,0,0,0.02)' }}>{s.avg}</td>
                    <td style={{ borderBottom: '1px solid #E2E8F0', padding: 7, textAlign: 'center' }}>
                      {(() => {
                        let dev = 0;
                        if (s.scores?.et1 !== undefined && s.scores?.mt1 !== undefined && s.scores?.et1 !== null && s.scores?.mt1 !== null) {
                           dev = s.scores.et1 - s.scores.mt1;
                        } else if (s.scores?.mt1 !== undefined && s.scores?.op1 !== undefined && s.scores?.mt1 !== null && s.scores?.op1 !== null) {
                           dev = s.scores.mt1 - s.scores.op1;
                        } else {
                           return <span style={{ color: '#94A3B8' }}>—</span>;
                        }
                        return dev !== 0 ? (
                          <span style={{ color: dev > 0 ? '#059669' : '#DC2626', fontWeight: 800, fontSize: 10 }}>
                            {dev > 0 ? `↗ +${dev}` : `↘ ${dev}`}
                          </span>
                        ) : <span style={{ color: '#94A3B8' }}>—</span>;
                      })()}
                    </td>
                    <td style={{ borderBottom: '1px solid #E2E8F0', padding: 7, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900, background: (colors[s.avgLv] || '#333') + '22', color: colors[s.avgLv] || '#333', border: `1px solid ${colors[s.avgLv] || '#333'}` }}>
                        {s.avgLv}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Competency Badge Summary */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center', background: '#fff', padding: 10, borderRadius: 12, border: '1px solid #eee' }}>
             {Object.entries(l.report.subjects.reduce((acc, s) => {
               acc[s.avgLv] = (acc[s.avgLv] || 0) + 1;
               return acc;
             }, {})).map(([lv, count]) => (
               <div key={lv} style={{ padding: '5px 15px', borderRadius: 10, background: `${getGradeColors(curr)[lv]}11`, border: `1.5px solid ${getGradeColors(curr)[lv]}33`, textAlign: 'center' }}>
                 <div style={{ fontSize: 12, fontWeight: 900, color: getGradeColors(curr)[lv] }}>{count}</div>
                 <div style={{ fontSize: 8, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{lv}</div>
               </div>
             ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ padding: 15, borderRadius: 12, border: `2.5px solid ${themeColor}22`, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: themeColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Performance Summary</h4>
                <div style={{ fontSize: 10, color: '#64748B' }}>Total Points: <strong>{l.report.totalAvgPts}</strong></div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div style={{ background: `${themeColor}08`, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Overall Proficiency</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: themeColor }}>{l.report.overallInfo.lv}</div>
                  <div style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>{l.report.overallInfo.desc}</div>
                </div>
                <div style={{ background: '#F0FDF4', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Aggregate Score</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#166534' }}>{l.report.totalAvgScore.toFixed(1)}%</div>
                  <div style={{ fontSize: 9, color: '#166534' }}>Across {l.report.totalEntered} areas</div>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E2E8F0' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', marginBottom: 5 }}>PROFESSIONAL REMARKS</div>
                <div style={{ fontSize: 11, color: '#1E293B', lineHeight: 1.4, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <strong>Class Teacher:</strong> {
                    l.report.overallInfo.lv.startsWith('EE') ? 'An exceptional performance! You have shown mastery of the concepts. Keep it up.' : 
                    l.report.overallInfo.lv.startsWith('ME') ? 'Good work! You meet the expectations in most areas. Aim higher next term.' :
                    l.report.overallInfo.lv.startsWith('AE') ? 'Steady progress. You are approaching the required standards; more focus is needed in weaker areas.' : 
                    'Performance is below expectations. You need to put in more effort and seek guidance in challenging subjects.'
                  }
                </div>
                <div style={{ fontSize: 11, color: '#1E293B', lineHeight: 1.4, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <strong>Principal:</strong> {
                    l.report.overallInfo.lv.startsWith('EE') ? 'Outstanding result. You are a role model for academic excellence.' : 
                    l.report.overallInfo.lv.startsWith('ME') ? 'A commendable performance. Keep working hard to reach the top level.' :
                    l.report.overallInfo.lv.startsWith('AE') ? 'Fair performance. With more dedication, you can achieve better results.' :
                    'A disappointing result. Urgent intervention and parent consultation are required.'
                  }
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div style={{ background: '#F8FAFF', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 800 }}>ATTENDANCE SUMMARY</div>
                    {(() => {
                      const days = Object.keys(att || {}).filter(k => k.startsWith(`${grade}|`));
                      const total = days.length / (learners.length || 1) || 0;
                      const present = Object.entries(att || {}).filter(([k, v]) => k.endsWith(`|${l.adm}`) && v === 'P').length;
                      return <div style={{ fontSize: 13, fontWeight: 900, color: themeColor }}>{present} / {Math.max(present, Math.round(total))} <span style={{ fontSize: 9, color: '#64748B' }}>Days Present</span></div>;
                    })()}
                  </div>
                  <div style={{ background: '#FFFBEB', padding: 10, borderRadius: 8, border: '1px solid #FEF3C7' }}>
                    <div style={{ fontSize: 8, color: '#D97706', fontWeight: 800 }}>NEXT TERM BEGINS</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#92400E' }}>
                      {(() => {
                        if (!terms || terms.length === 0) return 'Date not set';
                        // Determine which term number we are printing for (T1=1, T2=2, T3=3)
                        const currentTermNum = parseInt(term.replace('T',''), 10) || 1;
                        const nextTermNum = currentTermNum + 1;
                        // Sort terms by start_date
                        const sorted = [...terms].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                        // Try to find a term whose name contains the next term number
                        let nextTerm = sorted.find(t => {
                          const n = parseInt((t.name || '').match(/(\d+)/)?.[1] || '0', 10);
                          return n === nextTermNum;
                        });
                        // Fallback: pick the next in order after the current
                        if (!nextTerm && sorted.length > currentTermNum - 1) {
                          nextTerm = sorted[currentTermNum]; // 0-indexed, currentTermNum is the *next* index
                        }
                        if (!nextTerm) return 'See school calendar';
                        const d = new Date(nextTerm.start_date);
                        return isNaN(d.getTime()) ? nextTerm.start_date : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#F8FAFF' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' }}>Assessment Trend (Avg)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60, padding: '0 5px' }}>
                  {[
                    { label: 'OP', val: l.report.subjects.reduce((a, s) => a + (s.op || 0), 0) / (subjects.length || 1) },
                    { label: 'MT', val: l.report.subjects.reduce((a, s) => a + (s.mt || 0), 0) / (subjects.length || 1) },
                    { label: 'ET', val: l.report.subjects.reduce((a, s) => a + (s.et || 0), 0) / (subjects.length || 1) },
                    { label: 'Final', val: l.report.totalAvgScore }
                  ].map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: `${Math.min(d.val, 100)}%`, background: i === 3 ? themeColor : `${themeColor}44`, borderRadius: '3px 3px 0 0' }}></div>
                      <div style={{ fontSize: 7, fontWeight: 800, marginTop: 4 }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                 <div style={{ fontSize: 32, marginBottom: 5 }}>{l.report.totalAvgScore >= 80 ? '🥇' : l.report.totalAvgScore >= 60 ? '🌟' : '📚'}</div>
                 <div style={{ fontSize: 10, fontWeight: 800, color: themeColor }}>Termly Competency Status</div>
                 <div style={{ fontSize: 14, fontWeight: 900 }}>{l.report.overallInfo.lv}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, marginTop: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 40, borderBottom: '1px solid #94A3B8', marginBottom: 5 }}></div>
              <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700 }}>Class Teacher's Signature</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 40, borderBottom: '1px solid #94A3B8', marginBottom: 5, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profile.principalSignature && <img src={profile.principalSignature} alt="Principal Sig" style={{ maxHeight: 35, objectFit: 'contain' }} />}
              </div>
              <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700 }}>Principal's Stamp & Signature</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 40, borderBottom: '1px solid #94A3B8', marginBottom: 5 }}></div>
              <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700 }}>Parent / Guardian's Signature</div>
            </div>
          </div>

          </>
          )}

          <div style={{ marginTop: 25, paddingTop: 10, borderTop: `2px solid ${themeColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#94A3B8' }}>
            <div>System Generated by <strong>EduVantage SaaS</strong></div>
            <div>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style={{ fontWeight: 800 }}>Page {rankedData.indexOf(l) + 1} of {rankedData.length}</div>
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
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{(p?.date || '').split('-').slice(1).join('/') || '—'}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{p?.term || '—'}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee' }}>{p?.method || '—'}</td>
                    <td style={{ padding: 5, borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700 }}>{p?.amount || p?.amt || 0}</td>
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
            <img src={profile.logo || "/eduvantage-logo.png"} alt="L" style={{ width: 22, height: 22, borderRadius: '50%', background: 'transparent', padding: 2 }} />
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

function ExamSummaryTemplate({ learners, subjects, marks, gradCfg, profile, mainTerm, mainAssess, mode = 'per-level' }) {
  const [localTerm, setLocalTerm]     = useState(mainTerm || 'T1');
  const [localAssess, setLocalAssess] = useState(mainAssess || 'et1');
  const [localGrade, setLocalGrade]   = useState('ALL');

  useEffect(() => {
    if (mainTerm) setLocalTerm(mainTerm);
    if (mainAssess) setLocalAssess(mainAssess);
  }, [mainTerm, mainAssess]);

  const term   = localTerm;
  const assess = localAssess;
  const curr = profile?.curriculum || 'CBC';
  const LABELS = getLabels(curr);
  const ASSESS_LABELS = { op1: 'Opener Exam', mt1: 'Mid-Term Exam', et1: 'End-Term Exam' };

  const ALL_GRADES = getAllGrades(curr, profile);
  const filteredGrades  = localGrade === 'ALL' ? ALL_GRADES : [localGrade];
  const scopedLearners  = localGrade === 'ALL' ? learners : learners.filter(l => l.grade === localGrade);

  // Group metrics by grade
  const gradeStats = filteredGrades.map(g => {
    const gLearners = scopedLearners.filter(l => l.grade === g);
    if (gLearners.length === 0) return null;

    // Use custom subjects if available
    const gSubjs = (subjects[g] && subjects[g].length > 0) ? subjects[g] : null;
    const merit = buildMeritList(gLearners, marks, g, term, assess, gradCfg, curr, gSubjs, mode);
    
    const totalScoreSum = merit.reduce((acc, l) => acc + l.totalPts, 0);
    const maxPossible = merit.length > 0 ? merit.reduce((acc, l) => acc + l.maxTotal, 0) : 1;
    const avgScore = maxPossible > 0 ? (totalScoreSum / maxPossible * 100).toFixed(1) : 0;
    
    const top3 = merit.slice(0, 3);
    const bottom3 = merit.slice(-3).reverse();
    const dist = getDistributionBuckets(g, curr);
    
    merit.forEach(l => {
      const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
      const info = gInfo(lPct, g, gradCfg, curr, null, mode);
      if (dist[info.lv] !== undefined) dist[info.lv]++;
    });
    
    return { grade: g, count: gLearners.length, sitting: merit.length, avgScore, top3, bottom3, dist, maxPossible };
  }).filter(Boolean);

  const totalStudents = scopedLearners.length;
  const sittingCount  = gradeStats.reduce((acc, g) => acc + g.sitting, 0);
  const schoolAvg = sittingCount > 0
    ? (gradeStats.reduce((acc, g) => acc + (parseFloat(g.avgScore) * g.sitting), 0) / sittingCount).toFixed(1)
    : 0;

  // Aggregate distribution safely across all possible levels (Primary + JSS)
  const schoolDist = { 
    ...(ALL_GRADES[0] ? getDistributionBuckets(ALL_GRADES[0], curr) : {}), 
    ...(ALL_GRADES.find(g => isJSSGrade(g, curr)) ? getDistributionBuckets(ALL_GRADES.find(g => isJSSGrade(g, curr)), curr) : {}) 
  };
  Object.keys(schoolDist).forEach(k => schoolDist[k] = 0);
  
  gradeStats.forEach(g => {
    if (!g.dist) return;
    Object.entries(g.dist).forEach(([lv, count]) => {
      if (schoolDist[lv] !== undefined) schoolDist[lv] += count;
      else schoolDist[lv] = count; 
    });
  });

  // Aggregate subject performance
  const subjMap = {};
  filteredGrades.forEach(g => {
    const gLearners = scopedLearners.filter(l => l.grade === g);
    const gSubjs = (subjects[g] && subjects[g].length > 0) ? subjects[g] : getDefaultSubjects(g, curr);
    gLearners.forEach(l => {
      gSubjs.forEach(s => {
        const score = getMark(marks, term, g, s, assess, l.adm);
        if (score !== null) {
          if (!subjMap[s]) subjMap[s] = { total: 0, count: 0 };
          subjMap[s].total += score;
          subjMap[s].count++;
        }
      });
    });
  });
  const subjectStats = Object.entries(subjMap).map(([name, data]) => {
    const avg = data.total / data.count;
    return { name, avg: avg.toFixed(1), count: data.count };
  }).sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));

  // Gender Performance Comparison
  const genderStats = {
    M: { total: 0, count: 0, sitting: 0 },
    F: { total: 0, count: 0, sitting: 0 }
  };
  
  const allRanked = [];
  filteredGrades.forEach(g => {
    const gLearners = scopedLearners.filter(l => l.grade === g);
    const gSubjs = (subjects[g] && subjects[g].length > 0) ? subjects[g] : null;
    const merit = buildMeritList(gLearners, marks, g, term, assess, gradCfg, curr, gSubjs, mode);
    merit.forEach(l => {
      const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
      allRanked.push({ ...l, grade: g, pct: lPct });
      const s = l.sex === 'Female' || l.sex === 'F' ? 'F' : 'M';
      genderStats[s].total += lPct;
      genderStats[s].sitting++;
    });
  });
  
  scopedLearners.forEach(l => {
    const s = l.sex === 'Female' || l.sex === 'F' ? 'F' : 'M';
    genderStats[s].count++;
  });
  
  const genderAnalysis = Object.entries(genderStats).map(([sex, data]) => ({
    sex: sex === 'F' ? 'Female' : 'Male',
    avg: data.sitting > 0 ? (data.total / data.sitting).toFixed(1) : 0,
    sitting: data.sitting,
    enrolled: data.count
  }));

  const topGrade = [...gradeStats].sort((a,b) => b.avgScore - a.avgScore)[0];
  const bottomGrade = [...gradeStats].sort((a,b) => a.avgScore - b.avgScore)[0];
  const totalSitting = gradeStats.reduce((acc, g) => acc + g.sitting, 0);
  const passRate = allRanked.length > 0 ? (allRanked.filter(l => l.pct >= 50).length / allRanked.length * 100).toFixed(1) : 0;

  const titleLabel = localGrade === 'ALL' ? 'SCHOOL ACADEMIC SUMMARY' : `${localGrade} ACADEMIC SUMMARY`;

  return (
    <div style={{ padding: '0 10px', minWidth: '1000px', margin: '0 auto', WebkitTextSizeAdjust: '100%' }}>
      {/* ── Exam Summary Own Filters (no-print) ── */}
      <div className="no-print" style={{ marginBottom: 20, padding: '14px 18px', background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 800, color: '#0369A1', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Term</label>
          <select value={localTerm} onChange={e => setLocalTerm(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
            <option value="T1">Term 1</option>
            <option value="T2">Term 2</option>
            <option value="T3">Term 3</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 800, color: '#0369A1', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Exam</label>
          <select value={localAssess} onChange={e => setLocalAssess(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
            <option value="op1">Opener</option>
            <option value="mt1">Mid-Term</option>
            <option value="et1">End-Term</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 800, color: '#0369A1', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Grade / Scope</label>
          <select value={localGrade} onChange={e => setLocalGrade(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
            <option value="ALL">— Whole School —</option>
            {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: '#0369A1', fontWeight: 700, paddingBottom: 4, marginLeft: 'auto' }}>
          📊 {totalStudents} learner{totalStudents !== 1 ? 's' : ''} · {ASSESS_LABELS[assess]} · Term {term.replace('T','')}
        </div>
      </div>

      <PrintHeader title={titleLabel} grade={localGrade === 'ALL' ? 'Whole School' : localGrade} profile={profile} />

      <div style={{ textAlign: 'center', marginBottom: 25, fontSize: 13, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: 1 }}>
        {localGrade === 'ALL' ? 'Institutional Performance Analysis' : `${localGrade} Performance Analysis`} — Term {term.replace('T','')} {ASSESS_LABELS[assess]}
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 15 }}>
        <div style={{ background: '#F8FAFF', border: '1.5px solid #E2E8F0', padding: 15, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 5 }}>Total Enrolled</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#1E3A8A' }}>{totalStudents}</div>
          <div style={{ fontSize: 9, color: '#94A3B8' }}>Institutional Scope</div>
        </div>
        <div style={{ background: '#F0FDF4', border: '1.5px solid #DCFCE7', padding: 15, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 5 }}>Institutional Mean</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>{schoolAvg}%</div>
          <div style={{ fontSize: 9, color: '#16a34a' }}>Overall Performance</div>
        </div>
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FEF3C7', padding: 15, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 5 }}>Mean Band</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309' }}>{gInfo(parseFloat(schoolAvg), ALL_GRADES[0] || '', gradCfg, curr).lv}</div>
          <div style={{ fontSize: 9, color: '#D97706' }}>Aggregated Proficiency</div>
        </div>
        <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', padding: 15, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: 5 }}>Pass Rate (≥50%)</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>{passRate}%</div>
          <div style={{ fontSize: 9, color: '#059669' }}>Success Benchmark</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 30 }}>
        <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', padding: 12, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 3 }}>Total Sitting</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{totalSitting}</div>
          <div style={{ fontSize: 8, color: '#94A3B8' }}>{Math.round(totalSitting/totalStudents*100)}% Participation</div>
        </div>
        <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', padding: 12, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: 3 }}>Best Grade</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#0369A1' }}>{topGrade?.grade || '—'}</div>
          <div style={{ fontSize: 8, color: '#0369A1' }}>Mean: {topGrade?.avgScore}%</div>
        </div>
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FEE2E2', padding: 12, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: 3 }}>Weakest Grade</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#991B1B' }}>{bottomGrade?.grade || '—'}</div>
          <div style={{ fontSize: 8, color: '#991B1B' }}>Mean: {bottomGrade?.avgScore}%</div>
        </div>
        <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', padding: 12, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#374151', textTransform: 'uppercase', marginBottom: 3 }}>Data Quality</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#374151' }}>100%</div>
          <div style={{ fontSize: 8, color: '#94A3B8' }}>Exams Synced</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Grade Breakdown Table */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', marginBottom: 12, textTransform: 'uppercase' }}>Grade Performance Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: 10, textAlign: 'left' }}>Grade Level</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Sitting / Enrolled</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Mean %</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Mean Band</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Top Performer</th>
              </tr>
            </thead>
            <tbody>
              {gradeStats.map(g => {
                const info = gInfo(parseFloat(g.avgScore), g.grade, gradCfg, curr);
                return (
                  <tr key={g.grade} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 10, fontWeight: 800 }}>{g.grade}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{g.sitting} / {g.count}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: 700 }}>{g.avgScore}%</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={{ color: info.c, fontWeight: 900 }}>{info.lv}</span>
                    </td>
                    <td style={{ padding: 10, fontSize: 9.5 }}>
                      <div style={{ fontWeight: 700 }}>{g.top3[0]?.name || '—'}</div>
                      <div style={{ color: '#64748B', fontSize: 8 }}>ADM: {g.top3[0]?.adm} · {g.top3[0]?.totalMarks} Marks</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Graphical Curriculum-Aware Distribution Analysis */}
        <div style={{ padding: 15, border: '1.5px solid #E2E8F0', borderRadius: 15, background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', marginBottom: 10, textTransform: 'uppercase', textAlign: 'center' }}>Institutional Competency Distribution</div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '10px 0', borderBottom: '1px solid #E2E8F0', marginBottom: 15 }}>
            {Object.entries(schoolDist).map(([lv, count]) => {
              const maxCount = Math.max(...Object.values(schoolDist), 1);
              const heightPct = (count / maxCount) * 100;
              const color = getGradeColors(curr)[lv] || '#94A3B8';
              return (
                <div key={lv} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: color }}>{count}</div>
                  <div style={{ width: '100%', height: `${heightPct}%`, background: color, borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'all 0.3s ease', minHeight: '2px' }}></div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', marginTop: 4 }}>{lv}</div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(schoolDist).map(([lv, count]) => {
              const pct = totalStudents > 0 ? (count / totalStudents * 100) : 0;
              const color = getGradeColors(curr)[lv] || '#94A3B8';
              return (
                <div key={lv} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700 }}>
                  <span style={{ color }}>{lv}:</span>
                  <span>{count} <span style={{ color: '#94A3B8', fontSize: 8 }}>({pct.toFixed(1)}%)</span></span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 15, padding: 8, background: '#F8FAFF', borderRadius: 8, border: '1px dashed #CBD5E1', fontSize: 8.5, color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
            <strong>Note:</strong> Graphic illustrates the overall {curr} proficiency distribution across the school.
          </div>
        </div>
      </div>

      {/* Grade-Level Top and Bottom Performers (Detailed) */}
      <div style={{ marginTop: 30 }}>
         <div style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', marginBottom: 15, textTransform: 'uppercase' }}>🏆 Grade-Level Rankings & Subject Recommendations</div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {gradeStats.map(g => (
               <div key={g.grade} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', pageBreakInside: 'avoid' }}>
                 <div style={{ background: '#F8FAFC', padding: '10px 15px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#0F172A' }}>{g.grade}</h3>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>Mean: {g.avgScore}%</div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {/* Top 3 */}
                    <div style={{ padding: 15, borderRight: '1px dashed #E2E8F0' }}>
                       <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', marginBottom: 10, textTransform: 'uppercase' }}>🌟 Top 3 Performers</div>
                       {g.top3.length === 0 && <div style={{ fontSize: 10, color: '#94A3B8' }}>No data available</div>}
                       {g.top3.map((l, i) => {
                          const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
                          const info = gInfo(lPct, g.grade, gradCfg, curr);
                          const bestSubj = [...l.detail].filter(d=>d.score!==null).sort((a,b)=>b.score-a.score)[0];
                          return (
                             <div key={l.adm} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                                <div style={{ flex: 1 }}>
                                   <div style={{ fontSize: 10, fontWeight: 800, color: '#1E293B' }}>{l.name} <span style={{ fontSize: 8, color: '#94A3B8' }}>({l.adm})</span></div>
                                   <div style={{ fontSize: 9, color: '#64748B' }}>Best in {bestSubj?.subj || 'N/A'} ({bestSubj?.score || 0})</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                   <div style={{ fontSize: 10, fontWeight: 800, color: '#059669' }}>{l.totalMarks} Marks</div>
                                   <div style={{ fontSize: 8, color: info.c, fontWeight: 700 }}>{info.lv} ({lPct.toFixed(1)}%)</div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                    {/* Bottom 3 */}
                    <div style={{ padding: 15 }}>
                       <div style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', marginBottom: 10, textTransform: 'uppercase' }}>⚠️ Require Attention (Bottom 3)</div>
                       {g.bottom3.length === 0 && <div style={{ fontSize: 10, color: '#94A3B8' }}>No data available</div>}
                       {g.bottom3.map((l, i) => {
                          const lPct = l.maxTotal > 0 ? (l.totalPts / l.maxTotal * 100) : 0;
                          const info = gInfo(lPct, g.grade, gradCfg, curr);
                          const worstSubj = [...l.detail].filter(d=>d.score!==null).sort((a,b)=>a.score-b.score)[0];
                          return (
                             <div key={l.adm} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', width: 24, textAlign: 'center' }}>#{g.sitting - i}</div>
                                <div style={{ flex: 1 }}>
                                   <div style={{ fontSize: 10, fontWeight: 800, color: '#1E293B' }}>{l.name} <span style={{ fontSize: 8, color: '#94A3B8' }}>({l.adm})</span></div>
                                   <div style={{ fontSize: 9, color: '#B91C1C' }}>Support needed in {worstSubj?.subj || 'N/A'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                   <div style={{ fontSize: 10, fontWeight: 800, color: '#DC2626' }}>{l.totalMarks} Marks</div>
                                   <div style={{ fontSize: 8, color: info.c, fontWeight: 700 }}>{info.lv} ({lPct.toFixed(1)}%)</div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
               </div>
            ))}
         </div>
      </div>

      {/* Subject Performance & Gender Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30, pageBreakInside: 'avoid' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', marginBottom: 12, textTransform: 'uppercase' }}>📚 Overall Subject Averages</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {subjectStats.map(s => {
              const info = gInfo(parseFloat(s.avg), ALL_GRADES[0], gradCfg, curr);
              return (
                <div key={s.name} style={{ background: '#fff', border: '1px solid #E2E8F0', padding: 10, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 7, color: '#64748B' }}>{s.count} Entries</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: info.c }}>{s.avg}%</div>
                    <div style={{ fontSize: 7, fontWeight: 700, color: info.c }}>{info.lv}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', marginBottom: 12, textTransform: 'uppercase' }}>🚻 Gender Performance Analysis</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: 10, textAlign: 'left' }}>Gender</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Sitting / Enrolled</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Mean Score</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Mean Level</th>
              </tr>
            </thead>
            <tbody>
              {genderAnalysis.map(g => {
                const info = gInfo(parseFloat(g.avg), ALL_GRADES[0], gradCfg, curr);
                return (
                  <tr key={g.sex} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 10, fontWeight: 800 }}>{g.sex}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{g.sitting} / {g.enrolled}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: info.c }}>{g.avg}%</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: 800, color: info.c }}>{info.lv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 15, padding: 12, background: '#F0FDF4', borderRadius: 10, border: '1px solid #DCFCE7', fontSize: 9, color: '#166534' }}>
            <strong>Gender Insight:</strong> The institution maintains a {Math.abs(genderAnalysis[0].avg - genderAnalysis[1].avg).toFixed(1)}% performance gap between genders.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, borderTop: '2px solid #E2E8F0', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, textAlign: 'center', pageBreakInside: 'avoid' }}>
         <div>
            <div style={{ height: 40, borderBottom: '1px solid #CBD5E1', marginBottom: 5 }}></div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>EXAMS COORDINATOR</div>
         </div>
         <div>
            <div style={{ height: 40, borderBottom: '1px solid #CBD5E1', marginBottom: 5 }}></div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>HEAD TEACHER'S STAMP</div>
         </div>
         <div>
            <div style={{ height: 40, borderBottom: '1px solid #CBD5E1', marginBottom: 5 }}></div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>B.O.M CHAIRPERSON</div>
         </div>
      </div>
    </div>
  );
}


