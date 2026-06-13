'use client';
/**
 * app/merit-list/page.js — Merit List (Top Learners, CBC-based)
 *
 * Ranks learners by total CBE points per grade.
 * Features:
 *   • Filter by grade, term, assessment
 *   • Gold/Silver/Bronze medals for top 3
 *   • Export / print class list (landscape)
 *   • Navigation to individual learner profile
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildMeritList, fmtK, JSS, SENIOR, gInfo, getCurriculum, getDistributionBuckets, getGradeColors, shouldRankByMarks, isLevelEnabled, mergeAssessments } from '@/lib/cbe';
import { usePersistedState } from '@/components/TabState';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { useSchoolProfile } from '@/lib/school-profile';
import { useProfile } from '@/app/PortalShell';
import PrintHeader from '@/components/PrintHeader';
import { getLabels } from '@/lib/cbe';
import ViewLearnerModal from '@/components/ViewLearnerModal';

const ASSESS_LABELS = { op1:'Opener Exam', mt1:'Mid-Term Exam', et1:'End-Term Exam' };


const ASSESSMENTS = [
  { key: 'op1', label: 'Opener'   },
  { key: 'mt1', label: 'Mid-Term' },
  { key: 'et1', label: 'End-Term' },
];

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function MeritListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [marks,    setMarks]    = useState({});
  const [gradCfg,  setGradCfg]  = useState(null);
  const [subjCfg,  setSubjCfg]  = useState({});
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);
  const [modal,    setModal]    = useState(null);
  const [stream,   setStream]   = useState('');  // '' = all streams (whole grade)
  const [customExams, setCustomExams] = useState([]);

  useEffect(() => setMounted(true), []);

  const [grade,  setGrade]  = usePersistedState('paav_grades_grade',  'GRADE 1');
  const [term,   setTerm]   = useState('T1');
  const [assess, setAssess] = useState('mt1');
  const { profile: ctxProfile } = useProfile() || {};
  const localProfile = useSchoolProfile();
  const school = ctxProfile && Object.keys(ctxProfile).length > 0 ? ctxProfile : localProfile;

  const curr = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  const LABELS = getLabels(school?.curriculum || 'CBC');
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const ALL_GRADES = (curr.ALL_GRADES || []).filter(g => isLevelEnabled(g, school, school?.curriculum));
  const ASSESSMENTS = mergeAssessments(curr.ASSESSMENT_TYPES || [], customExams);

  useEffect(() => {
    if (!grade && ALL_GRADES.length > 0) {
      setGrade(ALL_GRADES[0]);
    }
  }, [ALL_GRADES, grade, setGrade]);

  // Reset stream when grade changes
  useEffect(() => { setStream(''); }, [grade]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav6_learners',
          'paav6_marks',
          'paav8_grad',
          'paav8_subj',
          'paav_school_profile',
          'paav_custom_exams'
        ])
      ]);

      if (!u) { router.push('/'); return; }
      setUser(u);

      setLearners(db.paav6_learners || []);
      setMarks(db.paav6_marks || {});
      setGradCfg(db.paav8_grad || null);
      setSubjCfg(db.paav8_subj || {});
      setCustomExams(db.paav_custom_exams || []);
    } catch (e) {
      console.error('Merit list load error:', e);
      setError('Connection timed out. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const subjects = useMemo(() => {
    let list = (subjCfg && subjCfg[grade] !== undefined)
      ? subjCfg[grade]
      : (curr.DEFAULT_SUBJECTS?.[grade] || []);
    // Filter out any null/undefined/empty subjects that might have crept in
    return list.filter(s => s && s.trim());
  }, [subjCfg, grade, curr]);


  /* ── Streams available for the selected grade ── */
  const availableStreams = useMemo(() => {
    const raw = learners
      .filter(l => l.grade === grade)
      .map(l => (l.stream || '').trim())
      .filter(Boolean);
    return [...new Set(raw)].sort();
  }, [learners, grade]);

  /* ── Build ranked list (memoized so dropdowns trigger re-render) ── */
  const rankedSource = useMemo(() => {
    if (loading) return [];
    // Pre-filter by stream when one is selected
    const base = stream
      ? learners.filter(l => l.grade === grade && (l.stream || '').trim() === stream)
      : learners.filter(l => l.grade === grade);
    return buildMeritList(base, marks, grade, term, assess, gradCfg, school?.curriculum || 'CBC', subjects);
  }, [learners, marks, grade, stream, term, assess, gradCfg, loading, school?.curriculum, subjects]);

  const ranked = rankedSource;
  const max = curr.maxPts ? curr.maxPts(grade, subjects) : 0;

  const colStats = useMemo(() => {
    return subjects.map(s => {
      let sum = 0;
      let count = 0;
      ranked.forEach(l => {
        const detail = l.detail.find(d => d.subj === s);
        if (detail && detail.score !== null) {
          sum += detail.score;
          count++;
        }
      });
      const avgScore = count > 0 ? Number((sum / count).toFixed(2)) : null;
      const avgInfo = avgScore !== null ? gInfo(avgScore, grade, gradCfg, school?.curriculum || 'CBC') : null;
      return { avgScore, avgInfo };
    });
  }, [ranked, subjects, grade, gradCfg, school?.curriculum]);

  const subjectPerformanceRanks = useMemo(() => {
    const valid = colStats
      .map((s, i) => ({ index: i, avgScore: s.avgScore }))
      .filter(s => s.avgScore !== null)
      .sort((a, b) => b.avgScore - a.avgScore);
    const ranks = new Array(colStats.length).fill(null);
    let r = 1;
    for (let i = 0; i < valid.length; i++) {
      if (i > 0 && valid[i].avgScore < valid[i-1].avgScore) r = i + 1;
      ranks[valid[i].index] = r;
    }
    return ranks;
  }, [colStats]);

  const totalPtsSum = ranked.reduce((acc, l) => acc + l.totalPts, 0);
  const totalAvgPts = ranked.length > 0 ? Number((totalPtsSum / ranked.length).toFixed(2)) : 0;
  const avgPct = ranked.length > 0 && max > 0 ? Number(((totalAvgPts / max) * 100).toFixed(2)) : 0;
  const totalMarksSum = ranked.reduce((acc, l) => acc + l.detail.reduce((s,d)=>s+(d.score||0),0), 0);
  const totalAvgMarks = ranked.length > 0 ? Number((totalMarksSum / ranked.length).toFixed(2)) : 0;
  
  const overallLevel = max > 0 ? gInfo(avgPct, grade, gradCfg, school?.curriculum || 'CBC') : { lv: '—' };
  
  const { distribution, subjectDistribution } = useMemo(() => {
    const buckets = getDistributionBuckets(grade, school?.curriculum || 'CBC');
    const counts = { ...buckets };
    const subjCounts = {};
    subjects.forEach(s => {
      subjCounts[s] = { ...buckets };
    });

    ranked.forEach(l => {
      // Overall distribution (based on points/percentage)
      const pct = max ? Number(((l.totalPts/max)*100).toFixed(2)) : 0;
      const inf = gInfo(pct, grade, gradCfg, school?.curriculum || 'CBC');
      if (inf && counts[inf.lv] !== undefined) {
        counts[inf.lv]++;
      }

      // Subject-wise distribution
      l.detail.forEach(d => {
        if (d.score !== null && subjCounts[d.subj]) {
          if (subjCounts[d.subj][d.lv] !== undefined) {
            subjCounts[d.subj][d.lv]++;
          }
        }
      });
    });

    return { distribution: counts, subjectDistribution: subjCounts };
  }, [ranked, max, grade, gradCfg, school?.curriculum, subjects]);


  if (!mounted || loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading merit list…</div>;
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  return (
    <div className="page on">
      <PrintHeader />
      <div className="page-hdr">
        <div>
          <h2>🏆 {school.name} {LABELS.assessment} Rankings</h2>
          <p>
            {curr.name} {LABELS.grades} — ranked by total points ·{' '}
            <span style={{fontWeight:700,color:'#8B1A1A'}}>{ASSESSMENTS.find(a=>a.key===assess)?.label}</span>
            {stream && <span style={{fontWeight:700,color:'#0369A1',marginLeft:8}}>· Stream {stream}</span>}
          </p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm no-print" onClick={() => {
            const style = document.createElement('style');
            style.innerHTML = '@page { size: A4 landscape; margin: 8mm; }';
            document.head.appendChild(style);
            document.body.classList.add('print-landscape');
            setTimeout(() => {
              window.print();
              document.body.classList.remove('print-landscape');
              style.remove();
            }, 150);
          }}>🖨️ Print Landscape</button>
        </div>
      </div>

      {/* ── Filters ── */}
      {/* ── Print-Only Summary ── */}
      <div className="print-only" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, border: '2px solid #000', padding: 15, borderRadius: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Sitting Students</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{ranked.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Mean Marks</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{totalAvgMarks}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Mean Points</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{totalAvgPts}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Mean Grade</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: overallLevel?.c }}>{overallLevel?.lv}</div>
          </div>
          
          <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Top Student</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{ranked[0]?.name || '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>{ranked[0]?.totalMarks} Marks</div>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Bottom Student</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{ranked[ranked.length-1]?.name || '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{ranked[ranked.length-1]?.totalMarks} Marks</div>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Pass Rate (≥50%)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>
              {ranked.length > 0 ? (ranked.filter(l => (max ? (l.totalPts/max)*100 : 0) >= 50).length / ranked.length * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', fontWeight: 800 }}>Total Marks</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{totalMarksSum}</div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>{LABELS.grade}</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)}>
              {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{LABELS.assessment}</label>
            <select value={assess} onChange={e => setAssess(e.target.value)}>
              {ASSESSMENTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontSize: 12,
            color: 'var(--muted)', paddingBottom: 2 }}>
            {ranked.length} learner{ranked.length !== 1 ? 's' : ''} ranked
            {stream && <span style={{ marginLeft: 8, fontWeight: 700, color: '#0369A1' }}>· Stream {stream}</span>}
          </div>
        </div>
        {/* ── Stream toggle tabs (only for multi-stream grades) ── */}
        {availableStreams.length > 1 && (
          <div className="stream-toggle-row" style={{ borderTop: '1px solid var(--border)', padding: '10px 16px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginRight: 4, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>View by:</span>
            <button
              className={`tab-btn${!stream ? ' on' : ''}`}
              style={{ padding: '4px 14px', fontSize: 12 }}
              onClick={() => setStream('')}>
              🏫 All ({learners.filter(l => l.grade === grade).length})
            </button>
            {availableStreams.map(s => {
              const cnt = learners.filter(l => l.grade === grade && (l.stream || '').trim() === s).length;
              return (
                <button key={s}
                  className={`tab-btn${stream === s ? ' on' : ''}`}
                  style={{ padding: '4px 14px', fontSize: 12 }}
                  onClick={() => setStream(s)}>
                  🌊 {s} ({cnt})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
            No marks entered for {grade} — {term} — {assess} yet.
          </div>
        </div>
      ) : (
        <>
          {/* ── Top 3 podium ── */}
          {ranked.length >= 1 && (
            <div className="sg sg3" style={{ marginBottom: 18 }}>
              {ranked.slice(0, 3).map(l => {
                const overallPct = max ? Number(((l.totalPts/max)*100).toFixed(2)) : 0;
                const overallInfo = max ? gInfo(overallPct, grade, gradCfg, school?.curriculum || 'CBC') : null;
                return (
                  <div key={l.adm} className={`stat-card merit-rank-${l.rank}`}>
                    <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
                      <div style={{ fontSize: 32, marginBottom: 4 }}>{MEDALS[l.rank] || '🏅'}</div>
                      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 15,
                        color: 'var(--navy)' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Adm: {l.adm}</div>
                      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900,
                        color: l.rank === 1 ? '#B45309' : l.rank === 2 ? '#475569' : '#C2410C' }}>
                        {l.totalPts}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', marginBottom: 2 }}>
                        {l.detail.reduce((s,d)=>s+(d.score||0),0)} Marks
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>out of {max} pts</div>
                      <div style={{ display:'flex', gap:5, justifyContent:'center', flexWrap:'wrap' }}>
                        <span className="badge bg-blue">{overallPct}%</span>
                        {overallInfo && (
                          <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:800,
                            background:overallInfo.bg, color:overallInfo.c }}>{overallInfo.lv}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          {/* ── Full ranked table ── */}
          <div className="panel">
            <div className="panel-hdr">
              <h3>
                📋 Full Rankings — {grade}{stream ? ` · Stream ${stream}` : ' · All Streams'}
                {' '}· Term {term.replace('T','')} · {ASSESSMENTS.find(a=>a.key===assess)?.label}
              </h3>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9 }}>Rank</th>
                    <th style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9 }}>Adm</th>
                    <th style={{ textAlign: 'left', padding: '3px 4px', fontSize: 9 }}>Name</th>
                    {subjects.map(s => (
                      <th key={s} style={{ textAlign: 'center', fontSize: 8.5, padding: '3px 1px' }} title={s}>
                        {s.length > 5 ? s.slice(0,5)+'…' : s}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>Total Marks</th>
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>Total Pts</th>
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>Avg Pts</th>
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>Band</th>
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>/ {max}</th>
                    <th style={{ textAlign: 'center', color:'#8B1A1A', padding: '3px 2px', fontSize: 9 }}>%</th>
                    <th style={{ textAlign: 'center', color:'#0369A1', padding: '3px 2px', fontSize: 9 }}>VAP</th>
                    <th style={{ padding: '3px 2px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(l => {
                    const lPct = max ? Number(((l.totalPts/max)*100).toFixed(2)) : 0;
                    const lInfo = max ? gInfo(lPct, grade, gradCfg, school?.curriculum || 'CBC') : { lv: '—' };
                    return (
                      <tr key={l.adm}
                        className={l.rank <= 3 ? `merit-rank-${l.rank}` : ''}
                        style={{ transition: 'background .15s' }}>
                        <td style={{ padding: '2px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 12,
                              color: l.rank === 1 ? '#B45309' : l.rank === 2 ? '#475569'
                                   : l.rank === 3 ? '#C2410C' : 'var(--navy)' }}>
                              {MEDALS[l.rank] || `#${l.rank}`}
                            </span>
                            <button className="btn btn-ghost btn-sm no-print" title="View Learner"
                              style={{ padding: '1px 4px', fontSize: 12 }}
                              onClick={() => setModal({ type: 'view_learner', learner: l })}>
                              👁
                            </button>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 11, padding: '2px' }}>{l.adm}</td>
                        <td style={{ fontWeight: 600, fontSize: 12, padding: '2px 4px' }}>{l.name}</td>
                        {l.detail.map(d => (
                          <td key={d.subj} style={{ textAlign: 'center', padding: '1px' }}>
                            {d.score !== null ? (
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                                <span style={{ fontWeight:800, fontSize:11.5 }}>{d.score}</span>
                                <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  <span style={{ padding:'0.5px 4px', borderRadius:8, fontSize:8, fontWeight:900, background:d.bg||'#eee', color:d.c||'#333' }}>
                                    {d.lv}
                                  </span>
                                  {d.sRank && (
                                    <span style={{ fontSize: 7.5, fontWeight: 800, color: '#64748B' }}>No.{d.sRank}</span>
                                  )}
                                </span>
                              </div>
                            ) : '—'}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#059669', padding: '2px' }}>
                          {l.detail.reduce((s,d)=>s+(d.score||0),0)}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 12,
                          color: 'var(--navy)', padding: '2px' }}>
                          {l.totalPts}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 11.5, color: '#0369A1', padding: '2px' }}>
                          {l.enteredCount > 0 ? (l.totalPts / l.enteredCount).toFixed(2) : '0'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '2px' }}>
                           <span style={{ padding:'1.5px 6px', borderRadius:3, fontSize:10, fontWeight:900, background:lInfo.bg, color:lInfo.c }}>
                             {lInfo.lv}
                           </span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10, padding: '2px' }}>
                          {max}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 11,
                          color: l.totalPts/max >= 0.5 ? 'var(--green)' : 'var(--red)', padding: '2px' }}>
                          {lPct}%
                        </td>
                        <td style={{ textAlign: 'center', padding: '2px' }}>
                        {l.vap !== 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: 16, color: l.vap > 0 ? 'var(--green)' : 'var(--red)' }}>
                              {l.vap > 0 ? '↗️' : '↘️'}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 900, color: l.vap > 0 ? 'var(--green)' : 'var(--red)' }}>
                              {l.vap > 0 ? `+${l.vap}` : l.vap}
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--muted)', fontSize: 10 }}>—</span>}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                  {ranked.length > 0 && (
                    <>
                      <tr style={{ background: '#f0fdf4', borderTop: '2px solid #000' }}>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>TOTAL MARKS</td>
                        {colStats.map((stat, i) => {
                          const totalSubjMarks = ranked.reduce((acc, l) => {
                            const d = l.detail.find(x => x.subj === subjects[i]);
                            return acc + (d && d.score !== null ? d.score : 0);
                          }, 0);
                          return (
                            <td key={i} style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>
                              {totalSubjMarks}
                            </td>
                          );
                        })}
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>{totalMarksSum}</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>{totalPtsSum}</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>{(totalPtsSum / (ranked.length * (subjects.length || 1))).toFixed(2)}</td>
                        <td colSpan={4} style={{ border: '1px solid #000' }}></td>
                      </tr>
                      <tr style={{ background: '#f9f9f9', borderTop: '1px solid #000' }}>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>AVERAGE SCORE</td>
                        {colStats.map((stat, i) => (
                          <td key={i} style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>
                            {stat.avgScore !== null ? stat.avgScore : '—'}
                          </td>
                        ))}
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>{totalAvgMarks}</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>{totalAvgPts}</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>{(totalAvgPts / (subjects.length || 1)).toFixed(2)}</td>
                        <td style={{ padding: 6, textAlign: 'center', border: '1px solid #000' }}>—</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>{avgPct}%</td>
                        <td style={{ border: '1px solid #000' }}></td>
                      </tr>
                      <tr style={{ background: '#f9f9f9' }}>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>AVERAGE LEVEL</td>
                        {colStats.map((stat, i) => (
                          <td key={i} style={{ padding: 6, textAlign: 'center', border: '1px solid #000' }}>
                            {stat.avgInfo ? <span style={{ color: '#000', fontWeight: 800, fontSize: 10 }}>{stat.avgInfo.lv}</span> : '—'}
                          </td>
                        ))}
                        <td colSpan={6} style={{ border: '1px solid #000' }}></td>
                      </tr>
                      <tr style={{ background: '#f9f9f9' }}>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>AVERAGE POINTS</td>
                        {colStats.map((stat, i) => (
                          <td key={i} style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>
                            {stat.avgInfo ? stat.avgInfo.pts : '—'}
                          </td>
                        ))}
                        <td style={{ padding: 6, textAlign: 'center', border: '1px solid #000' }}>—</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>{totalAvgPts}</td>
                        <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#000', border: '1px solid #000' }}>{(totalAvgPts / (subjects.length || 1)).toFixed(2)}</td>
                        <td colSpan={3} style={{ border: '1px solid #000' }}></td>
                      </tr>
                      <tr style={{ background: '#f0f9ff' }}>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>SUBJECT RANK</td>
                        {colStats.map((stat, i) => (
                          <td key={i} style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: 'var(--blue)', border: '1px solid #000' }}>
                            {subjectPerformanceRanks[i] ? `No. ${subjectPerformanceRanks[i]}` : '—'}
                          </td>
                        ))}
                        <td colSpan={6} style={{ border: '1px solid #000' }}></td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── DISTRIBUTION GRAPH (at bottom) ── */}
          <div className="panel" style={{ marginTop: 24, background: 'linear-gradient(to bottom right, #fff, #f8fafc)' }}>
            <div className="panel-body">
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 20, letterSpacing: 0.5, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>📊 Class Performance Distribution</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 40, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, padding: '0 10px' }}>
                  {Object.entries(distribution).map(([lv, count]) => {
                    const maxCount = Math.max(...Object.values(distribution), 1);
                    const barH = (count / maxCount) * 100;
                    const colors = getGradeColors(school?.curriculum || 'CBC');
                    return (
                      <div key={lv} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors[lv] || '#64748b' }}>{count}</div>
                        <div style={{ width: '100%', height: `${barH}%`, background: colors[lv] || '#cbd5e1', borderRadius: '4px 4px 0 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>{lv}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ borderLeft: '2px solid #f1f5f9', paddingLeft: 30 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' }}>Summary Counts</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {Object.entries(distribution).map(([lv, count]) => (
                      <div key={lv} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: '#64748b' }}>{lv}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Subject-wise Distribution Analysis ── */}
              <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject-wise Distribution Analysis</div>
                <div className="tbl-wrap">
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Subject</th>
                        {Object.keys(getDistributionBuckets(grade, school?.curriculum || 'CBC')).map(lv => (
                          <th key={lv} style={{ textAlign: 'center', padding: '6px 4px', fontSize: 10, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>{lv}</th>
                        ))}
                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 10, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(subjectDistribution).map(([subj, counts]) => (
                        <tr key={subj} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>{subj}</td>
                          {Object.values(counts).map((count, i) => (
                            <td key={i} style={{ textAlign: 'center', padding: '6px 4px', fontSize: 12, fontWeight: count > 0 ? 800 : 400, color: count > 0 ? 'var(--navy)' : '#cbd5e1' }}>
                              {count || '—'}
                            </td>
                          ))}
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: 12, background: '#f8fafc' }}>
                            {Object.values(counts).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {modal?.type === 'view_learner' && <ViewLearnerModal learner={modal.learner} onClose={() => setModal(null)} />}
      <style jsx global>{`
        @media print {
          .print-only { display: block !important; }
          .no-print { display: none !important; }
          tfoot { display: table-footer-group !important; position: static !important; }
          tfoot tr { background: #fff !important; color: #000 !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
