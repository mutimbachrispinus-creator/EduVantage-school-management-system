'use client';
export const runtime = 'edge';
import { useEffect, useState } from 'react';

const M = '#4F46E5', SLATE = '#64748B', NAVY = '#0F172A', EMERALD = '#10B981';

export default function BillingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/billing');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading Billing...</div>;
  if (!data) return <div style={{ padding: 40 }}>Failed to load billing details.</div>;

  const { subscription, platformPayments } = data;
  const daysLeft = Math.ceil((new Date(subscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;
  const isFreeTerm = subscription.plan === 'free-term';

  return (
    <div className="page on" style={{ padding: 40, background: '#F8FAFC', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%)', zIndex: 0 }}></div>
      
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: NAVY, letterSpacing: '-0.02em' }}>💳 Institutional Billing</h1>
        <p style={{ color: SLATE, fontSize: 16 }}>Securely manage your platform subscription and academic licensing.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <div className="panel" style={{ background: '#fff', padding: 40, borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: 24, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: SLATE }}>Current Subscription</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: isExpired ? '#FEF2F2' : 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
              {isExpired ? '⚠️' : '🛡️'}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: NAVY, letterSpacing: '-0.01em' }}>{subscription.details?.name || subscription.plan} Plan</div>
              <div style={{ fontSize: 16, color: isExpired ? '#EF4444' : EMERALD, fontWeight: 700 }}>
                {isExpired ? 'Expired — Immediate Renewal Required' : `Active • ${daysLeft} Days Remaining`}
              </div>
              {isFreeTerm && !isExpired && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 8, color: '#9A3412', fontSize: 11, fontWeight: 700 }}>
                  ⚠️ NON-RENEWABLE PLAN
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: SLATE, fontSize: 13 }}>Expiry Date</span>
              <span style={{ fontWeight: 700 }}>{new Date(subscription.expires_at).toLocaleDateString('en-KE', { dateStyle: 'long' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: SLATE, fontSize: 13 }}>Billing Cycle</span>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{isFreeTerm ? 'One-Time Term' : (subscription.details?.cycle || 'N/A')}</span>
            </div>
            {subscription.details?.billingModel === 'per-learner' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px dashed #CBD5E1', marginTop: 10 }}>
                <span style={{ color: SLATE, fontSize: 13 }}>Cost Breakdown</span>
                <span style={{ fontWeight: 800, color: M }}>{data.studentCount} students × KES {subscription.details.price}</span>
              </div>
            )}
          </div>
          
          {isFreeTerm && !isExpired && (
            <div style={{ marginTop: 24, padding: 16, background: '#FFF7ED', borderRadius: 16, border: '1.5px solid #FFEDD5' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#9A3412', lineHeight: 1.5 }}>
                <strong>Important Notice:</strong> Your school is currently using the <strong>1 Term Free</strong> introductory offer. This plan cannot be renewed. To continue using the platform after this term, please select a subscription tier from the options below.
              </p>
            </div>
          )}
        </div>

        <div className="panel" style={{ background: '#fff', padding: 40, borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: 24, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: SLATE }}>Platform Payment Instructions</h3>
          <p style={{ color: SLATE, fontSize: 15, marginBottom: 30, lineHeight: 1.6 }}>To renew or upgrade, please use our official channels. Your license will be extended automatically upon verification.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {platformPayments.map((p, idx) => (
              <div key={idx} style={{ padding: 24, border: `1.5px solid ${M}15`, borderRadius: 24, background: `linear-gradient(135deg, ${M}05, #fff)`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 64, opacity: 0.05, transform: 'rotate(-15deg)' }}>{p.type === 'Paybill' ? '📲' : '🏦'}</div>
                <div style={{ fontWeight: 800, color: M, marginBottom: 8, fontSize: 16 }}>{p.name} • {p.type}</div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 11, color: SLATE, textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>{p.type === 'Bank' ? 'Account Number' : 'Shortcode'}</div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: NAVY }}>{p.shortcode || p.account}</div>
                  </div>
                  {(p.account || p.name) && p.type !== 'Bank' && (
                    <div>
                      <div style={{ fontSize: 11, color: SLATE, textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Account / Reference</div>
                      <div style={{ fontWeight: 900, fontSize: 22, color: NAVY }}>{p.account || 'EDUVANTAGE'}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 40, background: '#fff', padding: 40, borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', position: 'relative', zIndex: 1 }}>
        <h3 style={{ marginBottom: 32, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: SLATE }}>Available License Upgrades</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {data.plans.map((p, idx) => (
            <div key={p.id} style={{ padding: 32, border: `2px solid ${idx === 1 ? M : 'rgba(0,0,0,0.05)'}`, borderRadius: 28, background: idx === 1 ? `${M}02` : '#fff', position: 'relative', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}>
              {idx === 1 && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: M, color: '#fff', padding: '4px 14px', borderRadius: 99, fontSize: 10, fontWeight: 800 }}>RECOMMENDED</div>}
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 12, color: NAVY }}>{p.name}</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 20, color: NAVY }}>
                KES {p.price.toLocaleString()} 
                <span style={{ fontSize: 14, color: SLATE, fontWeight: 600 }}>
                  {p.billingModel === 'per-learner' ? ' / learner' : ` / ${p.cycle}`}
                </span>
              </div>
              <ul style={{ padding: 0, listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(p.features || []).map(f => (
                  <li key={f} style={{ fontSize: 14, color: SLATE, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: EMERALD + '20', color: EMERALD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>✓</div>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="btn" style={{ width: '100%', padding: 14, borderRadius: 14, background: idx === 1 ? M : NAVY, color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Switch to {p.name}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
