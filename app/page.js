'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatBot from '@/components/ChatBot';

// Colors read from CSS vars set by PortalShell theme — dynamic per tenant
const PRIMARY = 'var(--lp-primary, #4F46E5)';
const ACCENT  = 'var(--lp-accent,  #10B981)';
const DARK    = 'var(--lp-dark,    #0F172A)';
const SLATE   = 'var(--lp-slate,   #64748B)';
const VIBRANT = 'var(--lp-vibrant, #8B5CF6)';

const ALL_FEATURES = [
  { icon: '⚖️', title: 'Curriculum-Aware Grading', desc: 'Weighted grading workflows for CBC, TVET/CBET, Cambridge, British, IB and Montessori-style setups.' },
  { icon: '📥', title: 'Smart CSV Enrolment', desc: 'Bulk learner import for admission, learner, grade, stream, parent, fee and medical profile fields.' },
  { icon: '🗓️', title: 'Dynamic Calendars', desc: 'School-defined terms, closing dates and next-term dates that carry into report cards.' },
  { icon: '🚀', title: 'Communication Hub', desc: 'Bulk SMS, internal messaging and targeted alerts from one operational workspace.' },
  { icon: '📊', title: 'Revenue Visibility', desc: 'Dashboards compare expected fees, collections, arrears and payment history.' },
  { icon: '💳', title: 'M-Pesa Payments', desc: 'STK push and payment callback flows when Safaricom Daraja credentials are configured.' },
  { icon: '🏦', title: 'Settlement Workflow', desc: 'Track school settlement queues and payout status from the finance area.' },
  { icon: '🔐', title: 'Registry Checks', desc: 'Receipts and reports are tied to stored learner records to reduce manual mismatch risk.' },
  { icon: '🎓', title: 'Learning Area', desc: 'Support for learning resources, lesson access and video-class links where providers are configured.' },
  { icon: '📅', title: 'Timetable Tools', desc: 'Build, review and publish school timetables with teacher and class views.' },
  { icon: '🛡️', title: 'Tenant Management', desc: 'Super-admin controls, tenant-aware data access and school-specific branding.' },
  { icon: '📲', title: 'Parent Portal', desc: 'Parent-facing balances, learner progress and school communication entry points.' },
  { icon: '🏆', title: 'Exam Analytics', desc: 'Subject summaries, ranks, deviations and report-card workflows for academic teams.' },
  { icon: '🔮', title: 'Performance Predictor', desc: 'Forecasting screens for learner and class trends based on the data already entered.' },
  { icon: '💼', title: 'Staff & Finance Hub', desc: 'Payroll, budgets, expenses, invoices, petty cash and reconciliation modules.' },
  { icon: '🤖', title: 'Repair Utilities', desc: 'Admin repair and diagnostic routes for controlled maintenance and data recovery tasks.' },
  { icon: '🌐', title: 'Cloud-Ready Build', desc: 'Next.js app configured for Cloudflare Pages with Edge API routes.' },
  { icon: '📱', title: 'Mobile-Friendly UX', desc: 'Responsive dashboards for administrators, teachers and parents.' },
];

