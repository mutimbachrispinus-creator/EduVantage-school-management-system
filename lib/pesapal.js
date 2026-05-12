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
  const isLive = config.pesapal?.env === 'live';
  return {
    baseUrl: isLive ? LIVE_URL : SANDBOX_URL,
    consumerKey: config.pesapal?.consumerKey || '',
    consumerSecret: config.pesapal?.consumerSecret || '',
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
  const data = await res.json();
  if (data.error) throw new Error(`Pesapal Auth Error: ${data.error.message || 'Unknown'}`);
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
  const data = await res.json();
  if (data.error) throw new Error(`Pesapal IPN Error: ${data.error.message || 'Unknown'}`);
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
  const data = await res.json();
  if (data.error) throw new Error(`Pesapal Order Error: ${data.error.message || 'Unknown'}`);
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
