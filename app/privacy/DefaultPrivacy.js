'use client';
import Link from 'next/link';

const PRIMARY = '#4F46E5';
const DARK = '#0F172A';
const SLATE = '#64748B';

export default function DefaultPrivacy() {
  return (
    <div style={{ background: '#FAFAFB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '18px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/eduvantage-logo.png" alt="EduVantage" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: DARK, fontFamily: 'var(--font-sora, sans-serif)', letterSpacing: '-0.02em' }}>EduVantage</span>
          </Link>
          <Link href="/" style={{ padding: '10px 22px', borderRadius: 12, background: PRIMARY, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>← Back to Home</Link>
        </div>
      </nav>

      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1E1B4B 100%)`, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(79,70,229,0.3) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(139,92,246,0.2) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', padding: '8px 18px', background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)', borderRadius: 99, fontSize: 13, fontWeight: 800, color: '#A5B4FC', marginBottom: 24 }}>🔐 Legal & Compliance</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 16px', fontFamily: 'var(--font-sora, sans-serif)' }}>Privacy Policy</h1>
          <p style={{ color: '#94A3B8', fontSize: 18, maxWidth: 600, margin: '0 auto 24px' }}>How EduVantage collects, uses, and protects your data across our school management platform.</p>
          <p style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Last Updated: May 17, 2026 &nbsp;·&nbsp; Effective Date: January 1, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px' }}>

        {/* Quick Nav */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '32px 40px', marginBottom: 48, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Table of Contents</h2>
          <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
            {['Information We Collect', 'How We Use Your Information', 'Data Sharing & Disclosure', 'Data Retention', 'Security Measures', 'Children\'s Privacy', 'Cookies & Tracking', 'Your Rights', 'Payment Data', 'Contact Us'].map((item, i) => (
              <li key={i} style={{ color: PRIMARY, fontWeight: 600, fontSize: 15, paddingBottom: 2 }}>{item}</li>
            ))}
          </ol>
        </div>

        <Section title="1. Who We Are">
          <p>EduVantage ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") is a school management platform operated by EduVantage Platform Ltd., a technology company registered in Kenya. We provide an integrated suite of tools for educational institutions, including academic management, fee collection, payroll, communication, and parent engagement services.</p>
          <p>This Privacy Policy applies to all users of the EduVantage platform — including school administrators, teachers, parents, students, and platform super-administrators — who access our services via our web application at <strong>eduvantage.app</strong> or any associated sub-domains.</p>
        </Section>

        <Section title="2. Information We Collect">
          <SubHeading>2.1 Information You Provide</SubHeading>
          <p>When schools, staff, or parents register and use the platform, we collect:</p>
          <ul>
            <li><strong>School Information:</strong> Institution name, county, school type, curriculum type, NEMIS code, Safaricom Paybill/Till numbers, and bank account details for settlement purposes.</li>
            <li><strong>Staff & Administrator Data:</strong> Full names, national ID numbers, phone numbers, email addresses, payroll details (salary, allowances, deductions), role and department assignments.</li>
            <li><strong>Learner (Student) Data:</strong> Admission numbers, full names, date of birth, grade/class/stream, gender, medical notes, and national examination registration numbers.</li>
            <li><strong>Parent & Guardian Data:</strong> Full names, phone numbers linked to registered students, and payment transaction history.</li>
            <li><strong>Academic Records:</strong> Examination marks, grades, attendance records, academic performance history, curriculum pathway, and national exam predictions.</li>
            <li><strong>Financial Data:</strong> Fee payment records, receipts, outstanding balances, payroll calculations, and settlement transaction logs.</li>
          </ul>

          <SubHeading>2.2 Information Collected Automatically</SubHeading>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, timestamps of logins, session durations, and audit trail logs of administrative actions.</li>
            <li><strong>Device & Browser Data:</strong> IP address, browser type, operating system, and screen resolution for security and compatibility purposes.</li>
            <li><strong>Cookies:</strong> Session cookies for authentication and optional analytics cookies. See Section 7 for details.</li>
          </ul>

          <SubHeading>2.3 Payment Information</SubHeading>
          <p>We collect M-Pesa transaction data via the Safaricom Daraja API, including phone numbers, transaction amounts, MPESA reference codes, and timestamps. We do not store raw M-Pesa PIN data; all payment processing is handled via Safaricom's secure gateway.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use collected data solely to deliver, maintain, and improve the EduVantage platform. Specifically:</p>
          <Table rows={[
            ['Academic Management', 'Store and process learner marks, generate report cards, merit lists, and national exam predictions.'],
            ['Fee Collection & Settlement', 'Process M-Pesa STK Push payments, generate receipts, reconcile fee balances, and disburse funds via B2C/B2B to registered school accounts.'],
            ['Payroll Processing', 'Calculate staff salaries, statutory deductions (PAYE, SHIF, NSSF, Housing Levy), and generate payslips.'],
            ['Communication', 'Send automated SMS alerts (attendance, fee reminders), internal messages between stakeholders, and school announcements.'],
            ['Security & Fraud Prevention', 'Our Integrity Lock system cross-references all document generation (report cards, receipts) against the official student registry to prevent ghost-student fraud.'],
            ['Platform Analytics', 'Generate anonymized usage statistics to improve platform performance and feature development.'],
            ['Legal Compliance', 'Maintain records as required by Kenya\'s Basic Education Act, Data Protection Act 2019, and Safaricom Daraja API compliance terms.'],
          ]} />
        </Section>

        <Section title="4. Data Sharing & Disclosure">
          <p>We do <strong>not</strong> sell, rent, or trade your personal data. We share data only in the following limited circumstances:</p>
          <SubHeading>4.1 Within Your School</SubHeading>
          <p>Data is shared with authorized users within each school tenant — administrators, teachers, and parents — strictly based on their assigned role permissions. Data is tenant-isolated; no school can access another school's data.</p>
          <SubHeading>4.2 Third-Party Service Providers (Important Alert)</SubHeading>
          <div style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B', padding: '16px', borderRadius: '4px', margin: '16px 0', fontSize: '15px' }}>
            <strong>⚠️ IMPORTANT:</strong> By using EduVantage, you acknowledge and agree that certain personal and financial data is transmitted to and processed by our trusted third-party partners to facilitate core platform functions:
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li><strong>Safaricom M-Pesa (Daraja API):</strong> For processing STK Push payments, B2C, and B2B settlements. Phone numbers and transaction amounts are shared securely.</li>
              <li><strong>PesaPal / Payment Gateway:</strong> For processing credit/debit card and alternative digital payments under PCI DSS compliance.</li>
              <li><strong>Africa's Talking:</strong> For delivering bulk SMS notifications, alerts, and OTPs to registered mobile numbers.</li>
            </ul>
          </div>
          <ul>
            <li><strong>Turso / Cloudflare:</strong> Our database and edge hosting infrastructure, operating under strict data processing agreements.</li>
          </ul>
          <SubHeading>4.3 Legal Obligations</SubHeading>
          <p>We may disclose personal data when required to do so by Kenyan law, court order, or regulatory authority, including the Office of the Data Protection Commissioner (ODPC).</p>
          <SubHeading>4.4 Business Continuity</SubHeading>
          <p>In the event of a merger, acquisition, or asset sale, user data may be transferred to the successor entity, subject to equivalent privacy protections.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain data for as long as a school's subscription is active and for a period thereafter as required by law or legitimate business purposes:</p>
          <ul>
            <li><strong>Academic Records:</strong> Retained for a minimum of 7 years per Kenya Education Ministry guidelines.</li>
            <li><strong>Financial Records (Receipts & Payroll):</strong> Retained for 7 years in compliance with the Kenya Revenue Authority (KRA) requirements.</li>
            <li><strong>Audit Logs:</strong> Retained for 3 years for security and dispute resolution.</li>
            <li><strong>Inactive Accounts:</strong> School accounts inactive for more than 24 months will receive a 90-day data deletion notice before permanent deletion.</li>
          </ul>
          <p>Upon school account termination, anonymized statistical data may be retained for platform improvement analytics.</p>
        </Section>

        <Section title="6. Security Measures">
          <p>EduVantage employs multiple layers of technical and organizational security to protect your data:</p>
          <ul>
            <li><strong>Cryptographic Integrity Locks:</strong> All report cards and payment receipts are cryptographically bound to the official student registry, preventing unauthorized document generation.</li>
            <li><strong>Tenant Isolation:</strong> Each school operates in a fully isolated database namespace — cross-tenant data access is architecturally impossible.</li>
            <li><strong>TLS Encryption:</strong> All data in transit is encrypted using industry-standard TLS 1.3.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Users can only access data pertinent to their assigned role (admin, teacher, parent, student).</li>
            <li><strong>Audit Trail:</strong> All critical administrative actions (data edits, deletions, financial transactions) are logged immutably.</li>
            <li><strong>Edge Architecture:</strong> We deploy on Cloudflare's global edge network, providing DDoS protection and 99.9% availability SLA.</li>
          </ul>
          <p>Despite our best efforts, no system is 100% secure. We encourage schools to maintain strong password policies and promptly report any suspected security incidents to <strong>security@eduvantage.app</strong>.</p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>EduVantage serves educational institutions that enroll minor children. We take children's data protection with the utmost seriousness:</p>
          <ul>
            <li>Learner data is only entered and managed by authorized school administrators — minors do not directly register on the platform.</li>
            <li>Parent portal access is strictly limited to parents/guardians whose phone numbers are registered against a verified learner in the school registry.</li>
            <li>We do not use learner data for advertising, profiling, or any purpose beyond the direct delivery of educational management services.</li>
            <li>Student performance data is only accessible to the student's own school, assigned teachers, and verified parents — never made public or shared across schools.</li>
          </ul>
          <p>Our practices are designed to comply with the <strong>Children Act 2022 (Kenya)</strong> and best practices for child data protection in educational technology.</p>
        </Section>

        <Section title="8. Cookies & Tracking">
          <p>We use the following types of cookies:</p>
          <Table rows={[
            ['Session Cookies', 'Essential', 'Required for authentication and maintaining your logged-in session. Cannot be disabled.'],
            ['Preference Cookies', 'Functional', 'Stores your UI preferences (e.g., selected theme, language). Deleted on session end.'],
            ['Analytics Cookies', 'Optional', 'Anonymized usage data to improve platform performance. Can be opted out.'],
          ]} headers={['Cookie Type', 'Category', 'Purpose']} />
          <p style={{ marginTop: 16 }}>We do not use third-party advertising or tracking cookies. Analytics data is processed in aggregate and never linked back to individual users.</p>
        </Section>

        <Section title="9. Your Rights">
          <p>Under the <strong>Kenya Data Protection Act, 2019</strong> and applicable regulations, you have the following rights:</p>
          <ul>
            <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data where it is no longer necessary for the purposes for which it was collected, subject to our legal retention obligations.</li>
            <li><strong>Right to Object:</strong> Object to processing of your data in specific circumstances.</li>
            <li><strong>Right to Data Portability:</strong> Request your data in a structured, machine-readable format.</li>
            <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
          </ul>
          <p>To exercise any of these rights, submit a written request to <strong>privacy@eduvantage.app</strong>. We will respond within 21 days as required by the ODPC.</p>
        </Section>

        <Section title="10. Payment Data & Financial Privacy">
          <p>EduVantage operates as a <strong>payment aggregator</strong> under our central Safaricom Paybill. This means:</p>
          <ul>
            <li>Parent M-Pesa payment data (phone number, amount, reference) is processed through Safaricom's Daraja API and stored in your school's isolated payment ledger.</li>
            <li>A platform convenience fee of <strong>KES 50</strong> is automatically deducted from each transaction as disclosed at the point of payment.</li>
            <li>School settlement disbursements (B2C/B2B) are processed via Safaricom's Business to Customer API to registered school bank accounts or Till numbers.</li>
            <li>No full payment card numbers are stored by EduVantage. Card processing (where applicable) is handled by PesaPal under PCI DSS compliance.</li>
          </ul>
        </Section>

        <Section title="11. International Data Transfers">
          <p>EduVantage primarily stores and processes data within Kenya and on Cloudflare's edge infrastructure, which may include servers in regions outside Kenya. Where international transfers occur, we ensure equivalent data protection standards apply through contractual data processing agreements with all sub-processors.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Privacy Policy periodically to reflect changes in our practices or legal obligations. We will notify registered school administrators via email and an in-platform banner at least <strong>30 days</strong> before material changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="13. Contact & Data Protection Officer">
          <p>For privacy-related inquiries, data requests, or to report a concern:</p>
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 16, padding: '28px 32px', marginTop: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, color: DARK, fontSize: 16 }}>EduVantage Platform Ltd. — Data Protection Office</p>
            <p style={{ margin: '8px 0 0', color: SLATE }}>📧 privacy@eduvantage.app</p>
            <p style={{ margin: '4px 0 0', color: SLATE }}>🔒 security@eduvantage.app <em>(security incidents only)</em></p>
            <p style={{ margin: '4px 0 0', color: SLATE }}>📍 Nairobi, Kenya</p>
          </div>
          <p style={{ marginTop: 20 }}>You also have the right to lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> at <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" style={{ color: PRIMARY }}>odpc.go.ke</a>.</p>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ color: SLATE, fontSize: 14, margin: 0 }}>© {new Date().getFullYear()} EduVantage Platform Ltd. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/privacy" style={{ color: PRIMARY, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: SLATE, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/" style={{ color: SLATE, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid #EEF2FF', fontFamily: 'var(--font-sora, sans-serif)' }}>{title}</h2>
      <div style={{ color: '#475569', fontSize: 16, lineHeight: 1.8 }}>
        {children}
      </div>
      <style>{`
        section p { margin: 0 0 16px; }
        section ul { margin: 8px 0 16px; padding-left: 24px; }
        section li { margin-bottom: 10px; }
        section strong { color: #0F172A; }
      `}</style>
    </section>
  );
}

function SubHeading({ children }) {
  return <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', margin: '24px 0 10px', letterSpacing: '-0.01em' }}>{children}</h3>;
}

function Table({ rows, headers }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
        {headers && (
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFB' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '16px 20px', color: j === 0 ? '#0F172A' : '#475569', fontWeight: j === 0 ? 700 : 400, verticalAlign: 'top', lineHeight: 1.6 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
