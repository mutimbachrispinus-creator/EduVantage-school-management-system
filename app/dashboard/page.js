'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCachedUser, getCachedDBMulti, prefetchKeys } from '@/lib/client-cache';
import { ALL_NAV } from '@/lib/navigation';
import { PRE, LOWER, UPPER, JSS, SENIOR, getAnnualFee } from '@/lib/school-config';
import { useProfile } from '@/app/PortalShell';
import { getCurriculum } from '@/lib/curriculum';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: '80vh' }} />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [themePrimary, setThemePrimary] = useState('#1E293B');

  const { profile: school } = useProfile() || {};
  const curr = getCurriculum(school?.curriculum || 'CBC');
  const ALL_GRADES = curr.ALL_GRADES || [];
  const GRADE_GROUPS = curr.CATEGORIES || [];

  const [announcement, setAnnouncement] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); // Ensure loading is true when starting
    try {
      // 1. Get user first to determine tenant context
      const u = await getCachedUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);
      
      const tid = u.tenant_id || u.tenantId;
      const isSuper = tid === 'platform-master' && u.role === 'super-admin';

      // 2. Fetch CORE data in parallel
      const [db, glob, statRes] = await Promise.all([
        getCachedDBMulti(['paav_theme', 'paav_school_profile']),
        isSuper 
          ? fetch('/api/saas/global-config').then(r => r.json()).catch(() => ({}))
          : Promise.resolve({}),
        fetch('/api/stats/dashboard').then(r => r.json()).catch(() => ({ stats: {} }))
      ]);

      if (db.paav_theme) setThemePrimary(db.paav_theme.primary || '#1E293B');
      if (glob.announcement?.active) setAnnouncement(glob.announcement);

      const s = statRes.stats || {};
      setStats(s);
      
      // Warm up other common keys
      prefetchKeys(['paav_hero_img', 'paav6_fin_config']);

      // 3. SECONDARY FETCH (Asynchronous/Non-blocking to avoid Worker limits)
      fetch('/api/stats/unread').then(r => r.json()).then(d => { if (d.ok) setUnread(d.count); }).catch(() => {});
      fetch('/api/stats/red-flags').then(r => r.json()).then(d => { if (d.ok) setStats(prev => ({ ...prev, redFlags: d.redFlags })); }).catch(() => {});

    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function notifyParents() {
    if (!stats.redFlags?.length) return;
    if (!confirm(`Send SMS alerts to parents of ${stats.redFlags.length} flagged students?`)) return;
    
    setBusy(true);
    try {
      const alerts = stats.redFlags.map(rf => ({ phone: rf.phone, name: rf.name, count: rf.absent_count }));
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bulk_absenteeism_alert', alerts })
      });
      const data = await res.json();
      if (data.ok) alert(`✅ SMS alerts sent to ${data.totalSent} parents!`);
      else alert('❌ Failed to send alerts: ' + data.error);
    } catch (e) {
      alert('❌ SMS Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: '80vh' }} />;
  if (!user) return null;

  const isSuper = (user.tenant_id === 'platform-master' || user.tenantId === 'platform-master') && user.role === 'super-admin';
  const totalPaid = stats.totalPaid || 0;
  const totalExp  = stats.totalExpected || 0;
  const collectionPct = stats.collectionPct || 0;

  const fmtK = (v) => v >= 1000 ? (v/1000).toFixed(1)+'k' : v;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>{isSuper ? 'EduVantage Platform Oversight' : 'Here is your institutional overview for today.'}</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Refresh Data</button>
        </div>
      </div>

      {/* ── Global Network Announcement ── */}
      {announcement && (
        <div className="panel" style={{ 
          marginBottom: 18, 
          background: announcement.priority === 'critical' ? '#FEE2E2' : announcement.priority === 'high' ? '#FEF9C3' : '#EFF6FF',
          border: `2px solid ${announcement.priority === 'critical' ? '#EF4444' : announcement.priority === 'high' ? '#FDE047' : '#3B82F6'}`,
          borderRadius: 15,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', background: announcement.priority === 'critical' ? '#EF4444' : announcement.priority === 'high' ? '#FDE047' : '#3B82F6' }} />
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ fontSize: 24 }}>{announcement.priority === 'critical' ? '🚨' : announcement.priority === 'high' ? '⚠️' : '📢'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Platform Announcement</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{announcement.message}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setAnnouncement(null)}>✕</button>
          </div>
        </div>
      )}

      {/* ── Attendance Red-Flags ── */}
      {stats.redFlags?.length > 0 && (
        <div className="panel" style={{ 
          marginBottom: 18, 
          background: '#FFF1F2', 
          border: '2px solid #FB7185',
          borderRadius: 15 
        }}>
          <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #E11D48, #9F1239)', color: '#fff', border: 'none' }}>
            <h3 style={{ color: '#fff' }}>⚠️ High Absenteeism Red-Flags</h3>
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10 }}>Critical Risk</span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: 12, color: '#881337', marginBottom: 12, fontWeight: 700 }}>The following students have missed 3 or more days recently. Urgent follow-up recommended.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {stats.redFlags.map(rf => (
                <div key={rf.adm} style={{ background: '#fff', padding: '10px 14px', borderRadius: 12, border: '1px solid #FDA4AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{rf.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>ADM: {rf.adm}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#E11D48' }}>{rf.absent_count}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#FB7185', textTransform: 'uppercase' }}>Absences</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Link href="/attendance" className="btn btn-sm btn-ghost" style={{ color: '#E11D48', fontWeight: 800 }}>View Full Report →</Link>
               <button className="btn btn-sm btn-danger" onClick={notifyParents} disabled={busy} style={{ background: '#E11D48' }}>
                 {busy ? '⏳ Notifying...' : '📱 Notify All Parents via SMS'}
               </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Super Admin Oversight Info ── */}
      {isSuper && (
        <div className="panel" style={{ marginBottom: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 15 }}>
          <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>👑 You are in Platform Oversight Mode. Access the Command Center for global metrics.</div>
             <Link href="/super-admin" className="btn btn-primary btn-sm">Enter Command Center</Link>
          </div>
        </div>
      )}

      {!isSuper && (
        <>
          <div className="panel" style={{ marginBottom: 22 }}>
            <div className="panel-hdr" style={{ background: `linear-gradient(135deg, ${themePrimary}, #0F172A)`, border: 'none' }}>
              <h3 style={{ color: '#fff' }}>🚀 Module Hub — All Platform Features</h3>
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, color: '#fff' }}>{ALL_NAV.filter(n => n.roles.includes(user.role)).length} Active Modules</span>
            </div>
            <div className="panel-body hub-grid">
              {ALL_NAV.filter(n => n.roles.includes(user.role)).map((t, idx) => (
                <Link 
                  key={t.key} 
                  href={t.key === 'classes' ? '/classes' : `/${t.key}`} 
                  className="hub-btn"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="hub-icon">{t.icon}</div>
                  <div className="hub-label">{t.label}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="sg sg4">
            <StatCard 
              icon="🎓" 
              bg="#EFF6FF" 
              value={stats.totalLearners || 0} 
              label="Learners" 
              onClick={() => router.push('/learners')} 
            />
            {user.role === 'admin' && (
              <>
                <StatCard icon="💰" bg="#ECFDF5" value={fmtK(totalPaid)} label="Collected" sub={`${collectionPct}% Rate`} subBg="#ECFDF5" subColor="#059669" onClick={() => router.push('/fees')} />
                <StatCard icon="✅" bg="#F5F3FF" value={stats.totalLearners || 0} label="Enrolled" sub="Platform Sync Active" subBg="#FEF3C7" subColor="#D97706" onClick={() => router.push('/learners')} />
              </>
            )}
            <StatCard icon="💬" bg="#EFF6FF" value={unread} label="Messages" onClick={() => router.push('/messages')} />
          </div>

          <div className="sg sg2">
            {user.role === 'admin' && (
              <div className="panel">
                <div className="panel-hdr"><h3>📚 Enrolment</h3></div>
                <div className="panel-body">
                  {ALL_GRADES.map(grade => {
                    const count = stats.enrolmentByGrade?.[grade] || 0;
                    const pct   = Math.min(100, count * 8);
                    return (
                      <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6, fontSize: 11.5 }}>
                        <div style={{ width: 78, color: 'var(--muted)', flexShrink: 0, fontSize: 10 }}>{grade}</div>
                        <div style={{ flex: 1, background: '#EEF2FF', borderRadius: 4, height: 17, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(pct, 3)}%`, height: '100%', background: '#2563EB', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 7px' }}>
                            <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {user.role === 'admin' && (
              <div className="panel">
                <div className="panel-hdr"><h3>💰 Fee Collection</h3></div>
                <div className="panel-body">
                  {GRADE_GROUPS.map(({ label, color, grades }) => {
                    const groupPaid = grades.reduce((sum, g) => sum + (stats.enrolmentByGrade?.[g] || 0) * (getAnnualFee(g) * (collectionPct/100)), 0);
                    const groupExp  = grades.reduce((sum, g) => sum + (stats.enrolmentByGrade?.[g] || 0) * getAnnualFee(g), 0);
                    const groupPct  = groupExp ? Math.round((groupPaid / groupExp) * 100) : 0;
                    return (
                      <div key={label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <span style={{ color: 'var(--muted)' }}>{fmtK(groupPaid)} / {fmtK(groupExp)}</span>
                        </div>
                        <div style={{ height: 9, background: '#EEF2FF', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ width: `${groupPct}%`, height: '100%', background: color, borderRadius: 5 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .hub-grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); 
          gap: 12px;
          background: #F1F5F9;
          padding: 16px;
        }
        .hub-btn { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center;
          gap: 10px; 
          padding: 24px 10px; 
          background: #fff; 
          border-radius: 20px; 
          text-decoration: none; 
          color: var(--navy); 
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          border: 1px solid #E2E8F0; 
          text-align: center; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          opacity: 0;
          transform: translateY(10px);
          animation: hubFadeIn 0.5s ease-out forwards;
        }
        @keyframes hubFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
        .hub-btn:hover { 
          background: #fff; 
          border-color: #2563EB; 
          transform: translateY(-6px) scale(1.02); 
          box-shadow: 0 20px 25px -5px rgba(37,99,235,0.15), 0 10px 10px -5px rgba(37,99,235,0.08); 
        }
        .hub-icon { 
          font-size: 34px; 
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); 
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
        }
        .hub-btn:hover .hub-icon { 
          transform: translateY(-4px) scale(1.15); 
        }
        .hub-label { 
          font-size: 11px; 
          font-weight: 800; 
          color: #475569; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          line-height: 1.2;
        }
        .hub-btn:hover .hub-label {
          color: #2563EB;
        }
      `}</style>
    </div>
  );
}

function SuperAdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.push('/super-admin'); }, [router]);
  return null;
}

function StatCard({ icon, bg, value, label, sub, subBg, subColor, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="sc-inner">
        <div className="sc-icon" style={{ background: bg }}>{icon}</div>
        <div>
          <div className="sc-n">{value}</div>
          <div className="sc-l">{label}</div>
          {sub && <div className="sc-sub" style={{ background: subBg, color: subColor }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}