const TRUST_POINTS = [
  { label: 'Comprehensive Workflows', value: 'Admissions, fees, grading, attendance, reports, SMS, finance and parent portal workflows.' },
  { label: 'Seamless Integrations', value: 'Built-in support for SMS, email, and major payment providers to streamline operations.' },
  { label: 'Cloud-Native Architecture', value: 'Optimized for high performance and reliability on the Cloudflare Edge network.' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ schools: 0, learners: 0 });
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Sync landing page CSS vars with platform theme
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    const secondary = style.getPropertyValue('--secondary').trim() || '#10B981';
    if (primary) style.setProperty('--lp-primary', primary);
    if (secondary) style.setProperty('--lp-accent', secondary);

    async function loadStats() {
      try {
        const res = await fetch('/api/saas/config?tenant=platform-master', { cache: 'no-store' });
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.plans) setPlans(data.plans);
      } catch (e) {}
    }
    loadStats();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-wrap">
      {/* ── STICKY NAV ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-box">
          <Link href="/" className="logo-group">
            <div className="logo-icon">
              <img src="/ev-brand-v3.png" alt="E" />
            </div>
            <span className="logo-text">EduVantage</span>
          </Link>
          
          <div className="nav-actions">
            <div className="nav-links desktop-only">
              <a href="#features">Features</a>
              <a href="#solutions">Solutions</a>
              <a href="#demo" style={{ color: 'var(--lp-primary,#4F46E5)', fontWeight: 800 }}>🎥 Demo</a>
              <a href="#audit">Readiness</a>
              <a href="#compare">Compare</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="nav-btns">
              <Link href="/login" className="btn btn-ghost">Sign In</Link>
              <Link href="/saas/signup" className="btn btn-primary btn-glow">Get Started Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-mesh"></div>
        
        <div className="container hero-content fade-in-up">
          <div className="badge-pill pulse-glow">School operations, finance and learning in one place</div>
          <h1 className="hero-title">
            Run the school.<br/>See the <span className="text-gradient">whole picture.</span>
          </h1>
          <p className="hero-subtitle">
            EduVantage brings admissions, fees, academics, attendance, communication, finance and parent access into one tenant-aware platform. Experience unified school management with built-in tools for SMS, email, and automated payments.
          </p>
          
          <div className="hero-actions">
            <Link href="/saas/signup" className="btn btn-xl btn-primary btn-glow">Get Started</Link>
            <Link href="/demo" className="btn btn-xl btn-outline glass-btn">Explore Live Demo</Link>
          </div>

          {/* Floating UI Grid */}
          <div className="experience-grid desktop-only">
             <div className="exp-card teacher-exp fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="exp-icon">👩‍🏫</div>
                <div className="exp-info">
                   <strong>Teacher Portal</strong>
                   <span>Digital Markbook · Attendance</span>
                </div>
             </div>
             <div className="exp-card parent-exp fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="exp-icon">👨‍👩‍👧</div>
                <div className="exp-info">
                   <strong>Parent Portal</strong>
                   <span>Live Fees · Report Cards</span>
                </div>
             </div>
             <div className="exp-card staff-exp fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="exp-icon">🏢</div>
                <div className="exp-info">
                   <strong>Admin Suite</strong>
                   <span>Finance · Analytics · Settings</span>
                </div>
             </div>
          </div>

          <div className="hero-mockup">
            <div className="mockup-frame">
              <img src="/eduvantage-hero-new.png" alt="Dashboard Mockup" className="mockup-img" />
              
              {/* Floating Glass Cards */}
              <div className="floating-card card-1 glass-card">
                <div className="icon-wrap" style={{ color: VIBRANT }}>🏦</div>
                <div>
                  <div className="card-val">Payments Ready</div>
                  <div className="card-lab">Daraja / Pesapal Config</div>
                </div>
              </div>
              <div className="floating-card card-2 glass-card">
                <div className="icon-wrap" style={{ color: ACCENT }}>🔐</div>
                <div>
                  <div className="card-val">Tenant-Aware</div>
                  <div className="card-lab">School Data Isolation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP (HONEST FIGURES) ── */}
      <section className="stats-strip">
        <div className="container stats-box">
          <div className="stat-item">
            <strong>{stats.schools > 0 ? `${stats.schools}+` : 'Multi'}</strong>
            <span>School Tenant Support</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>{stats.learners > 0 ? `${(stats.learners / 1000).toFixed(1)}k+` : 'Bulk'}</strong>
            <span>Learner Records</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>Edge</strong>
            <span>Cloudflare Pages Build</span>
          </div>
        </div>
      </section>

      {/* ── READINESS / TRUST SECTION ── */}
      <section id="audit" className="readiness-section">
        <div className="container readiness-grid">
          <div>
            <div className="badge-pill">Enterprise Grade</div>
            <h2 className="section-title">Powerful, secure, and ready to scale.</h2>
            <p className="section-subtitle left">
              EduVantage provides the operational depth and reliable infrastructure that modern institutions demand, ensuring your data is accessible, secure, and actionable.
            </p>
          </div>
          <div className="readiness-cards">
            {TRUST_POINTS.map(point => (
              <div key={point.label} className="readiness-card">
                <strong>{point.label}</strong>
                <span>{point.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES GRID ── */}
      <section className="all-features-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge-pill">Core Platform</div>
            <h2 className="section-title">One platform.<br/><span className="text-gradient">Every feature you need.</span></h2>
            <p className="section-subtitle">A practical operating system for the daily work of running a school.</p>
          </div>
          <div className="feat-grid">
            {ALL_FEATURES.map(f => (
              <div key={f.title} className="feat-chip">
                <span className="feat-chip-icon">{f.icon}</span>
                <div>
                  <div className="feat-chip-title">{f.title}</div>
                  <div className="feat-chip-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES SECTION ── */}
      <section id="features" className="modules-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="badge-pill pulse-glow">Operational Modules</div>
            <h2 className="section-title">A unified suite for <br/> <span className="text-gradient">total school management</span></h2>
            <p className="section-subtitle">Replace scattered spreadsheets and disconnected portals with one shared workspace for daily school operations.</p>
          </div>

          <div className="module-grid">
            {/* Analytics */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#EEF2FF', color: PRIMARY }}>📊</div>
              <div className="mod-content">
                <h3>Academic Intelligence</h3>
                <p>Turn marks into decisions. EduVantage combines exam summaries, subject ranks, class deviations, report cards and forecasting views across common curriculum structures including <strong>Kenya CBC</strong>, <strong>TVET / CBET</strong>, <strong>Montessori</strong>, <strong>Cambridge International</strong>, <strong>British IGCSE</strong>, and <strong>IB</strong>.</p>
                <ul className="mod-features">
                  <li>Official Exam Summary With Deviations</li>
                  <li>Subject Rankings & Teacher Performance</li>
                  <li>National Exam Class & Learner Forecasts</li>
                </ul>
              </div>
            </div>

            {/* Finance */}
            <div className="module-card reverse">
              <div className="mod-content">
                <h3>Payments & Finance</h3>
                <p>Accept M-Pesa and Pesapal payments directly, and manage school collections, fee balances, receipts, expenses and reconciliation from one finance workspace. Settlement workflows are available for teams using the supported payment model.</p>
                <ul className="mod-features">
                  <li>M-Pesa STK Push and Callback Support</li>
                  <li>Pesapal Checkout Support</li>
                  <li>Receipt and Fee Ledger Workflows</li>
                  <li>Revenue Dashboard and Reconciliation</li>
                  <li>Payroll Deductions — PAYE, SHIF, NSSF, Loans & SACCO</li>
                </ul>
              </div>
              <div className="mod-icon" style={{ background: '#ECFDF5', color: ACCENT }}>💳</div>
            </div>

            {/* Anti-Fraud */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>🔐</div>
              <div className="mod-content">
                <h3>Registry Controls</h3>
                <p>Reduce manual mistakes by keeping reports, receipts, parent access and fee activity tied to official learner records. Admin diagnostics and repair utilities help teams resolve data issues when imports or legacy records need attention.</p>
                <ul className="mod-features">
                  <li>Receipt and Report Card Registry Checks</li>
                  <li>Parent-Learner Lookup Flow</li>
                  <li>Controlled Repair and Diagnostic Routes</li>
                </ul>
              </div>
            </div>

            {/* Timetable */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>📅</div>
              <div className="mod-content">
                <h3>Timetabling</h3>
                <p>Build, review and publish timetable structures for classes and teachers. The app includes generator tooling and school-specific timetable settings for teams that want to reduce spreadsheet work.</p>
                <ul className="mod-features">
                  <li>Class and Teacher Timetable Views</li>
                  <li>Timetable Generator Tooling</li>
                  <li>Digital Publishing to Teacher Dashboards</li>
                </ul>
              </div>
            </div>

            {/* Communication */}
            <div className="module-card reverse">
              <div className="mod-content">
                <h3>Communication Hub</h3>
                <p>Bring internal messaging and SMS workflows into one place. Schools can send absence alerts, fee reminders, report-card links and school-wide announcements directly to parents and staff.</p>
                <ul className="mod-features">
                  <li>Bulk SMS Campaigns</li>
                  <li>Attendance and Fee Reminder Templates</li>
                  <li>Internal Messaging</li>
                </ul>
              </div>
              <div className="mod-icon" style={{ background: '#F5F3FF', color: VIBRANT }}>💬</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAKEHOLDER SOLUTIONS ── */}
      <section id="solutions" className="solutions-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#fff' }}>Built for <span className="text-gradient">each school role</span></h2>
            <p style={{ color: '#94A3B8', fontSize: 18 }}>One system, different workspaces for the people who keep the school moving.</p>
          </div>
          
          <div className="solutions-grid">
            <SolutionCard 
              target="Administrators" 
              demoHref="/demo/staff"
              desc="Oversight of finances, learner onboarding, staff operations, communication and academic summaries."
              features={['Smart CSV Enrolment', 'Loan-Aware Payroll', 'Official Exam Reports']}
            />
            <SolutionCard 
              target="Teachers" 
              demoHref="/demo/teacher"
              desc="Digital attendance, mark entry, class insights, learning resources and report-card workflows."
              features={['Digital Markbooks', 'Video Lessons', 'Exam Analysis']}
            />
            <SolutionCard 
              target="Parents" 
              demoHref="/demo/parent"
              desc="View fee balances, academic progress, report cards and school messages from a parent-facing portal."
              features={['Live Fee Statements', 'Termly Report Cards', 'Instant SMS Alerts']}
            />
            <SolutionCard 
              target="Students"
              demoHref="/login"
              desc="Access learning resources, timetable information and performance views where the school enables student access."
              features={['Subject Trends', 'Video Lessons', 'Exam Forecasts']}
            />
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO SECTION ── */}
      <section id="demo" className="demo-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="badge-pill pulse-glow">Live Demo Experience</div>
            <h2 className="section-title">See EduVantage<br /><span className="text-gradient">in action.</span></h2>
            <p className="section-subtitle">Walk through the platform by role before creating a school account.</p>
          </div>

          <div className="demo-cards">
            <Link href="/demo/teacher" className="demo-card-link">
              <div className="demo-card dc-teacher">
                <div className="dc-emoji">👩‍🏫</div>
                <h3>Teacher</h3>
                <p>Mark entry, attendance, merit lists &amp; report card printing — animated live.</p>
                <div className="dc-chips">
                  <span>Digital Markbook</span><span>1-Click Attendance</span><span>Print Templates</span>
                </div>
                <div className="dc-cta">Watch Demo</div>
              </div>
            </Link>

            <Link href="/demo/parent" className="demo-card-link">
              <div className="demo-card dc-parent">
                <div className="dc-emoji">👨‍👩‍👧</div>
                <h3>Parent</h3>
                <p>Live fee statements, QR-verified report cards and real-time SMS alerts.</p>
                <div className="dc-chips">
                  <span>Fee Balance</span><span>Report Card</span><span>Alerts</span>
                </div>
                <div className="dc-cta">Watch Demo</div>
              </div>
            </Link>

            <Link href="/demo/staff" className="demo-card-link">
              <div className="demo-card dc-staff">
                <div className="dc-emoji">🏢</div>
                <h3>Admin &amp; Staff</h3>
                <p>Revenue dashboards, automated payroll disbursement &amp; school-wide exam reports.</p>
                <div className="dc-chips">
                  <span>Revenue Dashboard</span><span>Payroll B2C</span><span>Exam Summary</span>
                </div>
                <div className="dc-cta">Watch Demo</div>
              </div>
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/demo" className="btn btn-primary btn-glow" style={{ padding: '14px 40px', fontSize: 16 }}>View All Demos</Link>
          </div>
        </div>
      </section>


      {/* ── COMPARISON SECTION (Why Us?) ── */}
      <section id="compare" className="compare-section">
        <div className="container">
          <div className="comparison-box">
             <div className="comp-hdr">
               <h3>EduVantage vs. The Alternatives</h3>
               <p>A grounded comparison against spreadsheet-heavy and disconnected school systems.</p>
             </div>
             <div className="tbl-wrap">
               <table className="comp-table">
                 <thead>
                   <tr>
                     <th>Feature & Capability</th>
                     <th className="bad">Fragmented Legacy Systems</th>
                     <th className="good">EduVantage Platform</th>
                   </tr>
                 </thead>
                 <tbody>
                    <tr><td><strong>Payment Collection</strong></td><td>Manual receipt books or separate payment portals</td><td className="hl">M-Pesa and Pesapal flows inside the school ledger</td></tr>
                    <tr><td><strong>Revenue Visibility</strong></td><td>End-of-month manual reconciliation</td><td className="hl">Collection, balance and arrears dashboards</td></tr>
                    <tr><td><strong>Settlements</strong></td><td>Tracked outside the school system</td><td className="hl">Settlement queues visible to platform admins</td></tr>
                    <tr><td><strong>Registry Control</strong></td><td>Documents can drift from learner records</td><td className="hl">Receipts and reports generated from stored records</td></tr>
                    <tr><td><strong>Grading Intelligence</strong></td><td>Static, hardcoded rules</td><td className="hl">Curriculum-Aware (CBC/IB/Cambridge/Montessori)</td></tr>
                    <tr><td><strong>Parent Experience</strong></td><td>Delayed SMS only</td><td className="hl">Live Portal + M-Pesa STK Push + Auto-Receipts</td></tr>
                    <tr><td><strong>Infrastructure</strong></td><td>Multiple disconnected logins</td><td className="hl">One unified multi-tenant app</td></tr>
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="badge-pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Transparent Pricing</div>
            <h2 style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Choose a <span className="text-gradient">school-ready plan</span></h2>
          </div>

          <div className="pricing-grid">
            {plans.length > 0 ? (
              plans.map((p, idx) => (
                <PriceCard 
                  key={p.id}
                  name={p.name} 
                  price={p.price} 
                  desc={p.billingModel === 'per-learner' ? 'Billed per student.' : 'Flat rate per school.'}
                  billingModel={p.billingModel}
                  cycle={p.cycle}
                  featured={idx === 1}
                  features={p.features || ['Full Access', 'Dashboard', 'Support']}
                />
              ))
            ) : (
              <>
                <PriceCard 
                  name="1 Term Free" 
                  price={0} 
                  desc="Try the core workflows for one term and experience the full power of the platform."
                  features={['Full Platform Access', 'Bulk CSV Learner Uploads', 'M-Pesa Test Integration', 'CBC / Montessori / IB / British Support', 'Standard Support']}
                />
                <PriceCard 
                  name="Basic" 
                  price="150" 
                  desc="Perfect for growing primary schools needing essential digital tools."
                  features={['Everything in Free', 'Academic Analytics', 'M-Pesa Reconciliation', 'SMS Integration', 'Email Support']}
                />
                <PriceCard 
                  name="Premium" 
                  price="300" 
                  featured={true}
                  desc="Comprehensive control for top-tier institutions looking to automate."
                  features={['Everything in Basic', 'Bulk Payroll Engine', 'Advanced Data Analytics', 'Priority 24/7 Support', 'Custom Branding']}
                />
              </>
            )}
          </div>
          <p style={{ textAlign: 'center', marginTop: 40, opacity: 0.6, fontSize: 14, color: '#fff' }}>* Prices in KES per student per term. Annual discounts available.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-info">
            <Link href="/" className="logo-group">
              <div className="logo-icon">
                <img src="/ev-brand-v3.png" alt="Logo" />
              </div>
              <span className="logo-text">EduVantage</span>
            </Link>
            <p>A practical school management platform for admissions, academics, finance, communication and parent access.</p>
            <div className="social-links">
              <span>𝕏</span> <span>LinkedIn</span> <span>Facebook</span>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="/demo">Live Demos</a>
              <a href="/demo/teacher">👩‍🏫 Teacher Demo</a>
              <a href="/demo/parent">👨‍👩‍👧 Parent Demo</a>
              <a href="/demo/staff">🏢 Admin Demo</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Support</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <p>&copy; {new Date().getFullYear()} EduVantage Platform. Built with ❤️ for African Education. &nbsp;·&nbsp; <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Terms of Service</a></p>
          </div>
        </div>
      </footer>

      <ChatBot />

      <style jsx>{`
        /* Dynamic color bridge */
        :root { --lp-primary: #4F46E5; --lp-accent: #10B981; --lp-dark: #0F172A; --lp-slate: #64748B; --lp-vibrant: #8B5CF6; }
        /* Core Reset & Fonts */
        .landing-wrap { 
          background: #fff; color: ${DARK}; font-family: var(--font-inter, sans-serif); 
          overflow-x: hidden; max-width: 100vw; 
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; width: 100%; box-sizing: border-box; }
        
        /* Typography */
        h1, h2, h3, h4, .logo-text, .card-val { font-family: var(--font-sora, sans-serif); }
        .text-gradient { background: linear-gradient(135deg, ${PRIMARY}, #06B6D4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        
        /* Utilities */
        .badge-pill { display: inline-block; padding: 8px 18px; background: rgba(79, 70, 229, 0.08); color: ${PRIMARY}; border-radius: 99px; font-weight: 800; font-size: 13px; margin-bottom: 24px; border: 1px solid rgba(79, 70, 229, 0.2); }
        .pulse-glow { animation: pulseGlow 3s infinite; }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 50% { box-shadow: 0 0 20px 0 rgba(79, 70, 229, 0.2); } }
        
        .fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* Nav */
        .nav { position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 24px 0; }
        .nav.scrolled { padding: 14px 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .nav-box { display: flex; justify-content: space-between; align-items: center; }
        
        .logo-group { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .logo-icon { width: 42px; height: 42px; background: linear-gradient(135deg, ${PRIMARY}, ${VIBRANT}); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }
        .logo-icon img { width: 24px; height: 24px; object-fit: contain; filter: brightness(0) invert(1); }
        .logo-text { font-size: 24px; font-weight: 800; color: ${DARK}; letter-spacing: -0.02em; }
        
        .nav-actions { display: flex; align-items: center; gap: 40px; }
        .nav-links { display: flex; gap: 32px; }
        .nav-links a { text-decoration: none; color: ${SLATE}; font-weight: 600; font-size: 15px; transition: 0.2s; }
        .nav-links a:hover { color: ${PRIMARY}; }
        .nav-btns { display: flex; gap: 14px; }
        
        /* Buttons */
        .btn { padding: 12px 26px; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .btn-primary { background: ${PRIMARY}; color: #fff; }
        .btn-primary:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px rgba(79, 70, 229, 0.4); background: #4338CA; }
        .btn-primary:active { transform: scale(0.96) translateY(0); }
        .btn-primary::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: rotate(45deg) translateX(-100%);
          pointer-events: none;
        }
        .btn-primary:hover::after {
          transform: rotate(45deg) translateX(100%);
          transition: transform 0.65s ease-in-out;
        }
        .btn-ghost { color: ${DARK}; background: transparent; }
        .btn-ghost:hover { background: rgba(0,0,0,0.05); }
        .btn-outline { border: 2px solid rgba(0,0,0,0.1); color: ${DARK}; background: #fff; }
        .btn-outline:hover { background: ${DARK}; color: #fff; border-color: ${DARK}; transform: translateY(-3px); }
        .btn-outline:active { transform: scale(0.98); }
        .btn-xl { padding: 18px 46px; font-size: 17px; border-radius: 18px; }
        .btn-glow { position: relative; overflow: hidden; }
        .btn-glow::after { content: ''; position: absolute; inset: -2px; border-radius: 16px; background: linear-gradient(45deg, ${PRIMARY}, #06B6D4); z-index: -1; opacity: 0.5; filter: blur(8px); transition: 0.3s; }
        .btn-glow:hover::after { opacity: 0.8; filter: blur(12px); }
        .btn-glow::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: rotate(45deg) translateX(-100%); pointer-events: none;
        }
        .btn-glow:hover::before {
          transform: rotate(45deg) translateX(100%);
          transition: transform 0.6s ease-in-out;
        }
        
        .glass-btn { background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); }

        /* Experience Grid */
        .experience-grid { display: flex; gap: 20px; justify-content: center; margin-bottom: 60px; }
        .exp-card { background: #fff; padding: 16px 24px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px; border: 1px solid rgba(0,0,0,0.03); transition: 0.3s; }
        .exp-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 40px rgba(79,70,229,0.1); border-color: rgba(79,70,229,0.2); }
        .exp-icon { font-size: 28px; }
        .exp-info { text-align: left; }
        .exp-info strong { display: block; font-size: 15px; color: ${DARK}; }
        .exp-info span { font-size: 12px; color: ${SLATE}; font-weight: 600; }

        /* Hero */
        .hero { padding: 200px 0 100px; position: relative; text-align: center; overflow: hidden; background: #FAFAFB; }
        .hero-mesh { position: absolute; top: -20%; left: -10%; width: 120%; height: 140%; background: radial-gradient(circle at 20% 30%, rgba(79, 70, 229, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 40%); z-index: 0; pointer-events: none; }
        
        .hero-title { font-size: 78px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 28px; color: ${DARK}; }
        .hero-subtitle { font-size: 21px; color: ${SLATE}; line-height: 1.6; max-width: 800px; margin: 0 auto 48px; }
        .hero-actions { display: flex; gap: 20px; justify-content: center; margin-bottom: 80px; }
        
        .hero-mockup { perspective: 1200px; margin-top: 40px; position: relative; z-index: 2; }
        .mockup-frame { position: relative; background: #fff; padding: 12px; border-radius: 32px; box-shadow: 0 60px 120px -20px rgba(15, 23, 42, 0.2); border: 1px solid rgba(0,0,0,0.05); display: inline-block; transform: rotateX(8deg) translateY(0); transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .mockup-frame:hover { transform: rotateX(0deg) translateY(-10px); box-shadow: 0 80px 150px -20px rgba(15, 23, 42, 0.3); }
        .mockup-img { width: 1000px; max-width: 100%; border-radius: 20px; display: block; border: 1px solid rgba(0,0,0,0.05); }
        
        .glass-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.5); }
        .floating-card { position: absolute; padding: 20px 24px; border-radius: 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: left; animation: floatObj 6s infinite ease-in-out; }
        @keyframes floatObj { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .card-1 { top: 15%; left: -50px; }
        .card-2 { bottom: 20%; right: -50px; animation-delay: -3s; }
        .icon-wrap { width: 52px; height: 52px; background: #fff; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .card-val { font-size: 20px; font-weight: 800; color: ${DARK}; letter-spacing: -0.02em; }
        .card-lab { font-size: 13px; color: ${SLATE}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

        /* Stats */
        .stats-strip { padding: 50px 0; border-top: 1px solid rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05); background: #fff; }
        .stats-box { display: flex; justify-content: space-around; align-items: center; }
        .stat-item { text-align: center; }
        .stat-item strong { display: block; font-size: 38px; font-weight: 900; color: ${DARK}; margin-bottom: 6px; letter-spacing: -0.02em; }
        .stat-item span { color: ${SLATE}; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
        .stat-sep { width: 1px; height: 60px; background: rgba(0,0,0,0.08); }

        /* Modules Section */
        .modules-section { padding: 140px 0; background: #fff; }
        .section-title { font-size: 52px; font-weight: 900; letter-spacing: -0.03em; color: ${DARK}; line-height: 1.1; margin-bottom: 24px; }
        .section-subtitle { font-size: 20px; color: ${SLATE}; max-width: 600px; margin: 0 auto; line-height: 1.6; }
        .section-subtitle.left { margin: 0; }

        /* Readiness */
        .readiness-section { padding: 100px 0; background: #fff; }
        .readiness-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 56px; align-items: center; }
        .readiness-cards { display: grid; gap: 16px; }
        .readiness-card { padding: 24px 26px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 18px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04); }
        .readiness-card strong { display: block; color: ${DARK}; font-size: 15px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
        .readiness-card span { display: block; color: ${SLATE}; font-size: 15px; line-height: 1.6; font-weight: 600; }

        .module-grid { display: flex; flex-direction: column; gap: 80px; margin-top: 80px; }
        
        .module-card { display: flex; gap: 60px; align-items: center; padding: 50px; background: #F8FAFC; border-radius: 40px; border: 1px solid rgba(0,0,0,0.03); transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .module-card:hover { transform: translateY(-10px); box-shadow: 0 40px 100px rgba(15, 23, 42, 0.08); background: #fff; border-color: rgba(79, 70, 229, 0.1); }
        .module-card.reverse { flex-direction: row-reverse; }
        
        .mod-icon { width: 140px; height: 140px; border-radius: 40px; display: flex; align-items: center; justify-content: center; font-size: 64px; flex-shrink: 0; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
        .mod-content { flex: 1; }
        .mod-content h3 { font-size: 34px; font-weight: 800; margin-bottom: 20px; color: ${DARK}; letter-spacing: -0.02em; }
        .mod-content p { color: ${SLATE}; font-size: 18px; line-height: 1.7; margin-bottom: 30px; }
        
        .mod-features { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 16px; }
        .mod-features li { display: flex; align-items: center; gap: 14px; font-weight: 700; color: ${DARK}; font-size: 16px; }
        .mod-features li::before { content: '✓'; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: rgba(16, 185, 129, 0.1); color: #10B981; border-radius: 50%; font-weight: 900; font-size: 14px; }

        /* Solutions Section */
        .solutions-section { padding: 120px 0; background: ${DARK}; border-radius: 60px; margin: 0 24px; box-shadow: 0 40px 100px rgba(0,0,0,0.1); }
        .solutions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; padding: 0 24px; }
        
        /* Comparison */
        .compare-section { padding: 140px 0; background: #fff; }
        .comparison-box { background: #F8FAFC; border-radius: 40px; padding: 70px; box-shadow: inset 0 2px 20px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); }
        .comp-hdr { text-align: center; margin-bottom: 60px; }
        .comp-hdr h3 { font-size: 40px; font-weight: 900; color: ${DARK}; margin-bottom: 16px; letter-spacing: -0.02em; }
        .comp-hdr p { color: ${SLATE}; font-size: 18px; }
        
        .comp-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .comp-table th { padding: 24px 30px; text-align: left; border-bottom: 2px solid #E2E8F0; font-size: 15px; text-transform: uppercase; letter-spacing: 1.5px; color: ${SLATE}; font-weight: 800; }
        .comp-table td { padding: 28px 30px; border-bottom: 1px solid #E2E8F0; font-size: 16px; font-weight: 600; color: ${DARK}; }
        .comp-table tr:last-child td { border-bottom: none; }
        .comp-table td.hl { color: ${PRIMARY}; font-weight: 900; background: rgba(79, 70, 229, 0.03); border-radius: 8px; }
        .bad { color: #EF4444; }
        .good { color: ${ACCENT}; }

        /* Pricing Section */
        .pricing-section { padding: 140px 0 100px; background: ${DARK}; color: #fff; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: stretch; margin-top: 60px; }

        /* Footer */
        .footer { padding: 100px 0 0; background: #F8FAFC; border-top: 1px solid rgba(0,0,0,0.05); }
        .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 100px; margin-bottom: 80px; }
        .footer-info p { color: ${SLATE}; margin: 24px 0 32px; font-size: 16px; max-width: 320px; line-height: 1.6; }
        .social-links { display: flex; gap: 24px; font-weight: 700; color: ${DARK}; font-size: 18px; cursor: pointer; }
        .social-links span:hover { color: ${PRIMARY}; }
        
        .footer-links { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .footer-links h4 { font-size: 18px; margin-bottom: 24px; font-weight: 800; color: ${DARK}; }
        .footer-links a { display: block; text-decoration: none; color: ${SLATE}; margin-bottom: 14px; font-weight: 600; font-size: 15px; transition: 0.2s; }
        .footer-links a:hover { color: ${PRIMARY}; transform: translateX(5px); }
        
        .footer-bottom { padding: 40px 0; border-top: 1px solid rgba(0,0,0,0.05); text-align: center; color: ${SLATE}; font-weight: 600; font-size: 14px; }

        /* All Features Grid */
        .all-features-section { padding: 100px 0; background: #F8FAFC; }
        .feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .feat-chip { display: flex; align-items: flex-start; gap: 16px; padding: 20px 22px; background: #fff; border-radius: 20px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: 0.25s cubic-bezier(0.4,0,0.2,1); }
        .feat-chip:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.1); border-color: rgba(79,70,229,0.15); }
        .feat-chip-icon { font-size: 28px; flex-shrink: 0; width: 48px; height: 48px; background: rgba(79,70,229,0.07); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .feat-chip-title { font-weight: 800; font-size: 14px; color: ${DARK}; margin-bottom: 4px; }
        .feat-chip-desc { font-size: 12.5px; color: ${SLATE}; line-height: 1.5; }

        /* Demo Section */
        .demo-section { padding: 120px 0; background: #fff; }
        .demo-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px,1fr)); gap: 28px; }
        .demo-card-link { text-decoration: none; color: inherit; }
        .demo-card { padding: 40px 32px; border-radius: 32px; border: 2px solid transparent; transition: 0.4s cubic-bezier(0.16,1,0.3,1); cursor: pointer; position: relative; overflow: hidden; }
        .demo-card::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: 0.4s; border-radius: 30px; }
        .demo-card:hover { transform: translateY(-10px); border-color: transparent; }
        .dc-teacher { background: linear-gradient(135deg, #EEF2FF, #E0E7FF); }
        .dc-teacher:hover { background: linear-gradient(135deg, #4F46E5, #6366F1); color: #fff; box-shadow: 0 40px 80px rgba(79,70,229,0.35); }
        .dc-teacher:hover .dc-cta { color: #fff; }
        .dc-teacher:hover .dc-chips span { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.2); }
        .dc-parent { background: linear-gradient(135deg, #ECFDF5, #D1FAE5); }
        .dc-parent:hover { background: linear-gradient(135deg, #059669, #10B981); color: #fff; box-shadow: 0 40px 80px rgba(16,185,129,0.35); }
        .dc-parent:hover .dc-cta { color: #fff; }
        .dc-parent:hover .dc-chips span { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.2); }
        .dc-staff { background: linear-gradient(135deg, #F5F3FF, #EDE9FE); }
        .dc-staff:hover { background: linear-gradient(135deg, #7C3AED, #8B5CF6); color: #fff; box-shadow: 0 40px 80px rgba(124,58,237,0.35); }
        .dc-staff:hover .dc-cta { color: #fff; }
        .dc-staff:hover .dc-chips span { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.2); }
        .dc-emoji { font-size: 56px; margin-bottom: 20px; }
        .demo-card h3 { font-size: 26px; font-weight: 900; margin-bottom: 12px; letter-spacing: -0.02em; }
        .demo-card p { font-size: 15px; line-height: 1.6; opacity: 0.75; margin-bottom: 24px; }
        .dc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
        .dc-chips span { padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.08); transition: 0.3s; }
        .dc-cta { font-size: 15px; font-weight: 800; color: ${PRIMARY}; transition: 0.3s; }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .hero-title { font-size: 64px; }
          .module-card { flex-direction: column !important; text-align: center; padding: 40px; gap: 30px; }
          .mod-features li { justify-content: center; }
          .comparison-box { padding: 40px 20px; }
          .comp-table th, .comp-table td { padding: 16px 12px; font-size: 14px; }
          .footer-grid { grid-template-columns: 1fr; gap: 60px; }
        }
        @media (max-width: 768px) {
          .hero { padding: 120px 0 60px; }
          .hero-title { font-size: 36px; letter-spacing: -0.02em; }
          .hero-subtitle { font-size: 16px; }
          .hero-actions { flex-direction: column; gap: 12px; }
          .btn-xl { padding: 14px 28px; font-size: 15px; }
          .desktop-only { display: none; }
          .card-1, .card-2 { display: none; }
          .stats-box { flex-direction: column; gap: 30px; }
          .stat-sep { width: 100px; height: 1px; }
          .section-title { font-size: 32px; }
          .all-features-section { padding: 60px 0; }
          .feat-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .feat-chip { padding: 14px 14px; gap: 10px; border-radius: 14px; }
          .feat-chip-icon { width: 36px; height: 36px; font-size: 20px; border-radius: 10px; }
          .feat-chip-title { font-size: 12px; }
          .feat-chip-desc { display: none; }
          .modules-section { padding: 80px 0; }
          .readiness-section { padding: 70px 0; }
          .readiness-grid { grid-template-columns: 1fr; gap: 28px; }
          .solutions-section { border-radius: 40px; margin: 0 12px; padding: 80px 0; }
          .demo-section { padding: 70px 0; }
          .demo-cards { grid-template-columns: 1fr; gap: 16px; }
          .demo-card { padding: 28px 24px; }
          .dc-emoji { font-size: 40px; }
          .demo-card h3 { font-size: 20px; }
          .comp-table { display: block; overflow-x: auto; white-space: nowrap; }
          .pricing-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-in-up, .pulse-glow, .floating-card { animation: none !important; }
          .btn-primary:hover, .feat-chip:hover, .module-card:hover { transform: none !important; }
        }
      `}</style>
    </div>
  );
}

function SolutionCard({ target, desc, features, demoHref }) {
  return (
    <div className="s-card">
      <div className="s-tag">{target}</div>
      <p className="s-desc">{desc}</p>
      <div className="s-feat">
        {features.map(f => <div key={f} className="s-feat-item"> <span>✓</span> {f}</div>)}
      </div>
      {demoHref && (
        <Link href={demoHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, padding: '9px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 13, fontWeight: 800, color: '#fff', textDecoration: 'none', transition: '0.2s' }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.18)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.35)'; }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; }}>
          🎥 Watch Demo →
        </Link>
      )}
      <style jsx>{`
        .s-card { padding: 40px 32px; background: rgba(255,255,255,0.03); border-radius: 32px; border: 1px solid rgba(255,255,255,0.05); transition: 0.4s; }
        .s-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .s-tag { font-family: var(--font-sora, sans-serif); font-weight: 800; font-size: 20px; color: #fff; margin-bottom: 16px; }
        .s-desc { color: #94A3B8; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .s-feat { display: flex; flex-direction: column; gap: 12px; }
        .s-feat-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #E2E8F0; }
        .s-feat-item span { color: ${ACCENT}; font-weight: 900; }
      `}</style>
    </div>
  );
}

function PriceCard({ name, price, desc, features, featured, billingModel, cycle }) {
  return (
    <div className={`p-card ${featured ? 'featured' : ''} ${name.includes('Free') ? 'free-tier' : ''}`}>
      {featured && <div className="feat-badge">MOST POPULAR</div>}
      {name.includes('Free') && <div className="feat-badge" style={{ background: '#F97316' }}>INTRO OFFER</div>}
      <div style={{ marginBottom: 30 }}>
        <h4 style={{ fontFamily: 'var(--font-sora, sans-serif)', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{name}</h4>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 46, fontWeight: 900 }}>{price === 'Custom' || price === 0 ? '' : 'KES '}{price === 0 ? 'FREE' : price}</span>
          {price !== 'Custom' && price !== 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ opacity: 0.7, fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>
                / {cycle || 'term'}
              </span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>
                {billingModel === 'per-learner' ? 'per student' : 'per school'}
              </span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 15, opacity: 0.8, marginTop: 16, lineHeight: 1.6 }}>{desc}</p>
        {name.includes('Free') && <div style={{ marginTop: 10, fontSize: 10, fontWeight: 900, color: '#F97316' }}>⚠️ ONE-TIME USE • NON-RENEWABLE</div>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
        {features.map(f => <div key={f} style={{ display: 'flex', gap: 12, fontSize: 15, fontWeight: 600, opacity: 0.9 }}> <span>✓</span> {f}</div>)}
      </div>
      <Link href="/saas/signup" className={`btn ${featured ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', padding: '16px 0', fontSize: 16, border: featured ? 'none' : '2px solid rgba(255,255,255,0.2)', background: featured ? PRIMARY : 'transparent', color: '#fff' }}>
        Get Started
      </Link>
      <style jsx>{`
        .p-card { padding: 48px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); display: flex; flex-direction: column; position: relative; transition: 0.4s; }
        .p-card.featured { background: rgba(255,255,255,0.08); border-color: ${PRIMARY}; transform: scale(1.05); z-index: 2; box-shadow: 0 40px 100px rgba(0,0,0,0.3); }
        .p-card.free-tier { border-color: rgba(249, 115, 22, 0.3); }
        .p-card:hover { border-color: ${PRIMARY}; background: rgba(255,255,255,0.1); }
        .feat-badge { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, ${PRIMARY}, ${VIBRANT}); color: #fff; padding: 8px 20px; border-radius: 99px; font-size: 12px; font-weight: 800; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }
      `}</style>
    </div>
  );
}
