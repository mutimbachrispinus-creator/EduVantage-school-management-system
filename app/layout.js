import '../styles/globals.css';
import PortalShell from './PortalShell';
import { I18nProvider } from '@/lib/i18n';

// Using system font stacks to avoid network-dependent build errors
const inter = { variable: 'font-inter' };
const sora = { variable: 'font-sora' };

export const metadata = {
  title:       'EduVantage School Management System',
  description: 'The future of school management — Multi-tenant SaaS with CBC & M-Pesa.',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'google4a94ac500e88f427',
  },
  icons: { 
    icon: '/eduvantage-logo.png?v=7',
    apple: '/apple-touch-icon.png?v=7',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#4F46E5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
        <I18nProvider>
          <PortalShell>{children}</PortalShell>
        </I18nProvider>
      </body>
    </html>
  );
}
