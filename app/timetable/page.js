'use client';
/**
 * app/timetable/page.js — School Timetable (CBC Rules)
 * Tabs: Calendar | Grade View | My Timetable | Generate (admin)
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, fetchWithRetry, invalidateDB } from '@/lib/client-cache';
import { getAllGrades, getCurriculum } from '@/lib/cbe';
import { getDefaultSubjectConfig, generateTimetableData } from '@/lib/timetable-gen.js';
import { useProfile } from '@/app/PortalShell';

const M = '#8B1A1A';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

const LEVEL_CFG = {
  primary13: { dur: 35, perDay: [7,7,7,5,5], breaks: [{ after: 2, label:'Break', dur: 20 },{ after: 5, label:'Lunch', dur: 60 }] },
  primary46: { dur: 35, perDay: [7,7,7,7,7], breaks: [{ after: 2, label:'Break', dur: 20 },{ after: 5, label:'Lunch', dur: 60 }] },
  jss:       { dur: 40, perDay: [9,9,9,9,9], breaks: [{ after: 2, label:'Break', dur: 30 },{ after: 6, label:'Lunch', dur: 60 }] },
  senior:    { dur: 40, perDay: [8,8,8,8,8], breaks: [{ after: 2, label:'Break', dur: 30 },{ after: 5, label:'Lunch', dur: 60 }] },
  // Fallbacks for other curriculums to prevent crashes
  ks1:       { dur: 35, perDay: [7,7,7,7,7], breaks: [{ after: 2, label:'Break', dur: 20 },{ after: 5, label:'Lunch', dur: 60 }] },
  ks2:       { dur: 35, perDay: [7,7,7,7,7], breaks: [{ after: 2, label:'Break', dur: 20 },{ after: 5, label:'Lunch', dur: 60 }] },
  ks3:       { dur: 40, perDay: [8,8,8,8,8], breaks: [{ after: 2, label:'Break', dur: 30 },{ after: 5, label:'Lunch', dur: 60 }] },
  igcse:     { dur: 40, perDay: [8,8,8,8,8], breaks: [{ after: 2, label:'Break', dur: 30 },{ after: 5, label:'Lunch', dur: 60 }] },
  pyp:       { dur: 35, perDay: [7,7,7,7,7], breaks: [{ after: 2, label:'Break', dur: 20 },{ after: 5, label:'Lunch', dur: 60 }] },
  myp:       { dur: 40, perDay: [8,8,8,8,8], breaks: [{ after: 2, label:'Break', dur: 30 },{ after: 5, label:'Lunch', dur: 60 }] },
};

function getGradeKey(g, curr) {
  if (!curr || !curr.gradeGroup) return 'primary13';
  return curr.gradeGroup(g);
}

const EVENT_TYPES = ['Academic','Sports','Holiday','Meeting','Examination','Cultural','Trip','Other'];
const TYPE_COLORS = { Academic:'#2563EB',Sports:'#059669',Holiday:'#D97706',Meeting:'#7C3AED',Examination:'#8B1A1A',Cultural:'#0D9488',Trip:'#92400E',Other:'#64748B' };

const SUBJ_COLORS = {
  English:'#1D4ED8',Kiswahili:'#0D9488',Mathematics:'#7C3AED',Science:'#059669',
  'Social Studies':'#D97706','Home Science':'#BE185D',CRE:'#8B1A1A',
  'Creative Arts':'#0891B2',PE:'#16A34A',IRE:'#92400E',Music:'#6D28D9',
  Agriculture:'#4D7C0F','Business Studies':'#B45309','Computer Studies':'#1E40AF',
  Physics:'#7C3AED',Chemistry:'#059669',Biology:'#16A34A',History:'#B45309',
  Geography:'#0D9488',PPI:'#8B1A1A',Games:'#16A34A',default:'#64748B'
};
function subjColor(s) { return SUBJ_COLORS[s] || SUBJ_COLORS.default; }

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(m) {
  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const gradeLevel = (grade, curr) => {
  if (!grade || !curr) return 'Unknown';
  const group = curr.gradeGroup(grade);
  const mapping = {
    'pre': 'Pre-School',
    'primary13': 'Lower Primary',
    'primary46': 'Upper Primary',
    'pyp': 'PYP (Primary)',
    'ks1': 'Key Stage 1',
    'ks2': 'Key Stage 2',
    'jss': 'Junior Secondary',
    'myp': 'MYP (Middle)',
    'ks3': 'Key Stage 3',
    'igcse': 'IGCSE',
    'senior': 'Senior School',
    'a-level': 'A-Level',
    'dp': 'DP (Diploma)'
  };
  return mapping[group] || 'Academic';
};

export default function TimetablePage() {
  const router = useRouter();
  const { profile: school } = useProfile() || { profile: {} };
  const ALL_GRADES = getAllGrades(school?.curriculum || 'CBC');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [staff, setStaff] = useState([]);
  const [allocs, setAllocs] = useState({});
  const [codes, setCodes] = useState({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [selGrade, setSelGrade] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customCfg, setCustomCfg] = useState(null);

  useEffect(() => {
    if (!selGrade && ALL_GRADES.length > 0) {
      setSelGrade(ALL_GRADES[0]);
    }
  }, [ALL_GRADES, selGrade]);
  const [editEv, setEditEv] = useState(null);
  const [form, setForm] = useState({ title:'', date:'', desc:'', type:'Academic' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);
      const data = await getCachedDBMulti(['paav_calendar_events','paav_timetable','paav6_staff', 'paav7_timetable_cfg', 'paav_allocations', 'paav_teacher_codes']);
      setEvents(data['paav_calendar_events'] || []);
      setTimetable(data['paav_timetable'] || {});
      setStaff(data['paav6_staff'] || []);
      setCustomCfg(data['paav7_timetable_cfg'] || null);
      setAllocs(data['paav_allocations'] || {});
      setCodes(data['paav_teacher_codes'] || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function saveEvent() {
    if (!form.title || !form.date) { alert('Title and date required'); return; }
    setBusy(true);
    const updated = editEv != null
      ? events.map((e,i) => i===editEv ? {...form} : e)
      : [...events, { ...form, id:'ev'+Date.now() }];
    await fetchWithRetry('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_calendar_events', value:updated }] }) });
    invalidateDB('paav_calendar_events');
    setEvents(updated); setShowModal(false); setEditEv(null);
    setForm({ title:'', date:'', desc:'', type:'Academic' }); setBusy(false);
  }

  async function deleteEvent(i) {
    if (!confirm('Delete this event?')) return;
    const currentEvents = Array.isArray(events) ? events : [];
    const updated = currentEvents.filter((_,idx) => idx!==i);
    await fetchWithRetry('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_calendar_events', value:updated }] }) });
    invalidateDB('paav_calendar_events');
    setEvents(updated);
  }

  async function saveTimetable(tt) {
    await fetchWithRetry('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_timetable', value:tt }] }) });
    invalidateDB('paav_timetable');
    setTimetable(tt);
  }

  // Build slots for a grade
  const curr = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  const gradeKey = getGradeKey(selGrade, curr);
  
  // MERGE hardcoded CFG with school-specific customCfg
  const cfg = useMemo(() => {
    const base = LEVEL_CFG[gradeKey] || LEVEL_CFG.primary13 || { dur: 35, perDay: [7,7,7,7,7] };
    if (!customCfg) return base;
    
    // Map gradeKey to setting level (primary, junior, senior)
    let setLevel = 'primary';
    if (['jss','ks3','igcse','myp'].includes(gradeKey)) setLevel = 'junior';
    if (['senior','a-level','dp', 'grade 10', 'grade 11', 'grade 12'].includes(gradeKey.toLowerCase())) setLevel = 'senior';
    
    const levelCfg = customCfg[setLevel];
    if (!levelCfg) return base;

    let breaks = levelCfg.breaks || base.breaks;
    
    // Map custom breaks from Setup to include 'after' if missing
    if (breaks && breaks.length > 0 && levelCfg.startTime) {
       let curMins = timeToMins(levelCfg.startTime);
       const lessonDur = levelCfg.lessonDuration || base.dur;
       
       breaks = breaks.map(b => {
         if (b.after !== undefined) return b;
         const bStart = timeToMins(b.startTime);
         const periodsBefore = Math.round((bStart - curMins) / lessonDur);
         return {
           label: b.name || 'Break',
           dur: b.duration || 30,
           after: periodsBefore
         };
       });
    }

    return {
      ...base,
      startTime: levelCfg.startTime || '08:00',
      dur: levelCfg.lessonDuration || base.dur,
      perDay: levelCfg.lessonsPerDay ? Array(5).fill(levelCfg.lessonsPerDay) : base.perDay,
      breaks: breaks
    };
  }, [gradeKey, customCfg]);

  const slotTimes = useMemo(() => {
    const times = [];
    let cur = timeToMins(cfg.startTime || '08:00');
    const globalMax = cfg.perDay ? Math.max(...cfg.perDay) : 8;
    let period = 1;
    for (let i=1; i<=globalMax; i++) {
      const end = cur + (cfg.dur || 40);
      times.push({ period, start: minsToTime(cur), end: minsToTime(end) });
      cur = end;
      period++;
      const brk = (cfg.breaks||[]).find(b => b.after === i);
      if (brk) cur += (brk.dur || 30);
    }
    return times;
  }, [cfg]);

  const gradeTT = useMemo(() => (timetable && selGrade) ? (timetable[selGrade] || {}) : {}, [timetable, selGrade]);
  const perDay = Array.isArray(cfg.perDay) ? cfg.perDay : [8,8,8,8,8];
  const maxPeriods = perDay.length > 0 ? Math.max(...perDay) : 8;

  // My timetable: find all slots where this teacher is assigned
  const mySlots = useMemo(() => {
    if (!user || !timetable) return [];
    const out = [];
    try {
      Object.entries(timetable).forEach(([grade, days]) => {
        if (!days) return;
        Object.entries(days).forEach(([day, periods]) => {
          if (!periods) return;
          Object.entries(periods).forEach(([period, slot]) => {
            let isMine = false;
            if (slot?.teacherId === user.id || slot?.teacher === user.name) isMine = true;
            if (slot?.subject && allocs[`${grade}|${slot.subject}`] === user.id) isMine = true;
            
            if (isMine) {
              out.push({ grade, day, period: Number(period), subject: slot.subject, teacher: slot.teacher });
            }
          });
        });
      });
    } catch(e) { console.error('[Timetable] mySlots failed:', e); }
    return out;
  }, [timetable, user, allocs]);

  const isAdmin   = ['admin', 'staff', 'super-admin'].includes(user?.role);
  const isTeacher = ['admin', 'teacher', 'staff', 'jss_teacher', 'senior_teacher', 'super-admin'].includes(user?.role);
  const sorted = [...events].sort((a,b) => a.date.localeCompare(b.date));
  const today0 = new Date().toISOString().split('T')[0];
  const upcoming = sorted.filter(e => e.date >= today0);
  const past = sorted.filter(e => e.date < today0).reverse();

  const TABS = [
    { id:'calendar', label:'📅 Calendar' },
    { id:'grade',    label:'🗓 Grade Timetable' },
    ...(isTeacher ? [{ id:'mine', label:'👔 My Timetable' }] : []),
    ...(isAdmin   ? [{ id:'edit', label:'⚙️ Edit Timetable' }] : []),
  ];

  if (error) return (
    <div className="page on" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
      <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Connection Issue</h3>
      <p style={{ color: 'var(--red)', marginBottom: '24px', fontSize: 13 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry Connection</button>
    </div>
  );

  if (!mounted || loading || !user) return (
    <div className="page on" style={{padding:60,textAlign:'center',color:'var(--muted)'}}>
      <div style={{fontSize:32,marginBottom:10}}>📅</div>Loading…
    </div>
  );

  return (
    <>
      <div className="page on">
        <div className="page-hdr">
          <div>
            <h2>📅 Timetable &amp; Calendar</h2>
            <p>CBC-compliant timetable &amp; school events</p>
          </div>
          <div className="page-hdr-acts">
            {tab==='calendar' && isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => { setEditEv(null); setForm({ title:'',date:'',desc:'',type:'Academic' }); setShowModal(true); }}>
                ➕ Add Event
              </button>
            )}
            <a className="btn btn-ghost btn-sm" href="/timetable-generator.html" target="_blank">
              🛠 Generator Tool
            </a>
            <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>🖨️ Print</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs" style={{marginBottom:16}}>
          {TABS.map(t => (
            <button key={t.id} className={`profile-tab-btn${tab===t.id?' on':''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CALENDAR TAB ── */}
        {tab==='calendar' && (
          <div>
            {upcoming.length === 0 ? (
              <div className="panel"><div className="panel-body" style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
                <div style={{fontSize:42}}>📅</div>
                <div style={{fontWeight:700,fontSize:15,marginTop:8}}>No upcoming events</div>
                {isAdmin && <div style={{fontSize:12,marginTop:4}}>Click + Add Event to schedule school activities</div>}
              </div></div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {upcoming.map((ev,i) => {
                  const col = TYPE_COLORS[ev.type]||'#64748B';
                  const [yr,mo,dy] = ev.date.split('-');
                  const MN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  return (
                    <div key={i} className="panel" style={{borderLeft:`5px solid ${col}`,marginBottom:0}}>
                      <div className="panel-body" style={{display:'flex',alignItems:'flex-start',gap:14,padding:'12px 16px'}}>
                        <div style={{minWidth:52,textAlign:'center',background:`${col}15`,borderRadius:10,padding:'8px 4px'}}>
                          <div style={{fontSize:9,fontWeight:800,color:col,textTransform:'uppercase'}}>{MN[+mo]}</div>
                          <div style={{fontSize:20,fontWeight:900,color:col,lineHeight:1}}>{dy}</div>
                          <div style={{fontSize:9,color:'var(--muted)'}}>{yr}</div>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:800,fontSize:14}}>{ev.title}</div>
                          {ev.desc && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{ev.desc}</div>}
                          <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${col}20`,color:col,marginTop:4,display:'inline-block'}}>{ev.type}</span>
                        </div>
                        {isAdmin && (
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditEv(i); setForm({...ev}); setShowModal(true); }}>✏</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteEvent(i)}>🗑️</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {past.length > 0 && (
                  <details className="panel" style={{marginTop:8}}>
                    <summary style={{padding:'12px 16px',fontWeight:700,cursor:'pointer',color:'var(--muted)'}}>📋 Past Events ({past.length})</summary>
                    <div className="tbl-wrap">
                      <table>
                        <thead><tr><th>Date</th><th>Event</th><th>Type</th></tr></thead>
                        <tbody>
                          {past.map((ev,i) => (
                            <tr key={i}>
                              <td style={{fontFamily:'monospace',fontSize:12}}>{ev.date}</td>
                              <td style={{fontWeight:600}}>{ev.title}</td>
                              <td><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${TYPE_COLORS[ev.type]||'#64748B'}20`,color:TYPE_COLORS[ev.type]||'#64748B'}}>{ev.type}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── GRADE TIMETABLE TAB ── */}
        {tab==='grade' && (
          <div>
            <div className="panel" style={{marginBottom:12}}>
              <div className="panel-body" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <div className="field" style={{marginBottom:0}}>
                  <label>Select Grade</label>
                  <select value={selGrade} onChange={e => setSelGrade(e.target.value)}>
                    {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{fontSize:12,color:'var(--muted)',padding:'4px 10px',background:'#F0F4FF',borderRadius:8}}>
                  {(gradeLevel(selGrade, curr) || 'N/A').toUpperCase()} · {cfg.dur} min/lesson · {cfg.perDay.reduce((a,b)=>a+b,0)} lessons/week
                </div>
              </div>
            </div>
            <div className="tbl-wrap no-scroll-print">
              <table style={{tableLayout:'fixed',minWidth:600}}>
                <thead>
                  <tr>
                    <th style={{width:60,background:`linear-gradient(135deg,${M},#6B1212)`,color:'#fff'}}>Period</th>
                    {DAYS.map(d => <th key={d} style={{background:`linear-gradient(135deg,${M},#6B1212)`,color:'#fff'}}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length: maxPeriods}, (_,pi) => {
                    const brk = (cfg.breaks||[]).find(b => b.after === (pi + 1));
                    return (
                    <React.Fragment key={pi}>
                    <tr>
                      <td style={{fontWeight:700,textAlign:'center',fontSize:12,background:'#F8FAFF'}}>
                        <div>{pi+1}</div>
                        {slotTimes[pi] && <div style={{fontSize:9,color:'var(--muted)',fontWeight:500,marginTop:2}}>{slotTimes[pi].start}<br/>{slotTimes[pi].end}</div>}
                      </td>
                      {DAYS.map((day, di) => {
                        const dayMax = cfg.perDay?.[di] || 8;
                        const isOutOfBounds = (pi + 1) > dayMax;
                        const slot = (gradeTT[day]||{})[pi+1];
                        
                        let displayTeacher = slot?.teacher;
                        if (slot?.subject) {
                          const staffId = allocs[`${selGrade}|${slot.subject}`];
                          if (staffId) {
                            const tCode = codes[staffId];
                            const tName = staff.find(s=>s.id===staffId)?.name;
                            displayTeacher = tCode ? tCode : (tName || displayTeacher);
                          }
                        }

                        const bg = slot?.subject ? subjColor(slot.subject) : null;
                        return (
                          <td key={day} style={{padding:4,verticalAlign:'top', background: isOutOfBounds ? '#f1f5f9' : 'transparent'}}>
                            {isOutOfBounds ? null : slot?.subject ? (
                              <div style={{background:`${bg}18`,border:`1.5px solid ${bg}40`,borderRadius:8,padding:'6px 8px'}}>
                                <div style={{fontWeight:700,fontSize:11,color:bg}}>{slot.subject}</div>
                                {displayTeacher && <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{displayTeacher}</div>}
                              </div>
                            ) : (
                              <div style={{color:'#cbd5e1',fontSize:10,textAlign:'center',padding:8}}>—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {brk && (
                      <tr>
                        <td colSpan={DAYS.length + 1} style={{textAlign:'center', background:'#f8fafc', padding:'8px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase'}}>
                          ☕ {brk.label || 'Break'} ({brk.dur} min)
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MY TIMETABLE ── */}
        {tab==='mine' && isTeacher && (
          <div>
            {mySlots.length === 0 ? (
              <div className="panel"><div className="panel-body" style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
                <div style={{fontSize:36}}>👔</div>
                <div style={{fontWeight:700,marginTop:8}}>No timetable slots assigned yet</div>
                <div style={{fontSize:12,marginTop:4}}>Ask admin to generate and save the timetable</div>
              </div></div>
            ) : (
              <div>
                {/* Summary cards */}
                <div className="sg sg4" style={{marginBottom:14}}>
                  <div className="stat-card"><div className="sc-inner"><div className="sc-icon" style={{background:'#EFF6FF'}}>📚</div><div><div className="sc-n">{mySlots.length}</div><div className="sc-l">Total Lessons/wk</div></div></div></div>
                  <div className="stat-card"><div className="sc-inner"><div className="sc-icon" style={{background:'#F5E6E6'}}>🎓</div><div><div className="sc-n">{[...new Set(mySlots.map(s=>s.grade))].length}</div><div className="sc-l">Grades</div></div></div></div>
                  <div className="stat-card"><div className="sc-inner"><div className="sc-icon" style={{background:'#FDF4FF'}}>📖</div><div><div className="sc-n">{[...new Set(mySlots.map(s=>s.subject))].length}</div><div className="sc-l">Subjects</div></div></div></div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Day</th><th>Period</th><th>Grade</th><th>Subject</th></tr></thead>
                    <tbody>
                      {DAYS.map(day => {
                        const daySlots = mySlots.filter(s=>s.day===day).sort((a,b)=>a.period-b.period);
                        if (!daySlots.length) return null;
                        return daySlots.map((s,i) => (
                          <tr key={`${day}-${i}`}>
                            {i===0 && <td rowSpan={daySlots.length} style={{fontWeight:800,verticalAlign:'middle',background:'#F8FAFF',color:M}}>{day}</td>}
                            <td style={{textAlign:'center',fontWeight:700}}>{s.period}</td>
                            <td><span className="badge bg-blue" style={{fontSize:10}}>{s.grade}</span></td>
                            <td><span style={{fontWeight:700,color:subjColor(s.subject)}}>{s.subject}</span></td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EDIT/GENERATE (admin) ── */}
        {tab==='edit' && isAdmin && (
          <EditTimetablePanel
            timetable={timetable}
            staff={staff}
            allocs={allocs}
            codes={codes}
            selGrade={selGrade}
            setSelGrade={setSelGrade}
            onSave={saveTimetable}
            curr={curr}
            ALL_GRADES={ALL_GRADES}
            cfg={cfg}
          />
        )}
      </div>

      {/* Event Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-hdr">
              <h3>{editEv!=null ? '✏ Edit Event' : '➕ Add School Event'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field"><label>Event Title *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Term 1 Opening Day" /></div>
              <div className="field-row">
                <div className="field"><label>Date *</label>
                  <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="field"><label>Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="field"><label>Description</label>
                <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Brief description…" /></div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveEvent} disabled={busy}>
                  {busy ? '⏳ Saving…' : '💾 Save Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Edit Timetable Panel ── */
function EditTimetablePanel({ timetable, staff, allocs, codes, selGrade, setSelGrade, onSave, curr, ALL_GRADES, cfg }) {
  const [localTT, setLocalTT] = useState(timetable);
  const [saving, setSaving] = useState(false);
  const gradeKey = getGradeKey(selGrade, curr);
  const maxPeriods = cfg.perDay ? Math.max(...cfg.perDay) : 8;
  const gradeTT = localTT[selGrade] || {};
  const teachers = staff.filter(s => s.role==='teacher' || s.role==='admin');

  const slotTimes = useMemo(() => {
    const times = [];
    let cur = timeToMins(cfg.startTime || '08:00');
    let period = 1;
    for (let i=1; i<=maxPeriods; i++) {
      const end = cur + (cfg.dur || 40);
      times.push({ period, start: minsToTime(cur), end: minsToTime(end) });
      cur = end;
      period++;
      const brk = (cfg.breaks||[]).find(b => b.after === i);
      if (brk) cur += (brk.dur || 30);
    }
    return times;
  }, [cfg, maxPeriods]);

  function setSlot(day, period, field, value) {
    setLocalTT(tt => ({
      ...tt,
      [selGrade]: {
        ...tt[selGrade],
        [day]: {
          ...(tt[selGrade]?.[day] || {}),
          [period]: { ...(tt[selGrade]?.[day]?.[period] || {}), [field]: value }
        }
      }
    }));
  }

  
  async function autoGenerate() {
    setSaving(true);
    try {
      const lvl = gradeLevel(selGrade, curr);
      let assignedSubjects = Object.keys(allocs).filter(k => k.startsWith(selGrade + '|')).map(k => k.split('|')[1]);
      
      if(assignedSubjects.length === 0) {
        assignedSubjects = curr.DEFAULT_SUBJECTS?.[selGrade] || [];
        if(assignedSubjects.length === 0) {
          alert('No subjects allocated for ' + selGrade + '. Please assign subjects in Allocations module first.');
          setSaving(false); return;
        }
      }

      const subjectsForGen = assignedSubjects.map(subjName => {
        const staffId = allocs[`${selGrade}|${subjName}`];
        const tCode = codes[staffId];
        const tName = staff.find(s=>s.id===staffId)?.name;
        const displayTeacher = tCode ? tCode : tName;
        const config = getDefaultSubjectConfig(subjName, lvl);
        return { name: subjName, teacher: displayTeacher, lessons: config.lessons, dbl: config.dbl, priority: config.priority };
      });

      const result = generateTimetableData(subjectsForGen, cfg, DAYS);
      if(result.unplaced && result.unplaced.length > 0) {
        alert(`Warning: ${result.unplaced.length} lessons could not be placed automatically. Resolving remaining slots manually.`);
      }

      // Format to localTT structure
      const newGradeTT = {};
      DAYS.forEach(d => {
        newGradeTT[d] = {};
        const dayIdx = DAYS.indexOf(d);
        const dayMax = cfg.perDay[dayIdx] || cfg.perDay[0];
        for(let p=1; p<=dayMax; p++) {
          const slot = result.grid[d]?.[p];
          if (slot && !slot.cont) {
             newGradeTT[d][p] = { subject: slot.name || slot.subject, teacher: slot.teacher || '' };
          }
        }
      });

      const updatedTT = { ...localTT, [selGrade]: newGradeTT };
      setLocalTT(updatedTT);
      await onSave(updatedTT);
      alert('⚡ Auto-generation complete and saved to portal!');

    } catch (e) {
      alert('Error auto-generating: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    await onSave(localTT);
    setSaving(false);
    alert('✅ Timetable saved!');
  }

  async function pasteJSON() {
    try {
      const text = await navigator.clipboard.readText();
      const grid = JSON.parse(text);
      if(!grid.Monday) throw new Error("Invalid format");
      
      const newGradeTT = {};
      DAYS.forEach(d => {
        newGradeTT[d] = {};
        for(let p=1; p<=8; p++) {
          const slot = grid[d]?.[p];
          if(slot && !slot.cont) {
            newGradeTT[d][p] = { subject: slot.name || slot.subject, teacher: slot.teacher || '' };
          }
        }
      });
      const updatedTT = { ...localTT, [selGrade]: newGradeTT };
      setLocalTT(updatedTT);
      await onSave(updatedTT);
      alert('✅ Timetable pasted and saved successfully!');
    } catch(e) {
      alert('Failed to paste JSON. Make sure you clicked "Copy JSON" in the Generator tool.');
    }
  }

  return (
    <div>
      <div className="panel" style={{marginBottom:12}}>
        <div className="panel-body" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div className="field" style={{marginBottom:0}}>
            <label>Grade to Edit</label>
            <select value={selGrade} onChange={e => setSelGrade(e.target.value)}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <button className="btn btn-gold btn-sm" onClick={autoGenerate} disabled={saving}>
            {saving ? '⏳...' : '⚡ Auto-Generate'}
          </button>
          <a href="/timetable-generator.html" target="_blank" className="btn btn-ghost btn-sm">🛠 Generator Tool</a>
          <button className="btn btn-ghost btn-sm" onClick={pasteJSON} disabled={saving}>
            📋 Paste JSON from Generator
          </button>
          <button className="btn btn-maroon btn-sm" onClick={save} disabled={saving}>
            {saving ? '⏳ Saving…' : '💾 Save Timetable'}
          </button>
        </div>
      </div>
      <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>
        💡 Tip: Use the Generator Tool to auto-create a clash-free timetable, then paste it here or save directly from the tool.
      </p>
      <div className="tbl-wrap">
        <table style={{tableLayout:'fixed',minWidth:700}}>
          <thead>
            <tr>
              <th style={{width:55,background:`linear-gradient(135deg,${M},#6B1212)`,color:'#fff'}}>P#</th>
              {DAYS.map(d => <th key={d} style={{background:`linear-gradient(135deg,${M},#6B1212)`,color:'#fff'}}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({length: maxPeriods}, (_,pi) => {
              const brk = (cfg.breaks||[]).find(b => b.after === (pi + 1));
              return (
              <React.Fragment key={pi}>
              <tr>
                <td style={{fontWeight:700,textAlign:'center',fontSize:12,background:'#F8FAFF'}}>
                  <div>{pi+1}</div>
                  {slotTimes[pi] && <div style={{fontSize:9,color:'var(--muted)',fontWeight:500,marginTop:2}}>{slotTimes[pi].start}<br/>{slotTimes[pi].end}</div>}
                </td>
                {DAYS.map((day, di) => {
                  const dayMax = cfg.perDay?.[di] || 8;
                  const isOutOfBounds = (pi + 1) > dayMax;
                  const slot = (localTT[selGrade]?.[day]||{})[pi+1] || {};
                  const allocStaffId = allocs[`${selGrade}|${slot.subject}`];
                  const phTeacher = allocStaffId ? (codes[allocStaffId] || staff.find(s=>s.id===allocStaffId)?.name) : 'Teacher';
                  
                  return (
                    <td key={day} style={{padding:'4px 6px', background: isOutOfBounds ? '#f1f5f9' : 'transparent'}}>
                      {isOutOfBounds ? null : (
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <input
                            placeholder="Subject"
                            value={slot.subject || ''}
                            onChange={e => setSlot(day, pi+1, 'subject', e.target.value)}
                            style={{fontSize:11,fontWeight:600,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:4,width:'100%',outline:'none'}}
                          />
                          <input
                            placeholder={phTeacher}
                            value={slot.teacher || ''}
                            onChange={e => setSlot(day, pi+1, 'teacher', e.target.value)}
                            style={{fontSize:11,padding:'4px 6px',border:'1px solid var(--border)',borderRadius:4,width:'100%',outline:'none'}}
                          />
                          <select
                            value={slot.teacherId||''}
                            onChange={e => {
                              const t = teachers.find(x=>x.id===e.target.value);
                              setSlot(day,pi+1,'teacherId',e.target.value);
                              setSlot(day,pi+1,'teacher',t?.name||'');
                            }}
                            style={{width:'100%',fontSize:10,padding:'2px',border:'1px solid #ddd',borderRadius:5}}
                          >
                            <option value="">— Teacher —</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {brk && (
                <tr>
                  <td colSpan={DAYS.length + 1} style={{textAlign:'center', background:'#f8fafc', padding:'8px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase'}}>
                    ☕ {brk.label || 'Break'} ({brk.dur} min)
                  </td>
                </tr>
              )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
