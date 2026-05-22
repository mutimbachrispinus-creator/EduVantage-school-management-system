import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="pt-[200px] pb-[100px] relative text-center overflow-hidden bg-[#FAFAFB] md:pt-[110px] md:pb-[60px] sm:pt-[100px] sm:pb-[50px]">
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[140%] z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 30%, rgba(79, 70, 229, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 40%)' }}></div>
      
      <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full box-border animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 animate-[pulseGlow_3s_infinite] sm:text-[11px] sm:px-[12px] sm:py-[5px]">
          Complete School Management Platform
        </div>
        <h1 className="font-sora text-[78px] font-black leading-[1.05] tracking-[-0.03em] mb-7 text-slate-900 md:text-[64px] sm:text-[38px] min-[480px]:text-[30px] min-[480px]:leading-[1.1]">
          Run the school.<br/>See the <span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">whole picture.</span>
        </h1>
        <p className="text-[21px] text-slate-500 leading-[1.6] max-w-[800px] mx-auto mb-12 md:text-[16px] md:px-2 sm:text-[15px]">
          EduVantage simplifies admissions, fee collections, academics, payroll, and messaging. Manage your entire school efficiently with an intuitive, all-in-one system.
        </p>
        
        <div className="flex gap-5 justify-center mb-20 sm:flex-col sm:items-center sm:gap-3 sm:mb-12">
          <Link href="/saas/signup" className="relative overflow-hidden inline-flex items-center justify-center py-[18px] px-[46px] rounded-[18px] font-bold text-[17px] no-underline transition-all duration-300 ease-out border-none cursor-pointer bg-indigo-600 text-white hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.4)] hover:bg-indigo-700 active:scale-95 group sm:w-full sm:max-w-[340px] sm:px-[28px] sm:py-[14px] sm:text-[15px]">
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-[-2px] rounded-[16px] bg-gradient-to-tr from-indigo-600 to-cyan-500 z-[-1] opacity-50 blur-[8px] transition-opacity duration-300 group-hover:opacity-80 group-hover:blur-[12px]"></div>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.3),transparent)] rotate-45 -translate-x-full pointer-events-none group-hover:translate-x-full transition-transform duration-600 ease-in-out"></div>
          </Link>
          <Link href="/demo" className="inline-flex items-center justify-center py-[18px] px-[46px] rounded-[18px] font-bold text-[17px] no-underline transition-all duration-300 ease-out border-2 border-black/10 cursor-pointer bg-white/70 backdrop-blur-md text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:-translate-y-1 active:scale-95 sm:w-full sm:max-w-[340px] sm:px-[28px] sm:py-[14px] sm:text-[15px]">
            Explore Live Demo
          </Link>
        </div>

        {/* Floating UI Grid */}
        <div className="hidden md:flex gap-5 justify-center mb-[60px]">
           <div className="bg-white px-6 py-4 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center gap-4 border border-black/5 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:border-indigo-600/20 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ animationDelay: '0.2s' }}>
              <div className="text-[28px]">👩‍🏫</div>
              <div className="text-left">
                 <strong className="block text-[15px] text-slate-900">Teacher Workspace</strong>
                 <span className="text-[12px] text-slate-500 font-semibold">Markbooks · Attendance</span>
              </div>
           </div>
           <div className="bg-white px-6 py-4 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center gap-4 border border-black/5 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:border-indigo-600/20 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ animationDelay: '0.4s' }}>
              <div className="text-[28px]">👨‍👩‍👧</div>
              <div className="text-left">
                 <strong className="block text-[15px] text-slate-900">Parent Portal</strong>
                 <span className="text-[12px] text-slate-500 font-semibold">Live Ledger · M-Pesa STK</span>
              </div>
           </div>
           <div className="bg-white px-6 py-4 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center gap-4 border border-black/5 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:border-indigo-600/20 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]" style={{ animationDelay: '0.6s' }}>
              <div className="text-[28px]">🏢</div>
              <div className="text-left">
                 <strong className="block text-[15px] text-slate-900">Finance Suite</strong>
                 <span className="text-[12px] text-slate-500 font-semibold">Deductions Payroll · Collections</span>
              </div>
           </div>
        </div>

        <div className="mt-10 relative z-10 [perspective:1200px]">
          <div className="relative bg-white p-3 rounded-[32px] shadow-[0_60px_120px_-20px_rgba(15,23,42,0.2)] border border-black/5 inline-block rotate-x-[8deg] translate-y-0 transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] hover:rotate-x-0 hover:-translate-y-2 hover:shadow-[0_80px_150px_-20px_rgba(15,23,42,0.3)] group cursor-default">
            <Image src="/eduvantage-hero-new.png" alt="Dashboard Mockup" width={1000} height={600} className="w-[1000px] max-w-full rounded-[20px] block border border-black/5 object-cover" priority />
          </div>
        </div>
      </div>
    </section>
  );
}
