'use client';
export const runtime = 'edge';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { fmtK, getLabels } from '@/lib/cbe';
import { Suspense } from 'react';

// Assessment mappings will be dynamic based on curriculum

function ReportCardContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { profile: school } = useProfile();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [feeCfg, setFeeCfg] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [subjCfg, setSubjCfg] = useState({});
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  // Params: ?adm=xxx&grade=GRADE1&term=T1&assess=et1
  const admParam   = sp.get('adm')    || '';
  const gradeParam = sp.get('grade')  || '';
  const termParam  = sp.get('term')   || 'T1';
  const assessParam = sp.get('assess') || 'et1';

  useEffect(() => {
    async function load() {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners', 'paav6_marks', 'paav6_feecfg', 'paav8_grad', 'paav8_subj'])
      ]);
      if (!u) { router.push('/login'); return; }
      setUser(u);
      setLearners(db.paav6_learners || []);
      setMarks(db.paav6_marks || {});
      setFeeCfg(db.paav6_feecfg || {});
      setGradCfg(db.paav8_grad || null);
      setSubjCfg(db.paav8_subj || {});
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Generating report card…</div>;

  const curr = getCurriculum(school?.curriculum || 'CBC');
  const labels = getLabels(school?.curriculum || 'CBC');
  const { gInfo, maxPts, DEFAULT_SUBJECTS } = curr;
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const assessments = curr.ASSESSMENT_TYPES || [];
  const assessMap = assessments.reduce((acc, a) => ({ ...acc, [a.key]: a.label }), {});

  const termLabel = TERMS.find(t => t.id === termParam)?.name || termParam;
  const assessLabel = assessMap[assessParam] || assessParam;

  // Determine which learners to print
  const targetAdms = admParam ? [admParam] : (gradeParam ? learners.filter(l => l.grade === gradeParam).map(l => l.adm) : []);
  const targetLearners = targetAdms.length > 0
    ? learners.filter(l => targetAdms.includes(l.adm))
    : [];

  if (targetLearners.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: '#dc2626', marginBottom: 16 }}>No learners found. Use ?adm=XXX or ?grade=GRADE1 in the URL.</p>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Back</button>
    </div>
  );

  return (
    <div>
      {/* Print controls — hidden when printing */}
      <div className="no-print" style={{ padding: '16px 24px', background: '#0F172A', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{targetLearners.length} report card{targetLearners.length !== 1 ? 's' : ''} · {termLabel} · {assessLabel}</span>
        <button onClick={() => window.print()} style={{ background: '#2563EB', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Report Cards */}
      <div ref={printRef}>
        {targetLearners.map((learner, idx) => {
          const subjects = (subjCfg[learner.grade]?.length > 0 ? subjCfg[learner.grade] : DEFAULT_SUBJECTS[learner.grade]) || [];
          const cfg = feeCfg[learner.grade] || {};
          const annualFee = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 0;
          const totalPaid = (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
          const balance = annualFee + (learner.arrears || 0) - totalPaid;

          const marksRows = subjects.map(subj => {
            const k = `${termParam}:${learner.grade}|${subj}|${assessParam}`;
            const k0 = `${learner.grade}|${subj}|${assessParam}`;
            const sc = marks[k]?.[learner.adm] ?? marks[k0]?.[learner.adm];
            const inf = sc !== undefined ? gInfo(Number(sc), learner.grade, gradCfg, subj) : null;
            return { subj, score: sc, inf };
          });

          const entered = marksRows.filter(r => r.score !== undefined);
          const totalPts = entered.reduce((s, r) => s + (r.inf?.pts || 0), 0);
          const maxTotal = maxPts(learner.grade, subjects);
          const avgPct = entered.length > 0
            ? Math.round(entered.reduce((s, r) => s + Number(r.score), 0) / entered.length)
            : 0;

          const overallGrade = gInfo(avgPct, learner.grade, gradCfg, null);

          return (
            <div key={learner.adm} style={{ pageBreakAfter: idx < targetLearners.length - 1 ? 'always' : 'auto', padding: '32px 40px', maxWidth: 750, margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '3px solid #0F172A', paddingBottom: 16, marginBottom: 20 }}>
                {school?.logo && <img src={school.logo} style={{ height: 70, marginBottom: 8, borderRadius: '50%' }} alt="logo" />}
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 }}>{school?.name || 'School Name'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{school?.tagline || ''}</div>
                <div style={{ marginTop: 12, display: 'inline-block', background: '#0F172A', color: '#fff', padding: '4px 20px', borderRadius: 20, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>{labels.assessment.toUpperCase()} REPORT CARD</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{termLabel} · {assessLabel} · {new Date().getFullYear()} ACADEMIC YEAR</div>
              </div>

              {/* Learner Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px', marginBottom: 20, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                {[['Student Name', learner.name], ['Admission No.', learner.adm], [labels.grade + ' / Class', learner.grade], ['Stream', learner.stream || '—'], ['Gender', learner.sex === 'F' ? 'Female' : learner.sex === 'M' ? 'Male' : '—'], ['Class Teacher', learner.teacher || '—']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CBD5E1', paddingBottom: 4 }}>
                    <span style={{ color: '#64748b', fontSize: 11 }}>{k}</span>
                    <strong style={{ fontSize: 12 }}>{v}</strong>
                  </div>
                ))}
                {[['Term / Cycle', termLabel], [labels.assessment, assessLabel]].map(([k,v]) => (
                   <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CBD5E1', paddingBottom: 4 }}>
                    <span style={{ color: '#64748b', fontSize: 11 }}>{k}</span>
                    <strong style={{ fontSize: 12 }}>{v}</strong>
                  </div>
                ))}
              </div>

              {/* Marks Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#0F172A', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11 }}>{labels.subject.toUpperCase()}</th>
                    {school?.curriculum !== 'MONTESSORI' && <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11 }}>SCORE (%)</th>}
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11 }}>{school?.curriculum === 'MONTESSORI' ? 'MASTERY' : 'LEVEL'}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11 }}>POINTS</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11 }}>PERFORMANCE / COMMENTS</th>
                  </tr>
                </thead>
                <tbody>
                  {marksRows.map(({ subj, score, inf }, i) => (
                    <tr key={subj} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <td style={{ padding: '7px 12px', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>{subj}</td>
                      {school?.curriculum !== 'MONTESSORI' && (
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: score !== undefined ? (score >= 70 ? '#059669' : score >= 50 ? '#2563eb' : '#dc2626') : '#94a3b8', borderBottom: '1px solid #E2E8F0' }}>
                          {score !== undefined ? score : '—'}
                        </td>
                      )}
                      <td style={{ padding: '7px 12px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                        {inf ? <span style={{ background: inf.bg, color: inf.c, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>{inf.lv}</span> : '—'}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 900, color: inf?.c || '#94a3b8', borderBottom: '1px solid #E2E8F0' }}>{inf?.pts ?? '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: '#64748b', borderBottom: '1px solid #E2E8F0' }}>{inf?.desc || '—'}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  {entered.length > 0 && (
                    <tr style={{ background: '#0F172A' }}>
                      <td style={{ padding: '9px 12px', color: '#fff', fontWeight: 800 }}>TOTAL ({entered.length}/{subjects.length} {labels.subjects.toLowerCase()})</td>
                      {school?.curriculum !== 'MONTESSORI' && <td style={{ padding: '9px 12px', textAlign: 'center', color: '#FCD34D', fontWeight: 900, fontSize: 16 }}>{avgPct}%</td>}
                      <td colSpan={school?.curriculum === 'MONTESSORI' ? 2 : 2} style={{ padding: '9px 12px', textAlign: 'center', color: overallGrade.c, fontWeight: 900, fontSize: 15 }}>{overallGrade.lv} — {totalPts}/{maxTotal} pts</td>
                      <td style={{ padding: '9px 12px', color: overallGrade.c, fontWeight: 800, fontSize: 12 }}>{overallGrade.desc}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Fee Statement + Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Fee Statement</div>
                  {[['Annual Fee', `KES ${fmtK(annualFee)}`], ['Term 1 Paid', `KES ${fmtK(learner.t1||0)}`], ['Term 2 Paid', `KES ${fmtK(learner.t2||0)}`], ['Term 3 Paid', `KES ${fmtK(learner.t3||0)}`], ['Balance', `KES ${fmtK(Math.max(0, balance))}`]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CBD5E1', paddingBottom: 4, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <strong style={{ color: k === 'Balance' ? (balance <= 0 ? '#059669' : '#dc2626') : '#1e293b' }}>{v} {k === 'Balance' && balance <= 0 ? '✅' : ''}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Overall Assessment</div>
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: overallGrade.c }}>{overallGrade.lv}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{overallGrade.desc}</div>
                    {school?.curriculum !== 'MONTESSORI' && <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 8 }}>{avgPct}%</div>}
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{entered.length}/{subjects.length} {labels.subjects.toLowerCase()} assessed</div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, borderTop: '2px solid #E2E8F0', paddingTop: 16 }}>
                {['Class Teacher', "Parent's Signature", "Principal's Stamp"].map(role => (
                  <div key={role} style={{ textAlign: 'center' }}>
                    <div style={{ height: 40, borderBottom: '1px solid #CBD5E1', marginBottom: 6 }}></div>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{role}</div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 20, borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                Generated by EduVantage School Management System · {new Date().toLocaleDateString('en-KE')}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}

export default function ReportCardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>}>
      <ReportCardContent />
    </Suspense>
  );
}
