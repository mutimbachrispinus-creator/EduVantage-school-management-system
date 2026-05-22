export default function Comparison() {
  return (
    <section id="compare" className="py-[120px] bg-white md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-[#F8FAFC] rounded-[40px] p-[70px] shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] border border-black/5 md:p-[40px_20px] min-[480px]:p-[28px_16px] min-[480px]:rounded-[24px]">
           <div className="text-center mb-[60px] min-[480px]:mb-[32px]">
              <h3 className="font-sora text-[40px] font-black text-slate-900 mb-4 tracking-[-0.02em] min-[480px]:text-[26px]">EduVantage vs. The Alternatives</h3>
              <p className="text-slate-500 text-[18px] min-[480px]:text-[15px]">A grounded comparison against spreadsheet-heavy and disconnected school systems.</p>
           </div>
           <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap min-[480px]:block min-[480px]:touch-pan-x">
              <table className="w-full border-collapse border-spacing-0">
                <thead>
                  <tr>
                    <th className="p-[24px_30px] text-left border-b-2 border-slate-200 text-[15px] uppercase tracking-[1.5px] text-slate-500 font-extrabold md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Feature & Capability</th>
                    <th className="p-[24px_30px] text-left border-b-2 border-slate-200 text-[15px] uppercase tracking-[1.5px] text-red-500 font-extrabold md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Fragmented Legacy Systems</th>
                    <th className="p-[24px_30px] text-left border-b-2 border-slate-200 text-[15px] uppercase tracking-[1.5px] text-emerald-500 font-extrabold md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">EduVantage Platform</th>
                  </tr>
                </thead>
                <tbody>
                   <tr>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Payment Collection</strong></td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Manual receipt books or separate payment portals</td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">M-Pesa and Pesapal flows inside the school ledger</td>
                   </tr>
                   <tr>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Revenue Visibility</strong></td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">End-of-month manual reconciliation</td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">Collection, balance and arrears dashboards</td>
                   </tr>
                   <tr>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Settlements</strong></td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Tracked outside the school system</td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">Settlement queues visible to platform admins</td>
                   </tr>
                   <tr>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Registry Control</strong></td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Documents can drift from learner records</td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">Receipts and reports generated from stored records</td>
                   </tr>
                   <tr>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Grading Intelligence</strong></td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Static, hardcoded rules</td>
                     <td className="p-[28px_30px] border-b border-slate-200 text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">Curriculum-Aware (CBC/IB/Cambridge/Montessori/TVET)</td>
                   </tr>
                   <tr>
                     <td className="p-[28px_30px] text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]"><strong>Parent Experience</strong></td>
                     <td className="p-[28px_30px] text-[16px] font-semibold text-slate-900 md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px]">Delayed SMS only</td>
                     <td className="p-[28px_30px] text-[16px] md:p-[16px_12px] md:text-[14px] min-[480px]:p-[14px_12px] min-[480px]:text-[13px] text-indigo-600 font-black bg-indigo-600/5 rounded-lg">Live Portal + M-Pesa STK Push + Auto-Receipts</td>
                   </tr>
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </section>
  );
}
