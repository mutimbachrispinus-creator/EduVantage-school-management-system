'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import FinanceNav from '@/components/FinanceNav';

export default function ReconcilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [paylog, setPaylog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_paylog']);
    setPaylog(db.paav6_paylog || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const text = f.target.result;
      const rows = text.split('\n').map(r => r.split(','));
      // Assume CSV: Date, Ref, Name, Amount
      const parsed = rows.slice(1).map(r => ({
        date: r[0]?.trim(),
        ref: r[1]?.trim(),
        name: r[2]?.trim(),
        amount: Number(r[3]?.replace(/[^0-9.]/g, ''))
      })).filter(r => r.amount > 0);
      setCsvData(parsed);
      
      // Auto-match by Ref or Amount+Date
      const autoMatches = parsed.map(c => {
        const portalMatch = paylog.find(p => p.ref === c.ref || (p.amount === c.amount && p.date === c.date));
        return { bank: c, portal: portalMatch, status: portalMatch ? 'matched' : 'missing' };
      });
      setMatches(autoMatches);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => processFile(e.target.files[0]);

  const stats = useMemo(() => {
    const matched = matches.filter(m => m.status === 'matched').length;
    const total = matches.length;
    const pct = total ? Math.round((matched / total) * 100) : 0;
    return { matched, total, missing: total - matched, pct };
  }, [matches]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Reconciler…</div>;

  return (
    <div className="page on finance-page">
      <FinanceNav />
      <div className="page-hdr">
        <div>
          <h2>🏦 Smart Bank Reconciliation</h2>
          <p>Sync bank statements with portal records using AI-powered matching</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-ghost btn-sm" onClick={() => {setCsvData([]); setMatches([]);}}>Clear All</button>
        </div>
      </div>

      <div className="sg sg2" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', border: 'none', color: '#fff' }}>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: 30 }}>
             <div style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.8, letterSpacing: 1, fontWeight: 700 }}>Integration Health</div>
             <div style={{ fontSize: 48, fontWeight: 900, margin: '10px 0' }}>{stats.pct}%</div>
             <div style={{ fontSize: 14, opacity: 0.9 }}>{stats.matched} out of {stats.total} entries successfully matched.</div>
             <div style={{ marginTop: 20, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${stats.pct}%`, height: '100%', background: '#fff', borderRadius: 10 }} />
             </div>
          </div>
        </div>

        <div className="panel" 
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={() => setIsDragging(false)}
             onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
             style={{ border: isDragging ? '2px dashed var(--primary)' : '2px dashed #E2E8F0', background: isDragging ? 'var(--primary-low)' : '#fff', transition: '0.2s' }}>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 15 }}>📄</div>
            <h3 style={{ margin: '0 0 5px 0' }}>Drop Bank Statement</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Support CSV files from KCB, Equity, M-Pesa Business, etc.</p>
            <input type="file" id="file-up" hidden accept=".csv" onChange={handleFileUpload} />
            <label htmlFor="file-up" className="btn btn-primary" style={{ cursor: 'pointer' }}>Browse Computer</label>
          </div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="panel fade-in">
          <div className="panel-hdr">
            <h3>📊 Reconciliation Results</h3>
            <div style={{ display: 'flex', gap: 10 }}>
               <span className="badge bg-green">{stats.matched} MATCHED</span>
               <span className="badge bg-red">{stats.missing} MISSING</span>
            </div>
          </div>
          <div className="tbl-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ textAlign: 'left', padding: '15px 12px' }}>BANK STATEMENT ENTRY</th>
                  <th style={{ textAlign: 'left', padding: '15px 12px' }}>PORTAL RECORD MATCH</th>
                  <th style={{ textAlign: 'center', padding: '15px 12px' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: '15px 12px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', transition: '0.2s' }} className="hover-row">
                    <td style={{ padding: 15 }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{m.bank.ref}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.bank.date} • <span style={{ color: 'var(--navy)', fontWeight: 600 }}>KSH {m.bank.amount.toLocaleString()}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.bank.name}</div>
                    </td>
                    <td style={{ padding: 15 }}>
                      {m.portal ? (
                        <>
                          <div style={{ fontWeight: 800, color: '#059669' }}>{m.portal.name || 'Payer Match Found'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.portal.date} • KSH {m.portal.amount.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#059669' }}>ID: {m.portal.ref}</div>
                        </>
                      ) : (
                        <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 13 }}>No matching record found in portal</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: 15 }}>
                      <span className={`badge ${m.status === 'matched' ? 'bg-green' : 'bg-red'}`} style={{ padding: '6px 12px', borderRadius: 20 }}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: 15 }}>
                      {m.status === 'missing' ? (
                        <button className="btn btn-sm btn-primary">Create Record</button>
                      ) : (
                        <button className="btn btn-sm btn-ghost">View Details</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover { background: var(--primary-low); }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
