'use client';
/**
 * app/database/page.js — Database Maintenance
 *
 * Admin tools to backup data and clear space by deleting old KV keys.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';
import { PAAV_KEYS } from '@/lib/constants';

export default function DatabasePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState(null);
  const [keys, setKeys] = useState([]);

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/dashboard'); return; }
      setUser(u);

      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'storageUsage' },
          { type: 'timestamps', keys: PAAV_KEYS } 
        ]})
      });
      const data = await res.json();
      setUsage(data.results[0].usage);
      const timestamps = data.results[1].timestamps || {};
      setKeys(PAAV_KEYS.map(k => ({ key: k, updated_at: timestamps[k] || 0 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function downloadBackup() {
    setBusy(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'getDatabaseDump' }] })
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.results[0].data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paav_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (e) { alert('Download failed: ' + e.message); }
    finally { setBusy(false); }
  }

  async function deleteKey(key) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE the table "${key}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'delete', key },
          { type: 'logActivity', activity: { action: 'Database Cleanup', details: `Deleted table/key: ${key}` } }
        ]})
      });
      load();
    } catch (e) { alert('Delete failed: ' + e.message); }
    finally { setBusy(false); }
  }

  if (loading || !user) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ Loading Maintenance Tools…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>⚙️ Database Maintenance</h2>
          <p>System tools for backups and storage optimization</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary" onClick={downloadBackup} disabled={busy}>
            📥 Download Full Backup (.json)
          </button>
        </div>
      </div>

      <div className="sg sg2" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-hdr"><h3>📦 Storage Usage</h3></div>
          <div className="panel-body">
            {usage && (
              <>
                <div style={{ fontSize: 32, fontWeight: 800, color: usage.percent > 80 ? '#DC2626' : '#059669' }}>
                  {usage.percent.toFixed(2)}%
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                  {(usage.totalBytes / 1024 / 1024).toFixed(2)} MB of {(usage.limitBytes / 1024 / 1024).toFixed(2)} MB used
                </div>
                <div style={{ width: '100%', height: 10, background: '#eee', borderRadius: 5, marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${usage.percent}%`, height: '100%', background: usage.percent > 80 ? '#DC2626' : '#059669' }} />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-hdr"><h3>🛡️ Security Note</h3></div>
          <div className="panel-body">
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Deleting a table removes all associated records. Ensure you have downloaded a backup before performing any cleanup.
              Activity logs are kept for every manual deletion.
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr"><h3>📑 Database Tables (KV Keys)</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Key / Table Name</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.sort((a,b) => b.updated_at - a.updated_at).map(k => (
                <tr key={k.key}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{k.key}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {k.updated_at ? new Date(k.updated_at * 1000).toLocaleString('en-KE') : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-danger btn-xs" 
                      onClick={() => deleteKey(k.key)}
                      disabled={busy}
                    >
                      🗑️ Wipe Table
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
