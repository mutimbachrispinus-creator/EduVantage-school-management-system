import '../styles/globals.css';
import PortalShell from './PortalShell';
import { getSession } from '@/lib/auth';
import { kvGet } from '@/lib/db';

export const runtime = 'edge';

// Using system font stacks to avoid network-dependent build errors
const inter = { variable: 'font-inter' };
const sora = { variable: 'font-sora' };

export const metadata = {
  title:       'EduVantage School Management System',
  description: 'The future of school management — Multi-tenant SaaS with CBC & M-Pesa.',
  icons: { 
    icon: '/ev-brand-v3.png',
    apple: '/ev-brand-v3.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#4F46E5',
};

export default async function RootLayout({ children }) {
  // 🚀 Speed Injection: Pre-fetch session and branding on the server
  const session = await getSession();
  let initialBranding = null;
  
  if (session?.tenantId && session.tenantId !== 'platform-master') {
    try {
      // 🚀 Safety: Don't let the server pre-fetch block the page for more than 3s
      const fetchPromise = Promise.all([
        kvGet('paav_school_profile', null, session.tenantId),
        kvGet('paav_theme', null, session.tenantId)
      ]);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const [profile, theme] = await Promise.race([fetchPromise, timeoutPromise]);
      initialBranding = { profile, theme };
    } catch (e) {
      console.warn('[Layout] Speed injection skipped:', e.message);
    }
  }

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="manifest" href="/manifest.json" />
        {/* 🚀 Speed Injection Script 🚀 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__INITIAL_USER__ = ${JSON.stringify(session || null)};
              window.__INITIAL_BRANDING__ = ${JSON.stringify(initialBranding || null)};
              console.log('🚀 EduVantage Speed Injection Active');
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
