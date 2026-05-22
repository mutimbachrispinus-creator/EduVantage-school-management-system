'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useState, useEffect } from 'react';

const ALL_FEATURES_BLUEPRINT = [
  // Finance & Payments
  { id: 'mpesa', category: 'finance', icon: '💳', title: 'M-Pesa STK Push Integration', desc: 'Direct push to parent phones enabling one-tap school fee clearing with automatic M-Pesa callbacks.', detail: 'Triggers Safaricom Daraja API STK push requests directly from the fee balance sheet. Once cleared, Safaricom calls our secure webhook which credits the student ledger, generates a digital receipt, and notifies parents.' },
  { id: 'pesapal', category: 'finance', icon: '🏦', title: 'Pesapal Checkout Engine', desc: 'Card, Airtel Money, and bank transfer payments with instant validation and ledger reconciliation.', detail: 'Integrates the official Pesapal v3 API checkout flow, redirecting parents to a secure payments portal that returns transaction status immediately to reconcile school bank balances.' },
  { id: 'revenue', category: 'finance', icon: '📊', title: 'Revenue Visibility Dashboard', desc: 'Real-time collection gauges, fee structure summaries, expected yields, and live arrears tracking.', detail: 'Displays visual gauges comparing budgeted term fees, actual cash collected, unpaid arrears, and historical collection trends per stream and grade.' },
  { id: 'payroll', category: 'finance', icon: '💼', title: 'Transparent Staff Payroll Engine', desc: 'Full payroll with PAYE, SHIF/NHIF, NSSF, Sacco deductions, salary advances, and printable payslips.', detail: 'Generates detailed payslips separating statutory columns (PAYE, SHIF/NHIF, NSSF) from custom deductions (Sacco dues, emergency loans, salary advances). Each payslip includes a QR verification code.' },
  { id: 'settlement', category: 'finance', icon: '🏧', title: 'Platform Settlement Queues', desc: 'Track escrow-to-bank payout flows, transaction splits, and settlement schedules in real time.', detail: 'Monitors the B2C disbursement pipeline. Tracks when fee collections are swept from escrow to institutional bank accounts with clear settlement dates and bank reference codes.' },
  { id: 'ledger', category: 'finance', icon: '🗂️', title: 'Multi-Term Fee Ledger', desc: 'Per-student T1/T2/T3 fee balance tracking with automatic arrears carry-forward and parent receipt history.', detail: 'Every learner stores three-term fee balances with automatic arrears computation. Parents view their full payment history. Admins apply manual cash adjustments with full audit trail entries.' },
  { id: 'allocations', category: 'finance', icon: '📁', title: 'Budget Allocations and Vote-heads', desc: 'Institutional procurement tracking with supplier registry, vote-heads, and expenditure records.', detail: 'Tracks school expenditure against defined budget vote-heads. Maintains a supplier registry and links purchase orders to specific fund allocations for full financial accountability.' },

  // Academics & Reports
  { id: 'grading', category: 'academics', icon: '⚖️', title: 'Curriculum-Aware Grading Engine', desc: 'Adaptable evaluation for CBC, TVET/CBET, Cambridge, IB, British, and Montessori frameworks simultaneously.', detail: 'Adapts backend formulas per student grade level. Handles Kenya CBC formative strands, TVET units of competency, Cambridge grade boundary curves, IB 0-8 rubrics, British National Curriculum levels, and Montessori progress observations.' },
  { id: 'analytics', category: 'academics', icon: '🏆', title: 'Advanced Exam Analytics', desc: 'Subject rankings, standard deviations, Subject Performance Index, and Learner Pathway visualizations.', detail: 'Analyzes scores to produce class-wide summaries. Computes subject ranks, standard deviations, teacher Subject Performance Index (SPI), and identifies at-risk students. Includes a Learner Pathways tab for individual trajectory tracking.' },
  { id: 'predictor', category: 'academics', icon: '🔮', title: 'AI-Powered Grade Predictor', desc: 'Forecasting algorithms projecting national exam scores from historical performance trajectories.', detail: 'Uses historical test averages and curriculum weightages to trace individual learning trajectories, forecasting future national exam targets (KCSE, IGCSE) based on longitudinal progress gradients.' },
  { id: 'reportcards', category: 'academics', icon: '📋', title: 'QR-Verified Digital Report Cards', desc: 'Tamper-proof academic transcripts with embedded anti-fraud QR codes validated against live database records.', detail: 'Generates print-ready termly report cards with teacher remarks, class metrics, attendance summaries, and an encrypted QR code that links to verified database records — stopping transcript forgery at source.' },
  { id: 'markbooks', category: 'academics', icon: '📚', title: 'Teacher Digital Markbooks', desc: 'Score collection with auto-save, offline cache mode, and instant edge-computed formula results.', detail: 'Optimized interface for assignments, mid-terms, and end-terms running instant calculations on the edge runtime. Offline marks sync automatically when connectivity resumes.' },
  { id: 'meritlist', category: 'academics', icon: '🥇', title: 'Automated Merit Lists', desc: 'Instant sortable class and grade-wide merit rankings with printable PDF export.', detail: 'Aggregates all subject scores per learner to auto-generate ranked merit lists. Admins filter by stream, apply score thresholds, and export to print-ready PDFs.' },
  { id: 'timetable', category: 'academics', icon: '🗓️', title: 'AI Timetable Generator', desc: 'Constraint-solving scheduler that resolves teacher conflicts and optimizes workloads automatically.', detail: 'Generates conflict-free weekly timetables. Detects double-booked teachers across streams, enforces break periods, and produces printable timetable sheets per class and per teacher.' },
  { id: 'attendance', category: 'academics', icon: '✅', title: 'Digital Attendance Register', desc: 'Daily roll-call with automated parent SMS absence alerts and term-end attendance reports.', detail: "Teachers mark daily attendance via a responsive register. Absent students trigger immediate SMS notifications to parents via Africa's Talking. Attendance history feeds directly into term report summaries." },

  // Communications
  { id: 'sms', category: 'comms', icon: '🚀', title: "Africa's Talking SMS Hub", desc: 'Bulk SMS for attendance, fee reminders, exam results, and school-wide emergency alerts.', detail: "Integrates Africa's Talking gateway for high-throughput SMS broadcasting. Templates broadcast student absence alerts, fee balance reminders, exam result notifications, and emergency alerts to all parent contacts." },
  { id: 'whatsapp', category: 'comms', icon: '🟢', title: 'WhatsApp Direct Support', desc: 'Persistent WhatsApp channel for instant parent-to-support communication and school assistance.', detail: 'Embedded WhatsApp click-to-chat integration connecting parents and school administrators directly to the EduVantage support team for billing queries, technical issues, and onboarding help.' },
  { id: 'email', category: 'comms', icon: '📧', title: 'Transactional Email Engine', desc: 'Automated emails for receipts, password resets, admission confirmations, and exam summaries.', detail: 'Built-in mail client dispatches automated transactional emails including fee payment receipts, staff credential emails, parent portal access invitations, and admin alerts without third-party dependencies.' },
  { id: 'messages', category: 'comms', icon: '💬', title: 'Internal Multi-Role Messaging', desc: 'Role-restricted internal communication for admin, teacher, staff, and parent workspaces.', detail: 'A secure internal messaging board where administrators issue general notices, teachers communicate with individual parents, and staff file internal requests with real-time unread count badges.' },
  { id: 'alerts', category: 'comms', icon: '🔔', title: 'Context-Aware Push Notifications', desc: 'Real-time notifications for duties, pending approvals, new messages, and calendar events.', detail: 'Fires in-app notifications to teachers for scheduled duties, alerts admins to pending staff requests, and shows real-time unread badges via the background sync engine.' },
  { id: 'delivery', category: 'comms', icon: '📲', title: 'SMS Delivery Observability', desc: 'Webhook logs tracking carrier delivery receipts to confirm every parent notification was delivered.', detail: 'Dedicated delivery webhook endpoint consumes callback statuses from carriers. Admins view delivery logs confirming whether each SMS reached the parent handset.' },

  // System & Infrastructure removed for marketing clarity
];


