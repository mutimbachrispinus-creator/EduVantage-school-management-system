'use client';
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
import { fmtK, isSeniorLevel, getSeniorPathways, getDefaultSubjects } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { usePersistedState } from '@/components/TabState';
import ViewLearnerModal from '@/components/ViewLearnerModal';

import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

export default function LearnersPage() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const { profile: school } = useProfile();
  const curr = getCurriculum(school.curriculum, school.levels);
  const { ALL_GRADES, LABELS } = curr;
  const [learners, setLearners] = useState([]);
  const [feeCfg,   setFeeCfg]   = useState({});
  const [streams,  setStreams]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [gradeF,   setGradeF]   = usePersistedState('paav_learners_grade', '');
  const [modal,    setModal]    = useState(null); // 'add' | 'promote' | null
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [u, db] = await Promise.all([
        getCachedUser(), // 5s timeout
        getCachedDBMulti(['paav6_feecfg', 'paav7_streams'])
      ]);

      if (!u) { router.push('/login'); return; }
      if (!['admin','teacher','staff','jss_teacher','senior_teacher'].includes(u.role)) {
        router.push('/dashboard'); return;
      }
      setUser(u);

      setFeeCfg(  db.paav6_feecfg   || {});
      setStreams( db.paav7_streams  || []);
    } catch (e) {
      console.error('Learners load error:', e);
      setError('Connection timed out. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFetchingPage, setIsFetchingPage] = useState(false);

  const fetchLearners = useCallback(async (p = 1) => {
    setIsFetchingPage(true);
    try {
      const qs = new URLSearchParams({ page: p, limit: 50, search: query, grade: gradeF });
      const res = await fetch(`/api/learners?${qs.toString()}`);
      const data = await res.json();
      if (data.data) {
        setLearners(data.data);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotalRecords(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingPage(false);
    }
  }, [query, gradeF]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) fetchLearners(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, gradeF, user, fetchLearners]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.changed?.includes('paav6_learners')) load();
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [load]);

  const [selAdms, setSelAdms] = useState([]);

  // With server-side pagination, 'filtered' is just 'learners'
  const filtered = learners;

  const toggleSelect = adm => {
    setSelAdms(prev => prev.includes(adm) ? prev.filter(a => a !== adm) : [...prev, adm]);
  };
  const toggleAll = () => {
    if (selAdms.length === filtered.length) setSelAdms([]);
    else setSelAdms(filtered.map(l => l.adm));
  };

  /* ── Fee helpers ── */
  function getAnnualFee(grade) { return feeCfg[grade]?.annual || 5000; }
  function getBal(l) {
    return getAnnualFee(l.grade) + (l.arrears || 0) - (l.t1||0) - (l.t2||0) - (l.t3||0);
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading learners…</div>;
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  return (
    <>
      <div className="page on" id="pg-learners">
        <div className="page-hdr">
          <div>
            <h2>🎓 {LABELS.grades}</h2>
            <p>All enrolled learners — {curr.name}</p>
          </div>
          <div className="page-hdr-acts">
            {selAdms.length > 0 && user?.role === 'admin' && (
              <button className="btn btn-teal btn-sm" onClick={() => setModal('reassign')}>
                🌊 Reassign Stream ({selAdms.length})
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners/bulk')}>
              📋 Bulk Add
            </button>
            {user?.role === 'admin' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners/recycle-bin')}>
                  🗑️ Recycle Bin
                </button>
                <button className="btn btn-gold btn-sm" onClick={() => setModal('promote')}>
                  🎓 Promote {LABELS.grades}
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
              ➕ Add {LABELS.grade}
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
                <option value="">All {LABELS.grades}</option>
                {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="ALUMNI">🎓 ALUMNI / GRADUATED</option>
              </select>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isFetchingPage && <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--navy)' }} />}
              {totalRecords} learner{totalRecords !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px' }}>
                    <input type="checkbox" checked={selAdms.length > 0 && selAdms.length === filtered.length} onChange={toggleAll} />
                  </th>
                  <th style={{ padding: '6px 8px' }}>Adm</th>
                  <th style={{ padding: '6px 8px' }}>Name</th>
                  <th style={{ padding: '6px 8px' }}>{LABELS.grade}</th>
                  <th style={{ padding: '6px 8px' }}>Stream</th>
                  <th style={{ padding: '6px 8px' }}>Gender</th>
                  <th style={{ padding: '6px 8px' }}>Age</th>
                  <th style={{ padding: '6px 8px' }}>Parent</th>
                  <th style={{ padding: '6px 8px' }}>Phone</th>
                  {user?.role === 'admin' && <th style={{ padding: '6px 8px' }}>Fee Status</th>}
                  <th style={{ padding: '6px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 12 : 11} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>
                      No learners found
                    </td>
                  </tr>
                ) : filtered.map((l, i) => {
                  const bal = getBal(l);
                  const isSelected = selAdms.includes(l.adm);
                  return (
                    <tr key={l.adm + i} className={isSelected ? 'selected-row' : ''} style={{ background: isSelected ? 'var(--blue-light)' : '' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(l.adm)} />
                      </td>
                      <td style={{ padding: '6px 8px' }}><strong>{l.adm}</strong></td>
                      <td style={{ padding: '6px 8px' }}>
                        <button
                          className="btn-link"
                          onClick={() => router.push(`/learners/${encodeURIComponent(l.adm)}`)}>
                          {l.name}
                        </button>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className="badge bg-blue" style={{ fontSize: 10 }}>{l.grade}</span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className="badge bg-gray" style={{ fontSize: 10, background: '#F1F5F9', border: '1px solid #E2E8F0' }}>{l.stream || 'No Stream'}</span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{l.sex === 'F' ? 'Female' : (l.sex === 'M' ? 'Male' : l.sex)}</td>
                      <td style={{ padding: '6px 8px' }}>{l.age}</td>
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
                          onClick={() => setModal({ type: 'view_learner', learner: l })}>
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
                          <button className="btn btn-danger btn-sm"
                            style={{ marginLeft: 4 }}
                            onClick={async () => {
                              if(!confirm(`Delete learner ${l.name}?`)) return;
                              await fetch('/api/db', {
                                method:'POST', headers:{'Content-Type':'application/json'},
                                body: JSON.stringify({ requests:[{ type:'deleteLearner', adm: l.adm }] })
                              });
                              const { invalidateDB } = await import('@/lib/client-cache');
                              invalidateDB('paav6_learners');
                              window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
                              load();
                            }}>
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 20px', gap: 15, borderTop: '1.5px solid var(--border)' }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1 || isFetchingPage} onClick={() => fetchLearners(page - 1)}>
                ◀ Previous
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages || isFetchingPage} onClick={() => fetchLearners(page + 1)}>
                Next ▶
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'add'     && <AddLearnerModal     curr={curr} isAdmin={user.role === 'admin'} streams={streams} onClose={() => { setModal(null); load(); }} />}
      {modal === 'promote' && <PromoteLearnersModal curr={curr} onClose={() => { setModal(null); load(); }} learners={learners} />}
      {modal === 'reassign' && <ReassignStreamModal streams={streams} adms={selAdms} learners={learners} onClose={() => { setModal(null); setSelAdms([]); load(); }} />}
      {modal === 'upgrade' && <UpgradeModal onClose={() => setModal(null)} school={school} currentCount={learners.length} />}
      {modal?.type === 'edit' && <EditLearnerModal curr={curr} isAdmin={user.role === 'admin'} streams={streams} onClose={() => { setModal(null); load(); }} learner={modal.learner} />}
      {modal?.type === 'view_learner' && <ViewLearnerModal learner={modal.learner} onClose={() => setModal(null)} />}
    </>
  );
}

/* ─── Upgrade Modal ────────────────────────────────────────────────────── */
function UpgradeModal({ onClose, school, currentCount }) {
  return (
    <ModalOverlay title="🚀 Request Capacity Upgrade" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 50, marginBottom: 15 }}>📈</div>
        <h3 style={{ color: 'var(--navy)', marginBottom: 10 }}>Reached Your Limit!</h3>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Your institution is currently managing <strong>{currentCount}</strong> students, which is your current paid limit. 
          To add more students, you'll need to upgrade your capacity tier.
        </p>
        
        <div className="note-box" style={{ background: '#F0F9FF', borderLeft: '3px solid #0369A1', textAlign: 'left', marginBottom: 25 }}>
          <strong>Next Steps:</strong>
          <ol style={{ paddingLeft: 20, marginTop: 8, fontSize: 13 }}>
            <li>Contact our support team via WhatsApp or Email.</li>
            <li>Specify the new student capacity you require.</li>
            <li>Once confirmed, your limit will be updated instantly.</li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="https://wa.me/254792656579" target="_blank" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', background: '#25D366', border: 'none' }}>
            💬 WhatsApp Support
          </a>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Maybe Later</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Add Learner Modal ─────────────────────────────────────────────────── */
function AddLearnerModal({ onClose, isAdmin, streams, curr }) {
  const { ALL_GRADES } = curr;
  const [form, setForm] = useState({
    name: '', grade: ALL_GRADES[0] || '', dob: '', adm: '', sex: 'F', age: '',
    stream: '', parent: '', phone: '', parentEmail: '', addr: '', arrears: 0,
    bloodGroup: '', allergies: '', medicalCondition: '', emergencyContact: '', biometric_id: '',
    nemis_upi: '', index_number: '', pathway: '', elective_subjects: '[]'
  });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.name || !form.grade) { setErr('Name and grade are required'); return; }
    setBusy(true);

    // Curriculum-aware ADM: encodes the expected year of level completion.
    // CBC: Grade 1-6 → completes Primary (Grade 6), Grade 7-9 → completes JSS (Grade 9),
    //      Grade 10-12 → completes Senior School (Grade 12).
    // Other curricula fall back to current year.
    function getCompletionYear(grade) {
      const y = new Date().getFullYear();
      const n = parseInt((grade.match(/\d+/) || [])[0], 10);
      if (!isNaN(n)) {
        if (/GRADE/i.test(grade)) {
          if (n >= 1  && n <= 6)  return y + (6  - n); // Primary exit: Grade 6
          if (n >= 7  && n <= 9)  return y + (9  - n); // JSS exit: Grade 9
          if (n >= 10 && n <= 12) return y + (12 - n); // Senior exit: Grade 12
        }
        if (/YEAR/i.test(grade))  return y + Math.max(0, 13 - n); // British KS
        if (/FORM/i.test(grade))  return y + Math.max(0, 4  - n); // 8-4-4 legacy
      }
      if (/PP1|PP2|KINDERGARTEN/i.test(grade)) return y + 1;
      return y;
    }

    let adm = form.adm.trim();
    if (!adm) {
      const completionYear = getCompletionYear(form.grade);
      const seq = String(Math.floor(Math.random() * 9000) + 1000);
      adm = `${completionYear}/${seq}`;
    }
    const newLearner = {
      adm, name: form.name.toUpperCase(), grade: form.grade,
      sex: form.sex, age: Number(form.age) || '',
      dob: form.dob, stream: form.stream,
      teacher: '', parent: form.parent, phone: form.phone,
      parentEmail: form.parentEmail, addr: form.addr,
      t1: 0, t2: 0, t3: 0, arrears: Number(form.arrears) || 0,
      bloodGroup: form.bloodGroup, allergies: form.allergies,
      medicalCondition: form.medicalCondition, emergencyContact: form.emergencyContact,
      biometric_id: form.biometric_id || '',
      nemis_upi: form.nemis_upi || '', index_number: form.index_number || '',
      pathway: form.pathway || null, elective_subjects: form.elective_subjects || '[]'
    };

    const saveRes = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'bulkAddLearners', learners: [newLearner] }] }),
    });
    const saveData = await saveRes.json();
    if (saveData.results?.[0]?.error) {
      setErr(saveData.results[0].error);
      setBusy(false);
      return;
    }

    // Trigger platform-wide sync
    const { invalidateDB } = await import('@/lib/client-cache');
    invalidateDB('paav6_learners');
    window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));

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
          <input 
            autoComplete="new-student-name" 
            name="new-student-name"
            id="new-student-name"
            value={form.name} 
            onChange={e => F('name', e.target.value)} 
            placeholder="First Middle Last"
          /></div>
        <div className="field"><label>Grade</label>
          <select value={form.grade} onChange={e => F('grade', e.target.value)}>
            <option value="">Select</option>
            {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
          </select></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Date of Birth</label>
          <input autoComplete="off" type="date" value={form.dob} onChange={e => {
            const dob = e.target.value;
            setForm(f => ({ ...f, dob, age: calculateAge(dob) }));
          }} /></div>
        <div className="field"><label>Adm No (auto if blank)</label>
          <input autoComplete="new-password" value={form.adm} onChange={e => F('adm', e.target.value)} placeholder="Auto: e.g. 2031/4823 (completion year/seq)" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Gender</label>
          <select value={form.sex} onChange={e => F('sex', e.target.value)}>
            <option value="F">Female</option><option value="M">Male</option>
          </select></div>
        <div className="field"><label>Age</label>
          <input autoComplete="off" type="number" value={form.age} onChange={e => F('age', e.target.value)} min="3" max="20" /></div>
        <div className="field"><label>Stream</label>
          <select value={form.stream} onChange={e => F('stream', e.target.value)}>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Parent / Guardian</label>
          <input 
            autoComplete="new-parent-name" 
            name="new-parent-name"
            id="new-parent-name"
            value={form.parent} 
            onChange={e => F('parent', e.target.value)} 
          /></div>
        <div className="field"><label>Phone</label>
          <input 
            autoComplete="new-parent-phone" 
            name="new-parent-phone"
            id="new-parent-phone"
            value={form.phone} 
            onChange={e => F('phone', e.target.value)} 
            type="tel" 
            placeholder="07XXXXXXXX" 
          /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Parent Email (for receipts/reports)</label>
          <input autoComplete="off" value={form.parentEmail} onChange={e => F('parentEmail', e.target.value)} type="email" placeholder="parent@example.com" /></div>
        <div className="field"><label>Biometric/Card ID</label>
          <input autoComplete="off" value={form.biometric_id} onChange={e => F('biometric_id', e.target.value)} placeholder="Scanner ID" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>NEMIS UPI / Learner ID</label>
          <input autoComplete="off" value={form.nemis_upi} onChange={e => F('nemis_upi', e.target.value)} placeholder="e.g. XXX-1234" /></div>
        <div className="field"><label>National Exam Index Number</label>
          <input autoComplete="off" value={form.index_number} onChange={e => F('index_number', e.target.value)} placeholder="e.g. 10000100" /></div>
      </div>
      {isSeniorLevel(form.grade, curr?.name || 'CBC') && (
        <div className="field-row">
          <div className="field"><label>Pathway / Track</label>
            <select value={form.pathway || ''} onChange={e => F('pathway', e.target.value)}>
              <option value="">Select Pathway</option>
              {getSeniorPathways(curr?.name || 'CBC').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field"><label>Elective Subjects</label>
            <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
              {getDefaultSubjects(form.grade, curr?.name || 'CBC').map(s => {
                let current = [];
                try { current = JSON.parse(form.elective_subjects) || []; } catch(e){}
                if (!Array.isArray(current)) current = [];
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, padding: '3px 0' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={current.includes(s)} onChange={e => {
                      const updated = e.target.checked ? [...current, s] : current.filter(x => x !== s);
                      F('elective_subjects', JSON.stringify(updated));
                    }} /> {s}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <div className="field"><label>Address</label>
        <input autoComplete="off" value={form.addr} onChange={e => F('addr', e.target.value)} /></div>

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
    try {
      // Fix: Only send the list of ADMs and target grade — not the entire learner array
      // This avoids sending hundreds of KB and triggering a full-table upsert
      const adms = targets.map(l => l.adm);
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'bulkPromote', adms, toGrade }] }),
      });
      const data = await res.json();
      if (data.results?.[0]?.error) throw new Error(data.results[0].error);
      
      const { invalidateDB } = await import('@/lib/client-cache');
      invalidateDB('paav6_learners');
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
      setBusy(false);
      setDone(true);
    } catch (e) {
      alert('Promotion failed: ' + e.message);
      setBusy(false);
    }
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
  const [form, setForm] = useState({ ...learner, pathway: learner.pathway || '', elective_subjects: learner.elective_subjects || '[]' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(learner.avatar || null);
  const [avatarFile, setAvatarFile]       = useState(null); // new base64 photo

  // Compress uploaded image to portrait ID-card dimensions (200×260 JPEG)
  function compressIDPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const TW = 200, TH = 260;
          const srcR = img.width / img.height, tgtR = TW / TH;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (srcR > tgtR) { sw = img.height * tgtR; sx = (img.width - sw) / 2; }
          else { sh = img.width / tgtR; sy = (img.height - sh) / 2; }
          canvas.width = TW; canvas.height = TH;
          canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressIDPhoto(file);
      setAvatarPreview(compressed);
      setAvatarFile(compressed);
    } catch { alert('Could not process image. Try a different file.'); }
  }

  async function removePhoto() {
    if (!confirm('Remove this learner\'s profile photo?')) return;
    try {
      await fetch(`/api/learners/${encodeURIComponent(learner.adm)}/avatar`, { method: 'DELETE' });
      setAvatarPreview(null); setAvatarFile(null);
    } catch { /* swallow */ }
  }

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
      // Save avatar first if a new one was selected
      if (avatarFile) {
        await fetch(`/api/learners/${encodeURIComponent(learner.adm)}/avatar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: avatarFile })
        });
      }

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
              age: Number(form.age) || '',
              avatar: avatarFile || form.avatar || null
            }
          }]
        })
      });
      const data = await res.json();
      if (data.results?.[0]?.error) {
        setErr(data.results[0].error);
      } else {
        const { invalidateDB } = await import('@/lib/client-cache');
        invalidateDB('paav6_learners');
        window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
        onClose();
      }
    } catch (e) {
      console.error('EditLearner save error:', e);
      setErr(e.message || 'Failed to save changes');
    } finally {
      setBusy(false);
    }
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModalOverlay title={`✏️ Edit Learner: ${learner.name}`} onClose={onClose}>
      {err && <div className="alert alert-err show">{err}</div>}

      {/* ── Profile Photo Upload ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0 16px', borderBottom: '1.5px solid var(--border)', marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 80, height: 104, border: '2px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 36 }}>👤</span>}
          </div>
          {avatarPreview && (
            <button onClick={removePhoto} title="Remove photo" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✕</button>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>📷 Profile Photo (for ID Cards)</div>
          <label htmlFor={`photo-${learner.adm}`} style={{ display: 'inline-block', padding: '7px 14px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📁 Choose Photo</label>
          <input id={`photo-${learner.adm}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5 }}>JPEG/PNG · Auto-cropped to portrait · Max 500KB</div>
          {avatarFile && <div style={{ fontSize: 10, color: '#059669', marginTop: 3, fontWeight: 700 }}>✅ New photo ready — will save when you click "Save Changes"</div>}
        </div>
      </div>

      <div className="field-row">
        <div className="field"><label>Full Name</label>
          <input autoComplete="off" value={form.name} onChange={e => F('name', e.target.value)} /></div>
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
      <div className="field-row">
        <div className="field"><label>Parent Email</label>
          <input value={form.parentEmail || ''} onChange={e => F('parentEmail', e.target.value)} type="email" /></div>
        <div className="field"><label>Biometric/Card ID</label>
          <input value={form.biometric_id || ''} onChange={e => F('biometric_id', e.target.value)} placeholder="Scanner ID" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>NEMIS UPI / Learner ID</label>
          <input value={form.nemis_upi || ''} onChange={e => F('nemis_upi', e.target.value)} placeholder="e.g. XXX-1234" /></div>
        <div className="field"><label>National Exam Index Number</label>
          <input value={form.index_number || ''} onChange={e => F('index_number', e.target.value)} placeholder="e.g. 10000100" /></div>
      </div>
      {isSeniorLevel(form.grade, curr?.name || 'CBC') && (
        <div className="field-row">
          <div className="field"><label>Pathway / Track</label>
            <select value={form.pathway || ''} onChange={e => F('pathway', e.target.value)}>
              <option value="">Select Pathway</option>
              {getSeniorPathways(curr?.name || 'CBC').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field"><label>Elective Subjects</label>
            <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
              {getDefaultSubjects(form.grade, curr?.name || 'CBC').map(s => {
                let current = [];
                try { current = JSON.parse(form.elective_subjects) || []; } catch(e){}
                if (!Array.isArray(current)) current = [];
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, padding: '3px 0' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={current.includes(s)} onChange={e => {
                      const updated = e.target.checked ? [...current, s] : current.filter(x => x !== s);
                      F('elective_subjects', JSON.stringify(updated));
                    }} /> {s}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
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


/* ─── Reassign Stream Modal ────────────────────────────────────────────── */
function ReassignStreamModal({ onClose, streams, adms, learners }) {
  const [busy, setBusy] = useState(false);
  const [targetStream, setTargetStream] = useState('');
  
  const selectedLearners = learners.filter(l => adms.includes(l.adm));
  // Ensure all selected learners are from the same grade (recommended)
  const grades = Array.from(new Set(selectedLearners.map(l => l.grade)));
  const availableStreams = streams.filter(s => grades.includes(s.grade));

  async function reassign() {
    if (!targetStream) { alert('Please select a target stream'); return; }
    if (!confirm(`Move ${adms.length} learners to stream "${targetStream}"?`)) return;
    
    setBusy(true);
    try {
      // Use individual updateLearner calls so SQL is the source of truth.
      // A direct KV 'set' would bypass SQL and can create stale/duplicate entries.
      const requests = selectedLearners.map(l => ({
        type: 'updateLearner',
        oldAdm: l.adm,
        details: { ...l, stream: targetStream }
      }));

      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      const data = await res.json();
      const anyError = data.results?.find(r => r?.error);
      if (anyError) throw new Error(anyError.error);

      const { invalidateDB } = await import('@/lib/client-cache');
      invalidateDB('paav6_learners');
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
      
      onClose();
    } catch (e) {
      alert('Failed to reassign stream: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalOverlay title="🌊 Bulk Reassign Stream" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          You are moving <strong>{adms.length}</strong> learners from 
          {grades.length === 1 ? ` Grade ${grades[0]}` : ` multiple grades`}.
        </p>

        <div className="field">
          <label>Target Stream</label>
          <select value={targetStream} onChange={e => setTargetStream(e.target.value)}>
            <option value="">Select Stream</option>
            {availableStreams.map(s => (
              <option key={s.name + s.grade} value={s.name}>{s.name} ({s.grade})</option>
            ))}
          </select>
        </div>

        <div className="note-box" style={{ background: '#F0FDF4', borderLeft: '3px solid #16A34A', fontSize: 12 }}>
          <strong>Tip:</strong> Moving learners between streams does not affect their marks or fee balances.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={reassign} disabled={busy || !targetStream}>
            {busy ? '⏳ Moving...' : `🌊 Move ${adms.length} Learners`}
          </button>
        </div>
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
