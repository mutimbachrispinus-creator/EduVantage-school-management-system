export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FDF2F2', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>🔍</div>
      <h2 style={{ color: '#8B1A1A', marginBottom: 10 }}>Page Not Found</h2>
      <p style={{ color: '#64748B', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <a 
        href="/dashboard"
        style={{ padding: '12px 24px', background: '#8B1A1A', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
      >
        Go to Dashboard
      </a>
    </div>
  );
}
