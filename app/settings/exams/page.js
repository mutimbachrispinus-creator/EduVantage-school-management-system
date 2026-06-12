'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';
import { useSchoolProfile } from '@/lib/school-profile';
import { getCurriculum } from '@/lib/curriculum';

const NAVY = '#0F172A';
const SLATE = '#64748B';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

export default function CustomExamsPage() {
  const router = useRouter();
  const school = useSchoolProfile();
  const curr = useMemo(() => getCurriculum(school?.curriculum || 'CBC', school?.levels), [school?.curriculum]);
  const builtIn = useMemo(() => curr.ASSESSMENT_TYPES || [], [curr]);

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [custom, setCustom]   = useState([]); // [{ key, label, weight }]
  const [newLabel, setNewLabel] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk]   = useState('');

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u || !['admin', 'super-admin'].includes(u.role)) {
        router.push('/dashboard');
        return;
      }
      setUser(u);

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'get', key: 'paav_custom_exams' }] })
      });
      const data = await res.json();
      const val = data.results?.[0]?.value;
      setCustom(Array.isArray(val) ? val : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function save(updated) {
    setSaving(true);
    setErr(''); setOk('');
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_custom_exams', value: updated }] })
      });
      const data = await res.json();
      if (data.results?.[0]?.ok) {
        setOk('✅ Custom exams saved!');
        setTimeout(() => setOk(''), 4000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      setErr('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function addExam() {
    const label = newLabel.trim();
    if (!label) { setErr('Please enter an exam name'); return; }
    const key = slugify(label);
    if (!key) { setErr('Invalid exam name'); return; }
    const allKeys = [...builtIn.map(a => a.key), ...custom.map(c => c.key)];
    if (allKeys.includes(key)) { setErr(`Key "${key}" already exists — try a different name`); return; }
    const weight = newWeight ? Number(newWeight) / 100 : null;
    const updated = [...custom, { key, label, weight }];
    setCustom(updated);
    setNewLabel('');
    setNewWeight('');
    setErr('');
    save(updated);
  }

  function removeExam(key) {
    const updated = custom.filter(c => c.key !== key);
    setCustom(updated);
    save(updated);
  }

  function updateWeight(key, val) {
    const updated = custom.map(c => c.key === key ? { ...c, weight: val ? Number(val) / 100 : null } : c);
    setCustom(updated);
  }

  function saveWeights() {
    save(custom);
  }

  if (loading) return <div className="page on"><p style={{ padding: 40, color: 'var(--muted)' }}>Loading exam settings…</p></div>;

  return (
    <div className="page on" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="page-hdr" style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff', padding: '30px 40px', borderRadius: '0 0 24px 24px', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ color: '#fff', padding: 10 }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>📝 Custom Exams Configuration</h1>
            <p style={{ color: '#94A3B8', margin: '5px 0 0 0' }}>
              Manage school-specific assessments beyond the built-in <strong>{school?.curriculum || 'CBC'}</strong> types.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 40px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Built-in exams (read-only) */}
        <div className="panel" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, color: NAVY }}>
            📚 Built-in {school?.curriculum || 'CBC'} Assessment Types
          </h2>
          <p style={{ color: SLATE, fontSize: 13, margin: '0 0 16px' }}>
            These are part of the {school?.curriculum || 'CBC'} curriculum standard. They cannot be removed.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {builtIn.map(a => (
              <div key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 12,
                background: '#EFF6FF', border: '1.5px solid #BFDBFE',
                fontSize: 13, fontWeight: 700, color: '#1D4ED8'
              }}>
                <span>{a.label}</span>
                <span style={{ fontSize: 10, color: '#60A5FA', background: '#DBEAFE', padding: '2px 7px', borderRadius: 8 }}>
                  key: {a.key}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>🔒 Built-in</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom exams */}
        <div className="panel" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, color: NAVY }}>➕ Custom Exams</h2>
          <p style={{ color: SLATE, fontSize: 13, margin: '0 0 16px' }}>
            Add school-specific assessments (e.g. "Mock Exam", "CAT 1", "Project Work"). These will appear in marks entry, report cards, and the assessment weights page.
          </p>

          {err && <div className="alert alert-err show" style={{ marginBottom: 12 }}>{err}</div>}
          {ok  && <div className="alert alert-ok  show" style={{ marginBottom: 12 }}>{ok}</div>}

          {/* Add new */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
            <div className="field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label>Exam Name / Label</label>
              <input
                value={newLabel}
                onChange={e => { setNewLabel(e.target.value); setErr(''); }}
                placeholder="e.g. Mock Exam, CAT 1, Project Work"
                onKeyDown={e => e.key === 'Enter' && addExam()}
              />
            </div>
            <div className="field" style={{ marginBottom: 0, width: 130 }}>
              <label>Default Weight % (optional)</label>
              <input
                type="number" min="0" max="100" step="1"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={addExam}
              disabled={saving}
              style={{ alignSelf: 'flex-end', padding: '10px 20px' }}
            >
              {saving ? '⏳' : '➕ Add Exam'}
            </button>
          </div>

          {/* Custom exam list */}
          {custom.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: SLATE, fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              No custom exams configured yet. Add your first one above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {custom.map((c, idx) => (
                <div key={c.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: idx % 2 === 0 ? '#F8FAFC' : '#fff',
                  border: '1.5px solid #E2E8F0'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>
                      key: <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>{c.key}</code>
                      {c.isCustom && <span style={{ marginLeft: 8, color: '#059669', fontWeight: 700 }}>⚙️ Custom</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: SLATE, fontWeight: 700, margin: 0 }}>Weight %</label>
                    <input
                      type="number" min="0" max="100" step="1"
                      value={c.weight !== null && c.weight !== undefined ? (c.weight * 100).toFixed(0) : ''}
                      onChange={e => updateWeight(c.key, e.target.value)}
                      style={{ width: 70, padding: '6px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, textAlign: 'right' }}
                      placeholder="auto"
                    />
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeExam(c.key)}
                    disabled={saving}
                    title="Remove this custom exam"
                  >
                    🗑️ Remove
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={saveWeights}
                  disabled={saving}
                >
                  {saving ? '⏳ Saving…' : '💾 Save Weight Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 18px', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
          <strong>💡 How custom exams work:</strong> Custom exam keys are used when entering marks (e.g. <code>T1:GRADE 7|Mathematics|cat1</code>). They appear in report cards and the assessment weights page automatically. Removing a custom exam does <strong>not</strong> delete already-entered marks — it just hides the exam from the UI.
        </div>
      </div>
    </div>
  );
}
