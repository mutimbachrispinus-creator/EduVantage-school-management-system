/**
 * lib/pesapal.js — Pesapal v3 Integration Utility
 * 
 * Implements the Pesapal v3 API flow:
 * 1. Auth (Get Token)
 * 2. Register IPN
 * 3. Submit Order
 * 4. Transaction Status
 */

const SANDBOX_URL = 'https://cybqa.pesapal.com/pesapalv3';
const LIVE_URL = 'https://pay.pesapal.com/v3';

export async function getPesapalConfig(kvGet) {
  const config = await kvGet('paav_global_config', {}, 'platform-master');
  // Fall back to environment variables if KV config is not set
  const consumerKey    = config.pesapal?.consumerKey    || process.env.PESAPAL_CONSUMER_KEY    || '';
  const consumerSecret = config.pesapal?.consumerSecret || process.env.PESAPAL_CONSUMER_SECRET || '';
  const env            = config.pesapal?.env            || process.env.PESAPAL_ENV              || 'sandbox';
  const isLive         = env === 'live';

  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in environment variables or Super Admin Global Config.');
  }

  return {
    baseUrl: isLive ? LIVE_URL : SANDBOX_URL,
    consumerKey,
    consumerSecret,
    isLive
  };
}

export async function getPesapalToken(config) {
  const res = await fetch(`${config.baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret
    })
  });
  let data;
  try {
    data = await res.json();
  } catch(e) {
    throw new Error(`Pesapal Auth Error: Failed to parse response (Status ${res.status})`);
  }
  if (!res.ok || data.error) {
    const errObj = data.error || data;
    const msg = typeof errObj === 'string' ? errObj : (errObj.message || errObj.error_description || JSON.stringify(errObj));
    throw new Error(`Pesapal Auth Error: ${msg}`);
  }
  return data.token;
}

export async function registerIPN(config, token, callbackUrl) {
  const res = await fetch(`${config.baseUrl}/api/URLRegister/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      url: callbackUrl,
      ipn_notification_type: 'GET'
    })
  });
  let data;
  try {
    data = await res.json();
  } catch(e) {
    throw new Error(`Pesapal IPN Error: Failed to parse response (Status ${res.status})`);
  }
  if (!res.ok || data.error) {
    const errObj = data.error || data;
    const msg = typeof errObj === 'string' ? errObj : (errObj.message || errObj.error_description || JSON.stringify(errObj));
    throw new Error(`Pesapal IPN Error: ${msg}`);
  }
  return data.ipn_id;
}

export async function submitOrder(config, token, orderData) {
  const res = await fetch(`${config.baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(orderData)
  });
  let data;
  try {
    data = await res.json();
  } catch(e) {
    throw new Error(`Pesapal Order Error: Failed to parse response (Status ${res.status})`);
  }
  if (!res.ok || data.error) {
    const errObj = data.error || data;
    const msg = typeof errObj === 'string' ? errObj : (errObj.message || errObj.error_description || JSON.stringify(errObj));
    throw new Error(`Pesapal Order Error: ${msg}`);
  }
  return data; // { order_tracking_id, merchant_reference, redirect_url }
}

export async function getTransactionStatus(config, token, orderTrackingId) {
  const res = await fetch(`${config.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  return data; // { payment_method, amount, created_date, confirmation_code, payment_status_description, ... }
}
