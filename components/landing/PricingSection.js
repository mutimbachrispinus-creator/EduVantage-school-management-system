import Link from 'next/link';

function PriceCard({ name, price, desc, features, featured, billingModel, cycle }) {
  return (
    <div className={`p-12 rounded-[40px] border border-white/10 bg-white/5 flex flex-col relative transition-all duration-400 min-[480px]:p-8 ${featured ? 'bg-white/10 border-indigo-600 scale-105 z-10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] hover:border-indigo-600 hover:bg-white/15' : 'hover:border-indigo-600 hover:bg-white/10'} ${name.includes('Free') ? 'border-orange-500/30' : ''}`}>
      {featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-br from-indigo-600 to-violet-500 text-white py-2 px-5 rounded-full text-[12px] font-extrabold tracking-[1px] shadow-[0_10px_20px_rgba(79,70,229,0.3)]">MOST POPULAR</div>}
      {name.includes('Free') && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white py-2 px-5 rounded-full text-[12px] font-extrabold tracking-[1px] shadow-[0_10px_20px_rgba(249,115,22,0.3)]">INTRO OFFER</div>}
      
      <div className="mb-[30px]">
        <h4 className="font-sora text-[24px] font-extrabold mb-3">{name}</h4>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[46px] font-black leading-none">{price === 'Custom' || price === 0 ? '' : 'KES '}{price === 0 ? 'FREE' : price}</span>
          {price !== 'Custom' && price !== 0 && (
            <div className="flex flex-col">
              <span className="opacity-70 text-[13px] font-extrabold uppercase">/ {cycle || 'term'}</span>
              <span className="opacity-50 text-[11px]">{billingModel === 'per-learner' ? 'per student' : 'per school'}</span>
            </div>
          )}
        </div>
        <p className="text-[15px] opacity-80 mt-4 leading-[1.6]">{desc}</p>
        {name.includes('Free') && <div className="mt-2.5 text-[10px] font-black text-orange-500 uppercase tracking-wide">⚠️ ONE-TIME USE • NON-RENEWABLE</div>}
      </div>
      
      <div className="flex-1 flex flex-col gap-3.5 mb-10">
        {features.map(f => (
          <div key={f} className="flex gap-3 text-[15px] font-semibold opacity-90"> 
            <span className="text-emerald-400">✓</span> {f}
          </div>
        ))}
      </div>
      
      <Link href="/saas/signup" className={`inline-flex items-center justify-center w-full py-4 text-[16px] font-bold rounded-[14px] no-underline transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 active:scale-95 text-white ${featured ? 'bg-indigo-600 border-none hover:bg-indigo-700 hover:shadow-[0_20px_40px_rgba(79,70,229,0.4)]' : 'bg-transparent border-2 border-white/20 hover:border-white/50 hover:bg-white/10'}`}>
        Get Started
      </Link>
    </div>
  );
}

export default function PricingSection({ plans = [] }) {
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: 'free',
      name: "1 Term Free",
      price: 0,
      desc: "Try the core workflows for one term and experience the full power of the platform.",
      features: ['Full Platform Access', 'Bulk CSV Learner Uploads', 'M-Pesa Test Integration', 'CBC / Montessori / IB / British Support', 'Standard Support']
    },
    {
      id: 'basic',
      name: "Basic",
      price: "150",
      desc: "Perfect for growing primary schools needing essential digital tools.",
      features: ['Everything in Free', 'Academic Analytics', 'M-Pesa Reconciliation', 'SMS Integration', 'Email Support']
    },
    {
      id: 'premium',
      name: "Premium",
      price: "300",
      featured: true,
      desc: "Comprehensive control for top-tier institutions looking to automate.",
      features: ['Everything in Basic', 'Bulk Payroll Engine', 'Advanced Data Analytics', 'Priority 24/7 Support', 'Custom Branding']
    }
  ];

  return (
    <section id="pricing" className="py-[120px] pb-[100px] bg-slate-900 text-white rounded-[60px] mx-6 mb-20 md:mx-3 md:rounded-[32px] md:py-[70px] min-[480px]:mx-2 min-[480px]:rounded-[24px] min-[480px]:py-[60px]">
      <div className="max-w-[1200px] mx-auto px-6 min-[480px]:px-4">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-white/10 text-white rounded-full font-extrabold text-[13px] mb-6 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Transparent Pricing</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.02em] text-white leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">Choose a <span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">school-ready plan</span></h2>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8 items-stretch mt-[60px] md:grid-cols-1 md:gap-5">
          {displayPlans.map((p, idx) => (
            <PriceCard 
              key={p.id || p.name}
              name={p.name} 
              price={p.price} 
              desc={p.desc || (p.billingModel === 'per-learner' ? 'Billed per student.' : 'Flat rate per school.')}
              billingModel={p.billingModel}
              cycle={p.cycle}
              featured={p.featured || idx === 1}
              features={p.features || ['Full Access', 'Dashboard', 'Support']}
            />
          ))}
        </div>
        <p className="text-center mt-10 opacity-60 text-[14px] text-white">* Prices in KES per student per term. Annual discounts available.</p>
      </div>
    </section>
  );
}
