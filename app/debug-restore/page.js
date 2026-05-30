
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DebugRestore() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function fetchDiag() {
    try {
      const res = await fetch('/api/temp-diag');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    }
  }

  async function runRestore() {
    setBusy(true);
    try {
      const res = await fetch('/api/temp-restore');
      const json = await res.json();
      alert(JSON.stringify(json, null, 2));
      fetchDiag();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetchDiag();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>🛠️ Recovery Debugger</h1>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {data && (
        <pre style={{ background: '#f5f5f5', padding: 20 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <button 
        onClick={runRestore} 
        disabled={busy}
        style={{ padding: '10px 20px', background: 'blue', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
      >
        {busy ? 'Running...' : '🚀 Run Restoration'}
      </button>
      <div style={{ marginTop: 20 }}>
        <Link href="/">← Back to Home</Link>
      </div>
    </div>
  );
}
