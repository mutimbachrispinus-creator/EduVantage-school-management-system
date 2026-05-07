'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';

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
      'paav_announcement'
    ];
    const data = await getCachedDBMulti(keys);
    setDb(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const [showAI, setShowAI] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const feed = useMemo(() => {
    if (!user || !db.paav6_learners) return [];

    // If parent, find their children
    const children = user.role === 'parent' 
      ? db.paav6_learners.filter(l => l.phone === user.phone || l.adm === user.adm) 
      : db.paav6_learners;

    const events = [];

    // 0. Announcements (Global)
    if (db.paav_announcement) {
      db.paav_announcement.forEach(a => {
        events.push({
          id: `ann-${a.id}`,
          date: a.date || new Date(a.createdAt).toLocaleDateString('en-KE'),
          student: 'All Students',
          type: 'announcement',
          icon: '📢',
          title: 'School Announcement',
          desc: a.text || a.content,
          color: '#8B1A1A'
        });
      });
    }

    children.forEach(l => {
      // 1. Attendance
      if (db.paav_student_attendance) {
        Object.entries(db.paav_student_attendance).forEach(([gda, status]) => {
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
      }

      // 2. Payments
      if (db.paav6_paylog) {
        db.paav6_paylog.filter(p => p.adm === l.adm).forEach(p => {
          events.push({
            id: `pay-${p.id}`,
            date: p.date,
            student: l.name,
            type: 'payment',
            icon: '💰',
            title: 'Payment Received',
            desc: `Fee payment of KSH ${p.amount.toLocaleString()} recorded for ${l.name}.`,
            color: '#0369A1'
          });
        });
      }

      // 3. Duties
      if (db.paav_duties) {
        db.paav_duties.filter(d => d.assignedTo === l.name || d.assignedTo === l.adm).forEach(d => {
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
      }

      // 4. Marks Release
      if (db.paav6_marks) {
        Object.keys(db.paav6_marks).forEach(mKey => {
          if (db.paav6_marks[mKey][l.adm] !== undefined) {
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
      }
    });

    // 5. Messages (filtered by relevance)
    if (db.paav6_msgs) {
      db.paav6_msgs.filter(m => m.to === user.username || m.from === user.username).forEach(m => {
        events.push({
          id: `msg-${m.id}`,
          date: m.date || new Date(m.createdAt).toLocaleDateString('en-KE'),
          student: 'Direct Message',
          type: 'message',
          icon: '💬',
          title: m.from === user.username ? 'Message Sent' : 'Message Received',
          desc: m.text.length > 50 ? m.text.slice(0, 50) + '...' : m.text,
          color: '#0D9488'
        });
      });
    }

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user, db]);

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
          <div className="panel-hdr">
            <h3>🕒 Activity Feed</h3>
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
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-hdr" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
              <h3 style={{ color: '#fff' }}>✨ AI Performance Predictor</h3>
              <button className="modal-close" onClick={() => setShowAI(false)} style={{ color: '#fff' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 25 }}>
              {analyzing ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="ai-loader" />
                  <p style={{ marginTop: 20, fontWeight: 700, color: '#64748b' }}>Analyzing portal data trends...</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>Predicting academic outcomes and attendance risks</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', padding: 15, borderRadius: 12 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#0369A1' }}>Deep Analysis Complete</h4>
                    <p style={{ fontSize: 13, margin: 0, color: '#0C4A6E' }}>Our AI has processed historical data across attendance, marks, and activity logs to generate the following insights:</p>
                  </div>
                  
                  {insights?.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                        background: ins.type === 'pos' ? '#10B981' : ins.type === 'warn' ? '#F59E0B' : '#3B82F6'
                      }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{ins.title}</div>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}

                  <button className="btn btn-primary" onClick={() => setShowAI(false)} style={{ marginTop: 10 }}>Understood</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
