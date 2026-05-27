'use client';
/**
 * app/analytics/activity/page.js — Global Activity Log
 *
 * Admin view of every significant action performed in the portal.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

export default function ActivityLogPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/dashboard'); return; }
      setUser(u);

      const db = await getCachedDBMulti(['paav7_activity_log']);
      setLogs(db.paav7_activity_log || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l => 
    !filter || 
    l.userName?.toLowerCase().includes(filter.toLowerCase()) ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.details?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading || !user) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ Loading logs…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📜 Global Activity Log</h2>
          <p>Tracking every action across the portal</p>
        </div>
        <div className="page-hdr-acts">
          <input 
            placeholder="🔍 Search logs..." 
            className="sc-inp" 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 250 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)' }}>
                    {new Date(l.timestamp).toLocaleString('en-KE')}
                  </td>
                  <td style={{ fontWeight: 700 }}>{l.userName}</td>
                  <td><span className="badge bg-blue" style={{ fontSize: 10 }}>{l.userRole}</span></td>
                  <td style={{ fontWeight: 600 }}>{l.action}</td>
                  <td style={{ fontSize: 12 }}>{l.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .sc-inp { padding: 8px 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 13px; outline: none; }
      `}</style>
    </div>
  );
}
