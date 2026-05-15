'use client';
export const runtime = 'edge';
/**
 * app/attendance/page.js — Full Daily Attendance System
 *
 * • Only the assigned class teacher (from paav_class_teachers) can mark attendance
 * • Admins can view/edit all grades
 * • 14-week term daily register (Mon–Fri = 70 school days/term)
 * • Marks: P (Present), A (Absent), L (Late), E (Excused)
 * • Analytics: weekly / monthly / termly / annual absenteeism
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_GRADES, getLabels } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';



const STATUS_COLORS = { P:'#059669', A:'#DC2626', L:'#D97706', E:'#7C3AED' };
const STATUS_LABELS = { P:'Present', A:'Absent', L:'Late', E:'Excused' };

/* ─── Helpers ── */
function getSchoolDays(termId, customTerms = [], year = new Date().getFullYear()) {
  const custom = customTerms.find(t => t.id === termId);
  if (custom) {
    const start = new Date(custom.start_date);
    const end = new Date(custom.end_date);
    const days = [];
    let d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) { // Mon-Fri
        days.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  // Fallback to 14-week term logic if no custom dates set
  const starts = { T1: new Date(year,0,6), T2: new Date(year,4,5), T3: new Date(year,8,1) };
  const days = [];
  const start = starts[termId] || starts.T1;
  let d = new Date(start);
  while (d.getDay() !== 1) d.setDate(d.getDate()+1);
  for (let w = 0; w < 14; w++) {
    for (let dow = 0; dow < 5; dow++) {
      days.push(new Date(d).toISOString().split('T')[0]);
      d.setDate(d.getDate()+1);
    }
    d.setDate(d.getDate()+2); 
  }
  return days;
}

function weekOf(dateStr) {
  const d = new Date(dateStr); const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day===0?6:day-1));
  return mon.toISOString().split('T')[0];
}

function monthOf(dateStr) { return dateStr.slice(0,7); }

