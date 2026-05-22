'use client';
import { useState } from 'react';
import { ALL_FEATURES_BLUEPRINT } from '@/lib/constants/landing';

export default function FeatureCatalog() {
  const [featureFilter, setFeatureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatures = ALL_FEATURES_BLUEPRINT.filter(f => {
    const matchesCategory = featureFilter === 'all' || f.category === featureFilter;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="features" className="py-[120px] bg-[#FAFAFB] border-t border-slate-100 md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Comprehensive Feature Index</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">The Complete System<br /><span className="bg-[linear-gradient(135deg,#4F46E5,#06B6D4)] bg-clip-text text-transparent">Feature Catalog</span></h2>
          <p className="text-[20px] text-slate-500 max-w-[700px] mx-auto leading-[1.6] md:text-[17px] min-[480px]:text-[15px]">Filter or search through our deep technical and operational integrations to see exactly how EduVantage runs your school.</p>
        </div>

        {/* Search bar and Filters */}
        <div className="max-w-[900px] mx-auto mb-[50px] flex flex-col gap-5">
          <div className="relative bg-white border-[1.5px] border-slate-200 rounded-[18px] py-[18px] px-6 shadow-[0_10px_25px_rgba(15,23,42,0.03)] flex items-center gap-3.5 md:py-[14px] md:px-[18px]">
            <span className="text-[22px] text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search features (e.g. M-Pesa, CSV, CBC, payroll, logs...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none w-full text-[16px] font-inherit text-slate-900 font-semibold placeholder:text-slate-500 placeholder:opacity-70 md:text-[14px]"
            />
            {searchQuery && (
              <button aria-label="Clear search" className="bg-transparent border-none text-slate-500 cursor-pointer text-[18px] font-bold" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="flex justify-center gap-2.5 flex-wrap min-[480px]:flex-nowrap min-[480px]:overflow-x-auto min-[480px]:justify-start min-[480px]:pb-1 min-[480px]:scrollbar-none">
            <button className={`px-4.5 py-2.5 rounded-xl border border-slate-200 font-bold text-[13.5px] cursor-pointer transition-all duration-250 md:px-3.5 md:py-2 md:text-[12px] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 ${featureFilter === 'all' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`} onClick={() => setFeatureFilter('all')}>All Features</button>
            <button className={`px-4.5 py-2.5 rounded-xl border border-slate-200 font-bold text-[13.5px] cursor-pointer transition-all duration-250 md:px-3.5 md:py-2 md:text-[12px] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 ${featureFilter === 'finance' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`} onClick={() => setFeatureFilter('finance')}>💳 Finance & Payments</button>
            <button className={`px-4.5 py-2.5 rounded-xl border border-slate-200 font-bold text-[13.5px] cursor-pointer transition-all duration-250 md:px-3.5 md:py-2 md:text-[12px] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 ${featureFilter === 'academics' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`} onClick={() => setFeatureFilter('academics')}>📈 Academics & Grading</button>
            <button className={`px-4.5 py-2.5 rounded-xl border border-slate-200 font-bold text-[13.5px] cursor-pointer transition-all duration-250 md:px-3.5 md:py-2 md:text-[12px] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 ${featureFilter === 'comms' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`} onClick={() => setFeatureFilter('comms')}>💬 Communications</button>
            <button className={`px-4.5 py-2.5 rounded-xl border border-slate-200 font-bold text-[13.5px] cursor-pointer transition-all duration-250 md:px-3.5 md:py-2 md:text-[12px] min-[480px]:whitespace-nowrap min-[480px]:shrink-0 ${featureFilter === 'infrastructure' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-500 hover:border-indigo-600 hover:text-indigo-600'}`} onClick={() => setFeatureFilter('infrastructure')}>🛡️ System & Cloud</button>
          </div>
        </div>

        {/* Dynamic Grid */}
        {filteredFeatures.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6 md:grid-cols-1">
            {filteredFeatures.map((feat) => (
              <div key={feat.id} className="bg-white border border-slate-200 rounded-[24px] p-[30px] shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(79,70,229,0.07)] hover:border-indigo-600/15 group">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-[32px] w-[52px] h-[52px] bg-slate-100 rounded-[14px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">{feat.icon}</span>
                  <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 tracking-[0.5px] uppercase">{feat.category}</span>
                </div>
                <h4 className="font-sora text-[19px] font-extrabold text-slate-900 m-0 mb-2.5 leading-[1.3]">{feat.title}</h4>
                <p className="text-[14px] text-slate-500 leading-[1.5] m-0 mb-5">{feat.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-[60px] px-5 bg-white rounded-[32px] border-[1.5px] border-dashed border-slate-200 max-w-[500px] mx-auto">
            <span className="text-[48px] block mb-4">📭</span>
            <h4 className="font-sora text-[20px] text-slate-900 m-0 mb-2">No features match your criteria</h4>
            <p className="text-slate-500 text-[14px] m-0 mb-6">Try clearing your search query or switching category filters.</p>
            <button className="inline-flex items-center justify-center py-2.5 px-5 rounded-[12px] font-bold text-[14px] no-underline transition-all duration-300 ease-out border-2 border-black/10 cursor-pointer bg-white text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900" onClick={() => { setSearchQuery(''); setFeatureFilter('all'); }}>Reset Search & Filters</button>
          </div>
        )}
      </div>
    </section>
  );
}
