'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const M = '#4F46E5', SLATE = '#64748B', NAVY = '#0F172A', EMERALD = '#10B981';

function PaymentPromptModal({ plan, payments, studentCount, onClose, tenantId }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const total = plan.billingModel === 'per-learner' ? plan.price * studentCount : plan.price;

  async function initiatePay() {
    if (!phone) return alert('Please enter your M-Pesa phone number');
    setLoading(true);
    setMsg({ type: 'info', text: 'Sending STK Push prompt to your phone...' });
    try {
      const res = await fetch('/api/billing/stk-push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, planId: plan.id, amount: total })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Prompt sent! Enter your M-Pesa PIN on your phone. Your portal activates automatically once paid.' });
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to initiate payment' });
      }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }

  async function initiateCard(method) {
    setLoading(true);
    setMsg({ type: 'info', text: `Preparing ${method} checkout...` });
    try {
      const res = await fetch('/api/pesapal?action=initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionPayload: { tenantId, planId: plan.id, method }, amount: total })
      });
      const data = await res.json();
      if (data.ok) { window.location.href = data.redirect_url; }
      else { setMsg({ type: 'error', text: data.error || `Failed to initiate ${method}` }); }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }

  const DIGITAL = [
    { label:'Mastercard / Visa', icon:'💳', bg:'#fff',    border:'#E2E8F0', col:'#0F172A', sub:'Secure card checkout',    hoverBorder:'#4F46E5' },
    { label:'PayPal',            icon:'🅿️', bg:'#003087', border:'#003087', col:'#fff',    sub:'Pay with PayPal',          hoverBorder:'#003087' },
    { label:'Google Pay',        icon:'G',  bg:'#fff',    border:'#E2E8F0', col:'#0F172A', sub:'One-tap checkout',          hoverBorder:'#34A853' },
    { label:'Airtel Money',      icon:'📡', bg:'#DC2626', border:'#DC2626', col:'#fff',    sub:'Mobile wallet',             hoverBorder:'#DC2626' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:15, overflowY:'auto' }}>
      <div className="panel modal-content" style={{ maxWidth:520, width:'100%', borderRadius:32, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', position:'relative', maxHeight:'92vh', overflowY:'auto' }}>
        <button onClick={onClose} style={{ position:'absolute', top:20, right:20, background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#64748B' }}>✕</button>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:42, marginBottom:10 }}>🔐</div>
          <h2 style={{ fontSize:24, fontWeight:900, color:'#0F172A', margin:'0 0 8px' }}>Activate {plan.name}</h2>
          <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Choose a payment method to upgrade your institutional license.</p>
        </div>

        <div style={{ background:'linear-gradient(135deg,#EEF2FF,#F0FDF4)', padding:'18px 20px', borderRadius:16, border:'1px solid #E2E8F0', marginBottom:24, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#64748B', textTransform:'uppercase', marginBottom:6 }}>Total Amount Due</div>
          <div style={{ fontSize:34, fontWeight:900, color:'#4F46E5' }}>KES {total.toLocaleString()}</div>
          {plan.billingModel === 'per-learner' && (
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>({studentCount} students × KES {plan.price} / term)</div>
          )}
        </div>

        <div style={{ padding:'18px 20px', background:'#F0F9FF', borderRadius:16, border:'1.5px solid #BAE6FD', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ fontSize:22 }}>📲</span>
            <div>
              <div style={{ fontWeight:800, color:'#0369A1', fontSize:14 }}>M-Pesa STK Push</div>
              <div style={{ fontSize:11, color:'#0EA5E9' }}>Instant activation on payment</div>
            </div>
          </div>
          <input
            placeholder="Phone e.g. 0712345678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #BAE6FD', fontSize:15, marginBottom:12, boxSizing:'border-box' }}
          />
          <button disabled={loading} onClick={initiatePay}
            style={{ width:'100%', padding:'13px', borderRadius:12, background: loading ? '#94A3B8' : '#0EA5E9', color:'#fff', fontWeight:900, border:'none', cursor:'pointer', fontSize:15 }}>
            {loading ? 'Initiating...' : '📱 Pay via M-Pesa'}
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
          <span style={{ fontSize:11, fontWeight:800, color:'#94A3B8', whiteSpace:'nowrap' }}>OR PAY WITH CARD / DIGITAL WALLET</span>
          <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {DIGITAL.map(({ label, icon, bg, border, col, sub, hoverBorder }) => (
            <button key={label} disabled={loading} onClick={() => initiateCard(label)}
              style={{ padding:'16px 12px', borderRadius:14, background:bg, border:`1.5px solid ${border}`, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'0.2s', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}
              onMouseOver={e => { e.currentTarget.style.borderColor=hoverBorder; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.1)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor=border; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'; }}>
              <div style={{ fontSize:24, fontWeight:900, color:col }}>{icon}</div>
              <div style={{ fontWeight:800, fontSize:12, color:col }}>{label}</div>
              <div style={{ fontSize:10, color: col==='#fff' ? 'rgba(255,255,255,.65)' : '#94A3B8' }}>{sub}</div>
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ marginBottom:16, fontSize:12, color: msg.type==='error'?'#EF4444': msg.type==='success'?'#059669':'#0284C7', fontWeight:700, padding:'12px 16px', background: msg.type==='error'?'#FEF2F2': msg.type==='success'?'#ECFDF5':'#EFF6FF', borderRadius:12, border:`1px solid ${msg.type==='error'?'#FECACA': msg.type==='success'?'#A7F3D0':'#BFDBFE'}` }}>
            {msg.text}
          </div>
        )}

        {payments.filter(p => p.type?.toLowerCase() !== 'pesapal').length > 0 && (
          <>
            <div style={{ textAlign:'center', margin:'4px 0 12px', fontSize:11, color:'#94A3B8', fontWeight:800 }}>OR USE MANUAL CHANNELS</div>
            {payments.filter(p => p.type?.toLowerCase() !== 'pesapal').map((p, i) => (
              <div key={i} style={{ padding:16, border:'1.5px solid #4F46E515', borderRadius:16, background:'#fff', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#4F46E5' }}>{p.type.toUpperCase()} • {p.name}</span>
                  <span style={{ fontSize:10, background:'#EEF2FF', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>VERIFIED</span>
                </div>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                  <div><div style={{ fontSize:9, color:'#64748B', fontWeight:800, textTransform:'uppercase' }}>{p.type==='Bank'?'Account Number':p.type==='PesaPal'?'Consumer Key':'Shortcode'}</div>
                    <div style={{ fontWeight:900, fontSize:18, color:'#0F172A' }}>{p.shortcode||p.account||p.consumerKey}</div></div>
                  <div><div style={{ fontSize:9, color:'#64748B', fontWeight:800, textTransform:'uppercase' }}>Account / Reference</div>
                    <div style={{ fontWeight:900, fontSize:18, color:'#0F172A' }}>{p.account||'EDUVANTAGE'}</div></div>
                </div>
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop:8, padding:14, background:'#EFF6FF', borderRadius:12, border:'1px solid #DBEAFE', fontSize:12, color:'#1E40AF', lineHeight:1.5 }}>
          <strong>Note:</strong> License updates within 5-10 minutes of payment. For instant activation send screenshot to <b>+254 792 656 579</b>.
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [processingPay, setProcessingPay] = useState(searchParams.get('processing') === 'true');
  const [orderId, setOrderId] = useState(searchParams.get('orderId'));
  const [payStatus, setPayStatus] = useState('Verifying payment...');

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

  useEffect(() => {
    if (processingPay && orderId) {
      const check = async () => {
        try {
          const res = await fetch(`/api/pesapal?action=status&OrderTrackingId=${orderId}`);
          const data = await res.json();
          if (data.ok && data.status === 'Completed') {
            setPayStatus('✅ Payment Confirmed! Activating...');
            setTimeout(() => { window.location.reload(); }, 2000);
          } else {
            setPayStatus(data.status || 'Processing...');
            setTimeout(check, 3000);
          }
        } catch (e) {
          setPayStatus('Error checking status');
        }
      };
      check();
    }
  }, [processingPay, orderId]);

  if (loading) return <div style={{ padding: 40 }}>Loading Billing...</div>;
  if (!data) return <div style={{ padding: 40 }}>Failed to load billing details.</div>;

  const { subscription, platformPayments, tenantId } = data;
  const daysLeft = Math.ceil((new Date(subscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;
  const isFreeTerm = subscription.plan === 'free-term';

  return (
    <div className="page on billing-page" style={{ background: '#F8FAFC', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <div className="blob-bg" style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%)', zIndex: 0 }}></div>
      
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: NAVY, letterSpacing: '-0.02em' }}>💳 Institutional Billing</h1>
        <p style={{ color: SLATE, fontSize: 16 }}>Securely manage your platform subscription and academic licensing.</p>
      </div>

      <div className="sg sg2" style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <div className="panel billing-panel" style={{ background: '#fff', borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
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

        {processingPay && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div>
              <div className="spinner" style={{ width: 50, height: 50, border: '5px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
              <h2 style={{ color: NAVY }}>Automated Activation</h2>
              <p style={{ color: SLATE, fontWeight: 700 }}>{payStatus}</p>
              <p style={{ fontSize: 11, color: SLATE, marginTop: 20 }}>Please stay on this page. Do not refresh.</p>
            </div>
          </div>
        )}

        <div className="panel billing-panel" style={{ background: '#fff', borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: 24, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: SLATE }}>Platform Payment Instructions</h3>
          <p style={{ color: SLATE, fontSize: 15, marginBottom: 30, lineHeight: 1.6 }}>To renew or upgrade, please use our official channels. Your license will be extended automatically upon verification.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {platformPayments.map((p, idx) => (
              <div key={idx} style={{ padding: 24, border: `1.5px solid ${M}15`, borderRadius: 24, background: `linear-gradient(135deg, ${M}05, #fff)`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 64, opacity: 0.05, transform: 'rotate(-15deg)' }}>{p.type === 'Paybill' ? '📲' : '🏦'}</div>
                <div style={{ fontWeight: 800, color: M, marginBottom: 12, fontSize: 16 }}>{p.name} • {p.type}</div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 120 }}>
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

      <div className="panel billing-panel" style={{ marginTop: 40, background: '#fff', borderRadius: 32, boxShadow: '0 20px 50px rgba(15,23,42,0.05)', position: 'relative', zIndex: 1 }}>
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
              <button 
                className="btn" 
                onClick={() => setSelectedPlan(p)}
                style={{ width: '100%', padding: 14, borderRadius: 14, background: idx === 1 ? M : NAVY, color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Switch to {p.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedPlan && (
        <PaymentPromptModal 
          plan={selectedPlan} 
          payments={data.platformPayments} 
          studentCount={data.studentCount}
          tenantId={tenantId}
          onClose={() => setSelectedPlan(null)} 
        />
      )}

      <style jsx>{`
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid ${M}; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .billing-page {
          padding: 40px;
        }
        .billing-panel {
          padding: 40px;
        }
        .modal-content {
          padding: 40px;
        }
        @media (max-width: 800px) {
          .billing-page {
            padding: 20px 16px;
          }
          .billing-panel {
            padding: 24px 20px;
            border-radius: 20px !important;
          }
          .modal-content {
            padding: 24px 20px;
            border-radius: 24px !important;
          }
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
