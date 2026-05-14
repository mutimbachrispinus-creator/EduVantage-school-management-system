'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { ALL_GRADES } from '@/lib/cbe';

export default function WelfarePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState([]);
  const [discipline, setDiscipline] = useState([]);
  const [health, setHealth] = useState([]);
  const [tab, setTab] = useState('discipline'); 
  const [selGrade, setSelGrade] = useState('GRADE 7');
  const [selAdm, setSelAdm] = useState('');

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u || (!['admin', 'super-admin'].includes(u.role) && u.role !== 'teacher')) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_learners', 'paav7_discipline', 'paav7_health']);
    setLearners(db.paav6_learners || []);
    setDiscipline(db.paav7_discipline || []);
    setHealth(db.paav7_health || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filteredLearners = useMemo(() => learners.filter(l => l.grade === selGrade), [learners, selGrade]);
  const learner = useMemo(() => learners.find(l => l.adm === selAdm), [learners, selAdm]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Welfare records…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🛡 Student Welfare & Discipline</h2>
          <p>Behavioral records and health clinic visits</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${tab === 'discipline' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('discipline')}>⚖ Discipline</button>
          <button className={`btn ${tab === 'health' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('health')}>🏥 Health</button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
            <label>Select Grade</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelAdm(''); }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Select Student</label>
            <select value={selAdm} onChange={e => setSelAdm(e.target.value)}>
              <option value="">— Choose Student —</option>
              {filteredLearners.map(l => <option key={l.adm} value={l.adm}>{l.name} ({l.adm})</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        {!learner ? (
          <div style={{ textAlign: 'center', padding: 100, color: 'var(--muted)' }}>Select a student above to manage their welfare records</div>
        ) : (
          <>
            <div className="panel-hdr">
              <h3>{tab === 'discipline' ? '⚖ Behavioral Record' : '🏥 Health Record'} — {learner.name}</h3>
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>+ New Entry</button>
            </div>
            <div className="panel-body">
              {tab === 'discipline' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {discipline.filter(d => d.adm === selAdm).map((d, i) => (
                    <div key={i} className="audit-row" style={{ borderLeft: `4px solid ${d.type === 'merit' ? '#16A34A' : '#DC2626'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>{d.incident}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(d.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{d.action}</div>
                      <div style={{ fontSize: 10, color: 'var(--light)', marginTop: 4 }}>By: {d.recordedBy}</div>
                    </div>
                  ))}
                  {discipline.filter(d => d.adm === selAdm).length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No disciplinary incidents recorded.</div>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {health.filter(h => h.adm === selAdm).map((h, i) => (
                    <div key={i} className="audit-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>{h.complaint}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(h.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Treatment: {h.treatment}</div>
                      <div style={{ fontSize: 10, color: 'var(--light)', marginTop: 4 }}>By: {h.recordedBy}</div>
                    </div>
                  ))}
                  {health.filter(h => h.adm === selAdm).length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No health clinic visits recorded.</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
