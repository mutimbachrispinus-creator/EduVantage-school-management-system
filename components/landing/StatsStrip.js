'use client';
import { useState, useEffect } from 'react';

export default function StatsStrip() {
  const [stats, setStats] = useState({ schools: 0, learners: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/saas/config?tenant=platform-master', { cache: 'no-store' });
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } catch (e) {}
    }
    loadStats();
  }, []);

  return (
    <section className="py-[50px] border-y border-black/5 bg-white">
      <div className="max-w-[1200px] mx-auto px-6 flex justify-around items-center md:flex-col md:gap-[30px]">
        <div className="text-center">
          <strong className="block text-[38px] font-black text-slate-900 mb-1.5 tracking-[-0.02em] min-[480px]:text-[30px]">{stats.schools > 0 ? `${stats.schools}+` : 'Multi-School'}</strong>
          <span className="text-slate-500 font-bold text-[13px] uppercase tracking-[1px]">Active Institutional Tenants</span>
        </div>
        <div className="w-[1px] h-[60px] bg-black/10 md:w-[100px] md:h-[1px]"></div>
        <div className="text-center">
          <strong className="block text-[38px] font-black text-slate-900 mb-1.5 tracking-[-0.02em] min-[480px]:text-[30px]">{stats.learners > 0 ? `${(stats.learners / 1000).toFixed(1)}k+` : 'Direct Bulk'}</strong>
          <span className="text-slate-500 font-bold text-[13px] uppercase tracking-[1px]">Active Student Records</span>
        </div>
        <div className="w-[1px] h-[60px] bg-black/10 md:w-[100px] md:h-[1px]"></div>
        <div className="text-center">
          <strong className="block text-[38px] font-black text-slate-900 mb-1.5 tracking-[-0.02em] min-[480px]:text-[30px]">100%</strong>
          <span className="text-slate-500 font-bold text-[13px] uppercase tracking-[1px]">Secure & Private</span>
        </div>
      </div>
    </section>
  );
}
