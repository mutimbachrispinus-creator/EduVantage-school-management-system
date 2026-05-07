'use client';
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EduVantageSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/saas/config?tenant=platform-master');
        const data = await res.json();
        if (data.plans) setPlans(data.plans);
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
    curriculum: 'CBC'
  });

  const onSubmit = async (e) => {
    e.preventDefault();
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ maxWidth: 550, width: '100%', padding: 40, borderRadius: 24, boxShadow: '0 20px 50px rgba(15,23,42,0.08)' }}>
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

        {success ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: plans.length > 2 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                {plans.length > 0 ? (
                  plans.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setForm({...form, plan: p.id})}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${form.plan === p.id ? '#2563EB' : '#E2E8F0'}`, cursor: 'pointer', background: form.plan === p.id ? '#EFF6FF' : '#fff', transition: '0.2s' }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{p.price > 0 ? `KES ${p.price} / ${p.cycle}` : 'Free Access'}</div>
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

            <div className="form-group">
              <label>Education System / Curriculum</label>
              <select 
                value={form.curriculum} 
                onChange={e => setForm({...form, curriculum: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, outline: 'none', background: '#fff' }}
              >
                <option value="CBC">Kenya CBC (Competency-Based)</option>
                <option value="BRITISH">British National Curriculum (IGCSE/A-Level)</option>
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
                <input required placeholder="07XXXXXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>

            <button className="btn btn-primary" disabled={loading} style={{ padding: '14px', fontSize: 16, marginTop: 10, background: '#2563EB' }}>
              {loading ? 'Setting up...' : form.plan === 'trial' ? 'Start My Free Trial' : 'Subscribe & Create Portal'}
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
