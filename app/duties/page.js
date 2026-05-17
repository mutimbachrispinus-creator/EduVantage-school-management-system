'use client';
/**
 * app/duties/page.js — Staff Duties & Presence
 * Fixed: Seek Permission & Report Issue inline form
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';


const M = '#8B1A1A';

export default function DutiesPage() {
  const router = useRouter();
  const { playSuccessSound } = useProfile();
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [presence, setPresence] = useState([]);
  const [duties, setDuties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reqForm, setReqForm] = useState({ type: 'permission', text: '', date_needed: '', reason: '' });
  const [reqSent, setReqSent] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [activeTab, setActiveTab] = useState('duties');
  const [staff, setStaff] = useState([]);
  const [dutyForm, setDutyForm] = useState({ staffId: '', task: '', date: '' });

  const today = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u) { router.push('/'); return; }
      setUser(u);
      const data = await getCachedDBMulti(
        ['paav_presence', 'paav_duties', 'paav_staff_reqs', 'paav6_staff'],
        15000 // 15 s TTL
      );
      setPresence(data['paav_presence'] || []);
      setDuties(data['paav_duties'] || []);
      setRequests(data['paav_staff_reqs'] || []);
      setStaff(data['paav6_staff'] || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const todayRecord = presence.find(p => p.id === user?.id && p.date === today);

  async function logPresence(type) {
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const record = todayRecord ? { ...todayRecord } : { id: user.id, name: user.name, date: today, login: '', logout: '', hours: '' };
      record[type] = timeStr;
      
      if (type === 'logout' && record.login) {
        // Calculate duration
        const [h1, m1] = record.login.split(':').map(Number);
        const [h2, m2] = timeStr.split(':').map(Number);
        const start = new Date(); start.setHours(h1, m1, 0);
        const end = new Date(); end.setHours(h2, m2, 0);
        let diff = (end - start) / 1000 / 60 / 60; // hours
        if (diff < 0) diff += 24; // overnight shift
        record.hours = diff.toFixed(1);
      }
      
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requests: [
            { type: 'logPresence', userId: user.id, date: today, record },
            { type: 'logActivity', activity: { 
                action: type === 'login' ? 'Clocked In' : 'Clocked Out',
                details: `${type === 'login' ? 'Started work' : 'Finished work'} at ${timeStr}`
              }
            }
          ] 
        })
      });
      playSuccessSound();
      invalidateDB('paav_presence');

      setPresence(prev => {
        const next = [...prev];
        const idx = next.findIndex(p => p.id === user.id && p.date === today);
        if (idx !== -1) next[idx] = record;
        else next.push(record);
        return next;
      });
    } catch (e) { alert('❌ ' + e.message); } finally { setBusy(false); }
  }

  function openReqForm(type) {
    setReqForm({ type, text: '', date_needed: '', reason: '' });
    setShowReqForm(true);
    setReqSent(false);
  }

  async function submitRequest(e) {
    e.preventDefault();
    if (!reqForm.text.trim()) { alert('Please describe your request'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            type: 'submitStaffRequest',
            request: {
              type: reqForm.type,
              text: reqForm.text,
              reason: reqForm.reason,
              date_needed: reqForm.date_needed,
            }
          }]
        })
      });
      const data = await res.json();
      const result = data.results[0];
      if (result.error) throw new Error(result.error);

      const newReq = result.request;
      invalidateDB('paav_staff_reqs');
      setRequests(prev => [...prev, newReq]);
      setReqSent(true);
      setShowReqForm(false);
      setReqForm({ type: 'permission', text: '', date_needed: '', reason: '' });
      setTimeout(() => setReqSent(false), 5000);
    } catch (e) { alert('❌ ' + e.message); } finally { setBusy(false); }
  }

  async function updateReqStatus(id, status) {
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ type: 'updateStaffRequestStatus', id, status }]
        })
      });
      const data = await res.json();
      const result = data.results[0];
      if (result.error) throw new Error(result.error);

      invalidateDB('paav_staff_reqs');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) { alert('❌ ' + e.message); }
  }

  if (loading || !user) return (
    <div className="page on">
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ color: 'var(--muted)' }}>Loading duties…</div>
      </div>
    </div>
  );

  async function addDuty(e) {
    e.preventDefault();
    if (!dutyForm.staffId || !dutyForm.task) { alert('Staff and Task are required'); return; }
    setBusy(true);
    try {
      const selectedStaff = staff.find(s => s.id === dutyForm.staffId);
      const newDuty = {
        id: 'duty_' + Date.now(),
        staffId: dutyForm.staffId,
        staffName: selectedStaff?.name || 'Unknown',
        task: dutyForm.task,
        date: dutyForm.date || today,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertDuty', duty: newDuty }] })
      });
      playSuccessSound();
      invalidateDB('paav_duties');

      setDuties(prev => [newDuty, ...prev]);
      setDutyForm({ staffId: '', task: '', date: '' });
    } catch (e) { alert('❌ ' + e.message); } finally { setBusy(false); }
  }

  async function toggleDutyStatus(id) {
    setBusy(true);
    try {
      const d = duties.find(item => item.id === id);
      if (!d) return;

      const isCompleted = d.status === 'completed';
      const updatedDuty = {
        ...d,
        status: isCompleted ? 'pending' : 'completed',
        completedAt: isCompleted ? null : new Date().toISOString()
      };

      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertDuty', duty: updatedDuty }] })
      });
      
      invalidateDB('paav_duties');
      setDuties(prev => prev.map(item => item.id === id ? updatedDuty : item));
    } catch (e) { alert('❌ ' + e.message); } finally { setBusy(false); }
  }

  async function deleteDuty(id) {
    if (!confirm('Delete this duty assignment?')) return;
    setBusy(true);
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'deleteDuty', id }] })
      });
      invalidateDB('paav_duties');
      setDuties(prev => prev.filter(d => d.id !== id));
    } catch (e) { alert('❌ ' + e.message); } finally { setBusy(false); }
  }

  const myDuties = duties.filter(d => d.staffId === user.id).sort((a,b) => b.createdAt?.localeCompare(a.createdAt || '') || 0);
  const myPresence = presence.filter(p => p.id === user.id).slice(-7).reverse();
  const myRequests = requests.filter(r => r.userId === user.id).slice(-10).reverse();
  const allRequests = requests.slice().reverse(); // admin sees all
  const isAdmin = user.role === 'admin';

  const TABS = [
    { id: 'duties',    label: '📋 My Duties' },
    { id: 'presence',  label: '📍 Attendance' },
    { id: 'requests',  label: `✋ Requests${myRequests.some(r => r.status === 'pending') ? ' 🔴' : ''}` },
    ...(isAdmin ? [
      { id: 'manage_duties', label: '🛠 Assign Duties' },
      { id: 'admin_reqs', label: `🛡 All Requests${allRequests.some(r => r.status === 'pending') ? ' 🔴' : ''}` }
    ] : []),
  ];

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎖️ Duties &amp; Presence</h2>
          <p>Manage your daily attendance and duty assignments</p>
        </div>
        <div className="page-hdr-acts">
          {!todayRecord?.login && (
            <button className="btn btn-success" onClick={() => logPresence('login')} disabled={busy}>
              📍 Mark Present
            </button>
          )}
          {todayRecord?.login && !todayRecord?.logout && (
            <button className="btn btn-danger" onClick={() => logPresence('logout')} disabled={busy}>
              🚪 Log Out
            </button>
          )}
        </div>
      </div>

      {/* ── Today banner ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: todayRecord?.login ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#8B1A1A,#6B1212)',
          color: '#fff', borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: 1 }}>Today — {today}</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {todayRecord?.login ? `✅ Present — In: ${todayRecord.login}` : '⚪ Not yet marked'}
          </div>
          {todayRecord?.logout && <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>Out: {todayRecord.logout}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-gold" style={{ height: '100%', minHeight: 60, fontSize: 13, fontWeight: 700, padding: '0 20px' }}
            onClick={() => openReqForm('permission')}>
            ✋ Seek Permission
          </button>
          <button className="btn btn-purple" style={{ height: '100%', minHeight: 60, fontSize: 13, fontWeight: 700, padding: '0 20px' }}
            onClick={() => openReqForm('report')}>
            🚩 Report Issue
          </button>
        </div>
      </div>

      {/* ── Success banner ── */}
      {reqSent && (
        <div className="alert alert-ok show" style={{ marginBottom: 14 }}>
          ✅ Request submitted successfully! Admin will review it shortly.
        </div>
      )}

      {/* ── Inline Request Form ── */}
      {showReqForm && (
        <div className="panel" style={{ border: `2px solid ${M}`, marginBottom: 16 }}>
          <div className="panel-hdr" style={{ background: `linear-gradient(135deg,${M},#6B1212)` }}>
            <h3 style={{ color: '#fff' }}>
              {reqForm.type === 'permission' ? '✋ Seek Permission' : '🚩 Report Issue'}
            </h3>
            <button className="btn btn-ghost btn-sm" style={{ color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
              onClick={() => setShowReqForm(false)}>✕ Cancel</button>
          </div>
          <div className="panel-body">
            <form onSubmit={submitRequest}>
              <div className="field-row">
                <div className="field">
                  <label>Request Type</label>
                  <select value={reqForm.type} onChange={e => setReqForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="permission">Permission to be Absent</option>
                    <option value="lateness">Permission for Lateness</option>
                    <option value="early_out">Permission to Leave Early</option>
                    <option value="report">Report an Issue</option>
                    <option value="other">Other Request</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date Needed (if applicable)</label>
                  <input type="date" value={reqForm.date_needed}
                    onChange={e => setReqForm(f => ({ ...f, date_needed: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Details / Description *</label>
                <textarea rows={3} required placeholder="Describe your request or issue in detail…"
                  value={reqForm.text} onChange={e => setReqForm(f => ({ ...f, text: e.target.value }))}
                  style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: 10, border: '1.5px solid var(--border)', borderRadius: 8 }} />
              </div>
              <div className="field">
                <label>Reason (optional)</label>
                <input placeholder="Brief reason…" value={reqForm.reason}
                  onChange={e => setReqForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReqForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-maroon" disabled={busy}>
                  {busy ? '⏳ Submitting…' : '📤 Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="profile-tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab-btn${activeTab === t.id ? ' on' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── My Duties Tab ── */}
      {activeTab === 'duties' && (
        <div className="panel">
          <div className="panel-hdr"><h3>📋 Your Assigned Duties</h3></div>
          <div className="panel-body">
            {myDuties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                <div style={{ fontSize: 32 }}>📋</div>
                <div>No specific duties assigned to you yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myDuties.map(d => (
                  <div key={d.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 14,
                    borderLeft: `4px solid ${d.status === 'completed' ? '#059669' : '#D97706'}`,
                    background: d.status === 'completed' ? '#F0FDF4' : '#FFFBEB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          📅 {d.date} {d.completedAt && ` · ✅ Done ${new Date(d.completedAt).toLocaleDateString('en-KE')}`}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.task}</div>
                      </div>
                      <button
                        className={`btn btn-sm ${d.status === 'completed' ? 'btn-ghost' : 'btn-success'}`}
                        onClick={() => toggleDutyStatus(d.id)}
                        disabled={busy}
                      >
                        {d.status === 'completed' ? '↩️ Mark Pending' : '✅ Mark Completed'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin: Manage Duties ── */}
      {activeTab === 'manage_duties' && isAdmin && (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-hdr"><h3>🛠 Assign New Duty</h3></div>
            <div className="panel-body">
              <form onSubmit={addDuty} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label>Assign to Staff</label>
                  <select value={dutyForm.staffId} onChange={e => setDutyForm({ ...dutyForm, staffId: e.target.value })} required>
                    <option value="">Select Staff...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 2, minWidth: 250, marginBottom: 0 }}>
                  <label>Duty Description / Task</label>
                  <input placeholder="e.g. In charge of Morning Parade" value={dutyForm.task}
                    onChange={e => setDutyForm({ ...dutyForm, task: e.target.value })} required />
                </div>
                <div className="field" style={{ width: 150, marginBottom: 0 }}>
                  <label>Date</label>
                  <input type="date" value={dutyForm.date} onChange={e => setDutyForm({ ...dutyForm, date: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-maroon" disabled={busy} style={{ height: 42 }}>Assign Duty</button>
              </form>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr"><h3>📅 Duty Roster (All Staff)</h3></div>
            <div className="panel-body">
              {duties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No duties assigned yet.</div>
              ) : (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Staff Name</th>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duties.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || '') || 0).map(d => (
                        <tr key={d.id}>
                          <td style={{ fontSize: 12 }}>{d.date}</td>
                          <td style={{ fontWeight: 700 }}>{d.staffName}</td>
                          <td style={{ fontSize: 13 }}>{d.task}</td>
                          <td>
                            <span className={`badge ${d.status === 'completed' ? 'bg-green' : 'bg-amber'}`}>
                              {d.status === 'completed' ? '✅ Completed' : '⏳ Pending'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-xs" onClick={() => deleteDuty(d.id)} disabled={busy}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Presence/Attendance Tab ── */}
      {activeTab === 'presence' && (
        <div className="panel">
          <div className="panel-hdr"><h3>📍 Recent Attendance Log</h3></div>
          <div className="panel-body">
            {myPresence.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No attendance records yet.</div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead>
                  <tbody>
                    {myPresence.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.date}</td>
                        <td style={{ fontWeight: 600, color: 'var(--green)' }}>{p.login || '—'}</td>
                        <td style={{ color: p.logout ? 'var(--muted)' : 'var(--amber)' }}>{p.logout || 'Pending'}</td>
                        <td style={{ fontWeight: 700 }}>{p.hours ? `${p.hours} hrs` : '—'}</td>
                        <td>
                          <span className={`badge ${p.logout ? 'bg-green' : 'bg-amber'}`}>
                            {p.logout ? 'Complete' : 'Present'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Requests Tab ── */}
      {activeTab === 'requests' && (
        <div className="panel">
          <div className="panel-hdr"><h3>✋ My Requests</h3>
            <button className="btn btn-gold btn-sm" onClick={() => openReqForm('permission')}>➕ New Request</button>
          </div>
          <div className="panel-body">
            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                No requests submitted yet.
                <br /><button className="btn btn-maroon btn-sm" style={{ marginTop: 10 }} onClick={() => openReqForm('permission')}>Submit Your First Request</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myRequests.map(r => (
                  <div key={r.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 14,
                    borderLeft: `4px solid ${r.status === 'approved' ? '#059669' : r.status === 'denied' ? '#DC2626' : '#D97706'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="badge" style={{ background: r.type === 'permission' || r.type === 'lateness' || r.type === 'early_out' ? '#FEF3C7' : '#FEE2E2',
                          color: r.type === 'report' ? '#DC2626' : '#92400E', marginRight: 6 }}>
                          {r.type === 'permission' ? '✋ Permission' : r.type === 'lateness' ? '🕐 Lateness' : r.type === 'early_out' ? '🚪 Early Out' : r.type === 'report' ? '🚩 Issue' : '📝 Other'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.date}</span>
                        {r.date_needed && <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 8 }}>📅 Needed: {r.date_needed}</span>}
                      </div>
                      <span className={`badge ${r.status === 'approved' ? 'bg-green' : r.status === 'denied' ? 'bg-red' : 'bg-amber'}`}>
                        {r.status === 'approved' ? '✅ Approved' : r.status === 'denied' ? '❌ Denied' : '⏳ Pending'}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13 }}>{r.text}</div>
                    {r.reason && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Reason: {r.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin: All Requests ── */}
      {activeTab === 'admin_reqs' && isAdmin && (
        <div className="panel">
          <div className="panel-hdr"><h3>🛡 All Staff Requests</h3></div>
          <div className="panel-body">
            {allRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No requests yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allRequests.map(r => (
                  <div key={r.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 14,
                    borderLeft: `4px solid ${r.status === 'approved' ? '#059669' : r.status === 'denied' ? '#DC2626' : '#D97706'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{r.userName}</strong>
                        <span className="badge bg-blue" style={{ marginLeft: 6 }}>{r.userRole}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{r.date}</span>
                        {r.date_needed && <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 8 }}>📅 {r.date_needed}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => updateReqStatus(r.id, 'approved')}>✅ Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => updateReqStatus(r.id, 'denied')}>❌ Deny</button>
                          </>
                        )}
                        <span className={`badge ${r.status === 'approved' ? 'bg-green' : r.status === 'denied' ? 'bg-red' : 'bg-amber'}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13 }}><strong>{r.type}:</strong> {r.text}</div>
                    {r.reason && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Reason: {r.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
