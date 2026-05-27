'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedDB } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';

export default function GradingSettingsPage() {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [curriculum, setCurriculum] = useState('CBC');
  const [currModule, setCurrModule] = useState(null);
  const [scales, setScales] = useState({});
  const [gradingMode, setGradingMode] = useState('per-level');
  const [uniformScale, setUniformScale] = useState(null);
  const [subjectScales, setSubjectScales] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectLevel, setSelectedSubjectLevel] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labels, setLabels] = useState({ grade: 'Grade', grades: 'Grades', subject: 'Subject', subjects: 'Subjects' });

  // ─── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Auth check
      const authRes = await fetch('/api/auth');
      if (!authRes.ok) throw new Error('Authentication failed.');
      const auth = await authRes.json();
      if (!auth.ok || !auth.user || !['admin', 'super-admin'].includes(auth.user.role)) {
        router.push('/dashboard');
        return;
      }

      // 2. Load school profile
      const profileRaw = await getCachedDB('paav_school_profile');
      const currName = profileRaw?.curriculum || 'CBC';
      setCurriculum(currName);

      // 3. Get curriculum module
      const curr = getCurriculum(currName);
      setCurrModule(curr);
      const labels = curr.LABELS || { grade: 'Grade', grades: 'Grades', subject: 'Subject', subjects: 'Subjects' };
      setLabels(labels);

      // 4. Load saved grading config
      const gradRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav8_grad' },
          { type: 'get', key: 'paav_grading_mode' }
        ]})
      });
      if (!gradRes.ok) throw new Error('Could not reach database.');
      const gradData = await gradRes.json();
      
      const cfg = gradData.results?.[0]?.value || {};
      const savedMode = gradData.results?.[1]?.value || 'per-level';
      setGradingMode(savedMode);

      // Build per-level scales
      const nextScales = {};
      if (curr && curr.GRADING_CONFIG) {
        curr.GRADING_CONFIG.forEach(gc => {
          nextScales[gc.key] = (cfg[gc.key] || gc.scale).map(s => ({ ...s }));
        });
      }
      setScales(nextScales);

      // Build uniform scale
      const savedUniform = cfg['uniform'];
      const baseScale = curr?.GRADING_CONFIG?.[0]?.scale || [];
      setUniformScale((savedUniform || baseScale).map(s => ({ ...s })));

      // Build subject scales
      const savedSubjects = cfg['subjects'] || {};
      setSubjectScales(savedSubjects);

    } catch (e) {
      console.error('[Grading] Load error:', e);
      if (e.name !== 'AbortError') {
        setError(e.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    try {
      const value = {
        ...scales,
        uniform: uniformScale,
        subjects: subjectScales
      };

      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav8_grad', value },
          { type: 'set', key: 'paav_grading_mode', value: gradingMode }
        ]}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('❌ Failed to save: ' + e.message);
    }
  }

  if (loading && !error) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>⚙️</div>
      <p style={{ color: 'var(--muted)', fontSize: 16 }}>Syncing grading configuration...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>❌ {error}</p>
      <button className="btn btn-primary" onClick={load}>↺ Try Again</button>
    </div>
  );

  const GRADING_CONFIG = currModule?.GRADING_CONFIG || [];
  
  // Extract all unique subjects
  const allSubjects = [];
  if (currModule?.DEFAULT_SUBJECTS) {
    Object.values(currModule.DEFAULT_SUBJECTS).forEach(list => {
      list.forEach(s => { if (!allSubjects.includes(s)) allSubjects.push(s); });
    });
    allSubjects.sort();
  }

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>⚖️ Grading Scale Settings</h2>
          <p>Configure score thresholds for {curriculum} curriculum</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={load}>↺ Reset</button>
          <button className="btn btn-primary btn-sm" onClick={save}>💾 Save Changes</button>
        </div>
      </div>

      {saved && (
        <div className="alert alert-ok show" style={{ display: 'flex', marginBottom: 14 }}>
          ✅ Grading scale saved successfully!
        </div>
      )}

      <div className="note-box" style={{ marginBottom: 20 }}>
        Adjustments apply to all report cards and merit lists instantly.
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hdr"><h3>🎚️ Grading Mode</h3></div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { id: 'uniform', icon: '🏫', title: 'Uniform Scale', desc: 'Single grading scale across the entire school.' },
              { id: 'per-level', icon: '📚', title: `Per-${labels.grade}`, desc: `Different scales for Pre-Primary, Primary, and Junior School.` },
              { id: 'per-subject', icon: '📖', title: `Per-${labels.subject}`, desc: `Configure specific scales for unique subjects like Languages or Sciences.` }
            ].map(m => (
              <ModeCard
                key={m.id}
                active={gradingMode === m.id}
                onClick={() => setGradingMode(m.id)}
                icon={m.icon}
                title={m.title}
                desc={m.desc}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ transition: 'all 0.4s ease-in-out', opacity: loading ? 0.5 : 1 }}>

      {gradingMode === 'uniform' && uniformScale && (
        <ScaleEditor
          key="uniform"
          scale={uniformScale}
          setScale={setUniformScale}
          title="Uniform School-Wide Scale"
        />
      )}

      {gradingMode === 'per-level' && (
        GRADING_CONFIG.map(gc => (
          <ScaleEditor
            key={gc.key}
            scale={scales[gc.key] || []}
            setScale={newScale => setScales(prev => ({ ...prev, [gc.key]: newScale }))}
            title={gc.title}
          />
        ))
      )}

      {gradingMode === 'per-subject' && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-hdr"><h3>📚 Subject-Specific Configuration</h3></div>
          <div className="panel-body">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Select a subject and then choose the academic level to configure its specific scale.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>1. Select Subject</label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="">-- Choose a Subject --</option>
                  {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {selectedSubject && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>2. Select Level</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {GRADING_CONFIG.map(gc => (
                      <button
                        key={gc.key}
                        className={`btn btn-xs ${selectedSubjectLevel === gc.key ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSelectedSubjectLevel(gc.key)}
                        style={{ flex: 1, border: '1px solid var(--border)' }}
                      >
                        {gc.key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedSubject && selectedSubjectLevel && (
              <ScaleEditor
                key={`${selectedSubject}-${selectedSubjectLevel}`}
                scale={subjectScales[selectedSubject]?.[selectedSubjectLevel] || currModule?.GRADING_CONFIG?.find(g => g.key === selectedSubjectLevel)?.scale || []}
                setScale={newScale => setSubjectScales(prev => ({
                  ...prev,
                  [selectedSubject]: {
                    ...(prev[selectedSubject] || {}),
                    [selectedSubjectLevel]: newScale
                  }
                }))}
                title={`${selectedSubject} — ${selectedSubjectLevel.toUpperCase()} Scale`}
              />
            )}
          </div>
        </div>
      )}
      </div>

      <style>{`
        .mode-card-item:hover {
          border-color: var(--primary) !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 24px -10px rgba(139, 26, 26, 0.2) !important;
        }
      `}</style>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, desc }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        border: `2px solid ${active ? 'var(--primary)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        background: active ? '#FFF1F1' : '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.02)' : 'scale(1)',
        boxShadow: active ? '0 8px 16px -4px rgba(139, 26, 26, 0.12)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      className="mode-card-item"
    >
      {active && <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 14 }}>✅</div>}
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: active ? 'var(--primary)' : '#1E293B', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, flex: 1 }}>{desc}</div>
    </div>
  );
}

function ScaleEditor({ scale, setScale, title }) {
  if (!Array.isArray(scale)) return null;
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-hdr"><h3>{title}</h3></div>
      <div className="panel-body">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th>Min Score (%)</th>
                <th>Points</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {scale.map((s, i) => (
                <tr key={s.lv}>
                  <td><span className="badge" style={{ background: s.bg, color: s.c }}>{s.lv}</span></td>
                  <td>
                    <InputWrapper
                      val={s.min}
                      onCommit={v => {
                        const updated = [...scale];
                        updated[i] = { ...s, min: v };
                        setScale(updated);
                      }}
                    />
                  </td>
                  <td style={{ fontWeight: 700 }}>{s.pts}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InputWrapper({ val, onCommit }) {
  const [local, setLocal] = useState(val);
  useEffect(() => { setLocal(val); }, [val]);
  return (
    <input
      type="number"
      value={local}
      min="0" max="100"
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(Number(local))}
      style={{ width: 60, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
    />
  );
}
