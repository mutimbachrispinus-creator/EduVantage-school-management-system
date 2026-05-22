'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useState, useEffect } from 'react';
import PriceCard from '@/components/landing/PriceCard';



export default function Page() {

  const [plans, setPlans] = useState([]);
  
  useEffect(() => {
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    if (primary) style.setProperty('--lp-primary', primary);

    async function loadStats() {
      try {
        const res = await fetch('/api/saas/config?tenant=platform-master', { cache: 'no-store' });
        const data = await res.json();
        if (data.plans) setPlans(data.plans);
      } catch (e) {}
    }
    loadStats();
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
      <LandingFooter />
    </div>
  );

}
