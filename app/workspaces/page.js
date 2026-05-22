'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
