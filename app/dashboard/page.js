'use client';
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
  const LABELS = curr.LABELS || { grade: 'Grade', grades: 'Grades', subject: 'Subject', subjects: 'Subjects' };

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
      const [db, statRes] = await Promise.all([
        getCachedDBMulti(['paav_theme', 'paav_school_profile', 'paav_announcement']),
        fetch('/api/stats/dashboard').then(r => r.json()).catch(() => ({ stats: {} }))
      ]);

      if (db.paav_theme) setThemePrimary(db.paav_theme.primary || '#1E293B');
      if (db.paav_announcement?.active && db.paav_announcement?.text) {
        setAnnouncement({ message: db.paav_announcement.text, priority: 'normal', active: true });
      }

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
    <div className="page on home-page">
      <div className="page-hdr home-hero">
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>{isSuper ? 'EduVantage Platform Oversight' : `Here is your institutional overview for today · Curriculum: ${school?.curriculum || 'CBC'}`}</p>
        </div>
        <div className="page-hdr-acts">
           <button className="btn btn-ghost btn-sm home-refresh" onClick={load}>
             <span className="refresh-icon">🔄</span> Refresh Data
           </button>
        </div>
      </div>

      {/* ── Global Network Announcement ── */}
      {announcement && (
        <div
          className="panel home-alert announcement-panel"
          data-priority={announcement.priority || 'normal'}
        >
          <div className="panel-body alert-body">
            <div className="alert-icon">{announcement.priority === 'critical' ? '🚨' : announcement.priority === 'high' ? '⚠️' : '📢'}</div>
            <div className="alert-copy">
              <div className="alert-kicker">Platform Announcement</div>
              <div className="alert-message">{announcement.message}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setAnnouncement(null)}>✕</button>
          </div>
        </div>
      )}

      {/* ── Attendance Red-Flags ── */}
      {stats.redFlags?.length > 0 && (
        <div className="panel home-alert red-flag-panel">
          <div className="panel-hdr red-flag-hdr">
            <h3>⚠️ High Absenteeism Red-Flags</h3>
            <span className="risk-pill">Critical Risk</span>
          </div>
          <div className="panel-body">
            <p className="red-flag-copy">The following students have missed 3 or more days recently. Urgent follow-up recommended.</p>
            <div className="red-flag-grid">
              {stats.redFlags.map((rf, idx) => (
                <div
                  key={rf.adm}
                  className="red-flag-card"
                  style={{ animationDelay: `${idx * 55}ms` }}
                >
                  <div>
                    <div className="red-flag-name">{rf.name}</div>
                    <div className="red-flag-adm">ADM: {rf.adm}</div>
                  </div>
                  <div className="red-flag-count">
                    <div>{rf.absent_count}</div>
                    <span>Absences</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="red-flag-actions">
               <Link href="/attendance" className="btn btn-sm btn-ghost red-link">View Full Report →</Link>
               <button className="btn btn-sm btn-danger red-action" onClick={notifyParents} disabled={busy}>
                 {busy ? '⏳ Notifying...' : '📱 Notify All Parents via SMS'}
               </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Super Admin Oversight Info ── */}
      {isSuper && (
        <div className="panel oversight-panel">
          <div className="panel-body oversight-body">
             <div className="oversight-copy">👑 You are in Platform Oversight Mode. Access the Command Center for global metrics.</div>
             <Link href="/super-admin" className="btn btn-primary btn-sm">Enter Command Center</Link>
          </div>
        </div>
      )}

      {!isSuper && (
        <>
          <div className="panel module-panel">
            <div className="panel-hdr module-hdr" style={{ '--home-accent': themePrimary }}>
              <h3>🚀 Module Hub — All Platform Features</h3>
              <span>{(() => {
                const activeRoles = [user.role];
                const isImpersonating = (user.role === 'super-admin' && typeof window !== 'undefined' && localStorage.getItem('paav_impersonate_id'));
                if (isImpersonating) activeRoles.push('admin');
                return ALL_NAV.filter(n => n.roles.some(r => activeRoles.includes(r))).length;
              })()} Active Modules</span>
            </div>
            <div className="panel-body hub-grid">
              {(() => {
                const activeRoles = [user.role];
                const isImpersonating = (user.role === 'super-admin' && typeof window !== 'undefined' && localStorage.getItem('paav_impersonate_id'));
                if (isImpersonating) activeRoles.push('admin');

                return ALL_NAV.filter(n => n.roles.some(r => activeRoles.includes(r))).map((t, idx) => (
                  <Link
                    key={t.key}
                    href={t.key === 'classes' ? '/classes' : `/${t.key}`}
                    className="hub-btn"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="hub-icon">{t.icon}</div>
                    <div className="hub-label">{t.label}</div>
                  </Link>
                ));
              })()}
            </div>
          </div>

          <div className="sg sg4 home-stat-grid">
            <StatCard
              icon="🎓"
              bg="#EFF6FF"
              value={stats.totalLearners || 0}
              label={LABELS.grades}
              onClick={() => router.push('/learners')}
            />
            {user.role === 'admin' && (
              <>
                <StatCard icon="💰" bg="#ECFDF5" value={fmtK(totalPaid)} label="Collected" sub={`${collectionPct}% Rate`} subBg="#ECFDF5" subColor="#059669" onClick={() => router.push('/fees')} />
                <StatCard icon="✅" bg="#F5F3FF" value={stats.totalLearners || 0} label="Enrolled" sub={`${LABELS.grades} Active`} subBg="#FEF3C7" subColor="#D97706" onClick={() => router.push('/learners')} />
              </>
            )}
            <StatCard icon="💬" bg="#EFF6FF" value={unread} label="Messages" onClick={() => router.push('/messages')} />
          </div>

          <div className="sg sg2 home-insight-grid">
            {user.role === 'admin' && (
              <div className="panel insight-panel">
                <div className="panel-hdr"><h3>📚 {LABELS.grades} Enrolment</h3></div>
                <div className="panel-body">
                  {ALL_GRADES.map(grade => {
                    const count = stats.enrolmentByGrade?.[grade] || 0;
                    const pct   = Math.min(100, count * 8);
                    return (
                      <div key={grade} className="metric-row">
                        <div className="metric-label">{grade}</div>
                        <div className="metric-track">
                          <div className="metric-fill enrolment-fill" style={{ width: `${Math.max(pct, 3)}%` }}>
                            <span>{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {user.role === 'admin' && (
              <div className="panel insight-panel">
                <div className="panel-hdr"><h3>💰 Fee Collection</h3></div>
                <div className="panel-body">
                  {GRADE_GROUPS.map(({ label, color, grades }) => {
                    const groupPaid = grades.reduce((sum, g) => sum + (stats.enrolmentByGrade?.[g] || 0) * (getAnnualFee(g) * (collectionPct/100)), 0);
                    const groupExp  = grades.reduce((sum, g) => sum + (stats.enrolmentByGrade?.[g] || 0) * getAnnualFee(g), 0);
                    const groupPct  = groupExp ? Math.round((groupPaid / groupExp) * 100) : 0;
                    return (
                      <div key={label} className="fee-row">
                        <div className="fee-meta">
                          <span>{label}</span>
                          <span>{fmtK(groupPaid)} / {fmtK(groupExp)}</span>
                        </div>
                        <div className="fee-track">
                          <div className="fee-fill" style={{ width: `${groupPct}%`, background: color }} />
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
        .home-page {
          --home-shadow: 0 18px 45px rgba(5, 15, 28, 0.08);
        }
        .home-hero {
          position: relative;
          padding: 4px 2px 8px;
          animation: homeRise .42s ease-out both;
        }
        .home-hero h2 {
          font-size: clamp(20px, 2vw, 28px);
          letter-spacing: 0;
        }
        .home-refresh {
          background: #fff;
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }
        .home-refresh:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15,23,42,.12);
        }
        .home-refresh:hover .refresh-icon {
          animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .home-alert,
        .module-panel,
        .oversight-panel {
          margin-bottom: 22px;
          border-radius: 16px;
          box-shadow: var(--home-shadow);
          animation: homeRise .46s ease-out both;
        }
        .announcement-panel {
          background: #EFF6FF;
          border: 1.5px solid #BFDBFE;
        }
        .announcement-panel[data-priority='high'] {
          background: #FEFCE8;
          border-color: #FDE68A;
        }
        .announcement-panel[data-priority='critical'] {
          background: #FFF1F2;
          border-color: #FDA4AF;
        }
        .announcement-panel::before,
        .red-flag-panel::before,
        .module-panel::before,
        .oversight-panel::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 6px;
          background: #3B82F6;
        }
        .announcement-panel[data-priority='high']::before { background: #F59E0B; }
        .announcement-panel[data-priority='critical']::before { background: #E11D48; }
        .alert-body {
          display: flex;
          align-items: center;
          gap: 15px;
          padding-left: 24px;
        }
        .alert-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(255,255,255,.72);
          font-size: 22px;
          box-shadow: 0 10px 25px rgba(15,23,42,.08);
        }
        .alert-copy { flex: 1; min-width: 0; }
        .alert-kicker {
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .8px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .alert-message {
          color: var(--navy);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.35;
        }
        .red-flag-panel {
          background: #FFF7F8;
          border: 1.5px solid #FDA4AF;
        }
        .red-flag-panel::before { background: #E11D48; }
        .red-flag-hdr {
          background: linear-gradient(135deg, #E11D48, #9F1239);
          border: none;
          color: #fff;
        }
        .red-flag-hdr h3 { color: #fff; }
        .risk-pill {
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(255,255,255,.18);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .5px;
          text-transform: uppercase;
        }
        .red-flag-copy {
          color: #881337;
          font-size: 12px;
          font-weight: 750;
          margin-bottom: 14px;
        }
        .red-flag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 11px;
        }
        .red-flag-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border: 1px solid #FDA4AF;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 10px 24px rgba(225,29,72,.06);
          opacity: 0;
          transform: translateY(10px);
          animation: homeRise .42s ease-out forwards;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .red-flag-card:hover {
          border-color: #E11D48;
          box-shadow: 0 16px 30px rgba(225,29,72,.13);
          transform: translateY(-3px);
        }
        .red-flag-name {
          color: #1E293B;
          font-size: 13px;
          font-weight: 850;
        }
        .red-flag-adm {
          color: #64748B;
          font-size: 11px;
        }
        .red-flag-count {
          color: #E11D48;
          text-align: right;
          flex-shrink: 0;
        }
        .red-flag-count div {
          font-size: 21px;
          font-weight: 900;
          line-height: 1;
        }
        .red-flag-count span {
          color: #FB7185;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .5px;
          text-transform: uppercase;
        }
        .red-flag-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .red-link {
          color: #E11D48 !important;
          font-weight: 850;
        }
        .red-action {
          background: linear-gradient(135deg, #E11D48, #BE123C) !important;
          box-shadow: 0 10px 22px rgba(225,29,72,.18);
        }
        .oversight-panel {
          background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
          border: 1.5px solid #E2E8F0;
        }
        .oversight-panel::before { background: var(--gold); }
        .oversight-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .oversight-copy {
          color: #475569;
          font-size: 13px;
          font-weight: 800;
        }
        .module-panel {
          border-color: rgba(15,23,42,.08);
          background: #fff;
        }
        .module-panel::before { display: none; }
        .module-hdr {
          overflow: hidden;
          position: relative;
          border: none;
          background:
            linear-gradient(135deg, var(--home-accent), #0F172A),
            radial-gradient(circle at 85% 0%, rgba(255,255,255,.28), transparent 34%);
          color: #fff;
        }
        .module-hdr::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.16) 42%, transparent 72%);
          transform: translateX(-120%);
          animation: sheen 4.8s ease-in-out infinite;
          pointer-events: none;
        }
        .module-hdr h3 {
          color: #fff;
          position: relative;
          z-index: 1;
        }
        .module-hdr span {
          position: relative;
          z-index: 1;
          padding: 4px 11px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 999px;
          background: rgba(255,255,255,.14);
          color: #fff;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .4px;
          text-transform: uppercase;
        }
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
          gap: 14px;
          background:
            radial-gradient(circle at 12% 18%, rgba(14,165,233,.08), transparent 28%),
            radial-gradient(circle at 90% 0%, rgba(20,184,166,.10), transparent 30%),
            linear-gradient(180deg, #F8FAFC 0%, #EEF6FF 100%);
          padding: 18px;
        }
        .hub-btn {
          --hub-accent: #2563EB;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 128px;
          padding: 22px 12px;
          background:
            linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(248,250,252,.96) 100%);
          border-radius: 16px;
          text-decoration: none;
          color: var(--navy);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease, background .28s ease, color .28s ease;
          border: 1px solid rgba(148,163,184,.26);
          text-align: center;
          box-shadow: 0 12px 28px rgba(15,23,42,.06);
          opacity: 0;
          transform: translateY(14px) scale(.98);
          animation: hubFadeIn .56s cubic-bezier(.2,.8,.2,1) forwards;
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .hub-btn:nth-child(5n + 1) { --hub-accent: #2563EB; }
        .hub-btn:nth-child(5n + 2) { --hub-accent: #0F766E; }
        .hub-btn:nth-child(5n + 3) { --hub-accent: #D97706; }
        .hub-btn:nth-child(5n + 4) { --hub-accent: #7C3AED; }
        .hub-btn:nth-child(5n + 5) { --hub-accent: #E11D48; }
        .hub-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--hub-accent) 13%, transparent), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,.78), rgba(255,255,255,0));
          opacity: .75;
          z-index: -1;
          transition: opacity .28s ease, transform .28s ease;
        }
        .hub-btn:hover {
          background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--hub-accent) 9%, #FFFFFF) 100%);
          border-color: color-mix(in srgb, var(--hub-accent) 42%, #FFFFFF);
          transform: translateY(-6px);
          box-shadow: 0 22px 42px color-mix(in srgb, var(--hub-accent) 20%, transparent), 0 10px 18px rgba(15,23,42,0.08);
        }
        .hub-btn:hover::before {
          opacity: 1;
          transform: scale(1.08);
        }
        .hub-btn:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--hub-accent) 28%, transparent);
          outline-offset: 3px;
        }
        .hub-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background:
            linear-gradient(135deg, #FFFFFF, color-mix(in srgb, var(--hub-accent) 12%, #F8FAFC));
          font-size: 28px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.8), 0 12px 24px color-mix(in srgb, var(--hub-accent) 16%, transparent);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), background .28s ease, box-shadow .28s ease;
        }
        .hub-btn:hover .hub-icon {
          background: #fff;
          transform: translateY(-4px) scale(1.08);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hub-accent) 18%, #FFFFFF), 0 18px 30px color-mix(in srgb, var(--hub-accent) 22%, transparent);
        }
        .hub-label {
          font-size: 11.2px;
          font-weight: 850;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .4px;
          line-height: 1.2;
        }
        .hub-btn:hover .hub-label {
          color: var(--hub-accent);
          transform: scale(1.05);
        }
        .hub-btn:active {
          transform: scale(0.95) translateY(0);
          transition: transform 0.1s cubic-bezier(.2,.8,.2,1);
        }
        .hub-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: rotate(45deg) translateX(-100%);
          transition: none;
          pointer-events: none;
        }
        .hub-btn:hover::after {
          transform: rotate(45deg) translateX(100%);
          transition: transform 0.6s ease-in-out;
        }
        :global(.home-stat-grid .stat-card) {
          position: relative;
          overflow: hidden;
          border-color: rgba(226,232,240,.92);
          box-shadow: 0 12px 28px rgba(15,23,42,.06);
          animation: homeRise .5s ease-out both;
          transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
        }
        :global(.home-stat-grid .stat-card::after) {
          content: '';
          position: absolute;
          inset: auto 0 0;
          height: 3px;
          background: linear-gradient(90deg, var(--maroon), var(--blue), var(--teal));
          opacity: .72;
          transform: scaleX(.2);
          transform-origin: left;
          transition: transform .26s ease;
        }
        :global(.home-stat-grid .stat-card:hover) {
          transform: translateY(-5px);
          border-color: rgba(37,99,235,.25);
          box-shadow: 0 22px 44px rgba(15,23,42,.12);
        }
        :global(.home-stat-grid .stat-card:hover::after) {
          transform: scaleX(1);
        }
        :global(.home-stat-grid .sc-icon) {
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.65), 0 12px 22px rgba(15,23,42,.08);
          transition: transform .24s ease;
        }
        :global(.home-stat-grid .stat-card:hover .sc-icon) {
          transform: rotate(-8deg) scale(1.15);
          box-shadow: 0 15px 30px rgba(37,99,235,0.2);
        }
        :global(.home-stat-grid .sc-n) {
          transition: transform 0.2s ease;
        }
        :global(.home-stat-grid .stat-card:hover .sc-n) {
          transform: translateX(4px);
          color: #2563EB;
        }
        .home-insight-grid {
          align-items: stretch;
        }
        .insight-panel {
          border-color: rgba(226,232,240,.9);
          box-shadow: 0 14px 34px rgba(15,23,42,.06);
          animation: homeRise .55s ease-out both;
        }
        .metric-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 11.5px;
        }
        .metric-label {
          width: 82px;
          flex-shrink: 0;
          color: var(--muted);
          font-size: 10.5px;
          font-weight: 750;
        }
        .metric-track,
        .fee-track {
          position: relative;
          flex: 1;
          overflow: hidden;
          border-radius: 999px;
          background: #EEF2FF;
        }
        .metric-track { height: 18px; }
        .metric-fill,
        .fee-fill {
          height: 100%;
          border-radius: inherit;
          transform-origin: left;
          animation: barGrow .72s cubic-bezier(.2,.8,.2,1) both;
        }
        .metric-fill {
          display: flex;
          align-items: center;
          min-width: 26px;
          padding: 0 8px;
          background: linear-gradient(90deg, #2563EB, #1D4ED8);
          color: #fff;
          font-size: 10px;
          font-weight: 850;
        }
        .fee-row {
          margin-bottom: 15px;
        }
        .fee-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .fee-meta span:first-child {
          color: var(--text);
          font-weight: 750;
        }
        .fee-meta span:last-child {
          color: var(--muted);
          font-weight: 650;
          white-space: nowrap;
        }
        .fee-track { height: 10px; }
        .fee-fill {
          min-width: 8px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
        }
        @keyframes homeRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hubFadeIn {
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes barGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes sheen {
          0%, 55% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @media (max-width: 760px) {
          .home-hero {
            align-items: flex-start;
          }
          .home-refresh {
            width: 100%;
            justify-content: center;
          }
          .hub-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 12px;
          }
          .hub-btn {
            min-height: 108px;
            padding: 16px 8px;
            border-radius: 16px;
            box-shadow: 0 10px 22px rgba(15,23,42,.07);
          }
          .hub-icon {
            width: 44px;
            height: 44px;
            font-size: 24px;
          }
          .hub-label {
            font-size: 10px;
            letter-spacing: .25px;
          }
          .home-insight-grid {
            grid-template-columns: 1fr;
          }
          .alert-body,
          .oversight-body {
            align-items: flex-start;
            flex-direction: column;
          }
          .red-flag-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-hero,
          .home-alert,
          .module-panel,
          .oversight-panel,
          .hub-btn,
          .red-flag-card,
          .insight-panel,
          :global(.home-stat-grid .stat-card),
          .metric-fill,
          .fee-fill {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .module-hdr::after {
            animation: none;
          }
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
