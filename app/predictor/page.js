'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCurriculum, calcLearnerPoints, promotionStatus, gInfo, getMark } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';
import {
  buildNationalForecast as computeNationalForecast,
  getExamForGrade as resolveExamForGrade,
  normalizeAssessments as normalizeExamAssessments,
  normalizeTerms as normalizeExamTerms,
} from '@/lib/national-exam-predictor';

export default function PredictorPage() {
  const router = useRouter();
  const { profile: school } = useProfile() || { profile: {} };
  const curriculumName = school?.curriculum || 'CBC';
  const curriculum = useMemo(() => getCurriculum(curriculumName, school?.levels), [curriculumName, school?.levels]);
  const labels = curriculum.LABELS || { grade: 'Grade', assessment: 'Assessment' };
  const ALL_GRADES = useMemo(() => curriculum.ALL_GRADES || [], [curriculum]);
  const curriculumTerms = useMemo(() => normalizeExamTerms(curriculum.TERMS), [curriculum]);
  const curriculumAssessments = useMemo(() => normalizeExamAssessments(curriculum.ASSESSMENT_TYPES), [curriculum]);

  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selGrade, setSelGrade] = useState('');
  const [selTerm, setSelTerm] = useState('T1');
  const [selAssess, setSelAssess] = useState('mt1');
  const [selLearner, setSelLearner] = useState(null);
  const [mode, setMode] = useState('continuous');
  const targetExamInfo = useMemo(() => resolveExamForGrade(selGrade, curriculumName), [selGrade, curriculumName]);

  useEffect(() => {
    if (!selGrade && ALL_GRADES.length > 0) {
      setSelGrade(ALL_GRADES[0]);
    }
  }, [ALL_GRADES, selGrade]);

  useEffect(() => {
    if (curriculumTerms.length && !curriculumTerms.some(term => term.id === selTerm)) {
      setSelTerm(curriculumTerms[0].id);
    }
  }, [curriculumTerms, selTerm]);

  useEffect(() => {
    if (curriculumAssessments.length && !curriculumAssessments.some(assessment => assessment.id === selAssess)) {
      setSelAssess(curriculumAssessments[0].id);
    }
  }, [curriculumAssessments, selAssess]);

  const load = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth');
      const auth = await authRes.json();
      if (!auth.ok || !auth.user || auth.user.role === 'parent') {
        router.push('/');
        return;
      }
      setUser(auth.user);

      const dbRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { type: 'get', key: 'paav6_learners' },
            { type: 'get', key: 'paav6_marks' },
            { type: 'get', key: 'paav8_grad' }
          ]
        })
      });
      const db = await dbRes.json();
      
      setLearners(db.results[0]?.value || []);
      setMarks(db.results[1]?.value || {});
      setGradCfg(db.results[2]?.value || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const subjects = useMemo(() => curriculum.DEFAULT_SUBJECTS?.[selGrade] || [], [curriculum, selGrade]);
  
  const gradeLearners = useMemo(() => {
    return learners.filter(l => l.grade === selGrade).map(l => {
      const pts = calcLearnerPoints(marks, l.adm, selGrade, selTerm, selAssess, subjects, gradCfg, curriculumName);
      const status = promotionStatus(pts.totalPts, pts.maxTotal);
      return { ...l, ...pts, status };
    }).filter(l => l.enteredCount > 0).sort((a, b) => b.totalPts - a.totalPts);
  }, [learners, selGrade, selTerm, selAssess, subjects, gradCfg, marks, curriculumName]);

  const stats = useMemo(() => ({
    promote: gradeLearners.filter(l => l.status === 'promote').length,
    review: gradeLearners.filter(l => l.status === 'review').length,
    retain: gradeLearners.filter(l => l.status === 'retain').length,
  }), [gradeLearners]);

  const nationalForecast = useMemo(() => {
    return computeNationalForecast({
      learners,
      marks,
      grade: selGrade,
      curriculum: curriculumName,
      subjects,
      terms: curriculumTerms,
      assessments: curriculumAssessments,
    });
  }, [learners, marks, selGrade, subjects, curriculumName, curriculumTerms, curriculumAssessments]);

  const learnerDetail = useMemo(() => {
    if (!selLearner) return null;
    const l = learners.find(x => x.adm === selLearner);
    if (!l) return null;

    // Subject trends
    const subTrends = subjects.map(s => {
      const assessData = curriculumAssessments.map(a => {
        const score = getMark(marks, selTerm, selGrade, s, a.id, l.adm);
        return { assess: a.label, score: score ?? 0 };
      });
      const currentScore = getMark(marks, selTerm, selGrade, s, selAssess, l.adm) || 0;
      const info = gInfo(currentScore, selGrade, gradCfg, curriculumName);
      return { subject: s, assessData, currentScore, level: info.lv, color: info.pts >= 3 ? 'var(--green)' : info.pts >= 2 ? 'var(--amber)' : 'var(--red)' };
    });

    // Overall trajectory
    const trajectory = curriculumAssessments.map(a => {
      const pts = calcLearnerPoints(marks, l.adm, selGrade, selTerm, a.id, subjects, gradCfg, curriculumName);
      return { assess: a.label, pct: Math.round((pts.totalPts / pts.maxTotal) * 100) };
    });

    return { ...l, subTrends, trajectory };
  }, [selLearner, learners, subjects, marks, selTerm, selGrade, selAssess, gradCfg, curriculumName, curriculumAssessments]);

  if (loading || !user) return <div className="page on"><LoadingSkeleton /></div>;

  return (
    <div className="page on" id="pg-predictor">
      <div className="page-hdr">
        <div>
          <h2>🎯 Performance Predictor</h2>
          <p>Detailed analysis, trajectory forecasting, and national exam readiness</p>
        </div>
        <div className="page-hdr-acts no-print">
          {mode === 'continuous' && selLearner && <button className="btn btn-ghost btn-sm" onClick={() => setSelLearner(null)}>← Back to List</button>}
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Analysis</button>
        </div>
      </div>

      <div className="tabs no-print" style={{ marginBottom: 18 }}>
        <button className={`tab-btn ${mode === 'continuous' ? 'on' : ''}`} onClick={() => { setMode('continuous'); setSelLearner(null); }}>Continuous Assessment</button>
        <button className={`tab-btn ${mode === 'national' ? 'on' : ''}`} onClick={() => { setMode('national'); setSelLearner(null); }}>National Exam Forecast</button>
      </div>

      <div className="panel no-print">
        <div className="panel-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{labels.grade}</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelLearner(null); }}>
              {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {mode === 'continuous' ? (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Term</label>
                <select value={selTerm} onChange={e => setSelTerm(e.target.value)}>
                  {curriculumTerms.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{labels.assessment || 'Assessment'}</label>
                <select value={selAssess} onChange={e => setSelAssess(e.target.value)}>
                  {curriculumAssessments.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Target Exam</label>
              <input value={`${targetExamInfo.name} · ${targetExamInfo.body}`} readOnly style={{ minWidth: 250, fontWeight: 800 }} />
            </div>
          )}
        </div>
      </div>

      {mode === 'national' ? (
        <NationalExamForecast forecast={nationalForecast} grade={selGrade} curriculum={curriculumName} onAnalyze={adm => { setMode('continuous'); setSelLearner(adm); }} />
      ) : !selLearner ? (
        <>
          <div className="sg sg3" style={{ marginBottom: '22px' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--green)' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n" style={{ color: 'var(--green)' }}>{stats.promote}</div>
                  <div className="sc-l">On Track (Promote)</div>
                </div>
                <div style={{ fontSize: '24px' }}>📈</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--amber)' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n" style={{ color: 'var(--amber)' }}>{stats.review}</div>
                  <div className="sc-l">Needs Review</div>
                </div>
                <div style={{ fontSize: '24px' }}>👀</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--red)' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n" style={{ color: 'var(--red)' }}>{stats.retain}</div>
                  <div className="sc-l">Critical (Retain)</div>
                </div>
                <div style={{ fontSize: '24px' }}>⚠️</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr">
              <h3>📋 Class Breakdown — {selGrade}</h3>
            </div>
            <div className="panel-body">
              {gradeLearners.length > 0 ? (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Adm</th><th>Name</th>
                        <th style={{ textAlign: 'center' }}>Points</th>
                        <th style={{ textAlign: 'center' }}>Forecast</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeLearners.map(l => {
                        const pct = Math.round((l.totalPts / l.maxTotal) * 100);
                        const tColor = l.status === 'promote' ? 'var(--green)' : l.status === 'review' ? 'var(--amber)' : 'var(--red)';
                        return (
                          <tr key={l.adm}>
                            <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{l.adm}</td>
                            <td style={{ fontWeight: 600 }}>{l.name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 800 }}>{l.totalPts} / {l.maxTotal}</div>
                              <div style={{ width: '60px', height: '4px', background: '#eee', borderRadius: '2px', margin: '4px auto 0', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: tColor }}></div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ background: tColor + '15', color: tColor, border: `1px solid ${tColor}30` }}>
                                {l.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => setSelLearner(l.adm)}>🔍 Analyze</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  No graded data found for selection.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="learner-analysis">
          <div className="sg sg2" style={{ marginBottom: '22px' }}>
            <div className="panel">
              <div className="panel-hdr"><h3>👤 Learner Profile</h3></div>
              <div className="panel-body" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>👤</div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--navy)' }}>{learnerDetail.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Adm: {learnerDetail.adm} · {learnerDetail.grade}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <span className="badge bg-blue">{learnerDetail.status.toUpperCase()}</span>
                    <span className="badge bg-teal">{Math.round((learnerDetail.totalPts / learnerDetail.maxTotal) * 100)}% PERFORMANCE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-hdr"><h3>📈 Overall Trajectory</h3></div>
              <div className="panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100px', padding: '0 20px' }}>
                  {learnerDetail.trajectory.map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--blue)' }}>{t.pct}%</div>
                      <div style={{ width: '30px', height: `${t.pct}px`, background: 'linear-gradient(to top, var(--blue), #93C5FD)', borderRadius: '4px 4px 0 0' }}></div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>{t.assess}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: '22px' }}>
            <div className="panel-hdr"><h3>📊 Subject Performance Analysis</h3></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Subject</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'center' }}>Level</th>
                    <th style={{ textAlign: 'center' }}>Term Trend</th>
                    <th style={{ textAlign: 'left' }}>Observation / Intervention</th>
                  </tr>
                </thead>
                <tbody>
                  {learnerDetail.subTrends.map((s, i) => {
                    const low = s.currentScore < 30;
                    const high = s.currentScore >= 70;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{s.subject}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '16px', color: s.color }}>{s.currentScore}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: s.color + '15', color: s.color }}>{s.level}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <svg width="80" height="20">
                            <polyline
                              fill="none"
                              stroke="var(--blue)"
                              strokeWidth="2"
                              points={s.assessData.map((d, idx) => `${idx * 30 + 10},${20 - (d.score / 100 * 15)}`).join(' ')}
                            />
                            {s.assessData.map((d, idx) => (
                              <circle key={idx} cx={idx * 30 + 10} cy={20 - (d.score / 100 * 15)} r="2" fill="var(--blue)" />
                            ))}
                          </svg>
                        </td>
                        <td style={{ fontSize: '11px' }}>
                          {low ? (
                            <div style={{ color: 'var(--red)', fontWeight: 600 }}>⚠️ Critical Gap. Intensive remedial support required.</div>
                          ) : high ? (
                            <div style={{ color: 'var(--green)', fontWeight: 600 }}>✨ Exemplary. Recommend for extension tasks.</div>
                          ) : (
                            <div style={{ color: 'var(--muted)' }}>Steady progress. Monitor closely.</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ border: '2px solid var(--blue)', background: '#F8FAFF' }}>
            <div className="panel-hdr" style={{ background: 'var(--blue)', color: '#fff' }}>
              <h3>🎯 Strategic Recommendations</h3>
            </div>
            <div className="panel-body">
              <div className="sg sg2">
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>Focus Areas</div>
                  <ul style={{ fontSize: '12px', color: '#444', paddingLeft: '18px' }}>
                    {learnerDetail.subTrends.filter(s => s.currentScore < 40).map((s, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>Priority support in <strong>{s.subject}</strong></li>
                    ))}
                    <li>Ensure 100% attendance in all core subjects.</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>Intervention Plan</div>
                  <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.6 }}>
                    {learnerDetail.status === 'retain' ? 'Immediate meeting with parent required to discuss retention and personalized learning plan.' : 
                     learnerDetail.status === 'review' ? 'Bi-weekly tracking of subject-specific goals and peer tutoring recommended.' : 
                     'Maintain current trajectory and encourage leadership roles in group projects.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading analytics...</div>;
}

