'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';

const M = 'var(--primary)', M2 = 'var(--accent)', ML = 'var(--primary-low)', MB = '#F8FAFC';

export default function UnifiedPayrollPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  const [tab, setTab] = useState('calc'); 
  const [selStaffId, setSelStaffId] = useState('');
  const [printSlip, setPrintSlip] = useState(null);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_staff', 'paav7_salary']);
    const onlyStaff = (db.paav6_staff || []).filter(s => s.role !== 'parent');
    setStaff(onlyStaff);
    setPayroll(db.paav7_salary || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const selStaff = useMemo(() => staff.find(s => s.username === selStaffId), [staff, selStaffId]);

  /* ── Kenyan Payroll Logic ── */
  const currentPay = useMemo(() => {
    if (!selStaff) return null;
    const g = Number(selStaff.salary) || 0;
    const nssf = Math.min(2160, g * 0.06);
    const levy = g * 0.015;
    const shif = g * 0.0275;
    let taxable = g - nssf;
    let paye = 0;
    if (taxable > 24000) {
      if (taxable <= 32333) paye = (taxable - 24000) * 0.1;
      else if (taxable <= 500000) paye = (32333 - 24000) * 0.1 + (taxable - 32333) * 0.25;
      else paye = (32333 - 24000) * 0.1 + (500000 - 32333) * 0.25 + (taxable - 500000) * 0.3;
    }
    paye = Math.max(0, paye - 2400); 
    const net = g - nssf - levy - shif - paye;
    return { gross: g, nssf, levy, shif, paye, net };
  }, [selStaff]);

  const schoolSummary = useMemo(() => {
    const activeMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthPayroll = payroll.filter(p => p.month === activeMonth);
    const totalGross = currentMonthPayroll.reduce((s, p) => s + (Number(p.basic) || 0), 0);
    const totalNet = currentMonthPayroll.reduce((s, p) => s + (Number(p.net) || 0), 0);
    const totalStat = totalGross - totalNet;
    return { totalGross, totalNet, totalStat, count: currentMonthPayroll.length };
  }, [payroll]);

  async function saveRecord() {
    if (!selStaff || !currentPay) return;
    setBusy(true);
    const rec = {
      id: Date.now(),
      staffId: selStaff.username,
      staffName: selStaff.name,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      basic: selStaff.salary,
      nssf: currentPay.nssf,
      levy: currentPay.levy,
      shif: currentPay.shif,
      paye: currentPay.paye,
      net: currentPay.net,
      status: 'pending',
      date: new Date().toLocaleDateString()
    };

    try {
      const updated = [rec, ...payroll];
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_salary', value: updated }] })
      });
      setPayroll(updated);
      setTab('history');
      alert('✅ Payroll record saved!');
    } catch (e) {
      alert('❌ Save failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function bulkProcess() {
    if (!confirm(`Compute payroll for all ${staff.length} staff members for the current month?`)) return;
    setBusy(true);
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const newRecords = [];
    
    for (const s of staff) {
      // Skip if already processed for this month
      if (payroll.some(p => p.staffId === s.username && p.month === month)) continue;
      
      const g = Number(s.salary) || 0;
      if (g <= 0) continue;

      const nssf = Math.min(2160, g * 0.06);
      const levy = g * 0.015;
      const shif = g * 0.0275;
      let taxable = g - nssf;
      let paye = 0;
      if (taxable > 24000) {
        if (taxable <= 32333) paye = (taxable - 24000) * 0.1;
        else if (taxable <= 500000) paye = (32333 - 24000) * 0.1 + (taxable - 32333) * 0.25;
        else paye = (32333 - 24000) * 0.1 + (500000 - 32333) * 0.25 + (taxable - 500000) * 0.3;
      }
      paye = Math.max(0, paye - 2400); 
      const net = g - nssf - levy - shif - paye;

      newRecords.push({
        id: Date.now() + Math.random(),
        staffId: s.username,
        staffName: s.name,
        month,
        basic: s.salary,
        nssf, levy, shif, paye, net,
        status: 'pending',
        date: new Date().toLocaleDateString()
      });
    }

    if (newRecords.length === 0) {
      alert('All staff members have already been processed for this month.');
      setBusy(false);
      return;
    }

    try {
      const updated = [...newRecords, ...payroll];
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_salary', value: updated }] })
      });
      setPayroll(updated);
      setTab('history');
      alert(`✅ Successfully processed ${newRecords.length} payroll records!`);
    } catch (e) {
      alert('❌ Bulk process failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(id) {
    const updated = payroll.map(p => p.id === id ? { ...p, status: 'paid', paidDate: new Date().toLocaleDateString() } : p);
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav7_salary', value: updated }] })
    });
    setPayroll(updated);
  }

  async function updateSalary(username, newSal) {
    setBusy(true);
    try {
      const dbRes = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'get', key: 'paav6_staff' }] }),
      });
      const db = await dbRes.json();
      const list = db.results[0]?.value || [];
      const idx = list.findIndex(s => s.username === username);
      if (idx >= 0) {
        list[idx].salary = Number(newSal);
        await fetch('/api/db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ type: 'set', key: 'paav6_staff', value: list }] }),
        });
        setStaff(list.filter(s => s.role !== 'parent'));
        alert('✅ Salary updated for ' + list[idx].name);
      }
    } catch(e) { alert(e.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Unified Payroll…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>💵 Staff Payroll & Compliance</h2>
          <p>Consolidated salary management with automated Kenyan statutory calculations</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-teal btn-sm" style={{ marginRight: 8 }} onClick={bulkProcess}>⚡ Bulk Process</button>
           <button className="btn btn-primary btn-sm" onClick={() => setTab('calc')}>+ Process New</button>
        </div>
      </div>

      <div className="sg sg4" style={{ marginBottom: 25 }}>
        <div className="panel" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
           <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 700 }}>MONTHLY GROSS</div>
           <div style={{ fontSize: 24, fontWeight: 900 }}>KSH {schoolSummary.totalGross.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
           <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>NET DISBURSEMENT</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: '#166534' }}>KSH {schoolSummary.totalNet.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
           <div style={{ fontSize: 11, color: '#991B1B', fontWeight: 700 }}>STATUTORY (PAYE/SHIF/NSSF)</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: '#991B1B' }}>KSH {schoolSummary.totalStat.toLocaleString()}</div>
        </div>
        <div className="panel" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
           <div style={{ fontSize: 11, color: '#5B21B6', fontWeight: 700 }}>STAFF PROCESSED</div>
           <div style={{ fontSize: 24, fontWeight: 900 }}>{schoolSummary.count} / {staff.length}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 25, background: '#F1F5F9', borderRadius: 12, padding: 5, display: 'inline-flex' }}>
        <button className={`tab-btn ${tab === 'calc' ? 'on' : ''}`} onClick={() => setTab('calc')}>🧮 Calculator</button>
        <button className={`tab-btn ${tab === 'history' ? 'on' : ''}`} onClick={() => setTab('history')}>📜 History</button>
        <button className={`tab-btn ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>⚙️ Settings</button>
      </div>

      {tab === 'calc' && (
        <div className="sg sg2">
          <div className="panel">
            <div className="panel-hdr"><h3>👤 Select Staff</h3></div>
            <div className="panel-body">
              <div className="field">
                <label>Staff Member</label>
                <select value={selStaffId} onChange={e => setSelStaffId(e.target.value)}>
                  <option value="">— Choose Staff —</option>
                  {staff.map(s => <option key={s.username} value={s.username}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              {selStaff && (
                <div style={{ marginTop: 20, padding: 20, background: '#F8FAFC', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                     <div style={{ width: 50, height: 50, borderRadius: 25, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900 }}>{selStaff.name[0]}</div>
                     <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{selStaff.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selStaff.role.toUpperCase()} • Base: KSH {selStaff.salary?.toLocaleString()}</div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            {!selStaff ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>Select a staff member to compute payroll</div>
            ) : (
              <div className="panel-body">
                <div style={{ border: `2px solid var(--primary)`, padding: 30, borderRadius: 15, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                  <div style={{ textAlign: 'center', borderBottom: `1px solid #E2E8F0`, paddingBottom: 20, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)', letterSpacing: -1 }}>OFFICIAL PAYSLIP</h2>
                    <p style={{ margin: 5, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleString('en-KE', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                  </div>
                  
                  <div className="tbl-wrap" style={{ marginBottom: 20 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: 'var(--muted)' }}>Basic Salary</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{currentPay.gross.toLocaleString()}</td></tr>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: '#DC2626' }}>NSSF Contribution</td><td style={{ textAlign: 'right', color: '#DC2626' }}>({currentPay.nssf.toLocaleString()})</td></tr>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: '#DC2626' }}>Housing Levy (1.5%)</td><td style={{ textAlign: 'right', color: '#DC2626' }}>({Math.round(currentPay.levy).toLocaleString()})</td></tr>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: '#DC2626' }}>SHIF / Health Ins.</td><td style={{ textAlign: 'right', color: '#DC2626' }}>({Math.round(currentPay.shif).toLocaleString()})</td></tr>
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: '#DC2626' }}>P.A.Y.E Tax</td><td style={{ textAlign: 'right', color: '#DC2626' }}>({Math.round(currentPay.paye).toLocaleString()})</td></tr>
                        <tr style={{ background: 'var(--primary-low)', fontWeight: 900, fontSize: 22 }}><td style={{ padding: 20 }}>NET SALARY</td><td style={{ textAlign: 'right', padding: 20, color: '#16A34A' }}>KSH {Math.round(currentPay.net).toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: 15, borderRadius: 12, fontWeight: 900 }} onClick={saveRecord} disabled={busy}>{busy ? 'Processing...' : '💾 Finalize & Record'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="panel">
          <div className="panel-hdr"><h3>📜 Disbursement History</h3></div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Staff Member</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(p => (
                  <tr key={p.id} className="hover-row">
                    <td style={{ fontSize: 11, fontWeight: 700 }}>{p.month}</td>
                    <td style={{ fontWeight: 800 }}>{p.staffName}</td>
                    <td>{p.basic.toLocaleString()}</td>
                    <td style={{ color: '#DC2626' }}>({Math.round(p.nssf + p.levy + p.shif + p.paye).toLocaleString()})</td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)' }}>{Math.round(p.net).toLocaleString()}</td>
                    <td><span className={`badge bg-${p.status === 'paid' ? 'green' : 'amber'}`}>{p.status.toUpperCase()}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        {p.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => markPaid(p.id)}>Mark Paid</button>}
                        <button className="btn btn-sm btn-ghost" onClick={() => setPrintSlip(p)}>🖨️ Payslip</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No payroll records found for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="panel">
          <div className="panel-hdr"><h3>⚙️ Salary Configuration</h3></div>
          <div className="panel-body">
            <div className="tbl-wrap">
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ textAlign: 'left', padding: 12 }}>Staff Name</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Role</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Base Salary (KSH)</th>
                    <th style={{ textAlign: 'right', padding: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.username} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: 12 }}><strong>{s.name}</strong></td>
                      <td style={{ padding: 12, fontSize: 11, color: 'var(--muted)' }}>{s.role.toUpperCase()}</td>
                      <td style={{ padding: 12 }}><input type="number" id={`sal-${s.username}`} defaultValue={s.salary} className="field" style={{ width: 150, margin: 0, padding: '8px 12px' }} /></td>
                      <td style={{ padding: 12, textAlign: 'right' }}><button className="btn btn-sm btn-ghost" onClick={() => updateSalary(s.username, document.getElementById(`sal-${s.username}`).value)}>Update</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {printSlip && (
        <div className="modal-overlay open">
          <div className="modal modal-lg" style={{ background: '#fff', borderRadius: 20 }}>
            <div className="modal-hdr" style={{ border: 'none' }}><h3>Payslip Generation</h3><button className="modal-close" onClick={() => setPrintSlip(null)}>✕</button></div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '0 40px 40px' }}>
              <div id="print-area" style={{ border: '1.5px solid #E2E8F0', padding: 40, borderRadius: 15, maxWidth: 600, margin: '0 auto', textAlign: 'left', background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                 <div style={{ textAlign: 'center', borderBottom: '3px solid var(--primary)', paddingBottom: 20, marginBottom: 25 }}>
                    <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--primary)', letterSpacing: -1 }}>{(profile.name || 'SCHOOL PORTAL').toUpperCase()}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, letterSpacing: 2, fontWeight: 700 }}>CERTIFIED MONTHLY PAYSLIP</div>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>EMPLOYEE DETAILS</div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{printSlip.staffName}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Role: {staff.find(s => s.username === printSlip.staffId)?.role || 'Staff'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>PAY PERIOD</div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{printSlip.month.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Status: {printSlip.status.toUpperCase()}</div>
                    </div>
                 </div>
                 <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                   <tbody>
                     <tr style={{ background: '#F8FAFC' }}><td colSpan={2} style={{ padding: '10px 15px', fontWeight: 800, fontSize: 11 }}>EARNINGS</td></tr>
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 15px' }}>Basic Salary</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(printSlip.basic).toLocaleString()}</td></tr>
                     <tr style={{ background: '#F8FAFC' }}><td colSpan={2} style={{ padding: '10px 15px', fontWeight: 800, fontSize: 11 }}>DEDUCTIONS & STATUTORY</td></tr>
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '10px 15px' }}>NSSF Contribution</td><td style={{ textAlign: 'right' }}>({Math.round(printSlip.nssf).toLocaleString()})</td></tr>
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '10px 15px' }}>Housing Levy (1.5%)</td><td style={{ textAlign: 'right' }}>({Math.round(printSlip.levy).toLocaleString()})</td></tr>
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '10px 15px' }}>SHIF / Health Insurance</td><td style={{ textAlign: 'right' }}>({Math.round(printSlip.shif).toLocaleString()})</td></tr>
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '10px 15px' }}>P.A.Y.E Tax</td><td style={{ textAlign: 'right' }}>({Math.round(printSlip.paye).toLocaleString()})</td></tr>
                     <tr style={{ background: 'var(--primary)', color: '#fff', fontWeight: 900, fontSize: 20 }}><td style={{ padding: '20px 15px', borderRadius: '0 0 0 10px' }}>NET PAYABLE</td><td style={{ textAlign: 'right', padding: '20px 15px', borderRadius: '0 0 10px 0' }}>KSH {Math.round(printSlip.net).toLocaleString()}</td></tr>
                   </tbody>
                 </table>
                 <div style={{ marginTop: 30, fontSize: 10, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>This is a computer generated payslip and does not require a signature.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30 }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Payslip</button>
                <button className="btn btn-ghost" onClick={() => setPrintSlip(null)}>Close Preview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tab-btn { padding: 10px 24px; border: none; background: none; border-radius: 10px; font-weight: 700; color: #64748B; cursor: pointer; transition: 0.2s; font-size: 13px; }
        .tab-btn.on { background: #fff; color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .hover-row:hover { background: #F8FAFC; }
      `}</style>
    </div>
  );
}
