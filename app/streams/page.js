'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { isLevelEnabled } from '@/lib/cbe';

export default function StreamsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [streams, setStaffStreams] = useState([]); // Array of { grade, name, teacherId }
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile: school } = useProfile();
  const curr = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  const ALL_GRADES = (curr.ALL_GRADES || []).filter(g => isLevelEnabled(g, school, school?.curriculum || 'CBC'));
  const [newStream, setNewStream] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  useEffect(() => {
    if (!selectedGrade && ALL_GRADES.length > 0) setSelectedGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, selectedGrade]);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav7_streams', 'paav6_staff']);
    let list = db.paav7_streams || [];
    if (!Array.isArray(list)) list = [];
    
    setStaffStreams(list);
    setStaff(db.paav6_staff || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function addStream() {
    if (!newStream.trim()) return;
    const name = newStream.trim().toUpperCase();
    const grade = selectedGrade;
    
    if (streams.some(s => s.grade === grade && s.name === name)) { 
      alert('Stream already exists for this grade'); return; 
    }
    
    const updated = [...streams, { grade, name, teacherId: selectedTeacher }];
    setStaffStreams(updated);
    setNewStream('');
    setSelectedTeacher('');

    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_streams', value: updated }] })
    });
    invalidateDB(['paav7_streams']);
  }

  async function removeStream(idx) {
    if (!confirm(`Remove this stream?`)) return;
    const updated = streams.filter((_, i) => i !== idx);
    setStaffStreams(updated);
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_streams', value: updated }] })
    });
    invalidateDB(['paav7_streams']);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Streams…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🌊 Institutional Streams</h2>
          <p>Define streams (e.g. North, South) per grade level.</p>
        </div>
      </div>

      <div className="sg sg" style={{ gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <div className="panel" style={{ height: 'fit-content' }}>
          <div className="panel-hdr"><h3>➕ Add New Stream</h3></div>
          <div className="panel-body">
            <div className="field">
              <label>Grade</label>
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Stream Name</label>
              <input 
                value={newStream} 
                onChange={e => setNewStream(e.target.value)} 
                placeholder="e.g. NORTH" 
                onKeyDown={e => e.key === 'Enter' && addStream()}
              />
            </div>
            <div className="field">
              <label>Class Teacher</label>
              <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                <option value="">— Select Teacher —</option>
                {staff.filter(s => s.role !== 'parent').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 15 }} onClick={addStream}>
              ✅ Create Stream
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr"><h3>📋 Active Streams</h3></div>
          <div className="panel-body">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Stream Name</th>
                    <th>Class Teacher</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {streams.sort((a,b) => a.grade.localeCompare(b.grade)).map((s, i) => {
                    const t = staff.find(x => x.id === s.teacherId);
                    return (
                      <tr key={i}>
                        <td><span className="badge bg-blue">{s.grade}</span></td>
                        <td style={{ fontWeight: 800 }}>{s.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {t ? <strong>{t.name}</strong> : <span style={{ fontStyle: 'italic' }}>No teacher assigned</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => removeStream(i)}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                  {streams.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontStyle: 'italic' }}>
                        No streams defined. Add one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
