export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { execute, query, batch } from '@/lib/db';

/**
 * POST /api/saas/signup
 * Onboards a new school with a 30-day free trial.
 */
export async function POST(request) {
  try {
    const { schoolName, adminName, adminUsername, adminPassword, phone, email, curriculum, plan } = await request.json();
    const selectedPlan = plan || 'trial';

    if (!schoolName || !adminName || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Generate a slug-like tenant ID
    const tenantId = schoolName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

    // Check if tenant already exists
    const existingTenant = await query('SELECT tenant_id FROM subscriptions WHERE tenant_id = ?', [tenantId]);
    if (existingTenant.length) {
      return NextResponse.json({ error: 'A school with a similar name already exists. Please choose a slightly different name.' }, { status: 409 });
    }

    // Check if adminUsername is taken globally (Zeraki-style global identity)
    const existingUser = await query('SELECT id FROM staff WHERE LOWER(username) = ?', [adminUsername.toLowerCase().trim()]);
    if (existingUser.length) {
      return NextResponse.json({ error: `The username "${adminUsername}" is already taken. Please choose a different admin username.` }, { status: 409 });
    }

    // Prepare initial data
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date();
    
    // Fetch global config to get plan cycle
    const { kvGet } = await import('@/lib/db');
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
      // 1. Create Subscription (Trial)
      {
        sql: 'INSERT INTO subscriptions (tenant_id, plan, status, expires_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [tenantId, selectedPlan, 'active', expiresAt.toISOString(), now]
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
