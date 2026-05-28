'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { fmtK, getLabels, calcLearnerReportData, getGradeColors, shouldRankByMarks } from '@/lib/cbe';

function ReportCardContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { profile: school } = useProfile();
  const [learners, setLearners] = useState([]);
  const [marks, setMarks] = useState({});
  const [feeCfg, setFeeCfg] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [subjCfg, setSubjCfg] = useState({});
  const [att, setAtt] = useState({});
  const [weights, setWeights] = useState(null);
  const [terms, setTerms] = useState([]);
  const [gradingMode, setGradingMode] = useState('per-level');
  const [loading, setLoading] = useState(true);

  const admParam   = sp.get('adm')    || '';
  const gradeParam = sp.get('grade')  || '';
  const termParam  = sp.get('term')   || 'T1';
  const assessParam = sp.get('assess') || 'et1';

  useEffect(() => {
    async function load() {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners','paav6_marks','paav6_feecfg','paav8_grad','paav8_subj','paav_student_attendance','paav_grading_weights','paav_terms','paav_grading_mode'])
      ]);
      if (!u) { router.push('/login'); return; }
      setLearners(db.paav6_learners || []);
      setMarks(db.paav6_marks || {});
      setFeeCfg(db.paav6_feecfg || {});
      setGradCfg(db.paav8_grad || null);
      setSubjCfg(db.paav8_subj || {});
      setAtt(db.paav_student_attendance || {});
      setWeights(db.paav_grading_weights || null);
      setTerms(Array.isArray(db.paav_terms) ? db.paav_terms : []);
      setGradingMode(db.paav_grading_mode || 'per-level');
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div style={{padding:60,textAlign:'center',color:'#64748b'}}>Generating report card…</div>;

  const currObj = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  const labels = getLabels(school?.curriculum || 'CBC');
  const { DEFAULT_SUBJECTS } = currObj;
  const TERMS = currObj.TERMS || [{id:'T1',name:'Term 1'},{id:'T2',name:'Term 2'},{id:'T3',name:'Term 3'}];
  const assessments = currObj.ASSESSMENT_TYPES || [];
  const assessMap = assessments.reduce((acc,a) => ({...acc,[a.key]:a.label}),{});
  const curr = school?.curriculum || 'CBC';
  const themeColor = curr==='BRITISH'?'#1E3A8A':curr==='CAMBRIDGE'?'#065F46':curr==='IB'?'#4338CA':'#8B1A1A';

  const termLabel = TERMS.find(t => t.id === termParam)?.name || termParam;
  const assessLabel = assessMap[assessParam] || assessParam;
  const year = new Date().getFullYear();

  const targetAdms = admParam ? [admParam] : (gradeParam ? learners.filter(l => l.grade===gradeParam).map(l=>l.adm) : []);
  const rawLearners = targetAdms.length > 0 ? learners.filter(l => targetAdms.includes(l.adm)) : [];

  // Rank learners
  const rankedData = rawLearners.map(l => {
    const subjs = (subjCfg[l.grade]?.length > 0 ? subjCfg[l.grade] : DEFAULT_SUBJECTS[l.grade]) || [];
    const report = calcLearnerReportData(marks, l.adm, l.grade, termParam, subjs, gradCfg, curr, weights, gradingMode);
    return { ...l, report, subjects: subjs };
  }).sort((a,b) => shouldRankByMarks(gradeParam, curr) ? (b.report?.totalAvgScore||0)-(a.report?.totalAvgScore||0) : (b.report?.totalAvgPts||0)-(a.report?.totalAvgPts||0));
  let r = 1;
  for (let i = 0; i < rankedData.length; i++) {
    const val = shouldRankByMarks(gradeParam,curr) ? rankedData[i].report.totalAvgScore : rankedData[i].report.totalAvgPts;
    const prev = i > 0 ? (shouldRankByMarks(gradeParam,curr) ? rankedData[i-1].report.totalAvgScore : rankedData[i-1].report.totalAvgPts) : null;
    if (i > 0 && val < prev) r = i + 1;
    rankedData[i].rank = r;
  }

  if (rankedData.length === 0) return (
    <div style={{padding:40,textAlign:'center'}}>
      <p style={{color:'#dc2626',marginBottom:16}}>No learners found. Use ?adm=XXX or ?grade=GRADE1 in the URL.</p>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Back</button>
    </div>
  );

  const colors = getGradeColors(curr);
  const aTypes = currObj.ASSESSMENT_TYPES || [];

  return (
    <div className="rc-root">
      <div className="rc-toolbar no-print">
        <button onClick={() => router.back()} className="rc-btn-back">← Back</button>
        <span className="rc-info">{rankedData.length} card{rankedData.length!==1?'s':''} · {termLabel} · {assessLabel}</span>
        <button onClick={() => window.print()} className="rc-btn-print">🖨️ Print / Save PDF</button>
      </div>

      <div className="rc-pages">
        {rankedData.map((learner, idx) => {
          const l = learner;
          const rep = l.report;
          const cfg = feeCfg[l.grade] || {};
          const annualFee = TERMS.reduce((s,t) => s+(cfg[t.id.toLowerCase()]||0),0) || cfg.annual || 0;
          const totalPaid = TERMS.reduce((s,t) => s+(l[t.id.toLowerCase()]||0),0);
          const balance = annualFee+(l.arrears||0)-totalPaid;
          const lv = rep?.overallInfo?.lv || '';
          const nextTermDate = (() => {
            if (!terms||!terms.length) return 'See calendar';
            const n = parseInt(termParam.replace('T',''),10)+1;
            const sorted = [...terms].sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));
            const nt = sorted.find(t=>parseInt((t.name||'').match(/(\d+)/)?.[1]||'0',10)===n) || sorted[n-1];
            if (!nt) return 'See calendar';
            const d = new Date(nt.start_date);
            return isNaN(d.getTime()) ? nt.start_date : d.toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'});
          })();
          const attDays = Object.keys(att||{}).filter(k=>k.startsWith(`${l.grade}|`)).length/(rawLearners.length||1)||0;
          const attPresent = Object.entries(att||{}).filter(([k,v])=>k.endsWith(`|${l.adm}`)&&v==='P').length;

          return (
            <div key={l.adm} className={`rc-page${idx<rankedData.length-1?' rc-page-break':''}`}>
              {/* Watermark */}
              <div className="rc-watermark">
                {Array.from({length:48}).map((_,i)=>(
                  <div key={i} className="rc-watermark-item">
                    <img src="/eduvantage-logo.png" alt="" className="rc-watermark-img"/>
                    <span className="rc-watermark-text">EDUVANTAGE</span>
                  </div>
                ))}
              </div>

              <div className="rc-inner" style={{position:'relative',zIndex:1,height:'100%',display:'flex',flexDirection:'column',gap:8}}>

                {/* QR top-right */}
                <div style={{position:'absolute',top:0,right:0,textAlign:'center'}}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(`EduVantage|${l.adm}|${school?.name||''}`)}`} alt="QR" style={{width:56,height:56,border:'1px solid #ddd',padding:2,background:'#fff'}}/>
                  <div style={{fontSize:6,fontWeight:800,color:'#94A3B8',marginTop:1}}>SCAN TO VERIFY</div>
                </div>

                {/* ── HEADER ── */}
                <div style={{textAlign:'center',borderBottom:`3px double ${themeColor}`,paddingBottom:8}}>
                  <div style={{fontSize:7,color:'#94A3B8',fontWeight:800,textAlign:'left'}}>{curr} SYSTEM</div>
                  {school?.logo && <img src={school.logo} alt="Logo" style={{width:64,height:64,borderRadius:'50%',objectFit:'contain',border:`2.5px solid ${themeColor}`,padding:4,margin:'0 auto 4px'}}/>}
                  <div style={{fontSize:17,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,color:themeColor,lineHeight:1.2}}>{school?.name||'SCHOOL NAME'}</div>
                  {school?.tagline && <div style={{fontSize:9,color:'#475569',marginTop:2}}>{school.tagline}</div>}
                  {school?.address && <div style={{fontSize:8,color:'#475569'}}>{school.address}{school?.phone?` | Tel: ${school.phone}`:''}</div>}
                  <div style={{background:themeColor,color:'#fff',display:'inline-block',padding:'4px 22px',borderRadius:20,marginTop:6,fontWeight:800,fontSize:11,textTransform:'uppercase',letterSpacing:1}}>
                    OFFICIAL PROGRESS REPORT — {labels.assessment?.toUpperCase()} {year}
                  </div>
                  <div style={{fontSize:9,color:'#475569',marginTop:3}}>{termLabel} &nbsp;|&nbsp; {assessLabel}</div>
                </div>

                {/* ── STUDENT INFO PANEL ── */}
                <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 0.75fr',border:`2px solid ${themeColor}`,borderRadius:8,overflow:'hidden',fontSize:10}}>
                  <div style={{padding:'8px 10px',borderRight:`1px solid ${themeColor}44`}}>
                    <div style={{fontSize:7,color:'#94A3B8',fontWeight:800,textTransform:'uppercase',marginBottom:2}}>Learner</div>
                    <div style={{fontSize:13,fontWeight:900,color:themeColor}}>{l.name}</div>
                    <div style={{fontSize:9,color:'#475569'}}>ADM: <strong>{l.adm}</strong> · {l.sex==='F'?'Female':l.sex==='M'?'Male':'—'} · Stream: {l.stream||'—'}</div>
                  </div>
                  <div style={{padding:'8px 10px',borderRight:`1px solid ${themeColor}44`,background:`${themeColor}05`}}>
                    <div style={{fontSize:7,color:'#94A3B8',fontWeight:800,textTransform:'uppercase',marginBottom:2}}>Academic Period</div>
                    <div style={{fontSize:13,fontWeight:800}}>{termLabel} — {year}</div>
                    <div style={{fontSize:9,color:'#475569'}}>{labels.grade}: <strong>{l.grade}</strong> · Curriculum: <strong>{curr}</strong></div>
                  </div>
                  <div style={{padding:'8px 10px',textAlign:'center',background:themeColor,color:'#fff'}}>
                    <div style={{fontSize:7,opacity:0.8,fontWeight:800,textTransform:'uppercase',marginBottom:2}}>Class Rank</div>
                    <div style={{fontSize:22,fontWeight:900}}>{l.rank}</div>
                    <div style={{fontSize:8,opacity:0.9}}>of {rankedData.length}</div>
                  </div>
                </div>

                {/* ── MARKS TABLE ── */}
                {rep?.subjects ? (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:9,border:`2px solid ${themeColor}`}}>
                  <thead>
                    <tr style={{background:themeColor,color:'#fff'}}>
                      <th style={{padding:'5px 6px',textAlign:'left'}}>Learning Area / Subject</th>
                      {aTypes.map(a=><th key={a.key} style={{padding:'5px 4px',textAlign:'center',fontSize:7.5}}>{a.label.replace(/^\S+\s/,'')}</th>)}
                      <th style={{padding:'5px 4px',textAlign:'center',background:'rgba(255,255,255,.1)'}}>Avg%</th>
                      <th style={{padding:'5px 4px',textAlign:'center'}}>Dev</th>
                      <th style={{padding:'5px 6px',textAlign:'center'}}>Performance Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rep.subjects.map((s,i)=>(
                      <tr key={s.subj} style={{background:i%2===0?'#fff':'#F8FAFF'}}>
                        <td style={{padding:'4px 6px',fontWeight:700,color:'#1E293B',borderBottom:'1px solid #E2E8F0'}}>{s.subj}</td>
                        {aTypes.map(a=>{
                          const sc=s.scores[a.key]; const inf=s.infos?.[a.key];
                          return <td key={a.key} style={{padding:'4px 4px',textAlign:'center',borderBottom:'1px solid #E2E8F0',borderLeft:'1px solid #E2E8F0'}}>
                            {sc!==null&&sc!==undefined?<>{sc} <span style={{fontSize:7,color:colors[inf?.lv]||'#94A3B8',fontWeight:800}}>{inf?.lv||'—'}</span></>:'—'}
                          </td>;
                        })}
                        <td style={{padding:'4px 4px',textAlign:'center',fontWeight:800,borderBottom:'1px solid #E2E8F0',borderLeft:'1px solid #E2E8F0',background:'rgba(0,0,0,.02)'}}>{s.avg}</td>
                        <td style={{padding:'4px 4px',textAlign:'center',borderBottom:'1px solid #E2E8F0',borderLeft:'1px solid #E2E8F0'}}>
                          {(()=>{
                            let dev=null;
                            if(s.scores?.et1!=null&&s.scores?.mt1!=null){dev=s.scores.et1-s.scores.mt1;}
                            else if(s.scores?.mt1!=null&&s.scores?.op1!=null){dev=s.scores.mt1-s.scores.op1;}
                            if(dev===null)return <span style={{color:'#94A3B8'}}>—</span>;
                            return dev!==0?<span style={{color:dev>0?'#059669':'#DC2626',fontWeight:800,fontSize:8}}>{dev>0?`↗+${dev}`:`↘${dev}`}</span>:<span style={{color:'#94A3B8'}}>—</span>;
                          })()}
                        </td>
                        <td style={{padding:'4px 6px',textAlign:'center',borderBottom:'1px solid #E2E8F0',borderLeft:'1px solid #E2E8F0'}}>
                          <span style={{display:'inline-block',padding:'2px 8px',borderRadius:16,fontSize:8.5,fontWeight:900,background:(colors[s.avgLv]||'#333')+'22',color:colors[s.avgLv]||'#333',border:`1px solid ${colors[s.avgLv]||'#333'}`}}>{s.avgLv}</span>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{background:themeColor,color:'#fff'}}>
                      <td style={{padding:'5px 6px',fontWeight:800,fontSize:8}}>TOTALS ({rep.totalEntered}/{l.subjects.length} {labels.subjects?.toLowerCase()})</td>
                      {aTypes.map(a=><td key={a.key} style={{padding:'5px 4px',textAlign:'center',fontSize:8}}>—</td>)}
                      <td style={{padding:'5px 4px',textAlign:'center',fontWeight:900,color:'#fcd34d',fontSize:10}}>{rep.totalAvgScore?.toFixed(1)}%</td>
                      <td style={{padding:'5px 4px',textAlign:'center'}}>—</td>
                      <td style={{padding:'5px 6px',textAlign:'center',fontWeight:900,fontSize:10}}>{rep.overallInfo?.lv} — {rep.totalAvgPts}pts</td>
                    </tr>
                  </tbody>
                </table>
                ) : <div style={{padding:12,textAlign:'center',color:'#94A3B8',fontSize:9}}>No marks data for {l.name}.</div>}

                {/* ── COMPETENCY BADGES ── */}
                {rep?.subjects && (
                <div style={{display:'flex',gap:6,justifyContent:'center',background:'#fff',padding:'5px 8px',borderRadius:8,border:`1px solid ${themeColor}22`,flexWrap:'wrap'}}>
                  {Object.entries(rep.subjects.reduce((acc,s)=>({...acc,[s.avgLv]:(acc[s.avgLv]||0)+1}),{})).map(([lv2,cnt])=>(
                    <div key={lv2} style={{padding:'3px 10px',borderRadius:8,background:`${colors[lv2]||'#333'}11`,border:`1.5px solid ${colors[lv2]||'#333'}33`,textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:900,color:colors[lv2]||'#333'}}>{cnt}</div>
                      <div style={{fontSize:7,fontWeight:800,color:'#64748B',textTransform:'uppercase'}}>{lv2}</div>
                    </div>
                  ))}
                </div>
                )}

                {/* ── PERFORMANCE SUMMARY + TREND ── */}
                {rep?.subjects && (
                <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:8}}>
                  <div style={{padding:10,borderRadius:8,border:`1.5px solid ${themeColor}22`,background:'#fff'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:800,color:themeColor,textTransform:'uppercase'}}>Performance Summary</div>
                      <div style={{fontSize:8,color:'#64748B'}}>Total Pts: <strong>{rep.totalAvgPts}</strong></div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div style={{background:`${themeColor}08`,padding:7,borderRadius:6}}>
                        <div style={{fontSize:7,color:'#94A3B8',fontWeight:800,textTransform:'uppercase'}}>Overall Level</div>
                        <div style={{fontSize:14,fontWeight:900,color:themeColor}}>{rep.overallInfo?.lv}</div>
                        <div style={{fontSize:7.5,color:'#475569',fontStyle:'italic'}}>{rep.overallInfo?.desc}</div>
                      </div>
                      <div style={{background:'#F0FDF4',padding:7,borderRadius:6}}>
                        <div style={{fontSize:7,color:'#94A3B8',fontWeight:800,textTransform:'uppercase'}}>Avg Score</div>
                        <div style={{fontSize:14,fontWeight:900,color:'#166534'}}>{rep.totalAvgScore?.toFixed(1)}%</div>
                        <div style={{fontSize:7.5,color:'#166534'}}>Across {rep.totalEntered} areas</div>
                      </div>
                    </div>
                    <div style={{borderTop:'1px dashed #E2E8F0',paddingTop:6}}>
                      <div style={{fontSize:7.5,color:'#1E293B',lineHeight:1.4,marginBottom:4}}>
                        <strong>Class Teacher:</strong> {lv.startsWith('EE')?'Exceptional performance — mastery shown across all learning areas. Keep it up!':lv.startsWith('ME')?'Good work! Most expectations are met. Aim for excellence next term.':lv.startsWith('AE')?'Steady progress. More focus needed in weaker areas to reach standards.':'Performance below expectations. Dedicated effort and guidance are urgently needed.'}
                      </div>
                      <div style={{fontSize:7.5,color:'#1E293B',lineHeight:1.4,marginBottom:6}}>
                        <strong>Principal:</strong> {lv.startsWith('EE')?'Outstanding! You are a role model for academic excellence in this school.':lv.startsWith('ME')?'Commendable. Keep working hard to reach the highest level of achievement.':lv.startsWith('AE')?'Fair performance. With dedication, you can achieve better results next term.':'A disappointing outcome. Urgent parent consultation and intervention required.'}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                        <div style={{background:'#F8FAFF',padding:6,borderRadius:6,border:'1px solid #E2E8F0'}}>
                          <div style={{fontSize:7,color:'#94A3B8',fontWeight:800}}>ATTENDANCE</div>
                          <div style={{fontSize:11,fontWeight:900,color:themeColor}}>{attPresent} / {Math.max(attPresent,Math.round(attDays))} <span style={{fontSize:7.5,color:'#64748B'}}>Days</span></div>
                        </div>
                        <div style={{background:'#FFFBEB',padding:6,borderRadius:6,border:'1px solid #FEF3C7'}}>
                          <div style={{fontSize:7,color:'#D97706',fontWeight:800}}>NEXT TERM BEGINS</div>
                          <div style={{fontSize:9,fontWeight:900,color:'#92400E'}}>{nextTermDate}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{padding:10,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#F8FAFF'}}>
                      <div style={{fontSize:7.5,fontWeight:800,color:'#94A3B8',marginBottom:5,textTransform:'uppercase'}}>Assessment Trend (Avg)</div>
                      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:55,padding:'0 4px'}}>
                        {[
                          {label:'OP',val:rep.subjects.reduce((a,s)=>a+(s.scores?.op1||0),0)/(l.subjects.length||1)},
                          {label:'MT',val:rep.subjects.reduce((a,s)=>a+(s.scores?.mt1||0),0)/(l.subjects.length||1)},
                          {label:'ET',val:rep.subjects.reduce((a,s)=>a+(s.scores?.et1||0),0)/(l.subjects.length||1)},
                          {label:'Final',val:rep.totalAvgScore}
                        ].map((d,i)=>(
                          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                            <div style={{fontSize:7,fontWeight:800,marginBottom:2}}>{d.val?.toFixed(0)||0}</div>
                            <div style={{width:'100%',height:`${Math.min(d.val||0,100)}%`,background:i===3?themeColor:`${themeColor}55`,borderRadius:'3px 3px 0 0',minHeight:2}}></div>
                            <div style={{fontSize:6.5,fontWeight:800,marginTop:3,color:'#475569'}}>{d.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Fee summary */}
                    <div style={{padding:10,borderRadius:8,border:`1.5px solid ${themeColor}22`,background:'#fff',flex:1}}>
                      <div style={{fontSize:8,fontWeight:800,color:themeColor,textTransform:'uppercase',marginBottom:5,borderBottom:`1px solid ${themeColor}22`,paddingBottom:3}}>Fee Statement</div>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:8}}>
                        <tbody>
                          <tr><td style={{padding:'2px 0',color:'#475569'}}>Annual Fee</td><td style={{textAlign:'right',fontWeight:700}}>KES {fmtK(annualFee)}</td></tr>
                          {TERMS.map(t=><tr key={t.id}><td style={{padding:'1px 0',color:'#475569'}}>{t.name} Paid</td><td style={{textAlign:'right'}}>KES {fmtK(l[t.id.toLowerCase()]||0)}</td></tr>)}
                          {l.arrears>0&&<tr><td style={{color:'#991b1b'}}>Arrears B/F</td><td style={{textAlign:'right',color:'#991b1b'}}>KES {fmtK(l.arrears)}</td></tr>}
                          <tr style={{borderTop:`1.5px solid ${themeColor}`}}>
                            <td style={{padding:'3px 0',fontWeight:800}}>Balance Due</td>
                            <td style={{textAlign:'right',fontWeight:900,color:balance<=0?'#166534':'#991b1b'}}>KES {fmtK(Math.max(0,balance))}{balance<=0?' ✓':''}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {/* Overall badge */}
                    <div style={{padding:8,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',textAlign:'center'}}>
                      <div style={{fontSize:24}}>{rep.totalAvgScore>=80?'🥇':rep.totalAvgScore>=60?'🌟':'📚'}</div>
                      <div style={{fontSize:9,fontWeight:800,color:themeColor}}>Competency Status</div>
                      <div style={{fontSize:13,fontWeight:900,color:colors[rep.overallInfo?.lv]||themeColor}}>{rep.overallInfo?.lv}</div>
                    </div>
                  </div>
                </div>
                )}

                {/* ── SIGNATURES ── */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,borderTop:`1.5px solid ${themeColor}`,paddingTop:7,marginTop:'auto'}}>
                  {['Class Teacher','Parent / Guardian','Principal'].map(role=>(
                    <div key={role} style={{textAlign:'center'}}>
                      <div style={{height:30,borderBottom:'1.5px solid #374151',marginBottom:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {role==='Principal'&&school?.principalSignature&&<img src={school.principalSignature} alt="sig" style={{maxHeight:26,objectFit:'contain'}}/>}
                      </div>
                      <div style={{fontSize:7.5,textTransform:'uppercase',letterSpacing:0.5,fontWeight:700}}>{role}</div>
                      <div style={{fontSize:7,color:'#64748B',marginTop:1}}>Date: ___________</div>
                    </div>
                  ))}
                </div>

                {/* ── FOOTER ── */}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:7,color:'#94A3B8',borderTop:'1px solid #cbd5e1',paddingTop:3}}>
                  <span>Next Term: {nextTermDate}</span>
                  <span>Generated by EduVantage · {new Date().toLocaleDateString('en-KE')}</span>
                  <span>Page {idx+1} of {rankedData.length}</span>
                </div>

              </div>{/* rc-inner */}
            </div>
          );
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        .rc-root { background: #E2E8F0; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .rc-toolbar { display:flex; align-items:center; gap:12px; padding:12px 24px; background:#0F172A; position:sticky; top:0; z-index:100; }
        .rc-btn-back { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); color:#fff; padding:7px 16px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; transition:background .2s; }
        .rc-btn-back:hover { background:rgba(255,255,255,.2); }
        .rc-info { color:rgba(255,255,255,.65); font-size:12px; flex:1; margin-left:12px; }
        .rc-btn-print { background:#2563EB; border:none; color:#fff; padding:8px 22px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; transition:background .2s; }
        .rc-btn-print:hover { background:#1D4ED8; }
        .rc-pages { padding:28px; display:flex; flex-direction:column; align-items:center; gap:32px; }
        .rc-page { position:relative; width:210mm; min-height:297mm; background:#fff; box-shadow:0 12px 40px rgba(0,0,0,.18); box-sizing:border-box; padding:10mm; font-family:'Times New Roman',Times,serif; font-size:10pt; color:#0a0a0a; overflow:hidden; }
        .rc-page-break { page-break-after:always; }
        .rc-watermark { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-wrap:wrap; overflow:hidden; opacity:0.04; pointer-events:none; z-index:0; align-content:flex-start; }
        .rc-watermark-item { display:flex; align-items:center; gap:6px; padding:22px 30px; transform:rotate(-25deg); }
        .rc-watermark-img { width:20px; height:20px; object-fit:contain; }
        .rc-watermark-text { font-size:12px; font-weight:900; color:#1E293B; text-transform:uppercase; }
        .rc-inner { position:relative; z-index:1; }
        @media print {
          @page { size:A4 portrait; margin:8mm; }
          * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; color-adjust:exact!important; }
          .no-print { display:none!important; }
          .rc-root { background:#fff!important; }
          .rc-pages { padding:0!important; gap:0!important; }
          .rc-page { width:210mm!important; min-height:auto!important; height:297mm!important; padding:8mm!important; margin:0!important; box-shadow:none!important; page-break-after:always!important; page-break-inside:avoid!important; overflow:hidden!important; }
          .rc-watermark { opacity:0.04!important; }
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
