'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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
            <a href="/#demo" style={{ color: 'var(--lp-primary,#4F46E5)', fontWeight: 800 }}>🎥 Demo</a>
            <Link href="/compare">Compare</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="nav-btns">
            <Link href="/login" className="btn btn-ghost">Sign In</Link>
            <Link href="/saas/signup" className="btn btn-primary btn-glow">Get Started Free</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
