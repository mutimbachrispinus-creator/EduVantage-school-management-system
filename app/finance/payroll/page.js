'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';
import FinanceNav from '@/components/FinanceNav';

const M = 'var(--primary)', M2 = 'var(--accent)', ML = 'var(--primary-low)', MB = '#F8FAFC';

function moneyValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return Math.round(moneyValue(value)).toLocaleString('en-KE');
}

function calcPayrollForStaff(staffMember, oneOffDeductions = [], toggles = { nssf: true, levy: true, shif: true, paye: true }) {
  const gross = moneyValue(staffMember?.salary);
  const nssf = toggles.nssf ? Math.min(2160, gross * 0.06) : 0;
  const levy = toggles.levy ? gross * 0.015 : 0;
  const shif = toggles.shif ? gross * 0.0275 : 0;
  let taxable = gross - nssf;
  let paye = 0;
  if (toggles.paye && taxable > 24000) {
    if (taxable <= 32333) paye = (taxable - 24000) * 0.1;
    else if (taxable <= 500000) paye = (32333 - 24000) * 0.1 + (taxable - 32333) * 0.25;
    else paye = (32333 - 24000) * 0.1 + (500000 - 32333) * 0.25 + (taxable - 500000) * 0.3;
  }
  if (toggles.paye) paye = Math.max(0, paye - 2400);

  const statutoryItems = [];
  if (toggles.nssf) statutoryItems.push({ label: 'NSSF Contribution', amount: nssf });
  if (toggles.levy) statutoryItems.push({ label: 'Housing Levy (1.5%)', amount: levy });
  if (toggles.shif) statutoryItems.push({ label: 'SHIF / Health Insurance', amount: shif });
  if (toggles.paye) statutoryItems.push({ label: 'P.A.Y.E Tax', amount: paye });

  const recurring = [
    { label: 'SACCO Loan', amount: staffMember?.saccoLoan },
    { label: 'Bank Loan', amount: staffMember?.bankLoan },
    { label: 'Salary Advance', amount: staffMember?.salaryAdvance },
    { label: 'Welfare Deduction', amount: staffMember?.welfareDeduction },
  ];

  if (moneyValue(staffMember?.loan) > 0 && moneyValue(staffMember?.saccoLoan) === 0 && moneyValue(staffMember?.bankLoan) === 0) {
    recurring.push({ label: 'Loan Repayment', amount: staffMember.loan });
  }

  const extraItems = [...recurring, ...oneOffDeductions]
    .map(item => ({ label: item.label || 'Other Deduction', amount: moneyValue(item.amount) }))
    .filter(item => item.amount > 0);

  const statutoryTotal = statutoryItems.reduce((sum, item) => sum + item.amount, 0);
  const otherDeductions = extraItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = statutoryTotal + otherDeductions;

  return {
    gross, nssf, levy, shif, paye,
    statutoryItems,
    deductionItems: extraItems,
    statutoryTotal,
    otherDeductions,
    totalDeductions,
    net: gross - totalDeductions
  };
}

function recordDeductionItems(record) {
  if (Array.isArray(record?.statutoryItems) || Array.isArray(record?.deductionItems)) {
    return [
      ...(record.statutoryItems || []),
      ...(record.deductionItems || [])
    ].map(item => ({ label: item.label || 'Deduction', amount: moneyValue(item.amount) })).filter(item => item.amount > 0);
  }

  const items = [
    { label: 'NSSF Contribution', amount: record?.nssf },
    { label: 'Housing Levy (1.5%)', amount: record?.levy },
    { label: 'SHIF / Health Insurance', amount: record?.shif },
    { label: 'P.A.Y.E Tax', amount: record?.paye },
    { label: 'SACCO Loan', amount: record?.saccoLoan },
    { label: 'Bank Loan', amount: record?.bankLoan },
    { label: 'Loan Repayment', amount: record?.loan },
    { label: 'Other Deductions', amount: record?.otherDeductions },
  ];
  return items.map(item => ({ ...item, amount: moneyValue(item.amount) })).filter(item => item.amount > 0);
}

