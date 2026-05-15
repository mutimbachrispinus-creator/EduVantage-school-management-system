'use client';
export const runtime = 'edge';
export default function ProposalPage() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0', fontFamily: 'Inter, sans-serif' }}>
      <div className="no-print" style={{ textAlign: 'center', marginBottom: 20 }}>
        <button onClick={() => window.print()} style={{ padding: '12px 30px', background: '#8B1A1A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, boxShadow: '0 4px 12px rgba(139,26,26,0.3)' }}>🖨️ Save as PDF / Print</button>
      </div>

      <div className="proposal-page" style={{ background: 'white', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '25mm', boxSizing: 'border-box', boxShadow: '0 0 50px rgba(0,0,0,0.05)', position: 'relative' }}>
        <style jsx>{`
          @media print {
            .no-print { display: none !important; }
            .proposal-page { box-shadow: none !important; margin: 0 !important; padding: 15mm !important; width: 100% !important; }
            body { background: white !important; }
          }
        `}</style>
        
        <div style={{ borderBottom: '6px solid #8B1A1A', paddingBottom: 20, marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '36pt', margin: 0, color: '#8B1A1A', fontWeight: 800 }}>MARKETING PROPOSAL</h1>
          <div style={{ fontSize: '14pt', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3, marginTop: 5 }}>EduVantage School Management Platform</div>
        </div>

        <section style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18pt', color: '#8B1A1A', borderLeft: '5px solid #8B1A1A', paddingLeft: 15, marginBottom: 15 }}>1. Executive Summary</h2>
          <p style={{ lineHeight: 1.7, fontSize: '11pt', color: '#1E293B' }}>
            The **EduVantage School Management Platform** is a high-performance digital solution designed to centralize school operations, enhance parent engagement, and streamline academic tracking. By transitioning from manual to automated systems, your institution will achieve greater efficiency, data accuracy, and professional visibility.
          </p>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18pt', color: '#8B1A1A', borderLeft: '5px solid #8B1A1A', paddingLeft: 15, marginBottom: 15 }}>2. Key Modules</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #E2E8F0', fontSize: '10pt' }}>Module</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #E2E8F0', fontSize: '10pt' }}>Strategic Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt', fontWeight: 700 }}>CBC Academic Engine</td><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt' }}>Automated grading and professional A4 report card generation.</td></tr>
              <tr><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt', fontWeight: 700 }}>Financial Suite</td><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt' }}>Real-time fee collection, arrears tracking, and digital receipts.</td></tr>
              <tr><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt', fontWeight: 700 }}>Smart Communication</td><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt' }}>Integrated SMS API for instant parent notifications and alerts.</td></tr>
              <tr><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt', fontWeight: 700 }}>Logistics & Staff</td><td style={{ padding: 12, borderBottom: '1px solid #E2E8F0', fontSize: '10pt' }}>Automated timetables, duty rosters, and staff records.</td></tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18pt', color: '#8B1A1A', borderLeft: '5px solid #8B1A1A', paddingLeft: 15, marginBottom: 15 }}>3. Investment Structure</h2>
          <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: 25, borderRadius: 15 }}>
            {[
              { label: 'Portal Software License & Implementation (One-time)', val: 'KES 50,000' },
              { label: 'Domain Name (.ac.ke / .com) Registration', val: 'KES 2,000 / Year' },
              { label: 'Cloud Hosting & Turso Relational DB', val: 'KES 10,000 / Year' },
              { label: 'SMS Service Integration & Initial Setup', val: 'KES 5,000 (Once)' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '11pt' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>{item.label}</span>
                <span style={{ fontWeight: 800, color: '#8B1A1A' }}>{item.val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTop: '2px solid #FEE2E2', fontSize: '14pt', fontWeight: 900 }}>
              <span>Total Initial Investment</span>
              <span style={{ color: '#8B1A1A' }}>KES 67,000</span>
            </div>
          </div>
        </section>

        <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 20, fontSize: '10pt', color: '#64748B' }}>
          <div>Prepared By: <strong style={{ color: '#1E293B' }}>Antigravity AI Systems</strong></div>
          <div>Date: <strong style={{ color: '#1E293B' }}>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
        </div>
      </div>
    </div>
  );
}
