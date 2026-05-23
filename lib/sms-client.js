/**
 * lib/sms-client.js — Africa's Talking SMS integration
 *
 * The portal uses Africa's Talking as its primary SMS provider for:
 *   • Credential delivery (new staff / parent accounts)
 *   • Fee payment reminders
 *   • Bulk announcements to parents, teachers, or all contacts
 *   • Event alerts
 *
 * Credentials are stored in the DB under 'paav_at_creds' and may be
 * updated by admins via Settings → SMS.
 *
 * Environment fallback (for local/CI use):
 *   AT_USERNAME   — Africa's Talking username  (default: 'sandbox')
 *   AT_API_KEY    — Africa's Talking API key
 *   AT_SENDER_ID  — optional alphanumeric sender ID (e.g. 'PAAV')
 */

const AT_BASE_URL = 'https://api.africastalking.com/version1/messaging';
const AT_SANDBOX  = 'https://api.sandbox.africastalking.com/version1/messaging';

/**
 * Send one or more SMS messages via Africa's Talking.
 *
 * @param {object} opts
 * @param {string|string[]} opts.to       E.164 or local Kenyan numbers, e.g. '+2547...' or '07...'
 * @param {string}          opts.message  Message text (max 160 chars per segment)
 * @param {string}          [opts.username]   AT username (overrides env)
 * @param {string}          [opts.apiKey]     AT API key  (overrides env)
 * @param {string}          [opts.senderId]   Alphanumeric sender ID
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
/**
 * Normalizes a phone number to E.164 format for international delivery.
 * Defaults to +254 (Kenya) if no country code is provided.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let clean = phone.trim().replace(/\s/g, '');
  
  if (clean.startsWith('+')) return clean; // Already international
  if (clean.startsWith('0')) return '+254' + clean.slice(1);
  if (clean.length === 9) return '+254' + clean; // Handle 712345678 format
  
  return clean; // Fallback
}

export async function sendSMS({ to, message, username, apiKey, senderId }) {
  const user   = username  || process.env.AT_USERNAME  || 'sandbox';
  const key    = apiKey    || process.env.AT_API_KEY   || '';
  const sender = senderId  || process.env.AT_SENDER_ID || '';

  if (!key) {
    return { success: false, error: 'Africa\'s Talking API key not configured' };
  }

  const isSandbox = user === 'sandbox';
  const url = isSandbox ? AT_SANDBOX : AT_BASE_URL;

  // Normalise to array and format numbers for Kenya
  const recipients = (Array.isArray(to) ? to : [to])
    .map(n => normaliseKenyanNumber(n))
    .filter(Boolean)
    .join(',');

  if (!recipients) {
    return { success: false, error: 'No valid recipient numbers' };
  }

  const body = new URLSearchParams({ username: user, to: recipients, message });
  if (sender) body.set('from', sender);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'apiKey':        key,
        'Accept':        'application/json',
      },
      body: body.toString(),
    });

    // Safely parse response — AT sometimes returns plain text on auth errors
    let json;
    const rawText = await res.text();
    try {
      json = JSON.parse(rawText);
    } catch {
      // AT returned a non-JSON body (e.g. "The supplier is not configured")
      return { success: false, error: rawText || `AT API error ${res.status}` };
    }

    if (!res.ok || json.errorMessage) {
      return { success: false, error: json.errorMessage || `AT API error ${res.status}` };
    }

    // Check individual recipient statuses. The API call succeeding only means
    // Africa's Talking accepted the request; each recipient can still fail.
    const recipients_data = json.SMSMessageData?.Recipients || [];
    const failed = recipients_data.filter(r => ![100, 101, 102].includes(r.statusCode));
    const acceptedCount = recipients_data.length - failed.length;
    const recipientsSummary = recipients_data.map(r => ({
      number: r.number,
      status: r.status,
      statusCode: r.statusCode,
      messageId: r.messageId,
      cost: r.cost,
      messageParts: r.messageParts
    }));
    const failedSummary = failed.map(r => ({
      number: r.number,
      status: r.status,
      statusCode: r.statusCode,
      error: r.status || `Status ${r.statusCode}`
    }));

    return {
      success: acceptedCount > 0,
      data:    json.SMSMessageData,
      acceptedCount,
      sentCount:   acceptedCount,
      failedCount: failed.length,
      recipients: recipientsSummary,
      messageIds: recipientsSummary.map(r => r.messageId).filter(Boolean),
      failed:  failedSummary,
      error: acceptedCount > 0 ? undefined : (failedSummary[0]?.error || 'No SMS recipients were accepted by the provider'),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send credentials to a newly created staff/parent account.
 *
 * @param {object} staff    { name, phone, username, password }
 * @param {object} [creds]  AT credentials { username, apiKey, senderId }
 */
