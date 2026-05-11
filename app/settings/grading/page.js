'use client';
export const runtime = 'edge';
/**
 * app/settings/grading/page.js — Adjust grading thresholds
 * Supports:
 *   • Uniform school-wide scale (one scale applied to all grade levels)
 *   • Per-level scale (separate thresholds for Pre/Primary, JSS, Senior)
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedDB } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';

export default function GradingSettingsPage() {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [curriculum, setCurriculum] = useState(null);   // loaded from DB
  const [currModule, setCurrModule] = useState(null);    // the actual JS module
  const [scales, setScales] = useState({});             // { key: [levels] }
  const [gradingMode, setGradingMode] = useState('per-level'); // 'uniform' | 'per-level'
  const [uniformScale, setUniformScale] = useState(null);      // shared scale for uniform mode
  const [loadingStage, setLoadingStage] = useState('Checking authentication...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStage('Authorizing session...');

    // Safety timeout: if it takes > 25s, fail it
    const timer = setTimeout(() => {
      if (loading) setError('The request is taking too long. Please check your connection.');
    }, 25000);

    try {
      // 1. Auth check
      const authRes = await fetch('/api/auth');
      if (!authRes.ok) throw new Error('Authentication service unavailable.');
      const auth = await authRes.json();
      if (!auth.ok || !['admin', 'super-admin'].includes(auth.role)) { router.push('/dashboard'); return; }

      // 2. Load school profile
      setLoadingStage('Loading school profile...');
      const profileRaw = await getCachedDB('paav_school_profile');
      const currName = profileRaw?.curriculum || 'CBC';
      setCurriculum(currName);

      // 3. Get the curriculum module
      const curr = getCurriculum(currName);
      setCurrModule(curr);

      // 4. Load saved grading config
      setLoadingStage('Fetching grading scales...');
      const gradRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav8_grad' },
          { type: 'get', key: 'paav_grading_mode' }
        ]})
      });
      if (!gradRes.ok) throw new Error('Grading database not responding.');
      const gradData = await gradRes.json();
      const cfg = gradData.results?.[0]?.value || {};
      const savedMode = gradData.results?.[1]?.value || 'per-level';
      setGradingMode(savedMode);

      // Build per-level scales
      setLoadingStage('Finalizing layout...');
      const nextScales = {};
      curr.GRADING_CONFIG.forEach(gc => {
        nextScales[gc.key] = (cfg[gc.key] || gc.scale).map(s => ({ ...s }));
      });
      setScales(nextScales);

      // Build uniform scale
      const savedUniform = cfg['uniform'];
      const baseScale = curr.GRADING_CONFIG[0]?.scale || [];
      setUniformScale((savedUniform || baseScale).map(s => ({ ...s })));

    } catch (e) {
      console.error('[Grading] Load failed:', e);
      if (e.name === 'AbortError' || e.message?.includes('aborted')) return;
      setError(`V2 Error: ${e.message || 'Connection timed out.'}`);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [router, loading]);

  useEffect(() => { load(); }, [load]);

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    try {
      const value = gradingMode === 'uniform'
        ? { uniform: uniformScale }
        : scales;

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

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading && !error) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>⚙️</div>
      <p style={{ color: 'var(--muted)', fontSize: 16 }}>{loadingStage}</p>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10, opacity: 0.6 }}>Please wait, this may take a moment on slower connections.</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>❌ {error}</p>
      <button className="btn btn-primary" onClick={load}>↺ Retry</button>
    </div>
  );

  const GRADING_CONFIG = currModule?.GRADING_CONFIG || [];

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>⚖️ Grading Scale Settings</h2>
          <p>Configure score thresholds for {curriculum} curriculum</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={load}>↺ Reset to DB</button>
          <button className="btn btn-primary btn-sm" onClick={save}>💾 Save Changes</button>
        </div>
      </div>

      {saved && (
        <div className="alert alert-ok show" style={{ display: 'flex', marginBottom: 14 }}>
          ✅ Grading scale saved! All report cards and merit lists will reflect the new thresholds immediately.
        </div>
      )}

      <div className="note-box" style={{ marginBottom: 20 }}>
        Changes apply immediately to all marks entry, report cards, and merit lists.
        Lowering a threshold upgrades learners; raising it downgrades them.
      </div>

      {/* ── Mode Toggle ── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hdr"><h3>🎚️ Grading Mode</h3></div>
        <div className="panel-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Choose whether to apply <strong>one uniform scale</strong> across all grade levels,
            or configure <strong>separate scales per level</strong> (e.g., different thresholds for Primary vs. JSS).
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <ModeCard
              active={gradingMode === 'uniform'}
              onClick={() => setGradingMode('uniform')}
              icon="🏫"
              title="Uniform School Scale"
              desc="One grading threshold applies to all grades — simple and consistent."
            />
            <ModeCard
              active={gradingMode === 'per-level'}
              onClick={() => setGradingMode('per-level')}
              icon="📚"
              title="Per-Level Scale"
              desc="Configure separate thresholds for Pre/Primary, Junior, and Senior levels."
            />
          </div>
        </div>
      </div>

      {/* ── Scale Editors ── */}
      {gradingMode === 'uniform' ? (
        uniformScale && (
          <ScaleEditor
            key="uniform"
            scale={uniformScale}
            setScale={setUniformScale}
            title="🏫 Uniform School-Wide Scale (applies to ALL grades)"
          />
        )
      ) : (
        GRADING_CONFIG.map(gc => (
          <ScaleEditor
            key={gc.key}
            scale={scales[gc.key] || []}
            setScale={newScale => setScales(prev => ({ ...prev, [gc.key]: newScale }))}
            title={gc.title}
          />
        ))
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={load}>↺ Reset to DB</button>
        <button className="btn btn-primary" onClick={save}>💾 Save All Grading Settings</button>
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, desc }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: 18, border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 14, cursor: 'pointer', background: active ? 'rgba(var(--primary-rgb,37,99,235),0.05)' : '#fff',
        transition: 'all 0.2s', position: 'relative'
      }}
    >
      {active && (
        <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 14, color: active ? 'var(--primary)' : 'var(--dark)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function ScaleEditor({ scale, setScale, title }) {
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
                  <td>
                    <span className="badge" style={{ background: s.bg, color: s.c }}>{s.lv}</span>
                  </td>
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
                  <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.desc}</td>
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
      style={{ width: 72, padding: '5px 8px', border: '2px solid var(--border)', borderRadius: 6, fontSize: 12, outline: 'none' }}
    />
  );
}
