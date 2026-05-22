'use client';
import { useState } from 'react';

const FAQ_DATA = [
  {
    q: "How does the Curriculum-Aware Grading Engine support diverse standards simultaneously?",
    a: "EduVantage employs a modular backend architecture. Administrators define the curriculum standard at the class or school grade level (e.g. Kenya CBC for Grades 1-6, Cambridge IGCSE for Year 9-11, and Technical Units of Competency for TVET classes). The system then dynamically loads the correct calculation formulas, grade boundary tables, score input panels, and printed report card templates. This ensures a multi-curriculum school runs seamlessly within a single portal workspace."
  },
  {
    q: "What are the technical requirements for Safaricom M-Pesa fee integration?",
    a: "EduVantage features a plug-and-play Daraja API bridge. Schools input their Safaricom Paybill/Buygoods number, Consumer Key, Consumer Secret, and Passkey in the finance configuration panel. The application instantly activates STK pushes on parent dashboards. Safaricom sends secure encrypted callbacks to our /api/billing/callback hook, which uses transactional database locks to credit the correct student ledger without manual oversight."
  },
  {
    q: "How does the anti-fraud registry validation work?",
    a: "To block transcript tampering and fake receipts, every report card and payment receipt generated displays an encrypted cryptographic QR code. When scanned by school authorities or banks, this QR code routes to our secure /api/verify registry check. It queries the central isolated SQLite database in real-time, verifying the authenticity of grades or payment amounts directly against official registry records."
  },
  {
    q: "How are granular payroll deductions managed for staff?",
    a: "Unlike basic systems that group deductions into a single bulk value, EduVantage includes an advanced multi-line payroll engine. It computes statutory obligations (Kenya PAYE, NSSF, SHIF/NHIF) according to dynamic tax brackets, and allows admins to append multiple distinct custom line items (e.g., Harambee Sacco Savings, Emergency Salary Advance, Asset Purchase Loan). These are explicitly listed on individual staff payslips to maintain granular transparency."
  }
];

export default function FAQSection() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <section className="py-[120px] bg-[#FAFAFB] border-t border-slate-200 md:py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-[50px]">
          <div className="inline-block px-[18px] py-[8px] bg-indigo-600/10 text-indigo-600 rounded-full font-extrabold text-[13px] mb-6 border border-indigo-600/20 md:text-[12px] md:px-[14px] md:py-[6px] min-[480px]:text-[11px] min-[480px]:px-[12px] min-[480px]:py-[5px]">Common Clarifications</div>
          <h2 className="font-sora text-[52px] font-black tracking-[-0.03em] text-slate-900 leading-[1.1] mb-6 md:text-[32px] min-[480px]:text-[26px]">Frequently Asked Questions</h2>
          <p className="text-[20px] text-slate-500 max-w-[700px] mx-auto leading-[1.6] md:text-[17px] min-[480px]:text-[15px]">Learn more about our features, capabilities, and how the platform works for your school.</p>
        </div>

        <div className="max-w-[800px] mx-auto flex flex-col gap-3.5">
          {FAQ_DATA.map((faq, i) => (
            <div 
              key={i} 
              role="button"
              tabIndex={0}
              aria-expanded={expandedFaq === i}
              className={`bg-white border rounded-[18px] p-6 px-7 cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.01)] min-[480px]:p-[18px_20px] outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${expandedFaq === i ? 'border-indigo-600 shadow-[0_10px_25px_rgba(79,70,229,0.05)]' : 'border-slate-200 hover:border-indigo-600 hover:shadow-[0_10px_25px_rgba(79,70,229,0.05)]'}`} 
              onClick={() => toggleFaq(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFaq(i);
                }
              }}
            >
              <div className="flex justify-between items-center gap-5">
                <h4 className="font-sora text-[17px] font-extrabold text-slate-900 m-0 leading-[1.4] min-[480px]:text-[15px]">{faq.q}</h4>
                <span className={`text-[14px] font-bold transition-transform duration-300 ${expandedFaq === i ? 'rotate-0 text-indigo-600' : 'rotate-45 text-slate-500'}`}>✕</span>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${expandedFaq === i ? 'max-h-[800px] opacity-100 mt-4 pt-4 border-t border-slate-100' : 'max-h-0 opacity-0 m-0 p-0 border-transparent'}`}>
                <p className="text-[14.5px] text-slate-500 leading-[1.6] m-0 font-medium">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
