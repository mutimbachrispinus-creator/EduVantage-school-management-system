'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { getEnabledLanguages, getLanguageInfo } from '@/lib/i18n/languages';

// Inline language switcher for landing page (avoids i18n context dependency)
function LandingLangSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const ref = useRef(null);
  const languages = getEnabledLanguages();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('eduvantage_language');
      if (stored) setCurrentLang(stored);
    } catch {}

    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    try { localStorage.setItem('eduvantage_language', code); } catch {}
    setCurrentLang(code);
    setIsOpen(false);
    window.location.reload(); // Reload to apply language change
  };

  const lang = getLanguageInfo(currentLang);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', border: '1.5px solid rgba(255,255,255,0.25)',
          borderRadius: 10, background: 'rgba(255,255,255,0.08)',
          color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          backdropFilter: 'blur(6px)', transition: 'all 0.2s',
        }}
        aria-label="Select language"
      >
        <span style={{ fontSize: 16 }}>{lang.flag}</span>
        <span>{lang.nativeName}</span>
        <svg style={{ width: 12, height: 12, opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: 160, overflow: 'hidden',
        }}>
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', border: 'none', textAlign: 'left', cursor: 'pointer',
                background: l.code === currentLang ? '#F0F5FF' : 'transparent',
                color: l.code === currentLang ? '#4F46E5' : '#1E293B',
                fontWeight: l.code === currentLang ? 700 : 500, fontSize: 13,
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{l.nativeName}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{l.name}</div>
              </div>
              {l.code === currentLang && (
                <svg style={{ width: 14, height: 14, marginLeft: 'auto', color: '#4F46E5' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-box">
        <Link href="/" className="logo-group">
          <div className="logo-icon">
            <img src="/eduvantage-logo.png" alt="E" />
          </div>
          <span className="logo-text">EduVantage</span>
        </Link>
        
        <div className="nav-actions">
          <div className="nav-links desktop-only">
            <Link href="/curricula">Curricula</Link>
            <Link href="/workspaces">Workspaces</Link>
            <Link href="/features">Feature Catalog</Link>
            <Link href="/#demo" style={{ color: 'var(--lp-primary,#4F46E5)', fontWeight: 800 }}>🎥 Demo</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="nav-btns" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LandingLangSwitcher />
            <Link href="/login" className="btn btn-ghost">Sign In</Link>
            <Link href="/saas/signup" className="btn btn-primary btn-glow">Get Started Free</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
