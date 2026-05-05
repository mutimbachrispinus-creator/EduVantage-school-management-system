'use client';
export const runtime = 'edge';
/**
 * app/profile/page.js — Learner & Staff Profile Viewer
 *
 * Tabs: My Profile | Password | Staff Directory | Learner Lookup | Bulk Enroll
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_GRADES } from '@/lib/cbe';

const M = '#8B1A1A', ML = '#FDF2F2';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('me');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // DB Data
  const [allProfiles, setAllProfiles] = useState({});
  const [allStaff, setAllStaff] = useState([]);
  const [allLearners, setAllLearners] = useState([]);

  // Own profile
  const [profileData, setProfileData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null); // base64

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  // Staff & Learner Lookup
  const [staffQ, setStaffQ] = useState('');
  const [learnerQ, setLearnerQ] = useState('');
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Bulk Enroll
  const [bulkGrade, setBulkGrade] = useState(ALL_GRADES[0]);
  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);

  const photoRef = useRef(null);

  function createEmptyRow() {
    return { adm: '', name: '', gender: '', dob: '', parent: '', phone: '', address: '', medical: '', blood: '', father: '', mother: '', transport: '' };
  }

  const load = useCallback(async () => {
    try {
      const [authRes, dbRes] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [
            { type: 'get', key: 'paav6_staff' },
            { type: 'get', key: 'paav6_learners' },
            { type: 'get', key: 'paav_profiles' },
          ]})
        })
      ]);
      const auth = await authRes.json();
      if (!auth.ok) { router.push('/login'); return; }
      
      const allowed = ['admin', 'teacher', 'staff', 'parent', 'jss_teacher', 'senior_teacher', 'super-admin'];
      if (!allowed.includes(auth.user?.role)) { router.push('/'); return; }
      
      setUser(auth.user);

      const db = await dbRes.json();
      const staff = db.results[0]?.value || [];
      const learners = db.results[1]?.value || [];
      const profiles = db.results[2]?.value || {};

      setAllStaff(staff);
      setAllLearners(learners);
      setAllProfiles(profiles);

      const myStaff = staff.find(s => s.id === auth.user.id) || {};
      const myExtra = profiles[auth.user.id] || {};
      setProfileData({ ...myStaff, ...auth.user, ...myExtra });
      if (myStaff.avatar || myExtra.photo) setPhotoPreview(myStaff.avatar || myExtra.photo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else       { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(b64);
        setNewPhoto(b64);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);

    try {
      // 1. Prepare updated profiles using local state (Optimistic)
      const profiles = { ...allProfiles };
      const finalPhoto = newPhoto || photoPreview || '';
      profiles[user.id] = { ...profiles[user.id], ...profileData, photo: finalPhoto };

      // 2. Immediate feedback for "Saved" state
      setAllProfiles(profiles);
      
      const newStaffList = [...allStaff];
      const idx = newStaffList.findIndex(s => s.id === user.id);
      if (idx >= 0) {
        newStaffList[idx] = { ...newStaffList[idx], name: profileData.name, phone: profileData.phone, avatar: finalPhoto };
        setAllStaff(newStaffList);
      }

      // 3. Sync with minimal UX delay (so user sees "Saving..." even if network is instant)
      const start = Date.now();
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav_profiles', value: profiles },
          { type: 'updateStaffProfile', id: user.id, name: profileData.name, phone: profileData.phone, avatar: finalPhoto }
        ] })
      });
      
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'API request failed');
      if (out.results?.some(r => r.error)) throw new Error(out.results.find(r => r.error).error);
      
      // Ensure "Saving..." is visible for at least 600ms for psychological "work" confirmation
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

      setSaved(true); 
      setTimeout(() => setSaved(false), 5000);
    } catch (e) { 
      alert('Error saving profile: ' + e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'err', text: 'New passwords do not match' }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ type: 'err', text: 'Password must be at least 6 characters' }); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', current: pwForm.current, next: pwForm.next })
      });
      const data = await res.json();
      if (data.ok) {
        setPwMsg({ type: 'ok', text: '✅ Password changed successfully!' });
        setPwForm({ current: '', next: '', confirm: '' });
      } else setPwMsg({ type: 'err', text: data.error || 'Failed to change password' });
    } catch (e) { setPwMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function saveBulkLearners() {
    // Validate
    const validRows = bulkRows.filter(r => r.adm && r.name);
    if (!validRows.length) { alert('Please fill in at least Admission No and Name for one row'); return; }

    setBusy(true);
    try {
      const dbRes = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav6_learners' },
          { type: 'get', key: 'paav_profiles' }
        ]})
      });
      const db = await dbRes.json();
      const currentLearners = db.results[0]?.value || [];
      const currentProfiles = db.results[1]?.value || {};

      for (const r of validRows) {
        // Base learner data
        const lData = {
          adm: r.adm, name: r.name, grade: bulkGrade, stream: '',
          gender: r.gender, dob: r.dob, parent: r.parent, phone: r.phone
        };
        const idx = currentLearners.findIndex(l => l.adm === r.adm);
        if (idx >= 0) currentLearners[idx] = { ...currentLearners[idx], ...lData };
        else currentLearners.push(lData);

        // Extended profile data
        currentProfiles[r.adm] = {
          ...currentProfiles[r.adm],
          address: r.address, medical: r.medical, blood: r.blood,
          father: r.father, mother: r.mother, transport: r.transport
        };
      }

      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav6_learners', value: currentLearners },
          { type: 'set', key: 'paav_profiles', value: currentProfiles }
        ]})
      });
      alert(`✅ Successfully saved ${validRows.length} learners!`);
      setBulkRows([createEmptyRow()]);
      setAllLearners(currentLearners);
      setAllProfiles(currentProfiles);
    } catch(e) { alert('Failed: '+e.message); }
    finally { setBusy(false); }
  }

  const filteredStaff = allStaff.filter(s => !staffQ || s.name?.toLowerCase().includes(staffQ.toLowerCase()) || s.role?.toLowerCase().includes(staffQ.toLowerCase()));
  const filteredLearners = learnerQ.length >= 2 ? allLearners.filter(l => l.name?.toLowerCase().includes(learnerQ.toLowerCase()) || l.adm?.toLowerCase().includes(learnerQ.toLowerCase())) : [];

  if (loading || !user) return <div className="page on"><p style={{ padding: 30 }}>Loading profile…</p></div>;

  const TABS = [
    { key: 'me', label: '👤 My Profile' },
    { key: 'pw', label: '🔒 Password' },
    { key: 'staff', label: '👔 Staff Directory' },
    ...(user?.role === 'admin' || user?.role === 'teacher' ? [{ key: 'learner', label: '🎓 Learner Lookup' }] : []),
    ...(user?.role === 'admin' || user?.role === 'teacher' ? [{ key: 'bulk', label: '📥 Bulk Enroll' }] : []),
  ];

  return (
    <div className="page on">
      <div className="page-hdr no-print">
        <div>
          <h2>👤 Profile & Directory</h2>
          <p>Manage your profile, lookup users, and enroll learners</p>
        </div>
        {(tab === 'learner' && selectedLearner || tab === 'staff' && selectedStaff) && (
          <div className="page-hdr-acts">
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print Profile</button>
          </div>
        )}
      </div>

      <div className="profile-tabs no-print">
        {TABS.map(t => (
          <button key={t.key} className={`profile-tab-btn${tab === t.key ? ' on' : ''}`} onClick={() => { setTab(t.key); setSelectedLearner(null); setSelectedStaff(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── My Profile ── */}
      {tab === 'me' && profileData && (
        <form onSubmit={saveProfile}>
          <div className="sg sg2">
            {/* Avatar panel */}
            <div className="panel">
              <div className="panel-hdr"><h3>Profile Photo</h3></div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="photo-upload-wrapper" style={{ width: 100, height: 100 }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" style={{ width: 100, height: 100, borderRadius: 18, objectFit: 'cover', border: `3px solid ${M}` }} />
                  ) : (
                    <div style={{ width: 100, height: 100, borderRadius: 18, background: `linear-gradient(135deg, ${M}, #6B1212)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#fff', fontWeight: 800 }}>
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <button type="button" className="photo-upload-btn" onClick={() => photoRef.current?.click()} title="Upload photo">📷</button>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{profileData.name}</div>
                  <span className="badge bg-purple" style={{ marginTop: 4 }}>{profileData.role}</span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoRef.current?.click()}>📷 Change Photo</button>
                <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>Photo is saved to your device file system — no URL needed</p>
              </div>
            </div>

            {/* Info panel */}
            <div className="panel">
              <div className="panel-hdr"><h3>Personal & Contact Details</h3></div>
              <div className="panel-body">
                <div className="field-row">
                  <div className="field"><label>Full Name</label><input value={profileData.name || ''} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="field"><label>Email</label><input type="email" value={profileData.email || ''} onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Phone</label><input value={profileData.phone || ''} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="field"><label>ID Number</label><input value={profileData.id_num || ''} onChange={e => setProfileData(p => ({ ...p, id_num: e.target.value }))} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Gender</label>
                    <select value={profileData.gender || ''} onChange={e => setProfileData(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select...</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="field"><label>Tribe</label><input value={profileData.tribe || ''} onChange={e => setProfileData(p => ({ ...p, tribe: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Physical Address</label><input value={profileData.address || ''} onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="field-row">
                  <div className="field"><label>Blood Group</label><input value={profileData.blood || ''} onChange={e => setProfileData(p => ({ ...p, blood: e.target.value }))} /></div>
                  <div className="field"><label>Medical Conditions</label><input value={profileData.medical || ''} onChange={e => setProfileData(p => ({ ...p, medical: e.target.value }))} placeholder="e.g. Asthma, None" /></div>
                </div>
                
                <h4 style={{marginTop:16,marginBottom:8,color:M,fontSize:13}}>Emergency Contact / Next of Kin</h4>
                <div className="field-row">
                  <div className="field"><label>Name</label><input value={profileData.nok_name || ''} onChange={e => setProfileData(p => ({ ...p, nok_name: e.target.value }))} /></div>
                  <div className="field"><label>Phone</label><input value={profileData.nok_phone || ''} onChange={e => setProfileData(p => ({ ...p, nok_phone: e.target.value }))} /></div>
                </div>
                <div className="field"><label>ID Number</label><input value={profileData.nok_id || ''} onChange={e => setProfileData(p => ({ ...p, nok_id: e.target.value }))} /></div>

                <button type="submit" className="btn btn-maroon" style={{ width: '100%', marginTop: 8, justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} disabled={busy}>
                  {busy ? '⏳ Saving…' : saved ? '✅ Changes Saved!' : '💾 Save Profile'}
                </button>
                {saved && <div className="alert alert-ok show" style={{ marginTop: 12, animation: 'slideUp 0.3s ease-out' }}>✅ Success! Your profile details have been updated.</div>}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ── Change Password ── */}
      {tab === 'pw' && (
        <div className="panel no-print" style={{ maxWidth: 480 }}>
          <div className="panel-hdr"><h3>🔒 Change Password</h3></div>
          <div className="panel-body">
            <form onSubmit={changePassword}>
              <div className="field"><label>Current Password</label><input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required /></div>
              <div className="field"><label>New Password</label><input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} required minLength={6} /></div>
              <div className="field"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required /></div>
              {pwMsg.text && <div className={`alert ${pwMsg.type === 'ok' ? 'alert-ok' : 'alert-err'} show`}>{pwMsg.text}</div>}
              <button type="submit" className="btn btn-maroon" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Changing…' : '🔑 Change Password'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Staff Directory ── */}
      {tab === 'staff' && !selectedStaff && (
        <div className="panel no-print">
          <div className="panel-hdr">
            <h3>👔 Staff Directory</h3>
            <input className="field" style={{ margin: 0, width: 220 }} placeholder="Search by name or role…" value={staffQ} onChange={e => setStaffQ(e.target.value)} />
          </div>
          <div className="panel-body">
            <div className="sg sg3">
              {filteredStaff.map(s => (
                <div key={s.id} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedStaff(s)}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${M}, #6B1212)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
                      {s.avatar ? (
                        <img src={s.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        s.name?.charAt(0) || '?'
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                      <span className="badge bg-purple" style={{ marginTop: 3 }}>{s.role}</span>
                      {s.subject && <div style={{ fontSize: 11.5, color: '#666', marginTop: 3 }}>📚 {s.subject}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>No staff found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── View Staff Profile (Admin) ── */}
      {tab === 'staff' && selectedStaff && (() => {
        const pExtra = allProfiles[selectedStaff.id] || {};
        return (
          <div>
            <button className="btn btn-ghost btn-sm no-print" style={{ marginBottom: 14 }} onClick={() => setSelectedStaff(null)}>← Back to Directory</button>
            <div className="print-only" style={{ display:'none' }}>EduVantage - Staff Profile</div>
            <div className="sg sg2">
              <div className="panel" style={{ background: `linear-gradient(135deg, ${M}, #6B1212)`, color: '#fff' }}>
                <div className="panel-body" style={{ textAlign:'center' }}>
                  {pExtra.photo ? (
                    <img src={pExtra.photo} style={{ width:100, height:100, borderRadius:20, objectFit:'cover', border:'3px solid rgba(255,255,255,.3)', marginBottom:12 }} />
                  ) : <div style={{ fontSize: 50, marginBottom: 8 }}>👔</div>}
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 800 }}>{selectedStaff.name}</div>
                  <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>Role: {selectedStaff.role}</div>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, background:'rgba(0,0,0,.15)', padding:12, borderRadius:12 }}>
                    <div style={{ display: 'flex', justifyContent:'space-between', fontSize: 12 }}><span style={{opacity:.7}}>Phone</span><strong>{pExtra.phone || selectedStaff.phone || '—'}</strong></div>
                    <div style={{ display: 'flex', justifyContent:'space-between', fontSize: 12 }}><span style={{opacity:.7}}>Email</span><strong>{pExtra.email || '—'}</strong></div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-hdr"><h3>Extended Details</h3></div>
                <div className="panel-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 20px' }}>
                  <div className="profile-field"><div className="profile-label">ID Number</div><div style={{fontWeight:600}}>{pExtra.id_num || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Gender</div><div style={{fontWeight:600}}>{pExtra.gender || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Tribe</div><div style={{fontWeight:600}}>{pExtra.tribe || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Blood Group</div><div style={{fontWeight:600}}>{pExtra.blood || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Address</div><div style={{fontWeight:600}}>{pExtra.address || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Medical Conditions</div><div style={{fontWeight:600, color:'var(--red)'}}>{pExtra.medical || '—'}</div></div>
                  
                  <div style={{ gridColumn:'1/-1', borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4, fontSize:13, fontWeight:700, color:M }}>Emergency Contact / Next of Kin</div>
                  <div className="profile-field"><div className="profile-label">Name</div><div style={{fontWeight:600}}>{pExtra.nok_name || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Phone</div><div style={{fontWeight:600}}>{pExtra.nok_phone || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">ID No.</div><div style={{fontWeight:600}}>{pExtra.nok_id || '—'}</div></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Learner Lookup ── */}
      {tab === 'learner' && !selectedLearner && (
        <div className="panel no-print">
          <div className="panel-hdr"><h3>🎓 Learner Lookup</h3></div>
          <div className="panel-body">
            <div className="field" style={{ maxWidth: 340 }}>
              <label>Search by Name or Admission No.</label>
              <input placeholder="Type at least 2 characters…" value={learnerQ} onChange={e => setLearnerQ(e.target.value)} />
            </div>
            {filteredLearners.length > 0 && (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Adm</th><th>Name</th><th>Grade</th><th>Stream</th><th></th></tr></thead>
                  <tbody>
                    {filteredLearners.slice(0, 20).map(l => (
                      <tr key={l.adm}>
                        <td><span className="badge bg-gray">{l.adm}</span></td>
                        <td style={{ fontWeight: 600 }}>{l.name}</td>
                        <td>{l.grade}</td>
                        <td>{l.stream || '—'}</td>
                        <td><button className="btn btn-sm btn-maroon" onClick={() => setSelectedLearner(l)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View Learner Profile ── */}
      {tab === 'learner' && selectedLearner && (() => {
        const lExtra = allProfiles[selectedLearner.adm] || {};
        return (
          <div>
            <button className="btn btn-ghost btn-sm no-print" style={{ marginBottom: 14 }} onClick={() => setSelectedLearner(null)}>← Back to Results</button>
            <div className="print-only" style={{ display:'none' }}>EduVantage - Learner Profile</div>
            <div className="sg sg2">
              <div className="panel" style={{ background: `linear-gradient(135deg, ${M}, #6B1212)`, color: '#fff' }}>
                <div className="panel-body">
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800 }}>{selectedLearner.name}</div>
                  <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>Adm: {selectedLearner.adm}</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      ['Grade', selectedLearner.grade],
                      ['Stream', selectedLearner.stream || '—'],
                      ['DOB', selectedLearner.dob || '—'],
                      ['Parent/Guardian', selectedLearner.parent || '—'],
                      ['Contact', selectedLearner.phone || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                        <span style={{ opacity: .6, minWidth: 110 }}>{k}:</span><strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-hdr"><h3>Detailed Information</h3></div>
                <div className="panel-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 20px' }}>
                  <div className="profile-field"><div className="profile-label">Father's Name</div><div style={{fontWeight:600}}>{lExtra.father || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Mother's Name</div><div style={{fontWeight:600}}>{lExtra.mother || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Gender</div><div style={{fontWeight:600}}>{selectedLearner.gender || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Blood Group</div><div style={{fontWeight:600}}>{lExtra.blood || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Transport Means</div><div style={{fontWeight:600}}>{lExtra.transport || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Physical Address</div><div style={{fontWeight:600}}>{lExtra.address || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Medical Conditions</div><div style={{fontWeight:600, color:'var(--red)'}}>{lExtra.medical || '—'}</div></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Enroll Learners ── */}
      {tab === 'bulk' && (
        <div className="panel no-print">
          <div className="panel-hdr">
            <div>
              <h3 style={{color:M}}>📥 Bulk Enroll Detailed Learners</h3>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Quickly add multiple learners with extended profile data.</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <select value={bulkGrade} onChange={e=>setBulkGrade(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1.5px solid var(--border)'}}>
                {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
              </select>
              <button className="btn btn-gold btn-sm" onClick={() => setBulkRows([...bulkRows, createEmptyRow()])}>➕ Add Row</button>
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX:'auto' }}>
            <table style={{ minWidth: 1400 }}>
              <thead>
                <tr>
                  <th style={{width:100}}>Adm No*</th>
                  <th style={{width:160}}>Full Name*</th>
                  <th style={{width:80}}>Gender</th>
                  <th style={{width:110}}>DOB</th>
                  <th style={{width:130}}>Main Parent</th>
                  <th style={{width:110}}>Phone</th>
                  <th style={{width:130}}>Father</th>
                  <th style={{width:130}}>Mother</th>
                  <th style={{width:130}}>Address</th>
                  <th style={{width:100}}>Medical</th>
                  <th style={{width:80}}>Blood G.</th>
                  <th style={{width:100}}>Transport</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((r, i) => (
                  <tr key={i}>
                    <td><input value={r.adm} onChange={e=>{const nr=[...bulkRows];nr[i].adm=e.target.value;setBulkRows(nr);}} placeholder="e.g. 1001" style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.name} onChange={e=>{const nr=[...bulkRows];nr[i].name=e.target.value;setBulkRows(nr);}} placeholder="Full Name" style={{width:'100%',padding:4}} /></td>
                    <td><select value={r.gender} onChange={e=>{const nr=[...bulkRows];nr[i].gender=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}}><option value=""></option><option>Male</option><option>Female</option></select></td>
                    <td><input type="date" value={r.dob} onChange={e=>{const nr=[...bulkRows];nr[i].dob=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.parent} onChange={e=>{const nr=[...bulkRows];nr[i].parent=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.phone} onChange={e=>{const nr=[...bulkRows];nr[i].phone=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.father} onChange={e=>{const nr=[...bulkRows];nr[i].father=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.mother} onChange={e=>{const nr=[...bulkRows];nr[i].mother=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.address} onChange={e=>{const nr=[...bulkRows];nr[i].address=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.medical} onChange={e=>{const nr=[...bulkRows];nr[i].medical=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.blood} onChange={e=>{const nr=[...bulkRows];nr[i].blood=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}} /></td>
                    <td><select value={r.transport} onChange={e=>{const nr=[...bulkRows];nr[i].transport=e.target.value;setBulkRows(nr);}} style={{width:'100%',padding:4}}><option value=""></option><option>Walk</option><option>Bus</option><option>Private</option></select></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => {const nr=[...bulkRows];nr.splice(i,1);setBulkRows(nr);}} style={{padding:4}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:16, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-maroon" onClick={saveBulkLearners} disabled={busy}>
              {busy ? '⏳ Saving...' : `💾 Save ${bulkGrade} Learners`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
