import Link from 'next/link';

export default function DemoHighlight() {
  return (
    <section id="demo" className="py-[120px] bg-white md:py-[70px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Live Demonstration Portals</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">See EduVantage<br /><span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">in action.</span></h2>
          <p className="text-[20px] text-slate-500 max-w-[700px] mx-auto leading-[1.6] md:text-[17px] min-[480px]:text-[15px]">Walk through pre-populated simulation portals to experience actual daily workflows by school role.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-7 md:grid-cols-1 md:gap-4">
          <Link href="/demo/teacher" className="no-underline text-inherit group">
            <div className="p-10 rounded-[32px] border-2 border-transparent transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer relative overflow-hidden bg-[linear-gradient(135deg,#EEF2FF,#E0E7FF)] group-hover:-translate-y-2.5 group-hover:bg-[linear-gradient(135deg,#4F46E5,#6366F1)] group-hover:text-white group-hover:shadow-[0_40px_80px_rgba(79,70,229,0.35)] md:p-7 md:rounded-[24px] min-[480px]:p-5 min-[480px]:rounded-[20px]">
              <div className="text-[56px] mb-5 md:text-[40px] min-[480px]:text-[34px]">👩‍🏫</div>
              <h3 className="font-sora text-[26px] font-black mb-3 tracking-[-0.02em] md:text-[20px] min-[480px]:text-[18px]">Teacher Simulation</h3>
              <p className="text-[15px] leading-[1.6] opacity-75 mb-6">Record marks, take digital roll calls, print report sheets, and configure dynamic subject weights.</p>
              <div className="flex flex-wrap gap-2 mb-7">
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Qualitative Marks</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Instant Roll Call</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Print Layouts</span>
              </div>
              <div className="text-[15px] font-extrabold text-indigo-600 transition-colors duration-300 group-hover:text-white">Explore Teacher View →</div>
            </div>
          </Link>

          <Link href="/demo/parent" className="no-underline text-inherit group">
            <div className="p-10 rounded-[32px] border-2 border-transparent transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer relative overflow-hidden bg-[linear-gradient(135deg,#ECFDF5,#D1FAE5)] group-hover:-translate-y-2.5 group-hover:bg-[linear-gradient(135deg,#059669,#10B981)] group-hover:text-white group-hover:shadow-[0_40px_80px_rgba(16,185,129,0.35)] md:p-7 md:rounded-[24px] min-[480px]:p-5 min-[480px]:rounded-[20px]">
              <div className="text-[56px] mb-5 md:text-[40px] min-[480px]:text-[34px]">👨‍👩‍👧</div>
              <h3 className="font-sora text-[26px] font-black mb-3 tracking-[-0.02em] md:text-[20px] min-[480px]:text-[18px]">Parent Portal Simulation</h3>
              <p className="text-[15px] leading-[1.6] opacity-75 mb-6">Inspect term statements, trigger Safaricom M-Pesa clearing, and view QR-verified report cards.</p>
              <div className="flex flex-wrap gap-2 mb-7">
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Clear Fees</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Progress Charts</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">QR Cards</span>
              </div>
              <div className="text-[15px] font-extrabold text-emerald-600 transition-colors duration-300 group-hover:text-white">Explore Parent View →</div>
            </div>
          </Link>

          <Link href="/demo/staff" className="no-underline text-inherit group">
            <div className="p-10 rounded-[32px] border-2 border-transparent transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer relative overflow-hidden bg-[linear-gradient(135deg,#F5F3FF,#EDE9FE)] group-hover:-translate-y-2.5 group-hover:bg-[linear-gradient(135deg,#7C3AED,#8B5CF6)] group-hover:text-white group-hover:shadow-[0_40px_80px_rgba(124,58,237,0.35)] md:p-7 md:rounded-[24px] min-[480px]:p-5 min-[480px]:rounded-[20px]">
              <div className="text-[56px] mb-5 md:text-[40px] min-[480px]:text-[34px]">🏢</div>
              <h3 className="font-sora text-[26px] font-black mb-3 tracking-[-0.02em] md:text-[20px] min-[480px]:text-[18px]">Admin &amp; Finance View</h3>
              <p className="text-[15px] leading-[1.6] opacity-75 mb-6">Inspect collections, reconcile Safaricom callbacks, and disburse statutory staff payroll slips.</p>
              <div className="flex flex-wrap gap-2 mb-7">
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">M-Pesa Webhooks</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Detailed Deductions</span>
                <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white/90 group-hover:border-white/20">Audit Logs</span>
              </div>
              <div className="text-[15px] font-extrabold text-violet-600 transition-colors duration-300 group-hover:text-white">Explore Admin View →</div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <Link href="/demo" className="relative overflow-hidden inline-flex items-center justify-center py-[14px] px-[40px] rounded-[16px] font-bold text-[16px] no-underline transition-all duration-300 ease-out border-none cursor-pointer bg-indigo-600 text-white hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.4)] hover:bg-indigo-700 active:scale-95 group">
            <span className="relative z-10">Launch Demonstration Portal</span>
            <div className="absolute inset-[-2px] rounded-[16px] bg-gradient-to-tr from-indigo-600 to-cyan-500 z-[-1] opacity-50 blur-[8px] transition-opacity duration-300 group-hover:opacity-80 group-hover:blur-[12px]"></div>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.3),transparent)] rotate-45 -translate-x-full pointer-events-none group-hover:translate-x-full transition-transform duration-600 ease-in-out"></div>
          </Link>
        </div>
      </div>
    </section>
  );
}
