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
    
    // Auto-prefill removed as per user request to avoid accidental data overwrites
    // if (field === 'adm' && val) {
    //   const existing = learners.find(l => l.adm.trim() === val.trim());
    //   if (existing) {
    //     row = { ...row, ...existing };
    //   }
    // }
    
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

  function deduplicateRows() {
    const valid = rows.filter(r => r.name && r.adm);
    const merged = [];
    let count = 0;
    
    function isFuzzyMatch(n1, n2) {
      const s1 = String(n1 || '').toUpperCase().trim();
      const s2 = String(n2 || '').toUpperCase().trim();
      if (s1 === s2) return true;
      const w1 = s1.split(/\s+/);
      const w2 = s2.split(/\s+/);
      // Match if first two words are identical
      if (w1.length >= 2 && w2.length >= 2 && w1[0] === w2[0] && w1[1] === w2[1]) return true;
      return false;
    }

    for (const r of valid) {
      const isDuplicate = merged.some(m => m.grade === r.grade && isFuzzyMatch(m.name, r.name));
      if (isDuplicate) {
        count++;
        continue; 
      }
      merged.push(r);
    }
    
    if (count > 0) {
      if (confirm(`🔍 Found ${count} potential duplicates (including partial name matches like "George Gitau"). Merge them into unique records?`)) {
        setRows([...merged, ...Array(Math.max(5, 20 - merged.length)).fill(null).map(() => ({...EMPTY_ROW, grade: bulkGrade}))]);
      }
    } else {
      alert('✅ No potential duplicates found in the current grid.');
    }
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
      const data = await res.json();
      if (data.results?.[0]?.error) {
        throw new Error(data.results[0].error);
      }
      
      // Invalidate local cache and notify app
      invalidateDB('paav6_learners');
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
      
      alert(`✅ Successfully saved ${validRows.length} learners! Existing duplicates in this grade were merged automatically.`);
      router.push('/learners');
    } catch (e) {
      alert('❌ Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function matchGrade(input) {
    if (!input) return '';
    const clean = input.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    
    // Fuzzy matching for Kindergarten & Common variations
    if (clean.includes('KINDER')) return 'KINDERGARTEN';
    if (clean === 'PP1' || clean === 'PREPRIMARY1') return 'PP1';
    if (clean === 'PP2' || clean === 'PREPRIMARY2') return 'PP2';
    
    // Exact match in ALL_GRADES
    const exact = ALL_GRADES.find(g => g.toUpperCase().replace(/[^A-Z0-9]/g, '') === clean);
    if (exact) return exact;
    
    return input.toUpperCase(); // Fallback
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      const newRows = [];
      
      // 1. Analyze header to find indices (Keyword detection)
      const headerLine = lines[0].toLowerCase();
      const headers = lines[0].split(',').map(c => c.trim().toLowerCase());
      
      // Heuristic: Is the first line a header?
      const isHeader = headers.some(h => ['adm', 'name', 'dob', 'birth', 'grade', 'level', 'stream', 'sex', 'parent', 'phone', 'arrears'].some(k => h.includes(k)));
      
      const map = {
        adm: headers.findIndex(h => h.includes('adm')),
        name: headers.findIndex(h => h.includes('name')),
        dob: headers.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date')),
        grade: headers.findIndex(h => h.includes('grade') || h.includes('level') || h.includes('class')),
        stream: headers.findIndex(h => h.includes('stream') || h.includes('house')),
        sex: headers.findIndex(h => h.includes('sex') || h.includes('gender')),
        parent: headers.findIndex(h => h.includes('parent') || h.includes('guardian')),
        phone: headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('mobile')),
        arrears: headers.findIndex(h => h.includes('arrears') || h.includes('balance') || h.includes('debt'))
      };

      // Fallback to defaults if not found (matching template order)
      if (map.adm === -1) map.adm = 0;
      if (map.name === -1) map.name = 1;
      if (map.dob === -1) map.dob = 2;
      if (map.grade === -1) map.grade = 3;
      if (map.stream === -1) map.stream = 4;
      if (map.sex === -1) map.sex = 5;
      if (map.parent === -1) map.parent = 6;
      if (map.phone === -1) map.phone = 7;
      if (map.arrears === -1) map.arrears = 8;

      let startIdx = isHeader ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Final sanity check: if DOB looks like a grade and Grade looks like a date, swap them
        let rowDOB = cols[map.dob] || '';
        let rowGrade = cols[map.grade] || '';
        
        const isDate = (s) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s);
        const isGrade = (s) => /GRADE|PP|CLASS|PRIMARY|KINDER/i.test(s);

        if (isGrade(rowDOB) && isDate(rowGrade)) {
          [rowDOB, rowGrade] = [rowGrade, rowDOB];
        }

        newRows.push({
          ...EMPTY_ROW,
          adm: cols[map.adm] || '',
          name: cols[map.name]?.toUpperCase() || '',
          dob: rowDOB,
          grade: matchGrade(rowGrade) || bulkGrade || ALL_GRADES[0],
          stream: cols[map.stream]?.toUpperCase() || bulkStream || '',
          sex: cols[map.sex]?.toUpperCase().startsWith('M') ? 'M' : 'F',
          parent: cols[map.parent]?.toUpperCase() || '',
          phone: cols[map.phone] || '',
          arrears: Number(cols[map.arrears]) || 0
        });
      }
      
      if (newRows.length > 0) {
        if (confirm(`Detected ${newRows.length} learners. Overwrite current grid?`)) {
          setRows([...newRows, ...Array(5).fill(null).map(() => ({...EMPTY_ROW}))]);
        }
      }
      e.target.value = null; // reset
    };
    reader.readAsText(file);
  }

  function handleUpdateDetails(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!bulkGrade) { alert('⚠️ Please select a Grade first to match learners accurately.'); return; }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(c => c.trim().toLowerCase());
      const map = {
        adm: headers.findIndex(h => h.includes('adm')),
        name: headers.findIndex(h => h.includes('name')),
        dob: headers.findIndex(h => h.includes('dob') || h.includes('birth')),
        stream: headers.findIndex(h => h.includes('stream')),
        phone: headers.findIndex(h => h.includes('phone') || h.includes('contact'))
      };

      // Fallbacks
      if (map.adm === -1) map.adm = 0;
      if (map.name === -1) map.name = 1;
      if (map.dob === -1) map.dob = 2;
      if (map.stream === -1) map.stream = 4;
      if (map.phone === -1) map.phone = 7;

      const matchedRows = [];
      const gradeLearners = learners.filter(l => l.grade === bulkGrade);

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const csvName = cols[map.name]?.toUpperCase() || '';
        if (!csvName) continue;

        // Match by Name (Fuzzy: exact or contains)
        const match = gradeLearners.find(l => {
          const lName = l.name.toUpperCase();
          return lName === csvName || lName.includes(csvName) || csvName.includes(lName);
        });

        if (match) {
          matchedRows.push({
            ...EMPTY_ROW,
            ...match,
            name: csvName, // Update name (e.g. adding extra name)
            adm: cols[map.adm] || match.adm,
            dob: cols[map.dob] || match.dob,
            stream: cols[map.stream]?.toUpperCase() || match.stream,
            phone: cols[map.phone] || match.phone
          });
        }
      }

      if (matchedRows.length > 0) {
        if (confirm(`🔍 Found ${matchedRows.length} matching learners in ${bulkGrade}. Load them into the grid to review and update?`)) {
          setRows([...matchedRows, ...Array(10).fill(null).map(() => ({...EMPTY_ROW}))]);
        }
      } else {
        alert('❌ No matching learners found in ' + bulkGrade + '. Check if names in CSV match your existing records.');
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const headers = "ADM,Name,DOB (YYYY-MM-DD),Grade,Stream,Sex (M/F),Parent Name,Phone,Arrears\n";
    const example = "101,JOHN DOE,2015-05-20,GRADE 1,WEST,M,PETER DOE,0711223344,0\n";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learners_template.csv';
    a.click();
  }

  // Removed: if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading bulk registration...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎓 Bulk Learner Sync & Registry {loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 10 }}>Syncing...</span>}</h2>
          <p>Add new students or sync existing details (Name/ADM) in bulk</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>📥 Download Template</button>
          <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer' }}>
            📁 Upload CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            🔄 Sync/Update
            <input type="file" accept=".csv" onChange={handleUpdateDetails} style={{ display: 'none' }} />
          </label>
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
          <button className="btn btn-gold btn-sm" onClick={deduplicateRows} title="Instantly find and merge students with the same name in this list">
            🪄 Deduplicate & Merge (Safety Check)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={applyGradeToAll} title="Apply this grade and stream to all existing rows">
            🪄 Apply Grade/Stream to All
          </button>

          <div style={{ borderLeft: '1px solid var(--border)', height: 30, margin: '0 8px' }}></div>

          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 2 }}>👤 Add Individual Learner</div>
            <input autoComplete="off" 
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
                    <input autoComplete="off" type="text" className="sc-inp" style={{ width: '100%' }} value={r.adm} onChange={e => updateRow(i, 'adm', e.target.value)} placeholder="000" />
                  </td>
                  <td>
                    <input autoComplete="off" type="text" className="sc-inp" style={{ width: '100%', textAlign: 'left' }} value={r.name} onChange={e => updateRow(i, 'name', e.target.value.toUpperCase())} placeholder="STUDENT NAME" />
                  </td>
                  <td>
                    <input autoComplete="off" type="date" className="sc-inp" style={{ width: '100%' }} value={r.dob} onChange={e => updateRow(i, 'dob', e.target.value)} />
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
                    <input autoComplete="off" type="text" className="sc-inp" style={{ width: '100%', textAlign: 'left' }} value={r.parent} onChange={e => updateRow(i, 'parent', e.target.value.toUpperCase())} placeholder="PARENT NAME" />
                  </td>
                  <td>
                    <input autoComplete="off" type="text" className="sc-inp" style={{ width: '100%' }} value={r.phone} onChange={e => updateRow(i, 'phone', e.target.value)} placeholder="07..." />
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

      <div className="panel" style={{ marginTop: 25, borderTop: '4px solid var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>🛠️ Historical Data Recovery Tools</h3>
            <span style={{ fontSize: 11, background: 'var(--gold)', color: '#000', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>PRO TOOLS</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Use these tools to find and restore marks or payments that were lost during student merges.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 15 }}>
            <div style={{ padding: 15, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5 }}>🔗 Deep Link via Payment History</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>Scans your Finance records for student names and re-attaches their marks to their new profiles.</p>
              <button 
                className="btn btn-gold btn-sm w-full" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const tid = user?.tenantId || 'platform-master';
                    const res = await fetch('/api/saas/maintenance', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tenantId: tid }) 
                    });
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    alert(`✅ Deep Recovery Complete!\nFound and restored data for ${json.recovered || 0} student profiles.`);
                  } catch (e) {
                    alert('Recovery failed: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                🚀 Run Deep Recovery
              </button>
            </div>

            <div style={{ padding: 15, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5 }}>🧪 Diagnostic Scan</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>Checks if there are any marks in the database that are currently "unowned" by any student.</p>
              <button 
                className="btn btn-ghost btn-sm w-full" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const tid = user?.tenantId || 'platform-master';
                    const res = await fetch(`/api/saas/maintenance?tenantId=${tid}`);
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    const { marksCount, paylogCount } = json;
                    alert(`🔍 Diagnostic Results:\n\n• Orphaned Marks: ${marksCount || 0}\n• Orphaned Payments: ${paylogCount || 0}\n\nClick "Run Deep Recovery" to attempt re-linking these records.`);
                  } catch (e) {
                    alert('Scan failed: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                🔍 Scan for Orphans
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
