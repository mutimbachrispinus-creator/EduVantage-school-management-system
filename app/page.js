'use client';
import '@/styles/landing.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

import ChatBot from '@/components/ChatBot';

// Colors mapped to dynamic CSS variables, falling back to sleek modern theme palettes
const PRIMARY = 'var(--lp-primary, #4F46E5)'; // Indigo
const ACCENT  = 'var(--lp-accent,  #10B981)'; // Emerald
const DARK    = 'var(--lp-dark,    #0F172A)'; // Deep Slate
const SLATE   = 'var(--lp-slate,   #64748B)'; // Muted Slate
const VIBRANT = 'var(--lp-vibrant, #8B5CF6)'; // Purple
const AMBER   = '#F59E0B';

// Detailed Curriculum Mapping configuration

// Detailed User Persona experience configurations

// Extremely detailed Features Blueprint for the Search and Filtering system

const TRUST_POINTS = [
  { label: 'Comprehensive Workflows', value: 'Manage admissions, fees, grading, attendance, and reports in one place.' },
  { label: 'Seamless Communication', value: 'Built-in support for SMS and email to keep parents informed.' },
  { label: 'Secure and Reliable', value: 'Fast, dependable, and easy to use on any device.' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ schools: 0, learners: 0 });
  const [plans, setPlans] = useState([]);

  // Interactive UI states
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [heroImgIdx, setHeroImgIdx] = useState(0);

  const heroImages = [
    '/eduvantage-hero-new.png',
    '/eduvantage-hero.png',
    '/classroom-vibe.png'
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const imgInterval = setInterval(() => {
      setHeroImgIdx(prev => (prev + 1) % heroImages.length);
    }, 5000);

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
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(imgInterval);
    };
  }, []);

  // Filter features based on active category and text query
  
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="landing-wrap">
      {/* ── STICKY NAV ── */}
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-mesh"></div>
        
        <div className="container hero-content fade-in-up">
          <div className="badge-pill pulse-glow">Complete School Management Platform</div>
          <h1 className="hero-title">
            Run the school.<br/>See the <span className="text-gradient">whole picture.</span>
          </h1>
          <p className="hero-subtitle">
            EduVantage simplifies admissions, fee collections, academics, payroll, and messaging. Manage your entire school efficiently with an intuitive, all-in-one system.
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
                   <strong>Teacher Workspace</strong>
                   <span>Markbooks · Attendance</span>
                </div>
             </div>
             <div className="exp-card parent-exp fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="exp-icon">👨‍👩‍👧</div>
                <div className="exp-info">
                   <strong>Parent Portal</strong>
                   <span>Live Ledger · M-Pesa STK</span>
                </div>
             </div>
             <div className="exp-card staff-exp fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="exp-icon">🏢</div>
                <div className="exp-info">
                   <strong>Finance Suite</strong>
                   <span>Deductions Payroll · Collections</span>
                </div>
             </div>
          </div>

          <div className="hero-mockup">
            <div className="mockup-frame" style={{ position: 'relative', overflow: 'hidden' }}>
              {heroImages.map((src, idx) => (
                <img 
                  key={src}
                  src={src} 
                  alt={`Dashboard Mockup ${idx + 1}`} 
                  className="mockup-img"
                  style={{
                    transition: 'opacity 1.2s ease-in-out',
                    opacity: idx === heroImgIdx ? 1 : 0,
                    position: idx === heroImgIdx ? 'relative' : 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover'
                  }}
                />
              ))}
              
              {/* Floating Glass Cards Removed for simplicity */}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP (HONEST FIGURES) ── */}
      <section className="stats-strip">
        <div className="container stats-box">
          <div className="stat-item">
            <strong>{stats.schools > 0 ? `${stats.schools}+` : 'Multi-School'}</strong>
            <span>Active Institutional Tenants</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>{stats.learners > 0 ? `${(stats.learners / 1000).toFixed(1)}k+` : 'Direct Bulk'}</strong>
            <span>Active Student Records</span>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <strong>100%</strong>
            <span>Secure & Private</span>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC CURRICULUM ADAPTER (SHOWCASE FEATURE 1) ── */}
      

      {/* ── PORTAL WORKSPACES (SHOWCASE FEATURE 2) ── */}
      

      {/* ── SEARCHABLE & FILTERABLE FEATURE bluePRINT (THE DEEP DIVE) ── */}
      

      {/* ── SECURITY & SYSTEM INTEGRITY TECH PLOT ── */}
      <section className="security-blueprint-section">
        <div className="container readiness-grid">
          <div>
            <div className="badge-pill">Operational Integrity</div>
            <h2 className="section-title">Built for absolute reliability, security, and scalability.</h2>
            <p className="section-subtitle left" style={{ marginBottom: 30 }}>
              EduVantage uses industry-standard security practices and modern infrastructure to keep your data completely safe and private.
            </p>
            <div className="tech-checks">
              <div className="tech-check-item">
                <strong>🔐 Cryptographic Anti-Fraud QR Verification</strong>
                <span>Every report card and fees receipt generated prints with a cryptographically secure, unique QR code. Scanning verifies transaction details or grades directly to stop forgery.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>🚀 Complete Data Privacy</strong>
                <span>Data safety is our priority. Your school's information is completely private and isolated, matching strict global data protection laws.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>⚡ Lightning Fast Performance</strong>
                <span>Designed to load instantly anywhere in the world. Built-in offline capabilities ensure teachers can work seamlessly even during network lags.</span>
              </div>
            </div>
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

      {/* ── LIVE DEMO HIGHLIGHT SECTION ── */}
      <section id="demo" className="demo-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Live Demonstration Portals</div>
            <h2 className="section-title">See EduVantage<br /><span className="text-gradient">in action.</span></h2>
            <p className="section-subtitle">Walk through pre-populated simulation portals to experience actual daily workflows by school role.</p>
          </div>

          <div className="demo-cards">
            <Link href="/demo/teacher" className="demo-card-link">
              <div className="demo-card dc-teacher">
                <div className="dc-emoji">👩‍🏫</div>
                <h3>Teacher Simulation</h3>
                <p>Record marks, take digital roll calls, print report sheets, and configure dynamic subject weights.</p>
                <div className="dc-chips">
                  <span>Qualitative Marks</span><span>Instant Roll Call</span><span>Print Layouts</span>
                </div>
                <div className="dc-cta">Explore Teacher View →</div>
              </div>
            </Link>

            <Link href="/demo/parent" className="demo-card-link">
              <div className="demo-card dc-parent">
                <div className="dc-emoji">👨‍👩‍👧</div>
                <h3>Parent Portal Simulation</h3>
                <p>Inspect term statements, trigger Safaricom M-Pesa clearing, and view QR-verified report cards.</p>
                <div className="dc-chips">
                  <span>Clear Fees</span><span>Progress Charts</span><span>QR Cards</span>
                </div>
                <div className="dc-cta">Explore Parent View →</div>
              </div>
            </Link>

            <Link href="/demo/staff" className="demo-card-link">
              <div className="demo-card dc-staff">
                <div className="dc-emoji">🏢</div>
                <h3>Admin &amp; Finance View</h3>
                <p>Inspect collections, reconcile Safaricom callbacks, and disburse statutory staff payroll slips.</p>
                <div className="dc-chips">
                  <span>M-Pesa Webhooks</span><span>Detailed Deductions</span><span>Audit Logs</span>
                </div>
                <div className="dc-cta">Explore Admin View →</div>
              </div>
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/demo" className="btn btn-primary btn-glow" style={{ padding: '14px 40px', fontSize: 16 }}>Launch Demonstration Portal</Link>
          </div>
        </div>
      </section>

      {/* ── COMPARISON SECTION (Why Us?) ── */}
      

      {/* ── INTERACTIVE FAQ SECTION ── */}
      <section className="faq-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Common Clarifications</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Learn more about our features, capabilities, and how the platform works for your school.</p>
          </div>

          <div className="faq-wrapper">
            {[
              {
                q: "How does the Curriculum-Aware Grading Engine support diverse standards simultaneously?",
                a: "EduVantage employs a modular backend architecture. Administrators define the curriculum standard at the class or school grade level (e.g. Kenya CBC for Grades 1-6, Cambridge IGCSE for Year 9-11, and Technical Units of Competency for TVET classes). The system then dynamically loads the correct calculation formulas, grade boundary tables, score input panels, and printed report card templates. This ensures a multi-curriculum school runs seamlessly within a single portal workspace."
              },
              {
                q: "What are the technical requirements for Safaricom M-Pesa fee integration?",
                a: "EduVantage features a plug-and-play Daraja API bridge. Schools input their Safaricom Paybill/Buygoods number, Consumer Key, Consumer Secret, and Passkey in the finance configuration panel. The application instantly activates STK pushes on parent dashboards. Safaricom sends secure encrypted callbacks to our /api/billing/callback hook, which uses transactional database locks to credit the correct student ledger without manual oversight."
              },
              {
                q: "How does the anti-fraud registry validation work?",
                a: "To block transcript tampering and fake receipts, every report card and payment receipt generated displays an encrypted cryptographic QR code. When scanned by school authorities or banks, this QR code routes to our secure /api/verify registry check. It queries the central isolated SQLite database in real-time, verifying the authenticity of grades or payment amounts directly against official registry records."
              },
              {
                q: "How are granular payroll deductions managed for staff?",
                a: "Unlike basic systems that group deductions into a single bulk value, EduVantage includes an advanced multi-line payroll engine. It computes statutory obligations (Kenya PAYE, NSSF, SHIF/NHIF) according to dynamic tax brackets, and allows admins to append multiple distinct custom line items (e.g., Harambee Sacco Savings, Emergency Salary Advance, Asset Purchase Loan). These are explicitly listed on individual staff payslips to maintain granular transparency."
              }
            ].map((faq, i) => (
              <div key={i} className={`faq-item ${expandedFaq === i ? 'expanded' : ''}`} onClick={() => toggleFaq(i)}>
                <div className="faq-question">
                  <h4>{faq.q}</h4>
                  <span className="faq-toggle-icon">✕</span>
                </div>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      

      {/* ── FOOTER ── */}
      <LandingFooter />

      

      {/* ── FLOATING: EduBot ChatBot (bottom-left corner) ── */}
      <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 9998 }}>
        <ChatBot />
      </div>

      
    </div>
  );
}

