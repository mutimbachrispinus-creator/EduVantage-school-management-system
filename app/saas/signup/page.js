'use client';
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/signup.css';

const CURRICULA = [
  { id:'CBC',  icon:'🇰🇪', name:'CBC',        desc:'Kenya Competency Based' },
  { id:'IGCSE',icon:'🇬🇧', name:'Cambridge',  desc:'IGCSE / A-Levels' },
  { id:'IB',   icon:'🌍', name:'IB',          desc:'International Baccalaureate' },
  { id:'British',icon:'📚',name:'British',    desc:'British National Curriculum' },
  { id:'Montessori',icon:'🌱',name:'Montessori',desc:'Child-Led Learning' },
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

  const [processingPay] = useState(searchParams.get('processing') === 'true');
  const [orderId] = useState(searchParams.get('orderId'));

  const [form, setForm] = useState({
    schoolName:'', schoolType:'Primary', county:'Nairobi', schoolEmail:'',
    adminName:'', adminUsername:'', adminPassword:'', phone:'', email:'',
    curriculum:'CBC', plan:'trial', estimatedStudents:100,
  });

  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    fetch('/api/saas/config?tenant=platform-master').then(r=>r.json()).then(d=>{
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
      if(!form.adminPassword||form.adminPassword.length<6) return 'Password must be at least 6 characters';
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
            <img src="/ev-brand-v3.png" alt="EduVantage"/>
            <div><div className="su-brand-name">EduVantage</div><div className="su-brand-tag">School Management Platform</div></div>
          </div>
          <div className="su-hero">
            <h1>Join <span>5,000+</span><br/>Schools Growing<br/>with EduVantage</h1>
            <p>Kenya's most advanced school management platform. Multi-curriculum, automated fees, parent portals — all in one place.</p>
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
                    <input className="su-input" type="password" placeholder="Min 6 chars" value={form.adminPassword} onChange={e=>F('adminPassword',e.target.value)}/>
                  </div>
                </div>
                <div className="su-field">
                  <label className="su-label">Phone Number (for OTP) *</label>
                  <div className="su-otp-row">
                    <input className="su-input" placeholder="07XXXXXXXX" value={form.phone} disabled={otpVerified}
                      onChange={e=>{F('phone',e.target.value);setOtpSent(false);setOtpVerified(false);setOtpMsg('');}}/>
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
                    <div key={c.id} className={`su-curr-card ${form.curriculum===c.id?'sel':''}`} onClick={()=>F('curriculum',c.id)}>
                      <div className="icon">{c.icon}</div>
                      <div className="name">{c.name}</div>
                      <div className="desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
                <label className="su-label" style={{marginTop:8}}>Select Plan *</label>
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
                  <div className="su-pay-methods">
                    <button className="su-pay-method" disabled={payLoading} onClick={payMpesa}>
                      <div className="pm-icon">📱</div>
                      <div><div style={{fontWeight:800}}>M-Pesa STK Push</div><div style={{fontSize:11,color:'#64748B'}}>Instant prompt on your phone</div></div>
                    </button>
                    <button className="su-pay-method" disabled={payLoading} onClick={payPesapal}>
                      <div className="pm-icon">💳</div>
                      <div><div style={{fontWeight:800}}>Card / Pesapal</div><div style={{fontSize:11,color:'#64748B'}}>Visa, Mastercard, Airtel Money</div></div>
                    </button>
                  </div>
                </div>
              ):null}

              <div className="su-actions">
                <button className="su-btn su-btn-ghost" onClick={back}>← Back</button>
                <button className="su-btn su-btn-primary" disabled={loading||payLoading} onClick={submit}>
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
