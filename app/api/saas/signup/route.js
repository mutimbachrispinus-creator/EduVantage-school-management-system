export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { execute, query, batch } from '@/lib/db';

/**
 * POST /api/saas/signup
 * Onboards a new school with a 30-day free trial.
 */
export async function POST(request) {
  try {
    const { schoolName, adminName, adminUsername, adminPassword, phone, email, curriculum, plan, estimatedStudents } = await request.json();
    const selectedPlan = plan || 'trial';

    if (!schoolName || !adminName || !adminUsername || !adminPassword || !phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // 0. Verify OTP Status
    const { kvGet } = await import('@/lib/db');
    const otpStatus = await kvGet(`reg_otp_verified_${phone.replace(/\D/g, '')}`, null, 'platform-master');
    if (!otpStatus || !otpStatus.verified) {
      return NextResponse.json({ error: 'Phone number not verified. Please request and verify OTP first.' }, { status: 403 });
    }

    // Generate a slug-like tenant ID
    const tenantId = schoolName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

    // Check if tenant already exists
    const existingTenant = await query('SELECT tenant_id FROM subscriptions WHERE tenant_id = ?', [tenantId]);
    if (existingTenant.length) {
      return NextResponse.json({ error: 'A school with a similar name already exists. Please choose a slightly different name.' }, { status: 409 });
    }

    // Check if adminUsername is taken globally (Unified global identity)
    const existingUser = await query('SELECT id FROM staff WHERE LOWER(username) = ?', [adminUsername.toLowerCase().trim()]);
    if (existingUser.length) {
      return NextResponse.json({ error: `The username "${adminUsername}" is already taken. Please choose a different admin username.` }, { status: 409 });
    }

    // Prepare initial data
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date();
    
    // Fetch global config to get plan cycle
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const planData = (gConf.plans || []).find(p => p.id === selectedPlan);
    const cycle = planData?.cycle || 'termly';

    if (selectedPlan === 'trial') {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30-day trial
    } else if (selectedPlan === 'free-term') {
      expiresAt.setMonth(expiresAt.getMonth() + 4); // 4 months for one term
    } else if (cycle === 'annually' || cycle === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1-year subscription
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 4); // 4 months for termly
    }

    const schoolProfile = JSON.stringify({
      name: schoolName,
      phone: phone || '',
      email: email || '',
      logo: '',
      motto: 'Quality Education',
      curriculum: curriculum || 'CBC'
    });

    const defaultTheme = JSON.stringify({
      primary: '#10B981',
      secondary: '#0F172A',
      accent: '#1E293B'
    });

    const { hashPassword } = await import('@/lib/auth');
    const hashedPassword = await hashPassword(adminPassword);

    // Atomic setup of the new tenant
    await batch([
      // 1. Create Subscription — learner_limit is NULL (unlimited).
      // registered_learners records initial headcount for renewal billing purposes.
      {
        sql: 'INSERT INTO subscriptions (tenant_id, plan, status, amount, billing_model, cycle, expires_at, learner_limit, registered_learners, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)',
        args: [
          tenantId, 
          selectedPlan, 
          'active', 
          planData?.price || 0, 
          planData?.billingModel || 'flat', 
          cycle, 
          expiresAt.toISOString(), 
          parseInt(estimatedStudents) || 0, 
          now
        ]
      },
      // 2. Create first Admin user
      {
        sql: `INSERT INTO staff (id, tenant_id, name, username, role, phone, password, status, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['admin-1', tenantId, adminName, adminUsername.toLowerCase().trim(), 'admin', phone || '', hashedPassword, 'active', new Date().toISOString()]
      },
      // 3. Set School Profile
      {
        sql: 'INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?)',
        args: ['paav_school_profile', tenantId, schoolProfile, now]
      },
      // 4. Set School Theme
      {
        sql: 'INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?)',
        args: ['paav_theme', tenantId, defaultTheme, now]
      }
    ]);
    
    // 5. QUEUING: Send Zeraki-style Welcome SMS in the background
    const { backgroundTask } = await import('@/lib/background-tasks');
    backgroundTask(request, async () => {
      try {
        const { sendSMS, normalizePhone } = await import('@/lib/sms-client');
        const atCreds = await kvGet('paav_at_creds', null, 'platform-master');
        const welcomeMsg = 
          `🚀 Welcome to EduVantage!\n` +
          `Hello ${adminName}, your school portal for ${schoolName} is ready.\n` +
          `Username: ${adminUsername}\n` +
          `Login: ${process.env.NEXT_PUBLIC_SITE_URL}/login?tenant=${tenantId}`;
        
        await sendSMS({ to: normalizePhone(phone), message: welcomeMsg, ...(atCreds || {}) });
        console.log(`[Background] Welcome SMS sent for tenant ${tenantId}`);
      } catch (smsErr) {
        console.warn('[Signup Background] Welcome SMS failed:', smsErr.message);
      }
    });

    return NextResponse.json({ 
      ok: true, 
      tenantId, 
      message: `School registered successfully! You are on the ${planData?.name || selectedPlan} plan.`,
      loginUrl: `/login?tenant=${tenantId}`
    });

  } catch (err) {
    console.error('[api/saas/signup] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
