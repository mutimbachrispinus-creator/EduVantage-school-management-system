'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDefaultSubjects, calcLearnerPoints, promotionStatus, getAllGrades, gInfo } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';

const ASSESS_LIST = [
  { id: 'op1', label: 'Opener' },
  { id: 'mt1', label: 'Mid-Term' },
  { id: 'et1', label: 'End-Term' }
];

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
          <p>Detailed analysis and trajectory forecasting</p>
        </div>
        <div className="page-hdr-acts no-print">
          {selLearner && <button className="btn btn-ghost btn-sm" onClick={() => setSelLearner(null)}>← Back to List</button>}
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Analysis</button>
        </div>
      </div>

      <div className="panel no-print">
        <div className="panel-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Grade</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelLearner(null); }}>
              {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
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
        </div>
      </div>

      {!selLearner ? (
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
