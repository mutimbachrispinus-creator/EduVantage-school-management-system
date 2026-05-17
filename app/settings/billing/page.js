'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

const M = '#8B1A1A', M2 = '#6B1212', ML = '#FDF2F2', MB = '#F5E6E6';

const PLANS = [
  { id: 'lite', name: 'Lite', price: '2,500', cycle: 'Term', features: ['Learner Mgmt', 'Attendance', 'Messaging'], bg: '#F8FAFC', color: '#475569' },
  { id: 'standard', name: 'Standard', price: '7,500', cycle: 'Term', features: ['+ Exams & Analytics', 'Merit Lists', 'Sms Integration'], bg: '#F0F9FF', color: '#0369A1' },
  { id: 'premium', name: 'Premium (SaaS)', price: '15,000', cycle: 'Year', features: ['+ Finance & Payroll', 'CBC Visual Portfolio', 'AI Warning System'], bg: ML, color: M }
];

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState({
    plan: 'Premium',
    status: 'Active',
    expiry: '2026-12-31',
    daysLeft: 245
  });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) { router.push('/'); return; }
    setUser(u);

    try {
      const tid = u.tenantId || u.tenant_id;
      const res = await fetch(`/api/saas/config?tenant=${tid}`);
      const data = await res.json();
      if (data.profile) {
        setSubscription({
          plan: data.profile.plan || 'Trial',
          cycle: data.profile.cycle || 'Termly',
          status: 'Active', // Status could be fetched from sub as well
          expiry: '2026-12-31', // Placeholder or fetch from expiresAt
          daysLeft: 245 // Placeholder
        });
      }
    } catch (e) {}

    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Opening Billing Center…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>💳 Subscription & Billing</h2>
          <p>Manage your school's platform access and licensing</p>
        </div>
        <div className={`badge ${subscription.status === 'Active' ? 'bg-green' : 'bg-red'}`} style={{ padding: '8px 15px', fontSize: 13 }}>
          {subscription.status.toUpperCase()} — {subscription.plan} ({subscription.cycle})
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 30, background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff', border: 'none' }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff' }}>Current License Status</h3>
            <p style={{ margin: '5px 0 0 0', color: '#94A3B8' }}>Your subscription will renew on <strong>{new Date(subscription.expiry).toLocaleDateString()}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#FCD34D' }}>{subscription.daysLeft} Days</div>
            <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' }}>Remaining Runway</div>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 20 }}>Available Platform Tiers</h3>
      <div className="sg sg3">
        {PLANS.map(p => (
          <div key={p.id} className="panel" style={{ border: subscription.plan.toLowerCase() === p.id ? `2px solid ${p.color}` : '1px solid #eee' }}>
            <div className="panel-hdr" style={{ background: p.bg, color: p.color, textAlign: 'center', display: 'block' }}>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              <div style={{ fontSize: 12, opacity: 0.8 }}>KES {p.price} / {p.cycle || 'Term'}</div>
            </div>
            <div className="panel-body">
              <ul style={{ padding: 0, margin: '0 0 20px 0', listStyle: 'none' }}>
                {p.features.map(f => (
                  <li key={f} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>✅ {f}</li>
                ))}
              </ul>
              <button className="btn" style={{ width: '100%', background: p.color, color: '#fff' }}>
                {subscription.plan.toLowerCase() === p.id ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 30 }}>
        <div className="panel-hdr"><h3>🚀 Automatic Renew (M-Pesa Express)</h3></div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label>M-Pesa Phone Number</label>
              <input type="text" placeholder="0712345678" />
            </div>
            <button className="btn btn-success" style={{ height: 45, marginTop: 18 }}>Pay via M-Pesa STK Push</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>*A push notification will be sent to your phone. Enter your pin to complete the subscription.</p>
        </div>
      </div>

      <style jsx>{`
        .sg { gap: 20px; }
        @media (max-width: 800px) {
          .sg { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
