'use client';


import React, { useState, useEffect, useTransition } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from '@/components/DynamicCharts';
import { TrendingUp, Users, BookOpen, AlertCircle, Loader2, ShieldAlert, Target, Award, Activity, ClipboardList, Gauge, Search } from 'lucide-react';
import { buildMeritList, getAllGrades, getDefaultSubjects, getCurriculum, gInfo, getDistributionBuckets, getMark } from '@/lib/cbe';
import { useSchoolProfile } from '@/lib/school-profile';
import { fetchWithRetry, getCachedDBMulti } from '@/lib/client-cache';
import {
  buildNationalForecast,
  getExamForGrade,
  normalizeAssessments as normalizeExamAssessments,
  normalizeTerms as normalizeExamTerms,
} from '@/lib/national-exam-predictor';

const COLORS = ['#8B1A1A', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];

export default function AnalyticsPage() {
  const profile = useSchoolProfile();
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const [isPending, startTransition] = useTransition();
  const [retryCount, setRetryCount] = useState(0);

  // Performance Detail States
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [subjCfg, setSubjCfg] = useState({});
  const [pTerm, setPTerm] = useState('T1');
  const [pAssess, setPAssess] = useState('et1');
  const [pGrade, setPGrade] = useState('');
  const [pStream, setPStream] = useState('');
  const [pQuery, setPQuery] = useState('');
  const [staff, setStaff] = useState([]);
  const [allocations, setAllocations] = useState({});

  const grades = getAllGrades(profile?.curriculum || 'CBC');
  const curr = getCurriculum(profile?.curriculum || 'CBC', profile?.levels);
  const currTerms = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const currAssessments = curr.ASSESSMENT_TYPES || [{ key: 'op1', label: '📝 Opener' }, { key: 'mt1', label: '📖 Mid-Term' }, { key: 'et1', label: '📋 End-Term' }];
  const currLabels = curr.LABELS || { grade: 'Grade', subject: 'Subject', learner: 'Learner', learners: 'Learners', assessment: 'Assessment' };

  // Sync grade & term defaults when profile/curriculum loads
  useEffect(() => {
    if (profile?.curriculum && grades.length) {
      setGrade(g => grades.includes(g) ? g : grades[0]);
      setPGrade(g => grades.includes(g) ? g : grades[0]);
    }
    if (profile?.curriculum && currTerms.length) {
      setTerm(t => currTerms.some(x => x.id === t) ? t : currTerms[0].id);
      setPTerm(t => currTerms.some(x => x.id === t) ? t : currTerms[0].id);
      setPAssess(a => currAssessments.some(x => x.key === a) ? a : (currAssessments[currAssessments.length - 1]?.key || 'et1'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.curriculum]);

  useEffect(() => {
    if (profile?.tenantId && grade && term) {
      setStats(null);
      setError(null);
      
      const timeout = setTimeout(() => {
        setError('Analysis is taking longer than expected. Please try again.');
      }, 12000);

      startTransition(async () => {
        try {
          const params = new URLSearchParams({
            grade,
            term,
            curriculum: profile.curriculum || 'CBC'
          });
          const response = await fetchWithRetry(`/api/analytics/academic?${params.toString()}`, { timeout: 20000 }, 1);
          const res = response ? await response.json() : { success: false, error: 'Request cancelled' };
          clearTimeout(timeout);
          if (res.success) {
            setStats(res.data);
            setError(null);
          } else {
            const fallback = await buildCachedAcademicStats({ grade, term, curriculum: profile.curriculum || 'CBC' });
            if (fallback) {
              setStats(fallback);
              setError(null);
            } else {
              setError(res.error || 'Failed to calculate insights');
            }
          }
        } catch (e) {
          clearTimeout(timeout);
          const fallback = await buildCachedAcademicStats({ grade, term, curriculum: profile.curriculum || 'CBC' });
          if (fallback) {
            setStats(fallback);
            setError(null);
          } else {
            setError(e.message || 'An unexpected error occurred');
          }
        }
      });
      return () => clearTimeout(timeout);
    }
  }, [grade, term, profile, retryCount]);

  // guard: don't render until grade/term are resolved
  const isReady = Boolean(grade && term);


  useEffect(() => {
    async function loadPerformance() {
      if (!profile?.tenantId) return;
      const db = await getCachedDBMulti(['paav6_learners', 'paav6_marks', 'paav8_subj', 'paav8_grad', 'paav6_staff', 'paav_allocations']);
      setLearners(db.paav6_learners || []);
      setMarks(db.paav6_marks || {});
      setSubjCfg(db.paav8_subj || {});
      setGradCfg(db.paav8_grad || null);
      setStaff(db.paav6_staff || []);
      setAllocations(db.paav_allocations || {});
    }
    if (['performance', 'staff', 'outreach', 'pathways', 'predictor'].includes(activeTab)) loadPerformance();
  }, [activeTab, profile]);


  return (
    <div className="page on animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="page-hdr" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>Performance & Insights</h2>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>Institutional excellence dashboard</p>
        </div>
        
        <div className="analytics-tabs-container">
          <button className={`analytics-tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>📊 Insights</button>
          <button className={`analytics-tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>📈 Academic Detail</button>
          <button className={`analytics-tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>👨‍🏫 Staff Efficiency</button>
          <button className={`analytics-tab ${activeTab === 'outreach' ? 'active' : ''}`} onClick={() => setActiveTab('outreach')}>📲 Parent Outreach</button>
          <button className={`analytics-tab ${activeTab === 'pathways' ? 'active' : ''}`} onClick={() => setActiveTab('pathways')}>🛣️ Learner Pathways</button>
          <button className={`analytics-tab ${activeTab === 'predictor' ? 'active' : ''}`} onClick={() => setActiveTab('predictor')}>🔮 Exam Predictor</button>
        </div>
      </div>

      {activeTab === 'insights' || activeTab === 'outreach' || activeTab === 'pathways' ? (
        <>
          <div className="page-hdr" style={{ marginTop: 20, border: 'none' }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>{activeTab === 'outreach' ? 'Parent Communications' : activeTab === 'pathways' ? 'Curriculum Pathways' : 'Global Analytics'}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}><Users size={14} className="inline mr-1" /> {activeTab === 'outreach' ? `Broadcasting to ${grade}` : activeTab === 'pathways' ? `Analyzing pathways for ${grade}` : stats ? `Analyzing ${stats.studentCount} ${(stats.labels || currLabels).learners} in ${grade}` : `Loading data for ${grade}...`}</p>
            </div>
            <div className="page-hdr-acts">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={term} onChange={(e) => setTerm(e.target.value)} style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                {currTerms.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
              </select>
              {activeTab === 'outreach' && (
                <select value={pAssess} onChange={(e) => setPAssess(e.target.value)} style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                  {currAssessments.map(a => <option key={a.key} value={a.key}>{a.label.replace(/\p{Emoji}/gu, '').trim()}</option>)}
                </select>
              )}
            </div>
          </div>
          {/* Insight Cards ... */}
        </>
      ) : activeTab === 'performance' || activeTab === 'staff' ? (
        <>
          <div className="page-hdr" style={{ marginTop: 20, border: 'none' }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Academic Performance</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Rankings & detailed markbooks for {pGrade} — {currLabels.assessment} breakdown</p>
            </div>
            <div className="page-hdr-acts">
              <select value={pGrade} onChange={(e) => setPGrade(e.target.value)} style={{ borderRadius: 8 }}>
                {grades.map(g => <option key={g}>{g}</option>)}
              </select>
              <select value={pTerm} onChange={(e) => setPTerm(e.target.value)} style={{ borderRadius: 8 }}>
                {currTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={pAssess} onChange={(e) => setPAssess(e.target.value)} style={{ borderRadius: 8 }}>
                {currAssessments.map(a => <option key={a.key} value={a.key}>{a.label.replace(/\p{Emoji}/gu, '').trim()}</option>)}
              </select>
              <input value={pQuery} onChange={e => setPQuery(e.target.value)} placeholder="Search learner..." style={{ borderRadius: 8, border: '1.5px solid var(--border)', padding: '8px 12px', minWidth: 180 }} />
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('outreach')}>Parent Outreach</button>
            </div>
          </div>
          {/* Performance UI ... */}
        </>
      ) : null}

      {activeTab === 'pathways' ? (
        <PathwaysTab 
          grade={grade} 
          term={term} 
          learners={learners} 
          marks={marks} 
          curriculum={profile?.curriculum || 'CBC'} 
          subjects={getDefaultSubjects(grade, profile?.curriculum || 'CBC')} 
        />
      ) : null}

      {activeTab === 'predictor' ? (
        <PredictorTab 
          learners={learners}
          marks={marks}
          grade={grade}
          setGrade={setGrade}
          grades={grades}
          curriculum={profile?.curriculum || 'CBC'}
          subjCfg={subjCfg}
        />
      ) : null}

      {activeTab === 'insights' ? (
        <>
          {/* Insights loading/error states — contained to this tab only */}
          {!isReady && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
              <Loader2 className="animate-spin" style={{ color: '#94a3b8' }} size={40} />
              <p style={{ color: '#64748b', fontWeight: 600 }}>Resolving curriculum settings…</p>
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, padding: 32, textAlign: 'center' }}>
              <AlertCircle style={{ color: '#dc2626' }} size={48} />
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Insights Analysis Failed</h3>
                <p style={{ color: '#64748b', maxWidth: 420, margin: '8px auto 0', fontSize: 14 }}>
                  {/unexpected/i.test(error) ? 'The server encountered an error processing academic data for this grade. This is often caused by an intermittent timeout. Please retry.' : error}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => { setError(null); setStats(null); setRetryCount(c => c + 1); }}>Retry Analysis</button>
                <button className="btn btn-ghost" onClick={() => setActiveTab('performance')}>View Markbook Instead →</button>
              </div>
            </div>
          )}
          {!error && !stats && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
              <Loader2 className="animate-spin" style={{ color: '#94a3b8' }} size={40} />
              <p style={{ color: '#64748b', fontWeight: 600 }} className="animate-pulse">Calculating institutional insights...</p>
            </div>
          )}
          {!error && stats && (
          <>
          {/* Insight Cards */}
          <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#eff6ff', color: '#2563eb', boxShadow: '0 0 15px rgba(37,99,235,0.3)' }}><Gauge size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Class Average</div>
                  <div className="sc-n" style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{stats.classAverage || 0}%</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#2563eb', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    {stats.enteredLearners || 0}/{stats.studentCount || 0} {(stats.labels || currLabels).learners} with marks
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(5,150,105,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#ecfdf5', color: '#059669', boxShadow: '0 0 15px rgba(5,150,105,0.3)' }}><BookOpen size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Top Subject</div>
                  <div className="sc-n" style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{stats.subjectMastery[0]?.name || '—'}</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#059669', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    {stats.subjectMastery[0]?.level || '—'} ({stats.subjectMastery[0]?.average || 0}%)
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#fef2f2', color: '#dc2626', boxShadow: '0 0 15px rgba(220,38,38,0.3)' }}><AlertCircle size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Weakest Subject</div>
                  <div className="sc-n" style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{stats.subjectMastery[stats.subjectMastery.length-1]?.name || '—'}</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#dc2626', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    {stats.subjectMastery[stats.subjectMastery.length-1]?.level || '—'} ({stats.subjectMastery[stats.subjectMastery.length-1]?.average || 0}%)
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#f5f3ff', color: '#7c3aed', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}><TrendingUp size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Top Value-Add</div>
                  <div className="sc-n" style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    {stats.subjectMastery.filter(s => s.sva > 0).sort((a,b) => b.sva - a.sva)[0]?.name || '—'}
                  </div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#7c3aed', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    +{stats.subjectMastery.filter(s => s.sva > 0).sort((a,b) => b.sva - a.sva)[0]?.sva || 0}% Improvement
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(14,165,233,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#f0f9ff', color: '#0ea5e9', boxShadow: '0 0 15px rgba(14,165,233,0.3)' }}><ClipboardList size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Marks Coverage</div>
                  <div className="sc-n" style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{stats.completionRate || 0}%</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#0ea5e9', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    {stats.totalEntries || 0} captured entries
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(239,68,68,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#fef2f2', color: '#ef4444', boxShadow: '0 0 15px rgba(239,68,68,0.3)' }}><ShieldAlert size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Academic Risk</div>
                  <div className="sc-n" style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{stats.riskCount || 0}</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#ef4444', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    Below 40% average
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card premium-hover">
              <div className="glass-gradient" style={{ background: 'radial-gradient(circle at top right, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
              <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="sc-icon-glow" style={{ background: '#fffbeb', color: '#f59e0b', boxShadow: '0 0 15px rgba(245,158,11,0.3)' }}><Award size={20} /></div>
                <div>
                  <div className="sc-l" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#64748B' }}>Excellence Pool</div>
                  <div className="sc-n" style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{stats.excellenceCount || 0}</div>
                  <div className="sc-sub" style={{ background: 'transparent', color: '#f59e0b', padding: 0, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    At or above 80%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '0', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              <div className="panel-hdr" style={{ padding: '24px 30px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gauge size={20} style={{ color: '#2563eb' }} /> Deep Subject Analytics Matrix
                </h3>
              </div>
              <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
                <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(248,250,252,0.5)' }}>
                      <th style={{ padding: '16px 30px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{(stats.labels || currLabels).subject}</th>
                      <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mean</th>
                      <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Value-Add (SVA)</th>
                      <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Variance (StdDev)</th>
                      <th style={{ padding: '16px 30px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade Distribution (Count)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.subjectMastery.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: idx === stats.subjectMastery.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(241,245,249,0.3)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 30px', fontWeight: 800, color: '#0F172A', fontSize: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color || '#cbd5e1' }}></div>
                            {s.name}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '16px 20px', fontWeight: 900, color: s.color, fontSize: 15 }}>{s.average}%</td>
                        <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                          {s.sva > 0 ? <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>+{s.sva}</span> 
                           : s.sva < 0 ? <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>{s.sva}</span> 
                           : <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                          <span style={{ background: s.stdDev > 15 ? '#fffbeb' : '#eff6ff', color: s.stdDev > 15 ? '#d97706' : '#2563eb', padding: '4px 10px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
                            {s.stdDev}
                          </span>
                        </td>
                        <td style={{ padding: '16px 30px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {stats.distBucketsTemplate && Object.keys(stats.distBucketsTemplate).map(k => (
                              s.distribution?.[k] ? (
                                <div key={k} style={{ fontSize: 11, padding: '3px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontWeight: 600, color: '#475569' }}>
                                  <strong style={{ color: '#0F172A', fontWeight: 800 }}>{k}</strong> <span style={{ opacity: 0.6 }}>·</span> {s.distribution[k]}
                                </div>
                              ) : null
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-8">
              <div className="panel" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: 20 }}>
                <div className="panel-hdr"><h3 style={{ fontSize: 16, fontWeight: 900 }}>Historical Progression</h3></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={[...(stats.historicalProgression || []), { name: term, average: stats.classAverage }]}>
                      <defs>
                        <linearGradient id="colorProgression" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }} itemStyle={{ fontWeight: 800 }} />
                      <Line type="monotone" dataKey="average" stroke="#2563EB" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, fill: '#2563EB' }} name="Average" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: 20 }}>
                <div className="panel-hdr"><h3 style={{ fontSize: 16, fontWeight: 900 }}>Current Term Assessments</h3></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={stats.assessmentComparison || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }} itemStyle={{ fontWeight: 800 }} />
                      <Line type="monotone" dataKey="average" stroke="#8B1A1A" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, fill: '#8B1A1A' }} name="Average" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: 20 }}>
                <div className="panel-hdr"><h3 style={{ fontSize: 16, fontWeight: 900 }}>Gender Parity Analysis</h3></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stats.genderComparison} innerRadius={60} outerRadius={80} dataKey="average" stroke="none">
                        {stats.genderComparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }} itemStyle={{ fontWeight: 800 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: 20 }}>
                <div className="panel-hdr"><h3 style={{ fontSize: 16, fontWeight: 900 }}>Stream Performance</h3></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.streamComparison}>
                      <defs>
                        <linearGradient id="colorStream" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }} itemStyle={{ fontWeight: 800 }} />
                      <Bar dataKey="average" fill="url(#colorStream)" radius={[8, 8, 8, 8]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel" style={{ background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div className="panel-hdr"><h3 style={{ fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>✨ Action Recommendations</h3></div>
                <div className="panel-body" style={{ display: 'grid', gap: 14 }}>
                  {buildInsightActions(stats, stats.labels || currLabels).map((a, i) => (
                    <div key={i} className="action-rec-card" style={{ display: 'flex', gap: 14, padding: 16, border: `1.5px solid ${a.color}30`, borderRadius: 16, background: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: a.color }}></div>
                      <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg, color: a.color, flexShrink: 0, boxShadow: `0 0 10px ${a.color}20` }}>{a.icon}</div>
                      <div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{a.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </>
      ) : activeTab === 'performance' ? (
        <div className="space-y-6">
          <PerformanceDetail 
            learners={learners} marks={marks} grade={pGrade} 
            term={pTerm} assess={pAssess} subjCfg={subjCfg} gradCfg={gradCfg} 
            curriculum={profile?.curriculum || 'CBC'} stream={pStream} setStream={setPStream} query={pQuery}
          />
        </div>
      ) : activeTab === 'staff' ? (
        <StaffPerformance 
          staff={staff} learners={learners} marks={marks} 
          pTerm={pTerm} pAssess={pAssess} subjCfg={subjCfg}
          allocations={allocations}
        />
      ) : activeTab === 'outreach' ? (
        <OutreachTab 
          learners={learners} marks={marks} grade={grade} 
          term={term.replace('TERM ', 'T')} assess={pAssess} stats={stats} 
          schoolName={profile?.name}
          grades={grades}
          currAssessments={currAssessments}
        />
      ) : null}
    <style>{`
        .analytics-tabs-container {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 99px;
          overflow-x: auto;
          max-width: 100%;
          scrollbar-width: none;
        }
        .analytics-tabs-container::-webkit-scrollbar { display: none; }
        .analytics-tab {
          padding: 8px 18px;
          border-radius: 99px;
          font-weight: 800;
          font-size: 13px;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .analytics-tab:hover {
          color: #0f172a;
          background: rgba(255,255,255,0.5);
        }
        .analytics-tab.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
          transform: translateY(-1px);
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 1);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card.premium-hover:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        .glass-gradient {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          opacity: 0.6;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .glass-card:hover .glass-gradient {
          opacity: 1;
        }
        .sc-icon-glow {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          transition: transform 0.3s ease;
        }
        .glass-card:hover .sc-icon-glow {
          transform: scale(1.1) rotate(5deg);
        }
        
        .action-rec-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .action-rec-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </div>
  );
}

async function buildCachedAcademicStats({ grade, term, curriculum }) {
  try {
    const db = await getCachedDBMulti(['paav6_learners', 'paav6_marks', 'paav8_subj']);
    const learners = (db.paav6_learners || []).filter(l => l?.grade === grade);
    const marks = db.paav6_marks || {};
    const curr = getCurriculum(curriculum || 'CBC');
    const labels = curr.LABELS || {
      grade: 'Grade', grades: 'Grades',
      subject: 'Subject', subjects: 'Subjects',
      learner: 'Learner', learners: 'Learners',
      assessment: 'Assessment', assessments: 'Assessments'
    };

    const prefixes = buildTermPrefixes(term, grade, curr);
    // Filter marks just for these learners
    const learnerAdms = new Set(learners.map(l => String(l.adm)));
    const allLearnerMarks = [];
    Object.entries(marks).forEach(([key, scores]) => {
      Object.entries(scores || {}).forEach(([adm, score]) => {
        if (learnerAdms.has(String(adm)) && Number.isFinite(Number(score))) {
          allLearnerMarks.push({ key, adm: String(adm), score: Number(score) });
        }
      });
    });

    const marksForGrade = allLearnerMarks.filter(row => prefixes.some(p => row.key.startsWith(p)));

    if (!learners.length) return emptyStats({ labels, curriculum, studentCount: 0 });
    if (!marksForGrade.length) return emptyStats({ labels, curriculum, studentCount: learners.length });

    const learnerMap = new Map(learners.map(l => [String(l.adm), l]));
    const subjectMap = {};
    const assessmentMap = {};
    const learnerTotals = {};
    const distBucketsTemplate = getDistributionBuckets(grade, curriculum);

    marksForGrade.forEach(m => {
      const parts = m.key.split('|');
      const subject = parts[1] || 'Unknown';
      const assess  = parts[2] || 'assessment';

      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0, scores: [], dist: { ...distBucketsTemplate } };
      subjectMap[subject].total += m.score;
      subjectMap[subject].count++;
      subjectMap[subject].scores.push(m.score);
      
      const info = gInfo(m.score, grade, null, curriculum);
      if (info?.lv && subjectMap[subject].dist[info.lv] !== undefined) {
        subjectMap[subject].dist[info.lv]++;
      }

      if (!assessmentMap[assess]) assessmentMap[assess] = { total: 0, count: 0 };
      assessmentMap[assess].total += m.score;
      assessmentMap[assess].count++;

      if (!learnerTotals[m.adm]) learnerTotals[m.adm] = { total: 0, count: 0 };
      learnerTotals[m.adm].total += m.score;
      learnerTotals[m.adm].count++;
    });

    // ── Value Add & Historical Progression ──
    const historicalMap = {}; 
    const pastSubjectMap = {}; 
    
    const currTerms = curr.TERMS || [];
    const matchedIdx = currTerms.findIndex(t => t.id === term || t.name === term);
    const prevTermObj = matchedIdx > 0 ? currTerms[matchedIdx - 1] : null;
    const prevPrefixes = prevTermObj ? [
      `${prevTermObj.id}:${grade}|`, `${prevTermObj.name}:${grade}|`, `T${matchedIdx}:${grade}|`, `TERM ${matchedIdx}:${grade}|`
    ] : [];

    allLearnerMarks.forEach(m => {
      const parts = m.key.split('|');
      const termGradePart = parts[0] || '';
      const tName = termGradePart.split(':')[0] || 'Unknown';
      
      if (!historicalMap[tName]) historicalMap[tName] = { total: 0, count: 0 };
      historicalMap[tName].total += m.score;
      historicalMap[tName].count++;

      if (prevPrefixes.some(p => m.key.startsWith(p))) {
        const subject = parts[1] || 'Unknown';
        if (!pastSubjectMap[subject]) pastSubjectMap[subject] = { total: 0, count: 0 };
        pastSubjectMap[subject].total += m.score;
        pastSubjectMap[subject].count++;
      }
    });

    const historicalProgression = Object.entries(historicalMap).map(([tName, data]) => ({
      name: tName,
      average: Number((data.total / data.count).toFixed(2))
    })).filter(h => !prefixes.some(p => p.startsWith(h.name + ':')));

    const subjectMastery = Object.entries(subjectMap).map(([name, data]) => {
      const avg = Number((data.total / data.count).toFixed(2));
      const info = gInfo(avg, grade, null, curriculum);
      
      const variance = data.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / data.count;
      const stdDev = Number(Math.sqrt(variance).toFixed(2));
      
      let sva = 0;
      if (pastSubjectMap[name] && pastSubjectMap[name].count > 0) {
        const pastAvg = pastSubjectMap[name].total / pastSubjectMap[name].count;
        sva = Number((avg - pastAvg).toFixed(2));
      }

      return { 
        name, average: avg, entries: data.count, level: info?.lv || '-', color: info?.c || '#64748B',
        stdDev, sva, distribution: data.dist
      };
    }).sort((a, b) => b.average - a.average);

    const assessLabelMap = (curr.ASSESSMENT_TYPES || []).reduce((acc, a) => {
      acc[a.key] = a.label.replace(/\p{Emoji}/gu, '').trim();
      return acc;
    }, {});
    const assessmentComparison = Object.entries(assessmentMap).map(([key, data]) => ({
      name: assessLabelMap[key] || key,
      rawKey: key,
      average: Number((data.total / data.count).toFixed(2)),
      entries: data.count
    })).sort((a, b) => a.rawKey.localeCompare(b.rawKey));

    const learnerAverages = Object.entries(learnerTotals).map(([adm, data]) => ({
      adm,
      average: data.count ? data.total / data.count : 0,
      entries: data.count
    }));
    const classAverage = learnerAverages.length
      ? Number((learnerAverages.reduce((sum, l) => sum + l.average, 0) / learnerAverages.length).toFixed(2))
      : 0;

    const levelMap = { ...getDistributionBuckets(grade, curriculum) };
    learnerAverages.forEach(l => {
      const lv = gInfo(l.average, grade, null, curriculum)?.lv || '-';
      levelMap[lv] = (levelMap[lv] || 0) + 1;
    });
    const gradeColors = curr.getGradeColors ? curr.getGradeColors() : {};
    const levelDistribution = Object.entries(levelMap).map(([name, count]) => ({
      name, count, color: gradeColors[name] || '#64748B'
    }));

    const genderStats = { Boys: { total: 0, count: 0 }, Girls: { total: 0, count: 0 } };
    const streamMap = {};
    marksForGrade.forEach(row => {
      const student = learnerMap.get(String(row.adm));
      if (!student) return;
      const sex = String(student.sex || student.gender || '').toLowerCase().startsWith('f') ? 'Girls' : 'Boys';
      genderStats[sex].total += row.score;
      genderStats[sex].count++;
      if (student.stream) {
        streamMap[student.stream] = streamMap[student.stream] || { total: 0, count: 0 };
        streamMap[student.stream].total += row.score;
        streamMap[student.stream].count++;
      }
    });

    const genderComparison = Object.entries(genderStats).map(([name, data]) => ({
      name,
      average: data.count ? Number((data.total / data.count).toFixed(2)) : 0,
      entries: data.count
    }));
    const streamComparison = Object.entries(streamMap).map(([name, data]) => ({
      name,
      average: Number((data.total / data.count).toFixed(2)),
      entries: data.count
    }));
    const expectedSubjects = db.paav8_subj?.[grade]?.length || getDefaultSubjects(grade, curriculum).length || Object.keys(subjectMap).length || 1;
    const expectedEntries = Math.max(1, learners.length * expectedSubjects);

    return {
      subjectMastery,
      genderComparison,
      streamComparison,
      assessmentComparison,
      levelDistribution,
      historicalProgression,
      studentCount: learners.length,
      enteredLearners: learnerAverages.length,
      totalEntries: marksForGrade.length,
      completionRate: Number(((marksForGrade.length / expectedEntries) * 100).toFixed(1)),
      classAverage,
      riskCount: learnerAverages.filter(l => l.average < 40).length,
      excellenceCount: learnerAverages.filter(l => l.average >= 80).length,
      labels,
      curriculum,
      distBucketsTemplate
    };
  } catch (e) {
    console.error('Cached analytics fallback failed:', e);
    return null;
  }
}

function buildTermPrefixes(term, grade, curr) {
  const aliases = new Set([term]);
  const numMatch = String(term || '').match(/(\d+)/);
  if (numMatch) {
    aliases.add(`T${numMatch[1]}`);
    aliases.add(`TERM ${numMatch[1]}`);
  }
  const terms = curr.TERMS || [];
  const matched = terms.find(t => t.id === term || t.name === term);
  if (matched) {
    const idx = terms.indexOf(matched) + 1;
    aliases.add(matched.id);
    aliases.add(matched.name);
    aliases.add(`T${idx}`);
    aliases.add(`TERM ${idx}`);
  }
  return [...aliases].filter(Boolean).map(t => `${t}:${grade}|`);
}

function emptyStats({ labels, curriculum, studentCount }) {
  return {
    subjectMastery: [],
    genderComparison: [],
    streamComparison: [],
    assessmentComparison: [],
    levelDistribution: [],
    historicalProgression: [],
    studentCount,
    enteredLearners: 0,
    totalEntries: 0,
    completionRate: 0,
    classAverage: 0,
    riskCount: 0,
    excellenceCount: 0,
    labels,
    curriculum
  };
}

function PredictorLegend({ examInfo }) {
  if (!examInfo?.scale?.length) return null;
  return (
    <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
        {examInfo.name} grading · {examInfo.body}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {examInfo.scale.map(s => (
          <span key={s.lv} style={{ padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: s.bg, color: s.c || s.color, border: `1px solid ${(s.c || s.color)}30` }}>
            {s.lv} <span style={{ fontWeight: 600 }}>({s.min}-{s.max ?? 100})</span> · {s.desc}
          </span>
        ))}
      </div>
      {examInfo.note && <div style={{ marginTop: 8, color: '#64748B', fontSize: 11 }}>{examInfo.note}</div>}
    </div>
  );
}

function PredictorTab({ learners, marks, grade, setGrade, grades, curriculum, subjCfg }) {
  const examInfo = React.useMemo(() => getExamForGrade(grade, curriculum), [grade, curriculum]);
  const targetExam = examInfo?.name || 'National Exam';

  const forecastData = React.useMemo(() => {
    if (!grade) return null;

    // Resolve subjects setup by relevant school (per class/grade)
    const tSubjCfg = subjCfg[grade] || [];
    const subs = (tSubjCfg && tSubjCfg.length > 0)
      ? tSubjCfg
      : getDefaultSubjects(grade, curriculum || 'CBC');
    const currCtx = getCurriculum(curriculum || 'CBC');
    const terms = normalizeExamTerms(currCtx.TERMS);
    const assessments = normalizeExamAssessments(currCtx.ASSESSMENT_TYPES);

    return buildNationalForecast({
      learners,
      marks,
      grade,
      curriculum,
      subjects: subs,
      terms,
      assessments,
    });
  }, [learners, marks, grade, curriculum, subjCfg]);

  return (
    <div className="space-y-6">
      <div className="page-hdr" style={{ border: 'none', marginTop: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>🔮 Exam Performance Predictor</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Realistic curriculum-aware projections based on termly trajectories</p>
        </div>
        <div className="page-hdr-acts">
          <select value={grade} onChange={(e) => setGrade(e.target.value)} style={{ borderRadius: 8 }}>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <span className="badge" style={{ fontSize: 13, padding: '8px 14px', fontWeight: 800, background: '#EFF6FF', color: '#2563EB' }}>
            🎯 {targetExam} · {examInfo?.body || 'Exam Body'}
          </span>
        </div>
      </div>

      <div className="sg sg4">
        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="sc-inner">
            <div style={{ flex: 1 }}>
              <div className="sc-n" style={{ color: '#2563eb' }}>{forecastData?.avgForecast || 0}%</div>
              <div className="sc-l">Projected Mean ({targetExam})</div>
            </div>
            <div style={{ fontSize: 24 }}>📈</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="sc-inner">
            <div style={{ flex: 1 }}>
              <div className="sc-n" style={{ color: '#059669' }}>{forecastData?.strong || 0}</div>
              <div className="sc-l">Top-Band Candidates</div>
            </div>
            <div style={{ fontSize: 24 }}>🏅</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="sc-inner">
            <div style={{ flex: 1 }}>
              <div className="sc-n" style={{ color: '#dc2626' }}>{forecastData?.watch || 0}</div>
              <div className="sc-l">Intervention Watch</div>
            </div>
            <div style={{ fontSize: 24 }}>⚠️</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="sc-inner">
            <div style={{ flex: 1 }}>
              <div className="sc-n" style={{ color: '#d97706' }}>{forecastData?.rows?.length || 0}</div>
              <div className="sc-l">Analyzed Learners</div>
            </div>
            <div style={{ fontSize: 24 }}>🎯</div>
          </div>
        </div>
      </div>

      <PredictorLegend examInfo={examInfo} />

      <div className="panel">
        <div className="panel-hdr">
          <h3>{targetExam} Readiness Forecast</h3>
          <span className="badge bg-blue">Model: trend + recency + coverage + volatility</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Grade</th>
                <th style={{ textAlign: 'center' }}>Current Avg</th>
                <th style={{ textAlign: 'center' }}>Momentum</th>
                <th style={{ textAlign: 'center' }}>Predicted ({targetExam})</th>
                <th>Band</th>
                <th style={{ textAlign: 'center' }}>Confidence</th>
                <th>Action Signal</th>
              </tr>
            </thead>
            <tbody>
              {forecastData?.rows.map(row => (
                <tr key={row.adm}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>ADM: {row.adm}</div>
                  </td>
                  <td>{row.grade}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.current}%</td>
                  <td style={{ textAlign: 'center', color: row.momentum >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                    {row.momentum > 0 ? '+' : ''}{row.momentum}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 900, fontSize: 15 }}>{row.forecast}%</td>
                  <td>
                    <span className="badge" style={{ background: row.band.bg, color: row.band.color, fontWeight: 900 }}>{row.band.lv}</span>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{row.band.desc}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800 }}>{row.confidence}%</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{row.coveragePct}% coverage</div>
                  </td>
                  <td style={{ minWidth: 240, fontSize: 11, color: '#475569' }}>{row.recommendation}</td>
                </tr>
              ))}
              {(!forecastData || forecastData.rows.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    No trend data available to generate a forecast yet.
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

function OutreachTab({ learners, marks, grade, term, assess, stats, schoolName, grades, currAssessments }) {
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [scope, setScope] = useState('grade');
  const [learnerQuery, setLearnerQuery] = useState('');
  const [selectedAdm, setSelectedAdm] = useState('');

  const gradeLearners = React.useMemo(() => {
    return learners.filter(l => l.grade === grade).sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }, [learners, grade]);

  const atRiskLearners = React.useMemo(() => {
    return gradeLearners.filter(l => {
      // Very basic risk check for listing: if they have any marks, check average
      const lMarks = Object.entries(marks)
        .filter(([k]) => k.startsWith(`${term}:${grade}`))
        .map(([_, v]) => v[l.adm])
        .filter(v => v !== undefined);
      if (!lMarks.length) return false;
      const avg = lMarks.reduce((a,b) => a+Number(b), 0) / lMarks.length;
      return avg < 40;
    });
  }, [gradeLearners, marks, term, grade]);

  const searchableLearners = React.useMemo(() => {
    const q = learnerQuery.trim().toLowerCase();
    return learners
      .filter(l => !q || String(l.name || '').toLowerCase().includes(q) || String(l.adm || '').toLowerCase().includes(q))
      .sort((a,b) => (a.name||'').localeCompare(b.name||''))
      .slice(0, 25);
  }, [learners, learnerQuery]);

  const selectedLearner = React.useMemo(() => {
    return learners.find(l => String(l.adm) === String(selectedAdm)) || null;
  }, [learners, selectedAdm]);

  React.useEffect(() => {
    if (scope === 'learner' && learnerQuery.trim() && searchableLearners.length === 1) {
      if (selectedAdm !== searchableLearners[0].adm) {
        setSelectedAdm(searchableLearners[0].adm);
      }
    }
  }, [scope, learnerQuery, searchableLearners, selectedAdm]);

  const scopedLearners = React.useMemo(() => {
    if (scope === 'school') return learners.filter(l => l.phone);
    if (scope === 'learner') return selectedLearner ? [selectedLearner] : [];
    return gradeLearners;
  }, [scope, learners, selectedLearner, gradeLearners]);

  const scopeLabel = scope === 'school'
    ? `${schoolName || 'the school'}`
    : scope === 'learner'
      ? (selectedLearner?.name || 'one learner')
      : grade;

  const assessLabel = currAssessments?.find(a => a.key === assess)?.label?.replace(/\p{Emoji}/gu, '').trim() || assess.toUpperCase();

  const outreachItems = [
    {
      id: 'results',
      type: 'report',
      title: 'Bulk Result Notifications',
      desc: `Send ${term} ${assessLabel} results to all ${gradeLearners.length} parents in ${grade}.`,
      icon: <Award className="text-blue-600" />,
      color: '#2563eb',
      bg: '#eff6ff',
      count: scopedLearners.length
    },
    {
      id: 'risk',
      type: 'report', // Use report type for at-risk too, but logic filtered in API if we had it, 
                     // for now we'll target specific learners
      title: 'At-Risk Interventions',
      desc: `Send personalized alerts to the ${atRiskLearners.length} parents of learners below 40% average.`,
      icon: <AlertCircle className="text-red-600" />,
      color: '#dc2626',
      bg: '#fef2f2',
      count: scope === 'grade' ? atRiskLearners.length : scopedLearners.length
    },
    {
      id: 'fees',
      type: 'balance',
      title: 'Fee Balance Reminders',
      desc: `Send fee reminders to parents with outstanding balances in ${grade}.`,
      icon: <ShieldAlert className="text-amber-600" />,
      color: '#d97706',
      bg: '#fffbeb',
      count: scopedLearners.length
    }
  ];

  async function handleSend(item) {
    const targets = item.id === 'risk' && scope === 'grade' ? atRiskLearners : scopedLearners;
    if (!targets.length) { alert('No recipients found.'); return; }
    
    if (!confirm(`Are you sure you want to send ${item.title} to ${targets.length} parent(s) for ${scopeLabel}?`)) return;
    
    setSending(true);
    setProgress({ current: 0, total: targets.length });

    try {
      // Process in batches
      const BATCH_SIZE = 5;
      let successful = 0;

      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const res = await fetchWithRetry('/api/comms/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: item.type,
            channel: 'sms',
            term: term,
            assess: item.type === 'report' ? assess : undefined,
            targets: batch.map(l => ({ adm: l.adm, grade: l.grade }))
          }),
          timeout: 30000
        }, 1);
        if (!res) throw new Error('The request was cancelled before the SMS batch completed.');
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(`The server returned an unreadable response (${res.status}).`);
        }
        if (!res.ok) throw new Error(data.error || `Failed to send this SMS batch (${res.status}).`);
        if (data.ok) {
          successful += data.results.filter(r => r.success).length;
        } else {
          alert(data.error || 'Failed to send this SMS batch.');
        }
        setProgress(p => ({ ...p, current: Math.min(p.total, i + BATCH_SIZE) }));
      }

      setSentCount(prev => prev + successful);
      alert(`Successfully queued ${successful} SMS notifications.`);
    } catch (e) {
      console.error('Outreach error:', e);
      alert(e.message || 'A communication error occurred.');
    } finally {
      setSending(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="panel-body p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 900, fontSize: 18 }}>Parent Outreach Scope</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Choose whether this send targets one learner, the selected grade, or the whole school.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, background: 'var(--slate-50)', padding: 4, borderRadius: 12 }}>
              {[
                ['learner', 'One Learner'],
                ['grade', 'Grade'],
                ['school', 'School']
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`btn btn-sm ${scope === key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setScope(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {scope === 'learner' && (
            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} />
                <input
                  value={learnerQuery}
                  onChange={e => setLearnerQuery(e.target.value)}
                  placeholder="Search learner by name or admission number..."
                  style={{ flex: 1, borderRadius: 8, border: '1.5px solid var(--border)', padding: '10px 12px' }}
                />
              </div>
              <select value={selectedAdm} onChange={e => setSelectedAdm(e.target.value)} style={{ borderRadius: 8 }}>
                <option value="">Select learner</option>
                {searchableLearners.map(l => (
                  <option key={l.adm} value={l.adm}>{l.name} · {l.adm} · {l.grade}</option>
                ))}
              </select>
            </div>
          )}

          {scope !== 'learner' && (
            <div style={{ marginTop: 14, color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>
              Targeting {scope === 'school' ? `${scopedLearners.length} learners across ${grades?.length || 'all'} grades` : `${scopedLearners.length} learners in ${grade}`}.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {outreachItems.map(item => (
          <div key={item.id} className="panel hover:border-slate-300 transition-colors" style={{ opacity: sending ? 0.6 : 1 }}>
            <div className="panel-body flex flex-col items-center text-center p-8">
              <div style={{ width: 64, height: 64, borderRadius: 16, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {item.icon}
              </div>
              <h4 style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>{item.title}</h4>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, minHeight: 60 }}>
                {scope === 'grade' ? item.desc : `${item.title} for ${scopeLabel}.`}
              </p>
              <button 
                className="btn btn-sm w-full mt-6" 
                style={{ background: item.color, color: '#fff', border: 'none' }} 
                disabled={sending || item.count === 0}
                onClick={() => handleSend(item)}
              >
                {sending ? 'Sending...' : `Send to ${item.count} Parents`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {sending && (
        <div className="panel" style={{ background: '#F8FAFC', border: '1.5px solid var(--border)' }}>
          <div className="panel-body p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
              <span>🚀 Processing Broadcast...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div style={{ height: 8, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: '#2563EB', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-hdr">
          <h3>👥 Target Recipients in {grade}</h3>
          <span className="badge bg-blue">{gradeLearners.length} Learners</span>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Adm</th>
                <th>Name</th>
                <th>Stream</th>
                <th>Parent Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gradeLearners.map(l => (
                <tr key={l.adm}>
                  <td style={{ fontWeight: 700 }}>{l.adm}</td>
                  <td style={{ fontWeight: 800 }}>{l.name}</td>
                  <td>{l.stream || '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.phone || <span style={{ color: '#DC2626' }}>Missing Phone</span>}</td>
                  <td>
                    <span className={`badge ${l.phone ? 'bg-green' : 'bg-red'}`}>
                      {l.phone ? 'Ready' : 'Incomplete'}
                    </span>
                  </td>
                </tr>
              ))}
              {gradeLearners.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No learners found in {grade}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ background: '#0F172A', border: 'none' }}>
        <div className="panel-body p-8 flex items-center gap-8">
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>💬</div>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>Smart Automation Active</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>EduVantage auto-segments parents by academic performance, attendance, and fee status. Every message is personalized to the learner's specific data points.</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: '#059669', fontSize: 24, fontWeight: 900 }}>{sentCount}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Messages Sent Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffPerformance({ staff, learners, marks, pTerm, pAssess, subjCfg, allocations }) {
  const teacherStats = React.useMemo(() => {
    return staff.filter(t => {
      if (['parent', 'student'].includes(String(t.role || '').toLowerCase())) return false;
      
      let hasAlloc = false;
      Object.entries(allocations || {}).forEach(([key, staffId]) => {
        if (staffId === t.id) hasAlloc = true;
      });
      if (hasAlloc) return true;

      let areas = [];
      try { areas = Array.isArray(t.teachingAreas) ? t.teachingAreas : JSON.parse(t.teachingAreas || '[]'); } catch { areas = []; }
      return areas.length > 0;
    }).map(t => {
      let myAllocations = [];
      Object.entries(allocations || {}).forEach(([key, staffId]) => {
        if (staffId === t.id) {
          const [grade, subject] = key.split('|');
          if (grade && subject) {
            myAllocations.push({ grade, subject });
          }
        }
      });

      if (myAllocations.length === 0) {
        let areas = [];
        try { areas = Array.isArray(t.teachingAreas) ? t.teachingAreas : JSON.parse(t.teachingAreas || '[]'); } catch { areas = []; }
        const tGrade = t.grade || '';
        if (tGrade && areas.length > 0) {
          areas.forEach(subj => {
            myAllocations.push({ grade: tGrade, subject: subj });
          });
        }
      }

      if (myAllocations.length === 0) {
        return {
          ...t,
          avg: 0,
          entries: 0,
          expected: 0,
          completion: 0,
          uniqueGrades: [],
          uniqueSubjects: [],
          subjectCount: 0,
          studentCount: 0,
          recommendation: 'Assign a class or teaching area to activate performance tracking.'
        };
      }

      const uniqueGrades = Array.from(new Set(myAllocations.map(a => a.grade)));
      const uniqueSubjects = Array.from(new Set(myAllocations.map(a => a.subject)));

      const scores = [];
      let entries = 0;
      let expected = 0;

      myAllocations.forEach(alloc => {
        const classLearners = learners.filter(l => l.grade === alloc.grade);
        expected += classLearners.length;
        classLearners.forEach(l => {
          const sc = getMark(marks, pTerm, alloc.grade, alloc.subject, pAssess, l.adm);
          if (sc !== null && sc !== undefined && sc !== '') {
            scores.push(Number(sc));
            entries++;
          }
        });
      });

      const completion = expected > 0 ? (entries / expected) * 100 : 0;
      const avg = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : 0;

      return {
        ...t,
        avg,
        entries,
        expected,
        completion,
        uniqueGrades,
        uniqueSubjects,
        subjectCount: uniqueSubjects.length,
        studentCount: expected,
        recommendation: completion < 70
          ? 'Follow up on mark entry completion and evidence upload.'
          : avg < 50
            ? 'Review lesson delivery, item difficulty, and remedial grouping.'
            : 'Maintain documented teaching approach and mentor lower-performing teams.'
      };
    }).sort((a,b) => b.avg - a.avg);
  }, [staff, learners, marks, pTerm, pAssess, allocations]);

  return (
    <div className="space-y-6">
      <div className="page-hdr" style={{ border: 'none', marginTop: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Staff Effectiveness</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Teaching impact & mark entry discipline</p>
        </div>
      </div>

      <div className="sg sg3">
        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#eff6ff' }}><Activity size={20} /></div>
            <div>
              <div className="sc-l">Active Teachers</div>
              <div className="sc-n">{teacherStats.length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#ecfdf5' }}><ClipboardList size={20} /></div>
            <div>
              <div className="sc-l">Global Entry Rate</div>
              <div className="sc-n">{Math.round(teacherStats.reduce((s,t) => s + t.completion, 0) / (teacherStats.length || 1))}%</div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#f5f3ff' }}><Target size={20} /></div>
            <div>
              <div className="sc-l">Top Teacher Avg</div>
              <div className="sc-n">{Math.round(teacherStats[0]?.avg || 0)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <h3>Teacher Efficiency Matrix</h3>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Assigned Grades</th>
                <th>Subjects</th>
                <th>Class Avg</th>
                <th>Entry Completion</th>
                <th>Efficiency Score</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {teacherStats.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{t.name?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.role || 'Teacher'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {t.uniqueGrades && t.uniqueGrades.length > 0 ? (
                      t.uniqueGrades.map(g => (
                        <span key={g} className="badge bg-blue" style={{ marginRight: 4, display: 'inline-block', marginBottom: 2 }}>{g}</span>
                      ))
                    ) : (
                      <span className="badge bg-blue">Floating</span>
                    )}
                  </td>
                  <td>{t.uniqueSubjects && t.uniqueSubjects.length > 0 ? t.uniqueSubjects.join(', ') : 'No subjects'}</td>
                  <td style={{ fontWeight: 800, color: t.avg >= 70 ? '#059669' : t.avg >= 50 ? '#2563eb' : '#dc2626' }}>{Math.round(t.avg)}%</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 10, minWidth: 80, overflow: 'hidden' }}>
                        <div style={{ width: `${t.completion}%`, height: '100%', background: t.completion >= 90 ? '#059669' : t.completion >= 50 ? '#D97706' : '#DC2626' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{Math.round(t.completion)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.completion >= 80 && t.avg >= 60 ? 'bg-green' : t.completion < 50 ? 'bg-red' : 'bg-blue'}`}>
                      {t.completion >= 80 && t.avg >= 60 ? 'High Impact' : t.completion < 50 ? 'Requires Follow-up' : 'Steady'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: '#475569', minWidth: 220 }}>{t.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildInsightActions(stats, labels = {}) {
  const weakest   = stats.subjectMastery?.[stats.subjectMastery.length - 1];
  const strongest = stats.subjectMastery?.[0];
  const subj   = labels.subject   || 'Subject';
  const learners = labels.learners || 'learners';
  const assessment = labels.assessment || 'assessment';
  return [
    {
      icon: <ShieldAlert size={17} />,
      color: '#dc2626',
      bg: '#FEF2F2',
      title: 'Intervention List',
      text: `${stats.riskCount || 0} ${learners} are below 40%. Create a small-group remediation list and assign weekly evidence checks.`
    },
    {
      icon: <Target size={17} />,
      color: '#d97706',
      bg: '#FFFBEB',
      title: weakest ? `${subj} Recovery: ${weakest.name}` : `${subj} Recovery`,
      text: weakest
        ? `${weakest.name} is averaging ${weakest.average}%. Audit strand coverage, teacher workload, and item difficulty before the next ${assessment}.`
        : `No ${subj.toLowerCase()} marks have been captured for this view yet.`
    },
    {
      icon: <Award size={17} />,
      color: '#059669',
      bg: '#ECFDF5',
      title: strongest ? `Scale What Works: ${strongest.name}` : 'Scale What Works',
      text: strongest
        ? `${strongest.name} is the current strength. Reuse the teaching approach, revision rhythm, and ${assessment} design in weaker ${subj.toLowerCase()}s.`
        : `Capture marks to identify reusable teaching strengths.`
    },
    {
      icon: <ClipboardList size={17} />,
      color: '#2563eb',
      bg: '#EFF6FF',
      title: 'Data Completeness',
      text: `Marks coverage is ${stats.completionRate || 0}%. Missing entries weaken ranking accuracy, parent reports, and trend analysis.`
    }
  ];
}

function pct(n) {
  if (!Number.isFinite(Number(n))) return 0;
  return Math.round(Number(n));
}

function PerformanceDetail({ learners, marks, grade, term, assess, subjCfg, gradCfg, curriculum, stream, setStream, query }) {
  const subjects = (subjCfg[grade] && subjCfg[grade].length > 0) ? subjCfg[grade] : getDefaultSubjects(grade, curriculum);
  const streams = React.useMemo(() => {
    return [...new Set(learners.filter(l => l.grade === grade && l.stream).map(l => l.stream))].sort();
  }, [learners, grade]);

  const data = React.useMemo(() => {
    return buildMeritList(learners, marks, grade, term, assess, gradCfg, curriculum, subjects)
      .filter(l => !stream || l.stream === stream)
      .filter(l => {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return true;
        return String(l.name || '').toLowerCase().includes(q) || String(l.adm || '').toLowerCase().includes(q);
      });
  }, [learners, marks, grade, term, assess, gradCfg, curriculum, stream, query, subjects]);

  const analysis = React.useMemo(() => {
    const classLearners = learners.filter(l => l.grade === grade && (!stream || l.stream === stream));
    const averages = data.map(l => l.enteredCount ? l.totalMarks / l.enteredCount : 0);
    const avg = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;
    const subjectRows = subjects.map(subj => {
      const scores = data
        .map(l => l.detail.find(d => d.subj === subj)?.score)
        .filter(s => s !== null && s !== undefined);
      const avg = scores.length ? scores.reduce((a, b) => a + Number(b), 0) / scores.length : 0;
      const high = scores.length ? Math.max(...scores) : 0;
      const low = scores.length ? Math.min(...scores) : 0;
      const pass = scores.filter(s => Number(s) >= 50).length;
      return {
        name: subj,
        avg: Number(avg.toFixed(1)),
        high,
        low,
        entries: scores.length,
        missing: Math.max(0, classLearners.length - scores.length),
        passRate: scores.length ? Number(((pass / scores.length) * 100).toFixed(1)) : 0
      };
    }).map(s => ({ ...s, deviation: Number((s.avg - avg).toFixed(1)) }))
      .sort((a, b) => b.avg - a.avg)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const top = data[0];
    const bottom = data[data.length - 1];
    const risk = data.filter(l => (l.totalMarks / (l.enteredCount || 1)) < 40);
    const excellence = data.filter(l => (l.totalMarks / (l.enteredCount || 1)) >= 80);
    const avgVap = data.length ? data.reduce((sum, l) => sum + (Number(l.vap) || 0), 0) / data.length : 0;
    const variance = averages.length ? averages.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / averages.length : 0;
    const stdDev = Number(Math.sqrt(variance).toFixed(1));
    const missingCount = subjectRows.reduce((sum, s) => sum + s.missing, 0);
    const entries = subjectRows.reduce((sum, s) => sum + s.entries, 0);
    const expected = Math.max(1, classLearners.length * subjects.length);
    const distribution = [
      { name: '80-100', count: averages.filter(a => a >= 80).length, color: '#059669' },
      { name: '60-79', count: averages.filter(a => a >= 60 && a < 80).length, color: '#2563EB' },
      { name: '40-59', count: averages.filter(a => a >= 40 && a < 60).length, color: '#D97706' },
      { name: '0-39', count: averages.filter(a => a < 40).length, color: '#DC2626' }
    ];

    return {
      classLearners,
      subjectRows,
      avg: Number(avg.toFixed(1)),
      top,
      bottom,
      risk,
      excellence,
      avgVap: Number(avgVap.toFixed(1)),
      stdDev,
      entries,
      missingCount,
      coverage: Number(((entries / expected) * 100).toFixed(1)),
      distribution
    };
  }, [learners, grade, stream, subjects, data]);

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-hdr">
          <div>
            <h3>Command Summary — {grade}</h3>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>
              {term} · {assess.toUpperCase()} · {analysis.classLearners.length} enrolled learners · {data.length} ranked learners
            </div>
          </div>
          <select value={stream} onChange={e => setStream(e.target.value)} style={{ borderRadius: 8, border: '1.5px solid var(--border)', padding: '8px 12px' }}>
            <option value="">All streams</option>
            {streams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="panel-body">
          <div className="sg sg4" style={{ marginBottom: 0 }}>
            <Metric title="Class Avg" value={`${analysis.avg}%`} icon={<Gauge size={19} />} color="#2563EB" sub="Mean learner performance" />
            <Metric title="Coverage" value={`${analysis.coverage}%`} icon={<ClipboardList size={19} />} color="#7C3AED" sub={`${analysis.entries} entries, ${analysis.missingCount} missing`} />
            <Metric title="At Risk" value={analysis.risk.length} icon={<ShieldAlert size={19} />} color="#DC2626" sub="Learners below 40%" />
            <Metric title="Excellence" value={analysis.excellence.length} icon={<Award size={19} />} color="#059669" sub="Learners at 80%+" />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18, border: '2px solid #0F172A' }}>
        <div className="panel-hdr" style={{ background: '#0F172A', color: '#fff' }}>
          <div>
            <h3 style={{ color: '#fff' }}>Official Exam Summary</h3>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }}>
              {grade} {stream ? `· ${stream}` : ''} · {term} · {assess.toUpperCase()} · generated from verified marks
            </div>
          </div>
          <span className="badge bg-gold">For administration</span>
        </div>
        <div className="panel-body">
          <div className="sg sg4" style={{ marginBottom: 14 }}>
            <Metric title="Candidates" value={analysis.classLearners.length} icon={<Users size={19} />} color="#0F172A" sub={`${data.length} with marks`} />
            <Metric title="Mean Score" value={`${analysis.avg}%`} icon={<Gauge size={19} />} color="#2563EB" sub={`Std deviation ${analysis.stdDev}`} />
            <Metric title="Mean VAP" value={`${analysis.avgVap > 0 ? '+' : ''}${analysis.avgVap}`} icon={<TrendingUp size={19} />} color={analysis.avgVap >= 0 ? '#059669' : '#DC2626'} sub="Change from previous assessment" />
            <Metric title="Top Candidate" value={analysis.top?.name ? `#${analysis.top.rank}` : '—'} icon={<Award size={19} />} color="#D97706" sub={analysis.top?.name || 'No ranked learner'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, border: '1.5px solid var(--border)', borderRadius: 12, background: '#F8FAFC' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Subject Strength</div>
              <div style={{ fontWeight: 900, marginTop: 4 }}>{analysis.subjectRows[0]?.name || '—'}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>Mean {analysis.subjectRows[0]?.avg || 0}% · deviation {analysis.subjectRows[0]?.deviation > 0 ? '+' : ''}{analysis.subjectRows[0]?.deviation || 0}</div>
            </div>
            <div style={{ padding: 14, border: '1.5px solid var(--border)', borderRadius: 12, background: '#FFF7ED' }}>
              <div style={{ fontSize: 11, color: '#B45309', fontWeight: 800, textTransform: 'uppercase' }}>Priority Subject</div>
              <div style={{ fontWeight: 900, marginTop: 4 }}>{analysis.subjectRows[analysis.subjectRows.length - 1]?.name || '—'}</div>
              <div style={{ fontSize: 12, color: '#92400E' }}>Schedule item analysis and remedial work before next assessment.</div>
            </div>
            <div style={{ padding: 14, border: '1.5px solid var(--border)', borderRadius: 12, background: '#EFF6FF' }}>
              <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 800, textTransform: 'uppercase' }}>Recommendation</div>
              <div style={{ fontSize: 12, color: '#1E3A8A', marginTop: 4, lineHeight: 1.55 }}>
                {analysis.coverage < 90 ? 'Complete missing marks before publishing official summaries.' : analysis.risk.length > 0 ? 'Approve intervention groups and parent communication for learners below 40%.' : 'Maintain current programme and document the teaching practices behind the strongest subject.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sg sg2" style={{ alignItems: 'stretch' }}>
        <div className="panel">
          <div className="panel-hdr"><h3>Subject Diagnostic Matrix</h3></div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Subject</th><th>Avg</th><th>Deviation</th><th>High</th><th>Low</th><th>Pass Rate</th><th>Missing</th><th>Signal</th></tr></thead>
              <tbody>
                {analysis.subjectRows.map(s => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 900 }}>#{s.rank}</td>
                    <td style={{ fontWeight: 800 }}>{s.name}</td>
                    <td>{s.avg}%</td>
                    <td style={{ fontWeight: 800, color: s.deviation >= 0 ? '#059669' : '#DC2626' }}>{s.deviation > 0 ? '+' : ''}{s.deviation}</td>
                    <td>{s.high}</td>
                    <td>{s.low}</td>
                    <td><Progress value={s.passRate} color={s.passRate >= 70 ? '#059669' : s.passRate >= 45 ? '#D97706' : '#DC2626'} /></td>
                    <td>{s.missing}</td>
                    <td><span className={`badge ${s.avg >= 70 ? 'bg-green' : s.avg >= 50 ? 'bg-amber' : 'bg-red'}`}>{s.avg >= 70 ? 'Strong' : s.avg >= 50 ? 'Watch' : 'Intervene'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr"><h3>Performance Bands</h3></div>
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={analysis.distribution} innerRadius={58} outerRadius={86} dataKey="count" nameKey="name">
                  {analysis.distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gap: 8 }}>
              {analysis.distribution.map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />{d.name}% band</span>
                  <strong>{d.count} learners</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sg sg2">
        <LearnerList title="Immediate Intervention" learners={analysis.risk.slice(0, 12)} tone="danger" />
        <LearnerList title="Top Performers" learners={analysis.excellence.slice(0, 12)} tone="success" />
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <div>
            <h3>Class Rankings & Markbook — {grade}</h3>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}><Search size={13} style={{ display: 'inline', marginRight: 4 }} />Filtered by current stream/search controls</div>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th><th>Adm</th><th>Name</th><th>Stream</th>
                {subjects.map(s => <th key={s} style={{ fontSize: 9 }}>{s.slice(0, 6)}</th>)}
                <th>Total Pts</th><th>Total Marks</th><th>Avg %</th><th>Deviation</th><th>VAP</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(l => {
                const average = l.enteredCount ? l.totalMarks / l.enteredCount : 0;
                const deviation = Number((average - analysis.avg).toFixed(1));
                return (
                  <tr key={l.adm}>
                    <td style={{ fontWeight: 900 }}>#{l.rank}</td>
                    <td>{l.adm}</td>
                    <td style={{ fontWeight: 700 }}>{l.name}</td>
                    <td>{l.stream || '—'}</td>
                    {l.detail.map((d, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800 }}>{d.score ?? '—'}</div>
                        <div style={{ fontSize: 10, color: d.c || 'var(--muted)' }}>{d.lv || '—'}{d.sRank ? ` #${d.sRank}` : ''}</div>
                      </td>
                    ))}
                    <td style={{ fontWeight: 900, color: '#8B1A1A' }}>{l.totalPts}</td>
                    <td style={{ fontWeight: 800 }}>{l.totalMarks}</td>
                    <td style={{ fontWeight: 800 }}>{pct(average)}%</td>
                    <td style={{ fontWeight: 800, color: deviation >= 0 ? '#059669' : '#DC2626' }}>{deviation > 0 ? '+' : ''}{deviation}</td>
                    <td style={{ fontWeight: 800, color: l.vap >= 0 ? '#059669' : '#DC2626' }}>{l.vap > 0 ? '+' : ''}{l.vap || 0}</td>
                    <td><span className={`badge ${average >= 80 ? 'bg-green' : average >= 50 ? 'bg-blue' : average >= 40 ? 'bg-amber' : 'bg-red'}`}>{average >= 80 ? 'Excellent' : average >= 50 ? 'Secure' : average >= 40 ? 'Watch' : 'Urgent'}</span></td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan={subjects.length + 10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No marks found for this selection.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Metric({ title, value, sub, icon, color }) {
  return (
    <div className="stat-card" style={{ boxShadow: 'none', borderColor: `${color}33` }}>
      <div className="sc-inner">
        <div className="sc-icon" style={{ background: `${color}14`, color }}>{icon}</div>
        <div>
          <div className="sc-l">{title}</div>
          <div className="sc-n">{value}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 5 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function Progress({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color }} />
      </div>
      <strong style={{ fontSize: 11 }}>{value}%</strong>
    </div>
  );
}

function LearnerList({ title, learners, tone }) {
  const color = tone === 'danger' ? '#DC2626' : '#059669';
  const bg = tone === 'danger' ? '#FEF2F2' : '#ECFDF5';
  return (
    <div className="panel">
      <div className="panel-hdr"><h3 style={{ color }}>{title}</h3></div>
      <div className="panel-body" style={{ display: 'grid', gap: 8 }}>
        {learners.map(l => {
          const avg = l.enteredCount ? l.totalMarks / l.enteredCount : 0;
          return (
            <div key={l.adm} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 11, borderRadius: 12, background: bg, border: `1px solid ${color}22` }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>{l.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Adm {l.adm} · Rank #{l.rank} · {l.stream || 'No stream'}</div>
              </div>
              <strong style={{ color }}>{pct(avg)}%</strong>
            </div>
          );
        })}
        {learners.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No learners in this band for the current selection.</div>}
      </div>
    </div>
  );
}

function PathwaysTab({ grade, term, learners, marks, curriculum, subjects }) {
  const gradeLearners = learners.filter(l => l.grade === grade);
  
  const mapped = gradeLearners.map(l => {
    let total = 0, count = 0;
    const scores = [];
    subjects.forEach(s => {
      ['et1', 'mt1', 'op1'].forEach(assess => {
        const score = getMark(marks, term, grade, s, assess, l.adm);
        if (score !== null) {
          total += score;
          count++;
          scores.push({ subject: s, score });
        }
      });
    });
    
    const avg = count ? Math.round(total / count) : 0;
    let pathway = 'General Education';
    let pathwayColor = 'var(--blue)';
    
    if (curriculum === 'CBC') {
      if (['GRADE 7','GRADE 8','GRADE 9'].includes(grade)) {
        const stemScores = scores.filter(s => ['Math','Science','Computer','Pre-Technical'].some(x => s.subject.includes(x)));
        const artsScores = scores.filter(s => ['Art','Music','Sports','Creative'].some(x => s.subject.includes(x)));
        const socScores = scores.filter(s => ['Social','Language','English','Kiswahili'].some(x => s.subject.includes(x)));
        
        const avgStem = stemScores.length ? stemScores.reduce((a, b) => a + b.score, 0) / stemScores.length : 0;
        const avgArts = artsScores.length ? artsScores.reduce((a, b) => a + b.score, 0) / artsScores.length : 0;
        const avgSoc = socScores.length ? socScores.reduce((a, b) => a + b.score, 0) / socScores.length : 0;
        
        if (avgStem >= avgArts && avgStem >= avgSoc && avgStem > 50) { pathway = 'STEM Pathway'; pathwayColor = 'var(--blue)'; }
        else if (avgArts >= avgStem && avgArts >= avgSoc && avgArts > 50) { pathway = 'Arts & Sports Pathway'; pathwayColor = 'var(--amber)'; }
        else if (avgSoc > 50) { pathway = 'Social Sciences Pathway'; pathwayColor = 'var(--green)'; }
        else { pathway = 'General / Remedial'; pathwayColor = 'var(--red)'; }
      } else {
         pathway = 'Progression to Next Grade';
         pathwayColor = 'var(--green)';
      }
    } else if (curriculum === 'TVET') {
      if (avg >= 70) { pathway = 'Diploma / Advanced Diploma'; pathwayColor = 'var(--green)'; }
      else if (avg >= 50) { pathway = 'Certificate Level'; pathwayColor = 'var(--blue)'; }
      else { pathway = 'Artisan Level / Retrain'; pathwayColor = 'var(--amber)'; }
    } else if (curriculum === 'Cambridge' || curriculum === 'British') {
      if (avg >= 70) { pathway = 'A-Level (Extended)'; pathwayColor = 'var(--green)'; }
      else if (avg >= 50) { pathway = 'AS-Level (Core)'; pathwayColor = 'var(--blue)'; }
      else { pathway = 'Vocational Training'; pathwayColor = 'var(--amber)'; }
    } else {
      if (avg >= 60) { pathway = 'Advanced Stream'; pathwayColor = 'var(--green)'; }
      else { pathway = 'General Stream'; pathwayColor = 'var(--blue)'; }
    }
    
    return { ...l, avg, pathway, pathwayColor };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-hdr">
        <h3>Learner Pathways Analysis — {grade}</h3>
        <p>Curriculum-aware tracking mapping current performance to optimal educational tracks.</p>
      </div>
      <div className="panel-body">
        {mapped.length > 0 ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adm</th>
                  <th>Learner Name</th>
                  <th>Current Avg</th>
                  <th>Recommended Pathway</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mapped.map(l => (
                  <tr key={l.adm}>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.adm}</td>
                    <td style={{ fontWeight: 700 }}>{l.name}</td>
                    <td>{l.avg}%</td>
                    <td>
                      <span className="badge" style={{ background: l.pathwayColor + '15', color: l.pathwayColor, border: `1px solid ${l.pathwayColor}30` }}>
                        {l.pathway}
                      </span>
                    </td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => window.open(`/report-card?adm=${l.adm}`, '_blank')}>Review Profile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            No learner data available for pathway analysis in {grade}.
          </div>
        )}
      </div>
    </div>
  );
}
