'use client';
/**
 * components/Navbar.js — Role-based top navigation bar
 *
 * Renders the sticky topbar with:
 *   • School crest + name
 *   • Tab buttons filtered by role (matching ALL_NAV in index-122.html)
 *   • Message badge
 *   • User pill + logout
 */

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ALL_NAV } from '@/lib/navigation';
import { prefetchKeys, clearAllCache } from '@/lib/client-cache';
import { useProfile } from '@/app/PortalShell';
import NotificationBell from '@/components/NotificationBell';


export default function Navbar({ user, profile, unreadCount = 0, pendingDuties = 0, pendingReqs = 0, onProfileClick }) {

  const router   = useRouter();
  const pathname = usePathname();
  const [showMobileNav, setShowMobileNav] = useState(false);

  const { impersonateId, setUser, labels } = useProfile() || {};
  const activeRoles = [user?.role || 'member'];
  if (user?.role === 'super-admin' && impersonateId) {
    activeRoles.push('admin'); // Add admin role to see school management tabs
  }

  const nav = ALL_NAV.filter(n => n.roles.some(r => activeRoles.includes(r)));

  function isActive(key) {
    const p = pathname.split('?')[0];
    if (key === 'dashboard') return p === '/dashboard';
    // Remove leading/trailing slashes for comparison
    const normalizedPath = p.replace(/^\/|\/$/g, '');
    const normalizedKey  = key.replace(/^\/|\/$/g, '');
    return normalizedPath === normalizedKey || normalizedPath.startsWith(normalizedKey + '/');
  }

  function translateLabel(n) {
    if (!labels) return n.label;
    if (n.key === 'grades') return labels.assessments || n.label;
    if (n.key === 'learners') return labels.learners || n.label;
    if (n.key === 'nexed') return 'Nexed Finance';
    return n.label;
  }

  function getBadge(key) {
    if (key === 'messages' && unreadCount > 0) return unreadCount;
    if (key === 'sms' && unreadCount > 0) return unreadCount; // User requested "sms button should show number of inbox sms"
    if (key === 'duties') {
      const total = pendingDuties + (user.role === 'admin' ? pendingReqs : 0);
      if (total > 0) return total;
    }
    return 0;
  }

  async function logout() {
    // 1. Clear ALL local cache immediately so UI resets
    clearAllCache();
    if (setUser) setUser(null);
    // 2. Manually expire the auth cookie on the client (belt & braces)
    document.cookie = 'paav_token=; Max-Age=0; path=/; SameSite=Lax';
    document.cookie = 'paav_session=; Max-Age=0; path=/; SameSite=Lax';
    // 3. Tell the server to clear its HttpOnly cookie (best-effort)
    try {
      await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    // 4. Hard redirect — clears all React state
    window.location.replace('/');
  }

  if (!user) return null;

  return (
    <div id="topbar">
      <Link href="/dashboard" className="tb-brand" style={{ cursor: 'pointer', textDecoration: 'none' }}>
        <div 
          className="tb-crest" 
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <img 
            src={(user.role === 'super-admin' && !impersonateId) ? '/ev-brand-v3.png' : (profile.logo && profile.logo !== '/ev-brand-v3.png' ? profile.logo : '/ev-brand-v3.png')} 
            alt="EduVantage Logo"
            fetchpriority="high"
            loading="eager"
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', overflow: 'hidden', background: '#0F172A' }} 
          />
        </div>
        <div>
          <div className="tb-sname" style={(user.role === 'super-admin' && !impersonateId) ? {
            fontFamily: 'var(--font-sora), sans-serif', fontSize: 18, fontWeight: 800, color: '#F8FAFC'
          } : {}}>
            {(user.role === 'super-admin' && !impersonateId) ? 'EduVantage Master' : (profile.name?.toUpperCase() || 'SCHOOL PORTAL')}
            {(user.role !== 'super-admin' || impersonateId) && ` — ${new Date().getFullYear()}`}
            {(user.role !== 'super-admin' || impersonateId) && profile.curriculum && (
              <span className="curriculum-badge" style={{
                fontSize: '9px',
                fontWeight: 900,
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px',
                verticalAlign: 'middle',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                letterSpacing: '0.5px'
              }}>
                {profile.curriculum}
              </span>
            )}
          </div>
          <div className="tb-stag">
            {(user.role === 'super-admin' && !impersonateId) ? 'SaaS Management Platform' : (profile.motto || 'Education Portal')}
          </div>
        </div>
      </Link>


      {/* ── Nav tabs ── */}
      <div className="nav-container">
        <button className="nav-scroll-btn no-print desktop-only" onClick={() => document.getElementById('tb-nav-inner').scrollBy({left:-200, behavior:'smooth'})}>‹</button>
        <nav className="tb-nav" id="tb-nav-inner">
          {nav.map(n => {
            const b = getBadge(n.key);
            return (
              <Link
                key={n.key}
                href={n.key === 'classes' ? '/classes' : `/${n.key}`}
                className={`tb-nbtn${isActive(n.key) ? ' on' : ''}`}
                style={{ textDecoration: 'none', position: 'relative' }}
                onClick={() => setShowMobileNav(false)}
                onMouseEnter={() => n.prefetch && prefetchKeys(n.prefetch)}
              >
                {n.icon} {translateLabel(n)}
                {b > 0 && <span className="nav-badge">{b > 9 ? '9+' : b}</span>}
              </Link>
            );
          })}
        </nav>
        <button className="nav-scroll-btn no-print desktop-only" onClick={() => document.getElementById('tb-nav-inner').scrollBy({left:200, behavior:'smooth'})}>›</button>
      </div>



      {/* ── Actions ── */}
      <div className="tb-actions">
        {/* Notification Bell (Hidden on mobile topbar) */}
        <div className="desktop-only">
          <NotificationBell userId={user?.id || user?.username} />
        </div>

        {/* Message badge (Hidden on mobile topbar) */}
        <Link href="/messages" className="tb-msg desktop-only" title="Messages" style={{ textDecoration: 'none' }}>
          💬
          {unreadCount > 0 && (
            <span className="msg-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>

        {/* User pill */}
        <div className="tb-user" onClick={onProfileClick}>
          <div className="tb-avatar" style={{ background: user.color || '#2563EB', overflow: 'hidden' }}>
            {user.avatar ? (
              <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            ) : (
              user.emoji || user.name?.charAt(0) || '?'
            )}
          </div>
          <div>
            <div className="tb-uname">{user.name?.split(' ')[0] || user.username}</div>
            <div className="tb-urole">{user.role}</div>
          </div>
        </div>

        {/* Stop impersonation */}
        {user.role === 'super-admin' && impersonateId && (
          <>
            <button className="btn btn-warning btn-sm btn-stop-impersonate" onClick={() => {
              localStorage.removeItem('paav_impersonate_id');
              window.location.href = '/super-admin';
            }}>⏹ <span className="btn-text">STOP VIEWING SCHOOL</span></button>
          </>
        )}

        {/* Desktop logout pill */}
        <button className="btn-logout" onClick={logout}>⏻ Logout</button>

        {/* Mobile logout icon (shown only on ≤600px) */}
        <button className="btn-logout-mobile" onClick={logout} title="Logout">⏻</button>
      </div>
    </div>
  );
}
