'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatBot from '@/components/ChatBot';

// Colors mapped to dynamic CSS variables, falling back to sleek modern theme palettes
const PRIMARY = 'var(--lp-primary, #4F46E5)'; // Indigo
const ACCENT  = 'var(--lp-accent,  #10B981)'; // Emerald
const DARK    = 'var(--lp-dark,    #0F172A)'; // Deep Slate
const SLATE   = 'var(--lp-slate,   #64748B)'; // Muted Slate
const VIBRANT = 'var(--lp-vibrant, #8B5CF6)'; // Purple
const AMBER   = '#F59E0B';

// Detailed Curriculum Mapping configuration
const CURRICULUM_DETAILS = {
  CBC: {
    title: 'Kenya Competency Based Curriculum (CBC)',
    badge: 'Formative & Rubric Focused',
    icon: '⚖️',
    description: 'Transition from rote learning to continuous competency mapping. EduVantage maps learner outcomes across learning areas, strands, and sub-strands using qualitative rubrics.',
    specs: [
      { label: 'Evaluation Metrics', value: 'EE (Exceeding Expectation), ME (Meeting Expectation), AE (Approaching Expectation), BE (Below Expectation).' },
      { label: 'Assessment Types', value: 'Formative learner observations, portfolio tasks, and end-of-stage school assessments.' },
      { label: 'Learning Areas Mapping', value: 'Environmental, Mathematical, Language, Creative Arts, Hygiene, and Religious Education.' },
      { label: 'Report Outputs', value: 'Comprehensive narrative learning profile transcripts showing strand-level mastery checklists.' }
    ]
  },
  TVET: {
    title: 'TVET / CBET Modular Assessments',
    badge: 'Skill-Based Outcomes',
    icon: '⚙️',
    description: 'Engineered for polytechnics, vocational colleges, and technical institutes using CBET (Competency Based Education & Training) frameworks.',
    specs: [
      { label: 'Curriculum Units', value: 'Units of Competency (UC) divided into Core, Basic, and Common occupational modules.' },
      { label: 'Assessment Mode', value: 'Internal and External Assessment scores. Practical skills checklists matched against strict standards.' },
      { label: 'Outcome Tracking', value: 'Satisfactory (S) / Not Yet Satisfactory (NYS) completion states for specific occupational competencies.' },
      { label: 'Certification Path', value: 'Verifies eligibility for national assessment boards by tracking required practical workshop hours.' }
    ]
  },
  CAMBRIDGE: {
    title: 'Cambridge Assessment International Education',
    badge: 'Global Scaled Marksheets',
    icon: '🇬🇧',
    description: 'Supports Cambridge Primary, Lower Secondary, IGCSE, O-Levels, and AS & A-Levels with full letter scale conversion and component weightings.',
    specs: [
      { label: 'Grading Scales', value: 'A* to G scales for IGCSE, 9 to 1 numeric boundaries, and standard A to E thresholds for A-Levels.' },
      { label: 'Assessment Structure', value: 'Supports multiple paper breakdowns (e.g., Paper 1 Theory, Paper 2 Practical, Paper 3 Alternative) per subject.' },
      { label: 'Weighting Controls', value: 'Admins set custom percentage contribution ratios per exam component to compute final raw scales.' },
      { label: 'Grade Scaling', value: 'Enables flexible grade boundary curves to adjust passing boundaries based on year-on-year exam difficulty.' }
    ]
  },
  IB: {
    title: 'International Baccalaureate (IB) DP/MYP',
    badge: 'Criterion-Referenced Rubrics',
    icon: '🎒',
    description: 'Built for international academies using the IB Middle Years Programme (MYP) and Diploma Programme (DP) criterion-referenced evaluation boards.',
    specs: [
      { label: 'Rubric Criteria', value: 'Evaluation criteria A, B, C, and D graded on an isolated 0-8 scale per subject group.' },
      { label: 'Diploma Scale', value: 'Automatic mapping of combined criterion scores to the final global IB grade boundary of 1 to 7.' },
      { label: 'Core Integration', value: 'Logs status checks for Theory of Knowledge (TOK), Extended Essay (EE), and Creativity, Activity, Service (CAS) requirements.' },
      { label: 'Progress Analytics', value: 'Displays continuous progress grids comparing individual criteria to historical class average bands.' }
    ]
  },
  MONTESSORI: {
    title: 'Montessori Qualitative Observation',
    badge: 'Descriptive & Child-Led',
    icon: '🦋',
    description: 'Designed for early childhood development centers (ECD) focusing on individualized progress tracking without rigid numerical test scores.',
    specs: [
      { label: 'Tracking Model', value: 'Narrative observations logged across key developmental areas: Practical Life, Sensorial, Language, Mathematics, and Culture.' },
      { label: 'Milestone Progress', value: 'Tracks child milestones through sequential stages: Introduced, Working on, and Mastered.' },
      { label: 'Teacher Journal Logs', value: 'Daily or weekly qualitative portfolios describing focus areas, peer interactions, and coordination milestones.' },
      { label: 'Parent Deliverables', value: 'Custom developmental narrative reports replacing traditional grade sheets with comprehensive portfolios.' }
    ]
  }
};

// Detailed User Persona experience configurations
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

