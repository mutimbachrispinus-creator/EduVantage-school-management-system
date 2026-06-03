
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';

const MASTER_TENANT = 'platform-master';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const config = await kvGet('paav_global_config', {
    platformName: 'EduVantage Platform',
    platformMotto: 'The Future of Education Management',
    smsGateway: { apiKey: '', username: '', senderId: '' },
    pricing: { basic: 25000, premium: 50000 },
    plans: [
      { id: 'trial', name: '30-Day Trial', price: 0, cycle: 'once', billingModel: 'flat', features: ['All Modules', 'Support'] },
      { id: 'free-term', name: '1 Term Free', price: 0, cycle: 'once', billingModel: 'flat', features: ['Full Access', 'Curriculum Aware', '1 Term Only'] },
      { id: 'basic', name: 'Basic (Flat)', price: 25000, cycle: 'termly', billingModel: 'flat', features: ['Academic Grading', 'SMS alerts'] },
      { id: 'premium-learner', name: 'Premium (Per Learner)', price: 55, cycle: 'termly', billingModel: 'per-learner', features: ['Everything in Basic', 'M-Pesa Sync', 'Finance'] },
      { id: 'annual-learner', name: 'Annual (Per Learner)', price: 45, cycle: 'annually', billingModel: 'per-learner', features: ['Full Year Access', 'Discounted Rate'] }
    ],
    platformPayments: [
      { type: 'Paybill', name: 'M-Pesa Subscription', shortcode: '400200', account: 'EDUVANTAGE' }
    ],
    pesapal: { consumerKey: '', consumerSecret: '', env: 'sandbox' },
    maintenanceMode: false
  }, MASTER_TENANT);

  let announcement = await kvGet('paav_global_announcement', null, MASTER_TENANT);
  
  // Security: Filter sensitive platform configuration for regular users
  if (session.tenantId !== MASTER_TENANT && session.role !== 'super-admin') {
    return NextResponse.json({ 
      announcement, 
      config: { 
        platformName: config.platformName, 
        platformMotto: config.platformMotto,
        plans: config.plans,
        platformPayments: config.platformPayments
      } 
    });
  }

  return NextResponse.json({ config, announcement });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || (session.tenantId !== MASTER_TENANT && session.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const { action, payload } = await request.json();

    if (action === 'save_config') {
      await kvSet('paav_global_config', payload, MASTER_TENANT);
      // Also update the school profile for the master tenant for branding
      await kvSet('paav_school_profile', { name: payload.platformName, motto: payload.platformMotto }, MASTER_TENANT);
      // Sync SMS gateway credentials to the key all SMS routes read from
      if (payload.smsGateway) {
        await kvSet('paav_at_creds', payload.smsGateway, MASTER_TENANT);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'save_announcement') {
      await kvSet('paav_global_announcement', payload, MASTER_TENANT);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
