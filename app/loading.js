export default function Loading() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="logo-container" style={{ 
        width: 140, 
        height: 140, 
        background: '#FFFFFF', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1)' 
      }}>
        <img src="/eduvantage-logo.png" alt="EduVantage Logo" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </div>
      <p style={{ color: '#64748B', marginTop: 32, fontWeight: 700, fontFamily: 'var(--font-inter, sans-serif)', animation: 'pulse-text 2s infinite cubic-bezier(0.4, 0, 0.2, 1)', letterSpacing: '0.05em' }}>
        Loading EduVantage...
      </p>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.15); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 25px rgba(79, 70, 229, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        @keyframes pulse-text {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
