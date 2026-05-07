'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/**
 * app/timetable/page.js — School Timetable (CBC Rules)
 * Tabs: Calendar | Grade View | My Timetable | Generate (admin)
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
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

function gradeLevel(g) {
  if (!g || typeof g !== 'string') return 'primary13';
  const gu = g.toUpperCase();
  // British
  if (gu.startsWith('YEAR')) {
    const y = parseInt(gu.replace('YEAR ', ''));
    if (y <= 2) return 'ks1';
    if (y <= 6) return 'ks2';
    if (y <= 9) return 'ks3';
    if (y <= 11) return 'igcse';
    return 'senior';
  }
  // IB
  if (gu.includes('PYP')) return 'pyp';
  if (gu.includes('MYP')) return 'myp';
  if (gu.includes('DP')) return 'senior';

  // CBC
  if (gu.includes('PP') || gu.includes('KINDERGARTEN') || gu.includes('GRADE 1') || gu.includes('GRADE 2') || gu.includes('GRADE 3')) return 'primary13';
  if (gu.includes('GRADE 4') || gu.includes('GRADE 5') || gu.includes('GRADE 6')) return 'primary46';
  if (gu.includes('GRADE 7') || gu.includes('GRADE 8') || gu.includes('GRADE 9')) return 'jss';
  return 'senior';
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [selGrade, setSelGrade] = useState('');
  const [showModal, setShowModal] = useState(false);

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
      const data = await getCachedDBMulti(['paav_calendar_events','paav_timetable','paav6_staff']);
      setEvents(data['paav_calendar_events'] || []);
      setTimetable(data['paav_timetable'] || {});
      setStaff(data['paav6_staff'] || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function saveEvent() {
    if (!form.title || !form.date) { alert('Title and date required'); return; }
    setBusy(true);
    const updated = editEv != null
      ? events.map((e,i) => i===editEv ? {...form} : e)
      : [...events, { ...form, id:'ev'+Date.now() }];
    await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_calendar_events', value:updated }] }) });
    invalidateDB('paav_calendar_events');
    setEvents(updated); setShowModal(false); setEditEv(null);
    setForm({ title:'', date:'', desc:'', type:'Academic' }); setBusy(false);
  }

  async function deleteEvent(i) {
    if (!confirm('Delete this event?')) return;
    const updated = events.filter((_,idx) => idx!==i);
    await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_calendar_events', value:updated }] }) });
    invalidateDB('paav_calendar_events');
    setEvents(updated);
  }

  async function saveTimetable(tt) {
    await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav_timetable', value:tt }] }) });
    invalidateDB('paav_timetable');
    setTimetable(tt);
  }

  // Build slots for a grade
  const gradeTT = useMemo(() => timetable[selGrade] || {}, [timetable, selGrade]);
  const gradeLevelStr = gradeLevel(selGrade);
  const cfg = LEVEL_CFG[gradeLevelStr] || LEVEL_CFG.primary13 || { dur: 35, perDay: [7,7,7,7,7] };
  const maxPeriods = (cfg.perDay && cfg.perDay.length > 0) ? Math.max(...cfg.perDay) : 8;

  // My timetable: find all slots where this teacher is assigned
  const mySlots = useMemo(() => {
    if (!user) return [];
    const out = [];
    for (const [grade, days] of Object.entries(timetable)) {
      for (const [day, periods] of Object.entries(days || {})) {
        for (const [period, slot] of Object.entries(periods || {})) {
          if (slot?.teacherId === user.id || slot?.teacher === user.name) {
            out.push({ grade, day, period: Number(period), subject: slot.subject, teacher: slot.teacher });
          }
        }
      }
    }
    return out;
  }, [timetable, user]);

  const isAdmin = user?.role === 'admin';
  const isTeacher = ['admin','teacher','jss_teacher','senior_teacher'].includes(user?.role);
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
                  {gradeLevel(selGrade).toUpperCase()} · {cfg.dur} min/lesson · {cfg.perDay.reduce((a,b)=>a+b,0)} lessons/week
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
                  {Array.from({length: maxPeriods}, (_,pi) => (
                    <tr key={pi}>
                      <td style={{fontWeight:700,textAlign:'center',fontSize:12,background:'#F8FAFF'}}>{pi+1}</td>
                      {DAYS.map((day, di) => {
                        const dayMax = cfg.perDay?.[di] || 8;
                        const isOutOfBounds = (pi + 1) > dayMax;
                        const slot = (gradeTT[day]||{})[pi+1];
                        const bg = slot?.subject ? subjColor(slot.subject) : null;
                        return (
                          <td key={day} style={{padding:4,verticalAlign:'top', background: isOutOfBounds ? '#f1f5f9' : 'transparent'}}>
                            {isOutOfBounds ? null : slot?.subject ? (
                              <div style={{background:`${bg}18`,border:`1.5px solid ${bg}40`,borderRadius:8,padding:'6px 8px'}}>
                                <div style={{fontWeight:700,fontSize:11,color:bg}}>{slot.subject}</div>
                                {slot.teacher && <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{slot.teacher}</div>}
                              </div>
                            ) : (
                              <div style={{color:'#cbd5e1',fontSize:10,textAlign:'center',padding:8}}>—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
            selGrade={selGrade}
            setSelGrade={setSelGrade}
            onSave={saveTimetable}
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
function EditTimetablePanel({ timetable, staff, selGrade, setSelGrade, onSave }) {
  const [localTT, setLocalTT] = useState(timetable);
  const [saving, setSaving] = useState(false);
  const cfg = LEVEL_CFG[gradeLevel(selGrade)] || LEVEL_CFG.primary13;
  const maxPeriods = Math.max(...cfg.perDay);
  const gradeTT = localTT[selGrade] || {};
  const teachers = staff.filter(s => s.role==='teacher' || s.role==='admin');

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
      // Fetch allocations, subjects, codes
      const dbRes = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav_allocations' },
          { type: 'get', key: 'paav8_subj' },
          { type: 'get', key: 'paav_teacher_codes' }
        ]})
      });
      const ct = dbRes.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) throw new Error('Server returned invalid response. Please try again.');
      
      const db = await dbRes.json();
      if (!db.results) throw new Error('Failed to retrieve allocation data.');

      const allocs = db.results[0]?.value || {};
      const subjCfg = db.results[1]?.value || {};
      const codes = db.results[2]?.value || {};

      const lvl = gradeLevel(selGrade);
      const gradeSubjects = subjCfg[selGrade] || []; // usually empty unless customized, fallback handled
      
      // Build subjects array for generator
      // We will look at paav_allocations for selGrade to see what is assigned
      const assignedSubjects = Object.keys(allocs).filter(k => k.startsWith(selGrade + '|')).map(k => k.split('|')[1]);
      
      if(assignedSubjects.length === 0) {
        alert('No subjects allocated for ' + selGrade + '. Please assign subjects in Allocations module first.');
        setSaving(false); return;
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

      setLocalTT(tt => ({ ...tt, [selGrade]: newGradeTT }));
      alert('⚡ Auto-generation complete. Review and click Save Timetable.');

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
          <a href="/timetable-generator.html" target="_blank" className="btn btn-ghost btn-sm">🛠 Generator</a>
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
            {Array.from({length: maxPeriods}, (_,pi) => (
              <tr key={pi}>
                <td style={{fontWeight:700,textAlign:'center',fontSize:12,background:'#F8FAFF'}}>{pi+1}</td>
                {DAYS.map((day, di) => {
                  const dayMax = cfg.perDay?.[di] || 8;
                  const isOutOfBounds = (pi + 1) > dayMax;
                  const slot = (gradeTT[day]||{})[pi+1] || {};
                  return (
                    <td key={day} style={{padding:3,verticalAlign:'top', background: isOutOfBounds ? '#f1f5f9' : 'transparent'}}>
                      {isOutOfBounds ? null : (
                        <>
                          <input
                            placeholder="Subject"
                            value={slot.subject||''}
                            onChange={e => setSlot(day,pi+1,'subject',e.target.value)}
                            style={{width:'100%',fontSize:10,padding:'3px 5px',border:'1px solid #ddd',borderRadius:5,marginBottom:2}}
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
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
