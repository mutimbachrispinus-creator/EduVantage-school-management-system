'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDefaultSubjects, calcLearnerPoints, promotionStatus, getAllGrades, gInfo } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';

const ASSESS_LIST = [
  { id: 'op1', label: 'Opener' },
  { id: 'mt1', label: 'Mid-Term' },
  { id: 'et1', label: 'End-Term' }
];

const NATIONAL_SERIES = ['T1', 'T2', 'T3'].flatMap(term =>
  ASSESS_LIST.map(a => ({ term, assess: a.id, label: `${term} ${a.label}` }))
);

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : 0));
}

function examBand(score) {
  if (score >= 80) return { label: 'A / Excellent', color: 'var(--green)', bg: 'var(--green-bg)' };
  if (score >= 65) return { label: 'B / Strong', color: 'var(--blue)', bg: 'var(--blue-bg)' };
  if (score >= 50) return { label: 'C / Secure', color: 'var(--amber)', bg: 'var(--amber-bg)' };
  if (score >= 35) return { label: 'D / Watch', color: '#B45309', bg: '#FFF7ED' };
  return { label: 'E / Critical', color: 'var(--red)', bg: 'var(--red-bg)' };
}

export default function PredictorPage() {
  const router = useRouter();
  const { profile: school } = useProfile() || { profile: {} };
  const ALL_GRADES = getAllGrades(school?.curriculum || 'CBC');

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
  const [targetExam, setTargetExam] = useState('National Exam');

  useEffect(() => {
    if (!selGrade && ALL_GRADES.length > 0) {
      setSelGrade(ALL_GRADES[0]);
    }
  }, [ALL_GRADES, selGrade]);

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

  const subjects = useMemo(() => getDefaultSubjects(selGrade, school?.curriculum || 'CBC'), [selGrade, school?.curriculum]);
  
  const gradeLearners = useMemo(() => {
    return learners.filter(l => l.grade === selGrade).map(l => {
      const pts = calcLearnerPoints(marks, l.adm, selGrade, selTerm, selAssess, subjects, gradCfg, school?.curriculum || 'CBC');
      const status = promotionStatus(pts.totalPts, pts.maxTotal);
      return { ...l, ...pts, status };
    }).filter(l => l.enteredCount > 0).sort((a, b) => b.totalPts - a.totalPts);
  }, [learners, selGrade, selTerm, selAssess, subjects, gradCfg, marks, school?.curriculum]);

  const stats = useMemo(() => ({
    promote: gradeLearners.filter(l => l.status === 'promote').length,
    review: gradeLearners.filter(l => l.status === 'review').length,
    retain: gradeLearners.filter(l => l.status === 'retain').length,
  }), [gradeLearners]);

  const nationalForecast = useMemo(() => {
    const classLearners = learners.filter(l => l.grade === selGrade);
    const rows = classLearners.map(l => {
      const series = NATIONAL_SERIES.map(point => {
        const scores = subjects
          .map(subject => marks[`${point.term}:${selGrade}|${subject}|${point.assess}`]?.[l.adm])
          .filter(v => v !== undefined && v !== null && v !== '');
        if (!scores.length) return null;
        const avg = scores.reduce((sum, value) => sum + Number(value), 0) / scores.length;
        return { ...point, avg: Number(avg.toFixed(1)), entries: scores.length };
      }).filter(Boolean);

      const current = series.length ? series[series.length - 1].avg : 0;
      const baseline = series.length ? series[0].avg : 0;
      const momentum = series.length > 1 ? (current - baseline) / (series.length - 1) : 0;
      const latestPoint = series.length ? series[series.length - 1] : null;
      const completion = subjects.length ? Math.round(((latestPoint?.entries || 0) / subjects.length) * 100) : 0;
      const forecast = clamp(current + (momentum * Math.max(1, 9 - series.length)) + (completion >= 90 ? 1.5 : 0));
      const band = examBand(forecast);
      return {
        ...l,
        series,
        current,
        baseline,
        momentum: Number(momentum.toFixed(1)),
        forecast: Number(forecast.toFixed(1)),
        band,
        confidence: Math.min(95, 35 + series.length * 7 + (completion >= 80 ? 10 : 0)),
        recommendation: series.length < 3
          ? 'Capture more termly marks before making high-stakes placement decisions.'
          : forecast < 45
            ? 'Create a monitored intervention plan with weekly subject targets.'
            : momentum < 0
              ? 'Stabilize declining subjects through targeted revision and attendance checks.'
              : 'Maintain pace and assign national-exam practice under timed conditions.'
      };
    }).filter(r => r.series.length > 0).sort((a, b) => b.forecast - a.forecast);

    const avgForecast = rows.length ? rows.reduce((sum, r) => sum + r.forecast, 0) / rows.length : 0;
    return {
      rows,
      candidates: classLearners.length,
      forecasted: rows.length,
      avgForecast: Number(avgForecast.toFixed(1)),
      top: rows[0],
      watch: rows.filter(r => r.forecast < 45).length,
      strong: rows.filter(r => r.forecast >= 65).length
    };
  }, [learners, marks, selGrade, subjects]);

  const learnerDetail = useMemo(() => {
    if (!selLearner) return null;
    const l = learners.find(x => x.adm === selLearner);
    if (!l) return null;

    // Subject trends
    const subTrends = subjects.map(s => {
      const assessData = ASSESS_LIST.map(a => {
        const score = marks[`${selTerm}:${selGrade}|${s}|${a.id}`]?.[l.adm];
        return { assess: a.label, score: score ?? 0 };
      });
      const currentScore = marks[`${selTerm}:${selGrade}|${s}|${selAssess}`]?.[l.adm] || 0;
      const info = gInfo(currentScore, selGrade, gradCfg, school?.curriculum || 'CBC');
      return { subject: s, assessData, currentScore, level: info.lv, color: info.pts >= 3 ? 'var(--green)' : info.pts >= 2 ? 'var(--amber)' : 'var(--red)' };
    });

    // Overall trajectory
    const trajectory = ASSESS_LIST.map(a => {
      const pts = calcLearnerPoints(marks, l.adm, selGrade, selTerm, a.id, subjects, gradCfg, school?.curriculum || 'CBC');
      return { assess: a.label, pct: Math.round((pts.totalPts / pts.maxTotal) * 100) };
    });

    return { ...l, subTrends, trajectory };
  }, [selLearner, learners, subjects, marks, selTerm, selGrade, selAssess, gradCfg, school?.curriculum]);

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
            <label>Grade</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelLearner(null); }}>
              {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {mode === 'continuous' ? (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Term</label>
                <select value={selTerm} onChange={e => setSelTerm(e.target.value)}>
                  <option value="T1">Term 1</option><option value="T2">Term 2</option><option value="T3">Term 3</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Assessment</label>
                <select value={selAssess} onChange={e => setSelAssess(e.target.value)}>
                  {ASSESS_LIST.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Target Exam</label>
              <select value={targetExam} onChange={e => setTargetExam(e.target.value)}>
                <option>National Exam</option>
                <option>KPSEA</option>
                <option>KJSEA</option>
                <option>KCSE</option>
                <option>IGCSE</option>
                <option>IB Finals</option>
                <option>CDACC Finals</option>
                <option>TVET Internal</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {mode === 'national' ? (
        <NationalExamForecast forecast={nationalForecast} grade={selGrade} targetExam={targetExam} onAnalyze={adm => { setMode('continuous'); setSelLearner(adm); }} />
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

function NationalExamForecast({ forecast, grade, targetExam, onAnalyze }) {
  return (
    <div className="national-forecast">
      <div className="panel" style={{ marginBottom: 22, border: '2px solid #0F172A' }}>
        <div className="panel-hdr" style={{ background: '#0F172A', color: '#fff' }}>
          <div>
            <h3 style={{ color: '#fff' }}>Official {targetExam} Readiness Forecast — {grade}</h3>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }}>
              Projection uses captured opener, mid-term, and end-term performance across available terms.
            </div>
          </div>
          <span className="badge bg-gold">Interactive prediction</span>
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

      <div className="panel">
        <div className="panel-hdr">
          <h3>{targetExam} Candidate Forecast Table</h3>
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
                  <td><span className="badge" style={{ background: row.band.bg, color: row.band.color }}>{row.band.label}</span></td>
                  <td>{row.confidence}%</td>
                  <td style={{ minWidth: 260, color: '#475569', fontSize: 11 }}>{row.recommendation}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => onAnalyze(row.adm)}>Analyze</button></td>
                </tr>
              ))}
              {forecast.rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
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
