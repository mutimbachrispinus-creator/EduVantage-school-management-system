'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCachedUser, getCachedDBMulti, fetchWithRetry, invalidateDB } from '@/lib/client-cache';
import { useSchoolProfile } from '@/lib/school-profile';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const school = useSchoolProfile();
  const [form, setForm] = useState({ dept: '', title: '', text: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const router = useRouter();
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_dept_reports'])
      ]);

      if (!u) { router.push('/'); return; }
      setUser(u);

      const allReports = db.paav6_dept_reports || [];

      // Admins and Super Admins see all reports
      if (['admin', 'super-admin'].includes(u.role)) {
        setReports([...allReports].reverse());
      }
    } catch (err) {
      console.error('[Reports] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function submitReport(e) {
    e.preventDefault();
    if (!form.dept || !form.title || !form.text) return;
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const db = await getCachedDBMulti(['paav6_dept_reports']);
      const list = db.paav6_dept_reports || [];
      
      const newReport = {
        id: Date.now(),
        author: user.name,
        authorRole: user.role,
        dept: form.dept,
        title: form.title,
        text: form.text,
        time: new Date().toISOString()
      };

      list.push(newReport);

      await fetchWithRetry('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_dept_reports', value: list }] })
      });

      invalidateDB('paav6_dept_reports');
      setForm({ dept: '', title: '', text: '' });
      setMsg({ type: 'success', text: '✅ Report submitted successfully to administration!' });
      if (['admin', 'super-admin'].includes(user.role)) load();
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Failed to submit report: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  }
  
  function downloadReport(r) {
    const win = window.open('', '_blank');
    if (!win) {
      alert('⚠️ Popup blocked! Please allow popups for this site to download reports.');
      return;
    }
    
    win.document.write(`
      <html>
        <head>
          <title>Progress Report - ${r.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            .school-name { font-size: 14px; font-weight: 900; letter-spacing: 2px; }
            .doc-title { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-top: 5px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px; }
            .meta-item { margin-bottom: 5px; }
            .meta-label { font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px; display: block; }
            .content { font-family: 'Georgia', serif; font-size: 16px; white-space: pre-wrap; min-height: 400px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fffefa; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sig-line { border-top: 1px solid #1e293b; width: 200px; padding-top: 5px; font-size: 11px; text-align: center; }
            .stamp { opacity: 0.1; font-weight: 900; font-size: 40px; transform: rotate(-15deg); position: absolute; top: 50%; left: 40%; }
            @media print { .no-print { display: none; } body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${school.name}</div>
            <div class="doc-title">Official Progress Report</div>
          </div>
          
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Department</span>
              <strong>${r.dept}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date Submitted</span>
              <strong>${new Date(r.time).toLocaleDateString()} ${new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Author</span>
              <strong>${r.author}</strong> (${r.authorRole})
            </div>
            <div class="meta-item">
              <span class="meta-label">Report ID</span>
              <strong>PR-${r.id}</strong>
            </div>
          </div>
          
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">Subject: ${r.title}</div>
          
          <div class="content">${r.text}</div>
          
          <div class="footer">
            <div>
              <div class="sig-line">Author's Signature</div>
            </div>
            <div style="text-align: right;">
              <div class="sig-line">Administrator's Review</div>
            </div>
          </div>
          
          <div class="stamp">OFFICIAL RECORD</div>
          
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Uncomment if you want it to auto-close after printing
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }

  if (loading) return <div className="page on">Loading...</div>;

  return (
    <>
      <div className="page on" id="pg-reports">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0 }}>📊 Progress Reports</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              {user.role === 'admin' ? 'Review departmental progress updates' : 'Submit progress updates to administration'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Submission Form */}
          <div className="panel" style={{ border: '1.5px solid var(--border)', background: '#F8FAFC' }}>
            <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff' }}>
              <h3 style={{ color: '#fff' }}>📄 Departmental Progress Submission</h3>
            </div>
            <div className="panel-body" style={{ padding: '25px' }}>
              <form onSubmit={submitReport} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#fff', padding: '40px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                  {/* Memorandum Header */}
                  <div style={{ textAlign: 'center', marginBottom: 35, borderBottom: '2px solid #1E293B', paddingBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1E293B', letterSpacing: '3px', marginBottom: 6 }}>{school.name?.toUpperCase() || 'EDUVANTAGE PORTAL'}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>Departmental Progress Memorandum</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginBottom: 30 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>Department</label>
                      <input type="text" value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} 
                        placeholder="e.g. Mathematics Department" 
                        style={{ border: 'none', borderBottom: '1.5px solid #CBD5E1', borderRadius: 0, padding: '10px 0', fontSize: 15, fontWeight: 600, background: 'transparent', width: '100%' }} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>Subject/Title</label>
                      <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} 
                        placeholder="e.g. Monthly Progress Update" 
                        style={{ border: 'none', borderBottom: '1.5px solid #CBD5E1', borderRadius: 0, padding: '10px 0', fontSize: 15, fontWeight: 600, background: 'transparent', width: '100%' }} required />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: 12 }}>Report Narrative</label>
                    <textarea value={form.text} onChange={e => setForm({...form, text: e.target.value})} 
                      placeholder="Type your official report here..." 
                      style={{ 
                        minHeight: 500, 
                        resize: 'vertical', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: 8, 
                        padding: '25px', 
                        fontSize: 16, 
                        lineHeight: 1.8, 
                        fontFamily: 'Georgia, serif',
                        background: '#FFFEFA', /* Subtle paper tint */
                        color: '#1E293B',
                        width: '100%'
                      }} required />
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Submitted by: <strong>{user?.name}</strong><br/>
                      Date: {new Date().toLocaleDateString()}
                    </div>
                    <div style={{ opacity: 0.1, fontWeight: 900, fontSize: 24, userSelect: 'none' }}>OFFICIAL</div>
                  </div>
                </div>

                {msg.text && (
                  <div className={`msg ${msg.type}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{msg.text}</span>
                    {msg.type === 'success' && (
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', color: 'inherit', borderColor: 'currentColor' }} onClick={() => downloadReport({ ...form, author: user.name, authorRole: user.role, time: new Date() })}>
                        📥 Save Copy
                      </button>
                    )}
                  </div>
                )}
                
                <button className="btn btn-primary" style={{ height: 50, fontSize: 16, fontWeight: 800, background: '#1E293B', border: 'none', borderRadius: 8 }} disabled={submitting}>
                  {submitting ? '🚀 Submitting Official Record...' : '📜 Authenticate & Submit Report'}
                </button>
              </form>
            </div>
          </div>

          {/* Admin View: List of Reports */}
          {user.role === 'admin' && (
            <div className="panel">
              <div className="panel-hdr"><h3>📋 All Departmental Reports</h3></div>
              <div className="panel-body" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {reports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                    No reports submitted yet.
                  </div>
                ) : (
                  reports.map(r => (
                    <div key={r.id} style={{ padding: 16, border: '1.5px solid var(--border)', borderRadius: 12, marginBottom: 14, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', background: '#EFF6FF', padding: '2px 8px', borderRadius: 20 }}>{r.dept}</span>
                          <h4 style={{ margin: '6px 0 2px', fontSize: 16 }}>{r.title}</h4>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>By <strong>{r.author}</strong> ({r.authorRole})</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                          {new Date(r.time).toLocaleDateString()}<br/>
                          {new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <div style={{ marginTop: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => downloadReport(r)} title="Download Official Report">
                              📥 Download
                            </button>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        {r.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