// Extremely detailed Features Blueprint for the Search and Filtering system
const ALL_FEATURES_BLUEPRINT = [
  // Finance & Payments
  { id: 'mpesa', category: 'finance', icon: '💳', title: 'M-Pesa STK Push Integration', desc: 'Direct push requests to parent mobile phones, enabling one-tap secure school fees clearing with automatic callbacks.', detail: 'Triggers Safaricom Daraja API STK push requests directly from the fee balance sheet to parents. Once cleared, Safaricom sends a JSON callback to our secure webhook to automatically credit the student ledger, generate a digital receipt, and notify parents.' },
  { id: 'pesapal', category: 'finance', icon: '🏦', title: 'Pesapal Checkout Engine', desc: 'Alternative payments for Credit/Debit Cards, Airtel Money, and bank transfers with instant validation.', detail: 'Integrates the official Pesapal v3 API checkout flow, redirecting parents to a secure payments portal. It returns transaction status immediately to reconcile school bank balances.' },
  { id: 'revenue', category: 'finance', icon: '📊', title: 'Revenue Visibility Dashboard', desc: 'Comprehensive financial health checking with fee structures, expected yields, collections, and active arrears.', detail: 'Displays visual gauges comparing total budgeted term fees, actual cash collected, unpaid arrears, and historical collection trends across different streams and grade levels.' },
  { id: 'payroll', category: 'finance', icon: '💼', title: 'Transparent Staff Payroll', desc: 'Granular payroll ledger displaying individual loan repayments, statutory dues, and custom deductions.', detail: 'Generates detailed payslips that separate statutory tax columns (PAYE, SHIF/NHIF, NSSF) from custom deductions (e.g., Sacco dues, emergency school loans, salary advances) for absolute payroll transparency.' },
  { id: 'settlement', category: 'finance', icon: '🏧', title: 'Platform Settlement Queues', desc: 'Track vendor/school payout flows, transaction splits, and settlement queues in a centralized registry.', detail: 'Monitors the platform B2C disbursement pipeline. Tracks when fee collections are swept from the holding escrow account to institutional bank accounts, displaying clear settlement dates and bank reference codes.' },

  // Academics & Reports
  { id: 'grading', category: 'academics', icon: '⚖️', title: 'Curriculum-Aware Grading Engine', desc: 'Fully adaptable evaluation scaling supporting CBC rubrics, TVET CBET modular, Cambridge A-E, IB, and Montessori child diaries.', detail: 'Adapts its backend formulas per student grade level. Handles Kenya CBC formative learning areas and strands, TVET units of competency, Cambridge grade boundary curves, IB 0-8 assessment rubrics, and Montessori observations.' },
  { id: 'analytics', category: 'academics', icon: '🏆', title: 'Advanced Exam Analytics', desc: 'Subject summaries, student rankings, standard deviations, and subject performance indices.', detail: 'Analyzes test scores to produce instant class-wide summaries. Computes subject ranks, standard deviations to check grade spreads, teacher subject performance index (SPI), and identifies students needing urgent academic intervention.' },
  { id: 'predictor', category: 'academics', icon: '🔮', title: 'AI-Powered Grade Predictor', desc: 'Forecasting algorithms that trace student historical trajectories to project national examination scores.', detail: 'Uses historical test averages and curriculum weightages to trace individual learning trajectories, forecasting future national exam targets (e.g. KCSE or IGCSE boundaries) based on progress gradients.' },
  { id: 'reportcards', category: 'academics', icon: '📋', title: 'QR-Verified Digital Report Cards', desc: 'Beautiful, tamper-proof academic transcripts with anti-fraud QR validation.', detail: 'Generates print-ready termly report cards containing teacher remarks, class metrics, attendance summaries, and an embedded anti-fraud QR code that matches stored database records.' },
  { id: 'markbooks', category: 'academics', icon: '📚', title: 'Teacher Digital Markbooks', desc: 'Seamless numerical and narrative score collection interface with robust auto-save triggers.', detail: 'Gives teachers an optimized interface to key in student marks for regular assignments, mid-terms, and end-terms, running instant formula calculations on the edge runtime.' },

  // Communications
  { id: 'sms', category: 'comms', icon: '🚀', title: 'Africa\'s Talking SMS Hub', desc: 'High-speed automated and bulk SMS alerts for attendance, fee balances, and announcements.', detail: 'Integrates Africa\'s Talking gateway for high-throughput SMS broadcasting. Templates let admins broadcast student absence alerts, customized fee balance reminders, and emergency school alerts.' },
  { id: 'delivery', category: 'comms', icon: '📲', title: 'SMS Delivery Hook Observability', desc: 'Real-time webhook logs tracking Africa\'s Talking delivery receipts to verify parent notification status.', detail: 'Hosts a dedicated delivery webhook endpoint (`/api/sms/delivery`) that consumes callback statuses from carriers. Admins see absolute logs verifying whether each SMS reached the parent\'s handset.' },
  { id: 'messages', category: 'comms', icon: '💬', title: 'Internal Multi-Role Messaging', desc: 'Isolated internal communication channels for admin, teacher, staff, and parent workspaces.', detail: 'A secure, role-restricted internal chat and notice board where school administrators can issue general notices, and teachers can converse directly with individual parents.' },
  { id: 'alerts', category: 'comms', icon: '🔔', title: 'Context-Aware Push Alerts', desc: 'Real-time dashboard notifications for upcoming duties, calendar updates, and pending workflow approvals.', detail: 'Fires immediate desktop and in-app notifications to teachers about scheduled playground/class duties, and alerts admins to pending staff expense claims.' },

  // System & Infrastructure
  { id: 'tenant', category: 'infrastructure', icon: '🛡️', title: 'Multi-Tenant Database Isolation', desc: 'Tenant-aware data mapping ensuring absolute database separation and custom school branding.', detail: 'Guarantees institutional security using unique tenant IDs. Each school has completely isolated database tables, unique branding assets (logo, taglines), customized primary/secondary color schemes, and domain routing.' },
  { id: 'csv', category: 'infrastructure', icon: '📥', title: 'Smart Bulk CSV Onboarding', desc: 'Automated parser that imports hundreds of learner, parent, stream, and payment records in seconds.', detail: 'Eliminates manual entry using an advanced CSV parser. It automatically validates columns, flags duplicates, matches parents to learners, sets initial fee states, and populates database registries.' },
  { id: 'edge', category: 'infrastructure', icon: '🌐', title: 'Cloudflare Edge Architecture', desc: 'Fast, secure globally distributed platform running on Cloudflare Pages and D1/Edge databases.', detail: 'Built specifically for modern cloud infrastructure. The application bundle is optimized to run inside Cloudflare\'s 3MB Edge worker limit, ensuring ultra-low latency and absolute uptime in remote geographic areas.' },
  { id: 'anti-fraud', category: 'infrastructure', icon: '🔐', title: 'Relational Database Registry Checks', desc: 'Enforces database checks for all fees collected and reports printed to stop fraud.', detail: 'Halts fee fraud and false report card printing. Academic certificates and fee collection receipts undergo automated relational reference checks to ensure they map back to active records.' },
  { id: 'diagnostics', category: 'infrastructure', icon: '🛠️', title: 'Self-Healing Admin Repair Utilities', desc: 'Backstage diagnostic tools and database repair paths to maintain absolute system uptime.', detail: 'Includes administrative system utility interfaces where super-admins can trigger database table checks, repair orphaned records, restore cache states, and run health diagnostics.' },
  { id: 'pwa', category: 'infrastructure', icon: '📱', title: 'PWA Mobile-First Portals', desc: 'Installable Progressive Web App with service worker cache controllers for unstable network zones.', detail: 'Functions as an installable mobile app on parent and teacher phones. Leverages custom service worker caching controllers to store dashboards, enabling access to calendars and grades during offline periods.' },
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

  // Interactive UI states
  const [activeCurriculum, setActiveCurriculum] = useState('CBC');
  const [activePersona, setActivePersona] = useState('admin');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

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

  // Filter features based on active category and text query
  const filteredFeatures = ALL_FEATURES_BLUEPRINT.filter(f => {
    const matchesCategory = featureFilter === 'all' || f.category === featureFilter;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

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
              <a href="#curriculum">Curricula</a>
              <a href="#portals">Workspaces</a>
              <a href="#features">Feature Catalog</a>
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
          <div className="badge-pill pulse-glow">Next-Gen Integrated School ERP, Finance & Academics</div>
          <h1 className="hero-title">
            Run the school.<br/>See the <span className="text-gradient">whole picture.</span>
          </h1>
          <p className="hero-subtitle">
            EduVantage brings admissions, fee collections, academics, payroll, internal messaging, Africa's Talking SMS, and multi-channel payment callbacks into one tenant-isolated platform. Optimize school management with built-in tools.
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
              
              {/* Floating Glass Cards */}
              <div className="floating-card card-1 glass-card">
                <div className="icon-wrap" style={{ color: VIBRANT }}>🏦</div>
                <div>
                  <div className="card-val">Daraja Active</div>
                  <div className="card-lab">M-Pesa Ledger Callbacks</div>
                </div>
              </div>
              <div className="floating-card card-2 glass-card">
                <div className="icon-wrap" style={{ color: ACCENT }}>🔐</div>
                <div>
                  <div className="card-val">Isolated SaaS</div>
                  <div className="card-lab">D1 Edge Data Separation</div>
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
            <strong>99.9% Uptime</strong>
            <span>Cloudflare Edge Network</span>
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
                  
                  <div className="bc-expand-details">
                    <h5>Technical Blueprint:</h5>
                    <p>{feat.detail}</p>
                  </div>
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

      {/* ── SECURITY & SYSTEM INTEGRITY TECH PLOT ── */}
      <section className="security-blueprint-section">
        <div className="container readiness-grid">
          <div>
            <div className="badge-pill">Operational Integrity</div>
            <h2 className="section-title">Built for absolute reliability, security, and scalability.</h2>
            <p className="section-subtitle left" style={{ marginBottom: 30 }}>
              EduVantage uses advanced relational database isolation and Cloudflare edge deployments to satisfy the security audit criteria of top-tier learning institutions.
            </p>
            <div className="tech-checks">
              <div className="tech-check-item">
                <strong>🔐 Cryptographic Anti-Fraud QR Verification</strong>
                <span>Every report card and fees receipt generated prints with a cryptographically secure, unique QR code. Scanning verifies transaction details or grades directly from the database to stop forgery.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>🚀 Tenant Data Isolation</strong>
                <span>Data safety is enforced at the core SQL parser level. Dynamic tenant scopes isolate queries to ensure zero school data leaks, matching strict data protection laws.</span>
              </div>
              <div className="tech-check-item" style={{ marginTop: 24 }}>
                <strong>⚡ Edge Network Orchestration</strong>
                <span>Runs inside Cloudflare Pages Edge worker runtime, providing ultra-low latencies globally. Uses client-side sync caching systems so teachers can work seamlessly even during network lags.</span>
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
            
            {/* Visual tech stack card */}
            <div className="tech-stack-card">
              <h4>System Architecture Blueprint</h4>
              <div className="ts-layers">
                <div className="ts-layer"><span>Frontend View</span><strong>Next.js / React (Edge Optimized)</strong></div>
                <div className="ts-arrow">↓</div>
                <div className="ts-layer"><span>Secure Middleware</span><strong>Dynamic Multi-Tenant Token Validator</strong></div>
                <div className="ts-arrow">↓</div>
                <div className="ts-layer"><span>Database Layer</span><strong>Relational SQL Isolation Engine</strong></div>
                <div className="ts-arrow">↓</div>
                <div className="ts-layer"><span>Infrastructure Host</span><strong>Cloudflare Pages Edge Runtime</strong></div>
              </div>
            </div>
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
                     <tr><td><strong>Grading Intelligence</strong></td><td>Static, hardcoded rules</td><td className="hl">Curriculum-Aware (CBC/IB/Cambridge/Montessori/TVET)</td></tr>
                     <tr><td><strong>Parent Experience</strong></td><td>Delayed SMS only</td><td className="hl">Live Portal + M-Pesa STK Push + Auto-Receipts</td></tr>
                     <tr><td><strong>Infrastructure</strong></td><td>Multiple disconnected logins</td><td className="hl">One unified multi-tenant app</td></tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE FAQ SECTION ── */}
      <section className="faq-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge-pill">Common Clarifications</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Deep dive technical details on integration capabilities, school data ownership, and database architecture.</p>
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
              },
              {
                q: "How is school data protected in a multi-tenant cloud setup?",
                a: "Data security is enforced at the core database level. Every query is scoped using a strict tenant ID validation layer, ensuring zero cross-tenant data bleed. The platform runs on the globally distributed Cloudflare Pages network with edge database redundancy (D1/Turso SQL nodes), providing near-zero latency, military-grade SSL encryption, automated background backups, and complete multi-tenant isolation."
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
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
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
              <h4>Product Workspaces</h4>
              <a href="/demo">All Demos</a>
              <a href="/demo/teacher">👩‍🏫 Teacher Portal</a>
              <a href="/demo/parent">👨‍👩‍👧 Parent Portal</a>
              <a href="/demo/staff">🏢 Finance & Admin</a>
              <a href="#pricing">Pricing Plans</a>
            </div>
            <div>
              <h4>Company & Legal</h4>
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
        :root { 
          --lp-primary: #4F46E5; 
          --lp-accent: #10B981; 
          --lp-dark: #0F172A; 
          --lp-slate: #64748B; 
          --lp-vibrant: #8B5CF6; 
        }

        /* Core Reset & Fonts */
        .landing-wrap { 
          background: #fff; 
          color: ${DARK}; 
          font-family: var(--font-inter, sans-serif); 
          overflow-x: hidden; 
          max-width: 100vw; 
        }
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 0 24px; 
          position: relative; 
          z-index: 2; 
          width: 100%; 
          box-sizing: border-box; 
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, .logo-text, .card-val { 
          font-family: var(--font-sora, sans-serif); 
        }
        .text-gradient { 
          background: linear-gradient(135deg, ${PRIMARY}, #06B6D4); 
          -webkit-background-clip: text; 
          background-clip: text; 
          -webkit-text-fill-color: transparent; 
        }
        
        /* Utilities */
        .badge-pill { 
          display: inline-block; 
          padding: 8px 18px; 
          background: rgba(79, 70, 229, 0.08); 
          color: ${PRIMARY}; 
          border-radius: 99px; 
          font-weight: 800; 
          font-size: 13px; 
          margin-bottom: 24px; 
          border: 1px solid rgba(79, 70, 229, 0.2); 
        }
        .pulse-glow { 
          animation: pulseGlow 3s infinite; 
        }
        @keyframes pulseGlow { 
          0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 
          50% { box-shadow: 0 0 20px 0 rgba(79, 70, 229, 0.2); } 
        }
        
        .fade-in-up { 
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Nav */
        .nav { 
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100%; 
          z-index: 1000; 
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          padding: 24px 0; 
        }
        .nav.scrolled { 
          padding: 14px 0; 
          background: rgba(255, 255, 255, 0.85); 
          backdrop-filter: blur(20px); 
          border-bottom: 1px solid rgba(0,0,0,0.05); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.03); 
        }
        .nav-box { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }
        
        .logo-group { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          text-decoration: none; 
        }
        .logo-icon { 
          width: 42px; 
          height: 42px; 
          background: linear-gradient(135deg, ${PRIMARY}, ${VIBRANT}); 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); 
        }
        .logo-icon img { 
          width: 24px; 
          height: 24px; 
          object-fit: contain; 
          filter: brightness(0) invert(1); 
        }
        .logo-text { 
          font-size: 24px; 
          font-weight: 800; 
          color: ${DARK}; 
          letter-spacing: -0.02em; 
        }
        
        .nav-actions { 
          display: flex; 
          align-items: center; 
          gap: 40px; 
        }
        .nav-links { 
          display: flex; 
          gap: 24px; 
        }
        .nav-links a { 
          text-decoration: none; 
          color: ${SLATE}; 
          font-weight: 600; 
          font-size: 15px; 
          transition: 0.2s; 
        }
        .nav-links a:hover { 
          color: ${PRIMARY}; 
        }
        .nav-btns { 
          display: flex; 
          gap: 14px; 
        }
        
        /* Buttons */
        .btn { 
          padding: 12px 26px; 
          border-radius: 14px; 
          font-weight: 700; 
          font-size: 15px; 
          text-decoration: none; 
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          border: none; 
          cursor: pointer; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
        }
        .btn-primary { 
          background: ${PRIMARY}; 
          color: #fff; 
        }
        .btn-primary:hover { 
          transform: translateY(-4px) scale(1.02); 
          box-shadow: 0 20px 40px rgba(79, 70, 229, 0.4); 
          background: #4338CA; 
        }
        .btn-primary:active { 
          transform: scale(0.96) translateY(0); 
        }
        .btn-ghost { 
          color: ${DARK}; 
          background: transparent; 
        }
        .btn-ghost:hover { 
          background: rgba(0,0,0,0.05); 
        }
        .btn-outline { 
          border: 2px solid rgba(0,0,0,0.1); 
          color: ${DARK}; 
          background: #fff; 
        }
        .btn-outline:hover { 
          background: ${DARK}; 
          color: #fff; 
          border-color: ${DARK}; 
          transform: translateY(-3px); 
        }
        .btn-outline:active { 
          transform: scale(0.98); 
        }
        .btn-xl { 
          padding: 18px 46px; 
          font-size: 17px; 
          border-radius: 18px; 
        }
        .btn-glow { 
          position: relative; 
          overflow: hidden; 
        }
        .btn-glow::after { 
          content: ''; 
          position: absolute; 
          inset: -2px; 
          border-radius: 16px; 
          background: linear-gradient(45deg, ${PRIMARY}, #06B6D4); 
          z-index: -1; 
          opacity: 0.5; 
          filter: blur(8px); 
          transition: 0.3s; 
        }
        .btn-glow:hover::after { 
          opacity: 0.8; 
          filter: blur(12px); 
        }
        .btn-glow::before {
          content: ''; 
          position: absolute; 
          top: -50%; 
          left: -50%; 
          width: 200%; 
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: rotate(45deg) translateX(-100%); 
          pointer-events: none;
        }
        .btn-glow:hover::before {
          transform: rotate(45deg) translateX(100%);
          transition: transform 0.6s ease-in-out;
        }
        
        .glass-btn { 
          background: rgba(255,255,255,0.7); 
          backdrop-filter: blur(10px); 
        }

        /* Experience Grid */
        .experience-grid { 
          display: flex; 
          gap: 20px; 
          justify-content: center; 
          margin-bottom: 60px; 
        }
        .exp-card { 
          background: #fff; 
          padding: 16px 24px; 
          border-radius: 20px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.05); 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          border: 1px solid rgba(0,0,0,0.03); 
          transition: 0.3s; 
        }
        .exp-card:hover { 
          transform: translateY(-5px) scale(1.02); 
          box-shadow: 0 20px 40px rgba(79,70,229,0.1); 
          border-color: rgba(79,70,229,0.2); 
        }
        .exp-icon { 
          font-size: 28px; 
        }
        .exp-info { 
          text-align: left; 
        }
        .exp-info strong { 
          display: block; 
          font-size: 15px; 
          color: ${DARK}; 
        }
        .exp-info span { 
          font-size: 12px; 
          color: ${SLATE}; 
          font-weight: 600; 
        }

        /* Hero */
        .hero { 
          padding: 200px 0 100px; 
          position: relative; 
          text-align: center; 
          overflow: hidden; 
          background: #FAFAFB; 
        }
        .hero-mesh { 
          position: absolute; 
          top: -20%; 
          left: -10%; 
          width: 120%; 
          height: 140%; 
          background: radial-gradient(circle at 20% 30%, rgba(79, 70, 229, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 40%); 
          z-index: 0; 
          pointer-events: none; 
        }
        
        .hero-title { 
          font-size: 78px; 
          font-weight: 900; 
          line-height: 1.05; 
          letter-spacing: -0.03em; 
          margin-bottom: 28px; 
          color: ${DARK}; 
        }
        .hero-subtitle { 
          font-size: 21px; 
          color: ${SLATE}; 
          line-height: 1.6; 
          max-width: 800px; 
          margin: 0 auto 48px; 
        }
        .hero-actions { 
          display: flex; 
          gap: 20px; 
          justify-content: center; 
          margin-bottom: 80px; 
        }
        
        .hero-mockup { 
          perspective: 1200px; 
          margin-top: 40px; 
          position: relative; 
          z-index: 2; 
        }
        .mockup-frame { 
          position: relative; 
          background: #fff; 
          padding: 12px; 
          border-radius: 32px; 
          box-shadow: 0 60px 120px -20px rgba(15, 23, 42, 0.2); 
          border: 1px solid rgba(0,0,0,0.05); 
          display: inline-block; 
          transform: rotateX(8deg) translateY(0); 
          transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .mockup-frame:hover { 
          transform: rotateX(0deg) translateY(-10px); 
          box-shadow: 0 80px 150px -20px rgba(15, 23, 42, 0.3); 
        }
        .mockup-img { 
          width: 1000px; 
          max-width: 100%; 
          border-radius: 20px; 
          display: block; 
          border: 1px solid rgba(0,0,0,0.05); 
        }
        
        .glass-card { 
          background: rgba(255,255,255,0.85); 
          backdrop-filter: blur(20px); 
          border: 1px solid rgba(255,255,255,0.5); 
        }
        .floating-card { 
          position: absolute; 
          padding: 20px 24px; 
          border-radius: 24px; 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
          text-align: left; 
          animation: floatObj 6s infinite ease-in-out; 
        }
        @keyframes floatObj { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-20px); } 
        }
        .card-1 { 
          top: 15%; 
          left: -50px; 
        }
        .card-2 { 
          bottom: 20%; 
          right: -50px; 
          animation-delay: -3s; 
        }
        .icon-wrap { 
          width: 52px; 
          height: 52px; 
          background: #fff; 
          border-radius: 16px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 26px; 
          box-shadow: 0 10px 20px rgba(0,0,0,0.05); 
        }
        .card-val { 
          font-size: 20px; 
          font-weight: 800; 
          color: ${DARK}; 
          letter-spacing: -0.02em; 
        }
        .card-lab { 
          font-size: 13px; 
          color: ${SLATE}; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          margin-top: 4px; 
        }

        /* Stats */
        .stats-strip { 
          padding: 50px 0; 
          border-top: 1px solid rgba(0,0,0,0.05); 
          border-bottom: 1px solid rgba(0,0,0,0.05); 
          background: #fff; 
        }
        .stats-box { 
          display: flex; 
          justify-content: space-around; 
          align-items: center; 
        }
        .stat-item { 
          text-align: center; 
        }
        .stat-item strong { 
          display: block; 
          font-size: 38px; 
          font-weight: 900; 
          color: ${DARK}; 
          margin-bottom: 6px; 
          letter-spacing: -0.02em; 
        }
        .stat-item span { 
          color: ${SLATE}; 
          font-weight: 700; 
          font-size: 13px; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
        }
        .stat-sep { 
          width: 1px; 
          height: 60px; 
          background: rgba(0,0,0,0.08); 
        }

        /* Curriculum Adapter Section Styling */
        .curriculum-section {
          padding: 120px 0;
          background: #FAFAFB;
          border-top: 1px solid rgba(0,0,0,0.03);
        }
        .tabs-container {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 12px 24px;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          background: #fff;
          color: ${DARK};
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .tab-btn:hover {
          border-color: ${PRIMARY};
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(79,70,229,0.08);
        }
        .tab-btn.active {
          background: ${PRIMARY};
          border-color: ${PRIMARY};
          color: #fff;
          box-shadow: 0 10px 20px rgba(79,70,229,0.25);
        }
        .curriculum-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 20px 50px rgba(15,23,42,0.05);
          max-width: 900px;
          margin: 0 auto;
        }
        .curr-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .curr-badge {
          align-self: flex-start;
          padding: 6px 14px;
          background: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .curr-header h3 {
          font-size: 32px;
          font-weight: 900;
          color: ${DARK};
          margin: 0;
          letter-spacing: -0.02em;
        }
        .curr-desc {
          font-size: 18px;
          color: ${SLATE};
          line-height: 1.6;
          margin-bottom: 40px;
        }
        .specs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          border-top: 1px solid #F1F5F9;
          padding-top: 32px;
        }
        .spec-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .spec-item strong {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${SLATE};
        }
        .spec-item span {
          font-size: 16px;
          font-weight: 600;
          color: ${DARK};
          line-height: 1.5;
        }

        /* Workspaces Section Styling */
        .portals-section {
          padding: 120px 0;
          background: #fff;
        }
        .portals-layout {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 48px;
          align-items: stretch;
          margin-top: 40px;
        }
        .portal-menu {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .portal-menu-item {
          padding: 24px;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 20px;
          outline: none;
        }
        .portal-menu-item:hover {
          border-color: var(--accent-color);
          background: #fff;
          transform: translateX(6px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.02);
        }
        .portal-menu-item.active {
          background: #fff;
          border-color: var(--accent-color);
          box-shadow: 0 15px 30px rgba(0,0,0,0.06);
        }
        .pmi-icon {
          font-size: 32px;
          width: 56px;
          height: 56px;
          background: #fff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }
        .pmi-title {
          display: block;
          font-weight: 800;
          font-size: 17px;
          color: ${DARK};
        }
        .pmi-badge {
          display: block;
          font-size: 12px;
          color: ${SLATE};
          margin-top: 2px;
          font-weight: 600;
        }
        .portal-display {
          background: #F8FAFC;
          border-radius: 32px;
          padding: 48px;
          border-left: 8px solid ${PRIMARY};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.01);
          transition: border-color 0.3s;
        }
        .pd-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .pd-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .pd-header h3 {
          font-size: 26px;
          font-weight: 900;
          color: ${DARK};
          margin: 0;
        }
        .pd-desc {
          font-size: 17px;
          color: ${SLATE};
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .pd-bullets {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 40px;
        }
        .pd-bullets li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15.5px;
          font-weight: 600;
          color: ${DARK};
          line-height: 1.4;
        }
        .pd-bullets li::before {
          content: '✓';
          color: var(--accent-color);
          font-weight: 900;
          font-size: 16px;
          line-height: 1;
        }
        .pd-actions {
          margin-top: auto;
        }

        /* Feature Catalog Blueprint Section */
        .blueprint-section {
          padding: 120px 0;
          background: #FAFAFB;
          border-top: 1px solid #F1F5F9;
        }
        .search-filter-wrap {
          max-width: 900px;
          margin: 0 auto 50px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .search-box {
          position: relative;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-radius: 18px;
          padding: 18px 24px;
          box-shadow: 0 10px 25px rgba(15,23,42,0.03);
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .search-icon {
          font-size: 22px;
          color: ${SLATE};
        }
        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 16px;
          font-family: inherit;
          color: ${DARK};
          font-weight: 600;
        }
        .search-box input::placeholder {
          color: ${SLATE};
          opacity: 0.7;
        }
        .clear-search {
          background: none;
          border: none;
          color: ${SLATE};
          cursor: pointer;
          font-size: 18px;
          font-weight: 700;
        }
        .filters-row {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #fff;
          color: ${SLATE};
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.25s;
        }
        .filter-btn:hover {
          border-color: ${PRIMARY};
          color: ${PRIMARY};
        }
        .filter-btn.active {
          background: ${DARK};
          border-color: ${DARK};
          color: #fff;
        }
        .blueprint-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }
        .blueprint-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }
        .blueprint-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(79,70,229,0.07);
          border-color: rgba(79,70,229,0.15);
        }
        .bc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .bc-icon {
          font-size: 32px;
          width: 52px;
          height: 52px;
          background: #F1F5F9;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bc-category-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 99px;
          background: #E2E8F0;
          color: ${SLATE};
          letter-spacing: 0.5px;
        }
        .bc-title {
          font-size: 19px;
          font-weight: 800;
          color: ${DARK};
          margin: 0 0 10px;
          line-height: 1.3;
        }
        .bc-desc {
          font-size: 14px;
          color: ${SLATE};
          line-height: 1.5;
          margin: 0 0 20px;
        }
        .bc-expand-details {
          margin-top: auto;
          background: #F8FAFC;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #F1F5F9;
        }
        .bc-expand-details h5 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${SLATE};
          margin: 0 0 6px;
        }
        .bc-expand-details p {
          font-size: 12.5px;
          color: ${DARK};
          line-height: 1.5;
          margin: 0;
          font-weight: 500;
        }
        .no-results {
          text-align: center;
          padding: 60px 20px;
          background: #fff;
          border-radius: 32px;
          border: 1.5px dashed #E2E8F0;
          max-width: 500px;
          margin: 0 auto;
        }
        .no-results span {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }
        .no-results h4 {
          font-size: 20px;
          color: ${DARK};
          margin: 0 0 8px;
        }
        .no-results p {
          color: ${SLATE};
          font-size: 14px;
          margin: 0 0 24px;
        }

        /* Security section styling */
        .security-blueprint-section {
          padding: 120px 0;
          background: #fff;
        }
        .readiness-grid { 
          display: grid; 
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); 
          gap: 56px; 
          align-items: center; 
        }
        .readiness-cards { 
          display: flex;
          flex-direction: column;
          gap: 16px; 
        }
        .readiness-card { 
          padding: 24px 26px; 
          background: #F8FAFC; 
          border: 1px solid #E2E8F0; 
          border-radius: 18px; 
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.02); 
        }
        .readiness-card strong { 
          display: block; 
          color: ${DARK}; 
          font-size: 15px; 
          font-weight: 900; 
          margin-bottom: 8px; 
          text-transform: uppercase; 
          letter-spacing: 0.04em; 
        }
        .readiness-card span { 
          display: block; 
          color: ${SLATE}; 
          font-size: 15px; 
          line-height: 1.6; 
          font-weight: 600; 
        }
        .tech-checks {
          margin-top: 30px;
        }
        .tech-check-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tech-check-item strong {
          font-size: 16px;
          color: ${DARK};
          font-weight: 800;
        }
        .tech-check-item span {
          font-size: 14.5px;
          color: ${SLATE};
          line-height: 1.5;
        }
        .tech-stack-card {
          background: ${DARK};
          color: #fff;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 45px rgba(0,0,0,0.15);
        }
        .tech-stack-card h4 {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 20px;
          text-align: center;
          letter-spacing: -0.01em;
        }
        .ts-layers {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .ts-layer {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 18px;
          text-align: center;
        }
        .ts-layer span {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.6;
          margin-bottom: 2px;
        }
        .ts-layer strong {
          font-size: 13.5px;
          font-weight: 700;
        }
        .ts-arrow {
          font-size: 14px;
          opacity: 0.4;
          font-weight: 800;
        }

        /* FAQ Section Styling */
        .faq-section {
          padding: 120px 0;
          background: #FAFAFB;
          border-top: 1px solid #E2E8F0;
        }
        .faq-wrapper {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .faq-item {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          padding: 24px 28px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .faq-item:hover {
          border-color: ${PRIMARY};
          box-shadow: 0 10px 25px rgba(79,70,229,0.05);
        }
        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .faq-question h4 {
          font-size: 17px;
          font-weight: 800;
          color: ${DARK};
          margin: 0;
          line-height: 1.4;
        }
        .faq-toggle-icon {
          font-size: 14px;
          font-weight: 700;
          color: ${SLATE};
          transition: transform 0.3s;
          transform: rotate(45deg);
        }
        .faq-item.expanded .faq-toggle-icon {
          transform: rotate(0deg);
          color: ${PRIMARY};
        }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
        }
        .faq-item.expanded .faq-answer {
          max-height: 250px;
          opacity: 1;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #F1F5F9;
        }
        .faq-answer p {
          font-size: 14.5px;
          color: ${SLATE};
          line-height: 1.6;
          margin: 0;
          font-weight: 500;
        }

        /* Modules Section Alternative */
        .section-title { 
          font-size: 52px; 
          font-weight: 900; 
          letter-spacing: -0.03em; 
          color: ${DARK}; 
          line-height: 1.1; 
          margin-bottom: 24px; 
        }
        .section-subtitle { 
          font-size: 20px; 
          color: ${SLATE}; 
          max-width: 700px; 
          margin: 0 auto; 
          line-height: 1.6; 
        }
        .section-subtitle.left { 
          margin: 0; 
        }

        /* Comparison Table Styling */
        .compare-section { 
          padding: 120px 0; 
          background: #fff; 
        }
        .comparison-box { 
          background: #F8FAFC; 
          border-radius: 40px; 
          padding: 70px; 
          box-shadow: inset 0 2px 20px rgba(0,0,0,0.02); 
          border: 1px solid rgba(0,0,0,0.04); 
        }
        .comp-hdr { 
          text-align: center; 
          margin-bottom: 60px; 
        }
        .comp-hdr h3 { 
          font-size: 40px; 
          font-weight: 900; 
          color: ${DARK}; 
          margin-bottom: 16px; 
          letter-spacing: -0.02em; 
        }
        .comp-hdr p { 
          color: ${SLATE}; 
          font-size: 18px; 
        }
        
        .comp-table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0; 
        }
        .comp-table th { 
          padding: 24px 30px; 
          text-align: left; 
          border-bottom: 2px solid #E2E8F0; 
          font-size: 15px; 
          text-transform: uppercase; 
          letter-spacing: 1.5px; 
          color: ${SLATE}; 
          font-weight: 800; 
        }
        .comp-table td { 
          padding: 28px 30px; 
          border-bottom: 1px solid #E2E8F0; 
          font-size: 16px; 
          font-weight: 600; 
          color: ${DARK}; 
        }
        .comp-table tr:last-child td { 
          border-bottom: none; 
        }
        .comp-table td.hl { 
          color: ${PRIMARY}; 
          font-weight: 900; 
          background: rgba(79, 70, 229, 0.03); 
          border-radius: 8px; 
        }
        .bad { 
          color: #EF4444; 
        }
        .good { 
          color: ${ACCENT}; 
        }

        /* Pricing Section */
        .pricing-section { 
          padding: 120px 0 100px; 
          background: ${DARK}; 
          color: #fff; 
          border-radius: 60px;
          margin: 0 24px;
        }
        .pricing-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
          gap: 32px; 
          align-items: stretch; 
          margin-top: 60px; 
        }

        /* Footer */
        .footer { 
          padding: 100px 0 0; 
          background: #F8FAFC; 
          border-top: 1px solid rgba(0,0,0,0.05); 
          margin-top: 80px;
        }
        .footer-grid { 
          display: grid; 
          grid-template-columns: 1.5fr 1fr; 
          gap: 100px; 
          margin-bottom: 80px; 
        }
        .footer-info p { 
          color: ${SLATE}; 
          margin: 24px 0 32px; 
          font-size: 16px; 
          max-width: 320px; 
          line-height: 1.6; 
        }
        .social-links { 
          display: flex; 
          gap: 24px; 
          font-weight: 700; 
          color: ${DARK}; 
          font-size: 18px; 
          cursor: pointer; 
        }
        .social-links span:hover { 
          color: ${PRIMARY}; 
        }
        
        .footer-links { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 40px; 
        }
        .footer-links h4 { 
          font-size: 18px; 
          margin-bottom: 24px; 
          font-weight: 800; 
          color: ${DARK}; 
        }
        .footer-links a { 
          display: block; 
          text-decoration: none; 
          color: ${SLATE}; 
          margin-bottom: 14px; 
          font-weight: 600; 
          font-size: 15px; 
          transition: 0.2s; 
        }
        .footer-links a:hover { 
          color: ${PRIMARY}; 
          transform: translateX(5px); 
        }
        
        .footer-bottom { 
          padding: 40px 0; 
          border-top: 1px solid rgba(0,0,0,0.05); 
          text-align: center; 
          color: ${SLATE}; 
          font-weight: 600; 
          font-size: 14px; 
        }

        /* Demo Section */
        .demo-section { 
          padding: 120px 0; 
          background: #fff; 
        }
        .demo-cards { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(290px,1fr)); 
          gap: 28px; 
        }
        .demo-card-link { 
          text-decoration: none; 
          color: inherit; 
        }
        .demo-card { 
          padding: 40px 32px; 
          border-radius: 32px; 
          border: 2px solid transparent; 
          transition: 0.4s cubic-bezier(0.16,1,0.3,1); 
          cursor: pointer; 
          position: relative; 
          overflow: hidden; 
        }
        .demo-card::before { 
          content: ''; 
          position: absolute; 
          inset: 0; 
          opacity: 0; 
          transition: 0.4s; 
          border-radius: 30px; 
        }
        .demo-card:hover { 
          transform: translateY(-10px); 
          border-color: transparent; 
        }
        .dc-teacher { 
          background: linear-gradient(135deg, #EEF2FF, #E0E7FF); 
        }
        .dc-teacher:hover { 
          background: linear-gradient(135deg, #4F46E5, #6366F1); 
          color: #fff; 
          box-shadow: 0 40px 80px rgba(79,70,229,0.35); 
        }
        .dc-teacher:hover .dc-cta { 
          color: #fff; 
        }
        .dc-teacher:hover .dc-chips span { 
          background: rgba(255,255,255,0.15); 
          color: rgba(255,255,255,0.9); 
          border-color: rgba(255,255,255,0.2); 
        }
        .dc-parent { 
          background: linear-gradient(135deg, #ECFDF5, #D1FAE5); 
        }
        .dc-parent:hover { 
          background: linear-gradient(135deg, #059669, #10B981); 
          color: #fff; 
          box-shadow: 0 40px 80px rgba(16,185,129,0.35); 
        }
        .dc-parent:hover .dc-cta { 
          color: #fff; 
        }
        .dc-parent:hover .dc-chips span { 
          background: rgba(255,255,255,0.15); 
          color: rgba(255,255,255,0.9); 
          border-color: rgba(255,255,255,0.2); 
        }
        .dc-staff { 
          background: linear-gradient(135deg, #F5F3FF, #EDE9FE); 
        }
        .dc-staff:hover { 
          background: linear-gradient(135deg, #7C3AED, #8B5CF6); 
          color: #fff; 
          box-shadow: 0 40px 80px rgba(124,58,237,0.35); 
        }
        .dc-staff:hover .dc-cta { 
          color: #fff; 
        }
        .dc-staff:hover .dc-chips span { 
          background: rgba(255,255,255,0.15); 
          color: rgba(255,255,255,0.9); 
          border-color: rgba(255,255,255,0.2); 
        }
        .dc-emoji { 
          font-size: 56px; 
          margin-bottom: 20px; 
        }
        .demo-card h3 { 
          font-size: 26px; 
          font-weight: 900; 
          margin-bottom: 12px; 
          letter-spacing: -0.02em; 
        }
        .demo-card p { 
          font-size: 15px; 
          line-height: 1.6; 
          opacity: 0.75; 
          margin-bottom: 24px; 
        }
        .dc-chips { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 8px; 
          margin-bottom: 28px; 
        }
        .dc-chips span { 
          padding: 5px 12px; 
          border-radius: 99px; 
          font-size: 12px; 
          font-weight: 700; 
          background: rgba(0,0,0,0.05); 
          border: 1px solid rgba(0,0,0,0.08); 
          transition: 0.3s; 
        }
        .dc-cta { 
          font-size: 15px; 
          font-weight: 800; 
          color: ${PRIMARY}; 
          transition: 0.3s; 
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .hero-title { font-size: 64px; }
          .portals-layout { grid-template-columns: 1fr; gap: 32px; }
          .portal-menu { flex-direction: row; flex-wrap: wrap; }
          .portal-menu-item { flex: 1 1 200px; padding: 16px; gap: 12px; }
          .portal-display { padding: 32px; }
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
          .curriculum-card { padding: 24px; }
          .specs-grid { grid-template-columns: 1fr; gap: 16px; }
          .curr-header h3 { font-size: 24px; }
          .curr-desc { font-size: 15px; }
          .blueprint-grid { grid-template-columns: 1fr; }
          .readiness-grid { grid-template-columns: 1fr; gap: 28px; }
          .demo-section { padding: 70px 0; }
          .demo-cards { grid-template-columns: 1fr; gap: 16px; }
          .demo-card { padding: 28px 24px; }
          .dc-emoji { font-size: 40px; }
          .demo-card h3 { font-size: 20px; }
          .comp-table { display: block; overflow-x: auto; white-space: nowrap; }
          .pricing-grid { grid-template-columns: 1fr; }
          .pricing-section { border-radius: 40px; margin: 0 12px; padding: 80px 0; }
          .footer-grid { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-in-up, .pulse-glow, .floating-card { animation: none !important; }
          .btn-primary:hover, .portal-menu-item:hover, .blueprint-card:hover { transform: none !important; }
        }
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
        <p style={{ fontSize: 15, opacity: 0.8, marginTop: 16, lineOverflow: 'ellipsis', lineHeight: 1.6 }}>{desc}</p>
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
