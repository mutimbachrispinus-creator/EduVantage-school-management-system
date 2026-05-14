'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/**
 * app/settings/timetable/page.js — Admin: configure school timetable parameters
 * Supports per-level configuration for multi-curriculum schools.
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedDBMulti, fetchWithRetry } from '@/lib/client-cache';

const LEVELS = [
  { id: 'primary', label: 'Primary / K-6 / PYP' },
  { id: 'junior',  label: 'Junior / JSS / MYP' },
  { id: 'senior',  label: 'Senior / A-Level / DP' }
];

export default function TimetableSettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState({
    primary: { startTime: '08:00', lessonDuration: 35, lessonsPerDay: 7, breaks: [{ name: 'Break', startTime: '10:10', duration: 20 }, { name: 'Lunch', startTime: '12:30', duration: 60 }] },
    junior:  { startTime: '08:00', lessonDuration: 40, lessonsPerDay: 9, breaks: [{ name: 'Break', startTime: '10:00', duration: 30 }, { name: 'Lunch', startTime: '13:10', duration: 60 }] },
    senior:  { startTime: '08:00', lessonDuration: 40, lessonsPerDay: 8, breaks: [{ name: 'Break', startTime: '10:00', duration: 30 }, { name: 'Lunch', startTime: '12:50', duration: 60 }] }
  });
  const [selLevel, setSelLevel] = useState('primary');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const authRes = await fetch('/api/auth');
        const auth = await authRes.json();
        if (!auth.ok || !['admin', 'super-admin'].includes(auth.user?.role)) { 
          router.push('/dashboard'); return; 
        }

        const data = await getCachedDBMulti(['paav7_timetable_cfg']);
        const savedCfg = data['paav7_timetable_cfg'];
        if (savedCfg) {
          // Backward compatibility: if it's a flat object, migrate it to 'primary'
          if (savedCfg.lessonDuration && !savedCfg.primary) {
            setConfigs(p => ({ ...p, primary: savedCfg }));
          } else {
            setConfigs(p => ({ ...p, ...savedCfg }));
          }
        }
      } catch (e) {
        console.error('[Settings] Load failed:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function save() {
    try {
      await fetchWithRetry('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_timetable_cfg', value: configs }] }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  }

  const config = configs[selLevel];
  const F = (k, v) => setConfigs(p => ({ ...p, [selLevel]: { ...p[selLevel], [k]: v } }));

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner"></div><p>Loading configuration...</p></div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📅 Timetable Structure</h2>
          <p>Configure lesson times and breaks per educational level</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary" onClick={save}>💾 Save All Changes</button>
        </div>
      </div>

      {saved && <div className="alert alert-ok show" style={{ marginBottom: 15 }}>✅ Timetable structure updated successfully!</div>}

      <div className="profile-tabs" style={{ marginBottom: 20 }}>
        {LEVELS.map(l => (
          <button key={l.id} className={`profile-tab-btn${selLevel === l.id ? ' on' : ''}`} onClick={() => setSelLevel(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="sg sg2">
        <div className="panel">
          <div className="panel-hdr"><h3>Day Parameters: {LEVELS.find(l=>l.id===selLevel).label}</h3></div>
          <div className="panel-body">
            <div className="field">
              <label>School Start Time</label>
              <input type="time" value={config.startTime} onChange={e => F('startTime', e.target.value)} />
            </div>
            <div className="field">
              <label>Lesson Duration (minutes)</label>
              <input type="number" value={config.lessonDuration} onChange={e => F('lessonDuration', Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Default Lessons Per Day</label>
              <input type="number" value={config.lessonsPerDay} onChange={e => F('lessonsPerDay', Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <h3>Break Intervals</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => F('breaks', [...config.breaks, { name:'New Break', startTime:'12:00', duration:30 }])}>
              ➕ Add Break
            </button>
          </div>
          <div className="panel-body">
            {config.breaks.length === 0 && <p style={{color:'var(--muted)', fontSize:12, textAlign:'center', padding:20}}>No breaks defined for this level.</p>}
            {config.breaks.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:10, marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10 }}>
                <div className="field" style={{ flex:2, marginBottom:0 }}>
                  <label>Break Name</label>
                  <input value={b.name} onChange={e => {
                    const nb = [...config.breaks]; nb[i].name = e.target.value; F('breaks', nb);
                  }} />
                </div>
                <div className="field" style={{ flex:1, marginBottom:0 }}>
                  <label>Starts At</label>
                  <input type="time" value={b.startTime} onChange={e => {
                    const nb = [...config.breaks]; nb[i].startTime = e.target.value; F('breaks', nb);
                  }} />
                </div>
                <div className="field" style={{ flex:1, marginBottom:0 }}>
                  <label>Mins</label>
                  <input type="number" value={b.duration} onChange={e => {
                    const nb = [...config.breaks]; nb[i].duration = Number(e.target.value); F('breaks', nb);
                  }} />
                </div>
                <button className="btn btn-danger btn-sm" style={{ alignSelf:'flex-end' }} onClick={() => {
                  F('breaks', config.breaks.filter((_, idx) => idx !== i));
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="panel" style={{marginTop:20, background:'var(--blue-light)', border:'1px solid var(--blue)'}}>
         <div className="panel-body" style={{fontSize:12, color:'var(--blue-dark)'}}>
            <strong>Pro Tip:</strong> These settings determine how the ⚡ Auto-Generator allocates slots. 
            Changing durations here will not automatically update existing saved timetables, but will apply to any new generations.
         </div>
      </div>
    </div>
  );
}
