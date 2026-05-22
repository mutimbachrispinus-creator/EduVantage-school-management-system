'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useState, useEffect } from 'react';

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


export default function Page() {

  const [activeCurriculum, setActiveCurriculum] = useState('CBC');
  
  useEffect(() => {
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    const secondary = style.getPropertyValue('--secondary').trim() || '#10B981';
    if (primary) style.setProperty('--lp-primary', primary);
    if (secondary) style.setProperty('--lp-accent', secondary);
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
      <LandingFooter />
    </div>
  );

}
