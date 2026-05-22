'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PERSONA_DETAILS } from '@/lib/constants/landing';

export default function PortalsWorkspace() {
  const [activePersona, setActivePersona] = useState('admin');

  return (
    <section id="portals" className="py-[120px] bg-white md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Contextual Workspaces</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">Tailored experiences for <br /><span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">every institutional role</span></h2>
          <p className="text-[20px] text-slate-500 max-w-[700px] mx-auto leading-[1.6] md:text-[17px] min-[480px]:text-[15px]">Different dashboards tailored to give administrators, teachers, parents, and students the exact tools they need.</p>
        </div>

        <div className="grid grid-cols-[1fr_1.6fr] gap-12 mt-10 items-stretch md:grid-cols-1 md:gap-8 min-[480px]:gap-6">
          {/* Left selector */}
          <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap min-[480px]:flex-col min-[480px]:gap-2.5">
            {Object.keys(PERSONA_DETAILS).map((key) => (
              <button
                key={key}
                aria-label={`Select ${PERSONA_DETAILS[key].title} workspace`}
                className={`p-6 rounded-[20px] border border-slate-200 bg-slate-50 text-left cursor-pointer transition-all duration-300 flex items-center gap-5 outline-none md:flex-1 md:basis-[200px] md:p-4 md:gap-3 min-[480px]:p-3.5 min-[480px]:gap-3 min-[480px]:rounded-[14px] ${activePersona === key ? 'bg-white shadow-[0_15px_30px_rgba(0,0,0,0.06)]' : 'hover:bg-white hover:translate-x-1.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.02)]'}`}
                onClick={() => setActivePersona(key)}
                style={{ borderColor: activePersona === key ? PERSONA_DETAILS[key].color : undefined }}
              >
                <span className="text-[32px] w-14 h-14 bg-white rounded-[14px] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.04)] md:w-11 md:h-11 md:text-[24px] md:rounded-[10px] min-[480px]:w-[38px] min-[480px]:h-[38px] min-[480px]:text-[20px] min-[480px]:shrink-0">{PERSONA_DETAILS[key].icon}</span>
                <div>
                  <span className="block font-extrabold text-[17px] text-slate-900 md:text-[15px] min-[480px]:text-[14px]">{PERSONA_DETAILS[key].title}</span>
                  <span className="block text-[12px] text-slate-500 mt-0.5 font-semibold min-[480px]:text-[11px]">{PERSONA_DETAILS[key].badge}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right Display */}
          <div className="bg-slate-50 rounded-[32px] p-12 border-l-[8px] flex flex-col justify-between shadow-[inset_0_2px_8px_rgba(0,0,0,0.01)] transition-colors duration-300 md:p-8 md:rounded-[20px] md:border-l-[5px] min-[480px]:p-4 min-[480px]:rounded-[16px]" style={{ borderLeftColor: PERSONA_DETAILS[activePersona].color }}>
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px]" style={{ background: `${PERSONA_DETAILS[activePersona].color}1A`, color: PERSONA_DETAILS[activePersona].color }}>
                  {PERSONA_DETAILS[activePersona].icon}
                </span>
                <h3 className="font-sora text-[26px] font-black text-slate-900 m-0 md:text-[22px] min-[480px]:text-[19px]">{PERSONA_DETAILS[activePersona].title} Workspace</h3>
              </div>
              <p className="text-[17px] text-slate-500 leading-[1.6] mb-7.5 md:text-[15px] md:mb-5">
                {PERSONA_DETAILS[activePersona].desc}
              </p>
              
              <ul className="list-none p-0 flex flex-col gap-3.5 mb-10 md:mb-7">
                {PERSONA_DETAILS[activePersona].bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[15.5px] font-semibold text-slate-900 leading-[1.4] md:text-[14px]">
                    <span className="text-[16px] font-black leading-none mt-0.5" style={{ color: PERSONA_DETAILS[activePersona].color }}>✓</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto">
              <Link href={activePersona === 'admin' ? '/demo/staff' : activePersona === 'teacher' ? '/demo/teacher' : activePersona === 'parent' ? '/demo/parent' : '/login'} className="inline-flex items-center justify-center py-3 px-[26px] rounded-[14px] font-bold text-[15px] no-underline transition-all duration-300 ease-out border-none cursor-pointer text-white hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-lg" style={{ background: PERSONA_DETAILS[activePersona].color, boxShadow: `0 10px 30px ${PERSONA_DETAILS[activePersona].color}40` }}>
                Launch {PERSONA_DETAILS[activePersona].title} Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
