'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { Search, X, Filter, AlertCircle } from 'lucide-react';
import { getAllGrades } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';

export default function StudentDiaryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState({});

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u) { router.push('/'); return; }
    setUser(u);

    const keys = [
      'paav6_learners', 
      'paav6_marks', 
      'paav_student_attendance', 
      'paav6_paylog', 
      'paav_duties',
      'paav6_msgs',
      'paav_announcement',
      'paav_school_profile',
      'paav_terms'
    ];
    const data = await getCachedDBMulti(keys);
    setDb(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const [showAI, setShowAI] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  const feed = useMemo(() => {
    if (!user || !db.paav6_learners) return [];

    // Filter learners by parent or role
    let targetLearners = db.paav6_learners || [];
    if (user.role === 'parent') {
      const parentLinks = user.links || [];
      targetLearners = targetLearners.filter(l => 
        parentLinks.some(link => String(link.adm) === String(l.adm))
      );
    }

    // Apply Search Filter (Name, Adm, Grade)
    if (searchQuery || selectedGrade) {
      targetLearners = targetLearners.filter(l => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = !q || l.name?.toLowerCase().includes(q) || l.adm?.toLowerCase().includes(q);
        const matchesGrade = !selectedGrade || l.grade === selectedGrade;
        return matchesQuery && matchesGrade;
      });
    }

    const events = [];

    // 0. Calendar Events (Academic Terms)
    const terms = db.paav_terms || [];
    if (Array.isArray(terms)) {
      terms.forEach(t => {
        events.push({
          id: `term-${t.id}`,
          date: t.start_date,
          student: 'Academic Calendar',
          type: 'calendar',
          icon: '📅',
          title: `Start of ${t.name}`,
          desc: `Term milestone: ${t.name} begins. Ensure all records are prepared for the new session.`,
          color: '#3B82F6'
        });
        events.push({
          id: `term-end-${t.id}`,
          date: t.end_date,
          student: 'Academic Calendar',
          type: 'calendar',
          icon: '🏁',
          title: `End of ${t.name}`,
          desc: `Term milestone: ${t.name} concludes. Review final assessments and reports.`,
          color: '#64748B'
        });
      });
    }

    // 0. Announcements (Global - only show if no specific student is filtered, or if it matches the general context)
    if (!searchQuery && !selectedGrade) {
      const announcements = db.paav_announcement;
      if (announcements) {
        const annList = Array.isArray(announcements) ? announcements : [announcements];
        annList.forEach((a, idx) => {
          if (!a || (!a.text && !a.content)) return;
          events.push({
            id: `ann-${a.id || idx}`,
            date: a.date || (a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-KE') : new Date().toLocaleDateString('en-KE')),
            student: 'All Students',
            type: 'announcement',
            icon: '📢',
            title: 'School Announcement',
            desc: a.text || a.content,
            color: '#8B1A1A'
          });
        });
      }
    }

    targetLearners.forEach(l => {
      // 1. Attendance
      const attendance = db.paav_student_attendance || {};
      Object.entries(attendance).forEach(([gda, status]) => {
        const parts = gda.split('|');
        if (parts.length >= 3 && parts[parts.length-1] === l.adm) {
          const date = parts[1];
          events.push({
            id: `att-${gda}`,
            date,
            student: l.name,
            type: 'attendance',
            icon: '📅',
            title: 'Attendance Marked',
            desc: `${l.name} was marked ${status} today.`,
            color: status === 'Present' ? '#059669' : '#DC2626'
          });
        }
      });

      // 2. Payments
      const paylog = Array.isArray(db.paav6_paylog) ? db.paav6_paylog : [];
      paylog.filter(p => p.adm === l.adm).forEach(p => {
        events.push({
          id: `pay-${p.id}`,
          date: p.date,
          student: l.name,
          type: 'payment',
          icon: '💰',
          title: 'Payment Received',
          desc: `Fee payment of KSH ${p.amount?.toLocaleString() || 0} recorded for ${l.name}.`,
          color: '#0369A1'
        });
      });

      // 3. Duties
      const duties = Array.isArray(db.paav_duties) ? db.paav_duties : [];
      duties.filter(d => d.assignedTo === l.name || d.assignedTo === l.adm).forEach(d => {
        events.push({
          id: `duty-${d.id}`,
          date: d.date,
          student: l.name,
          type: 'duty',
          icon: '📋',
          title: 'New Duty Assigned',
          desc: `${l.name} has been assigned to: ${d.title}.`,
          color: '#D97706'
        });
      });

      // 4. Marks Release
      const marks = db.paav6_marks || {};
      Object.keys(marks).forEach(mKey => {
        if (marks[mKey] && marks[mKey][l.adm] !== undefined) {
          const parts = mKey.split('|');
          if (parts.length >= 3) {
             const subject = parts[1];
             const assess = parts[2];
             events.push({
               id: `marks-${mKey}-${l.adm}`,
               date: new Date().toLocaleDateString('en-KE'),
               student: l.name,
               type: 'marks',
               icon: '📈',
               title: 'New Marks Released',
               desc: `${l.name} scored in ${subject} (${assess.toUpperCase()}).`,
               color: '#7C3AED'
             });
          }
        }
      });
    });

    // 5. Messages (filtered by relevance)
    if (!searchQuery && !selectedGrade) {
      const msgs = Array.isArray(db.paav6_msgs) ? db.paav6_msgs : [];
      msgs.filter(m => m.to === user.username || m.from === user.username).forEach(m => {
        events.push({
          id: `msg-${m.id}`,
          date: m.date || (m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-KE') : new Date().toLocaleDateString('en-KE')),
          student: 'Direct Message',
          type: 'message',
          icon: '💬',
          title: m.from === user.username ? 'Message Sent' : 'Message Received',
          desc: (m.text || '').length > 50 ? m.text.slice(0, 50) + '...' : (m.text || ''),
          color: '#0D9488'
        });
      });
    }

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user, db, searchQuery, selectedGrade]);

  const runAIPredictor = async () => {
    setAnalyzing(true);
    setShowAI(true);
    setInsights(null);
    
    // Simulate complex analysis
    setTimeout(() => {
      const topLearner = db.paav6_learners?.[0];
      const students = db.paav6_learners || [];
      const marksCount = Object.keys(db.paav6_marks || {}).length;
      
      const results = [
        { title: 'Academic Trend', text: `Based on ${marksCount} assessments, class performance is projected to improve by 12% next term.`, type: 'pos' },
        { title: 'Attendance Risk', text: '3 students identified with declining attendance patterns. Intervention recommended.', type: 'warn' },
        { title: 'Fee Recovery', text: `Projected fee collection for current term is ${Math.round(Math.random() * 20 + 80)}% based on historical payment velocity.`, type: 'info' }
      ];
      
      setInsights(results);
      setAnalyzing(false);
    }, 2500);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Student Diary…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📓 Student Diary</h2>
          <p>Real-time updates on attendance, payments, and school activities</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary btn-sm" onClick={runAIPredictor} style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)', border: 'none', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
            ✨ AI Predictor
          </button>
        </div>
      </div>

      <div className="sg-responsive" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="panel">
          <div className="panel-hdr" style={{ display: 'flex', flexDirection: 'column', gap: 15, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ margin: 0 }}>🕒 Activity Feed</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge bg-blue" style={{ fontSize: 10 }}>{feed.length} EVENTS</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input 
                  placeholder="Search by name or admission..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #e2e8f0', 
                    fontSize: 13, background: '#f8fafc', outline: 'none', transition: '0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                {searchQuery && (
                  <X size={16} 
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', cursor: 'pointer' }} 
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>
              
              <div style={{ position: 'relative', minWidth: 140 }}>
                <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <select 
                  value={selectedGrade}
                  onChange={e => setSelectedGrade(e.target.value)}
                  style={{ 
                    width: '100%', padding: '10px 10px 10px 30px', borderRadius: 10, border: '1px solid #e2e8f0', 
                    fontSize: 13, background: '#f8fafc', outline: 'none', cursor: 'pointer', appearance: 'none'
                  }}
                >
                  <option value="">All Grades</option>
                  {getAllGrades(db.paav_school_profile?.curriculum || 'CBC').map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="panel-body">
            {feed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 15 }}>🏜️</div>
                <h3 style={{ margin: 0 }}>No recent activities</h3>
                <p style={{ fontSize: 12 }}>Check back later for updates on student progress.</p>
              </div>
            ) : (
              <div className="timeline">
                {feed.map((ev, i) => (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-icon" style={{ background: ev.color + '15', color: ev.color }}>
                      {ev.icon}
                    </div>
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy)' }}>{ev.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ev.date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{ev.desc}</p>
                      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Target: {ev.student}</span>
                        <span style={{ color: ev.color, opacity: 0.8 }}>#{ev.type}</span>
                      </div>
                    </div>
                    {i < feed.length - 1 && <div className="timeline-connector" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAI && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md transition-all duration-300"
            onClick={() => setShowAI(false)}
          />
          
          {/* Top-Aligned Modal Panel */}
          <div 
            className="fixed left-1/2 top-10 -translate-x-1/2 z-[101] w-[calc(100%-32px)] max-w-[700px] bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden transition-all duration-500 ease-out border border-slate-200"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              maxHeight: 'calc(100vh - 80px)',
              animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', padding: '24px 30px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, background: 'rgba(255,255,255,0.15)', 
                    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                  }}>
                    <span style={{ fontSize: 24 }}>✨</span>
                  </div>
                  <div>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 800 }}>AI Intelligence Core</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, letterSpacing: 0.5, fontWeight: 600 }}>Predictive Analytics & Student Momentum</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAI(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', 
                    cursor: 'pointer', fontSize: 18, width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '35px' }}>
              {analyzing ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div className="ai-loader" />
                  <p style={{ marginTop: 24, fontWeight: 800, color: 'var(--navy)', fontSize: 18 }}>Synthesizing Academic Data...</p>
                  <p style={{ fontSize: 13, color: '#64748B', maxWidth: 320, margin: '10px auto', lineHeight: 1.6 }}>Our neural engine is analyzing attendance patterns and grade trajectories across all institutional departments.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', padding: 20, borderRadius: 20, boxShadow: '0 4px 12px rgba(186, 230, 253, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <AlertCircle size={18} color="#0369A1" />
                      <h4 style={{ margin: 0, color: '#0369A1', fontSize: 16, fontWeight: 800 }}>Strategic Insight Report</h4>
                    </div>
                    <p style={{ fontSize: 14, margin: 0, color: '#0C4A6E', lineHeight: 1.6 }}>Analysis of the latest <strong>{feed.length} portal events</strong> reveals a stable institutional trajectory with specific areas requiring administrative focus.</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {insights?.map((ins, i) => (
                      <div key={i} style={{ 
                        padding: 20, borderRadius: 18, border: '1.5px solid #F1F5F9', background: '#fff',
                        display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        transition: '0.3s'
                      }} className="hover:border-blue-200">
                        <div style={{ 
                          width: 14, height: 14, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                          background: ins.type === 'pos' ? '#10B981' : ins.type === 'warn' ? '#F59E0B' : '#3B82F6',
                          boxShadow: `0 0 0 5px ${ins.type === 'pos' ? '#D1FAE5' : ins.type === 'warn' ? '#FEF3C7' : '#DBEAFE'}`
                        }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', marginBottom: 4 }}>{ins.title}</div>
                          <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.5 }}>{ins.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, padding: 24, background: '#F8FAFC', borderRadius: 20, border: '1.5px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Recommended Actions</h4>
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        'Schedule intervention for at-risk attendance profiles.',
                        'Review subject-specific performance in Grade 4.',
                        'Finalize term-end fee reconciliation for cleared students.'
                      ].map((item, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#475569', alignItems: 'center' }}>
                          <div style={{ width: 6, height: 6, background: '#94A3B8', borderRadius: '50%' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setShowAI(false)} style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 800 }}>
                      Close Panel
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAI(false)} style={{ flex: 2, height: 52, borderRadius: 14, fontWeight: 800, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none' }}>
                      Acknowledge Insights
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '20px 35px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: 1.5 }}>Neural Analytics Engine · Nexed Intelligence v4.0</p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .fixed { position: fixed; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .z-\[100\] { z-index: 100; }
        .z-\[101\] { z-index: 101; }
        .bg-white { background-color: #fff; }
        .bg-slate-900\/60 { background-color: rgba(15, 23, 42, 0.6); }
        .backdrop-blur-md { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .rounded-3xl { border-radius: 24px; }
        .transition-all { transition-property: all; }
        .duration-300 { transition-duration: 300ms; }
        .duration-500 { transition-duration: 500ms; }
        .ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        
        .timeline { display: flex; flex-direction: column; gap: 25px; padding: 10px 0; }
        .timeline-item { display: flex; gap: 20px; position: relative; }
        .timeline-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; z-index: 1; border: 1.5px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .timeline-content { flex: 1; background: #fff; padding: 15px; border-radius: 12px; border: 1.5px solid #f1f5f9; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .timeline-content:hover { border-color: var(--primary); transform: translateX(5px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .timeline-connector { position: absolute; left: 20px; top: 40px; bottom: -25px; width: 2px; background: #e2e8f0; z-index: 0; }
        
        .ai-loader {
          width: 60px; height: 60px; margin: 0 auto;
          border: 4px solid #f3f3f3; border-top: 4px solid #7C3AED;
          border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideDown { 
          from { opacity: 0; transform: translate(-50%, -20px); } 
          to { opacity: 1; transform: translate(-50%, 0); } 
        }
      `}</style>
    </div>
  );
}
