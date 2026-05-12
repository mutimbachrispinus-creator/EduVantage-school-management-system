'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const SCENES = [
  { id: 'login',    label: '🔐 Parent Logs In',         dur: 2000 },
  { id: 'fees',     label: '💳 Live Fee Statement',      dur: 4000 },
  { id: 'report',   label: '📋 Report Card Opens',       dur: 4000 },
  { id: 'sms',      label: '📲 Real-Time Alerts',        dur: 3500 },
  { id: 'portal',   label: '🌐 Full Parent Portal',      dur: 3000 },
];

const FEE_ROWS = [
  { label: 'Annual Fee',    val: 36000,  color: '#e2e8f0' },
  { label: 'Term 1 Paid',  val: 12000,  color: '#34d399' },
  { label: 'Term 2 Paid',  val: 12000,  color: '#34d399' },
  { label: 'Term 3 Paid',  val: 7500,   color: '#f87171' },
  { label: 'Balance',      val: 4500,   color: '#f87171' },
];

const SUBJ = ['Mathematics','English','Science','SST','CRE'];
const MARKS = [88, 76, 92, 84, 72];
const LEVELS= ['EE','ME','EE','ME','ME'];
const LVC   = { EE:'#059669', ME:'#2563eb', AE:'#d97706' };

const ALERTS = [
  { icon:'💰', title:'Fee Reminder', msg:'Alice has an outstanding balance of KES 4,500 for Term 3. Pay via Paybill 522522.', time:'2 hrs ago', c:'#f59e0b' },
  { icon:'🚨', title:'Absence Alert', msg:'Your child Brian was marked ABSENT today. Contact school: 0712-345-678.', time:'9:15 AM', c:'#ef4444' },
  { icon:'📋', title:'Report Card Ready', msg:"Alice's Term 2 End-Term report is available. Tap to view.", time:'Yesterday', c:'#10b981' },
  { icon:'🎉', title:'Top Performer!', msg:'Alice Mwangi ranked #1 in Grade 4 End-Term — congratulations!', time:'2 days ago', c:'#6366f1' },
];

