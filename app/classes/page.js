'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurriculum } from '@/lib/curriculum';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';

export default function ClassesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [learners, setLearners] = useState([]);
  const [staff, setStaff] = useState([]);
  const [classTeachers, setClassTeachers] = useState({});
  const { profile: schoolProfile } = useProfile();
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners', 'paav6_staff', 'paav_class_teachers'])
      ]);
      if (!u) { router.push('/'); return; }
      setUser(u);
      setLearners(db.paav6_learners || []);
      setStaff(db.paav6_staff || []);
      setClassTeachers(db.paav_class_teachers || {});
      setLoading(false);
    }
    load();
  }, [router]);

  async function updateTeacher(grade, stream, staffId) {
    const updated = { ...classTeachers, [`${grade}|${stream}`]: staffId };
    setClassTeachers(updated);
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ type: 'set', key: 'paav_class_teachers', value: updated }]
      })
    });
  }

  if (loading) return <div className="page on"><div className="skeleton" style={{ height: 200, borderRadius: 12 }} /></div>;

  const curr = getCurriculum(schoolProfile?.curriculum || 'CBC');
  const groups = (curr.CATEGORIES || []).filter(cat => {
    if (!schoolProfile?.levels) return true;
    return schoolProfile.levels[cat.levelKey] !== false;
  });

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>School Classes</h2>
          <p>Select a grade to view streams and manage class teachers.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {groups.map(group => (
          <div key={group.title}>
            <h3 style={{ 
              fontSize: 14, 
              textTransform: 'uppercase', 
              letterSpacing: 1, 
              color: group.color, 
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: group.color }} />
              {group.title}
            </h3>
            <div className="sg sg4">
              {group.grades.map(grade => {
                const gradeLearners = learners.filter(l => l.grade === grade);
                const count = gradeLearners.length;
                const streams = [...new Set(gradeLearners.map(l => l.stream || 'Default'))].sort();
                const isExpanded = selectedGrade === grade;

                return (
                  <div key={grade} className={`panel stat-card ${isExpanded ? 'expanded' : ''}`} 
                    style={{ 
                      height: 'auto', 
                      borderLeft: `4px solid ${group.color}`, 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setSelectedGrade(isExpanded ? null : grade)}
                  >
                    <div className="sc-inner" style={{ marginBottom: isExpanded ? 16 : 0 }}>
                      <div className="sc-icon" style={{ background: `${group.color}15`, color: group.color }}>🏫</div>
                      <div style={{ flex: 1 }}>
                        <div className="sc-n" style={{ fontSize: 18, display: 'flex', justifyContent: 'space-between' }}>
                          {grade.replace('GRADE ', 'Gr ')}
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                        <div className="sc-l">{count} Learners · {streams.length} Streams</div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="stream-list" onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                        {streams.map(s => {
                          const sCount = gradeLearners.filter(l => (l.stream || 'Default') === s).length;
                          const tId = classTeachers[`${grade}|${s}`];
                          return (
                            <div key={s} style={{ 
                              background: '#f8fafc', 
                              padding: 10, 
                              borderRadius: 8, 
                              marginBottom: 8,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, color: group.color }}>Stream {s}</div>
                                <div style={{ fontSize: 11, background: '#fff', padding: '2px 8px', borderRadius: 10, border: '1px solid #eee' }}>
                                  {sCount} Learners
                                </div>
                              </div>
                              
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: 10, marginBottom: 2 }}>Class Teacher</label>
                                <select 
                                  value={tId || ''} 
                                  onChange={e => updateTeacher(grade, s, e.target.value)}
                                  style={{ fontSize: 11, padding: '4px 8px' }}
                                >
                                  <option value="">— Unassigned —</option>
                                  {staff.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                </select>
                              </div>

                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ width: '100%', marginTop: 4 }}
                                onClick={() => router.push(`/classes/${grade}?stream=${s}`)}
                              >
                                View Stream
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
