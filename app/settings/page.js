'use client';
/**
 * app/settings/page.js — Settings Hub
 *
 * Provides a central menu for administrators to configure various
 * school portal parameters (Grading, Subjects, Streams, etc.)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { getCachedUser, getCachedDB } from '@/lib/client-cache';
import { LanguageSwitcherFull } from '@/components/LanguageSwitcher';

export default function SettingsHubPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        setError(null);
        const u = await getCachedUser();
        if (!u || !['admin', 'super-admin'].includes(u.role)) {
          router.push('/dashboard');
          return;
        }
        setUser(u);
        setLoading(false); // Show page immediately

        // Fetch usage in background ONLY for super-admin
        if (u.role === 'super-admin') {
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ type: 'storageUsage' }] })
          })
          .then(res => {
            const ct = res.headers.get('content-type');
            if (!ct || !ct.includes('application/json')) return null;
            return res.json();
          })
          .then(dbData => {
            if (!dbData) return;
            setUsage(dbData.results?.[0]?.usage || null);
          })
          .catch(() => setUsage(null));
        }

      } catch (e) {
        console.error('[Setup] Auth check failed:', e);
        setError('Connection timed out. Please refresh.');
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) return <div className="page on"><p>Loading settings...</p></div>;
  if (error) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ color:'var(--red)', marginBottom:16 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );

  const ALL_SETTINGS_LINKS = [
    { title: '📅 School Calendar', desc: 'Define academic term start and end dates', href: '/settings/calendar', icon: '🗓️' },
    { title: '⚖️ Assessment Weights', desc: 'Configure contribution of each assessment type towards the final grade', href: '/settings/weights', icon: '⚖️' },
    { title: '📝 Custom Exams', desc: 'Add school-specific assessments (Mock, CAT, Project Work) beyond curriculum defaults', href: '/settings/exams', icon: '📝' },
    { title: '📊 Grading Scale', desc: 'Configure EE/ME/AE/BE score thresholds', href: '/settings/grading', icon: '📈' },
    { title: '🎓 Education System', desc: 'Switch between CBC, British, and IB curriculums', href: '/settings/profile?tab=info', icon: '📜' },
    { title: '📚 Subjects', desc: 'Add or remove subjects per grade level', href: '/settings/subjects', icon: '📖' },
    { title: '🏫 Streams & Classes', desc: 'Manage class streams and identifiers', href: '/streams', icon: '🏢' },
    { title: '📅 Timetable', desc: 'Configure lesson times and breaks', href: '/settings/timetable', icon: '⏰' },
    { title: '📱 SMS Configuration', desc: 'Manage Africa\'s Talking API credentials', href: '/settings/sms', icon: '📱', superOnly: true },
    { title: 'Identity & Branding', desc: 'Customize logo, theme, hero images, and announcements', href: '/settings/profile', icon: '🎨' },
    { title: '👤 My Profile', desc: 'Update your personal info and security', href: '/dashboard?tab=profile', icon: '🔑' },
    { title: '🗄️ Database Storage', desc: usage ? `Usage: ${usage.percent.toFixed(2)}% (${(usage.totalBytes / 1024 / 1024).toFixed(1)} MB / 9 GB)` : 'Loading database stats...', href: '#', icon: '💾', superOnly: true },
  ];

  const SETTINGS_LINKS = ALL_SETTINGS_LINKS.filter(l => !l.superOnly || user.role === 'super-admin');

  return (
    <div className="page on" id="pg-settings-hub">
      <div className="page-hdr">
        <div>
          <h2>⚙️ System Settings</h2>
          <p>Configure portal behavior and academic standards</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Language:</span>
          <LanguageSwitcherFull />
        </div>
      </div>

      <div className="sg sg2" style={{ marginTop: 20 }}>
        {SETTINGS_LINKS.map(link => (
          <Link href={link.href} key={link.href} className="panel" style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s' }}>
            <div className="panel-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ fontSize: 32, width: 60, height: 60, borderRadius: 'var(--r2)', background: '#F8FAFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--border)' }}>
                {link.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{link.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>{link.desc}</p>
              </div>
              <div style={{ opacity: 0.3, fontSize: 20 }}>➔</div>
            </div>
          </Link>
        ))}
      </div>
      
      <style>{`
        .panel:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
