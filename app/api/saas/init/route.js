export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { batch } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * GET /api/saas/init
 * One-time setup for the Platform Master.
 */
export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const hashedPw = await hashPassword('Junior@#1'); // Requested password
    
    await batch([
      // 1. Create Master Tenant
      {
        sql: "INSERT INTO subscriptions (tenant_id, plan, status, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        args: ['platform-master', 'infinite', 'active', now]
      },
      // 2. Create Super Admin
      {
        sql: "DELETE FROM staff WHERE id = ? AND tenant_id = ?",
        args: ['sa-1', 'platform-master']
      },
      {
        sql: `INSERT INTO staff (id, tenant_id, name, username, role, password, status, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['sa-1', 'platform-master', 'MUTIMBA JUNIOR', 'mutimba.junior', 'super-admin', hashedPw, 'active', new Date().toISOString()]
      },
      // 3. Set Master Branding
      {
        sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value=excluded.value",
        args: ['paav_school_profile', 'platform-master', JSON.stringify({ name: 'EduVantage School Management Platform', motto: 'The Future of Education Management' }), now]
      },
      {
        sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value=excluded.value",
        args: ['paav_theme', 'platform-master', JSON.stringify({ primary: '#4F46E5', secondary: '#D4AF37', accent: '#1E293B' }), now]
      },
      // 4. Ensure EduVantage Gitombo Branding
      {
        sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value=excluded.value",
        args: ['paav_school_profile', 'paav-gitombo', JSON.stringify({ name: 'Gitombo School', motto: 'Quality Education for Every Child', phone: '0700000000', email: 'portal@eduvantage.app', logo: '/ev-brand-v3.png' }), now]
      },
      {
        sql: "INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value=excluded.value",
        args: ['paav_theme', 'paav-gitombo', JSON.stringify({ primary: '#8B1A1A', secondary: '#F4A460', accent: '#1E293B' }), now]
      },
      // 5. Upgrade PAAV Gitombo to Premium Full Year
      {
        sql: "INSERT INTO subscriptions (tenant_id, plan, status, expires_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(tenant_id) DO UPDATE SET plan=excluded.plan, expires_at=excluded.expires_at",
        args: ['paav-gitombo', 'Premium', 'active', '2027-05-01', now]
      }
    ]);

    return NextResponse.json({ 
      ok: true, 
      message: 'Platform Master Initialized with custom credentials!',
      username: 'mutimba.junior',
      password: 'Junior@#1',
      loginUrl: `/login?tenant=platform-master`
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
