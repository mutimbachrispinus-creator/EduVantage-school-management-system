'use client';
/**
 * app/settings/subjects/page.js — Subjects Configuration
 *
 * Allows admins to manage the list of subjects per grade level.
 * Persists to 'paav8_subj' in Turso KV.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurriculum } from '@/lib/curriculum';
import { readSchoolProfile } from '@/lib/school-profile';

function SubjectsContent() {
  const router = useRouter();
  const [subjCfg, setSubjCfg] = useState({});
  const [selectedGrade, setSelectedGrade] = useState('');
  const [newSubj, setNewSubj] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [curr, setCurr] = useState(getCurriculum('CBC'));

  const load = useCallback(async () => {
    try {
      const profile = readSchoolProfile() || {};
      const c = getCurriculum(profile.curriculum || 'CBC');
      setCurr(c);
      setSelectedGrade(prev => prev || c.ALL_GRADES[0]);

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'get', key: 'paav8_subj' }] })
      });
      const data = await res.json();
      const cfg = data.results[0]?.value || {};
      
      // Merge with defaults from the CURRENT curriculum if missing
      const merged = { ...c.DEFAULT_SUBJECTS };
      Object.keys(cfg).forEach(k => { if(cfg[k]) merged[k] = cfg[k]; });
      
      setSubjCfg(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(newCfg) {
    setSaving(true);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ type: 'set', key: 'paav8_subj', value: newCfg }]
        })
      });
      setMsg({ type: 'success', text: 'Subjects updated successfully!' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  }

  function addSubject() {
    if (!newSubj.trim()) return;
    const current = subjCfg[selectedGrade] || [];
    if (current.includes(newSubj.trim())) {
      alert('Subject already exists for this grade.');
      return;
    }
    const updated = { ...subjCfg, [selectedGrade]: [...current, newSubj.trim()] };
    setSubjCfg(updated);
    setNewSubj('');
    save(updated);
  }

  function removeSubject(s) {
    if (!confirm(`Remove "${s}" from ${selectedGrade}?`)) return;
    const updated = {
      ...subjCfg,
      [selectedGrade]: (subjCfg[selectedGrade] || []).filter(x => x !== s)
    };
    setSubjCfg(updated);
    save(updated);
  }

  function importDefaults() {
    if (!confirm(`This will import the standard ${curr.curriculum || 'system'} subjects for ${selectedGrade}. Existing subjects for this grade will be kept. Proceed?`)) return;
    const defaults = curr.DEFAULT_SUBJECTS[selectedGrade] || [];
    const current = subjCfg[selectedGrade] || [];
    const combined = Array.from(new Set([...current, ...defaults]));
    const updated = { ...subjCfg, [selectedGrade]: combined };
    setSubjCfg(updated);
    save(updated);
  }

  if (loading) return <div className="page on"><p>Loading configuration...</p></div>;

  const currentList = subjCfg[selectedGrade] || [];

  return (
    <div className="page on" id="pg-settings-subjects">
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/settings" className="btn btn-ghost btn-sm">← Back</Link>
          <div>
            <h2>📚 {curr.LABELS?.subjects || 'Subjects'} Configuration</h2>
            <p>System: <strong style={{color:'var(--primary)'}}>{curr.curriculum || 'Standard'}</strong> — Define {curr.LABELS?.subjects?.toLowerCase() || 'subjects'} for each {curr.LABELS?.grade?.toLowerCase() || 'level'}</p>
          </div>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-ghost btn-sm" onClick={importDefaults}>📥 Import {curr.curriculum} {curr.LABELS?.subjects || 'Subjects'}</button>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      <div className="sg sg2">
        <div className="panel">
          <div className="panel-hdr"><h3>{curr.LABELS?.grade || 'Grade'} Level</h3></div>
          <div className="panel-body">
            <div className="grade-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {curr.ALL_GRADES.map(g => (
                <button
                  key={g}
                  className={`btn ${selectedGrade === g ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => setSelectedGrade(g)}
                >
                  {g}
                  <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
                    {(subjCfg[g] || []).length} {curr.LABELS?.subjects === 'Learning Areas' ? 'areas' : 'subs'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <h3>{curr.LABELS?.subjects || 'Subjects'} for {selectedGrade}</h3>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                className="f-input"
                placeholder={`New ${curr.LABELS?.subject?.toLowerCase() || 'subject'} name...`}
                value={newSubj}
                onChange={e => setNewSubj(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubject()}
              />
              <button className="btn btn-primary" onClick={addSubject} disabled={saving}>
                {saving ? '...' : 'Add'}
              </button>
            </div>

            <div className="subj-grid" style={{ display: 'grid', gap: 8 }}>
              {currentList.length === 0 && <p style={{ opacity: 0.5 }}>No {curr.LABELS?.subjects?.toLowerCase() || 'subjects'} defined for this {curr.LABELS?.grade?.toLowerCase() || 'grade'}.</p>}
              {currentList.map(s => (
                <div key={s} className="assign-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFF', borderRadius: 8, border: '1.5px solid var(--border)' }}>
                  <span style={{ fontWeight: 600 }}>{s}</span>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: 4 }} onClick={() => removeSubject(s)}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <Suspense fallback={<div className="page on"><p>Loading Subjects...</p></div>}>
      <SubjectsContent />
    </Suspense>
  );
}
