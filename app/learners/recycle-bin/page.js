'use client';
/**
 * app/learners/recycle-bin/page.js — Recycle Bin
 * Restore or permanently delete learner profiles.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';

export default function RecycleBinPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await getCachedUser();
      if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/dashboard'); return; }
      setUser(u);

      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'getDeletedLearners' }] })
      });
      const data = await res.json();
      setDeleted(data.results?.[0]?.value || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function restore(adm) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'restoreLearner', adm }] })
      });
      load();
    } catch (e) {
      alert('Failed to restore');
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete(adm) {
    if (!confirm('Permanently delete this profile? This cannot be undone.')) return;
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'hardDeleteLearner', adm }] })
      });
      load();
    } catch (e) {
      alert('Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <div style={{ padding: 40 }}>Loading Recycle Bin…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🗑️ Recycle Bin</h2>
          <p>Restore or permanently delete removed profiles</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners')}>
            ⬅ Back to Learners
          </button>
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
                <th>Deleted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deleted.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Recycle bin is empty
                  </td>
                </tr>
              ) : deleted.map(l => (
                <tr key={l.adm}>
                  <td><strong>{l.adm}</strong></td>
                  <td>{l.name}</td>
                  <td>{l.grade}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {l.deleted_at ? new Date(l.deleted_at).toLocaleString() : '—'}
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => restore(l.adm)} disabled={busy}>
                      🔄 Restore
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => hardDelete(l.adm)} disabled={busy}>
                      🗑️ Permanent Delete
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
