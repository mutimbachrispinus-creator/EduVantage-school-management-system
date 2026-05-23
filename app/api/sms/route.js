export const runtime = 'edge';
/**
 * app/api/sms/route.js — Secure SMS sending endpoint
 *
 * All outgoing SMS messages pass through this server-side route so that
 * the Africa's Talking API key is never exposed in browser JavaScript.
 *
 * POST /api/sms  { type, ...payload }
 *
 * Types:
 *   send       → single message  { to, message }
 *   bulk       → bulk blast      { phones: [], message }
 *   credentials → new-user SMS   { userId } (looks up user from DB)
 *   fee_reminder → { admNo }     (looks up learner fee balance)
 *
 * Auth: session cookie required; only admin can send bulk.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';
import { findLearner, getTenantId } from '@/lib/learner-lookup';
import {
  sendSMS, sendBulkSMS, sendCredentialsSMS, sendFeeReminderSMS,
  smsLogEntry, normaliseKenyanNumber,
} from '@/lib/sms-client';

function err(msg, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(request) {
  /* ── Auth check ── */
  const session = await getSession();
  if (!session) return err('Unauthorised', 401);

  let body;
  try { body = await request.json(); }
  catch { return err('Invalid JSON body'); }

  const { type } = body;

  /* ── Load AT credentials from DB (Super Admin Control) ── */
  // We ALWAYS fetch from platform-master so the SaaS owner controls SMS and billing
  const savedCreds = (await kvGet('paav_at_creds', {}, 'platform-master')) || {};
  const creds = {
    username: savedCreds.username || process.env.AT_USERNAME || 'sandbox',
    apiKey:   savedCreds.apiKey   || process.env.AT_API_KEY  || '',
    senderId: savedCreds.senderId || process.env.AT_SENDER_ID || '',
  };

  let result;
  let logEntry;

  switch (type) {
    /* ── Single SMS ── */
    case 'send': {
      const { to, message } = body;
      if (!to || !message) return err('to and message are required');
      result = await sendSMS({ to, message, ...creds });
      logEntry = smsLogEntry({
        to, message, type: 'manual',
        status: result.success ? 'sent' : 'failed',
        sentBy: session.name,
      });
      break;
    }

    /* ── Bulk SMS (admin only) ── */
    case 'bulk': {
      if (!['admin', 'super-admin'].includes(session.role)) return err('Only admins can send bulk SMS', 403);
      const { phones, message } = body;
      if (!Array.isArray(phones) || !phones.length) return err('phones array is required');
      if (!message) return err('message is required');

      result = await sendBulkSMS(phones, message, creds);
      logEntry = smsLogEntry({
        to: `${phones.length} recipients`,
        message, type: 'bulk',
        status: result.success ? 'sent' : 'failed',
        sentBy: session.name,
      });
      break;
    }

    /* ── Credential delivery for new staff/parent ── */
    case 'credentials': {
      if (!['admin', 'super-admin'].includes(session.role)) return err('Only admins can send credentials', 403);
      const { userId } = body;
      const tid = getTenantId(session);
      const staff = (await kvGet('paav6_staff', [], tid)) || [];
      const user  = staff.find(s => s.id === userId);
      if (!user) return err(`User ${userId} not found`);

      result = await sendCredentialsSMS(user, creds);
      logEntry = smsLogEntry({
        to: user.phone, message: `Credentials for ${user.name}`,
        type: 'credentials',
        status: result.success ? 'sent' : 'failed',
        sentBy: session.name,
      });
      break;
    }

    /* ── Fee reminder for one learner ── */
    case 'fee_reminder': {
      if (!['admin','staff'].includes(session.role)) {
        return err('Only admins and staff can send fee reminders', 403);
      }
      const { admNo } = body;
      const tid = getTenantId(session);
      const learners  = (await kvGet('paav6_learners', [], tid)) || [];
      const feeCfg    = (await kvGet('paav6_feecfg', {}, tid))   || {};
      const learner   = findLearner(learners, admNo);
      if (!learner) return err(`Learner ${admNo} not found`);

      const cfg       = feeCfg[learner.grade] || {};
      const annualFee = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 5000;
      const paid      = (learner.t1 || 0) + (learner.t2 || 0) + (learner.t3 || 0);
      const balance   = annualFee - paid;
      const accounts  = (await kvGet('paav_paybill_accounts', [], tid)) || [];
      const paybill   = accounts[0]?.shortcode || (await kvGet('paav_paybill', '', tid)) || '';

      result = await sendFeeReminderSMS({
        parentPhone: learner.phone,
        learnerName: learner.name,
        balance,
        paybill,
        admNo: learner.adm,
      }, creds);

      logEntry = smsLogEntry({
        to: learner.phone,
        message: `Fee reminder: ${learner.name}, Balance KSH ${balance}`,
        type: 'fee_reminder',
        status: result.success ? 'sent' : 'failed',
        sentBy: session.name,
      });
      break;
    }

    /* ── Bulk Absenteeism Alerts (Personalized) ── */
    case 'bulk_absenteeism_alert': {
      if (!['admin', 'super-admin'].includes(session.role)) return err('Unauthorized', 403);
      const { alerts } = body; // Array of { phone, name, count }
      if (!Array.isArray(alerts) || !alerts.length) return err('alerts array is required');

      const results = [];
      for (const a of alerts) {
        if (!a.phone) continue;
        const msg = `Attendance Alert: ${a.name} has missed ${a.count} days recently. Please contact the school office.`;
        const r = await sendSMS({ to: a.phone, message: msg, ...creds });
        results.push(r);
      }
      
      const totalS = results.filter(r => r.success).length;
      result = { 
        success: totalS > 0,
        totalSent: totalS,
        totalFailed: results.length - totalS
      };
      
      logEntry = smsLogEntry({
        to: `${alerts.length} parents`,
        message: 'Bulk Absenteeism Alert',
        type: 'event',
        status: result.success ? 'sent' : 'failed',
        sentBy: session.name,
      });
      break;
    }

    default:
      return err(`Unknown SMS type: ${type}`);
  }

  /* ── Persist SMS log ── */
  if (logEntry) {
    try {
      const tid = getTenantId(session);
      const smsLog = (await kvGet('paav7_sms', [], tid)) || [];
      smsLog.unshift(logEntry);
      // Keep last 500 entries
      if (smsLog.length > 500) smsLog.splice(500);
      await kvSet('paav7_sms', smsLog, tid);
    } catch (e) {
      console.error('[api/sms] log error:', e);
    }
  }

  return NextResponse.json({ ok: result.success, ...result });
}

/* ─── GET: SMS log (admin only) ─────────────────────────────────────────── */
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!['admin', 'super-admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tid = getTenantId(session);
  const smsLog = (await kvGet('paav7_sms', [], tid)) || [];
  return NextResponse.json({ ok: true, log: smsLog });
}
