'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const LEARNERS = [
  { name:'Alice Mwangi',  marks:[88,76,92,84,72], lv:'EE', rank:1 },
  { name:'Eve Wanjiku',   marks:[90,85,88,79,95], lv:'EE', rank:2 },
  { name:'Brian Otieno',  marks:[74,68,71,79,80], lv:'ME', rank:3 },
  { name:'Carol Njeri',   marks:[60,72,65,58,67], lv:'AE', rank:4 },
  { name:'David Kamau',   marks:[45,52,48,55,60], lv:'AE', rank:5 },
];
const SUBJ = ['Math','Eng','Sci','SST','CRE'];
const LVC  = { EE:'#059669', ME:'#2563EB', AE:'#D97706', BE:'#DC2626' };
const ATT  = ['P','P','A','P','L'];

const SCENES = [
  { id:'intro',      label:'📓 Grade Book',       dur:2500 },
  { id:'typing',     label:'✏️ Entering Scores',   dur:5000 },
  { id:'grading',    label:'⚡ Auto-Grading',      dur:2500 },
  { id:'ranking',    label:'🏆 Merit Ranking',     dur:2500 },
  { id:'attendance', label:'✅ Attendance',        dur:3000 },
  { id:'print',      label:'🖨️ Print Report Card', dur:3000 },
];

