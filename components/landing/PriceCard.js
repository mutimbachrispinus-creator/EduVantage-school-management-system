import Link from 'next/link';

// Colors mapped to dynamic CSS variables, falling back to sleek modern theme palettes
const PRIMARY = 'var(--lp-primary, #4F46E5)'; // Indigo
const ACCENT  = 'var(--lp-accent,  #10B981)'; // Emerald
const DARK    = 'var(--lp-dark,    #0F172A)'; // Deep Slate
const SLATE   = 'var(--lp-slate,   #64748B)'; // Muted Slate
const VIBRANT = 'var(--lp-vibrant, #8B5CF6)'; // Purple

export default function PriceCard({ name, price, desc, features, featured, billingModel, cycle }) {
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
        .btn { padding: 12px 26px; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .btn-primary { background: ${PRIMARY}; color: #fff; }
        .btn-primary:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px rgba(79, 70, 229, 0.4); background: #4338CA; }
        .btn-outline { border: 2px solid rgba(0,0,0,0.1); color: var(--lp-dark, #0F172A); background: #fff; }
        .btn-outline:hover { background: var(--lp-dark, #0F172A); color: #fff; border-color: var(--lp-dark, #0F172A); transform: translateY(-3px); }
      `}</style>
    </div>
  );
}
