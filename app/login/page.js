'use client';
export const runtime = 'edge';
/**
 * app/login/page.js — Faithfully Restored Legacy Login Page (v122 Styles)
 * Updated for EduVantage SaaS Platform.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { prefetchKeys, clearAllCache, fetchWithRetry, hydrateCache } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser: setGlobalUser } = useProfile() || {};
  
  // Default to empty or neutral if no tenant provided, but remember last logged in school
  const [tenantId, setTenantId] = useState('platform-master');

  useEffect(() => {
    let t = searchParams.get('tenant');
    if (t) {
      setTenantId(t);
      // Strict Lockdown: If we have a cached user from a different tenant, clear everything
      const raw = localStorage.getItem('paav_cache_user');
      if (raw) {
        try {
          const { v: u } = JSON.parse(raw);
          const currentTid = u?.tenant_id || u?.tenantId;
          if (currentTid && currentTid !== t && t !== 'platform-master') {
            console.warn('[Auth] Tenant mismatch detected. Terminating stale session.');
            fetch('/api/auth', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'logout' }),
              keepalive: true 
            }).catch(() => {});
            clearAllCache();
            // Don't reload immediately, just let the state update
          }
        } catch (err) {
          console.error('[Auth] Cache parsing error:', err);
        }
      }
    }
    else {
      setTenantId('platform-master');
      // Proactively clear master branding artifacts if they exist
      try {
        localStorage.removeItem('paav_cache_platform-master_db_paav_school_profile');
        localStorage.removeItem('paav_cache_platform-master_db_paav_theme');
      } catch {}
    }
  }, [searchParams]);

  const [tab, setTab] = useState('login'); 
  const [resetStep, setResetStep] = useState(1); // 1: username, 2: otp + new pass
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState('');
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  
  const [stats, setStats] = useState({ schools: 0, learners: 0, classes: 0 });
  const [announcement, setAnnouncement] = useState('Welcome to the EduVantage School Network.');
  const [profile, setProfile] = useState({ 
    name: 'EduVantage School Management System', 
    tagline: 'Global Education SaaS Network',
    logo: '/ev-brand-v3.png'
  });
  const [heroImg, setHeroImg] = useState('');
  const [theme, setTheme] = useState({ 
    primary: '#1E40AF', 
    secondary: '#D4AF37' 
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  const [schools, setSchools] = useState([]);
  const [links, setLinks] = useState([{ schoolId: '', adm: '' }]);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, taken: false });
  const [choices, setChoices] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', 
    name: '', phone: '', role: 'parent', 
  });
  const [resetForm, setResetForm] = useState({
    username: '', otp: '', newPassword: ''
  });

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const RF = (k, v) => setResetForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await fetch('/api/saas/schools');
        const data = await res.json();
        if (data.ok) setSchools(data.schools);
      } catch (e) {}
    }
    loadSchools();
  }, []);

  async function checkUsername(u) {
    if (!u || u.length < 3) return;
    setUsernameStatus({ checking: true, taken: false });
    try {
      const res = await fetch(`/api/auth/check-username?username=${u}`);
      const data = await res.json();
      setUsernameStatus({ checking: false, taken: data.taken });
    } catch (e) {
      setUsernameStatus({ checking: false, taken: false });
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (form.username && tab === 'register') checkUsername(form.username);
    }, 500);
    return () => clearTimeout(t);
  }, [form.username, tab]);

  useEffect(() => {
    // Perform a quick cache sanity check on mount
    if (tenantId === 'platform-master') {
       // Optional: reset to EduVantage colors
       document.documentElement.style.setProperty('--primary', '#4F46E5');
       document.documentElement.style.setProperty('--secondary', '#F4A460');
    }

    async function loadConfig() {
      try {
        const res = await fetch(`/api/saas/config?tenant=${tenantId}&_t=${Date.now()}`);
        const data = await res.json();
        if (data.announcement) setAnnouncement(data.announcement);
        if (data.heroImg) setHeroImg(data.heroImg);
        if (data.theme) {
          setTheme(data.theme);
          document.documentElement.style.setProperty('--primary', data.theme.primary);
          document.documentElement.style.setProperty('--secondary', data.theme.secondary);
        }

        if (data.stats) {
          setStats(data.stats);
        } else {
          const sRes = await fetch(`/api/stats?tenant=${tenantId}`);
          const s = await sRes.json();
          setStats(s);
        }
        setConfigLoaded(true);
      } catch (e) {
        console.error('Config load error:', e);
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, [tenantId]);

  const handleAction = async (e, forcedTid = null) => {
    if (e) e.preventDefault();
    if (usernameStatus.taken && tab === 'register') {
      setErr('This username is already taken. Please choose another.');
      return;
    }
    setBusy(true); setErr(''); setOkMsg('');

    const targetTenant = forcedTid || tenantId;

    try {
      const actionPayload = tab === 'otp' ? 'register' : tab;
      const res = await fetchWithRetry('/api/auth', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': targetTenant
        },
        body: JSON.stringify({ 
          action: actionPayload, 
          links: tab === 'register' ? links : null,
          ...form 
        }),
        timeout: 30000
      });

      let data;
      try { data = await res.json(); } catch { throw new Error(`Server response was not valid JSON (${res.status})`); }
      
      if (!res.ok) {
        if (res.status === 403 && data.choices) {
          setChoices(data.choices);
          setErr('Multiple accounts found. Please select your school:');
        } else {
          setErr(data.error || `Error ${res.status}: Unable to authenticate. Please check your credentials.`);
        }
        setBusy(false);
        return;
      }
      
      if (data.ok) {
        if (tab === 'login') {
          clearAllCache();
          await hydrateCache({ user: data.user });
          if (data.initialData) await hydrateCache(data.initialData);
          if (setGlobalUser) setGlobalUser(data.user);
          router.push(data.redirect || '/dashboard');
        } else {
          setOkMsg(`✅ Registered! Your username is: ${data.username}. Please login.`);
          setTab('login');
          setForm(f => ({ ...f, username: data.username, password: '' }));
        }
      }
    } catch (e) {
      console.error('[Login] Action failed:', e);
      let msg = e.message || 'Unknown error';
      if (msg.includes('Failed to fetch')) {
        msg = 'Connection failed. Please check your internet or firewall settings.';
      } else if (msg.includes('timeout')) {
        msg = 'Request timed out. The server might be busy, please try again.';
      }
      setErr(`Connection Error: ${msg}. If this persists, please contact EduVantage support.`);
    } finally {
      setBusy(false);
    }
  };

  const handleResetAction = async (e) => {
    if (e) e.preventDefault();
    setBusy(true); setErr(''); setOkMsg('');
    try {
      const action = resetStep === 1 ? 'request_otp' : 'verify_otp_reset';
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ action, ...resetForm })
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error); setBusy(false); return; }
      
      if (resetStep === 1) {
        setOkMsg(data.message);
        setResetStep(2);
      } else {
        setOkMsg('✅ Password reset successful! Please login.');
        setTab('login');
        setResetStep(1);
        setForm(f => ({ ...f, username: resetForm.username, password: '' }));
      }
    } catch (e) {
      setErr('Connection failed. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectChoice = (tid) => {
    setTenantId(tid);
    setChoices(null);
    setErr('');
    handleAction(null, tid);
  };

  return (
    <div id="auth" style={heroImg ? { background: `linear-gradient(135deg, rgba(5,15,28,0.85) 0%, rgba(13,31,60,0.85) 40%, rgba(21,45,79,0.9) 100%), url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
      <div className="auth-left">
        <div className="auth-logo">
           <img src={profile.logo || "/ev-brand-v3.png"} alt="Logo" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: 8, boxShadow: '0 20px 60px rgba(0,0,0,.4)', display:'block', margin:'0 auto' }} />
        </div>
        <div className="auth-h">{profile.name}<br/><span style={{ color: 'var(--secondary, #F4A460)' }}>{profile.tagline}</span></div>
        <div className="auth-tagline">Support: +254 792 656 579 · portal@eduvantage.app</div>
        
        <div className="auth-pills">
          <div className="auth-pill"><div className="auth-pill-i">📊</div>Advanced Academic Analytics — Performance tracking for all levels</div>
          <div className="auth-pill"><div className="auth-pill-i">💸</div>Automated Financial Management — Seamless fee collection</div>
          <div className="auth-pill"><div className="auth-pill-i">📲</div>Instant Communication — Reliable Bulk SMS and Parent Portals</div>
          <div className="auth-pill"><div className="auth-pill-i">🏗️</div>Scalable Multi-Tenant Architecture — Isolated, secure databases</div>
        </div>

        <div className="auth-announcement" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 40, backdropFilter: 'blur(10px)' }}>
           <h4 style={{ color: '#FCD34D', fontSize: 10, textTransform: 'uppercase', marginBottom: 5, letterSpacing: 1.2 }}>📢 EDUVANTAGE NETWORK NEWS</h4>
           <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 1.6 }}>Join the growing network of digitally-empowered schools across East Africa. High-performance school management at your fingertips.</p>
        </div>

        <div className="auth-stats">
          {tenantId === 'platform-master' ? (
            <>
              <div className="auth-stat"><div className="auth-stat-n">{stats.schools || '0'}</div><div className="auth-stat-l">Enrolled Schools</div></div>
              <div className="auth-stat"><div className="auth-stat-n">{stats.learners || '0'}</div><div className="auth-stat-l">Total Learners</div></div>
            </>
          ) : (
            <>
              <div className="auth-stat"><div className="auth-stat-n">{stats.learners || '—'}</div><div className="auth-stat-l">Learners</div></div>
              <div className="auth-stat"><div className="auth-stat-n">{stats.classes || '—'}</div><div className="auth-stat-l">Grades Active</div></div>
            </>
          )}
          <div className="auth-stat"><div className="auth-stat-n">{new Date().getFullYear()}</div><div className="auth-stat-l">Academic Year</div></div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img src={profile.logo || "/ev-brand-v3.png"} alt="Logo" style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: '50%', boxShadow: `0 4px 16px ${theme?.primary || '#4F46E5'}33` }} />
          </div>
          <div className="auth-card-title">
            {tab === 'login' ? 'Welcome Back' : tab === 'register' ? 'Parent Registration' : 'Reset Password'}
          </div>
          
          {tab !== 'reset' && (
            <div className="auth-sw-row">
              <button className={`auth-sw ${tab === 'login' ? 'on' : ''}`} onClick={() => setTab('login')} style={tab === 'login' ? { background: 'var(--primary)', boxShadow: `0 2px 8px ${theme?.primary}4D` } : {}}>Sign In</button>
              <button className={`auth-sw ${tab === 'register' ? 'on' : ''}`} onClick={() => setTab('register')} style={tab === 'register' ? { background: 'var(--primary)', boxShadow: `0 2px 8px ${theme?.primary}4D` } : {}}>Parent Register</button>
            </div>
          )}

          {choices && (
            <div className="choices-panel" style={{ marginBottom: 20, animation: 'fadeIn 0.3s' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>PLEASE SELECT YOUR SCHOOL:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {choices.map(c => (
                  <button key={c.id} className="choice-btn" onClick={() => handleSelectChoice(c.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="choice-icon">🏫</div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>Login to this institution</div>
                      </div>
                    </div>
                    <span>➔</span>
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setChoices(null)}>Cancel</button>
            </div>
          )}

          {tab === 'reset' ? (
            <form onSubmit={handleResetAction}>
              {resetStep === 1 ? (
                <>
                  <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Enter your username. We will send a 6-digit OTP to your registered phone number.</p>
                  <div className="field">
                    <label>Username</label>
                    <input required value={resetForm.username} onChange={e => RF('username', e.target.value.toLowerCase())} placeholder="your.username" />
                  </div>
                  <div className="field">
                    <label>Phone Number (to receive OTP)</label>
                    <input required value={resetForm.phone} onChange={e => RF('phone', e.target.value)} placeholder="07XXXXXXXX" />
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label>6-Digit OTP</label>
                    <input required autoFocus value={resetForm.otp} onChange={e => RF('otp', e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="000000" style={{ letterSpacing: 4, textAlign: 'center', fontSize: 20 }} />
                  </div>
                  <div className="field">
                    <label>New Password</label>
                    <input required type="password" value={resetForm.newPassword} onChange={e => RF('newPassword', e.target.value)} placeholder="Min 6 characters" />
                  </div>
                </>
              )}

              {err && <div className="alert alert-err show">{err}</div>}
              {okMsg && <div className="alert alert-ok show">{okMsg}</div>}

              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Processing...' : resetStep === 1 ? '📩 Send OTP' : '🔑 Reset Password'}
              </button>
              <button type="button" className="btn-link" style={{ width: '100%', marginTop: 15, textAlign: 'center', fontSize: 13 }} onClick={() => { setTab('login'); setResetStep(1); setErr(''); setOkMsg(''); }}>
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleAction}>
              {tab === 'login' && (
                <div className="field">
                  <label>Username</label>
                  <input required value={form.username} onChange={e => { F('username', e.target.value.toLowerCase()); setErr(''); }} placeholder="your.username" />
                </div>
              )}

              {tab === 'register' && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input required value={form.name} onChange={e => F('name', e.target.value)} placeholder="Parent Name" />
                  </div>
                  
                  <div className="field">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      Choose Username
                      <span 
                        style={{ color: 'var(--primary)', fontSize: 10, cursor: 'pointer' }}
                        onClick={() => {
                          const base = (form.name.split(' ')[0] || 'parent').toLowerCase().replace(/[^a-z]/g, '');
                          F('username', `${base}.parent${Math.floor(Math.random()*999)}`);
                        }}
                      >
                        Suggest?
                      </span>
                    </label>
                    <input required value={form.username} onChange={e => F('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="desired.username" />
                    {usernameStatus.checking && <div style={{ fontSize: 10, color: '#64748B' }}>Checking availability...</div>}
                    {usernameStatus.taken && <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>⚠️ This username is already taken!</div>}
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 15, borderRadius: 12, marginBottom: 20, border: '1px solid #E2E8F0' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 10 }}>LINKED SCHOOLS & LEARNERS</label>
                    {links.map((link, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 30px', gap: 10, marginBottom: 8 }}>
                        <select required value={link.schoolId} onChange={e => {
                          const newLinks = [...links]; newLinks[idx].schoolId = e.target.value; setLinks(newLinks);
                        }} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: 13 }}>
                          <option value="">Select School</option>
                          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input required placeholder="Adm No." value={link.adm} onChange={e => {
                          const newLinks = [...links]; newLinks[idx].adm = e.target.value; setLinks(newLinks);
                        }} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: 13 }} />
                        {idx > 0 && <button type="button" onClick={() => setLinks(links.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setLinks([...links, { schoolId: '', adm: '' }])} style={{ width: '100%', padding: '8px', background: '#fff', border: '1.5px dashed #CBD5E1', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>+ Add Another School</button>
                  </div>

                  <div className="field">
                    <label>Phone Number</label>
                    <input required value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="07XXXXXXXX" />
                  </div>
                </>
              )}
              
              <div className="field" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ margin: 0 }}>Password</label>
                  {tab === 'login' && (
                    <button type="button" className="btn-link" style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }} onClick={() => { setTab('reset'); setErr(''); setOkMsg(''); }}>
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input required type={showPass ? "text" : "password"} value={form.password} onChange={e => { F('password', e.target.value); setErr(''); }} placeholder="••••••••" style={{ paddingRight: 45 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {err && <div className="alert alert-err show">{err}</div>}
              {okMsg && <div className="alert alert-ok show">{okMsg}</div>}

              <button type="submit" className="btn btn-primary" disabled={busy} style={{ marginTop: 10, background: `linear-gradient(135deg, var(--primary), var(--primary))` }}>
                {busy ? 'Processing...' : tab === 'login' ? '🔐 Sign In' : '🚀 Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
      <style jsx global>{`
        :root {
          --primary: ${theme?.primary || '#4F46E5'};
          --secondary: ${theme?.secondary || '#D4AF37'};
        }
        #auth { min-height: 100vh; display: flex; align-items: stretch; background: #0F172A; }
        .auth-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(79, 70, 229, 0.1), transparent); pointer-events: none; }
        .auth-left { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 64px; position: relative; z-index: 1; color: #fff; }
        .auth-h { font-family: 'Sora', sans-serif; font-size: 36px; font-weight: 800; line-height: 1.2; margin-bottom: 10px; }
        .auth-tagline { font-size: 14px; opacity: 0.6; margin-bottom: 40px; }
        .auth-pills { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
        .auth-pill { display: flex; align-items: center; gap: 12px; font-size: 13.5px; background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
        .auth-pill-i { font-size: 18px; }
        .auth-stats { display: flex; gap: 32px; border-top: 1px solid rgba(255,255,255,0.1); pt: 32px; }
        .auth-stat-n { font-size: 24px; font-weight: 800; color: var(--secondary); }
        .auth-stat-l { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.5; }
        
        .auth-right { width: 480px; background: #fff; position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; box-shadow: -20px 0 60px rgba(0,0,0,0.1); }
        .auth-card { width: 100%; max-width: 360px; padding: 40px 20px; }
        .auth-card-title { font-size: 28px; font-weight: 800; text-align: center; color: #0F172A; margin-bottom: 8px; letter-spacing: -0.5px; }
        .auth-card-sub { font-size: 14px; text-align: center; color: #64748B; margin-bottom: 32px; line-height: 1.5; }
        
        .auth-sw-row { display: flex; background: #F1F5F9; padding: 5px; border-radius: 14px; margin-bottom: 24px; }
        .auth-sw { flex: 1; border: none; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; color: #64748B; background: transparent; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .auth-sw.on { color: #fff; transform: scale(1.02); }
        
        .field { margin-bottom: 24px; }
        .field label { display: block; font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .field input { width: 100%; padding: 14px 18px; border-radius: 12px; border: 2px solid #E2E8F0; font-size: 15px; outline: none; transition: all 0.2s; box-sizing: border-box; background: #F8FAFC; }
        .field input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        
        .btn { width: 100%; padding: 16px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; color: #fff; transition: all 0.3s; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .btn-link { background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 700; padding: 0; }
        .btn-link:hover { text-decoration: underline; }

        .alert { padding: 14px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px; display: none; line-height: 1.5; }
        .alert.show { display: block; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .alert-err { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
        .alert-ok { background: #F0FDF4; color: #16A34A; border: 1px solid #DCFCE7; }
        
        .choice-btn { width: 100%; padding: 12px 16px; border-radius: 12px; border: 2px solid #E2E8F0; background: #fff; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between; color: #1E293B; }
        .choice-btn:hover { border-color: var(--primary); background: #F8FAFC; transform: translateX(5px); }
        .choice-icon { width: 36px; height: 36px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 18px; }

        @media(max-width: 900px) {
          .auth-left { display: none; }
          .auth-right { width: 100%; background: #0F172A; }
          .auth-card { background: #fff; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); margin: 20px; }
        }
      `}</style>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading EduVantage...</div>}>
      <LoginContent />
    </Suspense>
  );
}
