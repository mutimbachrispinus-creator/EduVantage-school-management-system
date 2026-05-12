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
    const { registrationPayload, amount, currency = 'KES' } = await request.json();
    const config = await getPesapalConfig(kvGet);
    const token = await getPesapalToken(config);

    // 1. Ensure IPN is registered
    const host = request.headers.get('host');
    const proto = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;
    
    // We should ideally cache the IPN ID
    let ipnId = await kvGet('pesapal_ipn_id', null, 'platform-master');
    if (!ipnId) {
      ipnId = await registerIPN(config, token, `${baseUrl}/api/pesapal?action=ipn`);
      await kvSet('pesapal_ipn_id', ipnId, 'platform-master');
    }

    // 2. Submit Order
    const merchantRef = `REG-${Date.now()}`;
    const orderData = {
      id: merchantRef,
      amount: parseFloat(amount),
      currency: currency,
      description: `Registration for ${registrationPayload.schoolName}`,
      callback_url: `${baseUrl}/api/pesapal?action=callback`,
      notification_id: ipnId,
      billing_address: {
        email_address: registrationPayload.email || 'info@eduvantage.com',
        phone_number: registrationPayload.phone,
        country_code: 'KE',
        first_name: registrationPayload.adminName,
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

    // 3. Store pending registration data
    await kvSet(`pesapal_pending_${orderRes.order_tracking_id}`, {
      payload: registrationPayload,
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
  const merchantRef = searchParams.get('OrderMerchantReference');

  const host = request.headers.get('host');
  const proto = host.includes('localhost') ? 'http' : 'https';
  
  // Redirect back to a "processing" page on the frontend
  return NextResponse.redirect(`${proto}://${host}/saas/signup?processing=true&orderId=${orderTrackingId}`);
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

  const { payload } = pending;
  
  // Call the actual signup logic (we can refactor signup to be reusable)
  // For now, we replicate it or trigger it via internal fetch
  // Actually, better to just create the record here.
  
  const tenantId = payload.schoolName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
  
  // 1. Create Subscription
  await execute(`
    INSERT INTO subscriptions (tenant_id, plan, status, expires_at, learner_limit, billing_model, cycle, amount, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(tenant_id) DO UPDATE SET status = 'active', expires_at = excluded.expires_at
  `, [
    tenantId, 
    payload.plan || 'premium-learner', 
    'active', 
    Math.floor(Date.now()/1000) + (365 * 24 * 3600), // 1 year default for card?
    500, 
    'per-learner', 
    'annually', 
    payload.amount || 0
  ]);

  // 2. Create Admin User
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

  // 3. Clear pending
  await kvSet(`pesapal_pending_${orderTrackingId}`, null, 'platform-master');
  
  return { 
    message: 'Institution activated successfully', 
    loginUrl: `/login?tenant=${tenantId}&username=${payload.adminUsername}`
  };
}
