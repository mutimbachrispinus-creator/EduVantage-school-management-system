'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

export default function AuditLogPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav_audit_logs']);
    setLogs(db.paav_audit_logs || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 40 }}>Loading Security Logs...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🔍 System Audit Trail</h2>
          <p>Transparent oversight of all administrative and financial actions</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-body">
           <input 
            type="text" 
            placeholder="Search logs by user, action or details..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: 10, border: '1.5px solid #E2E8F0', outline: 'none' }}
           />
        </div>
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ width: 180 }}>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(l.time).toLocaleString()}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{l.user}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{l.role}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 800, 
                      background: l.action.includes('Delete') ? '#FEF2F2' : '#F0F9FF',
                      color: l.action.includes('Delete') ? '#991B1B' : '#0369A1'
                    }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No audit logs found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
