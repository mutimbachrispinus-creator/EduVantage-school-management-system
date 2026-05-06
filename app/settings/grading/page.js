'use client';
export const runtime = 'edge';
/**
 * app/settings/grading/page.js — Adjust CBE/CBC grading thresholds
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JSS_SCALE, PRIMARY_SCALE } from '@/lib/cbe';

export default function GradingSettingsPage() {
  const router  = useRouter();
  const [k6,     setK6]     = useState(PRIMARY_SCALE.map(s => ({ ...s })));
  const [junior, setJunior] = useState(JSS_SCALE.map(s => ({ ...s })));
  const [senior, setSenior] = useState(JSS_SCALE.map(s => ({ ...s })));
  
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Auth check
      const authRes = await fetch('/api/auth', { signal: AbortSignal.timeout(5000) });
      const contentType = authRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Authentication server returned an invalid response (non-JSON).');
      }
      const auth = await authRes.json();
      if (!auth.ok || auth.user?.role !== 'admin') { router.push('/dashboard'); return; }

      // 2. Load Grading Config
      const dbRes = await fetch('/api/db', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ requests:[{ type:'get', key:'paav8_grad' }] }),
        signal: AbortSignal.timeout(8000)
      });
      
      if (!dbRes.ok) throw new Error('Database server is not responding.');
      const dbContentType = dbRes.headers.get('content-type');
      if (!dbContentType || !dbContentType.includes('application/json')) {
        throw new Error('Database server returned an invalid response (non-JSON).');
      }
      
      const db  = await dbRes.json();
      const cfg = db.results?.[0]?.value;
      
      if (cfg) {
        // Backwards compatibility with old pri/jss config
        if (cfg.k6) setK6(cfg.k6.map(s => ({ ...s })));
        else if (cfg.pri) setK6(cfg.pri.map(s => ({ ...s })));
        
        if (cfg.junior) setJunior(cfg.junior.map(s => ({ ...s })));
        else if (cfg.jss) setJunior(cfg.jss.map(s => ({ ...s })));
        
        if (cfg.senior) setSenior(cfg.senior.map(s => ({ ...s })));
        else if (cfg.jss) setSenior(cfg.jss.map(s => ({ ...s })));
      }
    } catch (e) {
      console.error('[Grading] Load failed:', e);
      setError(e.message || 'Connection timed out. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    await fetch('/api/db', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ requests:[{ type:'set', key:'paav8_grad', value:{ k6, junior, senior } }] }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div style={{ padding:40, color:'var(--muted)' }}>Loading…</div>;
  if (error) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ color:'var(--red)', marginBottom:16 }}>{error}</p>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  return (
    <div className="page on">
      <div className="page-hdr">
        <div><h2>⚙ Grading Settings</h2><p>Adjust CBC minimum score thresholds per level</p></div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={load}>↺ Reset to DB</button>
          <button className="btn btn-primary btn-sm" onClick={save}>💾 Save Changes</button>
        </div>
      </div>
      {saved && <div className="alert alert-ok show" style={{ display:'flex', marginBottom:14 }}>✅ Saved!</div>}
      <div className="note-box" style={{ marginBottom:18 }}>
        Changes apply immediately to all marks entry, report cards, and merit lists.
        Lowering a threshold upgrades learners; raising it downgrades them.
      </div>
      <ScaleEditor scale={k6} setScale={setK6} title="🟢 K–Grade 6" />
      <ScaleEditor scale={junior} setScale={setJunior} title="🟡 Junior School (7–9)" />
      <ScaleEditor scale={senior} setScale={setSenior} title="🔴 Senior School (10–12)" />
    </div>
  );
}

function ScaleEditor({ scale, setScale, title }) {
  return (
    <div className="panel" style={{ marginBottom:16 }}>
      <div className="panel-hdr"><h3>{title}</h3></div>
      <div className="panel-body">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Level</th><th>Min Score (%)</th><th>Points</th><th>Description</th></tr>
            </thead>
            <tbody>
              {scale.map((s, i) => (
                <tr key={s.lv}>
                  <td>
                    <span className="badge"
                      style={{ background:s.bg, color:s.c }}>{s.lv}</span>
                  </td>
                  <td>
                    <input type="number" value={s.min} min="0" max="100"
                      onChange={e => {
                        const updated = [...scale];
                        updated[i] = { ...s, min: Number(e.target.value) };
                        setScale(updated);
                      }}
                      style={{ width:72, padding:'5px 8px', border:'2px solid var(--border)',
                        borderRadius:6, fontSize:12, outline:'none' }}
                    />
                  </td>
                  <td style={{ fontWeight:700 }}>{s.pts}</td>
                  <td style={{ fontSize:11.5, color:'var(--muted)' }}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
