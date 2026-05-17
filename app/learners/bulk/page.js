'use client';
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
    adm: '', name: '', dob: '', grade: '', sex: 'F', age: '', 
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
    if (ALL_GRADES.length > 0) {
      // If bulkGrade is empty OR not in the current curriculum's grades list, reset it
      if (!bulkGrade || !ALL_GRADES.includes(bulkGrade)) {
        setBulkGrade(ALL_GRADES[0]);
        setRows(prev => prev.map(r => ({ ...r, grade: ALL_GRADES[0] })));
      }
    }
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

  // Individual learner picker removed to avoid confusion

  function deduplicateRows() {
    const valid = rows.filter(r => r.name || r.adm);
    const merged = [];
    let count = 0;
    
    function isFuzzyMatch(n1, n2) {
      if (!n1 || !n2) return false;
      const s1 = String(n1).toUpperCase().trim().replace(/[^A-Z\s]/g, '');
      const s2 = String(n2).toUpperCase().trim().replace(/[^A-Z\s]/g, '');
      if (s1 === s2) return true;
      
      const w1 = s1.split(/\s+/).filter(w => w.length > 1);
      const w2 = s2.split(/\s+/).filter(w => w.length > 1);
      
      if (w1.length === 0 || w2.length === 0) return s1 === s2;

      // Check if at least 2 words match (Order independent)
      const longer = w1.length >= w2.length ? w1 : w2;
      const shorter = w1.length < w2.length ? w1 : w2;
      const longerSet = new Set(longer);
      const matches = shorter.filter(w => longerSet.has(w)).length;

      if (shorter.length === 1) return matches === 1 && longer.includes(shorter[0]);
      return matches >= 2;
    }

    for (const r of valid) {
      const rAdm = String(r.adm || '').trim();
      const existingIdx = merged.findIndex(m => {
        const mAdm = String(m.adm || '').trim();
        const admMatch = (rAdm && mAdm && rAdm === mAdm);
        const nameMatch = (r.name && m.name && m.grade === r.grade && isFuzzyMatch(m.name, r.name));
        return admMatch || nameMatch;
      });

      if (existingIdx !== -1) {
        const m = merged[existingIdx];
        merged[existingIdx] = {
          ...m, ...r,
          name: (r.name?.length > (m.name?.length || 0)) ? r.name : m.name,
          adm: r.adm || m.adm,
          phone: r.phone || m.phone,
          parent: r.parent || m.parent,
          dob: r.dob || m.dob,
          stream: r.stream || m.stream,
          arrears: Math.max(r.arrears || 0, m.arrears || 0)
        };
        count++;
      } else {
        merged.push({ ...r });
      }
    }
    
    if (count > 0) {
      if (confirm(`🔍 Found ${count} duplicate or similar records. Merge them into unique profiles?`)) {
        setRows([...merged, ...Array(Math.max(5, 20 - merged.length)).fill(null).map(() => ({...EMPTY_ROW, grade: bulkGrade}))]);
      }
    } else {
      alert('✅ No duplicates found in the current list.');
    }
  }

  async function handleDeleteGrade() {
    if (!bulkGrade) return;
    const count = learners.filter(l => l.grade === bulkGrade).length;
    if (count === 0) { alert(`No learners found in ${bulkGrade}`); return; }
    
    if (!confirm(`⚠️ WARNING: This will DELETE all ${count} learners in ${bulkGrade} and move them to the Recycle Bin. This action cannot be easily undone.\n\nAre you sure you want to proceed?`)) return;
    
    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'deleteGradeLearners', grade: bulkGrade }] })
      });
      const data = await res.json();
      if (data.results?.[0]?.error) throw new Error(data.results[0].error);
      
      invalidateDB('paav6_learners');
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav6_learners'] } }));
      
      alert(`✅ Successfully deleted ${count} learners from ${bulkGrade}.`);
      setRows(Array(20).fill(null).map(() => ({ ...EMPTY_ROW, grade: bulkGrade })));
      // Refresh local learners list
      const dbData = await getCachedDBMulti(['paav6_learners']);
      setLearners(dbData.paav6_learners || []);
    } catch (e) {
      alert('❌ Error: ' + e.message);
    } finally {
      setBusy(false);
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
    
    // 1. Exact match in ALL_GRADES (Highest priority)
    const exact = ALL_GRADES.find(g => g.toUpperCase().replace(/[^A-Z0-9]/g, '') === clean);
    if (exact) return exact;

    // 2. Map common numeric formats (e.g. "G1", "Y1", "1" -> match current curriculum's 1st grade)
    const numericMatch = clean.match(/\d+/);
    if (numericMatch) {
      const num = numericMatch[0];
      const found = ALL_GRADES.find(g => g.includes(num));
      if (found) return found;
    }

    // 3. Fuzzy matching for Kindergarten & Common variations (Curriculum Aware)
    if (clean.includes('KINDER') || clean.includes('EYFS')) {
       return ALL_GRADES.find(g => g.includes('KINDER') || g.includes('PP') || g.includes('EYFS')) || ALL_GRADES[0];
    }
    if (clean.startsWith('PP1') || clean.includes('PREPRIMARY1')) {
      return ALL_GRADES.find(g => g.includes('PP1') || g.includes('RECEPTION')) || ALL_GRADES[0];
    }
    if (clean.startsWith('PP2') || clean.includes('PREPRIMARY2')) {
      return ALL_GRADES.find(g => g.includes('PP2') || g.includes('YEAR 1')) || ALL_GRADES[1] || ALL_GRADES[0];
    }
    
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
      const headerLine = lines[0].toUpperCase();
      const headers = lines[0].split(',').map(c => c.trim().toUpperCase());
      
      // 1. Keyword-based Mapping
      const map = {
        adm: headers.findIndex(h => h.includes('ADM') || h.includes('NO.') || h.includes('NUMBER')),
        name: headers.findIndex(h => h.includes('NAME') || h.includes('STUDENT')),
        dob: headers.findIndex(h => h.includes('DOB') || h.includes('BIRTH') || h.includes('DATE')),
        grade: headers.findIndex(h => h.includes('GRADE') || h.includes('CLASS') || h.includes('LEVEL')),
        stream: headers.findIndex(h => h.includes('STREAM') || h.includes('HOUSE') || h.includes('BRANCH')),
        sex: headers.findIndex(h => h.includes('SEX') || h.includes('GENDER')),
        parent: headers.findIndex(h => h.includes('PARENT') || h.includes('GUARDIAN') || h.includes('FATHER') || h.includes('MOTHER')),
        phone: headers.findIndex(h => h.includes('PHONE') || h.includes('CONTACT') || h.includes('MOBILE') || h.includes('TEL')),
        arrears: headers.findIndex(h => h.includes('ARREARS') || h.includes('BAL') || h.includes('DEBT') || h.includes('FEE'))
      };

      // 2. Content-Based Validation (If headers are ambiguous or missing)
      // We check the first data row (usually row 1) to see if content matches the mapped header
      const testRow = lines[1] ? lines[1].split(',').map(c => c.trim().replace(/^"|"$/g, '')) : [];
      
      const isDate = (s) => {
        if (!s || s.length < 6) return false;
        return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s) || /^\d{1,2}(ST|ND|RD|TH)?\s+[A-Z]+\s+\d{4}$/i.test(s);
      };
      const isGrade = (s) => {
        if (!s) return false;
        const clean = s.toUpperCase();
        return /GRADE|PP|CLASS|PRIMARY|JSS|KINDER|FORM|YEAR/i.test(clean) || /^(G|P|Y)\d+$/i.test(clean) || /^\d{1,2}$/.test(clean);
      };
      const isSex = (s) => /^(M|F|MALE|FEMALE)$/i.test(s);
      const isPhone = (s) => /^(\+254|0)?[17]\d{8}$/.test(s.replace(/\s/g, ''));

      // If map.grade and map.dob are swapped or misdetected
      if (testRow.length > 0) {
        headers.forEach((h, idx) => {
          const val = testRow[idx] || '';
          if (isDate(val) && map.dob === -1) map.dob = idx;
          if (isGrade(val) && map.grade === -1) map.grade = idx;
          if (isSex(val) && map.sex === -1) map.sex = idx;
          if (isPhone(val) && map.phone === -1) map.phone = idx;
        });
      }

      // Fallback to template defaults only if still not found
      if (map.adm === -1) map.adm = 0;
      if (map.name === -1) map.name = 1;
      if (map.dob === -1) map.dob = 2;
      if (map.grade === -1) map.grade = 3;
      if (map.stream === -1) map.stream = 4;
      if (map.sex === -1) map.sex = 5;
      if (map.parent === -1) map.parent = 6;
      if (map.phone === -1) map.phone = 7;
      if (map.arrears === -1) map.arrears = 8;

      const isHeader = headers.some(h => ['ADM', 'NAME', 'DOB', 'GRADE', 'SEX', 'STREAM'].some(k => h.includes(k)));
      let startIdx = isHeader ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Final content-aware mapping per row (in case of shifts)
        let rowGrade = cols[map.grade] || '';
        let rowDOB = cols[map.dob] || '';
        
        // Smarter swap if they look reversed or if one is clearly a date
        if ((isGrade(rowDOB) && !isGrade(rowGrade)) || (isDate(rowGrade) && !isDate(rowDOB))) {
          [rowGrade, rowDOB] = [rowDOB, rowGrade];
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
        const choice = confirm(`Detected ${newRows.length} learners. \n\nClick OK to MERGE into current grid (LATEST CSV data wins).\nClick CANCEL to OVERWRITE entire grid.`);
        if (choice) {
          // MERGE: Latest (CSV) wins
          const merged = [...rows.filter(r => r.adm || r.name)];
          for (const nr of newRows) {
            const idx = merged.findIndex(m => (m.adm && m.adm === nr.adm) || (m.name && m.grade === nr.grade && isFuzzyMatch(m.name, nr.name)));
            if (idx !== -1) {
              merged[idx] = { ...merged[idx], ...nr };
            } else {
              merged.push(nr);
            }
          }
          setRows([...merged, ...Array(5).fill(null).map(() => ({...EMPTY_ROW}))]);
        } else {
          // OVERWRITE
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

        // Match by Name (Fuzzy Match)
        const match = gradeLearners.find(l => isFuzzyMatch(l.name, csvName));

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
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteGrade} title="Delete all learners in this grade">
              🗑️ Delete Grade Learners
            </button>
          )}
          <button className="btn btn-gold btn-sm" onClick={deduplicateRows} title="Instantly find and merge students with the same name in this list">
            🪄 Deduplicate & Merge (Safety Check)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={applyGradeToAll} title="Apply this grade and stream to all existing rows">
            🪄 Apply Grade/Stream to All
          </button>

          <div style={{ borderLeft: '1px solid var(--border)', height: 30, margin: '0 8px' }}></div>

          {/* Individual Learner Picker Removed */}
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