export async function sendCredentialsSMS(staff, creds = {}) {
  const portalUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL)
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'portal.eduvantage.app';

  const message =
    `School Portal Login\n` +
    `Welcome, ${staff.name}!\n` +
    `Username: ${staff.username}\n` +
    `Password: ${staff.password}\n` +
    `Login: ${portalUrl}`;

  return sendSMS({ to: staff.phone, message, ...creds });
}

/**
 * Send a fee reminder to a parent.
 *
 * @param {object} opts { parentPhone, learnerName, balance, paybill, admNo }
 * @param {object} [creds]
 */
export async function sendFeeReminderSMS({ parentPhone, learnerName, balance, paybill, admNo }, creds = {}) {
  const message =
    `School Fee Reminder\n` +
    `Student: ${learnerName}\n` +
    `Balance: KSH ${Number(balance).toLocaleString()}\n` +
    (paybill
      ? `Pay via M-Pesa Paybill ${paybill}, Account: ${admNo}\n`
      : '') +
    `Please clear by end of term.`;

  return sendSMS({ to: parentPhone, message, ...creds });
}

/**
 * Result notification template
 */
export function getResultNotificationMessage(learnerName, term, totalPts, maxPts) {
  return `School Results Notice\n` +
         `Term ${term} results for ${learnerName} are out.\n` +
         `Performance: ${totalPts} / ${maxPts} points.\n` +
         `Log in to the portal to view full report.`;
}

/**
 * Absenteeism alert template
 */
export function getAbsenteeismAlertMessage(learnerName, pct, absences) {
  return `Attendance Red-Flag\n` +
         `Student: ${learnerName}\n` +
         `Notice: Attendance has dropped to ${pct}% with ${absences} absences detected.\n` +
         `Please contact the class teacher or school office immediately.`;
}

/**
 * Send a bulk SMS to many recipients.
 * AT supports up to 1,000 recipients per request.
 *
 * @param {string[]} phones   array of phone numbers
 * @param {string}   message
 * @param {object}   [creds]
 */
export async function sendBulkSMS(phones, message, creds = {}) {
  // Chunk into batches of 200 to stay within limits
  const CHUNK = 200;
  const results = [];
  for (let i = 0; i < phones.length; i += CHUNK) {
    const batch = phones.slice(i, i + CHUNK);
    const r = await sendSMS({ to: batch, message, ...creds });
    results.push(r);
  }
  const totalSent   = results.reduce((s, r) => s + (r.sentCount   || 0), 0);
  const totalFailed = results.reduce((s, r) => s + (r.failedCount || 0), 0);
  return { success: totalSent > 0, totalSent, totalFailed, batches: results.length };
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Normalise Kenyan mobile numbers to E.164 (+254...).
 * Accepts: 07xxxxxxxx, 7xxxxxxxx, +2547xxxxxxxx, 2547xxxxxxxx
 */
export function normaliseKenyanNumber(n) {
  if (!n) return null;
  const s = String(n).replace(/\s+/g, '').replace(/-/g, '');
  if (/^\+254[17]\d{8}$/.test(s)) return s;
  if (/^254[17]\d{8}$/.test(s))   return '+' + s;
  if (/^0[17]\d{8}$/.test(s))     return '+254' + s.slice(1);
  if (/^[17]\d{8}$/.test(s))      return '+254' + s;
  return null;  // unrecognised format — skip
}

/**
 * Estimate the number of SMS segments for a message.
 * GSM-7 charset: 160 chars/segment; multi-part: 153 chars/segment.
 */
export function smsSegments(message) {
  const len = (message || '').length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

/**
 * Format an SMS log entry for storage in paav7_sms.
 */
export function smsLogEntry({ to, message, type = 'manual', status = 'sent', sentBy, ...meta }) {
  return {
    id:      meta.atMessageId || 's' + Date.now(),
    date:    new Date().toISOString(),
    to,
    message,
    type,   // 'credentials' | 'fee_reminder' | 'bulk' | 'manual' | 'event'
    status, // 'sent' | 'failed' | 'pending'
    sentBy,
    ...meta,
  };
}
