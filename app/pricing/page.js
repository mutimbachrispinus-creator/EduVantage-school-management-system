'use client';
import '@/styles/landing.css';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import Link from 'next/link';
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