export default function Page() {

  const [featureFilter, setFeatureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    if (primary) style.setProperty('--lp-primary', primary);
  }, []);

  const filteredFeatures = ALL_FEATURES_BLUEPRINT.filter(f => {
    const matchesCategory = featureFilter === 'all' || f.category === featureFilter;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      {/* ── SEARCHABLE & FILTERABLE FEATURE bluePRINT (THE DEEP DIVE) ── */}
      <section id="features" className="blueprint-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Comprehensive Feature Index</div>
            <h2 className="section-title">The Complete System<br /><span className="text-gradient">Feature Catalog</span></h2>
            <p className="section-subtitle">Filter or search through our deep technical and operational integrations to see exactly how EduVantage runs your school.</p>
          </div>

          {/* Search bar and Filters */}
          <div className="search-filter-wrap">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search features (e.g. M-Pesa, CSV, CBC, payroll, logs...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="filters-row">
              <button className={`filter-btn ${featureFilter === 'all' ? 'active' : ''}`} onClick={() => setFeatureFilter('all')}>All Features</button>
              <button className={`filter-btn ${featureFilter === 'finance' ? 'active' : ''}`} onClick={() => setFeatureFilter('finance')}>💳 Finance & Payments</button>
              <button className={`filter-btn ${featureFilter === 'academics' ? 'active' : ''}`} onClick={() => setFeatureFilter('academics')}>📈 Academics & Grading</button>
              <button className={`filter-btn ${featureFilter === 'comms' ? 'active' : ''}`} onClick={() => setFeatureFilter('comms')}>💬 Communications</button>
              <button className={`filter-btn ${featureFilter === 'infrastructure' ? 'active' : ''}`} onClick={() => setFeatureFilter('infrastructure')}>🛡️ System & Cloud</button>
            </div>
          </div>

          {/* Dynamic Grid */}
          {filteredFeatures.length > 0 ? (
            <div className="blueprint-grid">
              {filteredFeatures.map((feat) => (
                <div key={feat.id} className="blueprint-card">
                  <div className="bc-header">
                    <span className="bc-icon">{feat.icon}</span>
                    <span className="bc-category-badge">{feat.category.toUpperCase()}</span>
                  </div>
                  <h4 className="bc-title">{feat.title}</h4>
                  <p className="bc-desc">{feat.desc}</p>
                  

                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span>📭</span>
              <h4>No features match your criteria</h4>
              <p>Try clearing your search query or switching category filters.</p>
              <button className="btn btn-outline" onClick={() => { setSearchQuery(''); setFeatureFilter('all'); }}>Reset Search & Filters</button>
            </div>
          )}
        </div>
      </section>
      <LandingFooter />
    </div>
  );

}
