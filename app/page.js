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
  { label: 'Comprehensive Workflows', value: 'Manage admissions, fees, grading, attendance, timetabling, and reports in one place.' },
  { label: 'Seamless Communication', value: 'Built-in support for bulk SMS, real-time in-app messages, and push notifications to keep parents and staff informed.' },
  { label: 'Secure and Reliable', value: 'Fast, dependable, and accessible on any device with bank-level encryption.' },
  { label: 'Actionable Analytics & Sync', value: 'Empower educators with real-time academic insights and seamless National Exams API synchronization.' },
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
      

      {/* ── KEY FEATURES STRIP ── */}
      <section className="security-blueprint-section">
        <div className="container readiness-grid">
          <div>
            <div className="badge-pill">Core Capabilities</div>
            <h2 className="section-title">Built for efficiency, communication, and modern learning.</h2>
            <p className="section-subtitle left" style={{ marginBottom: 30 }}>
              EduVantage combines powerful automation with an intuitive interface to simplify your school's daily operations.
            </p>
            <div className="tech-checks">
              <div className="tech-check-item">
                <strong>🤖 Smart Timetable Generator</strong>
                <span>Automatically generate zero-clash, curriculum-aware timetables. The AI strictly respects teacher availability, daily subject limits, and break schedules.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>💬 WhatsApp-Style Messaging & SMS</strong>
                <span>Keep everyone in the loop with instant in-app messaging, real-time unread badges, notification sounds, and the ability to forward urgent alerts via SMS directly to mobile phones.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>🎓 Dynamic Curriculum Adaptability</strong>
                <span>Seamlessly switch between multiple educational frameworks (Kenya CBC, British, Cambridge, Montessori, TVET) within the same portal, with automatically adjusted grading scales and report card templates.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>🔐 Anti-Fraud Document Verification</strong>
                <span>Every report card and fee receipt generated prints with a secure, unique QR code. Parents and partners can scan these codes to instantly verify authenticity, eliminating forgery.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>🌐 National Exams Integration</strong>
                <span>Seamlessly synchronize student data and exam identifiers with external examination bodies like KNEC through our scalable and secure API integration.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>📈 Advanced Academic Analytics</strong>
                <span>Drive student success with real-time, data-driven insights. Our performance monitoring dashboards provide index-optimized reporting across diverse curriculums.</span>
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
                q: "How does the platform handle different educational curriculums?",
                a: "EduVantage is designed to be fully 'curriculum-aware'. Administrators can select the active framework at the class or school level (e.g., Kenya CBC, Cambridge, TVET, or Montessori). The system automatically adjusts subject loads, assessment grading rubrics, and the layout of generated report cards to match the chosen standard."
              },
              {
                q: "Can parents pay school fees directly through the portal?",
                a: "Yes! The parent portal includes an intuitive mobile-money integration. Parents can initiate seamless fee payments that reflect instantly on their child's digital ledger, automatically generating verified digital receipts without requiring any manual data entry from your finance office."
              },
              {
                q: "How does the automated timetabling system prevent conflicts?",
                a: "Our smart timetabling engine takes your school's constraints—such as teacher availability, maximum consecutive lessons, double-period limits, and break times—and automatically calculates the most optimal, clash-free schedule. If an issue arises, it highlights exactly where manual adjustments are needed."
              },
              {
                q: "How do internal messages and SMS alerts work?",
                a: "The platform features a secure, WhatsApp-style internal inbox with real-time notifications, unread badges, and audio alerts. For critical announcements, administrators and teachers can check a box to instantly blast a copy of the message via SMS directly to the recipients' mobile phones."
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