function recordDeductionTotal(record) {
  const stored = moneyValue(record?.totalDeductions);
  if (stored > 0) return stored;
  return recordDeductionItems(record).reduce((sum, item) => sum + item.amount, 0);
}

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
  const [oneOffDeductions, setOneOffDeductions] = useState([{ label: '', amount: '' }]);
  const [statToggles, setStatToggles] = useState({ nssf: true, levy: true, shif: true, paye: true });
  const [inlineSalary, setInlineSalary] = useState('');

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
  useEffect(() => { 
    setOneOffDeductions([{ label: '', amount: '' }]); 
    const s = staff.find(st => st.username === selStaffId);
    setInlineSalary(s ? s.salary : '');
  }, [selStaffId, staff]);

  const selStaff = useMemo(() => staff.find(s => s.username === selStaffId), [staff, selStaffId]);

  /* ── Kenyan Payroll Logic ── */
  const currentPay = useMemo(() => {
    if (!selStaff) return null;
    const manual = oneOffDeductions.filter(d => moneyValue(d.amount) > 0).map(d => ({ label: d.label || 'Other Deduction', amount: d.amount }));
    // Use inline salary if edited, otherwise fallback to selStaff.salary
    const effectiveStaff = { ...selStaff, salary: inlineSalary !== '' ? inlineSalary : selStaff.salary };
    return calcPayrollForStaff(effectiveStaff, manual, statToggles);
  }, [selStaff, oneOffDeductions, statToggles, inlineSalary]);

  const schoolSummary = useMemo(() => {
    const activeMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthPayroll = payroll.filter(p => p.month === activeMonth);
    const totalGross = currentMonthPayroll.reduce((s, p) => s + (Number(p.basic) || 0), 0);
    const totalNet = currentMonthPayroll.reduce((s, p) => s + (Number(p.net) || 0), 0);
    const totalDeductions = currentMonthPayroll.reduce((s, p) => s + recordDeductionTotal(p), 0);
    return { totalGross, totalNet, totalStat: totalDeductions, count: currentMonthPayroll.length };
  }, [payroll]);

  async function saveRecord() {
    if (!selStaff || !currentPay) return;
    setBusy(true);
    const rec = {
      id: Date.now(),
      staffId: selStaff.username,
      staffName: selStaff.name,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      basic: currentPay.gross,
      nssf: currentPay.nssf,
      levy: currentPay.levy,
      shif: currentPay.shif,
      paye: currentPay.paye,
      statutoryItems: currentPay.statutoryItems,
      deductionItems: currentPay.deductionItems,
      otherDeductions: currentPay.otherDeductions,
      totalDeductions: currentPay.totalDeductions,
      net: currentPay.net,
      status: 'pending',
      date: new Date().toLocaleDateString()
    };

    try {
      const updated = [rec, ...payroll];
      const reqs = [{ type: 'set', key: 'paav7_salary', value: updated }];
      
      // Auto-save the salary to staff profile if it was edited
      if (inlineSalary !== '' && moneyValue(inlineSalary) !== moneyValue(selStaff.salary)) {
        const staffList = [...staff];
        const idx = staffList.findIndex(s => s.username === selStaff.username);
        if (idx >= 0) {
          staffList[idx].salary = moneyValue(inlineSalary);
          reqs.push({ type: 'set', key: 'paav6_staff', value: staffList });
        }
      }

      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: reqs })
      });
      setPayroll(updated);
      setTab('history');
      alert('✅ Payroll record saved!');
      load(); // reload staff to get updated salaries
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
      
      const pay = calcPayrollForStaff(s);
      if (pay.gross <= 0) continue;

      newRecords.push({
        id: Date.now() + Math.random(),
        staffId: s.username,
        staffName: s.name,
        month,
        basic: pay.gross,
        nssf: pay.nssf,
        levy: pay.levy,
        shif: pay.shif,
        paye: pay.paye,
        statutoryItems: pay.statutoryItems,
        deductionItems: pay.deductionItems,
        otherDeductions: pay.otherDeductions,
        totalDeductions: pay.totalDeductions,
        net: pay.net,
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

  function printCurrentPayslip() {
    document.body.classList.add('printing-payslip');
    const cleanup = () => {
      document.body.classList.remove('printing-payslip');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1200);
  }

  async function updateSalary(username, newSal, saccoLoan = 0, bankLoan = 0) {
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
        list[idx].salary = moneyValue(newSal);
        list[idx].saccoLoan = moneyValue(saccoLoan);
        list[idx].bankLoan = moneyValue(bankLoan);
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
    <div className="page on finance-page">
      <FinanceNav />
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
           <div style={{ fontSize: 24, fontWeight: 900 }}>KSH {money(schoolSummary.totalGross)}</div>
        </div>
        <div className="panel" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
           <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>NET DISBURSEMENT</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: '#166534' }}>KSH {money(schoolSummary.totalNet)}</div>
        </div>
        <div className="panel" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
           <div style={{ fontSize: 11, color: '#991B1B', fontWeight: 700 }}>STATUTORY (PAYE/SHIF/NSSF)</div>
           <div style={{ fontSize: 24, fontWeight: 900, color: '#991B1B' }}>KSH {money(schoolSummary.totalStat)}</div>
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
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{selStaff.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selStaff.role.toUpperCase()}</div>
                     </div>
                     <div>
                        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)' }}>BASIC SALARY (KSH)</label>
                        <input type="number" className="field" style={{ margin: 0, padding: '6px 12px', width: 140, fontWeight: 900, color: 'var(--primary)', fontSize: 16 }} value={inlineSalary} onChange={e => setInlineSalary(e.target.value)} placeholder="0.00" />
                     </div>
                  </div>
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed #E2E8F0' }}>
                    <label style={{ fontWeight: 700, fontSize: 13, color: 'var(--slate)', display: 'block', marginBottom: 10 }}>Statutory Deductions (Toggle to Levy)</label>
                    <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                       {Object.keys(statToggles).map(k => (
                         <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: statToggles[k] ? 'var(--primary-low)' : '#F1F5F9', padding: '6px 12px', borderRadius: 8, color: statToggles[k] ? 'var(--primary)' : '#64748B' }}>
                           <input type="checkbox" checked={statToggles[k]} onChange={e => setStatToggles(prev => ({ ...prev, [k]: e.target.checked }))} style={{ margin: 0 }} />
                           {k.toUpperCase()}
                         </label>
                       ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ fontWeight: 700, fontSize: 13, color: 'var(--slate)' }}>Additional Deductions</label>
                      <button className="btn btn-ghost btn-sm" onClick={() => setOneOffDeductions(d => [...d, { label: '', amount: '' }])}>+ Add Deduction</button>
                    </div>
                    {oneOffDeductions.map((deduction, idx) => (
                      <div className="field-row" key={idx} style={{ marginBottom: 10, alignItems: 'center' }}>
                        <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                          <input value={deduction.label} onChange={e => setOneOffDeductions(prev => { const n = [...prev]; n[idx].label = e.target.value; return n; })} placeholder="e.g. Welfare, Damage" />
                        </div>
                        <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                          <input type="number" min="0" value={deduction.amount} onChange={e => setOneOffDeductions(prev => { const n = [...prev]; n[idx].amount = e.target.value; return n; })} placeholder="KSH" />
                        </div>
                        {oneOffDeductions.length > 1 && (
                          <button style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 }} onClick={() => setOneOffDeductions(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                        )}
                      </div>
                    ))}
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
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 0', color: 'var(--muted)' }}>Basic Salary</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(currentPay.gross)}</td></tr>
                        {currentPay.statutoryItems.map(item => (
                          <tr key={item.label} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 0', color: '#DC2626' }}>{item.label}</td>
                            <td style={{ textAlign: 'right', color: '#DC2626' }}>({money(item.amount)})</td>
                          </tr>
                        ))}
                        {currentPay.deductionItems.map(item => (
                          <tr key={item.label} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 0', color: '#B45309' }}>{item.label}</td>
                            <td style={{ textAlign: 'right', color: '#B45309', fontWeight: 700 }}>({money(item.amount)})</td>
                          </tr>
                        ))}
                        <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FEF2F2' }}><td style={{ padding: '12px 0', fontWeight: 900, color: '#991B1B' }}>Total Deductions</td><td style={{ textAlign: 'right', color: '#991B1B', fontWeight: 900 }}>({money(currentPay.totalDeductions)})</td></tr>
                        <tr style={{ background: 'var(--primary-low)', fontWeight: 900, fontSize: 22 }}><td style={{ padding: 20 }}>NET SALARY</td><td style={{ textAlign: 'right', padding: 20, color: '#16A34A' }}>KSH {money(currentPay.net)}</td></tr>
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
                    <td>{money(p.basic)}</td>
                    <td style={{ color: '#DC2626' }}>({money(recordDeductionTotal(p))})</td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)' }}>{money(p.net || (moneyValue(p.basic) - recordDeductionTotal(p)))}</td>
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
                    <th style={{ textAlign: 'left', padding: 12 }}>SACCO Loan</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Bank Loan</th>
                    <th style={{ textAlign: 'right', padding: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.username} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: 12 }}><strong>{s.name}</strong></td>
                      <td style={{ padding: 12, fontSize: 11, color: 'var(--muted)' }}>{s.role.toUpperCase()}</td>
                      <td style={{ padding: 12 }}><input type="number" id={`sal-${s.username}`} defaultValue={s.salary} className="field" style={{ width: 150, margin: 0, padding: '8px 12px' }} /></td>
                      <td style={{ padding: 12 }}><input type="number" id={`sacco-${s.username}`} defaultValue={moneyValue(s.saccoLoan)} className="field" style={{ width: 130, margin: 0, padding: '8px 12px' }} /></td>
                      <td style={{ padding: 12 }}><input type="number" id={`bank-${s.username}`} defaultValue={moneyValue(s.bankLoan)} className="field" style={{ width: 130, margin: 0, padding: '8px 12px' }} /></td>
                      <td style={{ padding: 12, textAlign: 'right' }}><button className="btn btn-sm btn-ghost" onClick={() => updateSalary(
                        s.username,
                        document.getElementById(`sal-${s.username}`).value,
                        document.getElementById(`sacco-${s.username}`).value,
                        document.getElementById(`bank-${s.username}`).value
                      )}>Update</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {printSlip && (
        <div className="modal-overlay open payslip-print-shell">
          <div className="modal modal-lg" style={{ background: '#fff', borderRadius: 20 }}>
            <div className="modal-hdr" style={{ border: 'none' }}><h3>Payslip Generation</h3><button className="modal-close" onClick={() => setPrintSlip(null)}>✕</button></div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '0 40px 40px' }}>
              <div id="print-area" className="payslip-print-wrap" style={{ border: '1.5px solid #E2E8F0', padding: 40, borderRadius: 15, maxWidth: 600, margin: '0 auto', textAlign: 'left', background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
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
                     <tr style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '12px 15px' }}>Basic Salary</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(printSlip.basic)}</td></tr>
                     <tr style={{ background: '#F8FAFC' }}><td colSpan={2} style={{ padding: '10px 15px', fontWeight: 800, fontSize: 11 }}>DEDUCTIONS & STATUTORY</td></tr>
                     {recordDeductionItems(printSlip).map((item, idx) => (
                       <tr key={`${item.label}-${idx}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                         <td style={{ padding: '10px 15px' }}>{item.label}</td>
                         <td style={{ textAlign: 'right' }}>({money(item.amount)})</td>
                       </tr>
                     ))}
                     <tr style={{ background: '#FEF2F2', color: '#991B1B', fontWeight: 900 }}><td style={{ padding: '10px 15px' }}>TOTAL DEDUCTIONS</td><td style={{ textAlign: 'right', padding: '10px 15px' }}>({money(recordDeductionTotal(printSlip))})</td></tr>
                     <tr style={{ background: 'var(--primary)', color: '#fff', fontWeight: 900, fontSize: 20 }}><td style={{ padding: '20px 15px', borderRadius: '0 0 0 10px' }}>NET PAYABLE</td><td style={{ textAlign: 'right', padding: '20px 15px', borderRadius: '0 0 10px 0' }}>KSH {money(printSlip.net || (moneyValue(printSlip.basic) - recordDeductionTotal(printSlip)))}</td></tr>
                   </tbody>
                 </table>
                 <div style={{ marginTop: 30, fontSize: 10, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>This is a computer generated payslip and does not require a signature.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30 }}>
                <button className="btn btn-primary" onClick={printCurrentPayslip}>🖨️ Print Payslip</button>
                <button className="btn btn-ghost" onClick={() => setPrintSlip(null)}>Close Preview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tab-btn { padding: 10px 24px; border: none; background: none; border-radius: 10px; font-weight: 700; color: #64748B; cursor: pointer; transition: 0.2s; font-size: 13px; }
        .tab-btn.on { background: #fff; color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .hover-row:hover { background: #F8FAFC; }
        @media print {
          body.printing-payslip .page > :not(.payslip-print-shell) {
            display: none !important;
          }
          body.printing-payslip .payslip-print-shell {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            inset: auto !important;
            background: #fff !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body.printing-payslip .payslip-print-shell .modal,
          body.printing-payslip .payslip-print-shell .modal-body {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          body.printing-payslip .payslip-print-shell .modal-hdr,
          body.printing-payslip .payslip-print-shell .btn,
          body.printing-payslip .payslip-print-shell .modal-close {
            display: none !important;
          }
          body.printing-payslip #print-area {
            display: block !important;
            visibility: visible !important;
            max-width: 180mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
