'use client';
export const runtime = 'edge';
/**
 * app/settings/sms/page.js — Admin: SMS Provider Configuration (Africa's Talking)
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SMSSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    username: '',
    apiKey: '',
    senderId: '',
  });

  const load = useCallback(async () => {
    const authRes = await fetch('/api/auth');
    const auth = await authRes.json();
    if (!auth.ok || auth.user?.role !== 'super-admin') { router.push('/dashboard'); return; }

    const dbRes = await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [
        { type: 'get', key: 'paav_at_creds' }
      ] }),
    });
    const db = await dbRes.json();
    const creds = db.results[0]?.value || {};
    setForm({
      username: creds.username || '',
      apiKey: creds.apiKey || '',
      senderId: creds.senderId || '',
    });
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    await fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [
        { type: 'set', key: 'paav_at_creds', value: form }
      ] }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📱 SMS Configuration</h2>
          <p>Configure Africa&apos;s Talking API credentials for system alerts and bulk SMS</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary" onClick={save}>💾 Save SMS Credentials</button>
        </div>
      </div>

      {saved && <div className="alert alert-ok show" style={{ marginBottom: 15 }}>✅ Credentials updated!</div>}

      <div className="sg sg1">
        <div className="panel" style={{ maxWidth: 600 }}>
          <div className="panel-hdr"><h3>Africa&apos;s Talking API</h3></div>
          <div className="panel-body">
            <div className="field">
              <label>Username</label>
              <input 
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})}
                placeholder="e.g. sandbox or your_at_username"
              />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Use <strong>sandbox</strong> for testing.
              </p>
            </div>

            <div className="field">
              <label>API Key</label>
              <input 
                type="password"
                value={form.apiKey} 
                onChange={e => setForm({...form, apiKey: e.target.value})}
                placeholder="Enter your AT API Key"
              />
            </div>

            <div className="field">
              <label>Sender ID / Alphanumeric (Optional)</label>
              <input 
                value={form.senderId} 
                onChange={e => setForm({...form, senderId: e.target.value})}
                placeholder="e.g. PAAV"
              />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Requires a registered Alphanumeric Sender ID on your AT account.
              </p>
            </div>

            <div className="note-box" style={{ marginTop: 20 }}>
              <strong>Notice:</strong> These credentials are used for all automated alerts including fee reminders, result notifications, and bulk announcements.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
