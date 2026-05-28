'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarksRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/grades');
  }, [router]);
  return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Redirecting to Marks Entry…</div>;
}
