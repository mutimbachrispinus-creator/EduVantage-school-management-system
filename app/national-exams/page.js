'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';
import { getCachedUser } from '@/lib/client-cache';

export default function NationalExamsSyncPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { profile: school } = useProfile();
  
  // Curriculum Awareness
  const curr = getCurriculum(school.curriculum, school.levels);
  const { ALL_GRADES, LABELS } = curr;
  
  const [selectedGrade, setSelectedGrade] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || !['admin', 'super-admin'].includes(u.role)) {
      router.push('/');
      return;
    }
    setUser(u);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handlePreview() {
    if (!selectedGrade) {
      setError('Please select an exam grade first.');
      return;
    }
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const res = await fetch('/api/national-exams/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', grade: selectedGrade })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
        setPreviewData(null);
      } else {
        setPreviewData(data);
      }
    } catch (e) {
      setError('Failed to fetch preview.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    if (!confirm(`Are you sure you want to sync ${previewData.candidatesFound} candidates to ${previewData.examBody}?`)) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/national-exams/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', grade: selectedGrade })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
      } else {
        setSuccess(data.message);
        setPreviewData(null);
      }
    } catch (e) {
      setError('Failed to synchronize.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎓 National Exams Sync</h2>
          <p>Synchronize candidates directly with {curr.name} examination bodies</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="panel-hdr">
          <h3>Exam Registration Sync</h3>
        </div>
        <div className="panel-body">
          <div className="note-box" style={{ background: '#F0F9FF', borderLeft: '3px solid #0284C7', marginBottom: 20 }}>
            <strong>Active Curriculum: {curr.name}</strong>
            <p style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>
              This module automatically formats your candidate lists into the exact payload required by your examination body. 
              {curr.name.includes('CBC') && ' Payload is formatted for KNEC (KPSEA/KCSE).'}
              {curr.name.includes('British') || curr.name.includes('Cambridge') ? ' Payload is formatted for CIE Direct.' : ''}
            </p>
          </div>

          {error && <div className="alert alert-err show">{error}</div>}
          {success && <div className="alert alert-ok show">{success}</div>}

          <div style={{ display: 'flex', gap: 15, alignItems: 'flex-end', marginBottom: 30 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Select Exam Candidate {LABELS.grade}</label>
              <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                <option value="">-- Choose {LABELS.grade} --</option>
                {ALL_GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handlePreview} 
              disabled={busy || !selectedGrade}
              style={{ padding: '9px 20px', height: 42 }}
            >
              {busy ? '⏳ Loading...' : '👁️ Preview Format'}
            </button>
          </div>

          {previewData && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--navy)' }}>Target Exam Body: {previewData.examBody}</h4>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Found {previewData.candidatesFound} total candidates</span>
                </div>
                <button className="btn btn-gold btn-sm" onClick={handleSync} disabled={busy}>
                  🚀 Push to {previewData.examBody} API
                </button>
              </div>
              <div style={{ padding: 16 }}>
                <h5 style={{ marginBottom: 10, fontSize: 13 }}>Payload Preview (First 5 records):</h5>
                <pre style={{ 
                  background: '#1E293B', 
                  color: '#E2E8F0', 
                  padding: 15, 
                  borderRadius: 6, 
                  fontSize: 12,
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(previewData.previewPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
