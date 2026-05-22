import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="pt-[100px] bg-[#F8FAFC] border-t border-black/5 md:pt-[70px]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-[1.5fr_1fr] gap-[100px] mb-[80px] md:grid-cols-1 md:gap-[60px] min-[480px]:gap-[40px]">
        <div>
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shrink-0 border-2 border-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6),0_0_24px_rgba(255,255,255,0.3)] relative min-[480px]:w-9 min-[480px]:h-9 min-[480px]:border min-[480px]:rounded-[10px]">
              <Image src="/eduvantage-logo.png" alt="EduVantage Logo" width={48} height={48} className="rounded-full object-cover w-full h-full block min-[480px]:w-5 min-[480px]:h-5" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-[-0.02em] font-sora min-[480px]:text-xl">EduVantage</span>
          </Link>
          <p className="text-slate-500 my-6 text-[16px] max-w-[320px] leading-[1.6]">
            A practical school management platform for admissions, academics, finance, communication and parent access.
          </p>
          <div className="flex gap-6 font-bold text-slate-900 text-[18px]">
            <span className="cursor-pointer hover:text-indigo-600 transition-colors duration-200">𝕏</span> 
            <span className="cursor-pointer hover:text-indigo-600 transition-colors duration-200">LinkedIn</span> 
            <span className="cursor-pointer hover:text-indigo-600 transition-colors duration-200">Facebook</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-10 min-[480px]:grid-cols-1 min-[480px]:gap-7">
          <div>
            <h4 className="text-[18px] font-extrabold text-slate-900 mb-6">Product Workspaces</h4>
            <a href="/demo" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">All Demos</a>
            <a href="/demo/teacher" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">👩‍🏫 Teacher Portal</a>
            <a href="/demo/parent" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">👨‍👩‍👧 Parent Portal</a>
            <a href="/demo/staff" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">🏢 Finance & Admin</a>
            <a href="#pricing" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">Pricing Plans</a>
          </div>
          <div>
            <h4 className="text-[18px] font-extrabold text-slate-900 mb-6">Company & Legal</h4>
            <a href="#" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">About Us</a>
            <a href="#" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">Support</a>
            <a href="/privacy" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">Privacy Policy</a>
            <a href="/terms" className="block no-underline text-slate-500 font-semibold text-[15px] mb-3.5 transition-all duration-200 hover:text-indigo-600 hover:translate-x-1">Terms of Service</a>
          </div>
        </div>
      </div>
      
      <div className="py-10 border-t border-black/5 text-center text-slate-500 font-semibold text-[14px]">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="m-0 min-[480px]:text-[12px]">&copy; {new Date().getFullYear()} EduVantage Platform. Built with ❤️ for African Education. &nbsp;·&nbsp; <a href="/privacy" className="text-inherit underline font-bold">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms" className="text-inherit underline font-bold">Terms of Service</a></p>
        </div>
      </div>

      {/* Floating WhatsApp FAB */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <a
          href="https://wa.me/254718782531?text=Hi%20EduVantage%2C%20I%27d%20like%20to%20learn%20more%20about%20the%20platform."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with EduVantage on WhatsApp"
          title="Chat on WhatsApp"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.45)] text-white no-underline relative transition-all duration-200 shrink-0 hover:scale-110 hover:shadow-[0_6px_28px_rgba(37,211,102,0.65)] group"
        >
          <span className="absolute inset-0 rounded-full border-2 border-[#25D366] animate-[wa-pulse_2s_ease-out_infinite] pointer-events-none"></span>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="absolute right-[68px] top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[13px] font-semibold py-1.5 px-3 rounded-lg whitespace-nowrap pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Chat on WhatsApp
          </span>
        </a>
      </div>
    </footer>
  );
}
