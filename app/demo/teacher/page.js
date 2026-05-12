'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const LEARNERS = [
  { name: 'Alice Mwangi',  marks: [88, 76, 92, 84, 72], lv: 'EE', rank: 1 },
  { name: 'Eve Wanjiku',   marks: [90, 85, 88, 79, 95], lv: 'EE', rank: 2 },
  { name: 'Brian Otieno',  marks: [74, 68, 71, 79, 80], lv: 'ME', rank: 3 },
  { name: 'Carol Njeri',   marks: [60, 72, 65, 58, 67], lv: 'AE', rank: 4 },
  { name: 'David Kamau',   marks: [45, 52, 48, 55, 60], lv: 'AE', rank: 5 },
];
const SUBJ = ['Math', 'Eng', 'Sci', 'SST', 'CRE'];
const LVC = { EE: '#059669', ME: '#2563eb', AE: '#d97706', BE: '#dc2626' };
const ATT = ['P', 'P', 'A', 'P', 'L'];

const SCENES = [
  { id: 'intro',      label: '📓 Grade Book',          dur: 2500 },
  { id: 'typing',     label: '✏️ Entering Scores',      dur: 5000 },
  { id: 'grading',    label: '⚡ Auto-Grading',         dur: 2500 },
  { id: 'ranking',    label: '🏆 Merit Ranking',        dur: 2500 },
  { id: 'attendance', label: '✅ Attendance',           dur: 3000 },
  { id: 'print',      label: '🖨️ Print Report Card',    dur: 3000 },
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
    const steps = dur / step;
    let t = 0;
    const iv = setInterval(() => {
      t++;
      setProg((t / steps) * 100);
      if (t >= steps) { 
        clearInterval(iv); 
        setProg(0); 
        resetScene(); 
        setSi(p => (p + 1) % SCENES.length); 
      }
    }, step);
    return () => clearInterval(iv);
  }, [si, playing]);

  // Scene animations
  useEffect(() => {
    if (!playing) return;
    if (si === 1) {
      let c = 0;
      const iv = setInterval(() => { c++; setTyped(c); if (c >= total) clearInterval(iv); }, SCENES[1].dur / (total + 2));
      return () => clearInterval(iv);
    }
    if (si === 2) { const t = setTimeout(() => setLvs(true), 400); return () => clearTimeout(t); }
    if (si === 3) { const t = setTimeout(() => setRnks(true), 400); return () => clearTimeout(t); }
    if (si === 4) {
      let c = 0;
      const iv = setInterval(() => { c++; setAtt(c); if (c >= LEARNERS.length) clearInterval(iv); }, SCENES[4].dur / (LEARNERS.length + 1));
      return () => clearInterval(iv);
    }
    if (si === 5) { const t = setTimeout(() => setCard(true), 700); return () => clearTimeout(t); }
  }, [si, playing]);

  function jump(i) { resetScene(); setProg(0); setSi(i); }

  function markAt(li, sj) {
    const idx = li * SUBJ.length + sj;
    if (si === 0) return null;
    if (si === 1) return typed > idx ? LEARNERS[li].marks[sj] : null;
    return LEARNERS[li].marks[sj];
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', fontFamily: 'Sora, sans-serif', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <Link href="/demo" style={{ color:'rgba(255,255,255,.4)', fontSize:13, fontWeight:700, textDecoration:'none' }}>← Demo Hub</Link>
        <div style={{ marginLeft:'auto', padding:'4px 14px', borderRadius:99, background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', fontSize:12, fontWeight:800, color:'#60a5fa' }}>👩‍🏫 Teacher Demo</div>
      </div>

      <div style={{ flex:1, maxWidth:1060, margin:'0 auto', width:'100%', padding:'28px 24px 40px', display:'flex', flexDirection:'column', gap:24 }}>
        {/* Scene title */}
        <div className="demo-fup" key={`t${si}`} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(22px,4vw,38px)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:6 }}>{SCENES[si].label}</div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, fontWeight:600 }}>Scene {si+1} of {SCENES.length} · {playing ? 'auto-playing' : 'paused'}</div>
        </div>

        {/* Player */}
        <div className="demo-canvas-wrap">
          <div className="demo-browser-bar">
            {['#ef4444','#f59e0b','#10b981'].map(c => <div key={c} className="demo-dot" style={{ background:c }} />)}
            <div className="demo-url-bar">app.eduvantage.co.ke — Grade 4 · Term 2 · End-Term</div>
          </div>

          <div style={{ padding:'20px 22px', minHeight:340 }} key={`s${si}`}>
            {si <= 3 && (
              <div className="demo-fup">
                <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>📝 Marks Entry — Grade 4 · End-Term</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11.5 }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid rgba(255,255,255,.1)' }}>
                        <th style={{ padding:'7px 12px', textAlign:'left', color:'#64748b', fontWeight:800 }}>Learner</th>
                        {SUBJ.map(s => <th key={s} style={{ padding:'7px 10px', textAlign:'center', color:'#64748b', fontWeight:800 }}>{s}</th>)}
                        <th style={{ padding:'7px 10px', textAlign:'center', color:'#64748b', fontWeight:800 }}>Total</th>
                        {si >= 2 && <th style={{ padding:'7px 10px', textAlign:'center', color:'#64748b', fontWeight:800 }}>Level</th>}
                        {si >= 3 && <th style={{ padding:'7px 10px', textAlign:'center', color:'#64748b', fontWeight:800 }}>Rank</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {LEARNERS.map((l, li) => {
                        const cells = SUBJ.map((_, sj) => markAt(li, sj));
                        const full  = cells.every(v => v !== null);
                        return (
                          <tr key={l.name} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                            <td style={{ padding:'8px 12px', fontWeight:700, color:'#e2e8f0' }}>{l.name}</td>
                            {cells.map((v, sj) => {
                              const cur = si === 1 && typed === li * SUBJ.length + sj + 1;
                              return (
                                <td key={sj} style={{ padding:'8px 10px', textAlign:'center' }}>
                                  {v !== null
                                    ? <span className={cur ? 'demo-pop' : ''} style={{ fontWeight:800, color: v>=80?'#34d399': v>=60?'#60a5fa':'#f87171' }}>{v}</span>
                                    : si===1 && li===Math.floor(typed/SUBJ.length) && sj===typed%SUBJ.length
                                      ? <span className="demo-blink" style={{ color:'#60a5fa' }}>_</span>
                                      : <span style={{ color:'rgba(255,255,255,.1)' }}>—</span>}
                                </td>
                              );
                            })}
                            <td style={{ padding:'8px 10px', textAlign:'center', fontWeight:900, color:'#f8fafc' }}>{full ? l.marks.reduce((a,b)=>a+b,0) : ''}</td>
                            {si >= 2 && <td style={{ padding:'8px 10px', textAlign:'center' }}>{lvs && <span className="demo-pop" style={{ padding:'2px 9px', borderRadius:7, background:(LVC[l.lv]||'#888')+'22', color:LVC[l.lv], fontWeight:900, fontSize:11 }}>{l.lv}</span>}</td>}
                            {si >= 3 && <td style={{ padding:'8px 10px', textAlign:'center' }}>{rnks && <span className="demo-pop" style={{ fontWeight:900, color: l.rank===1?'#fbbf24': l.rank===2?'#94a3b8': l.rank===3?'#c2410c':'#e2e8f0' }}>{l.rank<=3?['🥇','🥈','🥉'][l.rank-1]:`#${l.rank}`}</span>}</td>}
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
                <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>✅ Attendance — {mounted ? new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long'}) : 'Loading...'}</div>
                {LEARNERS.map((l, i) => (
                  <div key={l.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{l.name}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {['P','A','L','E'].map(code => {
                        const on = att > i && code === ATT[i];
                        return <div key={code} className={on?'demo-pop':''} style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, background: on?(code==='P'?'#059669':code==='A'?'#dc2626':'#d97706'):'rgba(255,255,255,.06)', color: on?'#fff':'rgba(255,255,255,.25)', border:`1px solid ${on?'transparent':'rgba(255,255,255,.08)'}` }}>{code}</div>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {si === 5 && (
              <div className="demo-fup" style={{ display:'flex', gap:28, alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>🖨️ Templates — Print / PDF</div>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
                    {['Merit List','Report Cards','Class List','Fee Balance'].map((b,bi) => (
                      <div key={b} style={{ padding:'9px 16px', borderRadius:10, background: bi===1?'rgba(79,70,229,.2)':'rgba(255,255,255,.06)', border:`1px solid ${bi===1?'#6366f1':'rgba(255,255,255,.1)'}`, fontSize:12, fontWeight:800, color: bi===1?'#a5b4fc':'rgba(255,255,255,.45)' }}>{b}</div>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <div style={{ padding:'10px 20px', borderRadius:10, background:'rgba(79,70,229,.15)', border:'1px solid #6366f1', fontSize:13, fontWeight:800, color:'#a5b4fc' }}>🖨️ Print / PDF</div>
                    <div style={{ padding:'10px 20px', borderRadius:10, background:'rgba(16,185,129,.1)', border:'1px solid #10b981', fontSize:13, fontWeight:800, color:'#34d399' }}>⬇️ Download</div>
                  </div>
                </div>
                {card && (
                  <div className="demo-card-in" style={{ width:230, background:'#fff', borderRadius:12, padding:14, color:'#1e293b', fontSize:10, boxShadow:'0 24px 60px rgba(0,0,0,.6)', border:'3px double #1e293b' }}>
                    <div style={{ textAlign:'center', marginBottom:10, borderBottom:'2px solid #1e293b', paddingBottom:8 }}>
                      <div style={{ fontWeight:900, fontSize:11, textTransform:'uppercase' }}>EDUVANTAGE GLOBAL SCHOOL</div>
                      <div style={{ fontSize:8, color:'#64748b' }}>REPORT CARD · TERM 2</div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:11, marginBottom:8 }}>Alice Mwangi · #1 of {LEARNERS.length}</div>
                    {SUBJ.map((s, i) => (
                      <div key={s} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontWeight:700 }}>{s}</span>
                        <span style={{ fontWeight:900, color:'#0369a1' }}>{LEARNERS[0].marks[i]}</span>
                        <span style={{ padding:'1px 6px', borderRadius:4, background:'#d1fae5', color:'#059669', fontWeight:900 }}>EE</span>
                      </div>
                    ))}
                    <div style={{ marginTop:8, padding:'6px', background:'#f0fdf4', borderRadius:6, textAlign:'center', fontSize:9, fontWeight:800, color:'#059669' }}>✅ QR-Verified Authentic</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ height:3, background:'rgba(255,255,255,.06)' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', width:`${prog}%`, transition:'width .05s linear' }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
          <button className="demo-btn" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <div style={{ display:'flex', gap:12 }}>
            {SCENES.map((_, i) => <button key={i} className={`demo-scene-dot ${i===si?'active':''}`} onClick={() => jump(i)} />)}
          </div>
          <button className="demo-btn" onClick={() => jump(0)}>↺ Replay</button>
        </div>

        <div style={{ textAlign:'center', marginTop:16 }}>
          <Link href="/login" style={{ display:'inline-block', background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff', padding:'13px 40px', borderRadius:99, fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 16px 40px rgba(79,70,229,.4)' }}>Try the Real Platform →</Link>
        </div>
      </div>
    </div>
  );
}
