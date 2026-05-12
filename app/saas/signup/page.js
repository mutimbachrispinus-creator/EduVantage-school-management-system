'use client';
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EduVantageSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);

  const [processingPay, setProcessingPay] = useState(searchParams.get('processing') === 'true');
  const [orderId, setOrderId] = useState(searchParams.get('orderId'));
  const [payStatus, setPayStatus] = useState('Checking payment status...');

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/saas/config?tenant=platform-master');
        const data = await res.json();
        let fetchedPlans = data.plans || [];
        
        // Ensure 1 Term Free is always an option even if not in global config
        const freeTerm = { id: 'free-term', name: '1 Term Free', price: 0, cycle: 'once', features: ['Full Access', 'Curriculum Aware', '1 Term Only'] };
        if (!fetchedPlans.find(p => p.id === 'free-term')) {
          fetchedPlans = [freeTerm, ...fetchedPlans];
        }
        
        setPlans(fetchedPlans);
      } catch (e) {}
    }
    loadPlans();
  }, []);

  const [form, setForm] = useState({
    schoolName: '',
    adminName: '',
    adminUsername: '',
    adminPassword: '',
    phone: '',
    email: '',
    plan: 'trial', // Default to trial
    curriculum: 'CBC',
    estimatedStudents: 100 // Default estimate
  });

  const [showPayment, setShowPayment] = useState(false);
  const [payPhone, setPayPhone] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (form.phone) setPayPhone(form.phone);
  }, [form.phone]);

  const selectedPlanData = plans.find(p => p.id === form.plan) || { price: 0, billingModel: 'flat' };
  const totalDue = selectedPlanData.billingModel === 'per-learner' ? selectedPlanData.price * (form.estimatedStudents || 0) : selectedPlanData.price;
  const isPaid = totalDue > 0;

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // If it's a paid plan and payment hasn't been confirmed yet, show prompt
    if (isPaid && !showPayment) {
      setShowPayment(true);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      setSuccess(json.message);
      setTimeout(() => {
        router.push(json.loginUrl);
      }, 1000);
    } catch (e) {
      setError(e.message);
      setShowPayment(false); // Go back if error
    } finally {
      setLoading(false);
    }
  };


  
  const sendOtp = async () => {
    if (!form.phone) return alert('Please enter a phone number first');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_reg_otp', phone: form.phone })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setOtpSent(true);
      alert('Verification code sent to ' + form.phone);
    } catch (e) {
      alert(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode) return alert('Please enter the verification code');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_reg_otp', phone: form.phone, otp: otpCode })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setOtpVerified(true);
      alert('Phone number verified!');
    } catch (e) {
      alert(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const initiatePayment = async () => {
    setPayLoading(true);
    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: payPhone,
          amount: totalDue,
          reference: `REG-${form.adminUsername || 'SCHOOL'}`,
          desc: `Activation for ${form.schoolName} (${selectedPlanData.name})`
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      alert('Payment prompt sent to your phone. Please enter your PIN to complete registration.');
      onSubmit(); // Proceed with signup
    } catch (e) {
      alert('Payment failed: ' + e.message);
    } finally {
      setPayLoading(false);
    }
  };

  const initiatePesapal = async () => {
    setPayLoading(true);
    try {
      const res = await fetch('/api/pesapal?action=initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationPayload: { ...form },
          amount: totalDue
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      window.location.href = data.redirect_url;
    } catch (e) {
      alert('Pesapal Initiation Failed: ' + e.message);
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (processingPay && orderId) {
      const check = async () => {
        try {
          const res = await fetch(`/api/pesapal?action=status&OrderTrackingId=${orderId}`);
          const data = await res.json();
          if (data.ok && data.status === 'Completed') {
            setSuccess(data.message);
            setTimeout(() => { router.push(data.loginUrl); }, 2000);
          } else {
            setPayStatus(data.status || 'Still processing...');
            setTimeout(check, 3000); // Poll every 3s
          }
        } catch (e) {
          setPayStatus('Error checking status');
        }
      };
      check();
    }
  }, [processingPay, orderId]);

  return (
    <div className="signup-page" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ maxWidth: 550, width: '100%', padding: 40, borderRadius: 24, boxShadow: '0 20px 50px rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
          <button onClick={() => router.push('/')} className="btn-link" style={{ fontSize: 13, color: '#64748B', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 35 }}>
          <img src="/ev-brand-v3.png" alt="EduVantage" style={{ width: 64, marginBottom: 16 }} />
          <h1 style={{ margin: 0, fontSize: 24, color: '#0F172A', fontWeight: 800 }}>Join the EduVantage Network</h1>
          <p style={{ color: '#64748B', marginTop: 8 }}>Empower your school with the ultimate management portal.</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 12, color: '#DC2626', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {showPayment && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: '#fff', padding: 35, borderRadius: 24, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 40, marginBottom: 15 }}>💳</div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#0F172A' }}>Activate {selectedPlanData.name}</h2>
              <p style={{ color: '#64748B', fontSize: 14, marginTop: 8 }}>To complete your registration, please pay <b>KES {totalDue.toLocaleString()}</b> via M-Pesa.</p>
              {selectedPlanData.billingModel === 'per-learner' && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>({form.estimatedStudents} students × KES {selectedPlanData.price})</p>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 25 }}>
                <button 
                  className="btn" 
                  disabled={payLoading}
                  onClick={initiatePayment}
                  style={{ width: '100%', padding: 14, background: '#2563EB', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {payLoading ? '...' : '📱 Pay with M-Pesa STK'}
                </button>
                <button 
                  className="btn" 
                  disabled={payLoading}
                  onClick={initiatePesapal}
                  style={{ width: '100%', padding: 14, background: '#0F172A', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {payLoading ? '...' : '💳 Pay with Card / Mobile Money'}
                </button>
                <button 
                  className="btn" 
                  onClick={() => setShowPayment(false)}
                  style={{ width: '100%', padding: 12, background: 'none', color: '#64748B', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 15 }}>Secure automated payment processing via Safaricom & Pesapal.</p>
            </div>
          </div>
        )}

        {processingPay ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ color: '#0F172A', margin: 0 }}>Processing Payment</h2>
            <p style={{ color: '#64748B', marginTop: 10 }}>{payStatus}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 20 }}>Please do not close this window. Your portal will be activated automatically.</p>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 50, marginBottom: 20 }}>🚀</div>
            <h2 style={{ color: '#16A34A', margin: 0 }}>Portal Ready!</h2>
            <p style={{ color: '#64748B' }}>{success}</p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 16 }}>Redirecting you to your new school portal…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label>Institutional Name</label>
              <input required placeholder="e.g. Hilltop Academy" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Select Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {plans.length > 0 ? (
                  plans.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setForm({...form, plan: p.id})}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${form.plan === p.id ? '#2563EB' : '#E2E8F0'}`, cursor: 'pointer', background: form.plan === p.id ? '#EFF6FF' : '#fff', transition: '0.2s', position: 'relative' }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>
                        {p.price > 0 ? (
                          `${p.billingModel === 'per-learner' ? `KES ${p.price} / student` : `KES ${p.price.toLocaleString()} / school`} / ${p.cycle || 'term'}`
                        ) : 'Free Access'}
                      </div>
                      {p.id === 'free-term' && (
                        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#F97316', color: '#fff', fontSize: 7, padding: '2px 6px', borderRadius: 4, fontWeight: 800, whiteSpace: 'nowrap' }}>NON-RENEWABLE</div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div 
                      onClick={() => setForm({...form, plan: 'trial'})}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${form.plan === 'trial' ? '#2563EB' : '#E2E8F0'}`, cursor: 'pointer', background: form.plan === 'trial' ? '#EFF6FF' : '#fff' }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 14 }}>30-Day Trial</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>Free full access</div>
                    </div>
                    <div 
                      onClick={() => setForm({...form, plan: 'premium'})}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${form.plan === 'premium' ? '#2563EB' : '#E2E8F0'}`, cursor: 'pointer', background: form.plan === 'premium' ? '#EFF6FF' : '#fff' }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Premium Plan</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>KES 10,000 / Year</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="form-group fade-in" style={{ padding: 20, background: '#F1F5F9', borderRadius: 16 }}>
              <label>Institutional Population (Current Students) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <input 
                  type="number" 
                  required 
                  min="1"
                  placeholder="e.g. 250" 
                  value={form.estimatedStudents} 
                  onChange={e => setForm({...form, estimatedStudents: parseInt(e.target.value) || 0})} 
                  style={{ flex: 1, border: '2.5px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}
                />
                {selectedPlanData.billingModel === 'per-learner' && (
                  <div style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#64748B' }}>
                    Total: <b style={{ color: '#0F172A' }}>KES {totalDue.toLocaleString()}</b>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 8 }}>
                <b>Note:</b> This number helps us estimate your initial setup. You can add as many students as you need without restriction.
              </p>
            </div>

            <div className="form-group">
              <label>Education System / Curriculum</label>
              <select 
                value={form.curriculum} 
                onChange={e => setForm({...form, curriculum: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, outline: 'none', background: '#fff' }}
              >
                <option value="CBC">Kenya CBC (Competency-Based)</option>
                <option value="BRITISH">British National Curriculum (IGCSE/A-Level)</option>
                <option value="CAMBRIDGE">Cambridge International (Primary/IGCSE/A-Level)</option>
                <option value="IB">International Baccalaureate (PYP/MYP/DP)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="form-group">
                <label>Admin Full Name</label>
                <input required placeholder="Principal Name" value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Admin Username 
                  <span 
                    onClick={() => {
                      if (!form.adminName && !form.schoolName) return;
                      const base = (form.adminName || form.schoolName).toLowerCase().split(' ')[0].replace(/[^a-z]/g, '');
                      setForm({...form, adminUsername: `${base}.admin${Math.floor(Math.random()*99)}`});
                    }}
                    style={{ color: '#2563EB', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}
                  >
                    Suggest?
                  </span>
                </label>
                <input required placeholder="admin-user" value={form.adminUsername} onChange={e => setForm({...form, adminUsername: e.target.value.toLowerCase().replace(/\s/g, '')})} />
                <p style={{ fontSize: 9, color: '#94A3B8', marginTop: 4 }}>This will be your login ID</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="form-group">
                <label>Admin Password</label>
                <input required type="password" placeholder="••••••••" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    required 
                    placeholder="07XXXXXXXX" 
                    value={form.phone} 
                    onChange={e => { setForm({...form, phone: e.target.value}); setOtpVerified(false); setOtpSent(false); }} 
                    style={{ flex: 1 }}
                    disabled={otpVerified}
                  />
                  {!otpVerified && (
                    <button 
                      type="button" 
                      onClick={sendOtp} 
                      disabled={otpLoading || !form.phone}
                      style={{ padding: '0 15px', background: '#F1F5F9', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
                    >
                      {otpSent ? 'Resend' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {otpSent && !otpVerified && (
              <div className="form-group fade-in" style={{ padding: 20, background: '#EFF6FF', borderRadius: 16, border: '2px solid #DBEAFE' }}>
                <label style={{ color: '#2563EB' }}>Enter 6-Digit Code</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input 
                    type="text" 
                    placeholder="000000" 
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                    style={{ flex: 1, textAlign: 'center', fontSize: 20, letterSpacing: 4, fontWeight: 800 }}
                  />
                  <button 
                    type="button" 
                    onClick={verifyOtp}
                    disabled={otpLoading || otpCode.length < 6}
                    style={{ padding: '0 25px', background: '#2563EB', color: '#fff', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {otpLoading ? '...' : 'Confirm'}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#64748B', marginTop: 8 }}>Check your SMS for the verification code.</p>
              </div>
            )}

            {otpVerified && (
              <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: -10 }}>
                ✅ Phone number verified successfully
              </div>
            )}

            <button 
              className="btn btn-primary" 
              disabled={loading || !otpVerified} 
              style={{ padding: '14px', fontSize: 16, marginTop: 10, background: !otpVerified ? '#94A3B8' : '#2563EB' }}
            >
              {loading ? 'Setting up...' : (form.plan === 'trial' || form.plan === 'free-term') ? 'Start My Free Access' : 'Subscribe & Create Portal'}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .form-group label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 6px; }
        .form-group input { width: 100%; padding: 12px 16px; border: 1.5px solid #E2E8F0; borderRadius: 12px; font-size: 14px; outline: none; transition: all 0.2s; box-sizing: border-box; }
        .form-group input:focus { border-color: #2563EB; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
}
