'use client';
export const runtime = 'edge';
/**
 * app/learners/bulk/page.js — Bulk Learner Registration
 *
 * Provides a 20-row grid to quickly add multiple learners with:
 * ADM, Name, DOB, Grade, Stream, Parent Name, Phone
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGrades } from '@/lib/cbe';
import { getCachedDBMulti, invalidateDB } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';

export default function BulkLearnersPage() {
  const router = useRouter();
  const { profile: school, user } = useProfile();
  
  // UseMemo for stable grades array
  const ALL_GRADES = useMemo(() => {
    return getAllGrades(school?.curriculum || 'CBC');
  }, [school?.curriculum]);

  const EMPTY_ROW = { 
    adm: '', name: '', dob: '', grade: ALL_GRADES[0] || 'GRADE 1', sex: 'F', age: '', 
    stream: '', parent: '', phone: '', parentEmail: '', addr: '',
    t1: 0, t2: 0, t3: 0, teacher: '', arrears: 0
  };

  const [rows, setRows] = useState(() => Array(20).fill(null).map(() => ({ ...EMPTY_ROW })));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState([]);
  const [streams, setStreams] = useState([]);
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkStream, setBulkStream] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!bulkGrade && ALL_GRADES.length > 0) setBulkGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, bulkGrade]);

  useEffect(() => {
    if (!user) return;
    
    async function init() {
      // 1. Fast Auth Check using existing session
      if (!['admin','teacher','jss_teacher','senior_teacher','super-admin'].includes(user.role)) {
        router.push('/'); return;
      }
      setIsAdmin(user.role === 'admin' || user.role === 'super-admin');

      // 2. High-Speed Cache Data retrieval
      const dbData = await getCachedDBMulti(['paav6_learners', 'paav7_streams']);
      setLearners(dbData.paav6_learners || []);
      setStreams(dbData.paav7_streams || []);
      
      setLoading(false);
    }
    init();
  }, [user, router]);

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

  function updateRow(idx, field, val) {
    const newRows = [...rows];
    let row = { ...newRows[idx], [field]: val };
    
    // Auto-calculate age if DOB changes
    if (field === 'dob') {
      row.age = calculateAge(val);
    }
    
    newRows[idx] = row;
    setRows(newRows);
  }

  function applyGradeToAll() {
    setRows(rows.map(r => ({ ...r, grade: bulkGrade, stream: bulkStream || r.stream })));
  }

  function fillGradeRows() {
    if (rows.some(r => r.adm && r.name) && !confirm('This will clear current rows. Continue?')) return;
    const fresh = Array(30).fill(null).map(() => ({ ...EMPTY_ROW, grade: bulkGrade, stream: bulkStream }));
    setRows(fresh);
  }

  function loadExistingGrade() {
    const existing = learners.filter(l => l.grade === bulkGrade);
    if (existing.length === 0) {
      alert(`No existing learners found in ${bulkGrade}`);
      return;
    }
    if (rows.some(r => r.adm && r.name) && !confirm('This will replace current rows with existing learners. Continue?')) return;
    
    // Fill with existing + some empty rows
    const filled = existing.map(l => ({ ...EMPTY_ROW, ...l }));
    const buffer = Array(Math.max(5, 30 - filled.length)).fill(null).map(() => ({ ...EMPTY_ROW, grade: bulkGrade }));
    setRows([...filled, ...buffer]);
  }

  function addLearnerToGrid(l) {
    const newRows = [...rows];
    const emptyIdx = newRows.findIndex(r => !r.adm && !r.name);
    if (emptyIdx === -1) {
      newRows.push({ ...EMPTY_ROW, ...l });
    } else {
      newRows[emptyIdx] = { ...EMPTY_ROW, ...l };
    }
    setRows(newRows);
    setPickerSearch('');
    setShowPicker(false);
  }

  async function handleSave() {
    const validRows = rows.filter(r => r.adm && r.name && r.grade);
    if (validRows.length === 0) { alert('Please fill at least one row (ADM, Name, Grade required)'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'bulkAddLearners', learners: validRows }] })
      });
      if (!res.ok) throw new Error('API request failed');
      
      // Invalidate local cache and notify app
      invalidateDB('paav6_learners');
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
      
      alert(`✅ Successfully saved ${validRows.length} learners!`);
      router.push('/learners');
    } catch (e) {
      alert('❌ Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Removed: if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading bulk registration...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎓 Bulk Add Learners {loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 10 }}>Syncing...</span>}</h2>
          <p>Fill the grid below to register multiple students at once</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => setRows([...rows, ...Array(10).fill(null).map(() => ({...EMPTY_ROW}))])}>➕ Add 10 Rows</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving...' : '💾 Save All Learners'}
          </button>
        </div>
      </div>

      {/* ── Entry by Grade ── */}
      <div className="panel" style={{ marginBottom: 12, overflow: 'visible' }}>
        <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 2 }}>📚 Entry by Grade</div>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Select Grade</label>
            <select value={bulkGrade} onChange={e => { setBulkGrade(e.target.value); setBulkStream(''); }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          {streams.filter(s => s.grade === bulkGrade).length > 0 && (
            <div className="field" style={{ marginBottom: 0, minWidth: 140 }}>
              <label>Select Stream</label>
              <select value={bulkStream} onChange={e => setBulkStream(e.target.value)}>
                <option value="">(No Stream)</option>
                {streams.filter(s => s.grade === bulkGrade).map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-gold btn-sm" onClick={fillGradeRows} title="Clear table and set 30 fresh rows for this grade">
            🆕 New Class Entry
          </button>
          <button className="btn btn-primary btn-sm" onClick={loadExistingGrade} title="Load all existing learners in this grade for editing">
            ✏️ Load Class for Editing
          </button>
          <button className="btn btn-ghost btn-sm" onClick={applyGradeToAll} title="Apply this grade and stream to all existing rows">
            🪄 Apply Grade/Stream to All
          </button>

          <div style={{ borderLeft: '1px solid var(--border)', height: 30, margin: '0 8px' }}></div>

          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 2 }}>👤 Add Individual Learner</div>
            <input 
              type="text" 
              className="sc-inp" 
              placeholder="Search existing learner name..." 
              value={pickerSearch} 
              onFocus={() => setShowPicker(true)}
              onChange={e => { setPickerSearch(e.target.value); setShowPicker(true); }}
              style={{ width: '100%', height: 34 }}
            />
            {showPicker && pickerSearch.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {learners
                  .filter(l => l.name.toLowerCase().includes(pickerSearch.toLowerCase()) || l.adm.includes(pickerSearch))
                  .slice(0, 10)
                  .map(l => (
                    <div key={l.adm} 
                      onClick={() => addLearnerToGrid(l)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                      <strong>{l.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 11 }}>({l.adm} · {l.grade})</span>
                    </div>
                  ))
                }
                {learners.filter(l => l.name.toLowerCase().includes(pickerSearch.toLowerCase()) || l.adm.includes(pickerSearch)).length === 0 && (
                  <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>No matches found</div>
                )}
              </div>
            )}
            {showPicker && <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowPicker(false)}></div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="tbl-wrap" style={{ overflowX: 'auto', contain: 'layout style' }}>
          <table style={{ minWidth: isAdmin ? 1260 : 1140, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>ADM</th>
                <th style={{ width: 250 }}>Full Name</th>
                <th style={{ width: 140 }}>DOB</th>
                <th style={{ width: 150 }}>Grade</th>
                <th style={{ width: 70 }}>Sex</th>
                <th style={{ width: 100 }}>Stream</th>
                <th style={{ width: 200 }}>Parent Name</th>
                <th style={{ width: 150 }}>Phone</th>
                {isAdmin && <th style={{ width: 120 }}>Accumulated Fee</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input type="text" className="sc-inp" style={{ width: '100%' }} value={r.adm} onChange={e => updateRow(i, 'adm', e.target.value)} placeholder="000" />
                  </td>
                  <td>
                    <input type="text" className="sc-inp" style={{ width: '100%', textAlign: 'left' }} value={r.name} onChange={e => updateRow(i, 'name', e.target.value.toUpperCase())} placeholder="STUDENT NAME" />
                  </td>
                  <td>
                    <input type="date" className="sc-inp" style={{ width: '100%' }} value={r.dob} onChange={e => updateRow(i, 'dob', e.target.value)} />
                  </td>
                  <td>
                    <select className="sc-inp" style={{ width: '100%' }} value={r.grade} onChange={e => updateRow(i, 'grade', e.target.value)}>
                      {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="sc-inp" style={{ width: '100%' }} value={r.sex} onChange={e => updateRow(i, 'sex', e.target.value)}>
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </td>
                  <td>
                    {streams.filter(s => s.grade === r.grade).length > 0 ? (
                      <select className="sc-inp" style={{ width: '100%' }} value={r.stream} onChange={e => updateRow(i, 'stream', e.target.value)}>
                        <option value="">-</option>
                        {streams.filter(s => s.grade === r.grade).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="sc-inp" style={{ width: '100%' }} value={r.stream} onChange={e => updateRow(i, 'stream', e.target.value.toUpperCase())} placeholder="A" />
                    )}
                  </td>
                  <td>
                    <input type="text" className="sc-inp" style={{ width: '100%', textAlign: 'left' }} value={r.parent} onChange={e => updateRow(i, 'parent', e.target.value.toUpperCase())} placeholder="PARENT NAME" />
                  </td>
                  <td>
                    <input type="text" className="sc-inp" style={{ width: '100%' }} value={r.phone} onChange={e => updateRow(i, 'phone', e.target.value)} placeholder="07..." />
                  </td>
                  {isAdmin && (
                    <td>
                      <input type="number" className="sc-inp" style={{ width: '100%' }} value={r.arrears} onChange={e => updateRow(i, 'arrears', Number(e.target.value))} placeholder="0.00" disabled={!isAdmin} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
