'use client';
export const runtime = 'edge';
/**
 * app/learners/page.js — Learner list
 *
 * Features (matching pg-learners in index-122.html):
 *   • Search by name or admission number
 *   • Filter by grade
 *   • Add learner (modal)
 *   • Bulk add (modal)
 *   • Promote learners (admin)
 *   • Inline view of fee status, teacher, parent contact
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fmtK } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { usePersistedState } from '@/components/TabState';

import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

export default function LearnersPage() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const { profile: school } = useProfile();
  const curr = getCurriculum(school.curriculum);
  const { ALL_GRADES } = curr;
  const [learners, setLearners] = useState([]);
  const [feeCfg,   setFeeCfg]   = useState({});
  const [streams,  setStreams]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [gradeF,   setGradeF]   = usePersistedState('paav_learners_grade', '');
  const [modal,    setModal]    = useState(null); // 'add' | 'promote' | null

  const load = useCallback(async () => {
    try {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners', 'paav6_feecfg', 'paav7_streams'])
      ]);

      if (!u) { router.push('/login'); return; }
      if (!['admin','teacher','staff','jss_teacher','senior_teacher'].includes(u.role)) {
        router.push('/dashboard'); return;
      }
      setUser(u);

      setLearners(db.paav6_learners || []);
      setFeeCfg(  db.paav6_feecfg   || {});
      setStreams( db.paav7_streams  || []);
    } catch (e) {
      console.error('Learners load error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.changed?.includes('paav6_learners')) load();
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [load]);

  /* ── Filtered list ── */
  const filtered = learners.filter(l => {
    const q = query.toLowerCase();
    const nameMatch = l.name?.toLowerCase().includes(q);
    const admMatch  = l.adm?.includes(q);
    const gradeMatch = !gradeF || l.grade === gradeF;
    return (!q || nameMatch || admMatch) && gradeMatch;
  });

  /* ── Fee helpers ── */
  function getAnnualFee(grade) { return feeCfg[grade]?.annual || 5000; }
  function getBal(l) {
    return getAnnualFee(l.grade) + (l.arrears || 0) - (l.t1||0) - (l.t2||0) - (l.t3||0);
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading learners…</div>;

  return (
    <>
      <div className="page on" id="pg-learners">
        <div className="page-hdr">
          <div>
            <h2>🎓 Learners</h2>
            <p>All enrolled learners — {curr.name}</p>
          </div>
          <div className="page-hdr-acts">
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners/bulk')}>
              📋 Bulk Add
            </button>
            {user?.role === 'admin' && (
              <button className="btn btn-gold btn-sm" onClick={() => setModal('promote')}>
                🎓 Promote Learners
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
              ➕ Add Learner
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search name or adm no…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ padding: '8px 12px', border: '2px solid var(--border)',
                  borderRadius: 'var(--r2)', fontSize: 12, width: 230, outline: 'none' }}
              />
              <select
                value={gradeF}
                onChange={e => setGradeF(e.target.value)}
                style={{ padding: '8px 11px', border: '2px solid var(--border)',
                  borderRadius: 'var(--r2)', fontSize: 12, outline: 'none' }}>
                <option value="">All Active Grades</option>
                {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="ALUMNI">🎓 ALUMNI / GRADUATED</option>
              </select>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {filtered.length} learner{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px' }}>#</th>
                  <th style={{ padding: '6px 8px' }}>Adm</th>
                  <th style={{ padding: '6px 8px' }}>Name</th>
                  <th style={{ padding: '6px 8px' }}>Grade</th>
                  <th style={{ padding: '6px 8px' }}>Gender</th>
                  <th style={{ padding: '6px 8px' }}>Age</th>
                  <th style={{ padding: '6px 8px' }}>Class Teacher</th>
                  <th style={{ padding: '6px 8px' }}>Parent</th>
                  <th style={{ padding: '6px 8px' }}>Phone</th>
                  {user?.role === 'admin' && <th style={{ padding: '6px 8px' }}>Fee Status</th>}
                  <th style={{ padding: '6px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 11 : 10} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>
                      No learners found
                    </td>
                  </tr>
                ) : filtered.map((l, i) => {
                  const bal = getBal(l);
                  return (
                    <tr key={l.adm + i}>
                      <td style={{ padding: '6px 8px' }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px' }}><strong>{l.adm}</strong></td>
                      <td style={{ padding: '6px 8px' }}>
                        <button
                          className="btn-link"
                          onClick={() => router.push(`/learners/${l.adm}`)}>
                          {l.name}
                        </button>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className="badge bg-blue" style={{ fontSize: 10 }}>{l.grade}</span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{l.sex === 'F' ? 'Female' : (l.sex === 'M' ? 'Male' : l.sex)}</td>
                      <td style={{ padding: '6px 8px' }}>{l.age}</td>
                      <td style={{ fontSize: 11.5, padding: '6px 8px' }}>{l.teacher || '—'}</td>
                      <td style={{ fontSize: 11.5, padding: '6px 8px' }}>{l.parent  || '—'}</td>
                      <td style={{ fontSize: 11.5, padding: '6px 8px' }}>{l.phone   || '—'}</td>
                      {user?.role === 'admin' && (
                        <td style={{ padding: '6px 8px' }}>
                          {bal <= 0
                            ? <span className="badge bg-green">✅ Cleared</span>
                            : <span className="badge bg-amber">⚠ {fmtK(bal)}</span>
                          }
                        </td>
                      )}
                      <td style={{ whiteSpace: 'nowrap', padding: '6px 8px' }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => router.push(`/learners/${l.adm}`)}>
                          👁 View
                        </button>
                        {user?.role === 'admin' && (
                          <button className="btn btn-ghost btn-sm"
                            style={{ marginLeft: 4 }}
                            onClick={() => setModal({ type: 'edit', learner: l })}>
                            ✏️ Edit
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <button className="btn btn-gold btn-sm"
                              style={{ marginLeft: 4 }}
                              onClick={() => router.push(`/fees/${l.adm}/receipt`)}>
                              🧾
                            </button>
                            <button className="btn btn-danger btn-sm"
                              style={{ marginLeft: 4 }}
                              onClick={async () => {
                                if(!confirm(`Delete learner ${l.name}?`)) return;
                                await fetch('/api/db', {
                                  method:'POST', headers:{'Content-Type':'application/json'},
                                  body: JSON.stringify({ requests:[{ type:'deleteLearner', adm: l.adm }] })
                                });
                                load();
                              }}>
                              🗑️
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'add'     && <AddLearnerModal     curr={curr} isAdmin={user.role === 'admin'} streams={streams} onClose={() => { setModal(null); load(); }} />}
      {modal === 'promote' && <PromoteLearnersModal curr={curr} onClose={() => { setModal(null); load(); }} learners={learners} />}
      {modal?.type === 'edit' && <EditLearnerModal curr={curr} isAdmin={user.role === 'admin'} streams={streams} onClose={() => { setModal(null); load(); }} learner={modal.learner} />}
    </>
  );
}

/* ─── Add Learner Modal ─────────────────────────────────────────────────── */
function AddLearnerModal({ onClose, isAdmin, streams, curr }) {
  const { ALL_GRADES } = curr;
  const [form, setForm] = useState({
    name: '', grade: ALL_GRADES[0] || '', dob: '', adm: '', sex: 'F', age: '',
    stream: '', parent: '', phone: '', parentEmail: '', addr: '', arrears: 0,
    bloodGroup: '', allergies: '', medicalCondition: '', emergencyContact: '',
  });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.name || !form.grade) { setErr('Name and grade are required'); return; }
    setBusy(true);
    // Load current learners, add new one, save
    const res  = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'get', key: 'paav6_learners' }] }),
    });
    const db   = await res.json();
    const list = db.results[0]?.value || [];

    const adm = form.adm.trim() || String(Date.now()).slice(-6);
    if (list.find(l => l.adm === adm)) { setErr(`Adm no. ${adm} already exists`); setBusy(false); return; }

    list.push({
      adm, name: form.name.toUpperCase(), grade: form.grade,
      sex: form.sex, age: Number(form.age) || '',
      dob: form.dob, stream: form.stream,
      teacher: '', parent: form.parent, phone: form.phone,
      parentEmail: form.parentEmail, addr: form.addr,
      t1: 0, t2: 0, t3: 0, arrears: Number(form.arrears) || 0,
      bloodGroup: form.bloodGroup, allergies: form.allergies,
      medicalCondition: form.medicalCondition, emergencyContact: form.emergencyContact,
    });

    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_learners', value: list }] }),
    });
    setBusy(false);
    onClose();
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function calculateAge(dobString) {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  }

  return (
    <ModalOverlay title="➕ Add Learner" onClose={onClose}>
      {err && <div className="alert alert-err show">{err}</div>}
      <div className="field-row">
        <div className="field"><label>Full Name</label>
          <input value={form.name} onChange={e => F('name', e.target.value)} /></div>
        <div className="field"><label>Grade</label>
          <select value={form.grade} onChange={e => F('grade', e.target.value)}>
            <option value="">Select</option>
            {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
          </select></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Date of Birth</label>
          <input type="date" value={form.dob} onChange={e => {
            const dob = e.target.value;
            setForm(f => ({ ...f, dob, age: calculateAge(dob) }));
          }} /></div>
        <div className="field"><label>Adm No (auto if blank)</label>
          <input value={form.adm} onChange={e => F('adm', e.target.value)} placeholder="e.g. 2026001" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Gender</label>
          <select value={form.sex} onChange={e => F('sex', e.target.value)}>
            <option value="F">Female</option><option value="M">Male</option>
          </select></div>
        <div className="field"><label>Age</label>
          <input type="number" value={form.age} onChange={e => F('age', e.target.value)} min="3" max="20" /></div>
        <div className="field">
          <label>Stream</label>
          <select value={form.stream} onChange={e => F('stream', e.target.value)}>
            <option value="">Select Stream</option>
            {streams.filter(s => s.grade === form.grade).map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Parent / Guardian</label>
          <input value={form.parent} onChange={e => F('parent', e.target.value)} /></div>
        <div className="field"><label>Phone</label>
          <input value={form.phone} onChange={e => F('phone', e.target.value)} type="tel" placeholder="07XXXXXXXX" /></div>
      </div>
      <div className="field"><label>Parent Email (for receipts/reports)</label>
        <input value={form.parentEmail} onChange={e => F('parentEmail', e.target.value)} type="email" placeholder="parent@example.com" /></div>
      <div className="field"><label>Address</label>
        <input value={form.addr} onChange={e => F('addr', e.target.value)} /></div>

      <div style={{ padding: '10px 0', borderTop: '1.5px solid var(--border)', marginTop: 10 }}>
        <h4 style={{ fontSize: 12, color: 'var(--navy)', marginBottom: 8 }}>🏥 Medical Records (Confidential)</h4>
        <div className="field-row">
          <div className="field"><label>Blood Group</label>
            <select value={form.bloodGroup} onChange={e => F('bloodGroup', e.target.value)}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="field"><label>Emergency Contact No.</label>
            <input value={form.emergencyContact} onChange={e => F('emergencyContact', e.target.value)} placeholder="e.g. 0711 222 333" />
          </div>
        </div>
        <div className="field"><label>Allergies</label>
          <input value={form.allergies} onChange={e => F('allergies', e.target.value)} placeholder="e.g. Peanuts, Penicillin" />
        </div>
        <div className="field"><label>Medical Conditions / Notes</label>
          <textarea value={form.medicalCondition} onChange={e => F('medicalCondition', e.target.value)} 
            placeholder="e.g. Asthmatic, Diabetic, or none"
            style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 13, minHeight: 60 }} />
        </div>
      </div>
      {isAdmin && (
        <div className="field"><label>Accumulated Fee (Previous Balance)</label>
          <input type="number" value={form.arrears} onChange={e => F('arrears', e.target.value)} placeholder="0.00" /></div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}
          style={{ width: 'auto', opacity: busy ? 0.7 : 1 }}>
          {busy ? '⏳ Saving…' : '✅ Add Learner'}
        </button>
      </div>
    </ModalOverlay>
  );
}


