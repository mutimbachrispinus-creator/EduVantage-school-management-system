'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-400 ease-out-expo ${scrolled ? 'py-3.5 bg-white/85 backdrop-blur-xl border-b border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.03)]' : 'py-6'}`}>
      <div className="max-w-[1200px] mx-auto px-6 w-full flex justify-between items-center relative z-10">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shrink-0 border-2 border-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6),0_0_24px_rgba(255,255,255,0.3)] animate-pulseGlowLanding relative">
            <Image src="/eduvantage-logo.png" alt="EduVantage Logo" width={48} height={48} className="rounded-full object-cover w-full h-full block" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-[-0.02em] font-sora">EduVantage</span>
        </Link>
        
        <div className="flex items-center gap-10">
          <div className="hidden md:flex gap-6">
            <a href="#curriculum" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Curricula</a>
            <a href="#portals" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Workspaces</a>
            <a href="#features" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Feature Catalog</a>
            <a href="#demo" className="no-underline text-indigo-600 font-extrabold text-[15px] transition-colors duration-200">🎥 Demo</a>
            <a href="#audit" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Readiness</a>
            <a href="#compare" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Compare</a>
            <a href="#pricing" className="no-underline text-slate-500 font-semibold text-[15px] transition-colors duration-200 hover:text-indigo-600">Pricing</a>
          </div>
          <div className="flex gap-3.5">
            <Link href="/login" className="hidden sm:inline-flex items-center justify-center py-3 px-6.5 rounded-2xl font-bold text-[15px] no-underline transition-all duration-300 ease-out border-none cursor-pointer text-slate-900 bg-transparent hover:bg-black/5">Sign In</Link>
            <Link href="/saas/signup" className="relative overflow-hidden inline-flex items-center justify-center py-3 px-6.5 rounded-2xl font-bold text-[15px] no-underline transition-all duration-300 ease-out border-none cursor-pointer bg-indigo-600 text-white hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_40px_rgba(79,70,229,0.4)] hover:bg-indigo-700 active:scale-95 active:translate-y-0 group">
              <span className="relative z-10">Get Started Free</span>
              <div className="absolute inset-[-2px] rounded-[16px] bg-gradient-to-tr from-indigo-600 to-cyan-500 z-[-1] opacity-50 blur-[8px] transition-opacity duration-300 group-hover:opacity-80 group-hover:blur-[12px]"></div>
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.3),transparent)] rotate-45 -translate-x-full pointer-events-none group-hover:translate-x-full transition-transform duration-600 ease-in-out"></div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
