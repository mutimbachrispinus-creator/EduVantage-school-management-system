export const runtime = 'edge';

export default function Loading() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader" style={{ width: 48, height: 48, border: '5px solid #E2E8F0', borderTop: '5px solid #8B1A1A', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: '#64748B', marginTop: 16, fontWeight: 700, fontFamily: 'var(--font-inter, sans-serif)' }}>
        Loading EduVantage...
      </p>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
}
