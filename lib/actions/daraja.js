'use server';

/**
 * lib/actions/daraja.js — Safaricom Daraja API Integration
 */

const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;
const SHORTCODE = process.env.DARAJA_SHORTCODE;
const PASSKEY = process.env.DARAJA_PASSKEY;
const CALLBACK_URL = process.env.DARAJA_CALLBACK_URL;

/**
 * Fetches a fresh OAuth access token from Daraja.
 */
async function getAccessToken() {
  const credentials = `${CONSUMER_KEY}:${CONSUMER_SECRET}`;
  const auth = typeof btoa !== 'undefined' ? btoa(credentials) : Buffer.from(credentials).toString('base64');
  
  const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });

  const data = await res.json();
  return data.access_token;
}

/**
 * Initiates an STK Push (Lipa Na M-Pesa Online) request.
 */
export async function initiateSTKPush({ phoneNumber, amount, accountReference, transactionDesc }) {
  try {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      throw new Error('Daraja credentials not configured');
    }

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const pwdStr = `${SHORTCODE}${PASSKEY}${timestamp}`;
    const password = typeof btoa !== 'undefined' ? btoa(pwdStr) : Buffer.from(pwdStr).toString('base64');

    // Normalize phone number (254...)
    let phone = phoneNumber.replace(/\+/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference || 'NexedFees',
      TransactionDesc: transactionDesc || 'School Fees Payment'
    };

    const res = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.ResponseCode === '0') {
      return { success: true, checkoutRequestID: data.CheckoutRequestID, customerMessage: data.CustomerMessage };
    } else {
      return { success: false, error: data.errorMessage || 'STK Push failed' };
    }
  } catch (error) {
    console.error('Daraja STK Error:', error);
    return { success: false, error: error.message };
  }
}
