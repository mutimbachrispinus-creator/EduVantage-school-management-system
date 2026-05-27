'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, invalidateDB } from '@/lib/client-cache';

const NAVY = '#0F172A';
const SLATE = '#64748B';

export default function CalendarSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState([]);

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
        body: JSON.stringify({ requests: [{ type: 'getTerms' }] })
      });
      const data = await res.json();
      setTerms(data.results?.[0]?.value || []);
    } catch (e) {
      console.error('Failed to load terms:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    // Validate
    if (terms.some(t => !t.name || !t.start_date || !t.end_date)) {
      alert('Please fill in all term details (Name, Start Date, and End Date).');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'setTerms', terms }] })
      });
      const data = await res.json();
      if (data.results?.[0]?.ok) {
        // Sync cache
        invalidateDB(['paav_terms']);
        
        alert('✅ School Calendar updated and synchronized successfully!');
        load();
      } else {
        throw new Error(data.results?.[0]?.error || 'Failed to save');
      }
    } catch (e) {
      alert('❌ Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addTerm = () => {
    const lastEnd = terms.length > 0 ? terms[terms.length - 1].end_date : null;
    const nextStart = lastEnd ? new Date(new Date(lastEnd).getTime() + 86400000).toISOString().split('T')[0] : '';
    setTerms([...terms, { 
      id: `new_${Date.now()}_${terms.length}`,
      name: `Term ${terms.length + 1}`, 
      start_date: nextStart, 
      end_date: '' 
    }]);
  };

  const updateTerm = (idx, key, val) => {
    const nt = [...terms];
    nt[idx][key] = val;
    setTerms(nt);
  };

  const removeTerm = (idx) => {
    if (!confirm('Are you sure you want to remove this term?')) return;
    setTerms(terms.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="page on"><p>Loading calendar settings...</p></div>;

  return (
    <div className="page on" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div className="page-hdr" style={{ background: NAVY, color: '#fff', padding: '30px 40px', borderRadius: '0 0 24px 24px', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ color: '#fff', padding: 10 }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>📅 School Calendar Management</h1>
            <p style={{ color: '#94A3B8', margin: '5px 0 0 0' }}>Define the start and end dates for your academic terms.</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px 40px', maxWidth: 900, margin: '0 auto' }}>
        <div className="panel" style={{ padding: 30 }}>
          <div style={{ marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Academic Terms</h2>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: SLATE }}>Attendance records and analytics will be scoped to these dates.</p>
            </div>
            <button className="btn btn-primary" onClick={addTerm}>+ Add Term</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {terms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F1F5F9', borderRadius: 16, border: '2px dashed #CBD5E1' }}>
                <div style={{ fontSize: 48, marginBottom: 15 }}>🗓️</div>
                <h3 style={{ margin: 0 }}>No Custom Terms Set</h3>
                <p style={{ color: SLATE, maxWidth: 300, margin: '10px auto 20px' }}>The system is currently using the platform default 14-week term logic.</p>
                <button className="btn btn-primary" onClick={addTerm}>Create Your First Term</button>
              </div>
            ) : terms.map((t, i) => (
              <div key={i} style={{ padding: 25, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 20, alignItems: 'end' }}>
                  <div className="field">
                    <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: SLATE, marginBottom: 8, display: 'block' }}>Term Name</label>
                    <input 
                      className="sc-inp" 
                      value={t.name} 
                      onChange={e => updateTerm(i, 'name', e.target.value)} 
                      placeholder="e.g. Term 1 2024"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: SLATE, marginBottom: 8, display: 'block' }}>Start Date</label>
                    <input 
                      type="date"
                      className="sc-inp" 
                      value={t.start_date} 
                      onChange={e => updateTerm(i, 'start_date', e.target.value)} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: SLATE, marginBottom: 8, display: 'block' }}>End Date</label>
                    <input 
                      type="date"
                      className="sc-inp" 
                      value={t.end_date} 
                      onChange={e => updateTerm(i, 'end_date', e.target.value)} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button 
                    onClick={() => removeTerm(i)} 
                    className="btn btn-ghost" 
                    style={{ color: '#EF4444', height: 45, width: 45, padding: 0, borderRadius: 12 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {terms.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1.5px solid #F1F5F9' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: 18, fontSize: 16, fontWeight: 700, borderRadius: 16, boxShadow: '0 10px 25px rgba(37,99,235,0.2)' }}
                onClick={save}
                disabled={saving}
              >
                {saving ? '⏳ Synchronizing Calendar...' : '💾 Save Academic Calendar'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: SLATE, marginTop: 15 }}>
                Tip: Ensure terms do not overlap and cover all school days for accurate reporting.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .panel { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.05); border: 1px solid #E2E8F0; }
        .sc-inp { padding: 12px 16px; border-radius: 12px; border: 1.5px solid #E2E8F0; font-size: 14px; font-weight: 600; transition: all 0.2s; }
        .sc-inp:focus { border-color: #2563EB; outline: none; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
}
