export const runtime = 'edge';
/**
 * app/api/auth/route.js — Authentication endpoints
 *
 * POST /api/auth   { action, ...payload }
 *
 * Actions:
 *   login     { username, password, remember }  → sets session cookie
 *   logout    {}                                → clears session cookie
 *   register  { role, name, phone, password, childAdm? }
 *   google    { idToken }                       → Google Sign-In
 *   whoami    {}                                → returns current session
 *   forgot    { username, secQ, secA }          → password reset eligibility
 *   resetpw   { username, newPassword, token }
 */

import { NextResponse } from 'next/server';
import {
  verifyPassword, hashPassword,
  setSessionCookie, clearSessionCookie, getSession,
  ROLE_EMOJI, ROLE_COLOR,
} from '@/lib/auth';
import { kvGet, kvSet, ensureSchema, query, kvDeleteStaff, logAction } from '@/lib/db';
import { sendCredentialsSMS } from '@/lib/sms-client';

const SCHEMA_REQUIRED_ACTIONS = new Set([
  'register',
  'add_child',
  'edit_user',
  'google',
  'request_otp',
  'verify_otp_reset',
  'resetpw',
  'change_password',
  'delete_user',
]);

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function ok(data, response) {
  return NextResponse.json({ ok: true, ...data }, { status: 200, ...response });
}
function err(msg, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function getStaffList() {
  return (await kvGet('paav6_staff')) || [];
}

/* ─── Router ────────────────────────────────────────────────────────────── */
export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return err('Invalid JSON body'); }

  const { action } = body;
  console.log(`[api/auth] Action: ${action} | Runtime: ${process.env.NEXT_RUNTIME || 'node'}`);
  
  try {
    // Avoid running DDL/migration checks on hot read paths such as login/logout.
    // On Cloudflare Workers those checks can consume enough CPU to hit resource limits.
    if (SCHEMA_REQUIRED_ACTIONS.has(action)) {
      try {
        await ensureSchema();
      } catch (dbErr) {
        console.error('[api/auth] DB Initialization Failed:', dbErr);
        return err(`Database Initialization Error: ${dbErr.message}`, 500);
      }
    }

    switch (action) {
      case 'login':      return handleLogin(body, request);
      case 'logout':     return handleLogout(request);
      case 'register':   return handleRegister(body, request);
      case 'add_child':  return handleAddChild(body, request);
      case 'edit_user':  return handleEditUser(body, request);
      case 'google':     return handleGoogle(body, request);
      case 'whoami':     return handleWhoami(request);
      case 'forgot':     return handleForgot(body);
      case 'request_otp': return handleRequestOtp(body, request);
      case 'verify_otp_reset': return handleVerifyOtpReset(body, request);
      case 'resetpw':    return handleResetPw(body);
      case 'change_password': return handleChangePassword(body, request);
      case 'delete_user': return handleDeleteUser(body, request);
      default:           return err(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error('[api/auth] Server Error:', e);
    return err(`Internal Server Error: ${e.message}`, 500);
  }
}

export async function GET(request) {
  try {
    const response = await handleWhoami(request);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e) {
    console.error('[api/auth] GET Error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* ─── login ─────────────────────────────────────────────────────────────── */
async function handleLogin({ username, password }, request) {
  console.log(`[api/auth] Login attempt: ${username} (tenant: ${request.headers.get('x-tenant-id') || 'none'})`);
  if (!username || !password) return err('Username and password are required');
  
  let tenantId = request.headers.get('x-tenant-id');
  let user = null;

  // Global login attempt: search across all tenants
  // STRICT INSTITUTIONAL ISOLATION:
  // If we have a specific tenant context, we ONLY search that tenant.
  // This prevents accounts from leaking across portals.
  if (tenantId && tenantId !== 'platform-master') {
    const rows = await query('SELECT * FROM staff WHERE LOWER(username) = ? AND tenant_id = ?', [username.toLowerCase().trim(), tenantId]);
    user = rows[0];

    // Check for super-admin bypass (system-wide control)
    if (!user) {
      const superAdminRows = await query('SELECT * FROM staff WHERE LOWER(username) = ? AND tenant_id = ? AND role = ?', [username.toLowerCase().trim(), 'platform-master', 'super-admin']);
      if (superAdminRows.length > 0) {
        user = superAdminRows[0];
        tenantId = 'platform-master';
      }
    }
    
    if (!user) return err(`Account not found in this school portal. Please confirm you are at the correct institutional URL.`);
    
    // Verify password here on the tenant path — mark it so we don't run expensive PBKDF2 twice
    const match = await verifyPassword(password, user.password);
    if (!match) return err('Incorrect password (Check your credentials)');
    user = { ...user, passwordChecked: true };
  } else {
    // Global Portal Login: Only for users who didn't specify a school
    const rows = await query('SELECT id, tenant_id, name, username, role, password, status FROM staff WHERE LOWER(username) = ?', [username.toLowerCase().trim()]);
    
    if (rows.length === 0) return err('No account found with this username.');

    const matches = [];
    for (const row of rows) {
      if (await verifyPassword(password, row.password)) {
        // Mark as already verified to skip redundant PBKDF2 re-hash below
        matches.push({ ...row, passwordChecked: true });
      }
    }

    if (matches.length === 0) return err('Invalid credentials.');

    // Ambiguity resolution:
    if (matches.length > 1) {
      const choices = await Promise.all(matches.map(async (m) => {
        const profile = await query('SELECT value FROM kv WHERE key = ? AND tenant_id = ?', ['paav_school_profile', m.tenant_id]);
        let name = m.tenant_id;
        try { if(profile[0]) name = JSON.parse(profile[0].value).name; } catch(e){}
        return { id: m.tenant_id, name };
      }));
      return NextResponse.json({ error: 'Multiple accounts found.', choices }, { status: 403 });
    }

    user = matches[0];
    tenantId = user.tenant_id;
  }

  // Final validation
  if (user.status === 'inactive') return err('Your account is deactivated. Contact admin.');
  if (user.status === 'suspended') return err('Your account is suspended.');

  // Soft subscription check — never block existing schools from logging in.
  // Instead, flag expired status so the UI can surface a renewal notice.
  let subscriptionWarning = null;
  if (tenantId !== 'platform-master') {
    try {
      const subRows = await query('SELECT * FROM subscriptions WHERE tenant_id = ?', [tenantId]);
      const sub = subRows[0];
      if (!sub || sub.status !== 'active') {
        subscriptionWarning = 'Your school subscription is inactive. Please contact EduVantage support to renew.';
      } else if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        subscriptionWarning = 'Your school subscription has expired. Please renew to continue enjoying all features.';
      }
    } catch (e) {
      console.warn('[api/auth] Subscription check failed (non-blocking):', e.message);
    }
  }

  // Double check password match if not already verified by smart login
  if (!user.passwordChecked) {
    const match = await verifyPassword(password, user.password);
    if (!match) return err('Incorrect password (Check your credentials)');
  }

  // Prefetch common dashboard data to include in login response
  // We only fetch lightweight branding/config to keep login fast and avoid Edge memory limits.
  let ann = null, hero = null, profile = null, theme = null;
  try {
    [ann, hero, profile, theme] = await Promise.all([
      kvGet('paav_announcement', null, tenantId),
      kvGet('paav_hero_img', null, tenantId),
      kvGet('paav_school_profile', null, tenantId),
      kvGet('paav_theme', null, tenantId)
    ]);
  } catch (err) {
    console.warn('[api/auth] Meta prefetch failed during login:', err.message);
  }

  console.log(`[api/auth] Login successful: ${user.username} (tenant: ${tenantId})`);
  // Use tenantId variable (not user.tenant_id) since it may have been updated for super-admin bypass
  const redirect = tenantId === 'platform-master' ? '/super-admin' : (user.role === 'parent' ? '/parent-home' : '/dashboard');
  const response = NextResponse.json({
    ok: true,
    user: publicUser(user),
    subscriptionWarning,
    redirect,
    initialData: {
      db_paav_announcement: ann,
      db_paav_hero_img: hero,
      db_paav_school_profile: profile,
      db_paav_theme: theme
    }
  });

  await setSessionCookie(user, response);
  return response;
}

/* ─── logout ────────────────────────────────────────────────────────────── */
async function handleLogout() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

/* ─── register ──────────────────────────────────────────────────────────── */
async function handleRegister({ role, name, username, phone, password, links, grade }, request) {
  const session = await getSession();
  
  // 1. Authorization: Only parents can self-register; admins can register staff
  if (!session && role !== 'parent') {
    return err('Unauthorised. Only parents can create accounts without logging in.');
  }
  if (session && !['admin', 'super-admin'].includes(session.role) && role !== 'parent') {
    return err('Forbidden. Only administrators can register staff accounts.');
  }

  if (!name || !password || !username) return err('Name, username and password are required');
  if (password.length < 6) return err('Password must be at least 6 characters');

  const { query, execute } = await import('@/lib/db');
  const { hashPassword } = await import('@/lib/auth');

  // 2. Enforce Admin Limit for Staff
  if (role === 'admin' && session) {
    const adminCountRes = await query('SELECT COUNT(*) as count FROM staff WHERE role = "admin" AND tenant_id = ?', [session.tenantId]);
    if (adminCountRes[0].count >= 4) {
      return err('Limit reached: Maximum of 4 administrators allowed per institution.');
    }
  }

  // 3. Check if username taken GLOBALLY
  const existing = await query('SELECT id FROM staff WHERE LOWER(username) = ?', [username.toLowerCase().trim()]);
  if (existing.length) return err(`Username "${username}" is already taken.`);

  const hashedPassword = await hashPassword(password);
  const userId = (role === 'parent' ? 'p' : 's') + Date.now() + Math.floor(Math.random() * 100);
  const tenantId = session?.tenantId || (links && links[0]?.schoolId);

  if (!tenantId) return err('Institutional context (tenantId) is missing.');

  if (role === 'parent') {
    // Parents can be linked to multiple schools
    for (const link of (links || [])) {
      if (!link.schoolId || !link.adm) continue;
      await execute(
        `INSERT INTO staff (id, tenant_id, name, username, role, phone, password, status, childAdm, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, link.schoolId, name.toUpperCase(), username.toLowerCase(), 'parent', phone, hashedPassword, 'active', link.adm, new Date().toISOString()]
      );
    }
  } else {
    // Staff are registered in the current admin's tenant
    await execute(
      `INSERT INTO staff (id, tenant_id, name, username, role, phone, password, status, grade, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, tenantId, name.toUpperCase(), username.toLowerCase(), role, phone, hashedPassword, 'active', grade || null, new Date().toISOString()]
    );
  }

  return NextResponse.json({ ok: true, username: username.toLowerCase() });
}

/* ─── add_child (logged-in parent links a child from any school) ─────────── */
async function handleAddChild({ schoolId, adm }, request) {
  const session = await getSession();
  if (!session) return err('Unauthorised — please log in first', 401);
  if (session.role !== 'parent') return err('Only parent accounts can link children', 403);
  if (!schoolId || !adm) return err('School and admission number are required');

  try {
    const { execute } = await import('@/lib/db');

    // Use kvGet (tenant-scoped) to verify the learner exists in the target school
    const learnerList = await kvGet('paav6_learners', [], schoolId);
    const learners = Array.isArray(learnerList) ? learnerList : [];
    const learner = learners.find(l => l.adm === adm.trim());
    if (!learner) {
      return err(`Admission number "${adm}" was not found in the selected school. Please verify with the school office.`);
    }

    // Check if this parent↔school link already exists
    const existing = await query(
      'SELECT id, childAdm FROM staff WHERE id = ? AND tenant_id = ?',
      [session.id, schoolId]
    );

    if (existing.length > 0) {
      // Append the new ADM to the existing list if not already there
      const currentAdms = (existing[0].childAdm || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!currentAdms.includes(adm.trim())) {
        currentAdms.push(adm.trim());
        await execute(
          'UPDATE staff SET childAdm = ? WHERE id = ? AND tenant_id = ?',
          [currentAdms.join(','), session.id, schoolId]
        );
      }
    } else {
      // Fetch this parent's own record to copy credentials
      const myRows = await query('SELECT * FROM staff WHERE id = ? LIMIT 1', [session.id]);
      const me = myRows[0];
      if (!me) return err('Your parent record was not found. Please contact support.', 404);

      await execute(
        `INSERT OR IGNORE INTO staff
         (id, tenant_id, name, username, role, phone, password, status, childAdm, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id, schoolId,
          me.name, me.username, 'parent',
          me.phone || '', me.password,
          'active', adm.trim(),
          new Date().toISOString()
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      learner: { name: learner.name, grade: learner.grade, adm: learner.adm }
    });

  } catch (e) {
    console.error('[add_child] Error:', e);
    return err('Failed to link child: ' + (e.message || 'Unknown server error'), 500);
  }
}

/* ─── Google Sign-In ────────────────────────────────────────────────────── */
async function handleGoogle({ idToken }, request) {
  if (!idToken) return err('idToken is required');

  // Verify the Google ID token
  const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
  try {
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!tokenRes.ok) return err('Invalid Google token');
    const payload = await tokenRes.json();

    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return err('Token audience mismatch');
    }

    const email = payload.email;
    const staff = await getStaffList();
    const user  = staff.find(s => s.email?.toLowerCase() === email?.toLowerCase());

    if (!user) {
      return err(`No portal account found for ${email}. Contact admin.`);
    }
    if (user.status === 'inactive') return err('Account deactivated');

    const response = NextResponse.json({ ok: true, user: publicUser(user) });
    await setSessionCookie(user, response);
    
    // Log activity
    const { logAction } = await import('@/lib/db');
    await logAction(user, 'Login', `Logged in from ${request.headers.get('user-agent') || 'unknown'}`);

    return response;

  } catch (e) {
    return err('Google sign-in failed: ' + e.message, 500);
  }
}

/* ─── whoami ────────────────────────────────────────────────────────────── */
async function handleWhoami() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, user: null }, { status: 401 });

  // Fetch fresh user data from DB to include avatar, color, etc.
  const { query } = await import('@/lib/db');
  
  // For parents, we need to find ALL rows in the staff table across all tenants
  const rows = await query('SELECT * FROM staff WHERE id = ?', [session.id]);
  const user = rows.find(r => r.tenant_id === session.tenantId) || rows[0];
  
  if (user) {
    // If parent, include all school links
    const links = user.role === 'parent' ? rows.map(r => ({ tenantId: r.tenant_id, adm: r.childAdm })) : [];
    
    let ann = null, hero = null, profile = null, theme = null;
    try {
      [ann, hero, profile, theme] = await Promise.all([
        kvGet('paav_announcement', null, session.tenantId),
        kvGet('paav_hero_img', null, session.tenantId),
        kvGet('paav_school_profile', null, session.tenantId),
        kvGet('paav_theme', null, session.tenantId)
      ]);
    } catch (err) {
      console.warn('[api/auth] Meta prefetch failed during whoami:', err.message);
    }

    return NextResponse.json({
      ok: true,
      user: { ...publicUser(user), links },
      initialData: {
        db_paav_announcement: ann,
        db_paav_hero_img: hero,
        db_paav_school_profile: profile,
        db_paav_theme: theme
      }
    });
  }

  // Fallback if not found in staff (e.g. parent/learner logic)
  if (session.role === 'parent') {
    const { getLearner } = await import('@/lib/db');
    const learner = await getLearner(session.username, session.tenantId);
    if (learner) return NextResponse.json({ ok: true, user: { ...session, avatar: learner.avatar, emoji: ROLE_EMOJI.parent, color: ROLE_COLOR.parent } });
  }

  return NextResponse.json({ ok: true, user: session });
}

/* ─── change password ───────────────────────────────────────────────────── */
async function handleChangePassword({ current, next }, request) {
  const session = await getSession();
  if (!session) return err('Unauthorised', 401);

  const { query, execute } = await import('@/lib/db');
  const rows = await query('SELECT password FROM staff WHERE id = ? AND tenant_id = ?', [session.id, session.tenantId]);
  const user = rows[0];
  if (!user) return err('User not found');

  const match = await verifyPassword(current, user.password);
  if (!match) return err('Incorrect current password');

  const hashed = await hashPassword(next);
  await execute('UPDATE staff SET password = ? WHERE id = ? AND tenant_id = ?', [hashed, session.id, session.tenantId]);
  
  return ok({ message: 'Password updated' });
}

/* ─── forgot password ───────────────────────────────────────────────────── */
async function handleForgot({ username, secQ, secA }) {
  if (!username) return err('Username is required');
  const { query } = await import('@/lib/db');
  const rows = await query('SELECT * FROM staff WHERE LOWER(username) = ?', [username.toLowerCase()]);
  const user = rows[0];
  if (!user) return err('User not found');

  if (secQ && secA) {
    // Verify security Q&A
    const match = user.secQ === secQ && user.secA?.toLowerCase() === secA?.toLowerCase();
    return NextResponse.json({ ok: match, eligible: match });
  }

  // Just return what security question they set
  return NextResponse.json({ ok: true, secQ: user.secQ || null, hasPhone: !!user.phone });
}

/* ─── reset password ────────────────────────────────────────────────────── */
async function handleResetPw({ username, newPassword, secA }) {
  if (!username || !newPassword) return err('username and newPassword are required');
  if (newPassword.length < 8)    return err('Password must be at least 8 characters');

  // Fix: Use direct SQL query instead of loading/mutating the entire KV staff list
  const { query: dbQuery, execute: dbExecute } = await import('@/lib/db');
  const rows = await dbQuery('SELECT * FROM staff WHERE LOWER(username) = ?', [username.toLowerCase()]);
  if (rows.length === 0) return err('User not found');

  const user = rows[0];
  if (secA && user.secA?.toLowerCase() !== secA.toLowerCase()) {
    return err('Security answer is incorrect');
  }

  const hashed = await hashPassword(newPassword);
  // Update directly in the relational table — safe, atomic, and scalable
  await dbExecute(
    'UPDATE staff SET password = ? WHERE LOWER(username) = ?',
    [hashed, username.toLowerCase()]
  );
  return NextResponse.json({ ok: true });
}

/* ─── OTP Based Reset ─────────────────────────────────────────────────── */
async function handleRequestOtp(body, request) {
  const { username } = body;
  if (!username) return err('Username is required');
  const tid = request.headers.get('x-tenant-id') || 'platform-master';
  
  // Search for the user globally (usernames are unique)
  const rows = await query('SELECT name, phone, tenant_id FROM staff WHERE LOWER(username) = ?', [username.toLowerCase()]);
  const user = rows[0];
  
  if (!user) return err('Account not found. Please check your username.');
  
  // If we are in a specific tenant context, verify the user belongs here OR is a super-admin
  if (tid !== 'platform-master' && user.tenant_id !== tid) {
    // Optionally log this mismatch for security audit, but we allow the reset to proceed globally
    console.warn(`[OTP] Password reset requested for ${username} from ${tid}, but user belongs to ${user.tenant_id}. Allowing global reset.`);
  }
  
  // If phone is provided in body, verify it matches
  if (body.phone) {
    const provided = body.phone.replace(/\D/g, '').slice(-9); // Match last 9 digits to handle +254/07
    const stored = (user.phone || '').replace(/\D/g, '').slice(-9);
    if (provided !== stored) {
      return err('The phone number provided does not match our records for this account.');
    }
  } else if (!user.phone) {
    return err('No phone number linked to this account. Contact admin.');
  }

  const otp = Math.floor(100000 + Math.random() * 899999).toString();
  
  // Store OTP in global platform-master KV with 10 min expiry, including the user's real tenant_id and ID
  const otpData = { otp, expires: Date.now() + 10 * 60 * 1000, tenantId: user.tenant_id, userId: user.id };
  await kvSet(`otp_reset_${username.toLowerCase()}`, otpData, 'platform-master');
  
  // Log the OTP request - fix: pass 'id' and use 'tenantId' (camelCase) to avoid 500 error in logAction
  await logAction({ id: user.id, tenantId: user.tenant_id, username: username.toLowerCase(), name: user.name, role: 'none' }, 'OTP Request', `OTP requested for password reset by ${username}`);

  // Send SMS
  let smsRes = { success: false, error: 'Not attempted' };
  try {
    const { sendSMS } = await import('@/lib/sms-client');
    // Use user's specific tenant credentials for SMS if available, fallback to platform-master
    const atCreds = (await kvGet('paav_at_creds', null, user.tenant_id)) || (await kvGet('paav_at_creds', null, 'platform-master'));
    
    smsRes = await sendSMS({
      to: user.phone,
      message: `EduVantage Password Reset\nHello ${user.name},\nYour reset OTP is: ${otp}.\nValid for 10 minutes.`,
      ...(atCreds || {})
    });
  } catch (smsErr) {
    console.error('[OTP] SMS Fetch/Library Error:', smsErr.message);
    smsRes = { success: false, error: smsErr.message };
  }

  if (!smsRes.success) {
    console.warn(`[OTP] SMS Failed for ${username}: ${smsRes.error}. OTP is: ${otp} (Logged for recovery)`);
    
    // In dev/sandbox or if explicitly requested, we could return a more helpful error
    if (smsRes.error?.includes('API key not configured')) {
      return err('SMS Gateway not configured. Please contact your school administrator to set up Africa\'s Talking credentials.');
    }
    return err(`Failed to send SMS code: ${smsRes.error}. Please try again later.`);
  }

  return ok({ message: `OTP sent to your phone ending in ${user.phone.slice(-3)}`, sent: true });
}

async function handleVerifyOtpReset({ username, otp, newPassword }, request) {
  if (!username || !otp || !newPassword) return err('Missing required fields');

  // Retrieve OTP from global platform-master KV
  const stored = await kvGet(`otp_reset_${username.toLowerCase()}`, null, 'platform-master');
  if (!stored) return err('OTP expired or not requested.');
  if (stored.otp !== otp) return err('Invalid OTP code.');
  if (Date.now() > stored.expires) return err('OTP has expired.');

  const hashed = await hashPassword(newPassword);
  const { execute } = await import('@/lib/db');
  
  // Use the tenantId that was stored with the OTP
  const targetTid = stored.tenantId || 'platform-master';
  await execute('UPDATE staff SET password = ? WHERE LOWER(username) = ? AND tenant_id = ?', [hashed, username.toLowerCase(), targetTid]);

  // Clear OTP
  const { kvSet: kvSetInternal, logAction: logActionInternal } = await import('@/lib/db');
  await kvSetInternal(`otp_reset_${username.toLowerCase()}`, null, 'platform-master');

  // Log success
  await logActionInternal({ id: stored.userId || 'none', tenantId: targetTid, username: username.toLowerCase(), name: username, role: 'none' }, 'Password Reset', 'Password reset successful via OTP verification');

  return ok({ message: 'Password reset successful. You can now login.' });
}

/* ─── Admin edit user ───────────────────────────────────────────────────── */
async function handleEditUser({ id, name, role, grade, phone, status, password, avatar }, request) {
  const session = await getSession();
  if (!session) return err('Unauthorised', 401);
  
  // Only admins can edit others; users can edit themselves
  if (!['admin', 'super-admin'].includes(session.role) && session.id !== id) {
    return err('Forbidden: You can only edit your own profile', 403);
  }

  // Certain fields are Admin-only
  if (!['admin', 'super-admin'].includes(session.role)) {
    if (role || status || grade !== undefined) {
      return err('Forbidden: Only administrators can change roles, status, or grades', 403);
    }
  }

  const { query, kvUpdateStaffProfile } = await import('@/lib/db');
  const rows = await query('SELECT * FROM staff WHERE id = ? AND tenant_id = ?', [id, session.tenantId]);
  const existing = rows[0];
  if (!existing) return err('User not found');

  const finalName = name ? name.toUpperCase() : existing.name;
  const finalPhone = phone || existing.phone;
  const finalAvatar = avatar !== undefined ? avatar : existing.avatar;
  
  let hashedPassword = null;
  if (password && password.length >= 6) {
    hashedPassword = await hashPassword(password);
  }

  // Update directly in the relational table
  // And touch the KV timestamp to invalidate client cache
  await kvUpdateStaffProfile(id, finalName, finalPhone, finalAvatar, hashedPassword, session.tenantId);

  // If Admin is updating other fields (role, status, grade)
  if (session.role === 'admin' && (role || status || grade !== undefined)) {
    const finalRole = role || existing.role;
    const finalStatus = status || existing.status;
    const finalGrade = grade !== undefined ? grade : existing.grade;

    if (finalRole === 'admin' && existing.role !== 'admin') {
      const adminCountRes = await query('SELECT COUNT(*) as count FROM staff WHERE role = "admin" AND tenant_id = ?', [session.tenantId]);
      if (adminCountRes[0].count >= 4) {
        return err('Limit reached: Maximum of 4 administrators allowed per institution.');
      }
    }

    const { execute } = await import('@/lib/db');
    await execute('UPDATE staff SET role = ?, status = ?, grade = ? WHERE id = ? AND tenant_id = ?', [finalRole, finalStatus, finalGrade, id, session.tenantId]);
  }

  return NextResponse.json({ ok: true });
}

/* ─── Admin delete user ─────────────────────────────────────────────────── */
async function handleDeleteUser({ id }, request) {
  const session = await getSession();
  if (!session) return err('Unauthorised', 401);
  if (!['admin', 'super-admin'].includes(session.role)) return err('Forbidden: Only administrators can delete users', 403);
  if (session.id === id) return err('Conflict: You cannot delete your own account', 409);

  try {
    await kvDeleteStaff(id, session.tenantId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err('Failed to delete user: ' + e.message, 500);
  }
}
function publicUser(u) {
  const { password, secA, ...safe } = u;  // never send password or secret answer
  return { ...safe, emoji: ROLE_EMOJI[u.role] || '👤', color: ROLE_COLOR[u.role] };
}
