'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const PERSONA_DETAILS = {
  admin: {
    title: 'Supercharged Administration Panel',
    icon: '🛡️',
    color: '#4F46E5',
    badge: 'Full Governance & Oversight',
    desc: 'Complete institutional governance in a single tenant-aware dashboard. Streamline financial operations, manage staff directory parameters, inspect collections, and verify system integrity.',
    bullets: [
      'Trigger Safaricom M-Pesa STK fee payment push requests directly to parent devices.',
      'Audit bulk SMS campaigns, Africa\'s Talking delivery logs, and text templates.',
      'Disburse detailed staff payroll with precise statutory tax and granular loan deductions.',
      'Control multi-tenant branding assets, custom primary colors, and student seat limits.',
      'Execute repair utilities, table checks, cache hydration, and system integrity logs.'
    ]
  },
  teacher: {
    title: 'Digital Classrooms & Markbooks',
    icon: '👩‍🏫',
    color: '#10B981',
    badge: 'Streamlined Academic Workflows',
    desc: 'Empower teachers with optimized data entry markbooks, automated curriculum scales, digital student registers, and diagnostic academic charts.',
    bullets: [
      'Record student attendance in seconds using a responsive mobile-friendly list.',
      'Upload exam marks via bulk CSV import parser or directly into the live web grid.',
      'Auto-convert numerical scores to respective CBC, Cambridge, TVET, or IB scales.',
      'Analyze class grade distributions, standard deviations, and subject performance indices.',
      'Publish academic timetables and attach video-lesson links to student portals.'
    ]
  },
  parent: {
    title: 'Transparent Parent Self-Service',
    icon: '👨‍👩‍👧',
    color: '#8B5CF6',
    badge: 'Trust & Direct Engagement',
    desc: 'Build trust with a secure, real-time parent portal. Parents track their children\'s grades, clear balances with one-tap payment options, and receive immediate SMS notifications.',
    bullets: [
      'Inspect detailed student fees ledger history, itemized charges, and payment records.',
      'Initiate instant fee clearing via Safaricom M-Pesa STK push options.',
      'Download print-ready, official report cards containing an anti-fraud verification QR code.',
      'Track real-time child attendance indicators, academic progress curves, and teacher notes.',
      'Receive instant SMS notifications for class alerts and invoice reminders.'
    ]
  },
  student: {
    title: 'Interactive Learning & Schedules',
    icon: '🎓',
    color: '#F59E0B',
    badge: 'Self-Directed Academic Progress',
    desc: 'Provide students with direct access to academic timetables, course learning documents, performance charts, and live video lecture rooms.',
    bullets: [
      'Access class timetables, subject lessons, and uploaded digital resources.',
      'Join live video lecture sessions using configured Jitsi or Daily.co nodes.',
      'Track individual academic performance deviations and forecasted grade metrics.',
      'Check dynamic school term calendars, exam schedules, and holiday dates.'
    ]
  }
};


export default function Page() {

  const [activePersona, setActivePersona] = useState('admin');
  
  useEffect(() => {
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    if (primary) style.setProperty('--lp-primary', primary);
  }, []);

  return (
    <div className="landing-wrap">
      <LandingNavbar />
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
            <div className="mockup-frame">
              <img src="/eduvantage-hero-new.png" alt="Dashboard Mockup" className="mockup-img" />
              
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
      <section id="curriculum" className="curriculum-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Unified Grading Matrix</div>
            <h2 className="section-title">The Curriculum-Aware<br /><span className="text-gradient">Grading Engine</span></h2>
            <p className="section-subtitle">No more rigid setups. Scale grades, rubrics, and certificates per student or level with a single engine built for global education systems.</p>
          </div>

          {/* Tab Selector */}
          <div className="tabs-container">
            {Object.keys(CURRICULUM_DETAILS).map((key) => (
              <button
                key={key}
                className={`tab-btn ${activeCurriculum === key ? 'active' : ''}`}
                onClick={() => setActiveCurriculum(key)}
              >
                {CURRICULUM_DETAILS[key].icon} {key}
              </button>
            ))}
          </div>

          {/* Interactive Card */}
          <div className="curriculum-card fade-in">
            <div className="curr-header">
              <span className="curr-badge">{CURRICULUM_DETAILS[activeCurriculum].badge}</span>
              <h3>{CURRICULUM_DETAILS[activeCurriculum].title}</h3>
            </div>
            <p className="curr-desc">{CURRICULUM_DETAILS[activeCurriculum].description}</p>
            
            <div className="specs-grid">
              {CURRICULUM_DETAILS[activeCurriculum].specs.map((spec, i) => (
                <div key={i} className="spec-item">
                  <strong>{spec.label}</strong>
                  <span>{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAL WORKSPACES (SHOWCASE FEATURE 2) ── */}
      <section id="portals" className="portals-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Contextual Workspaces</div>
            <h2 className="section-title">Tailored experiences for <br /><span className="text-gradient">every institutional role</span></h2>
            <p className="section-subtitle">Different dashboards tailored to give administrators, teachers, parents, and students the exact tools they need.</p>
          </div>

          <div className="portals-layout">
            {/* Left selector */}
            <div className="portal-menu">
              {Object.keys(PERSONA_DETAILS).map((key) => (
                <button
                  key={key}
                  className={`portal-menu-item ${activePersona === key ? 'active' : ''}`}
                  onClick={() => setActivePersona(key)}
                  style={{ '--accent-color': PERSONA_DETAILS[key].color }}
                >
                  <span className="pmi-icon">{PERSONA_DETAILS[key].icon}</span>
                  <div>
                    <span className="pmi-title">{PERSONA_DETAILS[key].title}</span>
                    <span className="pmi-badge">{PERSONA_DETAILS[key].badge}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Display */}
            <div className="portal-display" style={{ borderLeftColor: PERSONA_DETAILS[activePersona].color }}>
              <div className="pd-header">
                <span className="pd-icon" style={{ background: `${PERSONA_DETAILS[activePersona].color}1A`, color: PERSONA_DETAILS[activePersona].color }}>
                  {PERSONA_DETAILS[activePersona].icon}
                </span>
                <h3>{PERSONA_DETAILS[activePersona].title} Workspace</h3>
              </div>
              <p className="pd-desc">{PERSONA_DETAILS[activePersona].desc}</p>
              
              <ul className="pd-bullets">
                {PERSONA_DETAILS[activePersona].bullets.map((bullet, idx) => (
                  <li key={idx} style={{ '--accent-color': PERSONA_DETAILS[activePersona].color }}>{bullet}</li>
                ))}
              </ul>

              <div className="pd-actions">
                <Link href={activePersona === 'admin' ? '/demo/staff' : activePersona === 'teacher' ? '/demo/teacher' : activePersona === 'parent' ? '/demo/parent' : '/login'} className="btn btn-primary" style={{ background: PERSONA_DETAILS[activePersona].color }}>
                  Launch {PERSONA_DETAILS[activePersona].title} Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>
  );

}
