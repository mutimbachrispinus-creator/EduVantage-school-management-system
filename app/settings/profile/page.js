'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDB, mutateDB } from '@/lib/client-cache';
import { readSchoolProfile } from '@/lib/school-profile';
import { useProfile } from '@/app/PortalShell';
import { useSearchParams } from 'next/navigation';

import { getCurriculum } from '@/lib/curriculum';

const PRESET_COLORS = [
  { name: 'Maroon (Default)', p: '#8B1A1A', s: '#D4AF37' },
  { name: 'Navy Blue', p: '#1E3A8A', s: '#3B82F6' },
  { name: 'Forest Green', p: '#065F46', s: '#10B981' },
  { name: 'Deep Purple', p: '#581C87', s: '#8B5CF6' },
  { name: 'Sleek Black', p: '#0F172A', s: '#64748B' },
];

function SchoolProfileContent() {
  const router = useRouter();
  const { playSuccessSound } = useProfile();
  const [user, setUser] = useState(null);
  
  const [profile, setProfile] = useState(() => {
    if (typeof window === 'undefined') return { name: '', motto: '', phone: '', email: '', address: '', website: '', logo: '', bankAccounts: [], levels: { pre: true, primary: true, junior: true, senior: true } };
    const p = readSchoolProfile() || { name: '', motto: '', phone: '', email: '', address: '', website: '', logo: '', bankAccounts: [], levels: { pre: true, primary: true, junior: true, senior: true } };
    if (!p.levels) p.levels = { pre: true, primary: true, junior: true, senior: true };
    return p;
  });
  
  const [theme, setTheme] = useState(() => {
    const fallback = { primary: '#8B1A1A', secondary: '#D4AF37', accent: '#1E293B' };
    if (typeof window === 'undefined') return fallback;
    try {
      const rawUser = localStorage.getItem('paav_cache_user');
      let tid = 'platform-master';
      if (rawUser) {
        const { v: u } = JSON.parse(rawUser);
        tid = u?.tenant_id || u?.tenantId || 'platform-master';
      }
      const raw = localStorage.getItem(`paav_cache_${tid}_db_paav_theme`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v) return parsed.v;
      }
    } catch {}
    return fallback;
  });

  const [announcement, setAnnouncement] = useState('');
  const [heroImg, setHeroImg] = useState('');
  const [apiKeys, setApiKeys] = useState(() => ({ knecUsername: '', knecApiKey: '' }));
  
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(searchParams.get('tab') || 'branding'); // branding | info | payments

  useEffect(() => {
    async function load() {
      const u = await getCachedUser();
      if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
      setUser(u);
      
      const pRaw = await getCachedDB('paav_school_profile');
      const tRaw = await getCachedDB('paav_theme');
      const annRaw = await getCachedDB('paav_announcement');
      const hRaw = await getCachedDB('paav_hero_img');
      const kRaw = await getCachedDB('paav_integration_keys');
      
      if (pRaw) setProfile(prev => ({ ...prev, ...pRaw }));
      if (tRaw) setTheme(prev => ({ ...prev, ...tRaw }));
      if (annRaw) setAnnouncement(typeof annRaw === 'object' ? (annRaw?.text || '') : (annRaw || ''));
      if (hRaw) setHeroImg(hRaw);
      if (kRaw) setApiKeys(prev => ({ ...prev, ...kRaw }));
      
      setLoading(false);
    }
    load();
  }, [router]);

  async function save() {
    setBusy(true);
    try {
      await mutateDB('paav_school_profile', profile);
      await mutateDB('paav_theme', theme);
      await mutateDB('paav_announcement', { text: announcement, active: !!announcement, ts: Date.now() });
      await mutateDB('paav_hero_img', heroImg);
      await mutateDB('paav_integration_keys', apiKeys);

      playSuccessSound();
      alert('✅ Identity & Branding updated successfully! Changes will be visible immediately.');
    } catch (e) {
      alert('❌ Failed to save: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const addBank = () => setProfile({ ...profile, bankAccounts: [...(profile.bankAccounts || []), { bank: '', branch: '', accName: '', accNo: '' }] });
  const updateBank = (i, k, v) => {
    const list = [...profile.bankAccounts];
    list[i][k] = v;
    setProfile({ ...profile, bankAccounts: list });
  };
  const removeBank = (i) => setProfile({ ...profile, bankAccounts: profile.bankAccounts.filter((_, idx) => idx !== i) });

  const compressImage = (file, maxWidth, maxHeight, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height *= maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width *= maxHeight / height));
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 400, 400, 0.9);
      setProfile({ ...profile, logo: compressedBase64 });
    } catch (err) {
      alert("Failed to process logo image.");
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 600, 200, 0.9);
      setProfile({ ...profile, principalSignature: compressedBase64 });
    } catch (err) {
      alert("Failed to process signature image.");
    }
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 1200, 800, 0.7);
      setHeroImg(compressedBase64);
    } catch (err) {
      alert("Failed to process hero image.");
    }
  };

  if (loading || !user) return <div className="page on"><p>Loading...</p></div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎨 Identity & Branding</h2>
          <p>Customize your portal's look, feel, and official information</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
             {busy ? 'Saving...' : '💾 Save All Changes'}
           </button>
        </div>
      </div>

      <div className="tabs no-print" style={{ marginBottom: 20 }}>
        <button className={`tab-btn ${tab === 'branding' ? 'on' : ''}`} onClick={() => setTab('branding')}>✨ Visual Identity</button>
        <button className={`tab-btn ${tab === 'curriculum' ? 'on' : ''}`} onClick={() => setTab('curriculum')}>🎓 Education System</button>
        <button className={`tab-btn ${tab === 'integrations' ? 'on' : ''}`} onClick={() => setTab('integrations')}>🔌 Integrations</button>
        <button className={`tab-btn ${tab === 'info' ? 'on' : ''}`} onClick={() => setTab('info')}>📞 Info & Contacts</button>
        <button className={`tab-btn ${tab === 'payments' ? 'on' : ''}`} onClick={() => setTab('payments')}>💰 Payment Accounts</button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-body">
            
            {tab === 'branding' && (
              <div className="sg sg1">
                <div className="field">
                  <label>School Logo</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <div style={{ padding: '8px', color: 'var(--muted)', fontWeight: 600 }}>OR</div>
                    <input value={profile.logo} onChange={e => setProfile({...profile, logo: e.target.value})} placeholder="https://..." style={{ flex: 2 }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>High resolution PNG with transparent background is recommended.</p>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>School Name</label>
                    <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="e.g. Hilltop Academy" />
                  </div>
                  <div className="field">
                    <label>Tagline / Motto</label>
                    <input value={profile.motto} onChange={e => setProfile({...profile, motto: e.target.value})} placeholder="Excellence in Education" />
                  </div>
                </div>

                <div className="field">
                  <label>Hero Background Image (Login Page)</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="file" accept="image/png, image/jpeg" onChange={handleHeroUpload} style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <div style={{ padding: '8px', color: 'var(--muted)', fontWeight: 600 }}>OR</div>
                    <input value={heroImg} onChange={e => setHeroImg(e.target.value)} placeholder="https://example.com/school-photo.jpg" style={{ flex: 2 }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Upload a high-quality photo or paste a URL. Appears on the login screen.</p>
                </div>

                <div className="field">
                  <label>Public Announcement</label>
                  <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="Enter important school news to display on the login screen..." style={{ minHeight: 80 }} />
                </div>

                <div className="field" style={{ marginTop: 10 }}>
                  <label>Portal Theme Colors</label>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10 }}>
                     <div>
                       <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>Primary Color</div>
                       <input type="color" value={theme.primary} onChange={e => setTheme({...theme, primary: e.target.value})} style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                     </div>
                     <div>
                       <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>Secondary Color</div>
                       <input type="color" value={theme.secondary} onChange={e => setTheme({...theme, secondary: e.target.value})} style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                     </div>
                     <div>
                       <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>Accent/Nav Color</div>
                       <input type="color" value={theme.accent} onChange={e => setTheme({...theme, accent: e.target.value})} style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                     </div>
                  </div>
                </div>

                <div className="field">
                  <label>Color Presets</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    {PRESET_COLORS.map(p => (
                      <button key={p.name} className="btn btn-ghost btn-sm" onClick={() => setTheme({ primary: p.p, secondary: p.s, accent: '#1E293B' })} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.p }}></div>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'curriculum' && (
              <div className="sg sg1">
                <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                    <div style={{ fontSize: 24 }}>🎓</div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Select Education System</h3>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                    The portal dynamically adapts to the selected curriculum. This affects grade levels (e.g., "Grade 1" vs "Year 1"), subjects, and the grading engine.
                  </p>
                  
                  <div className="field">
                    <label>Active Curriculum</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 15, marginTop: 10 }}>
                      {[
                        { id: 'CBC', label: 'Kenya CBC', icon: '🇰🇪', desc: 'Competency-Based Education focusing on skills and application.' },
                        { id: 'BRITISH', label: 'British Curriculum', icon: '🇬🇧', desc: 'IGCSE and A-Level standards with a focus on core subjects.' },
                        { id: 'CAMBRIDGE', label: 'Cambridge Assessment', icon: '🎓', desc: 'Cambridge International examinations for world-class standards.' },
                        { id: 'IB', label: 'IB World', icon: '🌍', desc: 'International Baccalaureate program for global citizenship.' },
                        { id: 'MONTESSORI', label: 'Montessori', icon: '🌀', desc: 'Student-led, hands-on learning with multi-age classrooms.' },
                        { id: 'TVET', label: 'TVET / CBET', icon: '⚙️', desc: 'Technical & Vocational training focusing on hands-on industry skills.' }
                      ].map(c => {
                        const active = (profile.curriculum || 'CBC') === c.id;
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => setProfile({...profile, curriculum: c.id})}
                            style={{ 
                              padding: '20px', 
                              borderRadius: 16, 
                              border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`, 
                              background: active ? '#FFF1F1' : '#fff', 
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: active ? 'scale(1.02)' : 'scale(1)',
                              boxShadow: active ? '0 10px 20px -5px rgba(139, 26, 26, 0.15)' : 'none',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            className="curriculum-card"
                          >
                            {active && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 16 }}>✅</div>}
                            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: active ? 'var(--primary)' : 'var(--navy)', marginBottom: 6 }}>{c.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{c.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 20, padding: 15, background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 12, display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>
                      <strong>Important:</strong> Changing the curriculum is a major system change. It will update the structure of your student records and academic reporting. Please ensure you have backed up any necessary data before switching.
                    </div>
                  </div>

                  <div style={{ marginTop: 30 }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: 16 }}>🏫 Institutional Levels</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>Uncheck levels that your school DOES NOT offer to hide them from the system UI.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {(getCurriculum(profile.curriculum || 'CBC').CATEGORIES || []).map(cat => (
                        <LevelCheck 
                          key={cat.title} 
                          label={cat.title} 
                          on={profile.levels?.[cat.levelKey || cat.title.toLowerCase().replace(/ /g,'_')] !== false} 
                          toggle={() => {
                            const key = cat.levelKey || cat.title.toLowerCase().replace(/ /g,'_');
                            setProfile({
                              ...profile, 
                              levels: {
                                ...(profile.levels || {}),
                                [key]: profile.levels?.[key] === false ? true : false
                              }
                            });
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'integrations' && (
              <div className="sg sg1">
                {/* ── Safaricom Daraja M-Pesa ── */}
                <div style={{ background: '#F0FDF4', padding: 20, borderRadius: 16, border: '1.5px solid #86EFAC', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>🟢</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Safaricom Daraja (M-Pesa)</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#16A34A' }}>Required for STK Push fee payments and B2B disbursements</p>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Consumer Key</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.mpesaConsumerKey || ''} onChange={e => setApiKeys({...apiKeys, mpesaConsumerKey: e.target.value})} placeholder="Daraja Consumer Key" />
                    </div>
                    <div className="field">
                      <label>Consumer Secret</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.mpesaConsumerSecret || ''} onChange={e => setApiKeys({...apiKeys, mpesaConsumerSecret: e.target.value})} placeholder="Daraja Consumer Secret" />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Paybill / Shortcode</label>
                      <input value={apiKeys.mpesaShortcode || ''} onChange={e => setApiKeys({...apiKeys, mpesaShortcode: e.target.value})} placeholder="e.g. 174379" />
                    </div>
                    <div className="field">
                      <label>Lipa Na M-Pesa Passkey</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.mpesaPasskey || ''} onChange={e => setApiKeys({...apiKeys, mpesaPasskey: e.target.value})} placeholder="Online Passkey from Daraja" />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Initiator Name <span style={{ fontSize: 11, color: '#64748B' }}>(for B2B/B2C)</span></label>
                      <input value={apiKeys.mpesaInitiatorName || ''} onChange={e => setApiKeys({...apiKeys, mpesaInitiatorName: e.target.value})} placeholder="e.g. testapi" />
                    </div>
                    <div className="field">
                      <label>Security Credential <span style={{ fontSize: 11, color: '#64748B' }}>(RSA encrypted)</span></label>
                      <input type="password" autoComplete="new-password" value={apiKeys.mpesaSecurityCred || ''} onChange={e => setApiKeys({...apiKeys, mpesaSecurityCred: e.target.value})} placeholder="Base64 RSA password" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Environment</label>
                    <select value={apiKeys.mpesaEnv || 'sandbox'} onChange={e => setApiKeys({...apiKeys, mpesaEnv: e.target.value})} style={{ height: 42, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px', background: '#fff' }}>
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="production">Production (Live)</option>
                    </select>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    📌 Callback URL: <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>https://[yourdomain]/api/mpesa/callback</code>
                  </p>
                </div>

                {/* ── PesaPal ── */}
                <div style={{ background: '#FFF7ED', padding: 20, borderRadius: 16, border: '1.5px solid #FED7AA', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>💳</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>PesaPal</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#EA580C' }}>Card payments, Airtel Money, and global remittances</p>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Consumer Key</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.pesapalKey || ''} onChange={e => setApiKeys({...apiKeys, pesapalKey: e.target.value})} placeholder="PesaPal Consumer Key" />
                    </div>
                    <div className="field">
                      <label>Consumer Secret</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.pesapalSecret || ''} onChange={e => setApiKeys({...apiKeys, pesapalSecret: e.target.value})} placeholder="PesaPal Consumer Secret" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Environment</label>
                    <select value={apiKeys.pesapalEnv || 'sandbox'} onChange={e => setApiKeys({...apiKeys, pesapalEnv: e.target.value})} style={{ height: 42, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px', background: '#fff' }}>
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="live">Live (Production)</option>
                    </select>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    📌 IPN URL to register in PesaPal dashboard: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>https://[yourdomain]/api/pesapal</code>
                  </p>
                </div>

                {/* ── Africa's Talking SMS ── */}
                <div style={{ background: '#EFF6FF', padding: 20, borderRadius: 16, border: '1.5px solid #BFDBFE', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>📱</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Africa's Talking (SMS)</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#2563EB' }}>Attendance alerts, fee receipts, and bulk parent/staff SMS</p>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Username</label>
                      <input value={apiKeys.atUsername || ''} onChange={e => setApiKeys({...apiKeys, atUsername: e.target.value})} placeholder="sandbox or your AT username" />
                      <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Use <strong>sandbox</strong> for testing.</p>
                    </div>
                    <div className="field">
                      <label>API Key</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.atApiKey || ''} onChange={e => setApiKeys({...apiKeys, atApiKey: e.target.value})} placeholder="AT API Key" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Sender ID / Alphanumeric <span style={{ fontSize: 11, color: '#64748B' }}>(Optional — must be registered with AT)</span></label>
                    <input value={apiKeys.atSenderId || ''} onChange={e => setApiKeys({...apiKeys, atSenderId: e.target.value})} placeholder="e.g. EDUVANTAGE" />
                  </div>
                </div>

                {/* ── Resend Email ── */}
                <div style={{ background: '#FDF4FF', padding: 20, borderRadius: 16, border: '1.5px solid #E9D5FF', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>📧</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Resend (Email API)</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#9333EA' }}>HTML fee receipts, password resets, and official circulars</p>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Resend API Key</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.resendApiKey || ''} onChange={e => setApiKeys({...apiKeys, resendApiKey: e.target.value})} placeholder="re_xxxxxxxxxxxx" />
                    </div>
                    <div className="field">
                      <label>From Email Address</label>
                      <input value={apiKeys.resendFromEmail || ''} onChange={e => setApiKeys({...apiKeys, resendFromEmail: e.target.value})} placeholder="e.g. fees@school.ac.ke" />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    Domain must be verified in your Resend dashboard. Get your API key at <strong>resend.com</strong>.
                  </p>
                </div>

                {/* ── Biometric / ZKTeco ── */}
                <div style={{ background: '#F0F9FF', padding: 20, borderRadius: 16, border: '1.5px solid #BAE6FD', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>👆</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Biometric Device (ZKTeco / ADMS)</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#0284C7' }}>Fingerprint & facial recognition for attendance</p>
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #E0F2FE', fontSize: 13, lineHeight: 1.8 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#0F172A' }}>Device Configuration (No API Key Required)</p>
                    <p style={{ margin: 0, color: '#475569' }}>On your ZKTeco or compatible biometric device, navigate to <strong>Comm → Cloud Server Settings (ADMS)</strong> and enter:</p>
                    <div style={{ marginTop: 10, background: '#E0F2FE', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                      Server Address: <strong>https://[yourdomain]/api/attendance/sync</strong><br/>
                      Port: <strong>443</strong><br/>
                      Protocol: <strong>HTTPS</strong>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: '#64748B' }}>Each learner's Admission Number must be registered as their <strong>Biometric User ID</strong> on the device for the sync to match records correctly.</p>
                  </div>
                </div>

                {/* ── National Exam Bodies ── */}
                <div style={{ background: '#FFFBEB', padding: 20, borderRadius: 16, border: '1.5px solid #FDE68A', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>📜</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>National Exam Bodies (KNEC / CIE / CDACC)</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#B45309' }}>Candidate registration and sync to exam boards</p>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Center Code / Username</label>
                      <input value={apiKeys.knecUsername || ''} onChange={e => setApiKeys({...apiKeys, knecUsername: e.target.value})} placeholder="e.g. 12345678" />
                    </div>
                    <div className="field">
                      <label>Exams API Key / Password</label>
                      <input type="password" autoComplete="new-password" value={apiKeys.knecApiKey || ''} onChange={e => setApiKeys({...apiKeys, knecApiKey: e.target.value})} placeholder="••••••••••••" />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    ⚠️ Applies to your active curriculum (currently: <strong>{profile.curriculum || 'CBC'}</strong>). The sync target endpoint changes automatically based on your selected education system.
                  </p>
                </div>

                <div style={{ background: '#F1F5F9', padding: 14, borderRadius: 12, border: '1px dashed #CBD5E1', fontSize: 12, color: '#475569' }}>
                  🔐 All credentials are encrypted and stored in your school's isolated KV store. They are never exposed to other tenants or third-party clients.
                </div>
              </div>
            )}

            {tab === 'info' && (
              <div className="sg sg1">
                <div className="field-row">
                  <div className="field">
                    <label>Official Phone</label>
                    <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="07XXXXXXXX" />
                  </div>
                  <div className="field">
                    <label>Official Email</label>
                    <input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} placeholder="info@school.com" />
                  </div>
                </div>
                <div className="field">
                  <label>Physical Address</label>
                  <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="Street, City, Country" style={{ minHeight: 80 }} />
                </div>
                <div className="field">
                  <label>Principal's Digital Signature</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="file" accept="image/png" onChange={handleSignatureUpload} style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 8 }} />
                    {profile.principalSignature && (
                      <div style={{ height: 40, padding: '4px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
                        <img src={profile.principalSignature} alt="Sig Preview" style={{ height: '100%' }} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Used for automatic batch signing of report cards. PNG with transparency preferred.</p>
                </div>

                <div className="field">
                  <label>Website URL</label>
                  <input value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} placeholder="https://www.school.com" />
                </div>
              </div>
            )}

            {tab === 'payments' && (
              <div className="sg sg1">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>🏦 Bank Accounts</h3>
                  <button className="btn btn-ghost btn-sm" onClick={addBank}>+ Add Account</button>
                </div>
                
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
                  These bank details will be visible to parents in their dashboard. 
                  For M-Pesa Paybill/Till configuration, use the <a href="/fees" style={{ color: 'var(--primary)', fontWeight: 700 }}>Fees Dashboard</a>.
                </p>

                {(profile.bankAccounts || []).map((acc, i) => (
                  <div key={i} style={{ padding: 15, border: '1.5px solid var(--border)', borderRadius: 12, marginBottom: 15, background: '#FAFBFF', position: 'relative' }}>
                    <button onClick={() => removeBank(i)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    <div className="field-row">
                      <div className="field"><label>Bank Name</label><input value={acc.bank} onChange={e => updateBank(i, 'bank', e.target.value)} placeholder="e.g. Equity Bank" /></div>
                      <div className="field"><label>Branch</label><input value={acc.branch} onChange={e => updateBank(i, 'branch', e.target.value)} placeholder="e.g. Westlands" /></div>
                    </div>
                    <div className="field-row">
                      <div className="field"><label>Account Name</label><input value={acc.accName} onChange={e => updateBank(i, 'accName', e.target.value)} placeholder="e.g. Primary School" /></div>
                      <div className="field"><label>Account Number</label><input value={acc.accNo} onChange={e => updateBank(i, 'accNo', e.target.value)} placeholder="e.g. 1234567890" /></div>
                    </div>
                  </div>
                ))}
                {(!profile.bankAccounts || profile.bankAccounts.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 40, border: '2px dashed var(--border)', borderRadius: 12, color: 'var(--muted)' }}>No bank accounts added yet.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Pane */}
        {tab === 'branding' && (
          <div style={{ width: 400, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary, animation: 'pulse 2s infinite' }}></div>
                <h3 style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Preview</h3>
              </div>

              {/* Login Page Preview */}
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: 20, background: '#fff' }}>
                <div style={{ height: 140, background: heroImg ? `linear-gradient(135deg, rgba(5,15,28,0.8) 0%, rgba(13,31,60,0.85) 100%), url(${heroImg})` : theme.primary, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column', padding: 20, color: '#fff', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', zIndex: 1 }}>
                    <div style={{ width: 40, height: 40, background: '#fff', borderRadius: '50%', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {profile.logo ? <img src={profile.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" /> : <span style={{ color: theme.primary, fontSize: 10, fontWeight: 800 }}>LOGO</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{profile.name || 'School Name'}</div>
                      <div style={{ color: theme.secondary, fontSize: 10, fontWeight: 600 }}>{profile.motto || 'Motto here'}</div>
                    </div>
                  </div>
                  {announcement && (
                    <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 10, zIndex: 1 }}>
                      <span style={{ color: '#FCD34D', fontWeight: 700 }}>📢 NEWS:</span> {announcement.length > 60 ? announcement.substring(0, 60) + '...' : announcement}
                    </div>
                  )}
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Welcome Back</div>
                  <div style={{ height: 36, background: '#F1F5F9', borderRadius: 8 }}></div>
                  <div style={{ height: 36, background: '#F1F5F9', borderRadius: 8 }}></div>
                  <div style={{ height: 40, background: theme.primary, borderRadius: 8, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>🔐 Sign In</div>
                </div>
              </div>

              {/* Dashboard Sidebar Preview */}
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', background: '#fff', display: 'flex', height: 200 }}>
                <div style={{ width: 140, background: theme.accent, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px 12px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 24, height: 24, background: '#fff', borderRadius: '50%', padding: 2 }}>
                      {profile.logo ? <img src={profile.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" /> : null}
                    </div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name || 'Dashboard'}</div>
                  </div>
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}></div>
                    <div style={{ height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}></div>
                    <div style={{ height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}></div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 16, width: '60%', background: '#E2E8F0', borderRadius: 4 }}></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, height: 40, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}></div>
                    <div style={{ flex: 1, height: 40, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}></div>
                  </div>
                  <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}></div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .tab-btn {
          padding: 10px 20px;
          border: none;
          background: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 700;
          color: var(--muted);
          transition: all 0.2s;
        }
        .tab-btn.on {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
        .tab-btn:hover:not(.on) {
          background: #F8FAFC;
        }
        .curriculum-card:hover {
          border-color: var(--primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 12px 24px -10px rgba(139, 26, 26, 0.2);
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb, 37, 99, 235), 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(var(--primary-rgb, 37, 99, 235), 0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb, 37, 99, 235), 0); }
        }
      `}</style>
    </div>
  );
}

function LevelCheck({ label, on, toggle }) {
  return (
    <div onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: on ? '#EFF6FF' : '#F1F5F9', border: `1.5px solid ${on ? '#3B82F6' : '#E2E8F0'}`, borderRadius: 12, cursor: 'pointer', transition: '0.2s' }}>
      <div style={{ width: 18, height: 18, borderRadius: 4, background: on ? '#3B82F6' : '#fff', border: '2px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 900 }}>{on ? '✓' : ''}</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: on ? '#1E3A8A' : '#64748B' }}>{label}</span>
    </div>
  );
}

export default function SchoolProfilePage() {
  return (
    <Suspense fallback={<div className="page on"><p>Loading Identity & Branding...</p></div>}>
      <SchoolProfileContent />
    </Suspense>
  );
}
