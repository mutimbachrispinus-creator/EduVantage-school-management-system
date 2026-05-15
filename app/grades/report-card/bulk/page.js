'use client';
export const runtime = 'edge';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  promotionStatus,
} from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { useSchoolProfile } from '@/lib/school-profile';

const ASSESSMENTS = [
  { key: 'op1', label: 'Opener'   },
  { key: 'mt1', label: 'Mid-Term' },
  { key: 'et1', label: 'End-Term' },
];

function BulkReportCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const grade = searchParams.get('grade') || '';
  const stream = searchParams.get('stream') || '';
  const term = searchParams.get('term') || 'T1';

  const [learners, setLearners] = useState([]);
  const [marks,   setMarks]   = useState({});
  const [feeCfg,  setFeeCfg]  = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const school = useSchoolProfile();
  const [loading, setLoading] = useState(true);

  const curr = getCurriculum(school?.curriculum || 'CBC');
  const { DEFAULT_SUBJECTS, gInfo, maxPts, JSS_SCALE, PRIMARY_SCALE } = curr;
  const isJSSGrade = curr.isJSSGrade || curr.isSecondary || (() => false);

  useEffect(() => {
    if (!grade) return;
    async function load() {
      const authRes = await fetch('/api/auth');
      const auth    = await authRes.json();
      if (!auth.ok) { router.push('/'); return; }

      const dbRes = await fetch('/api/db', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requests: [
          { type: 'get', key: 'paav6_learners' },
          { type: 'get', key: 'paav6_marks'    },
          { type: 'get', key: 'paav6_feecfg'   },
          { type: 'get', key: 'paav8_grad'     },
        ]}),
      });
      const db = await dbRes.json();

      const allLearners = db.results[0]?.value || [];
      // Filter by grade and stream
      const filtered = allLearners.filter(l => l.grade === grade && (!stream || l.stream === stream));
      
      setLearners(filtered);
      setMarks(  db.results[1]?.value || {});
      setFeeCfg( db.results[2]?.value || {});
      setGradCfg(db.results[3]?.value || null);

      setLoading(false);
    }
    load();
  }, [grade, stream, router]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading {learners.length ? 'report cards...' : 'data...'}</div>;
  if (learners.length === 0) return <div style={{ padding: 40 }}>No learners found for {grade} {stream}.</div>;

  const dateStr = new Date().toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      {/* ── Controls bar (hidden on print) ── */}
      <div className="no-print" style={{ padding: '14px 22px', background: 'linear-gradient(135deg,#1e293b,#0f172a)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
          🖨️ Bulk Report Cards — {grade} {stream} ({learners.length} learners)
        </span>
        <button onClick={() => window.print()} className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }}>
          🖨️ Print All ({learners.length} Pages)
        </button>
      </div>

      <div style={{ background: '#e8edf3', minHeight: '100vh' }} className="no-print-bg">
        {learners.map((learner, idx) => {
          const subjects  = DEFAULT_SUBJECTS[learner.grade] || [];
          const scale     = isJSSGrade(learner.grade) ? JSS_SCALE : PRIMARY_SCALE;
          const annualFee = feeCfg[learner.grade]?.annual || 5000;
          const paid      = (learner.t1||0)+(learner.t2||0)+(learner.t3||0);
          const balance   = annualFee - paid;

          const rows = subjects.map(subj => {
            const cells = ASSESSMENTS.map(a => {
              const k1  = `${term}:${learner.grade}|${subj}|${a.key}`;
              const k0  = `${learner.grade}|${subj}|${a.key}`;
              const sc  = marks[k1]?.[learner.adm] ?? marks[k0]?.[learner.adm];
              const inf = sc !== undefined ? gInfo(Number(sc), learner.grade, gradCfg) : null;
              return { score: sc, inf };
            });
            
            const scores = cells.filter(c => c.score !== undefined).map(c => Number(c.score));
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
            const avgInf = avgScore !== undefined ? gInfo(avgScore, learner.grade, gradCfg) : null;

            return { subj, cells, avgCell: { score: avgScore, inf: avgInf } };
          });

          const entered  = rows.filter(r => r.avgCell.score !== undefined);
          const totalPts = entered.reduce((s, r) => s + (r.avgCell.inf?.pts||0), 0);
          const maxTotal = maxPts(learner.grade, subjects);
          const promoSt  = promotionStatus(totalPts, maxTotal);
          const pct      = maxTotal ? Math.round((totalPts/maxTotal)*100) : 0;

          const openerTotal = rows.reduce((s, r) => s + (Number(r.cells[0].score) || 0), 0);
          const midTotal    = rows.reduce((s, r) => s + (Number(r.cells[1].score) || 0), 0);
          const endTotal    = rows.reduce((s, r) => s + (Number(r.cells[2].score) || 0), 0);
          const avgTotal    = rows.reduce((s, r) => s + (Number(r.avgCell.score) || 0), 0);

          const promoColor = promoSt === 'promote' ? '#059669' : promoSt === 'review' ? '#D97706' : '#DC2626';
          const promoText  = promoSt === 'promote' ? '✅ PROMOTED' : promoSt === 'review' ? '⚠ UNDER REVIEW' : '❌ RETAIN';

          return (
            <div key={learner.adm} className="rc-page" style={{ 
              pageBreakAfter: 'always', 
              padding: '32px 0 48px', 
              display: 'flex', 
              justifyContent: 'center' 
            }}>
              {/* ══ A4 Card ══ */}
              <div className="rc-a4" style={{
                boxShadow: '0 8px 40px rgba(0,0,0,.18)',
                border: '1px solid #e2e8f0',
                background: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>

                {/* Watermark */}
                <div style={{ position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%) rotate(-25deg)',
                  fontSize: 140, fontWeight: 900, color: 'rgba(139,26,26,0.035)',
                  pointerEvents: 'none', zIndex: 0, userSelect: 'none',
                  fontFamily: 'Sora,sans-serif', letterSpacing: 8 }}>{school.name.split(' ')[0]}</div>

                {/* ── HEADER ── */}
                <div className="rc-hdr" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <div className="rc-hdr-logo" style={{ background: 'transparent' }}>
                    {school.logo ? (
                      <img src={school.logo} alt="Logo" style={{ width: 65, height: 65, objectFit: 'contain' }} />
                    ) : '🏫'}
                  </div>
                  <div className="rc-hdr-center">
                    <div className="rc-school">{school.name}</div>
                    <div className="rc-hdr-sub">{school.location} &nbsp;·&nbsp; Tel: {school.tel}</div>
                    <div>
                      <span className="rc-badge">
                        ACADEMIC PROGRESS REPORT &nbsp;·&nbsp; {curr.name} &nbsp;·&nbsp; TERM {term.replace('T','')} &nbsp;·&nbsp; {new Date().getFullYear()}
                      </span>
                    </div>
                    <div className="rc-motto">{school.motto}</div>
                  </div>
                  <div className="rc-hdr-stamp" style={{ width: 'auto' }}>
                    <div style={{ fontWeight: 700, fontSize: 9, color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: .5 }}>Date Issued</div>
                    <div style={{ fontWeight: 600 }}>{dateStr}</div>
                    <div style={{ marginTop: 4, padding: '3px 8px', background: '#FDF2F2', borderRadius: 6,
                      border: '1px solid #FECACA', fontSize: 8.5, color: '#8B1A1A', fontWeight: 700 }}>
                      OFFICIAL COPY
                    </div>
                  </div>
                </div>

                {/* ── LEARNER INFO ── */}
                <div className="rc-learner-info" style={{ position: 'relative', zIndex: 1 }}>
                  {[
                    ['Name',             learner.name ],
                    ['Admission No.',    learner.adm  ],
                    ['Grade',            learner.grade],
                    ['Sex',              learner.sex || '—'],
                    ['Stream',           learner.stream || '—'],
                    ['Class Teacher',    learner.teacher || '—'],
                    ['Parent/Guardian',  learner.parent || '—'],
                    ['Phone',            learner.phone || '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="rc-info-row">
                      <span className="rc-info-label">{label}</span>
                      <strong style={{ fontSize: 10, color: '#1e293b' }}>{val}</strong>
                    </div>
                  ))}
                </div>

                {/* ── PERFORMANCE GRAPHS ── */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: 15, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  
                  {/* Trend Graph */}
                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 15px', background: 'white' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>📊 Termly Assessment Trend</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 60, paddingLeft: 5 }}>
                      {[
                        { label: 'Opener', total: openerTotal, color: '#8B1A1A' },
                        { label: 'Mid-Term', total: midTotal, color: '#D97706' },
                        { label: 'End-Term', total: endTotal, color: '#2563EB' },
                        { label: 'Average', total: avgTotal, color: '#059669' },
                      ].map(g => {
                        const maxVal = Math.max(openerTotal, midTotal, endTotal, avgTotal, 1);
                        const barH = (g.total / maxVal) * 40;
                        return (
                          <div key={g.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 45 }}>
                            <div style={{ fontSize: 9, fontWeight: 900, color: g.color }}>{g.total}</div>
                            <div style={{ width: 25, height: barH, background: g.color, borderRadius: '3px 3px 0 0', opacity: 0.9 }} />
                            <div style={{ fontSize: 7, fontWeight: 700, color: '#64748b' }}>{g.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Subject Comparison Graph */}
                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 15px', background: 'white' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>📈 Subject-wise Proficiency</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60, overflowX: 'auto', paddingBottom: 5 }}>
                      {rows.map(r => {
                        const score = r.avgCell.score || 0;
                        const barH = (score / 100) * 40;
                        const color = r.avgCell.inf?.bg || '#cbd5e1';
                        return (
                          <div key={r.subj} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 28 }}>
                            <div style={{ fontSize: 8, fontWeight: 900, color: r.avgCell.inf?.c || '#666' }}>{score}</div>
                            <div style={{ width: 14, height: barH, background: color, borderRadius: '2px 2px 0 0' }} />
                            <div style={{ fontSize: 6, fontWeight: 700, color: '#94a3b8', textAlign: 'center', width: 28, overflow: 'hidden' }}>{r.subj.slice(0,3)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* ── MARKS TABLE ── */}
                <table className="rc-subj-table" style={{ position: 'relative', zIndex: 1 }}>
                  <thead>
                    <tr>
                      <th>Learning Area / Subject</th>
                      <th>Opener<br/><span style={{fontWeight:400,fontSize:7.5,opacity:.8}}>(Score)</span></th>
                      <th>Mid-Term<br/><span style={{fontWeight:400,fontSize:7.5,opacity:.8}}>(Score)</span></th>
                      <th>End-Term<br/><span style={{fontWeight:400,fontSize:7.5,opacity:.8}}>(Score)</span></th>
                      <th style={{ background: 'rgba(255,255,255,0.1)' }}>Avg<br/><span style={{fontWeight:400,fontSize:7.5,opacity:.8}}>(Score)</span></th>
                      <th>Grade<br/><span style={{fontWeight:400,fontSize:7.5,opacity:.8}}>(Level)</span></th>
                      <th>Pts</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ subj, cells, avgCell }) => {
                      return (
                        <tr key={subj}>
                          <td>{subj}</td>
                          {cells.map((c, ci) => (
                            <td key={ci} style={{ textAlign: 'center', padding: '4px 2px' }}>
                              {c.score !== undefined ? (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                  <span style={{ fontWeight: 800, fontSize: 11 }}>{c.score}</span>
                                  {c.inf && (
                                    <span style={{ padding:'1px 5px', borderRadius:8, fontSize:8, fontWeight:900,
                                      background:c.inf.bg, color:c.inf.c }}>
                                      {c.inf.lv}
                                    </span>
                                  )}
                                </div>
                              ) : <span style={{color:'#cbd5e1'}}>—</span>}
                            </td>
                          ))}
                          <td style={{ textAlign: 'center', background: 'rgba(0,0,0,0.02)', fontWeight: 800, fontSize: 12 }}>
                            {avgCell.score !== undefined ? avgCell.score : <span style={{color:'#cbd5e1'}}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {avgCell.inf ? (
                              <span style={{ fontWeight: 900, color: avgCell.inf.c,
                                background: avgCell.inf.bg, padding: '2px 8px',
                                borderRadius: 10, fontSize: 9, display:'inline-block' }}>
                                {avgCell.inf.lv}
                              </span>
                            ) : <span style={{color:'#cbd5e1'}}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 900,
                            color: avgCell.inf ? avgCell.inf.c : '#cbd5e1', fontSize: 12 }}>
                            {avgCell.inf ? avgCell.inf.pts : '—'}
                          </td>
                          <td style={{ fontSize: 9, color: '#64748b' }}>
                            {avgCell.inf ? avgCell.inf.desc.split(' — ')[0] : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Marks row */}
                    {entered.length > 0 && (
                      <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: 11 }}>
                        <td style={{ paddingLeft: 12, textTransform: 'uppercase' }}>Total Marks</td>
                        <td style={{ textAlign: 'center' }}>{openerTotal}</td>
                        <td style={{ textAlign: 'center' }}>{midTotal}</td>
                        <td style={{ textAlign: 'center' }}>{endTotal}</td>
                        <td style={{ textAlign: 'center', background: 'rgba(0,0,0,0.05)' }}>{avgTotal}</td>
                        <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12, color: 'var(--muted)', fontSize: 9 }}>
                          Sum of percentage scores
                        </td>
                      </tr>
                    )}

                    {/* Total Points row */}
                    {entered.length > 0 && (
                      <tr className="rc-total-row">
                        <td colSpan={5} style={{ paddingLeft: 12 }}>
                          TOTAL POINTS &nbsp;·&nbsp; <span style={{fontWeight:500,fontSize:9,opacity:.7}}>({entered.length} of {subjects.length} subjects entered)</span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 14 }}>
                          {totalPts}<span style={{fontSize:9,opacity:.7,fontWeight:500}}>/{maxTotal}</span>
                        </td>
                        <td colSpan={2} style={{ textAlign: 'center', fontSize: 10, fontWeight:700 }}>{pct}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* ── CBC SCALE LEGEND ── */}
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, textTransform:'uppercase', color:'#94a3b8',
                    marginBottom: 5, letterSpacing: .6 }}>{curr.name} Grading Scale:</div>
                  <div className="rc-scale-legend">
                    {scale.map((s, i) => {
                      const nextMin = scale[i-1]?.min ?? 100;
                      const upper   = i === 0 ? 100 : nextMin - 1;
                      return (
                        <span key={s.lv} className="rc-scale-pip"
                          style={{ background: s.bg, color: s.c, borderColor: s.c+'40' }}>
                          {s.lv}: {s.min}–{upper} ({s.pts}pts)
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* ── STATUS BOXES ── */}
                <div className="rc-status-grid" style={{ position:'relative', zIndex:1 }}>
                  <div className="rc-status-box" style={{ borderColor: promoColor+'44', background: promoColor+'0a' }}>
                    <div className="rc-status-label">Promotion Recommendation</div>
                    <div className="rc-status-value" style={{ color: promoColor }}>{promoText}</div>
                    <div style={{ marginTop:4, fontSize:9, color:'#64748b' }}>
                      Score: {totalPts}/{maxTotal} pts &nbsp;({pct}%)
                    </div>
                  </div>
                  <div className="rc-status-box" style={{
                    borderColor: balance<=0 ? '#05966944':'#DC262644',
                    background:   balance<=0 ? '#05966906':'#DC262606',
                  }}>
                    <div className="rc-status-label">Fee Balance — {new Date().getFullYear()}</div>
                    <div className="rc-status-value" style={{ color: balance<=0 ? '#059669':'#DC2626' }}>
                      {balance<=0 ? '✅ CLEARED' : `KSH ${balance.toLocaleString()} OWING`}
                    </div>
                    <div style={{ marginTop:4, fontSize:9, color:'#64748b' }}>
                      Annual: KSH {annualFee.toLocaleString()} &nbsp;·&nbsp; Paid: KSH {paid.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* ── REMARKS ── */}
                <div className="rc-remarks" style={{ position: 'relative', zIndex: 1, marginTop: 12, display: 'grid', gap: 10 }}>
                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Class Teacher's Remarks</div>
                    <div style={{ borderBottom: '1px dotted #cbd5e1', height: 20, marginBottom: 8 }} />
                    <div style={{ borderBottom: '1px dotted #cbd5e1', height: 20 }} />
                  </div>
                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Head Teacher's Remarks</div>
                    <div style={{ borderBottom: '1px dotted #cbd5e1', height: 20, marginBottom: 8 }} />
                    <div style={{ borderBottom: '1px dotted #cbd5e1', height: 20 }} />
                  </div>
                  <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Parent / Guardian Remarks</div>
                    <div style={{ borderBottom: '1px dotted #cbd5e1', height: 20 }} />
                  </div>
                </div>

                {/* ── SIGNATURES ── */}
                <div className="rc-sigs" style={{ position:'relative', zIndex:1, marginTop: 20 }}>
                  {['Class Teacher','Head Teacher','Parent / Guardian'].map(role => (
                    <div key={role} className="rc-sig-box">
                      <div className="rc-sig-line" />
                      <div className="rc-sig-label">{role}</div>
                    </div>
                  ))}
                </div>

                {/* ── FOOTER ── */}
                <div className="rc-footer" style={{ position:'relative', zIndex:1 }}>
                  <div>
                    <strong>{school.name}</strong>
                  </div>
                  <div style={{ color:'#8B1A1A', fontStyle:'italic' }}>{school.motto}</div>
                  <div>Generated: {dateStr} &nbsp;·&nbsp; {school.name}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          .no-print, .no-print-bg::before { display: none !important; }
          body { background: white !important; margin: 0; }
          .rc-page { 
            page-break-after: always; 
            padding: 20px 0 !important; 
            margin: 0 !important;
            height: 100vh;
            display: block !important;
          }
          .rc-a4 { 
            box-shadow: none !important; 
            border: none !important; 
            transform: scale(0.96); 
            transform-origin: top center; 
          }
        }
      `}</style>
    </>
  );
}

export default function BulkReportCardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--muted)' }}>Loading report cards...</div>}>
      <BulkReportCardContent />
    </Suspense>
  );
}
