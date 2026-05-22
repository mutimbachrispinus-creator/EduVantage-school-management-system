import { TRUST_POINTS } from '@/lib/constants/landing';

export default function SecurityBlueprint() {
  return (
    <section className="py-[120px] bg-white md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-14 items-center md:grid-cols-1 md:gap-7">
        <div>
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Operational Integrity</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">Built for absolute reliability, security, and scalability.</h2>
          <p className="text-[20px] text-slate-500 leading-[1.6] mb-[30px] md:text-[17px] min-[480px]:text-[15px]">
            EduVantage uses industry-standard security practices and modern infrastructure to keep your data completely safe and private.
          </p>
          <div className="mt-[30px] flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <strong className="text-[16px] text-slate-900 font-extrabold">🔐 Cryptographic Anti-Fraud QR Verification</strong>
              <span className="text-[14.5px] text-slate-500 leading-[1.5]">Every report card and fees receipt generated prints with a cryptographically secure, unique QR code. Scanning verifies transaction details or grades directly to stop forgery.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <strong className="text-[16px] text-slate-900 font-extrabold">🚀 Complete Data Privacy</strong>
              <span className="text-[14.5px] text-slate-500 leading-[1.5]">Data safety is our priority. Your school's information is completely private and isolated, matching strict global data protection laws.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <strong className="text-[16px] text-slate-900 font-extrabold">⚡ Lightning Fast Performance</strong>
              <span className="text-[14.5px] text-slate-500 leading-[1.5]">Designed to load instantly anywhere in the world. Built-in offline capabilities ensure teachers can work seamlessly even during network lags.</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {TRUST_POINTS.map(point => (
            <div key={point.label} className="p-6 bg-slate-50 border border-slate-200 rounded-[18px] shadow-[0_10px_30px_rgba(15,23,42,0.02)]">
              <strong className="block text-slate-900 text-[15px] font-black mb-2 uppercase tracking-[0.04em]">{point.label}</strong>
              <span className="block text-slate-500 text-[15px] leading-[1.6] font-semibold">{point.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
