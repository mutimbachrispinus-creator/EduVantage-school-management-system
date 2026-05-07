'use client';
export const runtime = 'edge';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';

export default function RecycleBinPage() {
  const router = useRouter();
  const { profile: school } = useProfile();
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'getDeletedLearners' }] })
    });
    const data = await res.json();
    setDeleted(data.results?.[0]?.list || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function restore(adm) {
    if (!confirm('Restore this learner to the active list?')) return;
    setBusy(true);
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'restoreLearner', adm }] })
    });
    const data = await res.json();
    if (data.results?.[0]?.error) {
      alert('Failed to restore: ' + data.results[0].error);
    } else {
      load();
    }
    setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading recycle bin…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🗑️ Recycle Bin</h2>
          <p>Restore deleted learner profiles</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners')}>Back to Learners</button>
        </div>
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Adm</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Deleted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deleted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Recycle bin is empty
                  </td>
                </tr>
              ) : deleted.map(l => (
                <tr key={l.adm}>
                  <td><strong>{l.adm}</strong></td>
                  <td>{l.name}</td>
                  <td><span className="badge bg-blue">{l.grade}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(l.deleted_at * 1000).toLocaleString()}
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => restore(l.adm)} disabled={busy}>
                      {busy ? '⏳...' : '🔄 Restore'}
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
