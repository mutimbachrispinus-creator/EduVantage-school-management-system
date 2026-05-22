'use client';
import { useState } from 'react';
import { CURRICULUM_DETAILS } from '@/lib/constants/landing';

export default function CurriculumAdapter() {
  const [activeCurriculum, setActiveCurriculum] = useState('CBC');

  return (
    <section id="curriculum" className="py-[120px] bg-[#FAFAFB] border-t border-black/5 md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Unified Grading Matrix</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">The Curriculum-Aware<br /><span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">Grading Engine</span></h2>
          <p className="text-[20px] text-slate-500 max-w-[700px] mx-auto leading-[1.6] md:text-[17px] min-[480px]:text-[15px]">No more rigid setups. Scale grades, rubrics, and certificates per student or level with a single engine built for global education systems.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center gap-3 mb-10 flex-wrap min-[480px]:flex-nowrap min-[480px]:overflow-x-auto min-[480px]:justify-start min-[480px]:pb-1.5 min-[480px]:scrollbar-none">
          {Object.keys(CURRICULUM_DETAILS).map((key) => (
            <button
              key={key}
              aria-label={`Select ${key} curriculum`}
              className={`flex items-center gap-2 px-6 py-3 rounded-[14px] border border-slate-200 font-bold text-[15px] cursor-pointer transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.02)] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 min-[480px]:px-4 min-[480px]:py-2.5 min-[480px]:text-[13px] ${activeCurriculum === key ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.25)]' : 'bg-white text-slate-900 hover:border-indigo-600 hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(79,70,229,0.08)]'}`}
              onClick={() => setActiveCurriculum(key)}
            >
              {CURRICULUM_DETAILS[key].icon} {key}
            </button>
          ))}
        </div>

        {/* Interactive Card */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-12 shadow-[0_20px_50px_rgba(15,23,42,0.05)] max-w-[900px] mx-auto animate-[fadeIn_0.4s_ease-out_forwards] md:p-6 md:rounded-[20px]">
          <div className="flex flex-col gap-2 mb-6">
            <span className="self-start px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[12px] font-extrabold uppercase tracking-[0.5px]">
              {CURRICULUM_DETAILS[activeCurriculum].badge}
            </span>
            <h3 className="font-sora text-[32px] font-black text-slate-900 m-0 tracking-[-0.02em] md:text-[24px]">
              {CURRICULUM_DETAILS[activeCurriculum].title}
            </h3>
          </div>
          <p className="text-[18px] text-slate-500 leading-[1.6] mb-10 md:text-[15px] md:mb-6">
            {CURRICULUM_DETAILS[activeCurriculum].description}
          </p>
          
          <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-8 md:grid-cols-1 md:gap-4">
            {CURRICULUM_DETAILS[activeCurriculum].specs.map((spec, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <strong className="text-[14px] uppercase tracking-[0.5px] text-slate-500">{spec.label}</strong>
                <span className="text-[16px] font-semibold text-slate-900 leading-[1.5]">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
