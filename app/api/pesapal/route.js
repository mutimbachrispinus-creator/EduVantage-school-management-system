export const runtime = 'edge';
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
    const { registrationPayload, subscriptionPayload, amount, currency = 'KES' } = await request.json();
    const config = await getPesapalConfig(kvGet);
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

  const { payload, type } = pending;
  
  if (type === 'subscription') {
    const tenantId = payload.tenantId;
    const planId = payload.planId;
    
    // AUTOMATED SUBSCRIPTION ACTIVATION for existing school
    const gConf = await kvGet('paav_global_config', {}, 'platform-master');
    const planData = (gConf.plans || []).find(p => p.id === planId);
    const cycle = planData?.cycle || 'termly';
    
    const expiresAt = new Date();
    if (cycle === 'annually' || cycle === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 4);

    await execute(`
      INSERT INTO subscriptions (tenant_id, plan, status, expires_at, updated_at)
      VALUES (?, ?, 'active', ?, strftime('%s','now'))
      ON CONFLICT(tenant_id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at, plan = excluded.plan
    `, [tenantId, planId, Math.floor(expiresAt.getTime() / 1000)]);

    await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
    return { message: 'Subscription updated successfully', loginUrl: '/billing' };
  }

  // Registration Flow
  const tenantId = payload.schoolName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
  
  await execute(`
    INSERT INTO subscriptions (tenant_id, plan, status, expires_at, learner_limit, billing_model, cycle, amount, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(tenant_id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at
  `, [
    tenantId, 
    payload.plan || 'premium-learner', 
    'active', 
    Math.floor(Date.now()/1000) + (365 * 24 * 3600),
    500, 
    'per-learner', 
    'annually', 
    payload.amount || 0
  ]);

  const { hashPassword } = await import('@/lib/auth');
  const hp = await hashPassword(payload.adminPassword);
  await execute(`
    INSERT INTO staff (id, tenant_id, name, username, role, password, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
  `, [
    `staff_${Date.now()}`, 
    tenantId, 
    payload.adminName, 
    payload.adminUsername, 
    'admin', 
    hp, 
    'active'
  ]);

  // Send Zeraki-style Welcome SMS
  try {
    const { sendSMS } = await import('@/lib/sms-client');
    const atCreds = await kvGet('paav_at_creds', null, 'platform-master');
    const welcomeMsg = 
      `🚀 Welcome to EduVantage!\n` +
      `Hello ${payload.adminName}, your school portal for ${payload.schoolName} is ready.\n` +
      `Username: ${payload.adminUsername}\n` +
      `Login: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduvantage.app'}/login?tenant=${tenantId}`;
    
    await sendSMS({ to: payload.phone, message: welcomeMsg, ...(atCreds || {}) });
  } catch (smsErr) {
    console.warn('[Pesapal] Welcome SMS failed:', smsErr.message);
  }

  await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
  return { 
    message: 'Institution activated successfully', 
    loginUrl: `/login?tenant=${tenantId}&username=${payload.adminUsername}`
  };
}
