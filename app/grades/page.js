'use client';
export const runtime = 'edge';
/**
 * app/grades/page.js — CBC Marks Entry & Grading
 *
 * Features:
 *   • Select grade, term, assessment type
 *   • Inline marks entry table (score → auto-computes CBC level + points)
 *   • Lock/unlock marks per assessment (admin only)
 *   • Save marks to Turso via /api/db
 *   • Print / PDF class marks
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMark } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
import { usePersistedState } from '@/components/TabState';
import { getCachedUser, getCachedDBMulti, updateLocalDBCache } from '@/lib/client-cache';
import { addToOutbox } from '@/lib/idb';
import { useProfile } from '@/app/PortalShell';
import { getAllGrades } from '@/lib/cbe';


// Assessments are now fetched from the active curriculum

export default function GradesPage() {
  const router = useRouter();
  const { playSuccessSound, profile: school } = useProfile();
  const [user,     setUser]     = useState(null);

  const [learners, setLearners] = useState([]);
  const [marks,    setMarks]    = useState({});
  const [locked,   setLocked]   = useState({});
  const [pending,  setPending]  = useState({}); // { key: { teacher, ts } }
  const [subjCfg,  setSubjCfg]  = useState({});
  const [streams,  setStreams]  = useState([]);
  const [gradCfg,  setGradCfg]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [alert,    setAlert]    = useState({ msg: '', type: '' });

  const [grade,  setGrade]  = usePersistedState('paav_grades_grade',  '');
  const [stream, setStream] = usePersistedState('paav_grades_stream', '');
  const [term,   setTerm]   = usePersistedState('paav_grades_term',   'T1');
  const [assess, setAssess] = usePersistedState('paav_grades_assess', 'mt1');

  const curr = getCurriculum(school?.curriculum || 'CBC');
  const ALL_GRADES = getAllGrades(school?.curriculum || 'CBC', school);
  const TERMS = curr.TERMS || [{ id: 'T1', name: 'Term 1' }, { id: 'T2', name: 'Term 2' }, { id: 'T3', name: 'Term 3' }];
  const { DEFAULT_SUBJECTS, gInfo, maxPts } = curr;
  const isJSSGrade = curr.isJSSGrade || curr.isSecondary || (() => false);

  useEffect(() => {
    if (!grade && ALL_GRADES.length > 0) {
      setGrade(ALL_GRADES[0]);
    }
  }, [ALL_GRADES, grade, setGrade]);
  
  const [dirtyMarks, setDirtyMarks] = useState([]); // Array of { gsa, adm, score }
  const dirtyMarksRef = useRef([]);
  const loadCountRef = useRef(0);
  useEffect(() => { dirtyMarksRef.current = dirtyMarks; }, [dirtyMarks]);

  /* ── Load data ── */
  const load = useCallback(async () => {
    const myCount = ++loadCountRef.current;
    try {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav6_learners',
          'paav6_marks',
          'paav_marks_locked',
          'paav7_streams',
          'paav8_grad',
          'paav8_subj'
        ])
      ]);

      if (myCount < loadCountRef.current) return; // Abort if newer load started

      if (!u) { router.push('/login'); return; }
      if (!['admin', 'teacher', 'senior_teacher', 'jss_teacher'].includes(u.role)) {
        router.push('/dashboard'); return;
      }
      setUser(u);
      if (u.grade && !grade) setGrade(u.grade);

      setLearners(db.paav6_learners || []);
      
      const rawMarks = db.paav6_marks || {};
      const mergedMarks = { ...rawMarks };
      // Merge unsaved local changes to prevent flickering when cache refreshes
      dirtyMarksRef.current.forEach(m => {
        if (!mergedMarks[m.gsa]) mergedMarks[m.gsa] = {};
        mergedMarks[m.gsa][m.adm] = m.score;
      });
      setMarks(mergedMarks);

      setLocked(  db.paav_marks_locked || {});
      setPending( db.paav_marks_pending || {});
      setStreams( db.paav7_streams  || []);
      setGradCfg( db.paav8_grad     || null);
      setSubjCfg( db.paav8_subj     || {});
    } catch (e) {
      console.error('Grades load error:', e);
    } finally {
      if (myCount === loadCountRef.current) setLoading(false);
    }
  }, [router, grade]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e) => {
      const changed = e.detail?.changed || [];
      if (changed.includes('paav6_marks') || changed.includes('paav_marks_locked')) {
        // Only reload for mark changes from OTHER tabs (dirtyMarks is empty here)
        // Never reload if WE are the ones who just wrote the marks (dirtyMarksRef.current has items)
        if (dirtyMarksRef.current.length === 0) {
          load();
        }
      }
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [load]);

  useEffect(() => {
    const handler = (e) => {
      const changed = e.detail?.changed || [];
      // Reload on external data changes — but NOT paav6_marks (those come from our own setScore calls)
      const networkKeys = ['paav_announcement', 'paav7_streams', 'paav8_grad', 'paav8_subj', 'paav_marks_locked', 'paav_marks_pending'];
      if (changed.some(k => networkKeys.includes(k))) {
        load();
      }
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [load]);

  /* ── Pending approval helpers ── */
  const getPendingKey = (subj) => `${term}:${grade}:${assess}:${subj}`;
  const isSubjPending = (subj) => !!pending[getPendingKey(subj)];

  /* ── Derived ── */
  const classLearners = learners.filter(l => l.grade === grade && (!stream || (l.stream || 'Default') === stream))
    .sort((a, b) => a.name.localeCompare(b.name));
  const gradeStreams = streams.filter(s => s.grade === grade);
  const subjects      = (subjCfg[grade] && subjCfg[grade].length > 0) ? subjCfg[grade] : (DEFAULT_SUBJECTS[grade] || []);
  const getLockKey = (subj) => `${term}:${grade}:${assess}:${subj}`;
  const isSubjLocked = (subj) => !!locked[getLockKey(subj)] || !!locked[`${term}:${grade}:${assess}`];
  const isLocked      = !!locked[`${term}:${grade}:${assess}`];

  /* ── Score change ── */
  const cacheTimerRef = useRef(null);
  function setScore(admNo, subj, value) {
    if (isSubjLocked(subj) && user?.role !== 'admin') return;
    const gsa = `${term}:${grade}|${subj}|${assess}`;
    const score = value === '' ? undefined : Number(value);
    
    const nextMark = { gsa, adm: admNo, score };

    // 1. Update Ref and State FIRST (used by load() to prevent flickering)
    const nextDirty = [...dirtyMarksRef.current.filter(m => !(m.gsa === gsa && m.adm === admNo)), nextMark];
    dirtyMarksRef.current = nextDirty;
    setDirtyMarks(nextDirty);
    
    // 2. Update local UI state
    let nextMarks;
    setMarks(prev => {
      nextMarks = {
        ...prev,
        [gsa]: { ...(prev[gsa] || {}), [admNo]: score },
      };
      return nextMarks;
    });

    // 3. Persist to cache (debounced to avoid heavy JSON ops on every keystroke)
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
    cacheTimerRef.current = setTimeout(() => {
      updateLocalDBCache('paav6_marks', nextMarks);
    }, 1000);
  }

  function getScore(admNo, subj) {
    const key = `${term}:${grade}|${subj}|${assess}`;
    return marks[key]?.[admNo];
  }

  /* ── Auto-save (Sync immediately) ── */
  useEffect(() => {
    if (loading || saving || dirtyMarks.length === 0) return;
    const timer = setTimeout(() => {
      save(true); 
    }, 800);
    return () => clearTimeout(timer);
  }, [dirtyMarks, loading, saving]);

  /* ── Save ── */
  async function save(isAuto = false) {
    const marksToSync = [...dirtyMarks];
    if (marksToSync.length === 0 && isAuto) return;

    setSaving(true);
    if (!isAuto) setManualSaving(true);
    
    let nextLocked = locked;
    const reqs = [];
    
    if (marksToSync.length > 0) {
      reqs.push({ type: 'updateMarksBulk', marks: marksToSync });
    }
    
    // Teachers NO LONGER auto-lock. They submit for approval instead.
    // Admin can still manually lock/unlock via the toggle.
    if (reqs.length === 0) {
      if (!isAuto) setSaving(false);
      return;
    }

    try {
      const start = Date.now();
      const res = await fetch('/api/db', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requests: reqs }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Clear dirty marks that were successfully synced (deep check)
      const remainingDirty = dirtyMarksRef.current.filter(m => !marksToSync.some(ms => ms.gsa === m.gsa && ms.adm === m.adm));
      dirtyMarksRef.current = remainingDirty;
      setDirtyMarks(remainingDirty);

      // CRITICAL: Update local cache with confirmed state to ensure load() gets fresh data
      setMarks(current => {
        updateLocalDBCache('paav6_marks', current);
        return current;
      });

      if (!isAuto) {
        // Ensure "Saving..." is visible for at least 600ms
        const elapsed = Date.now() - start;
        if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

        playSuccessSound();
        setJustSaved(true);
        setAlert({ msg: '✅ Marks saved! Use "Submit for Approval" when done.', type: 'ok' });
        setTimeout(() => {
          setAlert({ msg: '', type: '' });
          setJustSaved(false);
        }, 5000);
      }
    } catch (e) {
      console.warn('[Grades] Save failed, queuing in outbox:', e.message);
      await addToOutbox({ 
        url: '/api/db', 
        method: 'POST', 
        body: { requests: reqs } 
      });
      setDirtyMarks(prev => prev.filter(m => !marksToSync.includes(m)));
      
      if (!isAuto) {
        setAlert({ msg: '📵 Offline: Marks saved locally and will sync when online.', type: 'warn' });
        setTimeout(() => setAlert({ msg: '', type: '' }), 5000);
      }
    } finally {
      setSaving(false);
      setManualSaving(false);
    }
  }

  /* ── Submit for approval (teacher) ── */
  async function submitForApproval() {
    const subjsInView = subjects;
    const newPending = { ...pending };
    let changed = false;
    subjsInView.forEach(s => {
      const key = getPendingKey(s);
      if (!locked[getLockKey(s)]) {
        newPending[key] = { teacher: user.name || user.username, ts: Date.now() };
        changed = true;
      }
    });
    if (!changed) {
      setAlert({ msg: 'These marks are already locked or have no changes.', type: 'err' });
      return;
    }
    setPending(newPending);
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_marks_pending', value: newPending }] })
    });
    setAlert({ msg: '📨 Submitted for admin approval! Your marks remain editable until approved.', type: 'ok' });
    setTimeout(() => setAlert({ msg: '', type: '' }), 5000);
  }

  /* ── Admin: approve or reject pending ── */
  async function approveSubject(subj) {
    const key = getLockKey(subj);
    const pKey = getPendingKey(subj);
    const newLocked = { ...locked, [key]: true };
    const newPending = { ...pending };
    delete newPending[pKey];
    setSaving(true);
    setLocked(newLocked);
    setPending(newPending);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav_marks_locked', value: newLocked },
          { type: 'set', key: 'paav_marks_pending', value: newPending }
        ]})
      });
      setAlert({ msg: `✅ ${subj} marks approved and locked.`, type: 'ok' });
      setTimeout(() => setAlert({ msg: '', type: '' }), 3000);
    } catch (e) {
      setAlert({ msg: 'Failed to approve marks. Please try again.', type: 'err' });
    } finally {
      setSaving(false);
    }
  }

  async function rejectSubject(subj) {
    const pKey = getPendingKey(subj);
    const newPending = { ...pending };
    delete newPending[pKey];
    setSaving(true);
    setPending(newPending);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_marks_pending', value: newPending }] })
      });
      setAlert({ msg: `❌ ${subj} marks sent back to teacher for correction.`, type: 'warn' });
      setTimeout(() => setAlert({ msg: '', type: '' }), 4000);
    } catch (e) {
      setAlert({ msg: 'Failed to reject marks.', type: 'err' });
    } finally {
      setSaving(false);
    }
  }

  /* ── Lock toggle (admin only) ── */
  async function toggleLock() {
    const key = `${term}:${grade}:${assess}`;
    const next = { ...locked, [key]: !isLocked };
    setLocked(next);
    await fetch('/api/db', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requests: [
        { type: 'set', key: 'paav_marks_locked', value: next },
      ]}),
    });
  }

  /* ── Clear marks ── */
  async function clearAllInView() {
    if (isLocked && user?.role !== 'admin') {
      alert('Marks are locked. Only admin can clear.');
      return;
    }
    if (!confirm(`Are you sure you want to PERMANENTLY CLEAR ALL MARKS for ${grade} ${term} ${assess}? This cannot be undone.`)) return;
    
    setSaving(true);
    try {
      const updates = [];
      const currentMarks = { ...marks };
      
      for (const subj of subjects) {
        const gsa = `${term}:${grade}|${subj}|${assess}`;
        for (const l of classLearners) {
          updates.push({ gsa, adm: l.adm, score: undefined });
          if (currentMarks[gsa]) delete currentMarks[gsa][l.adm];
        }
      }
      
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'updateMarksBulk', marks: updates }] })
      });
      
      setMarks(currentMarks);
      setDirtyMarks([]);
      setAlert({ msg: '🗑️ All marks in this view cleared!', type: 'ok' });
      setTimeout(() => setAlert({ msg: '', type: '' }), 3000);
    } catch (e) {
      alert('Failed to clear marks: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearLearnerMarks(l) {
    if (isLocked && user?.role !== 'admin') {
      alert('Marks are locked.');
      return;
    }
    if (!confirm(`Clear all marks for ${l.name} in this assessment?`)) return;
    
    setSaving(true);
    try {
      const updates = [];
      const currentMarks = { ...marks };
      
      for (const subj of subjects) {
        const gsa = `${term}:${grade}|${subj}|${assess}`;
        updates.push({ gsa, adm: l.adm, score: undefined });
        if (currentMarks[gsa]) delete currentMarks[gsa][l.adm];
      }
      
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'updateMarksBulk', marks: updates }] })
      });
      
      setMarks(currentMarks);
      // Remove from dirty if present
      setDirtyMarks(prev => prev.filter(m => m.adm !== l.adm || !m.gsa.includes(`${term}:${grade}`)));
      setAlert({ msg: `🗑️ Marks for ${l.name} cleared!`, type: 'ok' });
      setTimeout(() => setAlert({ msg: '', type: '' }), 3000);
    } catch (e) {
      alert('Failed to clear marks: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── Grade scale pills ── */
  const scale = curr.getScale ? curr.getScale(grade, gradCfg) : [];

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading marks…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2>📊 Marks Entry</h2>
          {saving ? (
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>☁️ Syncing...</span>
          ) : dirtyMarks.length > 0 ? (
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>⏳ Pending sync...</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, opacity: 0.7 }}>✅ Synced</span>
          )}
        </div>
        <p>{curr.name} — {grade}</p>
        <div className="page-hdr-acts">
          {user?.role === 'admin' && (
            <button
              className={`btn btn-sm ${isLocked ? 'btn-success' : 'btn-danger'}`}
              onClick={toggleLock}>
              {isLocked ? '🔓 Unlock All' : '🔒 Lock All'}
            </button>
          )}
          {user?.role !== 'admin' && (
            <button className="btn btn-warning btn-sm" onClick={submitForApproval}>
              📨 Submit for Approval
            </button>
          )}
          <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>
            🖨️ Print
          </button>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={clearAllInView} disabled={saving}>
              🗑️ Clear All
            </button>
          )}
          <button className={`btn btn-sm ${justSaved ? 'btn-success' : 'btn-primary'}`} onClick={() => save()} disabled={saving}>
            {manualSaving ? '⏳ Saving…' : justSaved ? '✅ Saved!' : '💾 Save Marks'}
          </button>
        </div>
      </div>

      {/* ── Alert ── */}
      {alert.msg && (
        <div className={`alert show alert-${alert.type}`} style={{ display: 'flex', marginBottom: 14 }}>
          {alert.msg}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Grade</label>
            <select value={grade} onChange={e => { setGrade(e.target.value); setStream(''); }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          {gradeStreams.length > 0 && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Stream</label>
              <select value={stream} onChange={e => setStream(e.target.value)}>
                <option value="">All Streams</option>
                {gradeStreams.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)}>
              {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Assessment</label>
            <select value={assess} onChange={e => setAssess(e.target.value)}>
              {(curr.ASSESSMENT_TYPES || []).map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>

          {isLocked && (
            <div style={{ padding: '8px 14px',
              background: user?.role === 'admin' ? '#ECFDF5' : '#FEF2F2',
              borderRadius: 8, fontSize: 12,
              color: user?.role === 'admin' ? 'var(--green)' : 'var(--red)',
              fontWeight: 700,
              border: `1.5px solid ${user?.role === 'admin' ? '#A7F3D0' : '#FECACA'}`,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              {user?.role === 'admin'
                ? '🔓 Locked — Admin override active (your edits will save)'
                : '🔒 Marks locked — contact admin to unlock'}
            </div>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {classLearners.length} learner{classLearners.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Admin: pending approval panel */}
        {user?.role === 'admin' && subjects.some(s => isSubjPending(s)) && (
          <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10, margin: '10px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#92400E', marginBottom: 8 }}>⏳ Pending Approval Requests</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {subjects.filter(s => isSubjPending(s)).map(s => (
                <div key={s} style={{ background: '#fff', border: '1.5px solid #FCD34D', borderRadius: 8, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{s}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>by {pending[getPendingKey(s)]?.teacher}</span>
                  <button className="btn btn-success btn-xs" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => approveSubject(s)}>✅ Approve</button>
                  <button className="btn btn-danger btn-xs" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => rejectSubject(s)}>❌ Reject</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade scale bar */}
        <div className="grading-scale-bar">
          <span className="gs-label">{curr.name} Scale:</span>
          {scale.map(s => (
            <span key={s.lv} className="grade-item-pill"
              style={{ background: s.bg, color: s.c }}>
              {s.lv} ({s.min}+ → {s.pts}pts)
            </span>
          ))}
        </div>
      </div>

      {/* ── Marks table ── */}
      {classLearners.length === 0 ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
            No learners enrolled in {grade}.{' '}
            <button className="btn-link" onClick={() => router.push('/learners')}>
              Add learners →
            </button>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 32 }}>#</th>
                  <th style={{ minWidth: 60 }}>Adm</th>
                  <th style={{ minWidth: 140 }}>Name</th>
                  {subjects.map(s => (
                    <th key={s} style={{ minWidth: 68, textAlign: 'center', fontSize: 9 }}
                      title={s}>
                      {s.length > 8 ? s.slice(0, 8) + '…' : s}
                    </th>
                  ))}
                  <th style={{ minWidth: 60, textAlign: 'center' }}>Pts</th>
                  <th style={{ minWidth: 52, textAlign: 'center' }}>Max</th>
                  <th style={{ minWidth: 52, textAlign: 'center' }}>%</th>
                  <th style={{ minWidth: 40 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {classLearners.map((l, i) => {
                  let totalPts  = 0;
                  let entered   = 0;
                  const maxTotal = maxPts(grade, subjects);

                  return (
                    <tr key={l.adm}>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700, fontSize: 11.5 }}>{l.adm}</td>
                      <td style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{l.name}</td>

                      {subjects.map(subj => {
                        const sc  = getScore(l.adm, subj);
                        const inf = sc !== undefined ? gInfo(Number(sc), grade, gradCfg) : null;
                        if (inf) { totalPts += inf.pts; entered++; }
                        return (
                          <td key={subj} style={{ padding: '4px 5px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: 2 }}>
                              <input
                                type="number"
                                min="0" max="100"
                                value={sc ?? ''}
                                onChange={e => setScore(l.adm, subj, e.target.value)}
                                onBlur={() => save(true)}
                                disabled={isSubjLocked(subj) && user?.role !== 'admin'}
                                title={isSubjLocked(subj) && user?.role === 'admin' ? 'Admin override — you can edit' : ''}
                                style={{
                                  width: 48, textAlign: 'center',
                                  border: `1.5px solid ${
                                    isSubjLocked(subj) && user?.role === 'admin' ? '#059669'  // green = admin override
                                    : inf ? inf.c
                                    : 'var(--border)'
                                  }`,
                                  borderRadius: 6, padding: '3px 4px', fontSize: 11.5, outline: 'none',
                                  background: isSubjLocked(subj) && user?.role !== 'admin'
                                    ? '#F1F5F9'                          // grey = locked for teacher
                                    : isSubjLocked(subj) ? '#ECFDF5'              // light green = admin override
                                    : '#fff',
                                  cursor: isSubjLocked(subj) && user?.role !== 'admin' ? 'not-allowed' : 'text',
                                }}
                              />
                              {inf && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: inf.c,
                                  background: inf.bg, borderRadius: 4, padding: '1px 5px' }}>
                                  {inf.lv}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13,
                        color: entered > 0 ? 'var(--navy)' : 'var(--muted)' }}>
                        {entered > 0 ? totalPts : '—'}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                        {maxTotal}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 11.5,
                        color: entered > 0
                          ? totalPts / maxTotal >= 0.5 ? 'var(--green)' : 'var(--red)'
                          : 'var(--muted)' }}>
                        {entered > 0 ? Number(((totalPts / maxTotal) * 100).toFixed(2)) + '%' : '—'}
                      </td>
                      <td className="no-print">
                        <button className="btn btn-ghost btn-xs" 
                          style={{ color: 'var(--red)', padding: '2px 4px' }}
                          title="Clear marks for this learner"
                          onClick={() => clearLearnerMarks(l)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel-footer no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', background: '#f8fafc', borderTop: '1.5px solid var(--border)', borderRadius: '0 0 12px 12px' }}>
            {user?.role === 'admin' && (
              <button className="btn btn-danger" onClick={clearAllInView} disabled={saving}>
                🗑️ Clear This Assessment
              </button>
            )}
            <button className={`btn ${justSaved ? 'btn-success' : 'btn-primary'}`} onClick={() => save()} disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
              {saving ? '⏳ Saving…' : justSaved ? '✅ Marks Saved Successfully' : '💾 Save All Marks Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
