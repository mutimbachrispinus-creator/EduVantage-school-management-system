import { NextResponse } from 'next/server';
import { kvGet, kvSet, execute, query } from '@/lib/db';
import { getPesapalConfig, getPesapalToken, registerIPN, submitOrder, getTransactionStatus } from '@/lib/pesapal';

/**
 * Pesapal API Handler
 * 
 * ACTIONS:
 *   - initiate: Creates an order and returns redirect_url
 *   - callback: Handles user redirect (Success/Cancel)
 *   - ipn: Handles backend status notifications
 */

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'initiate') {
    return handleInitiate(request);
  } else if (action === 'ipn') {
    return handleIPN(request);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'callback') {
    return handleCallback(request);
  } else if (action === 'status') {
    const orderTrackingId = searchParams.get('OrderTrackingId');
    return handleStatusCheck(orderTrackingId);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/* ─── Handlers ───────────────────────────────────────────────────────────── */

async function handleInitiate(request) {
  try {
    const { registrationPayload, subscriptionPayload, amount, currency = 'KES', tenantId } = await request.json();
    const config = await getPesapalConfig(kvGet, tenantId);
    const token = await getPesapalToken(config);
    
    // Determine payload and metadata
    const payload = registrationPayload || subscriptionPayload;
    const type = registrationPayload ? 'registration' : 'subscription';
    const schoolName = payload.schoolName || payload.tenantId || 'EduVantage Client';

    // 1. Ensure IPN is registered
    const host = request.headers.get('host');
    const proto = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;
    
    let ipnId = await kvGet('pesapal_ipn_id', null, 'platform-master');
    if (!ipnId) {
      ipnId = await registerIPN(config, token, `${baseUrl}/api/pesapal?action=ipn`);
      await kvSet('pesapal_ipn_id', ipnId, 'platform-master');
    }

    // 2. Submit Order
    const merchantRef = `${type.toUpperCase().slice(0,3)}-${Date.now()}`;
    const orderData = {
      id: merchantRef,
      amount: parseFloat(amount),
      currency: currency,
      description: `${type === 'registration' ? 'Registration' : 'Subscription Renewal'} for ${schoolName}`,
      callback_url: `${baseUrl}/api/pesapal?action=callback`,
      notification_id: ipnId,
      billing_address: {
        email_address: payload.email || 'info@eduvantage.com',
        phone_number: payload.phone,
        country_code: 'KE',
        first_name: payload.adminName || payload.tenantId,
        middle_name: '',
        last_name: '',
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        postal_code: '',
        zip_code: ''
      }
    };

    const orderRes = await submitOrder(config, token, orderData);

    // 3. Store pending data
    await kvSet(`pesapal_pending_${orderRes.order_tracking_id}`, {
      type,
      payload,
      amount: parseFloat(amount),
      merchantRef,
      createdAt: Date.now()
    }, 'platform-master');

    return NextResponse.json({ ok: true, ...orderRes });
  } catch (e) {
    console.error('[Pesapal] Initiate Error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

async function handleCallback(request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId = searchParams.get('OrderTrackingId');
  
  const pending = await kvGet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
  const type = pending?.type || 'registration';

  const host = request.headers.get('host');
  const proto = host.includes('localhost') ? 'http' : 'https';
  
  const redirectUrl = type === 'registration' 
    ? `${proto}://${host}/saas/signup?processing=true&orderId=${orderTrackingId}`
    : `${proto}://${host}/billing?processing=true&orderId=${orderTrackingId}`;

  return NextResponse.redirect(redirectUrl);
}

async function handleIPN(request) {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = await request.json();
    console.log(`[Pesapal IPN] Received: ${OrderTrackingId} | Type: ${OrderNotificationType}`);

    const config = await getPesapalConfig(kvGet);
    const token = await getPesapalToken(config);
    const status = await getTransactionStatus(config, token, OrderTrackingId);

    if (status.payment_status_description === 'Completed') {
      await finalizeRegistration(OrderTrackingId);
    }

    // Pesapal expects a specific response for IPNs
    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200
    });
  } catch (e) {
    console.error('[Pesapal IPN] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function handleStatusCheck(orderTrackingId) {
  if (!orderTrackingId) return NextResponse.json({ ok: false, error: 'Missing ID' });
  
  try {
    const config = await getPesapalConfig(kvGet);
    const token = await getPesapalToken(config);
    const status = await getTransactionStatus(config, token, orderTrackingId);

    if (status.payment_status_description === 'Completed') {
      const result = await finalizeRegistration(orderTrackingId);
      return NextResponse.json({ ok: true, status: 'Completed', ...result });
    }

    return NextResponse.json({ ok: true, status: status.payment_status_description });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

async function finalizeRegistration(orderTrackingId) {
  const pending = await kvGet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
  if (!pending) return { message: 'Already processed or not found' };

  const { payload, type, amount } = pending;
  
  if (type === 'subscription') {
    const tenantId = payload.tenantId;
    const planId = payload.planId;
    
    // AUTOMATED SUBSCRIPTION ACTIVATION for existing school
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const planData = (gConf.plans || []).find(p => p.id === planId);
    const cycle = planData?.cycle || 'termly';
    
    const countRes = await query('SELECT COUNT(*) as total FROM learners WHERE tenant_id = ?', [tenantId]);
    const studentCount = countRes[0]?.total || 0;
    
    const subRows = await query('SELECT expires_at FROM subscriptions WHERE tenant_id = ?', [tenantId]);
    const currentExpiry = subRows[0]?.expires_at ? new Date(subRows[0].expires_at) : null;
    const expiresAt = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
    if (cycle === 'annually' || cycle === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 4);
    
    const limit = planData?.billingModel === 'per-learner' ? Math.max(studentCount, 1) : 99999;

    await execute(`
      INSERT INTO subscriptions (tenant_id, plan, status, expires_at, learner_limit, billing_model, cycle, amount, updated_at)
      VALUES (?, ?, 'active', ?, ?, ?, ?, ?, strftime('%s','now'))
      ON CONFLICT(tenant_id) DO UPDATE SET 
        status = 'active', 
        expires_at = excluded.expires_at, 
        plan = excluded.plan,
        learner_limit = excluded.learner_limit,
        billing_model = excluded.billing_model,
        cycle = excluded.cycle,
        amount = excluded.amount,
        updated_at = excluded.updated_at
    `, [
      tenantId, 
      planId, 
      expiresAt.toISOString(),
      limit,
      planData?.billingModel || 'per-learner',
      cycle,
      amount || 0
    ]);

    await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
    return { message: 'Subscription updated successfully', loginUrl: '/billing' };
  }

  // Registration Flow
  const tenantId = payload.schoolName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

  const [existingTenant, existingUser] = await Promise.all([
    query('SELECT tenant_id FROM subscriptions WHERE tenant_id = ?', [tenantId]),
    query('SELECT id FROM staff WHERE LOWER(username) = ?', [String(payload.adminUsername || '').toLowerCase().trim()])
  ]);
  if (existingTenant.length) {
    await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
    return { message: 'A school with a similar name already exists. Please contact support to attach this payment to the correct school.' };
  }
  if (existingUser.length) {
    await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
    return { message: 'The selected admin username is already taken. Please contact support to finish activation with a new username.' };
  }
  
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  await execute(`
    INSERT INTO subscriptions (tenant_id, plan, status, expires_at, learner_limit, billing_model, cycle, amount, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(tenant_id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at
  `, [
    tenantId, 
    payload.plan || 'premium-learner', 
    'active', 
    oneYearFromNow.toISOString(),
    500, 
    'per-learner', 
    'annually', 
    amount || payload.amount || 0
  ]);

  const now = Math.floor(Date.now() / 1000);
  await execute(
    'INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    ['paav_school_profile', tenantId, JSON.stringify({
      name: payload.schoolName,
      phone: payload.phone || '',
      email: payload.email || '',
      logo: '',
      motto: 'Quality Education',
      curriculum: payload.curriculum || 'CBC'
    }), now]
  );
  await execute(
    'INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    ['paav_theme', tenantId, JSON.stringify({ primary: '#10B981', secondary: '#0F172A', accent: '#1E293B' }), now]
  );

  const { hashPassword } = await import('@/lib/auth');
  const hp = await hashPassword(payload.adminPassword);
  await execute(`
    INSERT INTO staff (id, tenant_id, name, username, role, password, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
  `, [
    `staff_${crypto.randomUUID()}`, 
    tenantId, 
    payload.adminName, 
    payload.adminUsername, 
    'admin', 
    hp, 
    'active'
  ]);

  // Send Zeraki-style Welcome SMS with merged credential fallback
  try {
    const { sendSMS } = await import('@/lib/sms-client');
    const [legacyAtCreds, intKeys] = await Promise.all([
      kvGet('paav_at_creds', null, 'platform-master').catch(() => null),
      kvGet('paav_integration_keys', {}, 'platform-master').catch(() => ({}))
    ]);
    const atCreds = {
      username: legacyAtCreds?.username || intKeys?.atUsername,
      apiKey:   legacyAtCreds?.apiKey   || intKeys?.atApiKey,
      senderId: legacyAtCreds?.senderId || intKeys?.atSenderId,
    };
    const welcomeMsg = 
      `Welcome to EduVantage!\n` +
      `Hello ${payload.adminName}, your school portal for ${payload.schoolName} is ready.\n` +
      `Username: ${payload.adminUsername}\n` +
      `Login: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduvantage.app'}/login?tenant=${tenantId}`;
    
    await sendSMS({ to: payload.phone, message: welcomeMsg, schoolName: payload.schoolName, ...atCreds });
  } catch (smsErr) {
    console.warn('[Pesapal] Welcome SMS failed:', smsErr.message);
  }

  await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
  return { 
    message: 'Institution activated successfully', 
    loginUrl: `/login?tenant=${tenantId}&username=${payload.adminUsername}`
  };
}
