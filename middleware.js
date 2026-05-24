import { NextResponse } from 'next/server';

/**
 * EduVantage SaaS Middleware
 */
export function middleware(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  // 1. Skip ALL API routes and internal Next.js assets early
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  // Handle Google Site Verification dynamically from environment
  if (url.pathname.startsWith('/google') && url.pathname.endsWith('.html')) {
    const googleVerif = process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    if (googleVerif) {
      const expected = googleVerif.endsWith('.html') ? googleVerif : `${googleVerif}.html`;
      if (url.pathname === `/${expected}`) {
        return new NextResponse(`google-site-verification: ${expected}`, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
  }

  if (url.pathname.includes('.')) {
    return NextResponse.next();
  }

  // 2. Platform Main Domain Check
  // Supports Cloudflare Pages preview domains (.pages.dev) and custom domain
  const isMainPlatform =
    host === 'eduvantage.app' ||
    host === 'portal.eduvantage.app' ||
    host === 'localhost:3000' ||
    host.endsWith('.pages.dev'); // Cloudflare Pages preview & production domains

  if (isMainPlatform) {
    return NextResponse.next();
  }

  // 3. Subdomain Routing
  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const ignore = ['www', 'app', 'portal', 'admin', 'paav-scl', 'eduvantage'];

    if (!ignore.includes(subdomain)) {
      if (url.pathname === '/') {
        url.pathname = '/login';
        const finalTenant = subdomain;
        url.searchParams.set('tenant', finalTenant);
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
