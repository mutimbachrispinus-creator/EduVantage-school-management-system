'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/**
 * app/allocations/page.js — Subject, Class Teacher & Teacher Code Allocations
 *
 * Allows Admins to:
 *   • Assign a class teacher per grade (and per stream if configured)
 *   • Assign teacher codes per staff member
 *   • Assign subject teachers per grade
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGrades, getDefaultSubjects } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';
import { getCachedUser, getCachedDBMulti, fetchWithRetry } from '@/lib/client-cache';

const MAROON = '#8B1A1A';
const MAROON2 = '#6B1212';
const MAROON_LIGHT = '#FDF2F2';
const MAROON_BG = '#F5E6E6';

export default function AllocationsPage() {
  const router = useRouter();
  const { profile: school } = useProfile() || {};
  const ALL_GRADES = getAllGrades(school?.curriculum || 'CBC');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState([]);
  const [allocs, setAllocs] = useState({});   // { "GRADE 7|Math": "staff_id" }
  const [classTeachers, setClassTeachers] = useState({}); // { "GRADE 7": "staff_id", "GRADE 7|A": "staff_id" }
  const [teacherCodes, setTeacherCodes] = useState({});   // { "staff_id": "TC01" }
  const [subjCfg, setSubjCfg] = useState({});
  const [tab, setTab] = useState('class');  // 'class' | 'subjects' | 'codes'
  const [streams, setStreams] = useState({}); // { "GRADE 7": ["A","B"] } from learners

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav6_staff', 
          'paav_allocations', 
          'paav8_subj', 
          'paav_class_teachers', 
          'paav_teacher_codes', 
          'paav6_learners'
        ])
      ]);

      if (!u || !['admin', 'super-admin'].includes(u.role)) { 
        router.push('/dashboard'); 
        return; 
      }

      setStaff(db.paav6_staff || []);
      setAllocs(db.paav_allocations || {});
      setSubjCfg(db.paav8_subj || {});
      setClassTeachers(db.paav_class_teachers || {});
      setTeacherCodes(db.paav_teacher_codes || {});

      // Extract unique streams per grade from learners
      const learners = db.paav6_learners || [];
      const streamMap = {};
      for (const l of learners) {
        if (!l.grade) continue;
        if (!streamMap[l.grade]) streamMap[l.grade] = new Set();
        if (l.stream) streamMap[l.grade].add(l.stream.toUpperCase());
      }
      const finalStreams = {};
      for (const g in streamMap) finalStreams[g] = [...streamMap[g]].sort();
      setStreams(finalStreams);
    } catch (e) {
      console.error('[Allocations] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      await fetchWithRetry('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav_allocations',    value: allocs },
          { type: 'set', key: 'paav_class_teachers', value: classTeachers },
          { type: 'set', key: 'paav_teacher_codes',  value: teacherCodes },
        ]})
      });
      alert('✅ All allocations saved!');
    } catch (e) {
      alert('❌ Failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function staffName(id) {
    return staff.find(s => s.id === id)?.name || '—';
  }

  const teachingStaff = staff.filter(s => s.role === 'teacher');

  if (loading) return (
    <div className="page on" style={{ padding: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)' }}>
        <span style={{ fontSize: 24 }}>⏳</span> Loading allocations…
      </div>
    </div>
  );

  const TABS = [
    { id: 'class',    label: '🏫 Class Teachers', desc: 'Assign class teacher per grade/stream' },
    { id: 'subjects', label: '📚 Subject Teachers', desc: 'Assign subject teachers per grade' },
    { id: 'codes',    label: '🔖 Teacher Codes', desc: 'Set short codes for each staff member' },
  ];

  return (
    <div className="page on">
      {/* ── Header ── */}
      <div className="page-hdr">
        <div>
          <h2>🗓️ Allocations</h2>
          <p>Assign class teachers, subject teachers, and teacher codes</p>
        </div>
        <div className="page-hdr-acts">
          <button
            className="btn"
            style={{ background: `linear-gradient(135deg,${MAROON},${MAROON2})`, color: '#fff', boxShadow: `0 4px 12px rgba(139,26,26,.3)` }}
            onClick={save}
            disabled={busy}
          >
            {busy ? '⏳ Saving…' : '💾 Save All Allocations'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20, background: MAROON_BG }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' on' : ''}`}
            style={tab === t.id ? { background: MAROON, color: '#fff', boxShadow: `0 2px 8px rgba(139,26,26,.3)` } : {}}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CLASS TEACHERS TAB ── */}
      {tab === 'class' && (
        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-hdr" style={{ background: MAROON_LIGHT, borderBottom: `2px solid ${MAROON_BG}` }}>
              <h3 style={{ color: MAROON }}>🏫 Class Teacher Assignment</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Assign one class teacher per grade (and per stream if streams exist)</span>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {ALL_GRADES.map(grade => {
                  const gradeStreams = streams[grade] || [];
                  return (
                    <div key={grade} style={{
                      border: `1.5px solid ${MAROON_BG}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(139,26,26,.06)'
                    }}>
                      {/* Grade header */}
                      <div style={{
                        background: `linear-gradient(135deg,${MAROON},${MAROON2})`,
                        color: '#fff',
                        padding: '10px 14px',
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>🏫</span> {grade}
                      </div>
                      <div style={{ padding: 14, background: '#fff' }}>
                        {/* Main grade class teacher */}
                        <div style={{ marginBottom: gradeStreams.length ? 10 : 0 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                            Class Teacher {gradeStreams.length ? '(Overall)' : ''}
                          </label>
                          <select
                            style={{ width: '100%', border: `2px solid ${MAROON_BG}`, borderRadius: 8, padding: '7px 10px', fontSize: 12.5, outline: 'none' }}
                            value={classTeachers[grade] || ''}
                            onChange={e => setClassTeachers({ ...classTeachers, [grade]: e.target.value })}
                          >
                            <option value="">(Not Assigned)</option>
                            {teachingStaff.map(st => <option key={st.id} value={st.id}>{st.name} {teacherCodes[st.id] ? `[${teacherCodes[st.id]}]` : ''}</option>)}
                          </select>
                        </div>
                        {/* Per-stream class teachers */}
                        {gradeStreams.map(stream => (
                          <div key={stream} style={{ marginTop: 8 }}>
                            <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: MAROON, display: 'block', marginBottom: 4 }}>
                              Stream {stream} Class Teacher
                            </label>
                            <select
                              style={{ width: '100%', border: `2px solid ${MAROON_BG}`, borderRadius: 8, padding: '7px 10px', fontSize: 12.5, outline: 'none' }}
                              value={classTeachers[`${grade}|${stream}`] || ''}
                              onChange={e => setClassTeachers({ ...classTeachers, [`${grade}|${stream}`]: e.target.value })}
                            >
                              <option value="">(Not Assigned)</option>
                              {teachingStaff.map(st => <option key={st.id} value={st.id}>{st.name} {teacherCodes[st.id] ? `[${teacherCodes[st.id]}]` : ''}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBJECT TEACHERS TAB ── */}
      {tab === 'subjects' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {ALL_GRADES.map(grade => {
            const subjects = (subjCfg[grade] && subjCfg[grade].length > 0)
              ? subjCfg[grade]
              : getDefaultSubjects(grade, school?.curriculum || 'CBC');
            return (
              <div key={grade} style={{ border: `1.5px solid ${MAROON_BG}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(139,26,26,.06)' }}>
                <div style={{
                  background: `linear-gradient(135deg,${MAROON},${MAROON2})`,
                  color: '#fff',
                  padding: '10px 14px',
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>📚 {grade}</span>
                  <span style={{ fontSize: 10, opacity: .7 }}>{subjects.length} subjects</span>
                </div>
                <div style={{ padding: 12, background: '#fff' }}>
                  {subjects.map(s => (
                    <div key={s} style={{ marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 8, background: MAROON_LIGHT }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: MAROON }}>{s}</div>
                      <select
                        style={{ fontSize: 11.5, padding: '5px 7px', border: `1.5px solid ${MAROON_BG}`, borderRadius: 7, outline: 'none' }}
                        value={allocs[`${grade}|${s}`] || ''}
                        onChange={e => setAllocs({ ...allocs, [`${grade}|${s}`]: e.target.value })}
                      >
                        <option value="">(Not Assigned)</option>
                        {teachingStaff.map(st => (
                          <option key={st.id} value={st.id}>
                            {teacherCodes[st.id] ? `[${teacherCodes[st.id]}] ` : ''}{st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TEACHER CODES TAB ── */}
      {tab === 'codes' && (
        <div className="panel">
          <div className="panel-hdr" style={{ background: MAROON_LIGHT, borderBottom: `2px solid ${MAROON_BG}` }}>
            <h3 style={{ color: MAROON }}>🔖 Teacher Codes</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Short 2-4 letter codes used on timetables and reports</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {teachingStaff.map(st => (
                <div key={st.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1.5px solid ${MAROON_BG}`,
                  background: teacherCodes[st.id] ? MAROON_LIGHT : '#fff'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{st.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{st.role || st.dept || 'Staff'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {teacherCodes[st.id] && (
                      <span style={{ background: MAROON, color: '#fff', padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                        {teacherCodes[st.id]}
                      </span>
                    )}
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="CODE"
                      style={{
                        width: 64,
                        border: `2px solid ${teacherCodes[st.id] ? MAROON : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '6px 8px',
                        fontSize: 13,
                        fontWeight: 800,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        outline: 'none',
                        color: MAROON
                      }}
                      value={teacherCodes[st.id] || ''}
                      onChange={e => setTeacherCodes({ ...teacherCodes, [st.id]: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              ))}
              {teachingStaff.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  No staff members found. Add staff in the Staff module first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
