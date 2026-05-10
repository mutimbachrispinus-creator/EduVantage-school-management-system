/**
 * lib/mpesa.js — Safaricom M-Pesa Daraja API integration
 *
 * Implements the STK Push (Lipa na M-Pesa Online) flow so parents can
 * pay school fees directly from the portal without leaving the browser.
 *
 * Required environment variables (set in Vercel dashboard):
 *   MPESA_CONSUMER_KEY      Daraja API consumer key
 *   MPESA_CONSUMER_SECRET   Daraja API consumer secret
 *   MPESA_SHORTCODE         Paybill / Till number
 *   MPESA_PASSKEY           Lipa na M-Pesa online passkey
 *   MPESA_CALLBACK_URL      Public URL for payment callbacks
 *                           e.g. https://portal.paavgitombo.ac.ke/api/mpesa/callback
 *   MPESA_ENV               'sandbox' | 'production'  (default: 'sandbox')
 */

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const LIVE_BASE    = 'https://api.safaricom.co.ke';

function baseURL() {
  return process.env.MPESA_ENV === 'production' ? LIVE_BASE : SANDBOX_BASE;
}

/* ─── OAuth token ───────────────────────────────────────────────────────── */

let _tokenCache = { token: null, expiresAt: 0 };

/**
 * Fetch a short-lived OAuth token from Safaricom.
 * Tokens expire in ~3600 s; we cache them to avoid rate-limiting.
 */
