/**
 * lib/auth.js — Role-based access helpers
 *
 * The portal supports five roles:
 *   admin   → full access (all pages)
 *   teacher → learners, marks, attendance, reports, salary view, inbox
 *   staff   → fees (read), duties, reports, inbox
 *   parent  → my-child home, report card, fee statement
 *   member  → dashboard only (legacy)
 *
 * Session is stored in a signed HttpOnly cookie called `paav_session`.
 * On the client side, the current user object (CU) is kept in
 * sessionStorage so the SPA can read it without an API round-trip.
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'eduvantage-platform-jwt-secret-change-in-prod'
);
const ALGORITHM = 'HS256';
const SESSION_COOKIE = 'paav_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

/* ─── Role definitions ──────────────────────────────────────────────────── */

export const ROLES = {
  ADMIN:   'admin',
  TEACHER: 'teacher',
  JSS_TEACHER: 'jss_teacher',
  SENIOR_TEACHER: 'senior_teacher',
  STAFF:   'staff',
  PARENT:  'parent',
  MEMBER:  'member',
  SUPER_ADMIN: 'super-admin',
};

/** Pages each role may access (matches ALL_NAV in the original HTML) */
export const ROLE_PAGES = {
  admin:   ['dashboard','learners','grades','attendance','fees','teachers','timetable','performance','analytics',
            'salary','duties','streams','reports','templates','sms','messages','profile',
            'audit','settings','merit-list','classes','allocations'],
  'super-admin': ['super-admin', 'dashboard','learners','grades','attendance','fees','teachers','timetable','performance','analytics',
            'salary','duties','streams','reports','templates','sms','messages','profile',
            'audit','settings','merit-list','classes','allocations'],
  teacher: ['dashboard','learners','grades','attendance','duties','timetable','performance','analytics',
            'reports','staff-inbox','merit-list','classes','messages','profile'],
  jss_teacher: ['dashboard','learners','grades','attendance','duties','timetable','performance','analytics',
                'reports','staff-inbox','merit-list','classes','messages','profile'],
  senior_teacher: ['dashboard','learners','grades','attendance','duties','timetable','performance','analytics',
                   'reports','staff-inbox','merit-list','classes','messages','profile'],
  staff:   ['dashboard','duties','reports','staff-inbox','timetable','messages'],
  parent:  ['parent-home','parent-marks','fees'],
  member:  ['dashboard'],
};

export function canAccess(role, page) {
  const allowed = ROLE_PAGES[role] || [];
  return allowed.some(p => page.startsWith(p));
}

/* ─── JWT helpers ───────────────────────────────────────────────────────── */

/**
 * Create a signed JWT for a user object.
 * Stored server-side in an HttpOnly cookie.
 */
export async function createSessionToken(user) {
  return new SignJWT({
    id:       user.id,
    username: user.username,
    name:     user.name,
    role:     user.role,
    tenantId: user.tenant_id || 'platform-master',
    grade:    user.grade     || '',
    childAdm: user.childAdm  || '',
    teachingAreas: user.teachingAreas || [],
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET);
}

/**
 * Verify and decode a session JWT.
 * Returns the payload or null on failure.
 */
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

/* ─── Cookie helpers (server components & route handlers) ───────────────── */

/** Read and verify the session from the request cookie store. */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Write the session cookie after login. */
export async function setSessionCookie(user, response) {
  const token = await createSessionToken(user);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   SESSION_MAX_AGE,
    path:     '/',
  });
  return token;
}

/** Clear the session cookie on logout. */
export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
}

/* ─── Auth guard (for use in Server Components / layouts) ───────────────── */

/**
 * Call from a layout or page Server Component.
 * Redirects to / if no valid session (or if role is not allowed).
 *
 * @param {string|string[]} allowedRoles  — pass '*' to allow any role
 */
export async function requireAuth(allowedRoles = '*') {
  const { redirect } = await import('next/navigation');
  const session = await getSession();
  if (!session) redirect('/');
  if (allowedRoles !== '*') {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(session.role)) redirect('/dashboard');
  }
  return session;
}

/* ─── Password utilities ────────────────────────────────────────────────── */

/**
 * PBKDF2 Hashing (Secure)
 * Uses 100,000 iterations and SHA-256.
 */
export async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(process.env.PASS_SALT || 'eduvantage-salt-static-fallback');
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plain),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Legacy SHA-256 (for migration verification only) */
async function hashLegacy(plain) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(plain + (process.env.PASS_SALT || 'eduvantage-salt'))
  );
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  
  // 1. Try PBKDF2 (new standard)
  const pbkdf2Match = (await hashPassword(plain)) === hash;
  if (pbkdf2Match) return true;

  // 2. Try legacy SHA-256 (migration support)
  const legacyMatch = (await hashLegacy(plain)) === hash;
  return legacyMatch;
}

/* ─── Role display helpers ──────────────────────────────────────────────── */

export const ROLE_EMOJI = {
  admin:   '🛡️',
  teacher: '📚',
  jss_teacher: '📘',
  senior_teacher: '📙',
  staff:   '👔',
  parent:  '👨‍👩‍👧',
  member:  '👤',
  'super-admin': '👑',
};

export const ROLE_COLOR = {
  admin:   '#8B1A1A',
  teacher: '#059669',
  jss_teacher: '#2563EB',
  senior_teacher: '#EA580C',
  staff:   '#0D9488',
  parent:  '#7C3AED',
  member:  '#64748B',
  'super-admin': '#1E1B4B',
};

export function roleLabel(role) {
  return (role || '').charAt(0).toUpperCase() + (role || '').slice(1);
}