export default function ParentDemoPage() {
  const [si, setSi]       = useState(0);
  const [prog, setProg]   = useState(0);
  const [playing, setPlaying] = useState(true);

  // Scene-specific
  const [feeAmt, setFeeAmt]   = useState(0);
  const [feeRows, setFeeRows] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [visRows, setVisRows]  = useState(0);
  const [alertN, setAlertN]   = useState(0);

  function reset() { setFeeAmt(0); setFeeRows(0); setCardOpen(false); setVisRows(0); setAlertN(0); }

  useEffect(() => {
    if (!playing) return;
    const dur = SCENES[si].dur;
    let t = 0; const steps = dur / 50;
    const iv = setInterval(() => {
      t++; setProg((t / steps) * 100);
      if (t >= steps) { clearInterval(iv); setProg(0); reset(); setSi(p => (p + 1) % SCENES.length); }
    }, 50);
    return () => clearInterval(iv);
  }, [si, playing]);

  useEffect(() => {
    if (!playing) return;
    if (si === 1) {
      let v = 0; const target = 4500;
      const iv = setInterval(() => { v = Math.min(v + 150, target); setFeeAmt(v); if (v >= target) clearInterval(iv); }, 60);
      let r = 0;
      const iv2 = setInterval(() => { r++; setFeeRows(r); if (r >= FEE_ROWS.length) clearInterval(iv2); }, 500);
      return () => { clearInterval(iv); clearInterval(iv2); };
    }
    if (si === 2) {
      const t1 = setTimeout(() => setCardOpen(true), 400);
      let r = 0;
      const iv = setInterval(() => { r++; setVisRows(r); if (r >= SUBJ.length) clearInterval(iv); }, 400);
      return () => { clearTimeout(t1); clearInterval(iv); };
    }
    if (si === 3) {
      let n = 0;
      const iv = setInterval(() => { n++; setAlertN(n); if (n >= ALERTS.length) clearInterval(iv); }, 700);
      return () => clearInterval(iv);
    }
  }, [si, playing]);

  function jump(i) { reset(); setProg(0); setSi(i); }

  return (
    <div style={{ minHeight:'100vh', background:'#030712', fontFamily:'Sora, sans-serif', color:'#fff', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <Link href="/demo" style={{ color:'rgba(255,255,255,.4)', fontSize:13, fontWeight:700, textDecoration:'none' }}>← Demo Hub</Link>
        <div style={{ marginLeft:'auto', padding:'4px 14px', borderRadius:99, background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.3)', fontSize:12, fontWeight:800, color:'#6ee7b7' }}>👨‍👩‍👧 Parent Demo</div>
      </div>

      <div style={{ flex:1, maxWidth:1060, margin:'0 auto', width:'100%', padding:'28px 24px 40px', display:'flex', flexDirection:'column', gap:24 }}>
        <div className="demo-fup" key={`t${si}`} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(22px,4vw,38px)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:6 }}>{SCENES[si].label}</div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, fontWeight:600 }}>Scene {si+1} of {SCENES.length} · {playing ? 'auto-playing' : 'paused'}</div>
        </div>

        <div className="demo-canvas-wrap">
          <div className="demo-browser-bar">
            {['#ef4444','#f59e0b','#10b981'].map(c => <div key={c} className="demo-dot" style={{ background:c }} />)}
            <div className="demo-url-bar">app.eduvantage.co.ke — Parent Portal</div>
          </div>

          <div style={{ padding:'22px', minHeight:360 }} key={`s${si}`}>
            {si === 0 && (
              <div className="demo-fup" style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:40, gap:20 }}>
                <div style={{ fontSize:56 }}>👨‍👩‍👧</div>
                <div style={{ fontWeight:900, fontSize:18 }}>EduVantage Parent Portal</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, width:300 }}>
                  <div style={{ padding:'11px 16px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', fontSize:13, color:'rgba(255,255,255,.5)' }}>📱 +254 712 345 678</div>
                  <div style={{ padding:'11px 16px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', fontSize:13, color:'rgba(255,255,255,.3)', letterSpacing:4 }}>••••••••</div>
                  <div style={{ padding:'12px', borderRadius:10, background:'#10b981', textAlign:'center', fontWeight:900, fontSize:14 }}>Sign In →</div>
                </div>
              </div>
            )}

            {si === 1 && (
              <div className="demo-fup">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,.08)' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', fontWeight:800 }}>Learner</div>
                    <div style={{ fontSize:16, fontWeight:900, marginTop:4 }}>Alice Mwangi</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>ADM: 2024001 · Grade 4</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', fontWeight:800 }}>Outstanding Balance</div>
                    <div className="demo-pop" style={{ fontSize:28, fontWeight:900, color:'#ef4444', marginTop:4 }}>KES {feeAmt.toLocaleString()}</div>
                  </div>
                </div>
                {FEE_ROWS.slice(0, feeRows).map((r, i) => (
                  <div key={r.label} className="demo-slide" style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px dashed rgba(255,255,255,.07)' }}>
                    <span style={{ color:'#94a3b8', fontSize:13 }}>{r.label}</span>
                    <span style={{ fontWeight:800, color:r.color, fontSize:14 }}>KES {r.val.toLocaleString()}</span>
                  </div>
                ))}
                {feeRows >= FEE_ROWS.length && (
                  <div className="demo-pop" style={{ marginTop:20, padding:'12px 16px', borderRadius:12, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:800, color:'#fca5a5', fontSize:13 }}>💳 Pay Now via M-Pesa STK Push</span>
                    <span style={{ fontSize:18, color:'#ef4444' }}>→</span>
                  </div>
                )}
              </div>
            )}

            {si === 2 && (
              <div className="demo-fup" style={{ display:'flex', gap:24 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>📋 Term 2 End-Term Report Card</div>
                  <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    {['Term 1','Term 2 ✓','Term 3'].map((t,i)=>(
                      <div key={t} style={{ padding:'7px 14px', borderRadius:8, background: i===1?'rgba(16,185,129,.15)':'rgba(255,255,255,.05)', border:`1px solid ${i===1?'#10b981':'rgba(255,255,255,.1)'}`, fontSize:12, fontWeight:800, color: i===1?'#6ee7b7':'rgba(255,255,255,.4)' }}>{t}</div>
                    ))}
                  </div>
                  <div style={{ padding:'14px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
                    <div style={{ fontSize:11, color:'#94a3b8', marginBottom:8 }}>Performance Summary</div>
                    <div style={{ fontSize:28, fontWeight:900, color:'#34d399' }}>82.4%</div>
                    <div style={{ padding:'4px 12px', borderRadius:8, display:'inline-block', background:'rgba(5,150,105,.2)', color:'#34d399', fontSize:12, fontWeight:900, marginTop:6 }}>EE — Exceeds Expectations</div>
                  </div>
                </div>
                {cardOpen && (
                  <div className="demo-card-flip" style={{ width:230, background:'#fff', borderRadius:12, padding:14, color:'#1e293b', fontSize:10, boxShadow:'0 24px 60px rgba(0,0,0,.6)', border:'3px double #1e293b', flexShrink:0 }}>
                    <div style={{ textAlign:'center', marginBottom:10, borderBottom:'2px solid #1e293b', paddingBottom:8 }}>
                      <div style={{ fontWeight:900, fontSize:11, textTransform:'uppercase' }}>EDUVANTAGE GLOBAL SCHOOL</div>
                      <div style={{ fontSize:8, color:'#64748b' }}>REPORT CARD · TERM 2</div>
                    </div>
                    <div style={{ fontWeight:800, marginBottom:10 }}>Alice Mwangi · Grade 4 · #1</div>
                    {SUBJ.slice(0, visRows).map((s, i) => (
                      <div key={s} className="demo-slide" style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontWeight:700 }}>{s}</span>
                        <span style={{ fontWeight:900, color:'#0369a1' }}>{MARKS[i]}</span>
                        <span style={{ padding:'1px 6px', borderRadius:4, background: LVC[LEVELS[i]]+'22', color:LVC[LEVELS[i]], fontWeight:900 }}>{LEVELS[i]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {si === 3 && (
              <div className="demo-fup" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>📲 Notifications</div>
                {ALERTS.slice(0, alertN).map(a => (
                  <div key={a.title} className="demo-slide" style={{ padding:'14px 16px', borderRadius:14, background:'rgba(255,255,255,.04)', border:`1px solid ${a.c}33`, display:'flex', gap:14 }}>
                    <div style={{ fontSize:24, flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:a.c, marginBottom:4 }}>{a.title}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', lineHeight:1.5, marginBottom:5 }}>{a.msg}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:700 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {si === 4 && (
              <div className="demo-fup">
                <div style={{ fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>🌐 Parent Portal Overview</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { icon:'💳', label:'Fee Balance', val:'KES 4,500 due', c:'#f87171' },
                    { icon:'📋', label:'Report Cards', val:'3 available', c:'#60a5fa' },
                    { icon:'✅', label:'Attendance', val:'92% this term', c:'#34d399' },
                    { icon:'🏆', label:'Class Rank', val:'#1 of 32', c:'#fbbf24' },
                    { icon:'📲', label:'Messages', val:'2 unread', c:'#818cf8' },
                    { icon:'📅', label:'Next Term', val:'Sept 2, 2025', c:'#f472b6' },
                  ].map((c, i) => (
                    <div key={c.label} className="demo-pop" style={{ animationDelay:`${i*0.08}s`, padding:'16px 14px', borderRadius:14, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', textAlign:'center' }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
                      <div style={{ fontSize:10, color:'#94a3b8', fontWeight:800, textTransform:'uppercase', marginBottom:4 }}>{c.label}</div>
                      <div style={{ fontSize:13, fontWeight:900, color:c.c }}>{c.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ height:3, background:'rgba(255,255,255,.06)' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#10b981,#34d399)', width:`${prog}%`, transition:'width .05s linear' }} />
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
          <button className="demo-btn" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <div style={{ display:'flex', gap:12 }}>
            {SCENES.map((_, i) => <button key={i} className={`demo-scene-dot ${i===si?'active':''}`} onClick={() => jump(i)} />)}
          </div>
          <button className="demo-btn" onClick={() => jump(0)}>↺ Replay</button>
        </div>

        <div style={{ textAlign:'center', marginTop:8 }}>
          <Link href="/login" style={{ display:'inline-block', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', padding:'13px 40px', borderRadius:99, fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 16px 40px rgba(16,185,129,.35)' }}>Open Parent Portal →</Link>
        </div>
      </div>
    </div>
  );
}
