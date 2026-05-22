'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import Link from 'next/link';
import { useEffect } from 'react';



export default function Page() {
  useEffect(() => {
    const style = document.documentElement.style;
    const primary = style.getPropertyValue('--primary').trim() || '#4F46E5';
    if (primary) style.setProperty('--lp-primary', primary);
  }, []);

  return (
    <div className="landing-wrap">
      <LandingNavbar />
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
      <LandingFooter />
    </div>
  );
}
