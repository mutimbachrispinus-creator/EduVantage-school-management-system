export default function Loading() {
  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 9999, background: '#0F172A', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* The sweeping red band (Safaricom style) */}
      <div className="sweep-band"></div>
      
      {/* The logo container */}
      <div className="logo-reveal-container">
        <div className="logo-circle">
          <img src="/eduvantage-logo.png" alt="EduVantage Logo" className="logo-img" />
        </div>
      </div>
      
      <p className="loading-text">
        EduVantage
        <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
      </p>

      <style dangerouslySetInnerHTML={{ __html: `
        /* The sweeping red band */
        .sweep-band {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(135deg, transparent 40%, #B91C1C 40%, #DC2626 45%, #991B1B 55%, transparent 60%);
          transform: translateY(100%) rotate(25deg);
          animation: sweep 1.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
          z-index: 1;
        }

        /* The container for the logo reveal */
        .logo-reveal-container {
          position: relative;
          z-index: 2;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          /* Golden glowing rim */
          box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
          opacity: 0;
          transform: scale(0.5);
          animation: pop-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, pulse-glow 2s infinite ease-in-out;
          animation-delay: 0.8s, 1.6s; /* Appear right when the band sweeps over */
        }

        /* The actual logo circle */
        .logo-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Simulating parts joining: clip-path reveal with rotation */
        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          clip-path: circle(0% at 50% 50%);
          animation: join-parts 1.2s cubic-bezier(0.86, 0, 0.07, 1) forwards;
          animation-delay: 1.0s;
        }

        /* Text below */
        .loading-text {
          color: #FFFFFF;
          margin-top: 32px;
          font-weight: 800;
          font-family: var(--font-inter, sans-serif);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-size: 16px;
          z-index: 2;
          opacity: 0;
          transform: translateY(20px);
          animation: fade-up 0.8s ease-out forwards;
          animation-delay: 1.4s;
        }

        .loading-dots span {
          opacity: 0;
          animation: dot-blink 1.4s infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes sweep {
          0% { transform: translateY(100%) rotate(25deg); }
          100% { transform: translateY(-100%) rotate(25deg); }
        }

        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes join-parts {
          0% { clip-path: circle(0% at 50% 50%); transform: rotate(-90deg) scale(0.8); filter: blur(4px); }
          50% { clip-path: circle(100% at 50% 50%); transform: rotate(0deg) scale(1.1); filter: blur(0px) brightness(1.5); }
          100% { clip-path: circle(100% at 50% 50%); transform: rotate(0deg) scale(1); filter: brightness(1); }
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.6), 0 0 20px rgba(212, 175, 55, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(212, 175, 55, 0), 0 0 40px rgba(212, 175, 55, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0), 0 0 20px rgba(212, 175, 55, 0.4); }
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes dot-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      ` }} />
    </div>
  );
}
