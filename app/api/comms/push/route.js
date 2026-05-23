export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';
import { sendSMS, sendFeeReminderSMS, getResultNotificationMessage } from '@/lib/sms-client';
import { sendEmail, getReportCardTemplate, getFeeBalanceTemplate } from '@/lib/mail';
import { calcLearnerReportData, DEFAULT_SUBJECTS } from '@/lib/cbe';
import { findLearner, getTenantId } from '@/lib/learner-lookup';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'super-admin'].includes(session.role)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { type, channel, targets, term } = await request.json();
    const tid = getTenantId(session);

    if (!targets || !targets.length) {
      return NextResponse.json({ ok: false, error: 'No targets specified' });
    }

    const [learners, marks, feecfg, paybill, weights, savedCreds, profile] = await Promise.all([
      kvGet('paav6_learners', [], tid),
      kvGet('paav6_marks', {}, tid),
      kvGet('paav6_feecfg', {}, tid),
      kvGet('paav_paybill_accounts', [], tid),
      kvGet('paav_grading_weights', null, tid),
      kvGet('paav_at_creds', {}, 'platform-master'), // Centralized SMS control
      kvGet('paav_school_profile', null, tid)
    ]);

    const schoolName = profile?.name || '';

    const creds = {
      username: savedCreds?.username || process.env.AT_USERNAME || 'sandbox',
      apiKey:   savedCreds?.apiKey   || process.env.AT_API_KEY  || '',
      senderId: savedCreds?.senderId || process.env.AT_SENDER_ID || '',
    };

    const results = [];

    for (const target of targets) {
      const learner = findLearner(learners, target.adm);
      if (!learner) {
        results.push({ adm: target.adm, channel: channel || 'sms', success: false, error: 'Learner not found' });
        continue;
      }

    const parentPhone = learner.phone;
    const parentEmail = learner.parentEmail;

    if (type === 'balance') {
      const cfg = feecfg[learner.grade] || {};
      const annual = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 5000;
      const paid = (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
      const arrears = learner.arrears || 0;
      const balance = annual + arrears - paid;
      const currentTermBal = Math.max(0, annual - paid);

      const pb = paybill?.[0]?.shortcode || paybill?.[0]?.value || '';

      if (channel === 'sms' || channel === 'both') {
        if (parentPhone) {
          const res = await sendFeeReminderSMS({
            parentPhone,
            learnerName: learner.name,
            balance,
            paybill: pb,
            admNo: learner.adm,
            schoolName
          }, creds);
          results.push({ adm: learner.adm, channel: 'sms', ...res });
          // Log to DB
          const recipient = res.recipients?.[0] || null;
          await logComms({
            to: parentPhone,
            message: `Fee Balance: KSH ${balance}`,
            type: 'fee_reminder',
            status: res.success ? 'submitted' : 'failed',
            sentBy: session.username || session.name,
            atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
            providerStatus: recipient?.status || '',
            providerStatusCode: recipient?.statusCode || null
          }, tid);
        }
      }

      if (channel === 'email' || channel === 'both') {
        if (parentEmail) {
          const html = getFeeBalanceTemplate({
            learnerName: learner.name,
            balance,
            arrears,
            currentTerm: currentTermBal,
            paybill: pb,
            adm: learner.adm
          });
          const res = await sendEmail({
            to: parentEmail,
            subject: `Fee Balance Reminder - ${learner.name}`,
            html
          });
          results.push({ adm: learner.adm, channel: 'email', ...res });
        }
      }
    }

    if (type === 'report') {
      if (!term) continue;
      
      const subjCfg = await kvGet('paav_teacher_assignments', {}, tid) || {};
      const gradeSubjects = (subjCfg[learner.grade] && subjCfg[learner.grade].length > 0)
        ? subjCfg[learner.grade].map(s => s.subject)
        : (DEFAULT_SUBJECTS[learner.grade] || []);
      
      if (!gradeSubjects.length) continue;
      
      const report = calcLearnerReportData(marks, learner.adm, learner.grade, term, gradeSubjects, null, 'CBC', weights);
      const totalPts = report.totalAvgPts;
      const maxPts = gradeSubjects.length * (['GRADE 7', 'GRADE 8', 'GRADE 9'].includes(learner.grade) ? 8 : 4);
      const pct = maxPts > 0 ? Math.round((totalPts / maxPts) * 100) : 0;

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.eduvantage.app';
      const portalLink = `${baseUrl}/parent-home?adm=${learner.adm}`;

      if (channel === 'sms' || channel === 'both') {
        if (parentPhone) {
          const message = getResultNotificationMessage(learner.name, term.replace('T', ''), totalPts, maxPts, schoolName);
          const res = await sendSMS({ to: parentPhone, message, ...creds });
          results.push({ adm: learner.adm, channel: 'sms', ...res });
          const recipient = res.recipients?.[0] || null;
          await logComms({
            to: parentPhone,
            message,
            type: 'report_card',
            status: res.success ? 'submitted' : 'failed',
            sentBy: session.username || session.name,
            atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
            providerStatus: recipient?.status || '',
            providerStatusCode: recipient?.statusCode || null
          }, tid);
        }
      }

      if (channel === 'email' || channel === 'both') {
        if (parentEmail) {
          const html = getReportCardTemplate({
            learnerName: learner.name,
            term: term.replace('T', ''),
            year: new Date().getFullYear(),
            totalPts,
            maxPts,
            pct,
            promoStatus: pct >= 50 ? 'promote' : 'review',
            link: portalLink
          });
          const res = await sendEmail({
            to: parentEmail,
            subject: `Term ${term.replace('T', '')} Progress Report - ${learner.name}`,
            html
          });
          results.push({ adm: learner.adm, channel: 'email', ...res });
        }
      }
    }

    if (type === 'absenteeism') {
      const { pct, absences } = target; // Passed from UI
      if (channel === 'sms' || channel === 'both') {
        if (parentPhone) {
          const { getAbsenteeismAlertMessage } = await import('@/lib/sms-client');
          const message = getAbsenteeismAlertMessage(learner.name, pct, absences);
          const res = await sendSMS({ to: parentPhone, message, ...creds });
          results.push({ adm: learner.adm, channel: 'sms', ...res });
          const recipient = res.recipients?.[0] || null;
          await logComms({
            to: parentPhone,
            message,
            type: 'attendance_alert',
            status: res.success ? 'submitted' : 'failed',
            sentBy: session.username || session.name,
            atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
            providerStatus: recipient?.status || '',
            providerStatusCode: recipient?.statusCode || null
          }, tid);
        }
      }
    }
  }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('[api/comms/push] failed:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to send communications' },
      { status: 500 }
    );
  }
}

async function logComms(entry, tenantId) {
  try {
    const id = entry.atMessageId || 's' + Date.now() + Math.random().toString(36).substr(2, 5);
    const logs = await kvGet('paav7_sms', [], tenantId) || [];
    logs.unshift({
      ...entry,
      id,
      date: new Date().toISOString()
    });
    await kvSet('paav7_sms', logs.slice(0, 500), tenantId);

    if (entry.atMessageId) {
      const index = await kvGet('paav_sms_message_index', {}, 'platform-master') || {};
      index[entry.atMessageId] = { tenantId, logId: id, updatedAt: new Date().toISOString() };
      await kvSet('paav_sms_message_index', index, 'platform-master');
    }
  } catch (e) {
    console.error('Failed to log comms:', e);
  }
}
