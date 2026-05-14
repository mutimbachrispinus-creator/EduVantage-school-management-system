'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
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
  { icon: '⚖️', title: 'Curriculum-Aware Grading', desc: 'Auto-calculates weighted averages for CBC, TVET/CBET, Cambridge, British, IB & Montessori.' },
  { icon: '🗓️', title: 'Dynamic Calendars', desc: 'Define your own terms. Report cards automatically print accurate next-term resumption dates.' },
  { icon: '🚀', title: 'Unified Comms Hub', desc: 'Consolidated SMS, bulk alerts & internal messaging. Target specific cohorts like "at-risk" students.' },
  { icon: '📊', title: 'Revenue Integrity', desc: 'Real-time dashboard reconciling expected vs. collected fees. Flags revenue leakage instantly.' },
  { icon: '💳', title: 'EduVantage Pay', desc: 'Platform-wide payment aggregation. Parents pay via M-Pesa STK push; funds auto-route securely.' },
  { icon: '🏦', title: 'Automated Settlement', desc: 'One-click Safaricom B2C/B2B disbursements directly to school bank accounts or Tills.' },
  { icon: '🔐', title: 'Anti-Fraud Locks', desc: 'Cryptographic ghost-student prevention — receipts and report cards locked to official registry.' },
  { icon: '🎓', title: 'SaaS Subscriptions', desc: 'Monetize premium video content with Daily/Weekly/Monthly M-Pesa subscription plans.' },
  { icon: '📅', title: 'AI Timetabling', desc: 'Conflict-free master timetables generated in minutes, optimizing teacher workload automatically.' },
  { icon: '🛡️', title: 'Multi-Tier Network', desc: 'Platform-wide super-admin controls alongside isolated, secure tenant dashboards.' },
  { icon: '📲', title: 'Live Parent Portal', desc: 'Live fee balances, digital report cards, and targeted school-specific announcements.' },
  { icon: '🏆', title: 'Premium Rankings', desc: 'Curriculum-specific merit lists and automated school-wide exam performance reports.' },
  { icon: '💼', title: 'Staff & Finance Hub', desc: 'Automated payroll, expense tracking, digital duty rosters, and asset management.' },
  { icon: '🤖', title: 'Data Recovery', desc: 'Proprietary engine to link orphaned marks and instantly restore historical learner data.' },
  { icon: '🌐', title: 'Cloud Infrastructure', desc: 'Enterprise-grade Edge network powering institutions across Africa with 99.9% uptime.' },
  { icon: '📱', title: 'Passive Revenue', desc: 'Automatic KES 50 convenience fee appended to every digital transaction for the platform.' },
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
              <a href="#compare">Why Us?</a>
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
          <div className="badge-pill pulse-glow">🚀 The Next Generation of School Intelligence</div>
          <h1 className="hero-title">
            Stop Managing.<br/>Start <span className="text-gradient">Innovating.</span>
          </h1>
          <p className="hero-subtitle">
            The intelligent school operating system that <strong>collects fees for you</strong>. Fully equipped with curriculum-aware grading, automated B2C settlements, AI timetabling, and a secure parent portal—all in one premium platform.
          </p>
          
          <div className="hero-actions">
            <Link href="/saas/signup" className="btn btn-xl btn-primary btn-glow">Start Your 1-Term Free Trial</Link>
            <Link href="/demo" className="btn btn-xl btn-outline glass-btn">Explore Live Demo →</Link>
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
                   <span>Payroll · Revenue Dashboard</span>
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
                  <div className="card-val">Auto-Settled</div>
                  <div className="card-lab">B2C Disbursements</div>
                </div>
              </div>
              <div className="floating-card card-2 glass-card">
                <div className="icon-wrap" style={{ color: ACCENT }}>🔐</div>
                <div>
                  <div className="card-val">Integrity Lock</div>
                  <div className="card-lab">Ghost-Student Proof</div>
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
            <strong>{stats.schools > 10 ? `${stats.schools}+` : 'Trusted By'}</strong>
            <span>Forward-Thinking Schools</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>{stats.learners > 500 ? `${(stats.learners / 1000).toFixed(1)}k+` : 'Growing'}</strong>
            <span>Active Student Profiles</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>99.9%</strong>
            <span>Uptime & Reliability</span>
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES GRID ── */}
      <section className="all-features-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge-pill">🚀 Everything Included</div>
            <h2 className="section-title">One platform.<br/><span className="text-gradient">Every feature you need.</span></h2>
            <p className="section-subtitle">No add-ons. No hidden fees. All modules included in every plan.</p>
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
            <div className="badge-pill pulse-glow">Premium Modules</div>
            <h2 className="section-title">A unified suite for <br/> <span className="text-gradient">total school management</span></h2>
            <p className="section-subtitle">Why pay for 4 different fragmented systems when EduVantage does it all seamlessly? Experience the power of total integration.</p>
          </div>

          <div className="module-grid">
            {/* Analytics */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#EEF2FF', color: PRIMARY }}>📊</div>
              <div className="mod-content">
                <h3>Curriculum-Aware Insights</h3>
                <p>Gain total institutional clarity. Our merged analytics engine provides both high-level trend visualizations and granular academic rankings—fully adaptive for <strong>Kenya CBC</strong>, <strong>TVET / CBET</strong>, <strong>Montessori</strong>, <strong>Cambridge International</strong>, <strong>British IGCSE</strong>, and <strong>IB</strong> structures.</p>
                <ul className="mod-features">
                  <li>Visual Subject Mastery Heatmaps</li>
                  <li>Instant Class-Wide Merit Rankings</li>
                  <li>Gender & Stream Parity Analytics</li>
                </ul>
              </div>
            </div>

            {/* Finance */}
            <div className="module-card reverse">
              <div className="mod-content">
                <h3>EduVantage Pay — Aggregator Model</h3>
                <p>EduVantage now operates as a <strong>central payment aggregator</strong>. Schools onboard in minutes without Safaricom KYC. Parents pay a single EduVantage Paybill; the platform automatically deducts the KES 50 convenience fee and queues the remainder for one-click B2C/B2B disbursement to the school's registered bank account or Till.</p>
                <ul className="mod-features">
                  <li>Central Paybill — No School Daraja Setup Required</li>
                  <li>Automated KES 50 Convenience Fee Per Transaction</li>
                  <li>One-Click Settlement to School Bank / Till</li>
                  <li>Revenue Integrity Dashboard — Flags Fee Leakage</li>
                </ul>
              </div>
              <div className="mod-icon" style={{ background: '#ECFDF5', color: ACCENT }}>💳</div>
            </div>

            {/* Anti-Fraud */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>🔐</div>
              <div className="mod-content">
                <h3>Integrity Locks & Anti-Ghost Engine</h3>
                <p>EduVantage's proprietary Integrity Lock system prevents "ghost" learner fraud at every touchpoint. Receipts, report cards, and parent portal access are all cryptographically bound to the official student registry — making unregistered learners technically impossible to exploit.</p>
                <ul className="mod-features">
                  <li>Registry-Locked Receipt & Report Card Generation</li>
                  <li>Parent–Child Phone Number Verification Gate</li>
                  <li>Real-Time Revenue Integrity Reconciliation Panel</li>
                </ul>
              </div>
            </div>

            {/* Timetable */}
            <div className="module-card">
              <div className="mod-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>📅</div>
              <div className="mod-content">
                <h3>Smart AI Timetabling</h3>
                <p>Generating a master timetable used to take weeks. Now it takes minutes. Our intelligent engine automatically allocates teachers, subjects, and venues while instantly resolving overlaps and optimizing workload.</p>
                <ul className="mod-features">
                  <li>Conflict-Free Auto-Generation</li>
                  <li>Teacher Workload Optimization</li>
                  <li>Digital Publishing to Teacher Dashboards</li>
                </ul>
              </div>
            </div>

            {/* Communication */}
            <div className="module-card reverse">
              <div className="mod-content">
                <h3>Unified Communication Hub</h3>
                <p>Bridge the gap between your institution and stakeholders. Our new consolidated center brings internal messaging and bulk SMS together. Send instant absence alerts, fee reminders, or school-wide announcements from a single, intuitive interface.</p>
                <ul className="mod-features">
                  <li>One-Click Bulk SMS Blast Engine</li>
                  <li>Instant Automated Absence Alerts</li>
                  <li>Real-time Parent-Teacher Messaging</li>
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
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#fff' }}>Empowering <span className="text-gradient">Every Stakeholder</span></h2>
            <p style={{ color: '#94A3B8', fontSize: 18 }}>An ecosystem where data flows perfectly between roles.</p>
          </div>
          
          <div className="solutions-grid">
            <SolutionCard 
              target="Administrators" 
              demoHref="/demo/staff"
              desc="Total oversight of finances, staff performance, and platform-wide metrics with automated daily snapshots."
              features={['Live Fee Dashboards', 'Bulk Payroll', 'Compliance Reports']}
            />
            <SolutionCard 
              target="Teachers" 
              demoHref="/demo/teacher"
              desc="Reduce paperwork to zero. Digital attendance, instant grade entry, and automated lesson schedules."
              features={['Digital Markbooks', '1-Click Attendance', 'Exam Analysis']}
            />
            <SolutionCard 
              target="Parents" 
              demoHref="/demo/parent"
              desc="Unprecedented transparency. View fees, academic progress, and student welfare instantly from their phone."
              features={['Live Fee Statements', 'Termly Report Cards', 'Instant SMS Alerts']}
            />
            <SolutionCard 
              target="Students"
              demoHref="/login"
              desc="Stay organized with personalized digital timetables, learning resources, and performance tracking."
              features={['Subject Trends', 'Digital Diary', 'Merit Rankings']}
            />
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO SECTION ── */}
      <section id="demo" className="demo-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="badge-pill pulse-glow">🎥 Live Demo Experience</div>
            <h2 className="section-title">See EduVantage<br /><span className="text-gradient">in action.</span></h2>
            <p className="section-subtitle">Auto-animated walkthroughs of the real platform — no sign-up needed.</p>
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
                <div className="dc-cta">Watch Demo →</div>
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
                <div className="dc-cta">Watch Demo →</div>
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
                <div className="dc-cta">Watch Demo →</div>
              </div>
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/demo" className="btn btn-primary btn-glow" style={{ padding: '14px 40px', fontSize: 16 }}>View All Demos →</Link>
          </div>
        </div>
      </section>


      {/* ── COMPARISON SECTION (Why Us?) ── */}
      <section id="compare" className="compare-section">
        <div className="container">
          <div className="comparison-box">
             <div className="comp-hdr">
               <h3>EduVantage vs. The Alternatives</h3>
               <p>Why modern institutions are switching to a truly unified platform.</p>
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
                    <tr><td><strong>Payment Collection</strong></td><td>School manages own Paybill + Daraja KYC</td><td className="hl">EduVantage central Paybill — instant onboarding</td></tr>
                    <tr><td><strong>Revenue Share</strong></td><td>No platform fee mechanism</td><td className="hl">Automated KES 50 convenience fee per transaction</td></tr>
                    <tr><td><strong>Fund Disbursement</strong></td><td>Manual bank transfer by admin</td><td className="hl">One-click B2C/B2B auto-settlement to school bank</td></tr>
                    <tr><td><strong>Fraud Prevention</strong></td><td>No ghost-student checks</td><td className="hl">Integrity Locks — registry-bound document generation</td></tr>
                    <tr><td><strong>Grading Intelligence</strong></td><td>Static, hardcoded rules</td><td className="hl">Curriculum-Aware (CBC/IB/Cambridge/Montessori)</td></tr>
                    <tr><td><strong>Parent Experience</strong></td><td>Delayed SMS only</td><td className="hl">Live Portal + M-Pesa STK Push + Auto-Receipts</td></tr>
                    <tr><td><strong>Revenue Visibility</strong></td><td>End-of-month manual reconciliation</td><td className="hl">Real-time Revenue Integrity Dashboard</td></tr>
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
            <h2 style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Invest in <span className="text-gradient">Excellence</span></h2>
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
                  desc="Experience the full platform for one term. No strings attached."
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
            <p>The leading school management platform for the digital age. Bridging the gap between educators, students, and parents across Africa.</p>
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
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <p>&copy; {new Date().getFullYear()} EduVantage Platform. Built with ❤️ for African Education.</p>
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
        .text-gradient { background: linear-gradient(135deg, ${PRIMARY}, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
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
        .s-desc { color: #94A3B8; font-size: 15px; lineHeight: 1.6; margin-bottom: 24px; }
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
