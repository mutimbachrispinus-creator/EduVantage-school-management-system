'use client';
import Link from 'next/link';

const PRIMARY = '#4F46E5';
const DARK = '#0F172A';
const SLATE = '#64748B';
const ACCENT = '#10B981';

export default function TermsOfService() {
  return (
    <div style={{ background: '#FAFAFB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '18px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${PRIMARY}, #8B5CF6)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(79,70,229,0.3)' }}>
              <img src="/ev-brand-v3.png" alt="EduVantage" style={{ width: 20, height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: DARK, fontFamily: 'var(--font-sora, sans-serif)', letterSpacing: '-0.02em' }}>EduVantage</span>
          </Link>
          <Link href="/" style={{ padding: '10px 22px', borderRadius: 12, background: PRIMARY, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>← Back to Home</Link>
        </div>
      </nav>

      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0D2137 100%)`, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 25% 50%, rgba(16,185,129,0.2) 0%, transparent 55%), radial-gradient(circle at 75% 50%, rgba(79,70,229,0.2) 0%, transparent 55%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', padding: '8px 18px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 99, fontSize: 13, fontWeight: 800, color: '#6EE7B7', marginBottom: 24 }}>📋 Legal Agreement</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 16px', fontFamily: 'var(--font-sora, sans-serif)' }}>Terms of Service</h1>
          <p style={{ color: '#94A3B8', fontSize: 18, maxWidth: 640, margin: '0 auto 24px' }}>The legal agreement governing your use of the EduVantage school management platform and all associated services.</p>
          <p style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Last Updated: May 17, 2026 &nbsp;·&nbsp; Effective Date: January 1, 2026</p>
        </div>
      </div>

      {/* Important Notice Banner */}
      <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#92400E', fontWeight: 700, fontSize: 15 }}>⚠️ Please read these Terms carefully before using EduVantage. By accessing our platform, you agree to be bound by these Terms.</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px' }}>

        {/* Quick Nav */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '32px 40px', marginBottom: 48, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Table of Contents</h2>
          <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
            {['Acceptance of Terms', 'Platform Description', 'Account Registration', 'Subscription & Billing', 'Payment Processing', 'Acceptable Use Policy', 'Intellectual Property', 'Data Ownership', 'Service Availability', 'Limitation of Liability', 'Termination', 'Governing Law'].map((item, i) => (
              <li key={i} style={{ color: PRIMARY, fontWeight: 600, fontSize: 15, paddingBottom: 2 }}>{item}</li>
            ))}
          </ol>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>These Terms of Service ("<strong>Terms</strong>") constitute a legally binding agreement between you ("<strong>School</strong>", "<strong>User</strong>", or "<strong>you</strong>") and <strong>EduVantage Platform Ltd.</strong> ("<strong>EduVantage</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"), a company registered in Kenya.</p>
          <p>By clicking "Get Started", registering a school account, or using any part of the EduVantage platform, you confirm that:</p>
          <ul>
            <li>You are authorized to enter into this agreement on behalf of the educational institution;</li>
            <li>You have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" style={{ color: PRIMARY, fontWeight: 700 }}>Privacy Policy</Link>;</li>
            <li>The institution you represent is a legally recognized educational entity;</li>
            <li>You are at least 18 years of age.</li>
          </ul>
          <p>If you do not agree to these Terms, you must not use the EduVantage platform.</p>
        </Section>

        <Section title="2. Platform Description">
          <p>EduVantage is a comprehensive, cloud-based school management platform that provides educational institutions with an integrated suite of tools including, but not limited to:</p>
          <ul>
            <li><strong>Academic Management:</strong> Curriculum-aware grading, examination records, report cards, merit lists, and national exam prediction for CBC, TVET/CBET, Cambridge, British, IB, and Montessori frameworks.</li>
            <li><strong>Financial Management:</strong> Fee collection via M-Pesa (Safaricom STK Push), payment reconciliation, revenue integrity dashboards, and automated B2C/B2B settlement disbursements.</li>
            <li><strong>Payroll Engine:</strong> Automated salary processing with PAYE, SHIF, NSSF, Housing Levy, bank loan, and SACCO deduction calculations.</li>
            <li><strong>Communication Hub:</strong> Bulk SMS, internal messaging, parent portal notifications, and targeted alerts.</li>
            <li><strong>Learning Management:</strong> Video lesson hosting, searchable lesson libraries, timetabling, and attendance tracking.</li>
            <li><strong>Anti-Fraud Systems:</strong> Cryptographic Integrity Locks binding documents to the official student registry.</li>
            <li><strong>EduVantage Pay:</strong> A centralized payment aggregation service enabling schools to receive M-Pesa payments through EduVantage's Safaricom Paybill without requiring individual Daraja API onboarding.</li>
          </ul>
          <p>EduVantage reserves the right to modify, add, or discontinue features at any time, with reasonable notice to active subscribers.</p>
        </Section>

        <Section title="3. Account Registration & Responsibilities">
          <SubHeading>3.1 Account Creation</SubHeading>
          <p>To access the platform, schools must complete the registration process via <strong>/saas/signup</strong>, providing accurate and complete institutional information including school name, curriculum type, county, and authorized administrator contact details. You agree to keep this information current.</p>

          <SubHeading>3.2 Account Security</SubHeading>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of all login credentials issued under your school account;</li>
            <li>All activities that occur under your account, regardless of whether authorized by you;</li>
            <li>Immediately notifying EduVantage of any unauthorized access or security breach at <strong>security@eduvantage.app</strong>;</li>
            <li>Ensuring that staff with system access operate within their designated role permissions.</li>
          </ul>

          <SubHeading>3.3 Accuracy of Data</SubHeading>
          <p>You are solely responsible for the accuracy of all data entered into the platform, including but not limited to: learner enrolment records, examination marks, staff payroll data, and fee schedules. EduVantage is a data processing tool — we do not verify the accuracy of institutional data independently.</p>
        </Section>

        <Section title="4. Subscription & Billing">
          <SubHeading>4.1 Free Trial</SubHeading>
          <p>EduVantage offers a <strong>1-Term Free Trial</strong> providing full platform access with no payment required. The trial is limited to one term per institution. At the conclusion of the trial, continued use requires a paid subscription.</p>

          <SubHeading>4.2 Subscription Plans</SubHeading>
          <p>Paid subscriptions are billed on a per-student, per-term basis. Current pricing is published on our landing page and within the platform settings. Prices are in <strong>Kenya Shillings (KES)</strong> and are subject to change with <strong>30 days' notice</strong>.</p>

          <SubHeading>4.3 Payment</SubHeading>
          <p>Subscription fees are collected via M-Pesa, bank transfer, or such other payment methods as EduVantage designates. Invoices are generated at the beginning of each term. Failure to pay within 14 days of invoice issuance may result in service suspension.</p>

          <SubHeading>4.4 Refunds</SubHeading>
          <p>Subscription fees are non-refundable except in cases of:</p>
          <ul>
            <li>Verified billing errors attributable to EduVantage;</li>
            <li>Service unavailability exceeding the uptime SLA for more than 72 consecutive hours;</li>
            <li>Account termination within the first 7 days of a new paid subscription term.</li>
          </ul>
          <p>Refund requests must be submitted in writing to <strong>billing@eduvantage.app</strong> within 14 days of the disputed charge.</p>
        </Section>

        <Section title="5. EduVantage Pay — Payment Processing Terms">
          <p>Schools that opt into the <strong>EduVantage Pay</strong> aggregator service agree to the following additional terms:</p>

          <SubHeading>5.1 Aggregator Model</SubHeading>
          <p>EduVantage operates as a central payment aggregator. Parents and guardians make fee payments to EduVantage's Safaricom Paybill. EduVantage processes these payments and remits collected funds (net of the platform convenience fee) to the school's registered bank account or Till Number.</p>

          <SubHeading>5.2 Convenience Fee</SubHeading>
          <p>A platform convenience fee of <strong>KES 50 per transaction</strong> is automatically deducted from each parent payment. This fee is disclosed to parents at the point of payment. Schools acknowledge and consent to this deduction as a condition of using EduVantage Pay.</p>

          <SubHeading>5.3 Settlement</SubHeading>
          <p>Collected funds (net of the KES 50 convenience fee) are disbursed to the school's registered bank account or Safaricom Till via B2C/B2B API. Settlement timelines are:</p>
          <ul>
            <li><strong>Standard Settlement:</strong> Within 2 business days of a disbursement request.</li>
            <li><strong>Safaricom Processing Time:</strong> EduVantage is not liable for delays caused by Safaricom's payment infrastructure or system maintenance.</li>
          </ul>

          <SubHeading>5.4 School Obligations</SubHeading>
          <p>Schools using EduVantage Pay must:</p>
          <ul>
            <li>Provide accurate bank account or Till Number details and promptly update these if they change;</li>
            <li>Ensure that fee schedules entered into the platform accurately reflect the fees charged to parents;</li>
            <li>Not use EduVantage Pay for transactions unrelated to legitimate school fee collection.</li>
          </ul>

          <SubHeading>5.5 Liability for Financial Disputes</SubHeading>
          <p>EduVantage is not liable for disputes arising from a school's fee policies, incorrect fee schedules, or unauthorized payment demands. Any parent payment disputes must be resolved between the school and the parent; EduVantage may provide transaction records to assist resolution but is not a party to the fee dispute.</p>
        </Section>

        <Section title="6. Acceptable Use Policy">
          <p>You agree to use EduVantage only for lawful purposes and in accordance with these Terms. You must <strong>NOT</strong>:</p>
          <ul>
            <li>Enroll fictitious, ghost, or non-existent students in the platform for any fraudulent purpose;</li>
            <li>Manipulate academic records, examination marks, or financial data to deceive parents, students, regulatory bodies, or any third party;</li>
            <li>Use the SMS or communication features to send spam, unsolicited marketing, or messages unrelated to school operations;</li>
            <li>Attempt to access or extract data belonging to other school tenants;</li>
            <li>Use automated scripts, bots, or scraping tools against the platform without written authorization;</li>
            <li>Upload malicious code, viruses, or content that infringes third-party intellectual property rights;</li>
            <li>Resell, sublicense, or otherwise commercialize access to the EduVantage platform without written consent;</li>
            <li>Circumvent or attempt to disable any security, integrity lock, or access control features.</li>
          </ul>
          <p>Violation of this Acceptable Use Policy may result in immediate account suspension without refund and may be reported to the relevant authorities including the Directorate of Criminal Investigations (DCI) and the ODPC.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <SubHeading>7.1 EduVantage IP</SubHeading>
          <p>The EduVantage platform — including its software, algorithms, interface design, branding, logos, documentation, and all proprietary systems (including the Integrity Lock system and curriculum-aware grading engine) — is the exclusive intellectual property of EduVantage Platform Ltd. and is protected under Kenyan and international copyright, trademark, and trade secret laws.</p>
          <p>No part of the platform may be copied, reproduced, reverse-engineered, decompiled, or distributed without prior written consent from EduVantage.</p>

          <SubHeading>7.2 Your Data</SubHeading>
          <p>You retain full ownership of all data you input into the platform — including student records, academic data, financial records, and institutional information. EduVantage claims no ownership over your institutional data. You grant EduVantage a limited, non-exclusive license to process this data solely to provide the contracted services.</p>

          <SubHeading>7.3 Feedback</SubHeading>
          <p>Any feedback, suggestions, or feature requests you provide to EduVantage may be used to improve the platform without obligation of compensation or attribution to you.</p>
        </Section>

        <Section title="8. Data Ownership & Portability">
          <p>Your school's data belongs to your school. Upon request, and within 30 days of account termination:</p>
          <ul>
            <li>EduVantage will provide an export of your school's data in CSV/JSON format;</li>
            <li>This includes: learner profiles, academic records, fee payment history, and payroll records;</li>
            <li>After the data export period, EduVantage will delete your data in accordance with our <Link href="/privacy" style={{ color: PRIMARY, fontWeight: 700 }}>Privacy Policy</Link>.</li>
          </ul>
          <p>EduVantage is not responsible for ensuring the compatibility of exported data with third-party systems.</p>
        </Section>

        <Section title="9. Service Availability & SLA">
          <p>EduVantage targets a <strong>99.9% monthly uptime</strong> for the core platform. Scheduled maintenance will be communicated at least 24 hours in advance via in-platform notifications and email.</p>
          <p>We are not liable for:</p>
          <ul>
            <li>Downtime caused by third-party services (Safaricom Daraja API, SMS gateways, Cloudflare infrastructure);</li>
            <li>Interruptions caused by internet connectivity issues on the school's side;</li>
            <li>Force majeure events including natural disasters, government actions, or national telecommunications failures.</li>
          </ul>
          <p>Service credits for verified downtime exceeding SLA may be applied at EduVantage's sole discretion upon written request within 14 days of the incident.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#7F1D1D', fontWeight: 600, lineHeight: 1.7 }}>
              TO THE MAXIMUM EXTENT PERMITTED BY KENYAN LAW, EDUVANTAGE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF REVENUE, LOSS OF DATA, REPUTATIONAL HARM, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM, EVEN IF EDUVANTAGE HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </div>
          <p>EduVantage's total cumulative liability to you for any claims arising under these Terms shall not exceed the total subscription fees paid by your institution to EduVantage in the <strong>3 months preceding the claim</strong>.</p>
          <p>Notwithstanding the above, nothing in these Terms limits EduVantage's liability for:</p>
          <ul>
            <li>Death or personal injury caused by EduVantage's gross negligence;</li>
            <li>Fraud or fraudulent misrepresentation by EduVantage;</li>
            <li>Any liability that cannot be excluded or limited by applicable Kenyan law.</li>
          </ul>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless EduVantage Platform Ltd. and its officers, directors, employees, and agents from and against any claims, damages, penalties, losses, and expenses (including legal fees) arising out of or relating to:</p>
          <ul>
            <li>Your breach of these Terms;</li>
            <li>Your violation of any applicable law or third-party rights;</li>
            <li>Inaccurate, fraudulent, or misleading data entered into the platform by your institution;</li>
            <li>Any unauthorized use of your account credentials;</li>
            <li>Fee disputes between your school and parents arising from your school's fee policies.</li>
          </ul>
        </Section>

        <Section title="12. Termination">
          <SubHeading>12.1 By You</SubHeading>
          <p>You may terminate your EduVantage subscription at any time by contacting <strong>support@eduvantage.app</strong>. Termination takes effect at the end of the current billing term. No refunds are issued for unused portions of a subscription term, except as stated in Section 4.4.</p>

          <SubHeading>12.2 By EduVantage</SubHeading>
          <p>EduVantage reserves the right to suspend or terminate your account immediately and without notice if:</p>
          <ul>
            <li>You breach any material provision of these Terms, particularly the Acceptable Use Policy;</li>
            <li>Your account is used for fraudulent, illegal, or abusive purposes;</li>
            <li>Payment of subscription fees is overdue by more than 30 days;</li>
            <li>Continuation of service would expose EduVantage to legal risk or reputational harm.</li>
          </ul>

          <SubHeading>12.3 Effect of Termination</SubHeading>
          <p>Upon termination, your right to access the platform ceases immediately. You will have 30 days to request a data export. After this period, your data will be deleted in accordance with our Privacy Policy.</p>
        </Section>

        <Section title="13. Governing Law & Dispute Resolution">
          <p>These Terms are governed by and construed in accordance with the laws of the <strong>Republic of Kenya</strong>, including but not limited to:</p>
          <ul>
            <li>The Contract Act (Cap 23)</li>
            <li>The Data Protection Act, 2019</li>
            <li>The Kenya Information and Communications Act (KICA)</li>
            <li>The Basic Education Act, 2013</li>
          </ul>
          <p>Any dispute arising from or in connection with these Terms shall first be subject to <strong>good-faith negotiation</strong> between the parties for a period of 30 days. If unresolved, disputes shall be submitted to <strong>binding arbitration</strong> in Nairobi, Kenya, administered under the Nairobi Centre for International Arbitration (NCIA) rules.</p>
          <p>Nothing herein prevents either party from seeking urgent injunctive relief from the Kenyan courts.</p>
        </Section>

        <Section title="14. Miscellaneous">
          <SubHeading>14.1 Entire Agreement</SubHeading>
          <p>These Terms, together with our Privacy Policy and any executed order forms or service agreements, constitute the entire agreement between you and EduVantage with respect to the platform and supersede all prior agreements and understandings.</p>

          <SubHeading>14.2 Amendments</SubHeading>
          <p>EduVantage may amend these Terms at any time. Material changes will be notified to registered school administrators at least <strong>30 days in advance</strong> via email and in-platform banner. Continued use after the effective date of any amendment constitutes acceptance of the revised Terms.</p>

          <SubHeading>14.3 Severability</SubHeading>
          <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>

          <SubHeading>14.4 Waiver</SubHeading>
          <p>EduVantage's failure to enforce any right or provision of these Terms shall not be construed as a waiver of such right or provision.</p>

          <SubHeading>14.5 Assignment</SubHeading>
          <p>You may not assign your rights or obligations under these Terms without EduVantage's prior written consent. EduVantage may assign these Terms in connection with a merger, acquisition, or sale of all or substantially all of its assets.</p>
        </Section>

        <Section title="15. Contact Information">
          <p>For questions about these Terms, please contact us:</p>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '28px 32px', marginTop: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, color: DARK, fontSize: 16 }}>EduVantage Platform Ltd. — Legal</p>
            <p style={{ margin: '8px 0 0', color: SLATE }}>📧 legal@eduvantage.app</p>
            <p style={{ margin: '4px 0 0', color: SLATE }}>💬 support@eduvantage.app <em>(general support)</em></p>
            <p style={{ margin: '4px 0 0', color: SLATE }}>💰 billing@eduvantage.app <em>(billing & subscription)</em></p>
            <p style={{ margin: '4px 0 0', color: SLATE }}>📍 Nairobi, Kenya</p>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ color: SLATE, fontSize: 14, margin: 0 }}>© {new Date().getFullYear()} EduVantage Platform Ltd. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/privacy" style={{ color: SLATE, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: PRIMARY, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Terms of Service</Link>
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
      <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid #ECFDF5', fontFamily: 'var(--font-sora, sans-serif)' }}>{title}</h2>
      <div style={{ color: '#475569', fontSize: 16, lineHeight: 1.8 }}>
        {children}
      </div>
      <style jsx>{`
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
