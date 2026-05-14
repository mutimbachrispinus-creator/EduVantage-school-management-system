'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { ALL_GRADES } from '@/lib/cbe';

export default function InvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [feecfg, setFeecfg] = useState({});
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [selGrade, setSelGrade] = useState('GRADE 7');
  const [selAdm, setSelAdm] = useState('');
  const [bulkMode, setBulkMode] = useState(false);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_learners', 'paav6_feecfg', 'paav_school_profile']);
    setLearners(db.paav6_learners || []);
    setFeecfg(db.paav6_feecfg || {});
    setProfile(db.paav_school_profile || { name: 'EduVantage School', email: 'portal@eduvantage.app' });
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => learners.filter(l => l.grade === selGrade), [learners, selGrade]);
  const singleLearner = useMemo(() => learners.find(l => l.adm === selAdm), [learners, selAdm]);

  const activeInvoices = useMemo(() => {
    const list = bulkMode ? filtered : (singleLearner ? [singleLearner] : []);
    return list.map(l => {
      const annual = feecfg[l.grade]?.annual || 5000;
      const arrears = l.arrears || 0;
      return {
        learner: l,
        annual,
        arrears,
        total: annual + arrears,
        date: new Date().toLocaleDateString(),
        invoiceNo: 'INV-' + Math.random().toString(36).substring(7).toUpperCase()
      };
    });
  }, [bulkMode, filtered, singleLearner, feecfg]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Invoicing Hub…</div>;

  return (
    <div className="page on">
      <div className="page-hdr no-print">
        <div>
          <h2>📄 Enterprise Invoicing Center</h2>
          <p>Generate formal termly fee demand notes for parents</p>
        </div>
        <div className="page-hdr-acts">
           <button className={`btn btn-sm ${bulkMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBulkMode(!bulkMode)}>
             {bulkMode ? '✅ Bulk Mode Active' : '📄 Switch to Bulk Mode'}
           </button>
           {activeInvoices.length > 0 && <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Print {activeInvoices.length} Invoices</button>}
        </div>
      </div>

      <div className="panel no-print" style={{ marginBottom: 20 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
            <label>Select Grade</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelAdm(''); }}>
              {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {!bulkMode && (
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label>Select Learner</label>
              <select value={selAdm} onChange={e => setSelAdm(e.target.value)}>
                <option value="">— Choose Learner —</option>
                {filtered.map(l => <option key={l.adm} value={l.adm}>{l.name} ({l.adm})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="invoice-container">
        {activeInvoices.length === 0 ? (
          <div className="panel no-print">
             <div style={{ textAlign: 'center', padding: 100, color: 'var(--muted)' }}>
               {bulkMode ? `No learners found in ${selGrade}` : 'Select a learner above to generate an invoice preview'}
             </div>
          </div>
        ) : (
          activeInvoices.map((inv, idx) => (
            <div key={inv.learner.adm} className="invoice-page panel">
              <div style={{ background: '#fff', padding: '40px', color: '#1E293B', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '4px solid var(--primary)', paddingBottom: 20 }}>
                  <div>
                    <h1 style={{ margin: 0, color: 'var(--primary)', letterSpacing: -1 }}>INVOICE</h1>
                    <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>REF: {inv.invoiceNo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{profile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{profile.email} • {profile.phone}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{profile.address || 'Physical Address Not Set'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 8 }}>Billed To</div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{inv.learner.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Admission: <strong>{inv.learner.adm}</strong></div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Class: <strong>{inv.learner.grade} {inv.learner.stream || ''}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 8 }}>Issue Date</div>
                    <div style={{ fontWeight: 700 }}>{inv.date}</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ textAlign: 'left', padding: '12px' }}>SERVICE DESCRIPTION</th>
                      <th style={{ textAlign: 'right', padding: '12px' }}>TOTAL AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: 15, fontSize: 14 }}>
                        <strong>Annual Tuition Fees</strong>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Academic Year 2026 - {inv.learner.grade} Standard Billing</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: 15, fontWeight: 700 }}>KSH {inv.annual.toLocaleString()}</td>
                    </tr>
                    {inv.arrears > 0 && (
                      <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: 15, fontSize: 14 }}>
                          <strong>Previous Arrears Balance</strong>
                          <div style={{ fontSize: 11, color: '#991B1B' }}>Unpaid balance carried forward from previous term</div>
                        </td>
                        <td style={{ textAlign: 'right', padding: 15, fontWeight: 700, color: '#991B1B' }}>KSH {inv.arrears.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <div style={{ width: 280, background: '#F8FAFC', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                      <span style={{ color: 'var(--muted)' }}>Subtotal:</span>
                      <span>KSH {inv.total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 20, borderTop: '2px solid var(--primary)', paddingTop: 10, color: 'var(--primary)' }}>
                      <span>DUE:</span>
                      <span>KSH {inv.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 60, padding: 20, background: '#F0F9FF', borderRadius: 12, border: '1.5px solid #BAE6FD' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0369A1' }}>💳 Official Payment Instructions</h4>
                  <div style={{ display: 'flex', gap: 30, fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10, fontWeight: 800 }}>Option 1: M-Pesa Paybill</div>
                      <div style={{ fontWeight: 700 }}>Business No: 4091000</div>
                      <div style={{ fontWeight: 700 }}>Account: {inv.learner.adm}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10, fontWeight: 800 }}>Option 2: Bank Deposit</div>
                      <div style={{ fontWeight: 700 }}>Equity Bank • Westlands Branch</div>
                      <div style={{ fontWeight: 700 }}>Acc No: 1234567890</div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: 'var(--muted)' }}>
                  This is a system generated invoice. For any queries, please contact the school administration office.
                </div>
              </div>
              {idx < activeInvoices.length - 1 && <div className="page-break" />}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .invoice-page { 
          margin-bottom: 30px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        @media print {
          .no-print { display: none !important; }
          .page { padding: 0 !important; background: #fff !important; }
          .invoice-page { margin: 0 !important; box-shadow: none !important; border: none !important; width: 100% !important; }
          .page-break { page-break-after: always; height: 0; }
          #main { padding: 0 !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
