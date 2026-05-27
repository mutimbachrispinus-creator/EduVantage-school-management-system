import { useState, useEffect, useRef } from 'react';
import { useProfile } from '@/app/PortalShell';
import { fetchWithRetry } from '@/lib/client-cache';

async function safeJson(response, fallback = {}) {
  if (!response) return fallback;
  const text = await response.text();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`Server response was not valid JSON (${response.status}): ${preview || 'empty response'}`);
  }
}

export default function ProfilePanel({ user, onClose }) {
  const { setUser } = useProfile();
  const fileRef = useRef(null);
  const [form, setForm]     = useState({ 
    phone: user?.phone || '', newPw: '', address: '', id_num: '', 
    gender: '', tribe: '', medical: '', blood: '', 
    nok_name: '', nok_phone: '', nok_id: '' 
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    async function loadExtra() {
      if (!user?.id) return;
      try {
        const res = await fetchWithRetry('/api/db', { 
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ requests: [{type:'get', key:'paav_profiles'}] }),
          timeout: 8000
        });
        const db = await safeJson(res);
        const pExtra = db.results?.[0]?.value?.[user.id] || {};
        setForm(f => ({ 
          ...f, 
          phone: user?.phone || '', 
          address: pExtra.address||'', 
          id_num: pExtra.id_num||'', 
          gender: pExtra.gender||'', 
          tribe: pExtra.tribe||'', 
          medical: pExtra.medical||'', 
          blood: pExtra.blood||'', 
          nok_name: pExtra.nok_name||'', 
          nok_phone: pExtra.nok_phone||'', 
          nok_id: pExtra.nok_id||'' 
        }));
      } catch(e) {
        console.error('[ProfilePanel] Failed to load extra info:', e);
      }
    }
    loadExtra();
  }, [user?.id, user?.phone]);

  const F = (k,v) => setForm(f => ({...f,[k]:v}));

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

  async function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    
    try {
      const dataUrl = await compressImage(file, 400, 400, 0.9);
      const res = await fetchWithRetry('/api/auth', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ action: 'edit_user', id: user.id, avatar: dataUrl }),
        timeout: 20000
      });
      const d = await safeJson(res);
      if (!d.ok) throw new Error(d.error || 'Failed to update photo');

      // Update in-memory user context + sessionStorage cache
      setUser(u => ({ ...u, avatar: dataUrl }));
      try { sessionStorage.setItem('paav_avatar_' + user.id, dataUrl); } catch {}
      setMsg('✅ Photo updated!');
    } catch(err) { 
      setMsg('❌ Photo failed: ' + err.message); 
    } finally { 
      setSaving(false); 
      setTimeout(()=>setMsg(''), 3000); 
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      // 1. Save auth level (phone/pw) via targeted action
      const res = await fetchWithRetry('/api/auth', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'edit_user', id: user.id, phone: form.phone, password: form.newPw || undefined })
      });
      const d = await safeJson(res);
      if (!d.ok) throw new Error(d.error || 'Failed to update credentials');

      // 2. Save extra profile details to paav_profiles
      const pRes = await fetchWithRetry('/api/db', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ requests: [{type:'get', key:'paav_profiles'}] })
      });
      const pdb = await safeJson(pRes);
      const profiles = pdb.results?.[0]?.value || {};
      profiles[user.id] = { 
        ...profiles[user.id], 
        phone: form.phone, 
        address: form.address, 
        id_num: form.id_num, 
        gender: form.gender, 
        tribe: form.tribe, 
        medical: form.medical, 
        blood: form.blood, 
        nok_name: form.nok_name, 
        nok_phone: form.nok_phone, 
        nok_id: form.nok_id 
      };
      await fetchWithRetry('/api/db', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ requests: [{type:'set', key:'paav_profiles', value: profiles}] })
      });

      setMsg('✅ Profile updated!');
      if (form.newPw) setForm(f => ({ ...f, newPw: '' })); // clear pw field
    } catch(e) { 
      setMsg('❌ ' + (e.message || String(e))); 
    }
    setSaving(false);
    setTimeout(()=>setMsg(''),3000);
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:10000, display:'flex', justifyContent:'flex-end' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoPick} />
      <div style={{ width: 360, background:'#fff', height:'100%', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.2)', display:'flex', flexDirection:'column' }}>
        <div style={{ background: (user.role === 'super-admin' && !user.tenantId.includes('gitombo')) ? 'linear-gradient(135deg,#4F46E5,#0F172A)' : 'linear-gradient(135deg,#8B1A1A,#6B1212)', padding:'28px 24px 20px', color:'#fff', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.2)', border:'none', borderRadius:'50%', width:30, height:30, color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
          <div onClick={() => fileRef.current?.click()} 
            style={{ width:80, height:80, borderRadius:'50%', background: user.color||'#2563EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 12px', overflow:'hidden', border:'3px solid rgba(255,255,255,.4)', cursor:'pointer' }}>
            {user.avatar ? <img src={user.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : (user.emoji||'👤')}
          </div>
          <p style={{textAlign:'center',fontSize:10,opacity:.6,marginTop:-8,marginBottom:12}}>Click to change photo</p>
          <h3 style={{textAlign:'center',margin:0,fontFamily:'Sora,sans-serif'}}>{user.name}</h3>
          <p style={{textAlign:'center',fontSize:13,opacity:.75,marginTop:4}}>{user.role}{user.grade ? ` · ${user.grade}` : ''}</p>
        </div>
        <div style={{padding:24,flex:1}}>
          {[
            { label:'Username', val: user.username, icon:'👤' },
            { label:'Role',     val: user.role,     icon:'🎭' },
            { label:'Grade',    val: user.grade||'—', icon:'📚' },
          ].map(row=>(
            <div key={row.label} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
              <span style={{fontSize:18,width:28}}>{row.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.8}}>{row.label}</div>
                <div style={{fontWeight:600,fontSize:14}}>{row.val}</div>
              </div>
            </div>
          ))}
          <div style={{marginTop:20}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--navy)',marginBottom:12}}>📝 Edit Personal Details</div>
            <div className="field">
              <label>Phone Number</label>
              <input value={form.phone} onChange={e=>F('phone',e.target.value)} type="tel" placeholder="07XXXXXXXX" />
            </div>
            <div className="field"><label>ID Number</label><input value={form.id_num} onChange={e=>F('id_num',e.target.value)} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="field"><label>Gender</label><select value={form.gender} onChange={e=>F('gender',e.target.value)}><option value=""></option><option>Male</option><option>Female</option></select></div>
              <div className="field"><label>Tribe</label><input value={form.tribe} onChange={e=>F('tribe',e.target.value)} /></div>
            </div>
            <div className="field"><label>Address</label><input value={form.address} onChange={e=>F('address',e.target.value)} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="field"><label>Blood Group</label><input value={form.blood} onChange={e=>F('blood',e.target.value)} /></div>
              <div className="field"><label>Medical</label><input value={form.medical} onChange={e=>F('medical',e.target.value)} placeholder="e.g. None" /></div>
            </div>
            
            <div style={{marginTop:16,marginBottom:8,fontSize:12,fontWeight:700,color:'var(--navy)'}}>Next of Kin</div>
            <div className="field"><label>Name</label><input value={form.nok_name} onChange={e=>F('nok_name',e.target.value)} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="field"><label>Phone</label><input value={form.nok_phone} onChange={e=>F('nok_phone',e.target.value)} /></div>
              <div className="field"><label>ID No.</label><input value={form.nok_id} onChange={e=>F('nok_id',e.target.value)} /></div>
            </div>

            <div style={{marginTop:16,marginBottom:8,fontSize:12,fontWeight:700,color:'var(--navy)'}}>Security</div>
            <div className="field" style={{position:'relative'}}>
              <label>New Password <span style={{fontWeight:400,color:'var(--muted)'}}>leave blank to keep</span></label>
              <input value={form.newPw} onChange={e=>F('newPw',e.target.value)} type={showPw?'text':'password'} placeholder="Min 6 characters" style={{paddingRight:40}} />
              <button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:10,top:28,background:'none',border:'none',cursor:'pointer',fontSize:16}}>
                {showPw?'🙈':'👁️'}
              </button>
            </div>
            {msg && <div className={`alert ${msg.startsWith('✅')?'alert-ok':'alert-err'} show`}>{msg}</div>}
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{width:'100%',marginTop:8}}>
              {saving ? 'Saving…' : '💾 Save All Details'}
            </button>

            {user.role === 'admin' && (
              <div style={{ marginTop: 20, padding: 15, background: '#F8FAFC', borderRadius: 12, border: '1.5px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>🛠️ Administrative Control</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { window.location.href = '/settings/profile'; onClose(); }} style={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }}>🏫 School Branding & Profile</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { window.location.href = '/teachers'; onClose(); }} style={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }}>👥 Staff & User Management</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { window.location.href = '/settings'; onClose(); }} style={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }}>⚙️ Portal Settings</button>
                </div>
              </div>
            )}

            <button className="btn btn-danger" onClick={() => {
              if (confirm('Are you sure you want to log out?')) {
                fetch('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }).then(() => {
                  if (setUser) setUser(null);
                  window.location.href = '/';
                });
              }
            }} style={{ width: '100%', marginTop: 20, fontWeight: 800 }}>🔓 Secure Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