export default function TeacherDemoPage() {
  const [si, setSi]           = useState(0);
  const [prog, setProg]       = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typed, setTyped]     = useState(0);
  const [lvs, setLvs]         = useState(false);
  const [rnks, setRnks]       = useState(false);
  const [att, setAtt]         = useState(0);
  const [card, setCard]       = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const total = LEARNERS.length * SUBJ.length;

  function resetScene() { setTyped(0); setLvs(false); setRnks(false); setAtt(0); setCard(false); }

  // Progress ticker
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
          resetScene();
          setSi(p => (p + 1) % SCENES.length);
          return 0;
        }
        return next;
      });
    }, step);
    return () => clearInterval(iv);
  }, [si, playing]);

  // Scene animations
  useEffect(() => {
    if (si === 1) setTyped(Math.floor((prog / 100) * total));
    if (si === 2 && prog > 15) setLvs(true);
    if (si === 3 && prog > 15) setRnks(true);
    if (si === 4) setAtt(Math.floor((prog / 100) * LEARNERS.length));
    if (si === 5 && prog > 20) setCard(true);
  }, [si, prog]);

  function jump(i) { resetScene(); setProg(0); setSi(i); }

  function markAt(li, sj) {
    if (si === 0) return null;
    if (si === 1) return typed > li * SUBJ.length + sj ? LEARNERS[li].marks[sj] : null;
    return LEARNERS[li].marks[sj];
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', fontFamily:'Sora, sans-serif', color:'#fff', display:'flex', flexDirection:'column' }}>
      {/* Nav */}
      <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/demo" style={{ color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, textDecoration:'none' }}>← Demo Hub</Link>
        <div style={{ marginLeft:'auto', padding:'4px 14px', borderRadius:99, background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', fontSize:12, fontWeight:800, color:'#93C5FD' }}>👩‍🏫 Teacher Demo</div>
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
              🔒 app.eduvantage.co.ke — EduVantage Global School · Teacher Portal
            </div>
          </div>

          {/* Real portal layout */}
          <div style={{ display:'flex', background:'#F8FAFC', minHeight:360 }}>
            {/* Sidebar */}
            <div style={{ width:56, background:'#fff', borderRight:'1px solid #E2E8F0', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', gap:18 }}>
              {[['📝','Marks'],['✅','Attendance'],['📋','Reports'],['🏆','Merit'],['📅','Timetable'],['⚙️','Settings']].map(([icon, label], idx) => {
                const active = (si<=3 && idx===0)||(si===4&&idx===1)||(si===5&&idx===2);
                return <div key={label} title={label} style={{ width:36, height:36, borderRadius:10, background: active ? '#EEF2FF' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', color: active ? '#4F46E5' : '#94A3B8' }}>{icon}</div>;
              })}
            </div>

            {/* Content */}
            <div style={{ flex:1, padding:'18px 22px', minHeight:360, overflow:'hidden' }} key={`s${si}`}>
              {si <= 3 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>📝 Marks Entry — Grade 4 · End-Term</div>
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', overflow:'auto' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11.5 }}>
                      <thead>
                        <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                          <th style={{ padding:'9px 12px', textAlign:'left', color:'#64748B', fontWeight:800 }}>Learner</th>
                          {SUBJ.map(s => <th key={s} style={{ padding:'9px 10px', textAlign:'center', color:'#64748B', fontWeight:800 }}>{s}</th>)}
                          <th style={{ padding:'9px 10px', textAlign:'center', color:'#64748B', fontWeight:800 }}>Total</th>
                          {si >= 2 && <th style={{ padding:'9px 10px', textAlign:'center', color:'#64748B', fontWeight:800 }}>Level</th>}
                          {si >= 3 && <th style={{ padding:'9px 10px', textAlign:'center', color:'#64748B', fontWeight:800 }}>Rank</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {LEARNERS.map((l, li) => {
                          const cells = SUBJ.map((_, sj) => markAt(li, sj));
                          const full  = cells.every(v => v !== null);
                          return (
                            <tr key={l.name} style={{ borderBottom:'1px solid #F1F5F9' }}>
                              <td style={{ padding:'8px 12px', fontWeight:700, color:'#0F172A' }}>{l.name}</td>
                              {cells.map((v, sj) => {
                                const cur = si === 1 && typed === li * SUBJ.length + sj + 1;
                                return (
                                  <td key={sj} style={{ padding:'8px 10px', textAlign:'center' }}>
                                    {v !== null
                                      ? <span className={cur ? 'demo-pop' : ''} style={{ fontWeight:800, color: v>=80?'#059669': v>=60?'#2563EB':'#EF4444' }}>{v}</span>
                                      : si===1 && li===Math.floor(typed/SUBJ.length) && sj===typed%SUBJ.length
                                        ? <span className="demo-blink" style={{ color:'#4F46E5' }}>_</span>
                                        : <span style={{ color:'#CBD5E1' }}>—</span>}
                                  </td>
                                );
                              })}
                              <td style={{ padding:'8px 10px', textAlign:'center', fontWeight:900, color:'#0F172A' }}>{full ? l.marks.reduce((a,b)=>a+b,0) : ''}</td>
                              {si >= 2 && <td style={{ padding:'8px 10px', textAlign:'center' }}>{lvs && <span className="demo-pop" style={{ padding:'2px 8px', borderRadius:6, background:(LVC[l.lv]||'#888')+'18', color:LVC[l.lv], fontWeight:900, fontSize:11 }}>{l.lv}</span>}</td>}
                              {si >= 3 && <td style={{ padding:'8px 10px', textAlign:'center' }}>{rnks && <span className="demo-pop" style={{ fontWeight:900, color: l.rank===1?'#F59E0B': l.rank===2?'#94A3B8': l.rank===3?'#C2410C':'#475569' }}>{l.rank<=3?['🥇','🥈','🥉'][l.rank-1]:`#${l.rank}`}</span>}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {si === 4 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>
                    ✅ Attendance — {mounted ? new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long'}) : '...'}
                  </div>
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'4px 0' }}>
                    {LEARNERS.map((l, i) => (
                      <div key={l.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid #F8FAFC' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{l.name}</span>
                        <div style={{ display:'flex', gap:6 }}>
                          {['P','A','L','E'].map(code => {
                            const on = att > i && code === ATT[i];
                            return <div key={code} className={on?'demo-pop':''} style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, background: on?(code==='P'?'#059669':code==='A'?'#DC2626':'#D97706'):'#F8FAFC', color: on?'#fff':'#CBD5E1', border:`1.5px solid ${on?'transparent':'#E2E8F0'}` }}>{code}</div>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {si === 5 && (
                <div className="demo-fup" style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>🖨️ Templates — Print / PDF</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                      {['Merit List','Report Cards','Class List','Fee Balance'].map((b,bi) => (
                        <div key={b} style={{ padding:'8px 14px', borderRadius:10, background: bi===1?'#EEF2FF':'#F8FAFC', border:`1.5px solid ${bi===1?'#6366F1':'#E2E8F0'}`, fontSize:12, fontWeight:800, color: bi===1?'#4F46E5':'#94A3B8' }}>{b}</div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <div style={{ padding:'10px 20px', borderRadius:10, background:'#EEF2FF', border:'1.5px solid #6366F1', fontSize:13, fontWeight:800, color:'#4F46E5' }}>🖨️ Print / PDF</div>
                      <div style={{ padding:'10px 20px', borderRadius:10, background:'#ECFDF5', border:'1.5px solid #10B981', fontSize:13, fontWeight:800, color:'#059669' }}>⬇️ Download</div>
                    </div>
                  </div>
                  {card && (
                    <div className="demo-card-in" style={{ width:220, background:'#fff', borderRadius:12, padding:14, color:'#1E293B', fontSize:10, boxShadow:'0 16px 40px rgba(0,0,0,.12)', border:'2px solid #E2E8F0', flexShrink:0 }}>
                      <div style={{ textAlign:'center', marginBottom:10, borderBottom:'2px solid #E2E8F0', paddingBottom:8 }}>
                        <div style={{ fontWeight:900, fontSize:11, textTransform:'uppercase', color:'#0F172A' }}>EDUVANTAGE GLOBAL SCHOOL</div>
                        <div style={{ fontSize:8, color:'#64748B' }}>OFFICIAL REPORT CARD · TERM 2</div>
                      </div>
                      <div style={{ fontWeight:800, fontSize:11, marginBottom:8, color:'#0F172A' }}>Alice Mwangi · #1 of {LEARNERS.length}</div>
                      {SUBJ.map((s, i) => (
                        <div key={s} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #F8FAFC' }}>
                          <span style={{ fontWeight:700, color:'#374151' }}>{s}</span>
                          <span style={{ fontWeight:900, color:'#2563EB' }}>{LEARNERS[0].marks[i]}</span>
                          <span style={{ padding:'1px 6px', borderRadius:4, background:'#ECFDF5', color:'#059669', fontWeight:900 }}>EE</span>
                        </div>
                      ))}
                      <div style={{ marginTop:8, padding:'6px', background:'#ECFDF5', borderRadius:6, textAlign:'center', fontSize:9, fontWeight:800, color:'#059669' }}>✅ QR-Verified Authentic</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:'#E2E8F0' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#4F46E5,#7C3AED)', width:`${prog}%`, transition:'width .05s linear' }} />
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

        <div style={{ textAlign:'center', marginTop:16 }}>
          <Link href="/login" style={{ display:'inline-block', background:'linear-gradient(135deg,#4F46E5,#6366F1)', color:'#fff', padding:'13px 40px', borderRadius:99, fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 16px 40px rgba(79,70,229,.4)' }}>Try the Real Platform →</Link>
        </div>
      </div>
    </div>
  );
}
