'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const SCENES = [
  { id:'dashboard',  label:'📊 Revenue Dashboard',    dur:3500 },
  { id:'learners',   label:'👥 Learner Registry',      dur:3000 },
  { id:'payroll',    label:'💼 Payroll Engine',        dur:4000 },
  { id:'exam',       label:'📈 Exam Summary Report',   dur:3500 },
  { id:'settlement', label:'⚡ One-Click Settlement',  dur:3000 },
];

const GRADES = [
  { g:'Grade 1', n:38, pct:78 }, { g:'Grade 2', n:42, pct:65 },
  { g:'Grade 4', n:32, pct:91 }, { g:'Grade 7', n:28, pct:58 },
  { g:'Grade 9', n:45, pct:84 }, { g:'Grade 12', n:22, pct:72 },
];
const STAFF = [
  { name:'J. Kamau',   role:'Teacher',   gross:45000, ded:6750  },
  { name:'A. Wanjiru', role:'Teacher',   gross:42000, ded:6300  },
  { name:'M. Otieno',  role:'Support',   gross:25000, ded:3750  },
  { name:'P. Njeri',   role:'Principal', gross:80000, ded:12000 },
];
const SAMPLE_LEARNERS = [
  { adm:'2024001', name:'Alice Mwangi',   grade:'Grade 4',  sex:'F' },
  { adm:'2024002', name:'Brian Otieno',   grade:'Grade 4',  sex:'M' },
  { adm:'2024003', name:'Carol Njeri',    grade:'Grade 7',  sex:'F' },
  { adm:'2023041', name:'David Kamau',    grade:'Grade 9',  sex:'M' },
  { adm:'2024099', name:'Eve Wanjiku',    grade:'Grade 1',  sex:'F' },
  { adm:'2023012', name:'Frank Ochieng',  grade:'Grade 12', sex:'M' },
];