function GradingLegend({ examInfo }) {
  if (!examInfo) return null;
  return (
    <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
        📋 {examInfo.name} grading · {examInfo.body}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {examInfo.scale.map((s, idx) => {
          const next = examInfo.scale[idx - 1];
          const max = s.max ?? (next ? next.min - 1 : 100);
          return (
          <span key={s.lv} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: s.bg, color: s.c, border: `1px solid ${s.c}30` }}>
            {s.lv} <span style={{ fontWeight: 600 }}>({s.min}-{max})</span> · {s.desc}
          </span>
        );})}
      </div>
      {examInfo.note && <div style={{ marginTop: 10, color: '#64748B', fontSize: 11, lineHeight: 1.5 }}>{examInfo.note}</div>}
    </div>
  );
}

function NationalExamForecast({ forecast, grade, curriculum, onAnalyze }) {
  const examInfo = resolveExamForGrade(grade, curriculum);
  const displayExam = examInfo?.name || 'National Exam';
  return (
    <div className="national-forecast">
      <div className="panel" style={{ marginBottom: 22, border: '2px solid #0F172A' }}>
        <div className="panel-hdr" style={{ background: '#0F172A', color: '#fff' }}>
          <div>
            <h3 style={{ color: '#fff' }}>🎓 {displayExam} Readiness Forecast — {grade}</h3>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }}>
              Exam Body: <strong style={{color:'#FCD34D'}}>{examInfo?.body || 'KNEC'}</strong> · Model uses recency, trend, subject coverage, volatility, weak-subject penalties, and class context.
            </div>
          </div>
          <span className="badge bg-gold">Official Grading</span>
        </div>
        <div className="panel-body">
          <div className="sg sg4">
            <div className="stat-card" style={{ borderLeft: '4px solid #2563EB' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n">{forecast.avgForecast}%</div>
                  <div className="sc-l">Projected Mean</div>
                </div>
                <div style={{ fontSize: 24 }}>📈</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n">{forecast.strong}</div>
                  <div className="sc-l">Strong Candidates</div>
                </div>
                <div style={{ fontSize: 24 }}>🏅</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #DC2626' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n">{forecast.watch}</div>
                  <div className="sc-l">Intervention Watch</div>
                </div>
                <div style={{ fontSize: 24 }}>⚠️</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
              <div className="sc-inner">
                <div style={{ flex: 1 }}>
                  <div className="sc-n">{forecast.forecasted}/{forecast.candidates}</div>
                  <div className="sc-l">Forecast Coverage</div>
                </div>
                <div style={{ fontSize: 24 }}>📋</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A', fontSize: 13, lineHeight: 1.6 }}>
            <strong>Administrative recommendation:</strong> {forecast.watch > 0
              ? `Approve a monitored intervention programme for ${forecast.watch} learner${forecast.watch === 1 ? '' : 's'} before the next mock or national exam cycle.`
              : 'Maintain current revision structures and increase timed practice for top-band conversion.'}
          </div>
        </div>
      </div>

      <GradingLegend examInfo={examInfo} />

      <div className="panel">
        <div className="panel-hdr">
          <h3>📊 {displayExam} — Candidate Forecast</h3>
          <span className="badge bg-blue">{forecast.rows.length} learners with trend data</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Adm</th>
                <th>Name</th>
                <th>Current Avg</th>
                <th>Momentum</th>
                <th>Predicted</th>
                <th>Band</th>
                <th>Confidence</th>
                <th>Data Quality</th>
                <th>Recommendation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {forecast.rows.map((row, i) => (
                <tr key={row.adm}>
                  <td style={{ fontWeight: 900 }}>#{i + 1}</td>
                  <td>{row.adm}</td>
                  <td style={{ fontWeight: 800 }}>{row.name}</td>
                  <td style={{ fontWeight: 800 }}>{row.current}%</td>
                  <td style={{ color: row.momentum >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>{row.momentum > 0 ? '+' : ''}{row.momentum}</td>
                  <td style={{ fontWeight: 900, fontSize: 15 }}>{row.forecast}%</td>
                  <td>
                    <span className="badge" style={{ background: row.band.bg, color: row.band.color, fontSize: 13, fontWeight: 900, padding: '3px 10px', borderRadius: 20 }}>
                      {row.band.lv}
                    </span>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{row.band.examName}</div>
                  </td>
                  <td>{row.confidence}%</td>
                  <td>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{row.coveragePct}% coverage</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{row.subjectBreadthPct}% subject breadth · volatility {row.volatility}</div>
                  </td>
                  <td style={{ minWidth: 260, color: '#475569', fontSize: 11 }}>{row.recommendation}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => onAnalyze(row.adm)}>Analyze</button></td>
                </tr>
              ))}
              {forecast.rows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No trend data is available yet. Capture marks across at least one assessment to generate a forecast.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
