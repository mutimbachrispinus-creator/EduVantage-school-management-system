'use client';
export const runtime = 'edge';
/**
 * app/teachers/page.js — Teacher & Staff List
 *
 * Admin view: list all staff, add/edit/deactivate accounts,
 * assign grades and teaching areas, send credentials via SMS.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';

const ROLES       = ['teacher','jss_teacher','senior_teacher','staff','parent'];
const ADMIN_ROLES = ['admin','teacher','jss_teacher','senior_teacher','staff','parent'];
const MAX_ADMINS  = 4;
const COLORS = {
  admin:'#8B1A1A', 'super_admin':'#D97706', teacher:'#059669',
  'jss_teacher':'#2563EB', 'senior_teacher':'#EA580C', staff:'#0D9488', parent:'#7C3AED', member:'#64748B',
};

export default function TeachersPage() {
  const router = useRouter();
  const { playSuccessSound, profile: school } = useProfile();
  const curr = getCurriculum(school.curriculum);
  const { ALL_GRADES } = curr;
  const [user,  setUser]  = useState(null);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [sel,   setSel]   = useState(null);

  const load = useCallback(async () => {
    const auth = await getCachedUser();
    if (!auth) { router.push('/login'); return; }
    if (!['admin', 'super-admin'].includes(auth.role)) { router.push('/dashboard'); return; }
    setUser(auth);

    const db = await getCachedDBMulti(['paav6_staff']);
    setStaff(db.paav6_staff || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter(s => {
    const q = query.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.username?.toLowerCase().includes(q);
  });

  async function toggleStatus(id) {
    const updated = staff.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
    );
    setStaff(updated);
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_staff', value: updated }] }),
    });
  }

  async function sendCreds(id) {
    const res  = await fetch('/api/sms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'credentials', userId: id }),
    });
    const data = await res.json();
    alert(data.ok ? '✅ Credentials sent via SMS!' : `❌ ${data.error}`);
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading staff…</div>;

  return (
    <>
      <div className="page on">
        <div className="page-hdr">
          <div><h2>👔 Staff & Teachers</h2><p>Manage all portal accounts</p></div>
          <div className="page-hdr-acts">
            <button className="btn btn-primary btn-sm" onClick={() => { setSel(null); setModal('add'); }}>
              ➕ Add User
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <input placeholder="🔍 Search name or username…"
              value={query} onChange={e => setQuery(e.target.value)}
              style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8,
                fontSize: 12, width: 260, outline: 'none' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {filtered.length} account{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Username</th><th>Role</th><th>Grade</th>
                  <th>Phone</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ display:'flex', alignItems:'center', gap:10, fontWeight: 600 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: (COLORS[s.role]||'#64748B')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 16, overflow:'hidden', border:'1px solid var(--border)' }}>
                        {s.avatar ? <img src={s.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : (s.name?.charAt(0) || '?')}
                      </div>
                      {s.name}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.username}</td>
                    <td>
                      <span className="badge"
                        style={{ background: (COLORS[s.role]||'#64748B')+'22', color: COLORS[s.role]||'#64748B', fontWeight:700 }}>
                        {s.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{s.grade || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.phone || '—'}</td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'bg-green' : 'bg-red'}`}>
                        {s.status || 'active'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => { setSel(s); setModal('edit'); }}>✏</button>
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}
                        onClick={() => toggleStatus(s.id)}>
                        {s.status === 'active' ? '⛔' : '✅'}
                      </button>
                      {s.phone && (
                        <button className="btn btn-teal btn-sm" style={{ marginLeft: 4 }}
                          onClick={() => sendCreds(s.id)}>📱</button>
                      )}
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }}
                        onClick={async () => {
                          if(!confirm(`Permanently delete user ${s.name}?`)) return;
                          const res = await fetch('/api/auth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'delete_user', id: s.id })
                          });
                          const data = await res.json();
                          if (data.ok) {
                            invalidateDB(['paav6_staff']);
                            load();
                          } else {
                            alert(`❌ ${data.error}`);
                          }
                        }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign:'center', padding:24,
                    color:'var(--muted)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <UserModal
          user={sel}
          currentUser={user}
          allStaff={staff}
          onClose={() => { setModal(null); setSel(null); load(); }}
          curr={curr}
        />
      )}
    </>
  );
}

/* ─── Add / Edit User Modal ─────────────────────────────────────────────── */
function UserModal({ user, currentUser, allStaff, onClose, curr }) {
  const { playSuccessSound, profile } = useProfile();
  const { ALL_GRADES } = curr;
  const isEdit = !!user;

  const [form, setForm] = useState({
    name:     user?.name     || '',
    username: user?.username || '',
    role:     user?.role     || 'teacher',
    grade:    user?.grade    || '',
    phone:    user?.phone    || '',
    password: '',
    status:   user?.status   || 'active',
  });
  const [busy, setBusy]       = useState(false);
  const [err,  setErr]        = useState('');
  const [showPw, setShowPw]   = useState(false);

  // Auto-generate username and password for new users
  useEffect(() => {
    if (!isEdit && form.name.length > 3 && !form.username) {
      const prefix = ((profile?.name) || 'EDU').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
      const rand   = Math.floor(100 + Math.random() * 899);
      const first  = form.name.split(' ')[0] || 'USER';
      setForm(f => ({ 
        ...f, 
        username: `${prefix}-${first}-${rand}`.toLowerCase(),
        password: Math.floor(100000 + Math.random() * 899999).toString()
      }));
      setShowPw(true);
    }
  }, [form.name, isEdit, profile.name, form.username]);

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name || !form.username) { setErr('Name and username are required'); return; }
    if (!isEdit && !form.password)    { setErr('Password is required for new users'); return; }
    
    // Enforce 4 admin limit
    if (form.role === 'admin') {
      const adminCount = allStaff.filter(s => s.role === 'admin').length;
      if (adminCount >= MAX_ADMINS && !(isEdit && user.role === 'admin')) {
        setErr(`Limit reached: Maximum of ${MAX_ADMINS} admins allowed.`);
        return;
      }
    }

    setBusy(true);
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isEdit ? 'edit_user' : 'register',
        ...(isEdit ? { id: user.id } : {}),
        ...form,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) { setErr(data.error || 'Save failed'); return; }
    playSuccessSound();
    onClose();

  }

  return (
    <div className="modal-overlay open" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hdr">
          <h3>{isEdit ? `✏️ Edit — ${user.name}` : '➕ Add User'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="alert alert-err show" style={{ display:'flex' }}>{err}</div>}
          <div className="field-row">
            <div className="field"><label>Full Name</label>
              <input value={form.name} onChange={e => F('name', e.target.value.toUpperCase())} /></div>
            <div className="field">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                Username 
                {!isEdit && <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 800 }} onClick={() => {
                  const prefix = ((profile?.name) || 'EDU').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
                  const rand   = Math.floor(100 + Math.random() * 899);
                  const first  = form.name.split(' ')[0] || 'USER';
                  F('username', `${prefix}-${first}-${rand}`);
                }}>✨ Auto-Generate</span>}
              </label>
              <input value={form.username} onChange={e => F('username', e.target.value.toLowerCase())}
                placeholder="e.g. GIT-JOHN-123"
                disabled={isEdit} />
            </div>
          </div>
          
          <div className="field-row">
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={e => F('role', e.target.value)}>
                {(currentUser?.role === 'admin' ? ADMIN_ROLES : ROLES).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Class Grade</label>
              <select value={form.grade} onChange={e => F('grade', e.target.value)}>
                <option value="">None</option>
                {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
              </select></div>
          </div>
          <div className="field"><label>Phone</label>
            <input value={form.phone} onChange={e => F('phone', e.target.value)} type="tel"
              placeholder="07XXXXXXXX" /></div>

          {/* Password section */}
          <div className="field" style={{ position: 'relative' }}>
            <label style={{ display:'flex', alignItems:'center', justifyContent: 'space-between' }}>
              <span>{isEdit ? '🔑 Reset Password' : 'Password *'}</span>
              {!isEdit && <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 11 }} onClick={() => {
                const rand = Math.floor(100000 + Math.random() * 900000);
                F('password', rand.toString());
                setShowPw(true);
              }}>🎲 Rand</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={form.password}
                onChange={e => F('password', e.target.value)}
                type={showPw ? 'text' : 'password'}
                placeholder={isEdit ? 'Enter new password…' : 'Min 6 chars'}
                style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:12, top:'50%', transform: 'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, padding: 0 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isEdit && (
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e => F('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select></div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}
              style={{ width:'auto', opacity: busy ? 0.7:1 }}>
              {busy ? '⏳ Saving…' : '✅ Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