export default function StaffDemoPage() {
  const [si, setSi]         = useState(0);
  const [prog, setProg]     = useState(0);
  const [playing, setPlaying] = useState(true);

  const [revCount, setRevCount]     = useState(0);
  const [barWidths, setBarWidths]   = useState(GRADES.map(() => 0));
  const [learnerRows, setLearnerRows] = useState(0);
  const [staffRows, setStaffRows]   = useState(0);
  const [disbursed, setDisbursed]   = useState(false);
  const [examBars, setExamBars]     = useState(GRADES.map(() => 0));
  const [settled, setSettled]       = useState(false);

  function reset() {
    setRevCount(0); setBarWidths(GRADES.map(() => 0));
    setLearnerRows(0); setStaffRows(0); setDisbursed(false);
    setExamBars(GRADES.map(() => 0)); setSettled(false);
  }

  // Progress ticker — fixed
  useEffect(() => {
    if (!playing) return;
    const dur = SCENES[si].dur;
    const step = 50;
    const increment = (step / dur) * 100;
    const iv = setInterval(() => {
      setProg(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(iv);
          reset();
          setSi(p => (p + 1) % SCENES.length);
          return 0;
        }
        return next;
      });
    }, step);
    return () => clearInterval(iv);
  }, [si, playing]);

  // Scene animations — fixed (separate, not nested)
  useEffect(() => {
    if (si === 0) {
      setRevCount(Math.floor((prog / 100) * 3200000));
      if (prog > 20) setBarWidths(GRADES.map((g, i) => prog > 20 + i * 10 ? g.pct : 0));
    }
    if (si === 1) setLearnerRows(Math.floor((prog / 100) * 7));
    if (si === 2) {
      setStaffRows(Math.floor((prog / 100) * (STAFF.length + 1)));
      if (prog > 85) setDisbursed(true);
    }
    if (si === 3 && prog > 10) setExamBars(GRADES.map((_, i) => prog > 10 + i * 8 ? (55 + (i * 7) % 35) : 0));
    if (si === 4 && prog > 40) setSettled(true);
  }, [si, prog]);

  function jump(i) { reset(); setProg(0); setSi(i); }

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', fontFamily:'Sora, sans-serif', color:'#fff', display:'flex', flexDirection:'column' }}>
      {/* Nav */}
      <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/demo" style={{ color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, textDecoration:'none' }}>← Demo Hub</Link>
        <div style={{ marginLeft:'auto', padding:'4px 14px', borderRadius:99, background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.3)', fontSize:12, fontWeight:800, color:'#C4B5FD' }}>🏢 Admin & Staff Demo</div>
      </div>

      <div style={{ flex:1, maxWidth:1100, margin:'0 auto', width:'100%', padding:'28px 20px 48px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Scene title */}
        <div className="demo-fup" key={`t${si}`} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(20px,3.5vw,34px)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:4 }}>{SCENES[si].label}</div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, fontWeight:600 }}>Scene {si+1} of {SCENES.length} · {playing ? 'auto-playing' : 'paused'}</div>
        </div>

        {/* Browser chrome with real portal look */}
        <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.6)', border:'1px solid rgba(255,255,255,.08)' }}>
          {/* Browser bar */}
          <div style={{ background:'#1E293B', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
            {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width:11, height:11, borderRadius:'50%', background:c }} />)}
            <div style={{ flex:1, marginLeft:8, background:'rgba(255,255,255,.06)', borderRadius:6, padding:'5px 12px', fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:600, fontFamily:'monospace' }}>
              🔒 app.eduvantage.co.ke/admin — EduVantage · Admin Panel
            </div>
          </div>

          {/* Real portal layout: sidebar + content */}
          <div style={{ display:'flex', background:'#F8FAFC', minHeight:400 }}>
            {/* Sidebar */}
            <div style={{ width:56, background:'#fff', borderRight:'1px solid #E2E8F0', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', gap:18 }}>
              {[['📊','Dashboard'],['👥','Learners'],['💼','Payroll'],['📈','Exams'],['⚡','Finance'],['⚙️','Settings']].map(([icon, label], idx) => (
                <div key={label} title={label} style={{ width:36, height:36, borderRadius:10, background: idx === si ? '#EEF2FF' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', color: idx === si ? '#4F46E5' : '#94A3B8' }}>{icon}</div>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex:1, padding:'20px 24px', minHeight:400, overflow:'hidden' }} key={`s${si}`}>
              {si === 0 && (
                <div className="demo-fup">
                  <div style={{ fontSize:13, fontWeight:900, color:'#4F46E5', marginBottom:4 }}>EduVantage Global School</div>
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Revenue Integrity Dashboard</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
                    {[
                      { l:'Expected',    v:'KES 4.8M',                              c:'#4F46E5' },
                      { l:'Collected',   v:`KES ${(revCount/1000000).toFixed(1)}M`, c:'#059669' },
                      { l:'Outstanding', v:'KES 1.6M',                              c:'#EF4444' },
                      { l:'This Month',  v:'KES 480K',                              c:'#D97706' },
                    ].map(c => (
                      <div key={c.l} style={{ padding:'14px', borderRadius:12, background:'#fff', border:'1px solid #E2E8F0', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:800, textTransform:'uppercase', marginBottom:6 }}>{c.l}</div>
                        <div style={{ fontSize:17, fontWeight:900, color:c.c }}>{c.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#64748B', fontWeight:800, textTransform:'uppercase', marginBottom:10 }}>Per-Grade Fee Collection Rate</div>
                  {GRADES.map((g, i) => (
                    <div key={g.g} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, marginBottom:4, color:'#374151' }}>
                        <span>{g.g}</span>
                        <span style={{ color: g.pct>=80?'#059669':g.pct>=60?'#D97706':'#EF4444' }}>{g.pct}%</span>
                      </div>
                      <div style={{ height:7, background:'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${barWidths[i]}%`, background: g.pct>=80?'#059669':g.pct>=60?'#D97706':'#DC2626', borderRadius:99, transition:'width .8s cubic-bezier(.16,1,.3,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {si === 1 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>👥 Learner Registry — 207 enrolled</div>
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', overflow:'hidden' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                          {['ADM No.','Full Name','Grade','Sex','Status'].map(h => (
                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontWeight:800, fontSize:11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_LEARNERS.slice(0, learnerRows).map((l) => (
                          <tr key={l.adm} className="demo-slide" style={{ borderBottom:'1px solid #F1F5F9' }}>
                            <td style={{ padding:'9px 12px', fontWeight:700, color:'#4F46E5' }}>{l.adm}</td>
                            <td style={{ padding:'9px 12px', fontWeight:700, color:'#0F172A' }}>{l.name}</td>
                            <td style={{ padding:'9px 12px', color:'#64748B' }}>{l.grade}</td>
                            <td style={{ padding:'9px 12px' }}>{l.sex === 'F' ? '👧 F' : '👦 M'}</td>
                            <td style={{ padding:'9px 12px' }}><span style={{ padding:'2px 8px', borderRadius:8, background:'#ECFDF5', color:'#059669', fontWeight:800, fontSize:11 }}>Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {si === 2 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>💼 Staff Payroll Dashboard</div>
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', overflow:'hidden', marginBottom:16 }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                          {['Name','Role','Gross (KES)','Deductions','Net Pay'].map(h => (
                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontWeight:800, fontSize:11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {STAFF.slice(0, staffRows).map(s => (
                          <tr key={s.name} className="demo-slide" style={{ borderBottom:'1px solid #F1F5F9' }}>
                            <td style={{ padding:'9px 12px', fontWeight:700, color:'#0F172A' }}>{s.name}</td>
                            <td style={{ padding:'9px 12px', color:'#64748B' }}>{s.role}</td>
                            <td style={{ padding:'9px 12px', fontWeight:800, color:'#2563EB' }}>{s.gross.toLocaleString()}</td>
                            <td style={{ padding:'9px 12px', color:'#EF4444' }}>-{s.ded.toLocaleString()}</td>
                            <td style={{ padding:'9px 12px', fontWeight:900, color:'#059669' }}>{(s.gross-s.ded).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {disbursed
                    ? <div className="demo-pop" style={{ padding:'14px', borderRadius:12, background:'#ECFDF5', border:'1px solid #6EE7B7', textAlign:'center', fontSize:14, fontWeight:900, color:'#059669' }}>✅ KES 163,200 disbursed via B2C!</div>
                    : staffRows >= STAFF.length && <div className="demo-pulse demo-pop" style={{ padding:'14px', borderRadius:12, background:'#EEF2FF', border:'1px solid #A5B4FC', textAlign:'center', fontSize:14, fontWeight:900, color:'#4F46E5' }}>⚡ Disburse All (B2C) — One Click</div>
                  }
                </div>
              )}

              {si === 3 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>📈 School-Wide Exam Summary</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                    {[['207','Total Learners','#4F46E5'],['72.4%','School Mean','#059669'],['ME','Mean Level','#D97706']].map(([v,l,c]) => (
                      <div key={l} style={{ padding:'14px', borderRadius:12, background:'#fff', border:'1px solid #E2E8F0', textAlign:'center' }}>
                        <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
                        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:800, textTransform:'uppercase', marginTop:4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {GRADES.map((g, i) => (
                    <div key={g.g} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, marginBottom:4, color:'#374151' }}>
                        <span>{g.g}</span>
                        <span style={{ color:'#4F46E5' }}>{examBars[i]>0?examBars[i].toFixed(1)+'%':'—'}</span>
                      </div>
                      <div style={{ height:8, background:'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${examBars[i]}%`, background:'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius:99, transition:'width .9s cubic-bezier(.16,1,.3,1)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {si === 4 && (
                <div className="demo-fup" style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:16, gap:20 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1 }}>⚡ B2C Settlement — May Collection</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, width:'100%' }}>
                    {[
                      { l:'Total Collected', v:'KES 3,200,000', c:'#059669' },
                      { l:'Net to Disburse', v:'KES 3,187,600', c:'#4F46E5' },
                    ].map(r => (
                      <div key={r.l} style={{ padding:'14px', borderRadius:12, background:'#fff', border:'1px solid #E2E8F0' }}>
                        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:800, textTransform:'uppercase', marginBottom:6 }}>{r.l}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:r.c }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  {!settled
                    ? <div className="demo-pulse demo-pop" style={{ padding:'16px 40px', borderRadius:99, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', fontSize:16, fontWeight:900, color:'#fff', boxShadow:'0 20px 40px rgba(79,70,229,.4)', cursor:'pointer' }}>⚡ Settle to KCB Bank Now</div>
                    : <div className="demo-pop" style={{ padding:'20px 40px', borderRadius:20, background:'#ECFDF5', border:'2px solid #6EE7B7', textAlign:'center' }}>
                        <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                        <div style={{ fontSize:18, fontWeight:900, color:'#059669' }}>KES 3,187,600 Settled!</div>
                      </div>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:'#E2E8F0' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#7C3AED,#4F46E5)', width:`${prog}%`, transition:'width .05s linear' }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
          <button className="demo-btn" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <div style={{ display:'flex', gap:10 }}>
            {SCENES.map((_, i) => <button key={i} className={`demo-scene-dot ${i===si?'active':''}`} onClick={() => jump(i)} />)}
          </div>
          <button className="demo-btn" onClick={() => jump(0)}>↺ Replay</button>
        </div>

        <div style={{ textAlign:'center', marginTop:8 }}>
          <Link href="/saas/signup" style={{ display:'inline-block', background:'linear-gradient(135deg,#7C3AED,#4F46E5)', color:'#fff', padding:'13px 40px', borderRadius:99, fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 16px 40px rgba(124,58,237,.4)' }}>Onboard My School →</Link>
        </div>
      </div>
    </div>
  );
}
