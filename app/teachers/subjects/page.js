'use client';
/**
 * app/teachers/subjects/page.js — Assign subjects to teachers
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGrades, getDefaultSubjects } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';

export default function SubjectsPage() {
  const router = useRouter();
  const [staff,   setStaff]   = useState([]);
  const [assigns, setAssigns] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [grade,   setGrade]   = useState('');
  const [subjCfg, setSubjCfg] = useState({});
  const { profile: school } = useProfile() || {};
  const ALL_GRADES = getAllGrades(school?.curriculum || 'CBC', school);

  useEffect(() => {
    if (!grade && ALL_GRADES.length > 0) setGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, grade]);

  const load = useCallback(async () => {
    const authRes = await fetch('/api/auth');
    const auth    = await authRes.json();
    if (!auth.ok || !['admin', 'super-admin'].includes(auth.role)) { router.push('/dashboard'); return; }

    const dbRes = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [
        { type: 'get', key: 'paav6_staff'            },
        { type: 'get', key: 'paav_teacher_assignments' },
        { type: 'get', key: 'paav8_subj' },
      ]}),
    });
    const db = await dbRes.json();
    setStaff(  (db.results[0]?.value || []).filter(s => s.role === 'teacher'));
    setAssigns(db.results[1]?.value || {});
    setSubjCfg(db.results[2]?.value || {});
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const subjects = (subjCfg[grade] && subjCfg[grade].length > 0) ? subjCfg[grade] : getDefaultSubjects(grade, school?.curriculum || 'CBC');

  function assign(subj, teacherId) {
    const key = `${grade}|${subj}`;
    setAssigns(prev => ({ ...prev, [key]: teacherId }));
    setSaved(false);
  }

  async function save() {
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [
        { type: 'set', key: 'paav_teacher_assignments', value: assigns },
      ]}),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div><h2>📚 Subject Assignments</h2><p>Assign teachers to subjects per grade</p></div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary btn-sm" onClick={save}>💾 Save Assignments</button>
        </div>
      </div>
      {saved && <div className="alert alert-ok show" style={{ display:'flex', marginBottom:14 }}>✅ Saved!</div>}
      <div className="field" style={{ maxWidth: 220, marginBottom: 16 }}>
        <label>Grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value)}>
          {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Subject</th><th>Assigned Teacher</th></tr>
            </thead>
            <tbody>
              {subjects.map(subj => {
                const key = `${grade}|${subj}`;
                return (
                  <tr key={subj}>
                    <td style={{ fontWeight:600 }}>{subj}</td>
                    <td>
                      <select value={assigns[key] || ''}
                        onChange={e => assign(subj, e.target.value)}
                        style={{ padding:'7px 11px', border:'2px solid var(--border)',
                          borderRadius:8, fontSize:12, outline:'none', minWidth:220 }}>
                        <option value="">— Unassigned —</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
