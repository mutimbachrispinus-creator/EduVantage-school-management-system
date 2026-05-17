import '../styles/globals.css';
import PortalShell from './PortalShell';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
