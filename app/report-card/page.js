'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { fmtK, getLabels } from '@/lib/cbe';
import { Suspense } from 'react';

function ReportCardContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { profile: school } = useProfile();
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [feeCfg, setFeeCfg] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [subjCfg, setSubjCfg] = useState({});
  const [loading, setLoading] = useState(true);
  const [outreachModal, setOutreachModal] = useState(false);
  const [outreachTerm, setOutreachTerm] = useState('');
  const [outreachAssess, setOutreachAssess] = useState('');
  const [outreachGrade, setOutreachGrade] = useState('');
  const [outreachMessage, setOutreachMessage] = useState('');

  const admParam   = sp.get('adm')    || '';
  const gradeParam = sp.get('grade')  || '';
  const termParam  = sp.get('term')   || 'T1';
  const assessParam = sp.get('assess') || 'et1';

  useEffect(() => {
    async function load() {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners','paav6_marks','paav6_feecfg','paav8_grad','paav8_subj'])
      ]);
      if (!u) { router.push('/login'); return; }
      setLearners(db.paav6_learners || []);
      setMarks(db.paav6_marks || {});
      setFeeCfg(db.paav6_feecfg || {});
      setGradCfg(db.paav8_grad || null);
      setSubjCfg(db.paav8_subj || {});
      setLoading(false);
    }
    load();
   }, [router]);

  const curr = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  const labels = getLabels(school?.curriculum || 'CBC');
  const ALL_GRADES = curr.ALL_GRADES || [];
  const TERMS = curr.TERMS || [{id:'T1',name:'Term 1'},{id:'T2',name:'Term 2'},{id:'T3',name:'Term 3'}];
  const assessments = curr.ASSESSMENT_TYPES?.length ? curr.ASSESSMENT_TYPES : [
    { key: 'op1', label: 'Opener' },
    { key: 'mt1', label: 'Mid-Term' },
    { key: 'et1', label: 'End-Term' },
  ];
  const assessMap = assessments.reduce((acc,a) => ({...acc,[a.key]:a.label}),{});
  const outreachAssessments = [
    ...assessments,
    { key: 'term', label: `Whole ${labels.assessment} Average` }
  ];

  const cleanLabel = (value) => String(value || '').replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
  const getTermName = (term) => TERMS.find(t => t.id === term)?.name || term;
  const getAssessName = (assess) => assess === 'term' ? `Whole ${labels.assessment} Average` : (assessMap[assess] || assess);
  const buildOutreachMessage = (term, assess, grade) => (
    `Dear parent, ${getTermName(term)} ${cleanLabel(getAssessName(assess))} results for ${labels.grade} ${grade || ''} are now available. Please log in to the parent portal for the full report card.`
  );

  useEffect(() => {
    setOutreachTerm(termParam);
    setOutreachAssess(assessParam);
    let grade = '';
    if (admParam) {
      const learner = learners.find(l => l.adm === admParam);
      if (learner) grade = learner.grade;
    }
    if (!grade && gradeParam) grade = gradeParam;
    if (!grade && ALL_GRADES.length > 0) grade = ALL_GRADES[0];
    setOutreachGrade(grade);
    setOutreachMessage(buildOutreachMessage(termParam, assessParam, grade));
   }, [termParam, assessParam, admParam, gradeParam, learners, ALL_GRADES]);

  const handleOutreachSubmit = async (e) => {
    e.preventDefault();
    setOutreachModal(false);
    try {
      const res = await fetch('/api/outreach/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: outreachTerm, assess: outreachAssess, grade: outreachGrade, message: outreachMessage })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Outreach SMS sent successfully!');
      } else {
        alert('Failed to send outreach SMS: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div style={{padding:60,textAlign:'center',color:'#64748b'}}>Generating report card…</div>;

  const termLabel = TERMS.find(t => t.id === termParam)?.name || termParam;
  const assessLabel = assessMap[assessParam] || assessParam;
  const year = new Date().getFullYear();

  const targetAdms = admParam ? [admParam] : (gradeParam ? learners.filter(l => l.grade===gradeParam).map(l=>l.adm) : []);
  const targetLearners = targetAdms.length > 0 ? learners.filter(l => targetAdms.includes(l.adm)) : [];

  if (targetLearners.length === 0) return (
    <div style={{padding:40,textAlign:'center'}}>
      <p style={{color:'#dc2626',marginBottom:16}}>No learners found. Use ?adm=XXX or ?grade=GRADE1 in the URL.</p>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Back</button>
    </div>
  );

  return (
    <div className="rc-root">
       {/* Print controls */}
       <div className="rc-toolbar no-print">
         <button onClick={() => router.back()} className="rc-btn-back">← Back</button>
         <span className="rc-info">{targetLearners.length} card{targetLearners.length!==1?'s':''} · {termLabel} · {assessLabel}</span>
         <button onClick={() => window.print()} className="rc-btn-print">🖨️ Print / Save PDF</button>
         <button onClick={() => setOutreachModal(true)} className="rc-btn-outreach" style={{ marginLeft: '8px' }}>📣 Outreach</button>
       </div>

      {/* Cards */}
      <div className="rc-pages">
        {targetLearners.map((learner, idx) => {
          const subjects = (subjCfg[learner.grade]?.length > 0 ? subjCfg[learner.grade] : curr.DEFAULT_SUBJECTS?.[learner.grade]) || [];
          const cfg = feeCfg[learner.grade] || {};
          const annualFee = TERMS.reduce((s,t) => s + (cfg[t.id.toLowerCase()]||0), 0) || cfg.annual || 0;
          const totalPaid = TERMS.reduce((s,t) => s + (learner[t.id.toLowerCase()]||0), 0);
          const balance = annualFee + (learner.arrears||0) - totalPaid;

          const marksRows = subjects.map(subj => {
            const k = `${termParam}:${learner.grade}|${subj}|${assessParam}`;
            const k0 = `${learner.grade}|${subj}|${assessParam}`;
            const sc = marks[k]?.[learner.adm] ?? marks[k0]?.[learner.adm];
            const inf = sc !== undefined ? curr.gInfo(Number(sc), learner.grade, gradCfg, subj) : null;
            return { subj, score: sc, inf };
          });

          const entered = marksRows.filter(r => r.score !== undefined);
          const totalPts = entered.reduce((s,r) => s + (r.inf?.pts||0), 0);
          const maxTotal = curr.maxPts ? curr.maxPts(learner.grade, subjects) : 0;
          const avgPct = entered.length > 0 ? Math.round(entered.reduce((s,r)=>s+Number(r.score),0)/entered.length) : 0;
          const overallGrade = curr.gInfo ? curr.gInfo(avgPct, learner.grade, gradCfg, null) : null;

          return (
            <div key={learner.adm} className={`rc-page${idx < targetLearners.length-1 ? ' rc-page-break' : ''}`}>

              {/* OUTER BORDER (double-line Kenyan style) */}
              <div className="rc-outer-border">
                <div className="rc-inner-border">

                  {/* HEADER */}
                  <div className="rc-header">
                    {school?.logo && (
                      <img src={school.logo} className="rc-logo" alt="School Logo" />
                    )}
                    <div className="rc-school-name">{school?.name || 'SCHOOL NAME'}</div>
                    {school?.tagline && <div className="rc-tagline">{school.tagline}</div>}
                    {school?.address && <div className="rc-address">{school.address}</div>}
                    {school?.phone && <div className="rc-address">Tel: {school.phone}</div>}
                    <div className="rc-card-title">
                      {labels.assessment.toUpperCase()} REPORT CARD — {year}
                    </div>
                    <div className="rc-term-label">{termLabel} &nbsp;|&nbsp; {assessLabel}</div>
                  </div>

                  {/* STUDENT INFO */}
                  <table className="rc-info-table">
                    <tbody>
                      <tr>
                        <td className="rc-info-label">Student Name:</td>
                        <td className="rc-info-value"><strong>{learner.name}</strong></td>
                        <td className="rc-info-label">Admission No.:</td>
                        <td className="rc-info-value"><strong>{learner.adm}</strong></td>
                      </tr>
                      <tr>
                        <td className="rc-info-label">{labels.grade} / Class:</td>
                        <td className="rc-info-value">{learner.grade}</td>
                        <td className="rc-info-label">Stream:</td>
                        <td className="rc-info-value">{learner.stream || '—'}</td>
                      </tr>
                      <tr>
                        <td className="rc-info-label">Gender:</td>
                        <td className="rc-info-value">{learner.sex==='F'?'Female':learner.sex==='M'?'Male':'—'}</td>
                        <td className="rc-info-label">Class Teacher:</td>
                        <td className="rc-info-value">{learner.teacher || '—'}</td>
                      </tr>
                      <tr>
                        <td className="rc-info-label">Term / Cycle:</td>
                        <td className="rc-info-value">{termLabel}</td>
                        <td className="rc-info-label">{labels.assessment}:</td>
                        <td className="rc-info-value">{assessLabel}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* MARKS TABLE */}
                  <table className="rc-marks-table">
                    <thead>
                      <tr className="rc-marks-thead">
                        <th className="rc-th-subj">{labels.subject.toUpperCase()}</th>
                        {school?.curriculum !== 'MONTESSORI' && <th className="rc-th-center">SCORE (%)</th>}
                        <th className="rc-th-center">GRADE / LEVEL</th>
                        <th className="rc-th-center">POINTS</th>
                        <th className="rc-th-remarks">REMARKS / PERFORMANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksRows.map(({subj,score,inf},i) => (
                        <tr key={subj} className={i%2===0?'rc-row-even':'rc-row-odd'}>
                          <td className="rc-td-subj">{subj}</td>
                          {school?.curriculum !== 'MONTESSORI' && (
                            <td className="rc-td-center rc-score" style={{color: score!==undefined?(score>=70?'#166534':score>=50?'#1e40af':'#991b1b'):'#94a3b8'}}>
                              {score !== undefined ? score : '—'}
                            </td>
                          )}
                          <td className="rc-td-center">
                            {inf ? <span className="rc-grade-pill" style={{background:inf.bg,color:inf.c}}>{inf.lv}</span> : '—'}
                          </td>
                          <td className="rc-td-center rc-pts" style={{color:inf?.c||'#94a3b8'}}>{inf?.pts ?? '—'}</td>
                          <td className="rc-td-remarks">{inf?.desc || '—'}</td>
                        </tr>
                      ))}
                      {entered.length > 0 && (
                        <tr className="rc-totals-row">
                          <td className="rc-totals-label">TOTAL ({entered.length}/{subjects.length} {labels.subjects.toLowerCase()})</td>
                          {school?.curriculum !== 'MONTESSORI' && <td className="rc-totals-score">{avgPct}%</td>}
                          <td className="rc-totals-grade" colSpan={2}>{overallGrade?.lv || '—'} — {totalPts}/{maxTotal} pts</td>
                          <td className="rc-totals-desc">{overallGrade?.desc || '—'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* FEE STATEMENT + OVERALL */}
                  <div className="rc-bottom-grid">
                    <div className="rc-fee-box">
                      <div className="rc-box-title">FEE STATEMENT</div>
                      <table className="rc-fee-table">
                        <tbody>
                          <tr><td>Annual Fee</td><td><strong>KES {fmtK(annualFee)}</strong></td></tr>
                          {TERMS.map(t => (
                            <tr key={t.id}>
                              <td>{t.name} Paid</td>
                              <td>KES {fmtK(learner[t.id.toLowerCase()]||0)}</td>
                            </tr>
                          ))}
                          {learner.arrears > 0 && <tr><td>Arrears B/F</td><td style={{color:'#991b1b'}}>KES {fmtK(learner.arrears)}</td></tr>}
                          <tr className="rc-fee-balance">
                            <td><strong>Balance Due</strong></td>
                            <td style={{color:balance<=0?'#166534':'#991b1b'}}>
                              <strong>KES {fmtK(Math.max(0,balance))}{balance<=0?' ✓':''}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="rc-overall-box">
                      <div className="rc-box-title">OVERALL ASSESSMENT</div>
                      <div className="rc-overall-grade" style={{color:overallGrade?.c||'#0f172a'}}>{overallGrade?.lv || '—'}</div>
                      {school?.curriculum !== 'MONTESSORI' && <div className="rc-overall-pct">{avgPct}%</div>}
                      <div className="rc-overall-desc">{overallGrade?.desc || '—'}</div>
                      <div className="rc-overall-sub">{entered.length}/{subjects.length} {labels.subjects.toLowerCase()} assessed</div>
                    </div>
                  </div>

                  {/* TEACHER COMMENTS */}
                  <div className="rc-comments-row">
                    <div className="rc-comment-box">
                      <div className="rc-comment-label">Class Teacher&apos;s Comment:</div>
                      <div className="rc-comment-line"></div>
                      <div className="rc-comment-line"></div>
                    </div>
                    <div className="rc-comment-box">
                      <div className="rc-comment-label">Principal&apos;s Comment:</div>
                      <div className="rc-comment-line"></div>
                      <div className="rc-comment-line"></div>
                    </div>
                  </div>

                  {/* SIGNATURES */}
                  <div className="rc-sigs">
                    {['Class Teacher','Parent / Guardian','Principal'].map(role => (
                      <div key={role} className="rc-sig-block">
                        <div className="rc-sig-line"></div>
                        <div className="rc-sig-label">{role}</div>
                        <div className="rc-sig-date">Date: _______________</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="rc-footer">
                    <span>Next Term Begins: _____________________</span>
                    <span>Generated by EduVantage · {new Date().toLocaleDateString('en-KE')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outreach Modal */}
      {outreachModal && (
        <div
          className="outreach-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px'
          }}
        >
          <div
            className="outreach-modal-content"
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              maxWidth: 420,
              width: '100%',
              padding: 24
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#0F172A' }}>Send Parent Outreach</h3>
              <button
                onClick={() => setOutreachModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleOutreachSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#475569' }}>
                  Term
                </label>
                <select
                  value={outreachTerm}
                  onChange={e => {
                    const nextTerm = e.target.value;
                    setOutreachTerm(nextTerm);
                    setOutreachMessage(buildOutreachMessage(nextTerm, outreachAssess, outreachGrade));
                  }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 14 }}
                >
                  {TERMS.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#475569' }}>
                  {labels.assessment} / Exam
                </label>
                <select
                  value={outreachAssess}
                  onChange={e => {
                    const nextAssess = e.target.value;
                    setOutreachAssess(nextAssess);
                    setOutreachMessage(buildOutreachMessage(outreachTerm, nextAssess, outreachGrade));
                  }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 14 }}
                >
                  {outreachAssessments.map(a => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#475569' }}>
                  Grade
                </label>
                <select
                  value={outreachGrade}
                  onChange={e => {
                    const nextGrade = e.target.value;
                    setOutreachGrade(nextGrade);
                    setOutreachMessage(buildOutreachMessage(outreachTerm, outreachAssess, nextGrade));
                  }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 14 }}
                >
                  {ALL_GRADES.map(g => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#475569' }}>
                  Message
                </label>
                <textarea
                  value={outreachMessage}
                  onChange={e => setOutreachMessage(e.target.value)}
                  rows={4}
                  placeholder="Write the message parents should receive..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 14, resize: 'vertical', lineHeight: 1.5 }}
                />
                <div style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>
                  School admin controls this message. Learner performance details are appended privately per learner.
                </div>
              </div>
              <button
                type="submit"
                style={{
                  background: '#1E293B',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 8
                }}
              >
                Send SMS to Parents
              </button>
            </form>
          </div>
        </div>
      )}

       <style>{`
        /* ── Root & toolbar ── */
        .rc-root { background: #e5e7eb; min-height: 100vh; }
        .rc-toolbar {
          display: flex; align-items: center; gap: 12;
          padding: 12px 24px; background: #0F172A;
          position: sticky; top: 0; z-index: 100;
        }
        .rc-btn-back {
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25);
          color: #fff; padding: 7px 16px; border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 600;
        }
        .rc-info { color: rgba(255,255,255,.65); font-size: 12px; flex: 1; margin-left: 12px; }
        .rc-btn-print {
          background: #2563EB; border: none; color: #fff; padding: 8px 22px;
          border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700;
        }

        /* ── Page container (A4 preview on screen) ── */
        .rc-pages { padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 32px; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
        .rc-page {
          width: 210mm;
          min-width: 210mm;
          min-height: 297mm;
          background: #fff;
          box-shadow: 0 8px 30px rgba(0,0,0,.18);
          box-sizing: border-box;
          padding: 8mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #0a0a0a;
        }
        .rc-page-break { page-break-after: always; }

        /* ── Double border (Kenyan style) ── */
        .rc-outer-border {
          border: 3px solid #0f172a;
          padding: 4px;
          min-height: 281mm;
          box-sizing: border-box;
        }
        .rc-inner-border {
          border: 1.5px solid #0f172a;
          padding: 8px 10px;
          min-height: 272mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .rc-header {
          text-align: center;
          border-bottom: 2.5px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .rc-logo { height: 72px; border-radius: 50%; margin-bottom: 4px; }
        .rc-school-name { font-size: 17pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; color: #0f172a; }
        .rc-tagline { font-size: 9pt; color: #475569; margin-top: 2px; }
        .rc-address { font-size: 8.5pt; color: #475569; margin-top: 1px; }
        .rc-card-title {
          display: inline-block;
          margin-top: 8px;
          background: #0f172a; color: #fff;
          padding: 4px 22px; border-radius: 20px;
          font-size: 11pt; font-weight: 800; letter-spacing: 1px;
        }
        .rc-term-label { font-size: 9pt; color: #475569; margin-top: 4px; }

        /* ── Student info table ── */
        .rc-info-table {
          width: 100%; border-collapse: collapse;
          margin-bottom: 8px;
          border: 1.5px solid #0f172a;
          font-size: 10pt;
        }
        .rc-info-table td { padding: 4px 8px; border: 1px solid #cbd5e1; }
        .rc-info-label { color: #475569; font-size: 9pt; width: 18%; white-space: nowrap; }
        .rc-info-value { font-size: 10pt; width: 32%; }

        /* ── Marks table ── */
        .rc-marks-table {
          width: 100%; border-collapse: collapse;
          margin-bottom: 8px;
          border: 2px solid #0f172a;
          font-size: 10pt;
          flex: 1;
        }
        .rc-marks-thead { background: #0f172a; color: #fff; }
        .rc-marks-thead th { padding: 6px 8px; text-align: left; font-size: 9pt; border: 1px solid #334155; }
        .rc-th-subj { width: 28%; text-align: left; }
        .rc-th-center { text-align: center; width: 11%; }
        .rc-th-remarks { text-align: left; }
        .rc-row-even { background: #fff; }
        .rc-row-odd  { background: #f8fafc; }
        .rc-td-subj  { padding: 5px 8px; font-weight: 700; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
        .rc-td-center { padding: 5px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
        .rc-td-remarks { padding: 5px 8px; font-size: 9pt; color: #374151; border-bottom: 1px solid #e2e8f0; }
        .rc-score { font-weight: 800; font-size: 12pt; }
        .rc-pts   { font-weight: 900; }
        .rc-grade-pill {
          display: inline-block; padding: 1px 9px; border-radius: 12px;
          font-size: 9pt; font-weight: 800;
        }
        .rc-totals-row { background: #0f172a; color: #fff; }
        .rc-totals-row td { padding: 7px 8px; border-top: 2px solid #0f172a; }
        .rc-totals-label { font-weight: 800; font-size: 9pt; }
        .rc-totals-score { text-align: center; color: #fcd34d; font-weight: 900; font-size: 13pt; }
        .rc-totals-grade { text-align: center; font-weight: 900; font-size: 12pt; }
        .rc-totals-desc  { font-size: 9pt; font-weight: 700; }

        /* ── Bottom grid: Fee + Overall ── */
        .rc-bottom-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 8px;
        }
        .rc-fee-box, .rc-overall-box {
          border: 1.5px solid #0f172a; border-radius: 4px; padding: 7px 9px;
        }
        .rc-box-title {
          font-size: 8pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.6px; color: #475569;
          border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 5px;
        }
        .rc-fee-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        .rc-fee-table td { padding: 3px 2px; border-bottom: 1px dashed #cbd5e1; }
        .rc-fee-table td:last-child { text-align: right; }
        .rc-fee-balance td { padding-top: 5px; font-size: 10pt; border-top: 1.5px solid #0f172a; border-bottom: none; }
        .rc-overall-box { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .rc-overall-grade { font-size: 38pt; font-weight: 900; line-height: 1; }
        .rc-overall-pct   { font-size: 22pt; font-weight: 900; color: #0f172a; margin-top: 2px; }
        .rc-overall-desc  { font-size: 9.5pt; color: #475569; margin-top: 3px; }
        .rc-overall-sub   { font-size: 8.5pt; color: #94a3b8; margin-top: 2px; }

        /* ── Comments ── */
        .rc-comments-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 8px;
        }
        .rc-comment-box { border: 1px solid #0f172a; padding: 5px 8px; border-radius: 3px; }
        .rc-comment-label { font-size: 8.5pt; font-weight: 800; color: #374151; margin-bottom: 6px; }
        .rc-comment-line { border-bottom: 1px solid #94a3b8; margin-bottom: 8px; height: 14px; }

        /* ── Signatures ── */
        .rc-sigs {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
          border-top: 2px solid #0f172a; padding-top: 10px; margin-bottom: 8px;
        }
        .rc-sig-block { text-align: center; }
        .rc-sig-line  { height: 36px; border-bottom: 1.5px solid #374151; margin-bottom: 4px; }
        .rc-sig-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
        .rc-sig-date  { font-size: 8pt; color: #64748b; margin-top: 3px; }

        /* ── Footer ── */
        .rc-footer {
          display: flex; justify-content: space-between;
          font-size: 8pt; color: #94a3b8;
          border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: auto;
        }

        @media screen and (max-width: 800px) {
          .rc-pages {
            align-items: flex-start;
            padding: 16px;
          }
        }

        /* ══════════════ PRINT STYLES ══════════════ */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { margin: 0; padding: 0; background: #fff !important; }
          .no-print { display: none !important; }
          .rc-root { background: #fff !important; }
          .rc-pages { padding: 0 !important; gap: 0 !important; background: #fff !important; overflow: visible !important; width: auto !important; display: block !important; }
          .rc-page {
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            page-break-after: always;
          }
          .rc-page:last-child { page-break-after: auto; }
          .rc-page-break { page-break-after: always !important; }
          .rc-outer-border { border: 3px solid #0f172a !important; min-height: 0 !important; }
          .rc-inner-border { border: 1.5px solid #0f172a !important; min-height: 0 !important; }
          .rc-marks-thead { background: #0f172a !important; color: #fff !important; }
          .rc-totals-row  { background: #0f172a !important; color: #fff !important; }
          .rc-card-title  { background: #0f172a !important; color: #fff !important; }
          .rc-school-name { color: #0f172a !important; }
          .rc-card-title, .rc-totals-row, .rc-marks-thead, .rc-totals-row td, .rc-marks-thead th { color: #fff !important; }
          .rc-score, .rc-pts { font-weight: 800 !important; }
          .rc-overall-grade { font-size: 36pt !important; }
        }
      `}</style>
    </div>
  );
}

export default function ReportCardPage() {
  return (
    <Suspense fallback={<div style={{padding:60,textAlign:'center'}}>Loading…</div>}>
      <ReportCardContent />
    </Suspense>
  );
}
