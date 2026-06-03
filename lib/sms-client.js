/**
 * lib/sms-client.js — Africa's Talking SMS integration
 *
 * The portal uses Africa's Talking as its primary SMS provider for:
 *   • Account invite delivery (new staff / parent accounts)
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

export async function sendSMS({ to, message, username, apiKey, senderId, schoolName }) {
  const user   = username  || process.env.AT_USERNAME  || 'sandbox';
  const key    = apiKey    || process.env.AT_API_KEY   || '';
  const sender = senderId  || process.env.AT_SENDER_ID || '';

  if (!key) {
    return { success: false, error: 'Africa\'s Talking API key not configured' };
  }

  let finalMessage = message;
  if (schoolName && !finalMessage.startsWith(`[${schoolName}]`)) {
    finalMessage = `[${schoolName}] ${finalMessage}`;
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

  // Retry logic with exponential backoff
  const maxRetries = 5;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = new URLSearchParams({ username: user, to: recipients, message: finalMessage });
      if (sender) body.set('from', sender);

      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'apiKey':        key,
          'Accept':        'application/json',
        },
        body: body.toString(),
      });

      // Safely parse response
      let json;
      const rawText = await res.text();
      try {
        json = JSON.parse(rawText);
      } catch {
        return { success: false, error: rawText || `AT API error ${res.status}` };
      }

      if (!res.ok || json.errorMessage) {
        throw new Error(json.errorMessage || `AT API error ${res.status}`);
      }

      // Check individual recipient statuses
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
      lastError = err;
      if (attempt < maxRetries) {
        const delay = 500 * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return { success: false, error: lastError?.message || 'SMS send failed' };
}

function normalizePortalUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return 'https://portal.eduvantage.app';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Send a secure portal invite to a staff/parent account.
 *
 * Do not send stored passwords here. Staff passwords are hashed in the DB, so
 * sending `staff.password` would expose hash material and still not help users
 * sign in. The invite sends username + reset flow link instead.
 *
 * @param {object} staff    { name, phone, username }
 * @param {object} [creds]  AT credentials { username, apiKey, senderId, portalUrl }
 */
export async function sendCredentialsSMS(staff, creds = {}) {
  const { schoolName, portalUrl: overridePortalUrl } = creds;
  const portalUrl = normalizePortalUrl(
    overridePortalUrl ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ||
    'https://portal.eduvantage.app'
  );

  const message =
    `Welcome, ${staff.name}!\n` +
    `Your portal account is ready.\n` +
    `Username: ${staff.username}\n` +
    `Open: ${portalUrl}\n` +
    `Use Forgot Password to set your private password. EduVantage never sends passwords by SMS.`;

  return sendSMS({ to: staff.phone, message, schoolName, ...creds });
}

/**
 * Send a fee reminder to a parent.
 *
 * @param {object} opts { parentPhone, learnerName, balance, paybill, admNo }
 * @param {object} [creds]
 */
export async function sendFeeReminderSMS({ parentPhone, learnerName, balance, paybill, admNo, schoolName, periodWord }, creds = {}) {
  const period = periodWord || 'term'; // 'semester' for IB, 'term' for CBC/others
  const prefix = schoolName ? `[${schoolName}]\n` : '';
  const message =
    `${prefix}Fee Reminder\n` +
    `Student: ${learnerName}\n` +
    `Balance: KSH ${Number(balance).toLocaleString()}\n` +
    (paybill
      ? `Pay via M-Pesa Paybill ${paybill}, Account: ${admNo}\n`
      : '') +
    `Please clear by end of ${period}.`;

  return sendSMS({ to: parentPhone, message, schoolName, ...creds });
}

/**
 * Result notification template
 * @param {string} learnerName
 * @param {string} termLabel  — Full curriculum term label e.g. "Term 1", "Semester 2"
 * @param {string} examLabel  — Exam label e.g. "ET1", "MT1"
 * @param {number} totalPts
 * @param {number} maxPts
 * @param {string} generalLevel — General level (e.g., "Grade 4")
 * @param {string} schoolName
 */
export function getResultNotificationMessage(learnerName, termLabel, examLabel, totalPts, maxPts, generalLevel, schoolName) {
  const prefix = schoolName ? `[${schoolName}]\n` : '';
  return `${prefix}Results Notice\n` +
         `${termLabel} ${examLabel} results for ${learnerName} are now available.\n` +
         `Performance: ${totalPts} / ${maxPts} points.\n` +
         `General Level: ${generalLevel}.\n` +
         `Log in to view the full report card.`;
}

/**
 * Absenteeism alert template
 * @param {string} learnerName
 * @param {number} pct  attendance percentage
 * @param {number} absences  number of absences
 * @param {string} schoolName
 */
export function getAbsenteeismAlertMessage(learnerName, pct, absences, schoolName) {
  const prefix = schoolName ? `[${schoolName}] ` : '';
  return `${prefix}Attendance Alert\n` +
         `${learnerName}'s attendance has dropped to ${pct}% (${absences} absences).\n` +
         `Please contact the school office or class teacher urgently.`;
}

/**
 * At-Risk alert template
 * @param {string} learnerName
 * @param {string} schoolName
 */
export function getAtRiskAlertMessage(learnerName, schoolName) {
  const prefix = schoolName ? `[${schoolName}] ` : '';
  return `${prefix}Academic Alert\n` +
         `This is a notification that ${learnerName} is currently performing below the expected average.\n` +
         `Please contact the class teacher for an academic intervention plan.`;
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
