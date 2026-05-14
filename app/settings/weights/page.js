'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';
import { useSchoolProfile } from '@/lib/school-profile';
import { getCurriculum } from '@/lib/curriculum';

const NAVY = '#0F172A';
const SLATE = '#64748B';

export default function WeightsSettingsPage() {
  const router = useRouter();
  const school = useSchoolProfile();
  const curr = useMemo(() => getCurriculum(school?.curriculum || 'CBC'), [school?.curriculum]);
  const assessments = useMemo(() => curr.ASSESSMENT_TYPES || [], [curr]);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Default weights based on curriculum
  const defaultWeights = useMemo(() => {
    const w = {};
    assessments.forEach(a => {
      w[a.key] = (100 / assessments.length).toFixed(2);
    });
    return w;
  }, [assessments]);

  const [weights, setWeights] = useState({});

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
        body: JSON.stringify({ requests: [{ type: 'get', key: 'paav_grading_weights' }] })
      });
      const data = await res.json();
      const val = data.results?.[0]?.value;
      
      if (val) {
        const loadedWeights = {};
        assessments.forEach(a => {
          loadedWeights[a.key] = (val[a.key] !== undefined) ? (val[a.key] * 100).toFixed(2) : (100 / assessments.length).toFixed(2);
        });
        setWeights(loadedWeights);
      } else {
        setWeights(defaultWeights);
      }
    } catch (e) {
      console.error('Failed to load weights:', e);
      setWeights(defaultWeights);
    } finally {
      setLoading(false);
    }
  }, [router, assessments, defaultWeights]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => {
    return Object.values(weights).reduce((acc, v) => acc + Number(v || 0), 0);
  }, [weights]);

  const isValid = Math.abs(total - 100) < 0.1;

  const save = async () => {
    if (!isValid) {
      alert('The total weights must equal exactly 100%. Current total: ' + total.toFixed(2) + '%');
      return;
    }

    setSaving(true);
    try {
      const payload = {};
      Object.keys(weights).forEach(k => {
        payload[k] = Number(weights[k]) / 100;
      });
      
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_grading_weights', value: payload }] })
      });
      const data = await res.json();
      if (data.results?.[0]?.ok) {
        alert('✅ Assessment weights updated successfully for ' + (school?.curriculum || 'CBC') + ' curriculum!');
      } else {
        throw new Error('Failed to save weights');
      }
    } catch (e) {
      alert('❌ Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  if (loading) return <div className="page on"><p>Loading weights...</p></div>;

  return (
    <div className="page on" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div className="page-hdr" style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff', padding: '30px 40px', borderRadius: '0 0 24px 24px', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ color: '#fff', padding: 10 }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>⚖️ Assessment Weights</h1>
            <p style={{ color: '#94A3B8', margin: '5px 0 0 0' }}>Configure contribution of each assessment type for <strong>{school?.curriculum || 'CBC'}</strong> curriculum.</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 40px', maxWidth: 600, margin: '0 auto' }}>
        <div className="panel" style={{ padding: 30 }}>
          <div style={{ marginBottom: 25 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{school?.curriculum || 'CBC'} Weight Distribution</h2>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: SLATE }}>Total must equal 100%.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {assessments.map((a, idx) => (
              <WeightInput 
                key={a.key}
                label={a.label} 
                val={weights[a.key] || 0} 
                set={v => setWeights({...weights, [a.key]: v})} 
                color={COLORS[idx % COLORS.length]} 
              />
            ))}
          </div>

          <div style={{ marginTop: 30, padding: 20, background: isValid ? '#F0FDF4' : '#FEF2F2', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: isValid ? '#166534' : '#991B1B' }}>Total Weight</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: isValid ? '#166534' : '#991B1B' }}>{total.toFixed(2)}%</span>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: 30, padding: 18, fontSize: 16, fontWeight: 700, borderRadius: 16 }}
            onClick={save}
            disabled={saving || !isValid}
          >
            {saving ? '⏳ Saving...' : '💾 Save Weighting Configuration'}
          </button>

          {!isValid && (
            <p style={{ color: '#EF4444', fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: 700 }}>
              ⚠️ The sum of weights must be exactly 100%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WeightInput({ label, val, set, color }) {
  return (
    <div style={{ padding: '15px 20px', border: '1.5px solid #E2E8F0', borderRadius: 16, background: '#fff' }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: SLATE, marginBottom: 10 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <input 
          type="range" 
          min="0" max="100" step="1"
          value={val}
          onChange={e => set(e.target.value)}
          style={{ flex: 1, accentColor: color }}
        />
        <div style={{ position: 'relative', width: 90 }}>
          <input 
            type="number" 
            value={val}
            onChange={e => set(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontWeight: 800, textAlign: 'right' }}
          />
          <span style={{ position: 'absolute', right: 10, top: 12, fontSize: 14, color: SLATE, pointerEvents: 'none' }}>%</span>
        </div>
      </div>
    </div>
  );
}