/* ─── Promote Learners Modal ────────────────────────────────────────────── */
function PromoteLearnersModal({ onClose, learners, curr }) {
  const { ALL_GRADES } = curr;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState('grade'); // 'grade' | 'individual'
  const [fromGrade, setFromGrade] = useState('');
  const [toGrade, setToGrade] = useState('');
  const [selAdms, setSelAdms] = useState([]);

  async function promote() {
    if (!toGrade) { alert('Please select a target grade'); return; }
    
    let targets = [];
    if (mode === 'grade') {
      if (!fromGrade) { alert('Please select a source grade'); return; }
      targets = learners.filter(l => l.grade === fromGrade);
    } else {
      if (selAdms.length === 0) { alert('Please select at least one learner'); return; }
      targets = learners.filter(l => selAdms.includes(l.adm));
    }

    if (!confirm(`Promote ${targets.length} learners to ${toGrade}? This resets their fee balances.`)) return;
    
    setBusy(true);
    const updatedList = learners.map(l => {
      const isTarget = mode === 'grade' ? (l.grade === fromGrade) : selAdms.includes(l.adm);
      if (isTarget) {
        return { ...l, grade: toGrade, t1: 0, t2: 0, t3: 0 };
      }
      return l;
    });

    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_learners', value: updatedList }] }),
    });
    setBusy(false);
    setDone(true);
  }

  const toggleAdm = adm => {
    setSelAdms(prev => prev.includes(adm) ? prev.filter(a => a !== adm) : [...prev, adm]);
  };

  return (
    <ModalOverlay title="🎓 Promote Learners" onClose={onClose}>
      {done ? (
        <div className="alert alert-ok show" style={{ textAlign: 'center', padding: '30px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <h3>Promotion Successful!</h3>
          <p>Learners have been moved and their fees reset.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="auth-sw-row" style={{ marginBottom: 0 }}>
            <button className={`auth-sw ${mode === 'grade' ? 'on' : ''}`} onClick={() => setMode('grade')}>By Grade</button>
            <button className={`auth-sw ${mode === 'individual' ? 'on' : ''}`} onClick={() => setMode('individual')}>By Learner</button>
          </div>

          <div className="field-row">
            {mode === 'grade' ? (
              <div className="field">
                <label>From Grade</label>
                <select value={fromGrade} onChange={e => setFromGrade(e.target.value)}>
                  <option value="">Select Source</option>
                  {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            ) : (
              <div className="field">
                <label>Select Learners ({selAdms.length})</label>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '2px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  {learners.sort((a,b)=>a.name.localeCompare(b.name)).map(l => (
                    <label key={l.adm} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                      <input type="checkbox" checked={selAdms.includes(l.adm)} onChange={() => toggleAdm(l.adm)} style={{ width: 'auto' }} />
                      {l.name} ({l.grade})
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="field" style={{ alignSelf: 'flex-start' }}>
              <label>Promote To</label>
              <select value={toGrade} onChange={e => setToGrade(e.target.value)}>
                <option value="">Select Target</option>
                {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
                <option value="GRADUATED">GRADUATED / ALUMNI</option>
              </select>
            </div>
          </div>

          <div className="note-box" style={{ background: '#FFF7ED', borderLeft: '3px solid #EA580C' }}>
            <strong>Important:</strong> Promotion moves learners to the new grade and <strong>resets all term payments (T1, T2, T3) to zero</strong> for the new academic year.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold btn-sm" onClick={promote} disabled={busy}
              style={{ width: 'auto', opacity: busy ? 0.7 : 1 }}>
              {busy ? '⏳ Processing…' : '🎓 Complete Promotion'}
            </button>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
}


/* ─── Edit Learner Modal ───────────────────────────────────────────────── */
function EditLearnerModal({ onClose, learner, isAdmin, streams, curr }) {
  const { ALL_GRADES } = curr;
  const [form, setForm] = useState({ ...learner });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  function calculateAge(dobString) {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  }

  async function save() {
    if (!form.name || !form.grade || !form.adm) { setErr('Name, Grade and Adm No are required'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            type: 'updateLearner',
            oldAdm: learner.adm,
            details: {
              ...form,
              name: form.name.toUpperCase(),
              age: Number(form.age) || ''
            }
          }]
        })
      });
      const data = await res.json();
      if (data.results?.[0]?.error) {
        setErr(data.results[0].error);
      } else {
        onClose();
      }
    } catch (e) {
      setErr('Failed to save changes');
    } finally {
      setBusy(false);
    }
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalOverlay title={`✏️ Edit Learner: ${learner.name}`} onClose={onClose}>
      {err && <div className="alert alert-err show">{err}</div>}
      <div className="field-row">
        <div className="field"><label>Full Name</label>
          <input value={form.name} onChange={e => F('name', e.target.value)} /></div>
        <div className="field"><label>Grade</label>
          <select value={form.grade} onChange={e => F('grade', e.target.value)}>
            <option value="">Select</option>
            {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
          </select></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Date of Birth</label>
          <input type="date" value={form.dob || ''} onChange={e => {
            const dob = e.target.value;
            setForm(f => ({ ...f, dob, age: calculateAge(dob) }));
          }} /></div>
        <div className="field"><label>Adm No</label>
          <input value={form.adm} onChange={e => F('adm', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Gender</label>
          <select value={form.sex} onChange={e => F('sex', e.target.value)}>
            <option value="F">Female</option><option value="M">Male</option>
          </select></div>
        <div className="field"><label>Age</label>
          <input type="number" value={form.age} onChange={e => F('age', e.target.value)} min="3" max="25" /></div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Stream</label>
          <select value={form.stream} onChange={e => F('stream', e.target.value)}>
            <option value="">Select Stream</option>
            {streams.filter(s => s.grade === form.grade).map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="field"><label>Class Teacher</label>
          <input value={form.teacher || ''} onChange={e => F('teacher', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Parent / Guardian</label>
          <input value={form.parent} onChange={e => F('parent', e.target.value)} /></div>
        <div className="field"><label>Phone</label>
          <input value={form.phone} onChange={e => F('phone', e.target.value)} type="tel" placeholder="07XXXXXXXX" /></div>
      </div>
      <div className="field"><label>Parent Email</label>
        <input value={form.parentEmail || ''} onChange={e => F('parentEmail', e.target.value)} type="email" /></div>
      <div className="field"><label>Address</label>
        <input value={form.addr || ''} onChange={e => F('addr', e.target.value)} /></div>

      <div style={{ padding: '10px 0', borderTop: '1.5px solid var(--border)', marginTop: 10 }}>
        <h4 style={{ fontSize: 12, color: 'var(--navy)', marginBottom: 8 }}>🏥 Medical Records (Confidential)</h4>
        <div className="field-row">
          <div className="field"><label>Blood Group</label>
            <select value={form.bloodGroup || ''} onChange={e => F('bloodGroup', e.target.value)}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="field"><label>Emergency Contact No.</label>
            <input value={form.emergencyContact || ''} onChange={e => F('emergencyContact', e.target.value)} placeholder="e.g. 0711 222 333" />
          </div>
        </div>
        <div className="field"><label>Allergies</label>
          <input value={form.allergies || ''} onChange={e => F('allergies', e.target.value)} placeholder="e.g. Peanuts, Penicillin" />
        </div>
        <div className="field"><label>Medical Conditions / Notes</label>
          <textarea value={form.medicalCondition || ''} onChange={e => F('medicalCondition', e.target.value)} 
            placeholder="e.g. Asthmatic, Diabetic, or none"
            style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 13, minHeight: 60 }} />
        </div>
      </div>
      {isAdmin && (
        <div className="field"><label>Accumulated Fee (Previous Balance)</label>
          <input type="number" value={form.arrears || 0} onChange={e => F('arrears', e.target.value)} /></div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}
          style={{ width: 'auto', opacity: busy ? 0.7 : 1 }}>
          {busy ? '⏳ Saving…' : '✅ Save Changes'}
        </button>
      </div>
    </ModalOverlay>
  );
}


/* ─── Shared modal wrapper ──────────────────────────────────────────────── */
function ModalOverlay({ title, onClose, children }) {
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hdr">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