export async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const key    = process.env.MPESA_CONSUMER_KEY    || '';
  const secret = process.env.MPESA_CONSUMER_SECRET || '';

  if (!key || !secret) {
    throw new Error('Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET');
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const res = await fetch(`${baseURL()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) throw new Error(`M-Pesa OAuth failed: ${res.status}`);

  const json = await res.json();
  _tokenCache = {
    token:     json.access_token,
    expiresAt: Date.now() + (parseInt(json.expires_in, 10) - 60) * 1000,
  };
  return _tokenCache.token;
}

/* ─── STK Push ──────────────────────────────────────────────────────────── */

/**
 * Initiate an STK Push (pop-up prompt on the parent's phone).
 *
 * @param {object} opts
 * @param {string}  opts.phone       Parent's phone number (07xxxxxxxx or +2547xxxxxxxx)
 * @param {number}  opts.amount      Amount in KSH (integer)
 * @param {string}  opts.accountRef  Account reference (usually learner's adm no.)
 * @param {string}  [opts.description]  Short transaction description
 * @returns {Promise<{ success: boolean, checkoutRequestId?: string, error?: string }>}
 */
export async function stkPush({ phone, amount, accountRef, description, term, shortcode: sCode, passkey: pKey }) {
  try {
    const token     = await getAccessToken();
    const shortcode = sCode || process.env.MPESA_SHORTCODE || '';
    const passkey   = pKey  || process.env.MPESA_PASSKEY   || '';
    const callback  = process.env.MPESA_CALLBACK_URL || '';

    if (!shortcode || !passkey) {
      return { success: false, error: 'M-Pesa shortcode or passkey not configured' };
    }

    const timestamp = mpesaTimestamp();
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const e164Phone = normaliseMpesaPhone(phone);

    if (!e164Phone) {
      return { success: false, error: `Invalid phone number: ${phone}` };
    }

    const payload = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            Math.round(amount),
      PartyA:            e164Phone,
      PartyB:            shortcode,
      PhoneNumber:       e164Phone,
      CallBackURL:       callback,
      // Safaricom AccountReference: alphanumeric only, max 12 chars
      // This is for display on the parent's M-Pesa statement only.
      // Real adm tracking happens via CheckoutRequestID stored server-side.
      AccountReference:  String(accountRef).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'FEES',
      TransactionDesc:   (description || 'School Fees').slice(0, 13),
    };

    const res = await fetch(`${baseURL()}/mpesa/stkpush/v1/processrequest`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.ResponseCode === '0') {
      return {
        success:           true,
        checkoutRequestId: json.CheckoutRequestID,
        merchantRequestId: json.MerchantRequestID,
        message:           json.CustomerMessage,
      };
    }

    return {
      success: false,
      error:   json.errorMessage || json.ResultDesc || 'STK Push failed',
      code:    json.ResponseCode,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── STK Push query (check payment status) ────────────────────────────── */

/**
 * Query the status of a previously initiated STK Push.
 *
 * @param {string} checkoutRequestId  from stkPush() response
 */
export async function stkQuery(checkoutRequestId) {
  try {
    const token     = await getAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE || '';
    const passkey   = process.env.MPESA_PASSKEY   || '';
    const timestamp = mpesaTimestamp();
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const res = await fetch(`${baseURL()}/mpesa/stkpushquery/v1/query`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const json = await res.json();
    return {
      success:    json.ResultCode === '0',
      resultCode: json.ResultCode,
      resultDesc: json.ResultDesc,
      raw:        json,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ─── Callback handler ──────────────────────────────────────────────────── */

/**
 * Parse and validate an STK Push callback from Safaricom.
 * Call this inside /api/mpesa/callback/route.js
 *
 * @param {object} body   The raw JSON body from Safaricom
 * @returns {{ paid: boolean, mpesaCode?: string, phone?: string, amount?: number, accountRef?: string }}
 */
export function parseStkCallback(body) {
  try {
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return { paid: false, error: 'Invalid callback body' };

    const { ResultCode, CallbackMetadata } = stkCallback;
    if (ResultCode !== 0) {
      return { paid: false, resultCode: ResultCode, resultDesc: stkCallback.ResultDesc };
    }

    const items  = CallbackMetadata?.Item || [];
    const getVal = name => items.find(i => i.Name === name)?.Value;

    return {
      paid:       true,
      mpesaCode:  getVal('MpesaReceiptNumber'),
      phone:      String(getVal('PhoneNumber') || ''),
      amount:     Number(getVal('Amount') || 0),
      accountRef: String(getVal('AccountReference') || ''),
      timestamp:  getVal('TransactionDate'),
    };
  } catch (err) {
    return { paid: false, error: err.message };
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/** M-Pesa timestamp format: YYYYMMDDHHmmss */
function mpesaTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);
}

/** Normalise a Kenyan number to the 2547xxxxxxxxx format M-Pesa expects. */
export function normaliseMpesaPhone(n) {
  if (!n) return null;
  const s = String(n).replace(/\s+/g, '').replace(/-/g, '');
  if (/^\+254[17]\d{8}$/.test(s)) return s.slice(1);    // strip leading +
  if (/^254[17]\d{8}$/.test(s))   return s;
  if (/^0[17]\d{8}$/.test(s))     return '254' + s.slice(1);
  if (/^[17]\d{8}$/.test(s))      return '254' + s;
  return null;
}

/* ─── Payout Stubs (B2B & B2C) ──────────────────────────────────────────── */

/**
 * Initiates a Business to Business (B2B) Transfer.
 * Used to sweep collected funds from the Master EduVantage Paybill to a School's Paybill.
 * NOTE: Safaricom requires RSA encryption for the Initiator Password.
 * This stub returns a success simulation until production certs are applied.
 * 
 * @param {object} opts
 * @param {number} opts.amount
 * @param {string} opts.destinationShortcode (PartyB)
 * @param {string} opts.remarks
 */
export async function b2bTransfer({ amount, destinationShortcode, remarks }) {
  try {
    // 1. Fetch token
    // const token = await getAccessToken();
    
    // 2. Encrypt password using Safaricom's public cert (crypto module required)
    // const securityCredential = encryptPassword(process.env.MPESA_INITIATOR_PASSWORD);

    // 3. Initiate Transfer Payload
    // const payload = { ... }
    
    console.log(`[B2B Transfer STUB] Transferring KES ${amount} to ${destinationShortcode}. Remarks: ${remarks}`);
    
    // Simulate Daraja network delay
    await new Promise(r => setTimeout(r, 800));

    // Simulated successful response
    return {
      success: true,
      conversationId: `AG_${Date.now()}`,
      message: 'B2B Transfer Initiated Successfully (Simulated)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Initiates a Business to Customer/Bank (B2C) Transfer.
 * Used to sweep collected funds from the Master EduVantage Paybill to a Bank Account or Mobile Number.
 * NOTE: Safaricom requires RSA encryption for the Initiator Password.
 * This stub returns a success simulation until production certs are applied.
 * 
 * @param {object} opts
 * @param {number} opts.amount
 * @param {string} opts.destinationAccount (PartyB)
 * @param {string} opts.remarks
 */
export async function b2cTransfer({ amount, destinationAccount, remarks }) {
  try {
    console.log(`[B2C Transfer STUB] Transferring KES ${amount} to ${destinationAccount}. Remarks: ${remarks}`);
    
    // Simulate Daraja network delay
    await new Promise(r => setTimeout(r, 800));

    // Simulated successful response
    return {
      success: true,
      conversationId: `AG_${Date.now()}`,
      message: 'B2C Transfer Initiated Successfully (Simulated)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
