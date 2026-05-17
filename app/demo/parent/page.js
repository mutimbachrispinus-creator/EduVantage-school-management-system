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
  { label: 'Annual Fee',   val: 36000, color: '#374151' },
  { label: 'Term 1 Paid',  val: 12000, color: '#059669' },
  { label: 'Term 2 Paid',  val: 12000, color: '#059669' },
  { label: 'Term 3 Paid',  val: 7500,  color: '#DC2626' },
  { label: 'Balance',      val: 4500,  color: '#DC2626' },
];

const SUBJ   = ['Mathematics','English','Science','SST','CRE'];
const MARKS  = [88, 76, 92, 84, 72];
const LEVELS = ['EE','ME','EE','ME','ME'];
const LVC    = { EE:'#059669', ME:'#2563EB', AE:'#D97706' };

const ALERTS = [
  { icon:'💰', title:'Fee Reminder',     msg:'Alice has an outstanding balance of KES 4,500 for Term 3. Pay via Paybill 522522.', time:'2 hrs ago', c:'#F59E0B' },
  { icon:'🚨', title:'Absence Alert',    msg:'Your child Brian was marked ABSENT today. Contact school: 0712-345-678.',            time:'9:15 AM',  c:'#EF4444' },
  { icon:'📋', title:'Report Card Ready',msg:"Alice's Term 2 End-Term report is available. Tap to view.",                         time:'Yesterday', c:'#10B981' },
  { icon:'🎉', title:'Top Performer!',   msg:'Alice Mwangi ranked #1 in Grade 4 End-Term — congratulations!',                     time:'2 days ago',c:'#6366F1' },
];

