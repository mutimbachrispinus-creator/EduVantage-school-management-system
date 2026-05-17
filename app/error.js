'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FDF2F2', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>⚠️</div>
      <h2 style={{ color: '#8B1A1A', marginBottom: 10 }}>Something went wrong!</h2>
      <p style={{ color: '#64748B', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
        An unexpected error occurred. Our technical team has been notified.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={() => reset()}
          style={{ padding: '12px 24px', background: '#8B1A1A', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Try Again
        </button>
        <a 
          href="/dashboard"
          style={{ padding: '12px 24px', background: 'transparent', color: '#8B1A1A', border: '2px solid #8B1A1A', borderRadius: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