export default function AttendancePage() {
  const router = useRouter();
  const { playSuccessSound, profile } = useProfile();
  const curr = getCurriculum(profile?.curriculum || 'CBC');
  const LABELS = getLabels(profile?.curriculum || 'CBC');
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const [user,         setUser]         = useState(null);
  const [dbTerms,      setDbTerms]      = useState([]);

  const [loading,      setLoading]      = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [learners,     setLearners]     = useState([]);
  const [att,          setAtt]          = useState({});
  const [classTeachers,setClassTeachers]= useState({});
  const [grade,        setGrade]        = useState('');
  const [term,         setTerm]         = useState('T1');
  const [activeView,   setActiveView]   = useState('mark');   // 'mark' | 'weekly' | 'monthly' | 'termly' | 'annual'
  const [selDate,      setSelDate]      = useState(new Date().toISOString().split('T')[0]);
  const [alert,        setAlert]        = useState('');
  const [dirtyAtt,     setDirtyAtt]     = useState({}); // { key: status }

  const load = useCallback(async () => {
    try {
      const [u, db, termsData] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav6_learners',
          'paav_student_attendance',
          'paav_class_teachers'
        ]),
        fetch('/api/db', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ requests:[{ type:'getTerms' }] })
        }).then(r => r.json())
      ]);

      if (!u) { router.push('/login'); return; }
      setUser(u);

      const allLearners = db.paav6_learners || [];
      const attData     = db.paav_student_attendance || {};
      const ctData      = db.paav_class_teachers || {};
      const fetchedTerms = termsData.results?.[0]?.value || [];
      
      setLearners(allLearners);
      setAtt(attData);
      setClassTeachers(ctData);
      setDbTerms(fetchedTerms);

      // Determine which grade this teacher owns
      if (!['admin', 'super-admin'].includes(u.role)) {
        const myGrade = Object.entries(ctData).find(([g, id]) => id === u.id)?.[0] || '';
        setGrade(myGrade || u.grade || '');
      } else {
        setGrade(g => g || ALL_GRADES[0]);
      }
    } catch(e) { 
      console.error('Attendance load error:', e); 
    } finally { 
      setLoading(false); 
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  // Check if current user can mark this grade
  const canMark = isAdmin || classTeachers[grade] === user?.id;

  const gradeList = useMemo(() => isAdmin ? ALL_GRADES : (grade ? [grade] : []), [isAdmin, grade]);
  const classList = useMemo(() => learners.filter(l => l.grade === grade).sort((a,b)=>a.name.localeCompare(b.name)), [learners, grade]);
  
  const activeTerms = useMemo(() => {
    if (dbTerms.length > 0) return dbTerms;
    return TERMS;
  }, [dbTerms, TERMS]);

  const schoolDays = useMemo(() => getSchoolDays(term, activeTerms), [term, activeTerms]);

  function setStatus(adm, date, status) {
    const key = `${grade}|${date}|${adm}`;
    setAtt(prev => ({ ...prev, [key]: status }));
    setDirtyAtt(prev => ({ ...prev, [key]: status }));
  }
  function getStatus(adm, date) {
    return att[`${grade}|${date}|${adm}`] || '';
  }

  async function save() {
    const toSync = { ...dirtyAtt };
    if (Object.keys(toSync).length === 0) return;

    setBusy(true);
    try {
      await fetch('/api/db', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
          requests:[
            { type:'updateAttendanceBulk', attMap: toSync },
            { type:'logActivity', activity: { action:'Updated Attendance', details:`Marked attendance for ${grade} on ${selDate}` } }
          ] 
        })
      });

      // Clear dirty flags
      setDirtyAtt(prev => {
        const next = { ...prev };
        Object.keys(toSync).forEach(k => delete next[k]);
        return next;
      });

      playSuccessSound();
      setAlert('✅ Attendance saved!');
      setTimeout(()=>setAlert(''),3000);
    } catch(e) { setAlert('❌ '+e.message); }
    finally { setBusy(false); }
  }
  
  function markAllPresent() {
    if (!classList.length) return;
    const updates = {};
    classList.forEach(l => {
      const key = `${grade}|${selDate}|${l.adm}`;
      updates[key] = 'P';
    });
    setAtt(prev => ({ ...prev, ...updates }));
    setDirtyAtt(prev => ({ ...prev, ...updates }));
  }

  /* ─── Analytics helpers ── */
  function learnerStats(adm, days) {
    const counts = { P:0, A:0, L:0, E:0, total:0 };
    days.forEach(d => {
      const s = att[`${grade}|${d}|${adm}`];
      if (s) { counts[s] = (counts[s]||0)+1; counts.total++; }
    });
    counts.pct = counts.total ? Math.round(((counts.P+counts.L+counts.E)/counts.total)*100) : 100;
    return counts;
  }

  function classStats(days) {
    let P=0,A=0,L=0,E=0,total=0;
    classList.forEach(l => {
      const s = learnerStats(l.adm, days);
      P+=s.P; A+=s.A; L+=s.L; E+=s.E; total+=s.total;
    });
    return { P, A, L, E, total, pct: total ? Math.round(((P+L+E)/total)*100) : 100 };
  }

  if (loading || !user) return <div className="page on"><p style={{padding:40}}>Loading attendance…</p></div>;

  // If teacher has no assigned class
  if (!isAdmin && !grade) return (
    <div className="page on">
      <div className="page-hdr"><div><h2>📋 Attendance</h2></div></div>
      <div className="panel"><div className="panel-body" style={{textAlign:'center',padding:40}}>
        <p style={{fontSize:32,marginBottom:16}}>🔒</p>
        <h3>Not Assigned as Class Teacher</h3>
        <p style={{color:'var(--muted)'}}>You are not assigned as a class teacher for any grade.<br/>Please contact the administrator to assign you.</p>
      </div></div>
    </div>
  );

  const VIEWS = [
    { id:'mark',    label:'📝 Mark Register' },
    { id:'weekly',  label:'📊 Weekly' },
    { id:'monthly', label:'📅 Monthly' },
    { id:'termly',  label:'📈 Termly' },
    { id:'annual',  label:'🗓️ Annual' },
  ];

  // Derive periods for analytics
  const weekDays    = schoolDays.filter(d => weekOf(d) === weekOf(selDate));
  const monthDays   = schoolDays.filter(d => monthOf(d) === monthOf(selDate));
  const annualDays  = TERMS.flatMap(t => getSchoolDays(t.id));

  return (
    <div className="page on" id="pg-attendance">
      <div className="page-hdr">
        <div>
          <h2>📋 {LABELS.attendance} Register</h2>
          <p>{grade} · {term} · {isAdmin ? 'Admin View' : 'Class Teacher'}</p>
        </div>
        <div className="page-hdr-acts" style={{gap:8,flexWrap:'wrap'}}>
          {isAdmin && (
            <select value={grade} onChange={e=>setGrade(e.target.value)} className="sc-inp">
              {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          )}
          <select value={term} onChange={e=>setTerm(e.target.value)} className="sc-inp">
            {activeTerms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {activeView === 'mark' && (
            <>
              <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} className="sc-inp" />
              <button className="btn btn-primary" onClick={save} disabled={busy||!canMark}>
                {busy ? 'Saving…' : '💾 Save'}
              </button>
            </>
          )}
          {(activeView === 'weekly'||activeView==='monthly'||activeView==='termly'||activeView==='annual') && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(activeView === 'weekly'||activeView==='monthly') && (
                <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} className="sc-inp" />
              )}
              <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>
                🖨️ Print Report
              </button>
            </div>
          )}
        </div>
      </div>

      {alert && <div className={`alert ${alert.startsWith('✅')?'alert-ok':'alert-err'} show`} style={{marginBottom:12}}>{alert}</div>}

      {!canMark && activeView==='mark' && (
        <div className="alert alert-err show" style={{marginBottom:12}}>
          🔒 Only the assigned class teacher for <strong>{grade}</strong> can mark attendance. You can view reports.
        </div>
      )}

      {/* View tabs */}
      <div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setActiveView(v.id)}
            className={`btn btn-sm ${activeView===v.id?'btn-primary':'btn-ghost'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── MARK REGISTER ── */}
      {activeView === 'mark' && (
        <div className="panel">
          <div className="panel-hdr">
            <h3>Daily Register — {selDate}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={markAllPresent} style={{ color: STATUS_COLORS.P, fontWeight: 800 }}>
                ✅ Mark All Present
              </button>
              <span style={{fontSize:12,color:'var(--muted)'}}>{classList.length} {LABELS.grades.toLowerCase()}</span>
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>ADM</th><th style={{textAlign:'left'}}>Name</th>
                  {(['P','A','L','E']).map(s=>(
                    <th key={s} style={{color:STATUS_COLORS[s]}}>{s} — {STATUS_LABELS[s]}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {classList.map(l => {
                  const status = getStatus(l.adm, selDate);
                  return (
                    <tr key={l.adm}>
                      <td style={{fontSize:11,color:'var(--muted)'}}>{l.adm}</td>
                      <td style={{fontWeight:600}}>{l.name}</td>
                      {(['P','A','L','E']).map(s=>(
                        <td key={s} style={{textAlign:'center'}}>
                          <button
                            onClick={()=>setStatus(l.adm, selDate, s)}
                            style={{
                              width:32,height:32,borderRadius:'50%',border:`2px solid ${STATUS_COLORS[s]}`,
                              background: status===s ? STATUS_COLORS[s] : 'transparent',
                              color: status===s ? '#fff' : STATUS_COLORS[s],
                              fontWeight:800,cursor:'pointer',fontSize:13,
                            }}
                          >{s}</button>
                        </td>
                      ))}
                      <td>
                        {status ? (
                          <span className="badge" style={{background:STATUS_COLORS[status]+'22',color:STATUS_COLORS[status]}}>
                            {STATUS_LABELS[status]}
                          </span>
                        ) : <span style={{color:'#ccc',fontSize:11}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {classList.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No {LABELS.grades.toLowerCase()} in {grade}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ANALYTICS VIEWS ── */}
      {(['weekly','monthly','termly','annual']).includes(activeView) && (() => {
        const days = activeView==='weekly' ? weekDays : activeView==='monthly' ? monthDays : activeView==='termly' ? schoolDays : annualDays;
        const cls  = classStats(days);
        return (
          <div>
            {/* Class Summary Cards */}
            <div className="sg sg4" style={{marginBottom:18}}>
              {[
                { label:'School Days', val: days.length, icon:'📅', color:'#2563EB' },
                { label:'Avg Attendance', val: `${cls.pct}%`, icon:'✅', color:cls.pct>=90?'#059669':'#DC2626' },
                { label:'Total Absences', val: cls.A, icon:'❌', color:'#DC2626' },
                { label:'Lates/Excused', val: cls.L+cls.E, icon:'⚠️', color:'#D97706' },
              ].map(c=>(
                <div key={c.label} className="panel" style={{textAlign:'center'}}>
                  <div style={{fontSize:28}}>{c.icon}</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:c.color}}>{c.val}</div>
                  <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Learner Breakdown Table */}
            <div className="panel">
              <div className="panel-hdr">
                <h3>{LABELS.grade} {LABELS.attendance} — {activeView.charAt(0).toUpperCase()+activeView.slice(1)}</h3>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left'}}>Name</th>
                      <th>Days Marked</th>
                      <th style={{color:STATUS_COLORS.P}}>Present</th>
                      <th style={{color:STATUS_COLORS.A}}>Absent</th>
                      <th style={{color:STATUS_COLORS.L}}>Late</th>
                      <th style={{color:STATUS_COLORS.E}}>Excused</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classList.map(l => {
                      const s = learnerStats(l.adm, days);
                      const risk = s.pct < 75 ? 'High Risk' : s.pct < 90 ? 'At Risk' : 'Good';
                      const riskColor = s.pct < 75 ? '#DC2626' : s.pct < 90 ? '#D97706' : '#059669';
                      return (
                        <tr key={l.adm}>
                          <td style={{fontWeight:600}}>{l.name}</td>
                          <td style={{textAlign:'center'}}>{s.total}/{days.length}</td>
                          <td style={{textAlign:'center',color:STATUS_COLORS.P,fontWeight:700}}>{s.P}</td>
                          <td style={{textAlign:'center',color:STATUS_COLORS.A,fontWeight:700}}>{s.A}</td>
                          <td style={{textAlign:'center',color:STATUS_COLORS.L,fontWeight:700}}>{s.L}</td>
                          <td style={{textAlign:'center',color:STATUS_COLORS.E,fontWeight:700}}>{s.E}</td>
                          <td style={{textAlign:'center'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{flex:1,height:8,background:'#e5e7eb',borderRadius:4,overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${s.pct}%`,background:riskColor,borderRadius:4,transition:'width .3s'}} />
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:riskColor,minWidth:36}}>{s.pct}%</span>
                            </div>
                          </td>
                          <td><span className="badge" style={{background:riskColor+'22',color:riskColor}}>{risk}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Absenteeism Alert */}
            {classList.filter(l=>learnerStats(l.adm,days).pct<75).length > 0 &&
              <div className="panel" style={{border:'2px solid #DC2626',marginTop:12}}>
                <div className="panel-hdr" style={{background:'#FEF2F2'}}>
                  <h3 style={{color:'#DC2626'}}>⚠️ High Absenteeism Alert — Action Required</h3>
                </div>
                <div className="panel-body">
                  <p style={{fontSize:13,color:'#7F1D1D',marginBottom:12}}>The following learners have attendance below 75%. Contact parents immediately.</p>
                  {classList.filter(l=>learnerStats(l.adm,days).pct<75).map(l=>{
                    const s = learnerStats(l.adm,days);
                    return <div key={l.adm} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #FCA5A5'}}>
                      <div>
                        <div style={{fontWeight:600}}>{l.name}</div>
                        <div style={{fontSize:11,color:'#991B1B'}}>ADM: {l.adm} • {s.pct}% ({s.A} absences)</div>
                      </div>
                      <button 
                        className="btn btn-danger btn-xs"
                        onClick={async () => {
                          if (!confirm(`Send absenteeism SMS alert to parent of ${l.name}?`)) return;
                          setBusy(true);
                          try {
                            const res = await fetch('/api/comms/push', {
                              method:'POST', headers:{'Content-Type':'application/json'},
                              body: JSON.stringify({
                                type: 'absenteeism',
                                channel: 'sms',
                                targets: [{ adm: l.adm, pct: s.pct, absences: s.A }]
                              })
                            });
                            const data = await res.json();
                            if (data.ok) alert('✅ Alert sent!');
                            else alert('❌ ' + (data.error || 'Failed to send'));
                          } catch (e) { alert('❌ ' + e.message); }
                          finally { setBusy(false); }
                        }}
                        disabled={busy}
                      >
                        📲 Notify Parent
                      </button>
                    </div>;
                  })}
                </div>
              </div>
            }
          </div>
        );
      })()}

      <style jsx>{`
        .sc-inp { padding: 8px 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 13px; outline: none; }
        
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; background: white !important; }
          .no-print, .btn, .page-hdr-acts, .sc-inp, select { display: none !important; }
          .page { padding: 0 !important; margin: 0 !important; border: none !important; }
          .panel { box-shadow: none !important; border: 1px solid #ddd !important; margin-bottom: 10px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { padding: 6px 4px !important; font-size: 10px !important; border: 1px solid #eee !important; }
          .stat-card, .sg { margin-bottom: 10px !important; }
          .stat-card { border: 1px solid #eee !important; }
          .badge { border: 1px solid currentColor !important; }
          .page-hdr h2 { font-size: 18px !important; margin: 0 !important; }
          .page-hdr p { font-size: 10px !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
