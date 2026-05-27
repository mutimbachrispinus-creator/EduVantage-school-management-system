'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_GRADES } from '@/lib/cbe';
import { getCachedUser, getCachedDBMulti, prefetchKeys } from '@/lib/client-cache';

export default function BulkPushPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [grade, setGrade] = useState('ALL');
  const [type, setType] = useState('balance'); // balance | report
  const [channel, setChannel] = useState('sms'); // sms | email | both
  const [term, setTerm] = useState('T1');
  
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_learners']);
    setLearners(db.paav6_learners || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filteredLearners = grade === 'ALL' 
    ? learners 
    : learners.filter(l => l.grade === grade);

  async function handlePush() {
    if (!confirm(`Are you sure you want to send ${type} ${channel} notifications to ${filteredLearners.length} learners in ${grade}?`)) return;
    
    setSending(true);
    setResults(null);
    setProgress({ current: 0, total: filteredLearners.length });

    // Process in small batches to avoid timeouts and provide progress
    const BATCH_SIZE = 15;
    const allResults = [];

    for (let i = 0; i < filteredLearners.length; i += BATCH_SIZE) {
      const batch = filteredLearners.slice(i, i + BATCH_SIZE);
      setProgress(p => ({ ...p, current: i }));

      try {
        const res = await fetch('/api/comms/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            channel,
            term,
            targets: batch.map(l => ({ adm: l.adm, grade: l.grade }))
          })
        });
        const data = await res.json();
        if (data.ok) {
          allResults.push(...data.results);
        } else {
          console.error('Batch failed:', data.error);
        }
      } catch (e) {
        console.error('Push error:', e);
      }
    }

    setResults(allResults);
    setSending(false);
    setProgress(p => ({ ...p, current: p.total }));
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🚀 Bulk Communications Push</h2>
          <p>Send report summaries and fee balances to parents via SMS and Email</p>
        </div>
      </div>

      <div className="sg sg2">
        <div className="panel">
          <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #8B1A1A, #6B1212)' }}>
            <h3 style={{ color: '#fff' }}>📤 Configure Push</h3>
          </div>
          <div className="panel-body">
            
            <div className="field">
              <label>Target Grade</label>
              <select value={grade} onChange={e => setGrade(e.target.value)}>
                <option value="ALL">All Grades ({learners.length})</option>
                {ALL_GRADES.map(g => (
                  <option key={g} value={g}>{g} ({learners.filter(l => l.grade === g).length})</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Notification Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className={`btn ${type === 'balance' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setType('balance')}
                  style={{ flex: 1 }}
                >
                  💰 Fee Balance
                </button>
                <button 
                  className={`btn ${type === 'report' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setType('report')}
                  style={{ flex: 1 }}
                >
                  📊 Report Card
                </button>
              </div>
            </div>

            {type === 'report' && (
              <div className="field">
                <label>Select Term</label>
                <select value={term} onChange={e => setTerm(e.target.value)}>
                  <option value="T1">Term 1</option>
                  <option value="T2">Term 2</option>
                  <option value="T3">Term 3</option>
                </select>
              </div>
            )}

            <div className="field">
              <label>Delivery Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}>
                <option value="sms">SMS Only</option>
                <option value="email">Email Only</option>
                <option value="both">Both SMS & Email</option>
              </select>
            </div>

            <div className="note-box" style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', marginTop: 20 }}>
              <strong style={{ color: '#991B1B' }}>Important:</strong> This will send messages to <strong>{filteredLearners.length}</strong> recipients. 
              Ensure your Africa&apos;s Talking and Resend balances are sufficient.
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 20, height: 50, fontSize: 16, background: 'linear-gradient(135deg, #8B1A1A, #6B1212)' }}
              disabled={sending || filteredLearners.length === 0}
              onClick={handlePush}
            >
              {sending ? `⏳ Sending (${progress.current}/${progress.total})...` : `🚀 Push to ${filteredLearners.length} Parents`}
            </button>

            {sending && (
              <div style={{ marginTop: 15 }}>
                <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: '#8B1A1A', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <h3>📊 Push Results</h3>
          </div>
          <div className="panel-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
            {!results && !sending && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
                Configure and trigger a push to see results here.
              </div>
            )}

            {results && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: '#ECFDF5', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #A7F3D0', color: '#065F46', fontWeight: 600 }}>
                  ✅ Push Complete: {results.filter(r => r.success).length} successful, {results.filter(r => !r.success).length} failed.
                </div>
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: 6, fontSize: 13, border: '1px solid #E2E8F0' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{r.adm}</span>
                      <span style={{ margin: '0 8px', color: '#94A3B8' }}>•</span>
                      <span style={{ textTransform: 'uppercase', fontSize: 10, background: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>{r.channel}</span>
                    </div>
                    <span style={{ color: r.success ? '#059669' : '#DC2626', fontWeight: 700 }}>
                      {r.success ? '✓ Sent' : '✗ Failed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .quick-access-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          transition: all 0.2s;
        }
        .quick-access-btn:hover {
          border-color: #8B1A1A;
          background: #FFF5F5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,26,26,0.1);
        }
        .qa-icon {
          font-size: 24px;
        }
      `}</style>
    </div>
  );
}
