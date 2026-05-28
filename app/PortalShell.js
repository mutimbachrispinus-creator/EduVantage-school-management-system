'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ALL_NAV } from '@/lib/navigation';
import { getCachedUser, getCachedDBMulti, prefetchKeys, clearAllCache, fetchWithRetry, hydrateCache } from '@/lib/client-cache';
import { initSyncEngine, stopSyncEngine } from '@/lib/sync-engine';
import { readSchoolProfile } from '@/lib/school-profile';
import { getLabels } from '@/lib/cbe';

// Dynamic imports for performance
const ProfilePanel = dynamic(() => import('@/components/ProfilePanel'), { ssr: false });
const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false });

/**
 * app/PortalShell.js — Client-side portal shell
 */

const ProfileContext = createContext();
export const useProfile = () => useContext(ProfileContext);

function BootSplash() {
  const [stage, setStage] = useState(0);
  
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (stage === 3) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: stage === 2 ? 0 : 1, transition: 'opacity 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)', pointerEvents: 'none'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute', width: '150vw', height: '150vh',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(0,0,0,0) 50%)',
        opacity: stage >= 1 ? 1 : 0, transform: stage >= 1 ? 'scale(1)' : 'scale(0.5)',
        transition: 'all 2s ease-out'
      }}></div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Core Logo with Glow */}
        <div style={{
          position: 'relative',
          transform: stage >= 1 ? 'scale(1)' : 'scale(0.8)',
          opacity: stage >= 1 ? 1 : 0,
          transition: 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {/* Animated glow ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '120%', height: '120%', borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0%, #3B82F6 50%, transparent 100%)',
            animation: 'spinGlow 2s linear infinite', filter: 'blur(20px)', opacity: 0.6
          }}></div>
          
          <img src="/eduvantage-logo.png" alt="Boot" style={{ width: 120, height: 120, objectFit: 'contain', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))' }} />
        </div>

        {/* Text Wipe */}
        <div style={{
          marginTop: 30, overflow: 'hidden', height: 40, position: 'relative',
          opacity: stage >= 1 ? 1 : 0, transition: 'opacity 1s ease 0.5s'
        }}>
          <div style={{
            fontSize: 28, fontWeight: 900, fontFamily: 'Sora, sans-serif', color: '#fff',
            letterSpacing: '8px', textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #1E293B, #fff, #3B82F6, #fff, #1E293B)',
            backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'shine 2s linear infinite'
          }}>
            EDUVANTAGE
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spinGlow { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes shine { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

function SystemLockout({ profile }) {
  const router = useRouter();
  const contactWhatsApp = 'https://wa.me/254792656579?text=Hello%20EduVantage%2C%20I%20need%20to%20upgrade%20my%20school%20subscription%20plan.';
  
  if (!profile.learnerLimit || profile.learnerLimit <= 0) return null;
  if (profile.learnerCount <= profile.learnerLimit) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: '40px 30px', border: '2px solid var(--secondary)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🔒</div>
        <h2 style={{ color: 'var(--navy)', marginBottom: 15, fontSize: 24, fontWeight: 800 }}>Institutional Access Locked</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 25, lineHeight: 1.6, fontSize: 15 }}>
          Your school has <strong>{profile.learnerCount}</strong> students, which exceeds your current plan limit of <strong>{profile.learnerLimit}</strong>. 
          To ensure platform stability and compliance, access has been restricted.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-primary w-full" onClick={() => router.push('/billing')} style={{ height: 48, fontSize: 16 }}>
            💳 Upgrade Subscription Now
          </button>
          <a href={contactWhatsApp} target="_blank" rel="noopener noreferrer" className="btn btn-gold w-full" style={{ height: 48, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            💬 Contact Support (WhatsApp)
          </a>
          <button className="btn btn-ghost w-full" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>
            🚪 Log Out
          </button>
        </div>
        
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
          EduVantage SaaS Network · Compliance & Security Engine
        </div>
      </div>
    </div>
  );
}

/**
 * Basic Error Boundary to prevent the entire portal from crashing
 */
import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FDF2F2', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ color: '#8B1A1A', marginBottom: 10 }}>Something went wrong</h2>
          <p style={{ color: '#64748B', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
            An unexpected error occurred in this part of the portal. Our technical team has been notified.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', background: '#8B1A1A', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            🔄 Reload Portal
          </button>
          <div style={{ marginTop: 40, fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
            {this.state.error?.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Pages that should NOT show the navbar */
const NO_NAV_PATHS = ['/', '/login', '/fees/pay', '/saas/signup', '/api', '/privacy', '/terms', '/curricula', '/workspaces', '/features', '/compare', '/pricing'];

/* Inactivity config */
const IDLE_WARNING_MS  = 7 * 60 * 1000;   // warn after 7 min
const IDLE_LOGOUT_MS   = 8 * 60 * 1000;   // log out after 8 min
const IDLE_EVENTS      = ['mousemove','keydown','click','touchstart','scroll'];

export default function PortalShell({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isBooting, setIsBooting] = useState(() => typeof window !== 'undefined');

  useEffect(() => {
    // End the internal tracking of booting so children can load logic, but BootSplash handles its own visual unmount
    const t = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.__INITIAL_USER__) return window.__INITIAL_USER__;
      try {
        const raw = localStorage.getItem('paav_cache_user');
        if (raw) {
          const { v } = JSON.parse(raw);
          return v;
        }
      } catch {}
    }
    return null;
  });


  const [announcement, setAnnouncement] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      // Use tenant-isolated key to prevent cross-school data bleed
      const tid = localStorage.getItem('paav_last_tenant') || 'platform-master';
      const raw = localStorage.getItem(`paav_cache_${tid}_db_paav_announcement`);
      if (raw) {
        const { v } = JSON.parse(raw);
        if (v?.text && v?.active) return v.text;
      }
    } catch {}
    return '';
  });

  const [unreadCount, setUnreadCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      // Use tenant-isolated keys to prevent cross-school unread count bleed
      const tid = localStorage.getItem('paav_last_tenant') || 'platform-master';
      const rawUser = localStorage.getItem('paav_cache_user');
      const rawMsgs = localStorage.getItem(`paav_cache_${tid}_db_paav6_msgs`);
      if (rawUser && rawMsgs) {
        const { v: u } = JSON.parse(rawUser);
        const { v: msgs } = JSON.parse(rawMsgs);
        if (u && Array.isArray(msgs)) {
          return msgs.filter(m => {
            if (!m || m.deletedBy?.includes(u.username) || m.read?.includes(u.username) || m.from === u.username) return false;
            const isMine = m.to === u.username || m.to === u.role || m.to === 'ALL' || 
                (m.to === 'ALL_PARENTS' && u.role === 'parent') || 
                (m.to === 'ALL_STAFF' && ['admin','teacher','staff'].includes(u.role)) ||
                (m.to === 'ALL_TEACHERS' && ['admin','teacher'].includes(u.role)) ||
                (m.to === 'NON_TEACHING_STAFF' && ['admin','staff'].includes(u.role));
            return isMine;
          }).length;
        }
      }
    } catch {}
    return 0;
  });

  const [pendingDuties, setPendingDuties] = useState(0);
  const [pendingReqs,   setPendingReqs]   = useState(0);
  const [showBanner,   setShowBanner]   = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [countdown,    setCountdown]    = useState(60);
  const [editAnn,      setEditAnn]      = useState(false);
  const [annDraft,     setAnnDraft]     = useState('');
  const [heroUrl,      setHeroUrl]      = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('paav_cache_db_paav_hero_img');
      if (raw) {
        const { v } = JSON.parse(raw);
        return v || '';
      }
    } catch {}
    return '';
  });
  const [showProfile,  setShowProfile]  = useState(false);
  const [theme,        setTheme]        = useState(() => {
    if (typeof window !== 'undefined' && window.__INITIAL_BRANDING__?.theme) return window.__INITIAL_BRANDING__.theme;
    return { primary: '#1E40AF', secondary: '#D4AF37', accent: '#0F172A' };
  });
  const [profile, setProfile] = useState(() => {
    const fallback = { name: 'EduVantage School Management System', tagline: 'Global Education SaaS Network', logo: '/eduvantage-logo.png' };
    if (typeof window === 'undefined') return fallback;
    
    if (window.__INITIAL_BRANDING__?.profile) return window.__INITIAL_BRANDING__.profile;

    // Check URL for tenant parameter first (Critical for Login page)
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    
    const cached = readSchoolProfile(tenantParam);
    return cached || fallback;
  });

  const idleTimer    = useRef(null);
  const warnTimer    = useRef(null);
  const countdownRef = useRef(null);
  const heroFileRef  = useRef(null);

  const labels = useMemo(() => {
    return getLabels(profile?.curriculum || 'CBC');
  }, [profile?.curriculum]);

  const [impersonateId, setImpersonateId] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('paav_impersonate_id');
  });

  const mobileNavItems = useMemo(() => {
    if (!user) return [];
    return ALL_NAV
      .filter(n => n.roles.some(r => r === user.role || (user.role === 'super-admin' && r === 'admin')))
      .filter(n => n.key !== 'dashboard' && n.key !== 'messages');
  }, [user]);

  // Sync document title with active branding to prevent stale metadata
  useEffect(() => {
    const siteName = 'EduVantage School Management System';
    const publicPaths = ['/', '/login', '/saas/signup', '/privacy', '/terms'];
    
    if (publicPaths.includes(pathname) || pathname.startsWith('/demo')) {
      document.title = siteName;
      return;
    }

    document.title = profile.name ? `${profile.name} — ${siteName}` : siteName;
  }, [profile, pathname]);

  // Apply theme to document
  useEffect(() => {
    let activeTheme = theme;
    
    if (activeTheme) {
      document.documentElement.style.setProperty('--primary', activeTheme.primary);
      document.documentElement.style.setProperty('--secondary', activeTheme.secondary);
      document.documentElement.style.setProperty('--accent', activeTheme.accent);
      // Generate some derivatives
      document.documentElement.style.setProperty('--primary-low', activeTheme.primary + '22');
      document.documentElement.style.setProperty('--primary-mid', activeTheme.primary + '66');
    }
  }, [theme, user, impersonateId]);

  const showNav = !NO_NAV_PATHS.includes(pathname) && !pathname.startsWith('/api') && !pathname.startsWith('/demo');

  const loadSession = useCallback(async () => {
    try {
      // 🚀 1. Speed Injection: If we already have server-injected data, skip the first fetch
      if (window.__INITIAL_USER__ && window.__INITIAL_BRANDING__) {
        console.log('[PortalShell] Using injected session data');
        const { profile: p, theme: t } = window.__INITIAL_BRANDING__;
        if (p) { setProfile(p); hydrateCache({ paav_school_profile: p }); }
        if (t) { setTheme(t); hydrateCache({ paav_theme: t }); }
      }

      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti([
          'paav_announcement',
          'paav6_msgs',
          'paav_hero_img',
          'paav7_duties',
          'paav_staff_reqs',
          'paav_theme'
        ])
      ]);
        
      if (!u && showNav) {
        console.warn('[PortalShell] No session found, redirecting...');
        window.location.href = '/';
        return;
      }

      // 2. Branding isolation logic
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get('tenant');
      const brandingTenant = tenantParam || impersonateId || u?.tenant_id || u?.tenantId || 'platform-master';

      if (brandingTenant && brandingTenant !== 'platform-master') {
        try { localStorage.setItem('paav_last_tenant', brandingTenant); } catch {}
      }

      // Use platform branding on public pages unless a tenant is specified
      const isPublic = pathname === '/' || pathname === '/login' || pathname === '/saas/signup' || pathname === '/privacy' || pathname === '/terms' || pathname.startsWith('/demo');
      if (isPublic && !tenantParam && !impersonateId) {
        setProfile({ name: 'EduVantage School Management System', tagline: 'Global Education SaaS Network', logo: '/eduvantage-logo.png' });
        setTheme({ primary: '#1E40AF', secondary: '#D4AF37', accent: '#0F172A' });
      } else {
        const configRes = await fetch(`/api/saas/config?tenant=${brandingTenant}&_t=${Date.now()}`);
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.profile) setProfile(config.profile);
          if (config.theme) setTheme(config.theme);
        }
      }

      if (u) {
        setUser(u);
        if (db?.paav_announcement?.text) setAnnouncement(db.paav_announcement.text);
        if (db?.paav6_msgs) {
          const unr = db.paav6_msgs.filter(m => {
            if (!m || m.deletedBy?.includes(u.username) || m.read?.includes(u.username) || m.from === u.username) return false;
            const isMine = m.to === u.username || m.to === u.role || m.to === 'ALL' || 
                (m.to === 'ALL_PARENTS' && u.role === 'parent') || 
                (m.to === 'ALL_STAFF' && ['admin','teacher','staff'].includes(u.role)) ||
                (m.to === 'ALL_TEACHERS' && ['admin','teacher'].includes(u.role)) ||
                (m.to === 'NON_TEACHING_STAFF' && ['admin','staff'].includes(u.role));
            return isMine;
          }).length;
          setUnreadCount(unr);
        }
        
        // Only warm small shell data here. Large datasets such as learners and marks are
        // fetched by the pages that need them, which keeps login light for large schools.
        const warmKeys = ['paav6_msgs', 'paav_announcement', 'paav_theme'];
        if (['admin', 'super-admin'].includes(u.role)) warmKeys.push('paav6_feecfg');
        prefetchKeys(warmKeys);
      }
    } catch (e) {
      console.error('[PortalShell] session load error:', e);
    }
  }, [showNav, impersonateId]); // Removed pathname to stop nav lag

  useEffect(() => {
    if (showNav) {
      loadSession();
      initSyncEngine();
    }
    return () => stopSyncEngine();
  }, [showNav, loadSession]);

  // targeted branding transition effect (public <-> private)
  const [isPublicState, setIsPublicState] = useState(pathname === '/' || pathname === '/login' || pathname === '/saas/signup' || pathname === '/privacy' || pathname === '/terms' || pathname.startsWith('/demo'));
  useEffect(() => {
    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/saas/signup' || pathname === '/privacy' || pathname === '/terms' || pathname.startsWith('/demo');
    if (isPublic !== isPublicState) {
      setIsPublicState(isPublic);
      loadSession();
    }
  }, [pathname, isPublicState, loadSession]);

  useEffect(() => {
    const handler = (e) => {
      const changed = e.detail?.changed || [];
      
      // Update local state immediately if cache changed
      if (changed.includes('paav_school_profile')) {
        const params = new URLSearchParams(window.location.search);
        const tenantParam = params.get('tenant');
        const fresh = readSchoolProfile(tenantParam);
        if (fresh) setProfile(fresh);
      }
      if (changed.includes('paav_theme')) {
        try {
          const raw = localStorage.getItem('paav_cache_db_paav_theme');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.v) setTheme(parsed.v);
          }
        } catch {}
      }

      // Refresh other shell state if relevant keys changed
      const networkKeys = ['paav_announcement','paav6_msgs','paav_hero_img','paav7_duties','paav_staff_reqs','paav6_learners'];
      if (changed.some(k => networkKeys.includes(k))) {
        loadSession();
      }
    };
    window.addEventListener('paav:sync', handler);
    return () => window.removeEventListener('paav:sync', handler);
  }, [loadSession]);

  useEffect(() => {
    if (pathname && !NO_NAV_PATHS.includes(pathname)) {
      try { localStorage.setItem('paav_last_path', pathname); } catch {}
    }
  }, [pathname]);

  function resetIdleTimers() {
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countdownRef.current);
    setShowBanner(false);

    warnTimer.current = setTimeout(() => {
      setShowBanner(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(countdownRef.current);
            doLogout();
          }
          return c - 1;
        });
      }, 1000);
    }, IDLE_WARNING_MS);

    idleTimer.current = setTimeout(doLogout, IDLE_LOGOUT_MS);
  }

  async function doLogout() {
    // 1. Clear only app-specific cache (not all browser localStorage)
    clearAllCache();
    sessionStorage.clear();
    document.cookie = 'paav_session=; Max-Age=0; path=/; SameSite=Lax';
    
    // 2. Fire-and-forget server logout (keepalive ensures it finishes even after redirect)
    fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'logout' }),
      keepalive: true
    }).catch(() => {});

    // 3. Redirect immediately
    window.location.replace('/');
  }

  useEffect(() => {
    if (!showNav || !user) return;
    IDLE_EVENTS.forEach(ev => window.addEventListener(ev, resetIdleTimers));
    resetIdleTimers();
    return () => {
      IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, resetIdleTimers));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(countdownRef.current);
    };
  }, [showNav, user]);

  /* PWA Update Detection — avoid stale UI */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        if (!reg) return;

        // Periodically check for updates if tab is left open
        const interval = setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000); // Check every hour

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        window._pwaInterval = interval;
      }).catch(err => console.warn('[PWA] SW Reg failed:', err));

      return () => {
        if (window._pwaInterval) clearInterval(window._pwaInterval);
      };
    }
  }, []);


  const compressImage = (file, maxWidth, maxHeight, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height *= maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width *= maxHeight / height));
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  };

  async function uploadHero(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const b64 = await compressImage(file, 1200, 800, 0.8);
      setHeroUrl(b64);
      await fetchWithRetry('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_hero_img', value: b64 }] }),
        timeout: 15000
      });
    } catch {}
  }

  // saveAnnouncement — single canonical definition below

  function playSuccessSound() {
    try {
      // Use a local audio asset to avoid external dependency failures
      const audio = new Audio('/sounds/success.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }

  async function saveAnnouncement(customVal = null) {
    setEditAnn(false);
    const finalVal = customVal !== null ? customVal : annDraft;
    const ann = { text: finalVal, active: !!finalVal };
    
    // 1. Optimistic Update
    setAnnouncement(finalVal);
    
    // 2. Reliable Persistence with background sync support
    const { mutateDB } = await import('@/lib/client-cache');
    try {
      await mutateDB('paav_announcement', ann);
      playSuccessSound();
    } catch (e) {
      console.error('[PortalShell] Failed to save announcement:', e);
    }
  }

  return (

    <ProfileContext.Provider value={{ profile, user, openProfile: () => setShowProfile(true), setUser, playSuccessSound, impersonateId, setImpersonateId, labels }}>
      <BootSplash />
      <input ref={heroFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadHero} />

      {showNav && user && (
        <Navbar 
          user={user} 
          profile={profile}
          unreadCount={unreadCount} 
          pendingDuties={pendingDuties}
          pendingReqs={pendingReqs}
          onProfileClick={() => setShowProfile(true)} 
        />
      )}

      {showNav && (announcement || user?.role === 'admin') && (
        <div className="announcement-bar-live no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18 }}>📢</span>
            {editAnn ? (
              <input
                autoFocus
                value={annDraft}
                onChange={e => setAnnDraft(e.target.value)}
                placeholder="Type announcement…"
                style={{ flex: 1, background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 13, outline: 'none', minWidth: 200 }}
                onKeyDown={e => e.key === 'Enter' && saveAnnouncement()}
              />
            ) : (
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{announcement || (user?.role === 'admin' ? 'Click Edit to add an announcement…' : '')}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {user?.role === 'admin' && !editAnn && (
              <button onClick={() => { setAnnDraft(announcement); setEditAnn(true); }}
                style={{ background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 7, color: '#fff', padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                ✏️ Edit
              </button>
            )}
            {user?.role === 'admin' && editAnn && (
              <>
                <button onClick={() => saveAnnouncement()}
                  style={{ background: '#D97706', border: 'none', borderRadius: 7, color: '#fff', padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  💾 Save
                </button>
                <button onClick={() => setEditAnn(false)}
                  style={{ background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 7, color: '#fff', padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            )}
            {announcement && (
              <button onClick={() => { setAnnDraft(''); saveAnnouncement(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
            )}
          </div>
        </div>
      )}

      <div id="main" style={showNav ? {} : { padding: 0, maxWidth: 'none' }}>
        {showNav && pathname !== '/dashboard' && (
          <button 
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm no-print"
            style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#8B1A1A' }}
          >
            ← Back
          </button>
        )}
        <ErrorBoundary>
          {/* Institutional lockout disabled for now per user request */}
          {children}
        </ErrorBoundary>
      </div>


      <div className={`inactivity-banner${showBanner ? ' show' : ''}`}>
        <span>⏰ You will be logged out in {countdown}s due to inactivity</span>
        <button
          onClick={resetIdleTimers}
          style={{ padding: '6px 16px', background: 'rgba(255,255,255,.2)',
            border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 8,
            color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Stay Logged In
        </button>
        <button
          onClick={doLogout}
          style={{ padding: '6px 12px', background: 'transparent',
            border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12 }}>
          Log Out
        </button>
      </div>

      {updateAvailable && (
        <div className="update-banner no-print" style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          background: '#fff', border: '2px solid var(--primary)', borderRadius: 16,
          padding: '16px 20px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 16, animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: '#EFF6FF', borderRadius: 12, fontSize: 20 }}>
            🚀
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Update Available</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>A new version of EduVantage is ready.</div>
          </div>
          <button 
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                  if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }}
            style={{ 
              background: 'var(--primary)', color: '#fff', border: 'none', 
              padding: '10px 16px', borderRadius: 10, fontWeight: 700, 
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}>
            Update Now
          </button>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @media (max-width: 768px) { .update-banner { bottom: 90px !important; right: 10px !important; left: 10px !important; } }
          `}} />
        </div>
      )}

      {/* ── Mobile Bottom Nav ── */}
      {showNav && user && (
        <div className="mobile-bottom-nav no-print">
          <div className="mbn-bell">
            <NotificationBell userId={user.id || user.username} />
          </div>
          <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
            <span className="icon">📊</span>
            <span className="label">Home</span>
          </Link>
          <Link href="/messages" className={pathname.startsWith('/messages') ? 'active' : ''}>
            <span className="icon">💬</span>
            <span className="label">Inbox</span>
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </Link>
          {mobileNavItems.map(n => {
              const b = (n.key === 'sms') ? unreadCount :
                        (n.key === 'duties') ? (pendingDuties + (user.role === 'admin' ? pendingReqs : 0)) : 0;
              return (
                <Link
                  key={n.key}
                  href={n.key === 'classes' ? '/classes' : `/${n.key}`}
                  className={pathname.startsWith('/' + n.key) || (n.key === 'dashboard' && pathname === '/dashboard') ? 'active' : ''}
                  onMouseEnter={() => n.prefetch && prefetchKeys(n.prefetch)}
                >
                  <span className="icon">{n.icon}</span>
                  <span className="label">{(n.key === 'grades' ? (labels.assessments || n.label) : n.key === 'learners' ? (labels.learners || n.label) : n.label)}</span>
                  {b > 0 && <span className="nav-badge" style={{ top: 4, right: 4, transform: 'scale(0.75)' }}>{b > 9 ? '9+' : b}</span>}
                </Link>
              );
            })}
          {/* Logout button — always visible on mobile */}
          <button
            onClick={doLogout}
            className="mbn-logout-btn"
            aria-label="Log Out"
          >
            <span className="icon">🚪</span>
            <span className="label">Log Out</span>
          </button>
        </div>
      )}

      {showProfile && user && (
        <ProfilePanel user={user} onClose={() => setShowProfile(false)} />
      )}
    </ProfileContext.Provider>
  );
}
