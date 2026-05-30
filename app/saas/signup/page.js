'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/signup.css';
import { getCurriculum } from '@/lib/curriculum';

const CURRICULA = [
  { id:'CBC',  icon:'🇰🇪', name:'CBC',        desc:'Kenya Competency Based' },
  { id:'CAMBRIDGE',icon:'🇬🇧', name:'Cambridge',  desc:'IGCSE / A-Levels' },
  { id:'IB',   icon:'🌍', name:'IB',          desc:'International Baccalaureate' },
  { id:'BRITISH',icon:'📚',name:'British',    desc:'British National Curriculum' },
  { id:'MONTESSORI',icon:'🌱',name:'Montessori',desc:'Child-Led Learning' },
  { id:'TVET', icon:'⚙️', name:'TVET',        desc:'Technical & Vocational' },
];

const COUNTIES = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Machakos','Nyeri','Meru','Kakamega','Kisii','Garissa','Malindi','Kitale','Bungoma','Other'];
const SCHOOL_TYPES = ['Primary','Secondary','Mixed Day','Boarding','Special Needs','College','Montessori','Kindergarten'];
const STEPS = ['School Info','Admin Setup','Curriculum & Plan','Confirm'];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [processingPay] = useState(searchParams.get('processing') === 'true');
  const [orderId] = useState(searchParams.get('orderId'));

  const [form, setForm] = useState({
    schoolName:'', schoolType:'Primary', county:'Nairobi', schoolEmail:'',
    adminName:'', adminUsername:'', adminPassword:'', phone:'', email:'',
    curriculum:'CBC', plan:'trial', estimatedStudents:100, levels:{}
  });

  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  const [stats, setStats] = useState({ schools: 0, learners: 0 });

  useEffect(()=>{
    fetch('/api/saas/config?tenant=platform-master').then(r=>r.json()).then(d=>{
      if (d.stats) setStats(d.stats);
      let p = d.plans||[];
      if(!p.find(x=>x.id==='free-term')) p=[{id:'free-term',name:'1 Term Free',price:0,cycle:'once',features:['Full Access','Curriculum Aware','1 Term Only']},...p];
      if(!p.find(x=>x.id==='trial')) p=[{id:'trial',name:'30-Day Trial',price:0,cycle:'once',features:['Full Access','30 Days','All Features']},...p];
      setPlans(p);
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!processingPay||!orderId) return;
    const poll=async()=>{
      const r=await fetch(`/api/pesapal?action=status&OrderTrackingId=${orderId}`);
      const d=await r.json();
      if(d.ok&&d.status==='Completed'){setSuccess(d.message||'School activated!');setTimeout(()=>router.push(d.loginUrl),2000);}
      else setTimeout(poll,3000);
    };
    poll();
  },[processingPay,orderId]);

  const selectedPlan = plans.find(p=>p.id===form.plan)||{price:0,billingModel:'flat'};
  const totalDue = selectedPlan.billingModel==='per-learner' ? selectedPlan.price*(form.estimatedStudents||0) : (selectedPlan.price||0);

  const sendOtp = async()=>{
    if(!form.phone){setOtpMsg('Enter your phone number first');return;}
    setOtpLoading(true); setOtpMsg('');
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'request_reg_otp',phone:form.phone})});
      const d=await r.json();
      if(!d.ok) throw new Error(d.error);
      setOtpSent(true); setOtpMsg('Code sent to '+form.phone);
    }catch(e){setOtpMsg(e.message);}
    finally{setOtpLoading(false);}
  };

  const verifyOtp = async()=>{
    if(!otpCode){setOtpMsg('Enter the 6-digit code');return;}
    setOtpLoading(true); setOtpMsg('');
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify_reg_otp',phone:form.phone,otp:otpCode})});
      const d=await r.json();
      if(!d.ok) throw new Error(d.error);
      setOtpVerified(true); setOtpMsg('');
    }catch(e){setOtpMsg(e.message);}
    finally{setOtpLoading(false);}
  };

  const validateStep = ()=>{
    if(step===0){
      if(!form.schoolName.trim()) return 'School name is required';
      if(!form.schoolType) return 'Select school type';
    }
    if(step===1){
      if(!form.adminName.trim()) return 'Administrator name is required';
      if(!form.adminUsername.trim()||form.adminUsername.length<4) return 'Username must be at least 4 characters';
      if(!form.adminPassword||form.adminPassword.length<8) return 'Password must be at least 8 characters';
      if(!form.phone) return 'Phone number is required';
      if(!otpVerified) return 'Please verify your phone number to continue';
    }
    if(step===2){
      if(!form.curriculum) return 'Please select a curriculum';
      if(!form.plan) return 'Please select a plan';
    }
    return null;
  };

  const next = ()=>{ const e=validateStep(); if(e){setError(e);return;} setError(''); setStep(s=>s+1); };
  const back = ()=>{ setError(''); setStep(s=>s-1); };

  const submit = async()=>{
    setLoading(true); setError('');
    try{
      const r=await fetch('/api/saas/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const d=await r.json();
      if(d.error) throw new Error(d.error);
      setSuccess(d.message||'School registered!');
      setTimeout(()=>router.push(d.loginUrl),1500);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  const payMpesa = async()=>{
    setPayLoading(true); setError('');
    try{
      const r=await fetch('/api/mpesa/stk',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone:form.phone,amount:totalDue,accountRef:`REG-${form.adminUsername||'SCHOOL'}`,description:`Activation: ${form.schoolName}`})});
      const d=await r.json();
      if(!d.success) throw new Error(d.error);
      setError(''); setSuccess('M-Pesa prompt sent! Enter your PIN, then click Confirm Registration below.');
    }catch(e){setError('M-Pesa: '+e.message);}
    finally{setPayLoading(false);}
  };

  const payPesapal = async()=>{
    setPayLoading(true); setError('');
    try{
      const r=await fetch('/api/pesapal?action=initiate',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({registrationPayload:{...form},amount:totalDue})});
      const d=await r.json();
      if(!d.ok) throw new Error(d.error);
      window.location.href=d.redirect_url;
    }catch(e){setError('Card payment: '+e.message);}
    finally{setPayLoading(false);}
  };

  const pct = Math.round(((step)/STEPS.length)*100);

  if(processingPay) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F4FF',flexDirection:'column',gap:16}}>
      <div style={{width:60,height:60,border:'4px solid #DBEAFE',borderTop:'4px solid #1D4ED8',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:18,fontWeight:700,color:'#1E3A8A'}}>Verifying your payment...</div>
      <div style={{fontSize:13,color:'#64748B'}}>{success||'Please wait while we confirm your transaction.'}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="su-root">
      {/* Left Panel */}
      <div className="su-left">
        <div>
          <div className="su-brand">
            <img src="/eduvantage-logo.png" alt="EduVantage"/>
            <div><div className="su-brand-name">EduVantage</div><div className="su-brand-tag">School Management Platform</div></div>
          </div>
          <div className="su-hero">
            <h1>Join <span>{stats.schools > 10 ? `${stats.schools}+` : '500+'}</span><br/>Schools Growing<br/>with EduVantage</h1>
            <p>Kenya's most advanced platform for <strong>CBC</strong>, <strong>TVET</strong>, <strong>IB</strong> & <strong>British</strong> curricula. Automated fees, parent portals — all in one place.</p>
            <div className="su-feat">
              {[['📊','Academic Analytics','Real-time grades, reports & predictions'],
                ['💰','Automated Fees','M-Pesa STK push, Pesapal card payments'],
                ['📱','Parent Portal','Instant SMS alerts & results access'],
                ['🔒','Secure & Isolated','Each school gets its own database'],
              ].map(([icon,name,desc])=>(
                <div key={name} className="su-feat-item">
                  <div className="su-feat-icon">{icon}</div>
                  <div><div style={{fontWeight:700,fontSize:13}}>{name}</div><div style={{fontSize:11,opacity:.65}}>{desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="su-curr">
          <div className="su-curr-title">Supported Curricula</div>
          <div className="su-curr-chips">
            {CURRICULA.map(c=><div key={c.id} className="su-curr-chip">{c.icon} {c.name}</div>)}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="su-right">
        <div className="su-card">
          {/* Progress */}
          <div className="su-progress">
            <div className="su-progress-steps">
              {STEPS.map((s,i)=>(
                <div key={s} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'0 0 auto'}}>
                  <div className={`su-step ${i===step?'active':i<step?'done':''}`}>
                    <div className="su-step-num">{i<step?'✓':i+1}</div>
                    <span style={{display:window?.innerWidth>700?'block':'none'}}>{s}</span>
                  </div>
                  {i<STEPS.length-1&&<div className={`su-step-line ${i<step?'done':''}`}/>}
                </div>
              ))}
            </div>
            <div className="su-progress-bar"><div className="su-progress-fill" style={{width:`${pct}%`}}/></div>
          </div>

          {/* Step 0 — School Info */}
          {step===0&&(
            <>
              <div className="su-title">School Information</div>
              <div className="su-subtitle">Tell us about your school. This sets up your unique portal.</div>
              {error&&<div className="su-alert su-alert-err">{error}</div>}
              <div className="su-form">
                <div className="su-field">
                  <label className="su-label">School Name *</label>
                  <input className="su-input" placeholder="e.g. Sunrise Academy" value={form.schoolName} onChange={e=>F('schoolName',e.target.value)}/>
                </div>
                <div className="su-row">
                  <div className="su-field">
                    <label className="su-label">School Type *</label>
                    <select className="su-input su-select" value={form.schoolType} onChange={e=>F('schoolType',e.target.value)}>
                      {SCHOOL_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="su-field">
                    <label className="su-label">County *</label>
                    <select className="su-input su-select" value={form.county} onChange={e=>F('county',e.target.value)}>
                      {COUNTIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="su-field">
                  <label className="su-label">School Email</label>
                  <input className="su-input" type="email" placeholder="info@yourschool.ac.ke" value={form.schoolEmail} onChange={e=>F('schoolEmail',e.target.value)}/>
                </div>
                <div className="su-field">
                  <label className="su-label">Estimated Number of Students</label>
                  <input className="su-input" type="number" min="1" value={form.estimatedStudents} onChange={e=>F('estimatedStudents',Number(e.target.value))}/>
                </div>
              </div>
              <div className="su-actions">
                <button className="su-btn su-btn-ghost" onClick={()=>router.push('/')}>← Back</button>
                <button className="su-btn su-btn-primary" onClick={next}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 1 — Admin Setup */}
          {step===1&&(
            <>
              <div className="su-title">Administrator Account</div>
              <div className="su-subtitle">Create the primary admin login. You can add staff later.</div>
              {error&&<div className="su-alert su-alert-err">{error}</div>}
              <div className="su-form">
                <div className="su-field">
                  <label className="su-label">Full Name *</label>
                  <input className="su-input" placeholder="Your full name" value={form.adminName} onChange={e=>F('adminName',e.target.value)}/>
                </div>
                <div className="su-row">
                  <div className="su-field">
                    <label className="su-label">Username *</label>
                    <input className="su-input" placeholder="admin.username" value={form.adminUsername} onChange={e=>F('adminUsername',e.target.value.toLowerCase().replace(/\s/g,''))}/>
                  </div>
                  <div className="su-field">
                    <label className="su-label">Password *</label>
                    <input className="su-input" type="password" placeholder="Min 8 chars" value={form.adminPassword} onChange={e=>F('adminPassword',e.target.value)}/>
                  </div>
                </div>
                <div className="su-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="su-label" style={{ margin: 0 }}>Phone Number (for OTP) *</label>
                    <span style={{ fontSize: 9, opacity: 0.6, color: '#1D4ED8', fontWeight: 700 }}>Include country code (e.g. +254...)</span>
                  </div>
                  <div className="su-otp-row">
                    <input className="su-input" placeholder="+254 7XX XXX XXX" value={form.phone} disabled={otpVerified}
                      onChange={e=>{F('phone',e.target.value.replace(/[^\d+]/g, ''));setOtpSent(false);setOtpVerified(false);setOtpMsg('');}}/>
                    {!otpVerified&&<button className="su-otp-btn" disabled={otpLoading||!form.phone} onClick={sendOtp}>
                      {otpLoading?'Sending…':otpSent?'Resend':'Send OTP'}
                    </button>}
                  </div>
                  {otpVerified&&<div className="su-verified">✅ Phone verified</div>}
                  {otpMsg&&<div style={{fontSize:12,color:otpVerified?'#16A34A':'#DC2626',marginTop:5}}>{otpMsg}</div>}
                </div>
                {otpSent&&!otpVerified&&(
                  <div className="su-field" style={{background:'#EFF6FF',padding:20,borderRadius:16,border:'2px solid #BFDBFE',textAlign:'center'}}>
                    <label className="su-label" style={{color:'#1D4ED8',marginBottom:12,display:'block'}}>Enter 6-Digit Verification Code</label>
                    <div style={{position:'relative',display:'flex',gap:12}}>
                      <input className="su-input" placeholder="0 0 0 0 0 0" maxLength={6} value={otpCode}
                        onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                        style={{textAlign:'center',letterSpacing:'0.6rem',fontSize:24,fontWeight:800,fontFamily:'monospace',background:'#fff',border:'2px solid #1D4ED8',color:'#1E3A8A'}}/>
                      <button className="su-otp-btn" disabled={otpLoading||otpCode.length<6} onClick={verifyOtp}
                        style={{background:'#1D4ED8',color:'#fff',borderColor:'#1D4ED8',padding:'0 24px'}}>
                        {otpLoading?'…':'Verify'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="su-field">
                  <label className="su-label">Email (optional)</label>
                  <input className="su-input" type="email" placeholder="admin@yourschool.ac.ke" value={form.email} onChange={e=>F('email',e.target.value)}/>
                </div>
              </div>
              <div className="su-actions">
                <button className="su-btn su-btn-ghost" onClick={back}>← Back</button>
                <button className="su-btn su-btn-primary" onClick={next}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 2 — Curriculum & Plan */}
          {step===2&&(
            <>
              <div className="su-title">Curriculum & Plan</div>
              <div className="su-subtitle">Select your teaching framework and subscription plan.</div>
              {error&&<div className="su-alert su-alert-err">{error}</div>}
              <div className="su-form">
                <label className="su-label">Select Curriculum *</label>
                <div className="su-curr-grid">
                  {CURRICULA.map(c=>(
                    <div key={c.id} className={`su-curr-card ${form.curriculum===c.id?'sel':''}`} onClick={()=>setForm(f=>({...f, curriculum: c.id, levels: {}}))}>
                      <div className="icon">{c.icon}</div>
                      <div className="name">{c.name}</div>
                      <div className="desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <label className="su-label">School Levels (Optional)</label>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Select the specific levels your school offers. Leave all unchecked to support all levels.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {getCurriculum(form.curriculum).CATEGORIES?.map(cat => {
                      const key = cat.levelKey || cat.title.toLowerCase().replace(/ /g,'_');
                      const isOn = form.levels?.[key] !== false;
                      return (
                        <label key={cat.title} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: isOn ? '#EFF6FF' : '#F1F5F9', borderColor: isOn ? '#2563EB' : 'var(--border)' }}>
                          <input type="checkbox" checked={isOn} onChange={e => {
                            F('levels', { ...(form.levels || {}), [key]: e.target.checked });
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: isOn ? '#1E3A8A' : '#64748B' }}>{cat.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <label className="su-label" style={{marginTop:16}}>Select Plan *</label>
                <div className="su-plan-grid">
                  {plans.slice(0,4).map((p,i)=>(
                    <div key={p.id} className={`su-plan-card ${form.plan===p.id?'sel':''}`} onClick={()=>F('plan',p.id)}>
                      {i===1&&<div className="su-plan-badge">Popular</div>}
                      <div className="su-plan-name">{p.name}</div>
                      <div className="su-plan-price">
                        {p.price===0?'Free':`KES ${(p.billingModel==='per-learner'?p.price*(form.estimatedStudents||1):p.price).toLocaleString()}`}
                        {p.price>0&&<span>/{p.cycle||'term'}</span>}
                      </div>
                      <div className="su-plan-feats">
                        {(p.features||[]).slice(0,3).map(f=><div key={f} className="su-plan-feat">✓ {f}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="su-actions">
                <button className="su-btn su-btn-ghost" onClick={back}>← Back</button>
                <button className="su-btn su-btn-primary" onClick={next}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 3 — Confirm & Pay */}
          {step===3&&(
            <>
              <div className="su-title">Confirm & Launch 🚀</div>
              <div className="su-subtitle">Review your details and activate your school portal.</div>
              {error&&<div className="su-alert su-alert-err">{error}</div>}
              {success&&<div className="su-alert su-alert-ok">{success}</div>}

              {/* Summary card */}
              <div style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:16,padding:20,marginBottom:20}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px',fontSize:13}}>
                  {[['School',form.schoolName],['Type',form.schoolType],['County',form.county],
                    ['Curriculum',form.curriculum],['Plan',plans.find(p=>p.id===form.plan)?.name||form.plan],
                    ['Admin',form.adminName],['Username',form.adminUsername],['Phone',form.phone],
                  ].map(([k,v])=>(
                    <div key={k}><span style={{color:'#94A3B8',fontWeight:700,fontSize:11}}>{k.toUpperCase()}</span><div style={{fontWeight:700,color:'#0F172A',marginTop:2}}>{v}</div></div>
                  ))}
                </div>
              </div>

              {totalDue>0?(
                <div className="su-pay-box">
                  <div className="su-pay-title">Amount Due</div>
                  <div className="su-pay-amount">KES {totalDue.toLocaleString()}</div>
                  <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>Select a payment method to activate your school:</div>
                  
                  {/* M-Pesa STK Push */}
                  <div style={{background:'#F0F9FF',borderRadius:14,padding:'16px',marginBottom:12,border:'1.5px solid #BAE6FD'}}>
                    <div style={{fontWeight:800,color:'#0369A1',fontSize:13,marginBottom:10}}>📲 M-Pesa STK Push — Instant</div>
                    <div className="su-pay-methods">
                      <button className="su-pay-method" disabled={payLoading} onClick={payMpesa}>
                        <div className="pm-icon">📱</div>
                        <div><div style={{fontWeight:800}}>M-Pesa STK Push</div><div style={{fontSize:11,color:'#64748B'}}>Instant prompt on your phone</div></div>
                      </button>
                    </div>
                  </div>

                  {/* Card & Digital Wallets */}
                  <div style={{marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{flex:1,height:1,background:'#E2E8F0'}}/>
                      <span style={{fontSize:11,fontWeight:800,color:'#94A3B8',whiteSpace:'nowrap'}}>CARD & DIGITAL WALLETS</span>
                      <div style={{flex:1,height:1,background:'#E2E8F0'}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {label:'Mastercard / Visa',icon:'💳',bg:'#fff',   border:'#E2E8F0',col:'#0F172A',sub:'Secure card',    fn:payPesapal},
                        {label:'PayPal',           icon:'🅿️',bg:'#003087',border:'#003087',col:'#fff',   sub:'PayPal checkout',fn:payPesapal},
                        {label:'Google Pay',       icon:'G', bg:'#fff',   border:'#E2E8F0',col:'#0F172A',sub:'One-tap payment', fn:payPesapal},
                        {label:'Airtel Money',     icon:'📡',bg:'#DC2626',border:'#DC2626',col:'#fff',   sub:'Mobile wallet',   fn:payPesapal},
                      ].map(({label,icon,bg,border,col,sub,fn})=>(
                        <button key={label} className="su-pay-method" disabled={payLoading} onClick={fn}
                          style={{background:bg,borderColor:border,flexDirection:'column',gap:4,padding:'12px 8px',alignItems:'center',textAlign:'center'}}>
                          <div style={{fontSize:20,color:col}}>{icon}</div>
                          <div style={{fontWeight:800,fontSize:12,color:col}}>{label}</div>
                          <div style={{fontSize:10,color:col==='#fff'?'rgba(255,255,255,.65)':'#94A3B8'}}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ):null}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 16, background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <input 
                  type="checkbox" 
                  id="termsCheckSaas" 
                  checked={agreedToTerms} 
                  onChange={e => setAgreedToTerms(e.target.checked)} 
                  style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="termsCheckSaas" style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, cursor: 'pointer' }}>
                  I agree to EduVantage's <a href="/terms" target="_blank" style={{ color: '#4F46E5', fontWeight: 700 }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: '#4F46E5', fontWeight: 700 }}>Privacy Policy</a>.
                </label>
              </div>

              <div className="su-actions">
                <button className="su-btn su-btn-ghost" onClick={back}>← Back</button>
                <button className="su-btn su-btn-primary" disabled={loading||payLoading||!agreedToTerms} onClick={submit}>
                  {loading?'Activating…':totalDue>0?'Confirm Registration':'🚀 Activate School — Free'}
                </button>
              </div>
            </>
          )}

          <div className="su-login-link">
            Already registered? <a onClick={()=>router.push('/login')}>Sign in here →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
