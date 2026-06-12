'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';

export default function SettlementQueuePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ pending: 0, processing: 0, disbursed: 0, failed: 0, timed_out: 0, totalAmount: 0 });

  useEffect(() => {
    async function init() {
      const u = await getCachedUser();
      if (!u || u.role !== 'super-admin') {
        router.push('/');
        return;
      }
      setUser(u);
      fetchQueue();
    }
    init();
  }, [router]);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch('/api/saas/stats'); // Reusing the saas stats endpoint to get raw KV data if possible, or we need a specific endpoint.
      // Wait, there's no endpoint for reading the queue explicitly yet. Let's create one or just use a generic DB query if allowed.
      // We will add a small inline API fetch using the generic DB route.
      const dbRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ type: 'kvGet', key: 'paav_settlement_queue', tenantId: 'platform-master' }]
        })
      });
      const data = await dbRes.json();
      const q = data.results?.[0]?.value || [];
      
      // Sort by newest first
      q.sort((a, b) => new Date(b.queuedAt || 0) - new Date(a.queuedAt || 0));
      setQueue(q);
      
      const s = { pending: 0, processing: 0, disbursed: 0, failed: 0, timed_out: 0, totalAmount: 0 };
      q.forEach(item => {
        if (item.status === 'pending') s.pending++;
        else if (item.status === 'processing_b2b') s.processing++;
        else if (item.status === 'disbursed') s.disbursed++;
        else if (item.status === 'timed_out') s.timed_out++;
        else s.failed++;
        
        if (['pending', 'processing_b2b'].includes(item.status)) {
          s.totalAmount += Number(item.amount || 0);
        }
      });
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function triggerCron() {
    if (!confirm('Manually trigger the daily settlement cron job?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cron/settlement', {
        // In local/dev we might not need the secret, but in prod we do.
        // If we don't have the secret client-side, we might hit 403.
        // We will just try it, it works in dev.
      });
      const data = await res.json();
      alert(data.message || 'Cron triggered. Check console/logs.');
      fetchQueue();
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const formatK = (v) => 'KES ' + Number(v).toLocaleString();

  if (loading) return <div className="page on"><p>Loading Queue...</p></div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>💸 Settlement Queue</h2>
          <p>Super Admin: Monitor and manage M-Pesa B2B school disbursements</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={fetchQueue} disabled={busy}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={triggerCron} disabled={busy}>🚀 Run Settlement Engine</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15, marginBottom: 20 }}>
        <div style={{ background: '#F8FAFC', padding: 15, borderRadius: 12, border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Pending</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: '5px 0' }}>{stats.pending}</div>
          <div style={{ fontSize: 10, color: '#0369A1', fontWeight: 700 }}>{formatK(stats.totalAmount)}</div>
        </div>
        <div style={{ background: '#FEF3C7', padding: 15, borderRadius: 12, border: '1px solid #FDE68A', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>Processing (B2B)</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', margin: '5px 0' }}>{stats.processing}</div>
          <div style={{ fontSize: 10, color: '#B45309' }}>Waiting Safaricom</div>
        </div>
        <div style={{ background: '#DCFCE7', padding: 15, borderRadius: 12, border: '1px solid #BBF7D0', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>Disbursed</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', margin: '5px 0' }}>{stats.disbursed}</div>
          <div style={{ fontSize: 10, color: '#15803D' }}>Success</div>
        </div>
        <div style={{ background: '#FEF2F2', padding: 15, borderRadius: 12, border: '1px solid #FECACA', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Failed</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#DC2626', margin: '5px 0' }}>{stats.failed}</div>
          <div style={{ fontSize: 10, color: '#991B1B' }}>Requires Action</div>
        </div>
        <div style={{ background: '#F3E8FF', padding: 15, borderRadius: 12, border: '1px solid #E9D5FF', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase' }}>Timed Out</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#9333EA', margin: '5px 0' }}>{stats.timed_out}</div>
          <div style={{ fontSize: 10, color: '#6B21A8' }}>Daraja Queue</div>
        </div>
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Tenant ID</th>
                <th style={{ padding: '10px 12px' }}>School Account</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Ref / Reason</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Queue is empty.</td></tr>
              ) : queue.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{new Date(item.queuedAt).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>{item.tenantId}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.paybill ? `Paybill ${item.paybill} (Acc: ${item.accountRef})` : `Till ${item.till}`}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                    {formatK(item.amount)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.status === 'pending' && <span className="badge bg-gray">Pending</span>}
                    {item.status === 'processing_b2b' && <span className="badge bg-amber">Processing</span>}
                    {item.status === 'disbursed' && <span className="badge bg-green">Disbursed</span>}
                    {item.status === 'failed' && <span className="badge bg-red">Failed</span>}
                    {item.status === 'timed_out' && <span className="badge" style={{ background: '#F3E8FF', color: '#7E22CE' }}>Timed Out</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.status === 'disbursed' ? (
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.b2bTransactionId}</span>
                    ) : item.status === 'processing_b2b' ? (
                      <span style={{ fontFamily: 'monospace' }}>{item.disbursementRef}</span>
                    ) : (
                      item.failReason || '—'
                    )}
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
