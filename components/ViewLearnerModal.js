import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';

export default function ViewLearnerModal({ learner, onClose }) {
  const router = useRouter();
  const { profile: school } = useProfile() || { profile: {} };
  const curr = getCurriculum(school?.curriculum || 'CBC', school?.levels);
  
  const TERMS = curr.TERMS || [
    { id: 'T1', name: 'Term 1' },
    { id: 'T2', name: 'Term 2' },
    { id: 'T3', name: 'Term 3' }
  ];
  
  const ASSESSMENTS = curr.ASSESSMENT_TYPES || [
    { key: 'op1', label: 'Opener' },
    { key: 'mt1', label: 'Mid-Term' },
    { key: 'et1', label: 'End-Term' }
  ];

  const [term, setTerm] = useState(TERMS[0]?.id || 'T1');
  const [assess, setAssess] = useState(ASSESSMENTS[ASSESSMENTS.length - 1]?.key || 'et1');

  function openProfile() {
    // Save to localStorage so the profile tab state picks it up
    try {
      localStorage.setItem('paav_profile_term', JSON.stringify(term));
      localStorage.setItem('paav_profile_assess', JSON.stringify(assess));
    } catch(e){}
    router.push(`/learners/${encodeURIComponent(learner.adm)}`);
    onClose();
  }

  function openReportCard() {
    router.push(`/report-card?adm=${encodeURIComponent(learner.adm)}&term=${term}&assess=${assess}`);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-content animate-in" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>👁️ View Learner</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{learner.name} ({learner.adm})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
        </div>
        
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Academic Term</label>
            <select 
              value={term} 
              onChange={e => setTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '2px solid #e2e8f0', fontSize: 14, outline: 'none' }}
            >
              {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Assessment / Exam</label>
            <select 
              value={assess} 
              onChange={e => setAssess(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '2px solid #e2e8f0', fontSize: 14, outline: 'none' }}
            >
              {ASSESSMENTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              onClick={openReportCard}
              style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              📋 Generate Report Card
            </button>
            <button 
              onClick={openProfile}
              style={{ width: '100%', padding: '12px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              👤 Open Learner Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