export default function ParentDemoPage() {
  const [si, setSi]         = useState(0);
  const [prog, setProg]     = useState(0);
  const [playing, setPlaying] = useState(true);

  const [feeAmt, setFeeAmt]     = useState(0);
  const [feeRows, setFeeRows]   = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [visRows, setVisRows]   = useState(0);
  const [alertN, setAlertN]     = useState(0);

  function reset() { setFeeAmt(0); setFeeRows(0); setCardOpen(false); setVisRows(0); setAlertN(0); }

  // Progress ticker — fixed (no nested useEffect)
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

  // Scene animations — fixed (separate useEffect, not nested)
  useEffect(() => {
    if (si === 1) {
      setFeeAmt(Math.floor((prog / 100) * 4500));
      setFeeRows(Math.floor((prog / 100) * (FEE_ROWS.length + 1)));
    }
    if (si === 2) {
      if (prog > 10) setCardOpen(true);
      setVisRows(Math.floor((prog / 100) * (SUBJ.length + 1)));
    }
    if (si === 3) setAlertN(Math.floor((prog / 100) * (ALERTS.length + 1)));
  }, [si, prog]);

  function jump(i) { reset(); setProg(0); setSi(i); }

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', fontFamily:'Sora, sans-serif', color:'#fff', display:'flex', flexDirection:'column' }}>
      {/* Top nav */}
      <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/demo" style={{ color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, textDecoration:'none' }}>← Demo Hub</Link>
        <div style={{ marginLeft:'auto', padding:'4px 14px', borderRadius:99, background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.3)', fontSize:12, fontWeight:800, color:'#6EE7B7' }}>👨‍👩‍👧 Parent Portal Demo</div>
      </div>

      <div style={{ flex:1, maxWidth:1100, margin:'0 auto', width:'100%', padding:'28px 20px 48px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Scene title */}
        <div className="demo-fup" key={`t${si}`} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(20px,3.5vw,34px)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:4 }}>{SCENES[si].label}</div>
          <div style={{ color:'rgba(255,255,255,.35)', fontSize:13, fontWeight:600 }}>Scene {si+1} of {SCENES.length} · {playing ? 'auto-playing' : 'paused'}</div>
        </div>

        {/* Browser chrome wrapping a LIGHT portal panel */}
        <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.6)', border:'1px solid rgba(255,255,255,.08)' }}>
          {/* Browser bar */}
          <div style={{ background:'#1E293B', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
            {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width:11, height:11, borderRadius:'50%', background:c }} />)}
            <div style={{ flex:1, marginLeft:8, background:'rgba(255,255,255,.06)', borderRadius:6, padding:'5px 12px', fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:600, fontFamily:'monospace' }}>
              🔒 app.eduvantage.co.ke — EduVantage · Parent Portal
            </div>
          </div>

          {/* Portal shell: sidebar + content — LIGHT themed like real portal */}
          <div style={{ display:'flex', background:'#F8FAFC', minHeight:400 }}>
            {/* Sidebar */}
            <div style={{ width:56, background:'#fff', borderRight:'1px solid #E2E8F0', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', gap:20 }}>
              {[['🏠','Home'],['💳','Fees'],['📋','Reports'],['📲','Alerts'],['⚙️','Settings']].map(([icon, label], idx) => (
                <div key={label} title={label} style={{ width:36, height:36, borderRadius:10, background: idx === (si === 0 ? 0 : si === 1 ? 1 : si === 2 ? 2 : si === 3 ? 3 : 4) === idx ? '#EEF2FF' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', color: idx === (si === 0 ? 0 : si === 1 ? 1 : si === 2 ? 2 : si === 3 ? 3 : 4) === idx ? '#4F46E5' : '#94A3B8' }}>{icon}</div>
              ))}
            </div>

            {/* Main content area */}
            <div style={{ flex:1, padding:'20px 24px', minHeight:400, overflow:'hidden' }} key={`s${si}`}>
              {si === 0 && (
                <div className="demo-fup" style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:32, gap:20 }}>
                  <div style={{ width:70, height:70, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>👨‍👩‍👧</div>
                  <div style={{ fontWeight:900, fontSize:18, color:'#0F172A' }}>EduVantage Global School</div>
                  <div style={{ fontSize:13, color:'#64748B', marginTop:-8 }}>Parent Portal — Sign In</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
                    <div style={{ padding:'11px 16px', borderRadius:10, background:'#fff', border:'1.5px solid #E2E8F0', fontSize:13, color:'#475569' }}>📱 +254 712 345 678</div>
                    <div style={{ padding:'11px 16px', borderRadius:10, background:'#fff', border:'1.5px solid #E2E8F0', fontSize:13, color:'#CBD5E1', letterSpacing:4 }}>••••••••</div>
                    <div style={{ padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#059669,#10B981)', textAlign:'center', fontWeight:900, fontSize:14, color:'#fff', boxShadow:'0 8px 20px rgba(16,185,129,.35)' }}>Sign In →</div>
                  </div>
                </div>
              )}

              {si === 1 && (
                <div className="demo-fup">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontSize:11, color:'#94A3B8', textTransform:'uppercase', fontWeight:800 }}>Learner</div>
                      <div style={{ fontSize:16, fontWeight:900, marginTop:4, color:'#0F172A' }}>Alice Mwangi</div>
                      <div style={{ fontSize:11, color:'#64748B' }}>ADM: 2024001 · Grade 4</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, color:'#94A3B8', textTransform:'uppercase', fontWeight:800 }}>Outstanding</div>
                      <div className="demo-pop" style={{ fontSize:26, fontWeight:900, color:'#EF4444', marginTop:4 }}>KES {feeAmt.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ background:'#fff', borderRadius:16, padding:'16px 20px', border:'1px solid #E2E8F0' }}>
                    {FEE_ROWS.slice(0, feeRows).map((r) => (
                      <div key={r.label} className="demo-slide" style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px dashed #F1F5F9' }}>
                        <span style={{ color:'#475569', fontSize:13 }}>{r.label}</span>
                        <span style={{ fontWeight:800, color:r.color, fontSize:14 }}>KES {r.val.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {feeRows >= FEE_ROWS.length && (
                    <div className="demo-pop" style={{ marginTop:16, padding:'12px 16px', borderRadius:12, background:'linear-gradient(135deg,#059669,#10B981)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:800, color:'#fff', fontSize:13 }}>💳 Pay Now via M-Pesa STK Push</span>
                      <span style={{ fontSize:18, color:'#fff' }}>→</span>
                    </div>
                  )}
                </div>
              )}

              {si === 2 && (
                <div className="demo-fup" style={{ display:'flex', gap:20 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>📋 Term 2 End-Term Report Card</div>
                    <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                      {['Term 1','Term 2 ✓','Term 3'].map((t,i)=>(
                        <div key={t} style={{ padding:'6px 12px', borderRadius:8, background: i===1?'#ECFDF5':'#F8FAFC', border:`1px solid ${i===1?'#10B981':'#E2E8F0'}`, fontSize:12, fontWeight:800, color: i===1?'#059669':'#94A3B8' }}>{t}</div>
                      ))}
                    </div>
                    <div style={{ background:'#fff', padding:'16px', borderRadius:12, border:'1px solid #E2E8F0', marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:6 }}>Performance Summary</div>
                      <div style={{ fontSize:26, fontWeight:900, color:'#059669' }}>82.4%</div>
                      <div style={{ padding:'4px 10px', borderRadius:8, display:'inline-block', background:'#ECFDF5', color:'#059669', fontSize:11, fontWeight:900, marginTop:6 }}>EE — Exceeds Expectations</div>
                    </div>
                  </div>
                  {cardOpen && (
                    <div className="demo-card-flip" style={{ width:220, background:'#fff', borderRadius:12, padding:14, color:'#1E293B', fontSize:10, boxShadow:'0 24px 60px rgba(0,0,0,.15)', border:'2px solid #E2E8F0', flexShrink:0 }}>
                      <div style={{ textAlign:'center', marginBottom:10, borderBottom:'2px solid #E2E8F0', paddingBottom:8 }}>
                        <div style={{ fontWeight:900, fontSize:11, textTransform:'uppercase', color:'#0F172A' }}>EDUVANTAGE GLOBAL SCHOOL</div>
                        <div style={{ fontSize:8, color:'#64748B' }}>OFFICIAL REPORT CARD · TERM 2</div>
                      </div>
                      <div style={{ fontWeight:800, marginBottom:10, color:'#0F172A' }}>Alice Mwangi · Grade 4 · #1</div>
                      {SUBJ.slice(0, visRows).map((s, i) => (
                        <div key={s} className="demo-slide" style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #F8FAFC' }}>
                          <span style={{ fontWeight:700, color:'#374151' }}>{s}</span>
                          <span style={{ fontWeight:900, color:'#2563EB' }}>{MARKS[i]}</span>
                          <span style={{ padding:'1px 6px', borderRadius:4, background: LVC[LEVELS[i]]+'20', color:LVC[LEVELS[i]], fontWeight:900 }}>{LEVELS[i]}</span>
                        </div>
                      ))}
                      <div style={{ marginTop:8, padding:'5px', background:'#ECFDF5', borderRadius:6, textAlign:'center', fontSize:9, fontWeight:800, color:'#059669' }}>✅ QR-Verified Authentic</div>
                    </div>
                  )}
                </div>
              )}

              {si === 3 && (
                <div className="demo-fup" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>📲 Notifications</div>
                  {ALERTS.slice(0, alertN).map(a => (
                    <div key={a.title} className="demo-slide" style={{ padding:'14px 16px', borderRadius:14, background:'#fff', border:`1.5px solid ${a.c}30`, display:'flex', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
                      <div style={{ fontSize:24, flexShrink:0 }}>{a.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:13, color:a.c, marginBottom:4 }}>{a.title}</div>
                        <div style={{ fontSize:12, color:'#475569', lineHeight:1.5, marginBottom:4 }}>{a.msg}</div>
                        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:700 }}>{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {si === 4 && (
                <div className="demo-fup">
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>🌐 Parent Portal Overview</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {[
                      { icon:'💳', label:'Fee Balance',  val:'KES 4,500 due', c:'#EF4444' },
                      { icon:'📋', label:'Report Cards', val:'3 available',   c:'#2563EB' },
                      { icon:'✅', label:'Attendance',   val:'92% this term', c:'#059669' },
                      { icon:'🏆', label:'Class Rank',   val:'#1 of 32',      c:'#D97706' },
                      { icon:'📲', label:'Messages',     val:'2 unread',      c:'#7C3AED' },
                      { icon:'📅', label:'Next Term',    val:'Sept 2, 2025',  c:'#DB2777' },
                    ].map((c, i) => (
                      <div key={c.label} className="demo-pop" style={{ animationDelay:`${i*0.08}s`, padding:'16px 12px', borderRadius:14, background:'#fff', border:'1px solid #E2E8F0', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
                        <div style={{ fontSize:26, marginBottom:8 }}>{c.icon}</div>
                        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:800, textTransform:'uppercase', marginBottom:4 }}>{c.label}</div>
                        <div style={{ fontSize:13, fontWeight:900, color:c.c }}>{c.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:'#E2E8F0' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#10B981,#059669)', width:`${prog}%`, transition:'width .05s linear' }} />
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
          <Link href="/login" style={{ display:'inline-block', background:'linear-gradient(135deg,#059669,#10B981)', color:'#fff', padding:'13px 40px', borderRadius:99, fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 16px 40px rgba(16,185,129,.35)' }}>Open Parent Portal →</Link>
        </div>
      </div>
    </div>
  );
}
