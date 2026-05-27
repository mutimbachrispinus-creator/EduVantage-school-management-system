export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';
import { sendSMS, sendFeeReminderSMS, getResultNotificationMessage, getAbsenteeismAlertMessage } from '@/lib/sms-client';
import { sendEmail, getReportCardTemplate, getFeeBalanceTemplate } from '@/lib/mail';
import { calcLearnerReportData, getDefaultSubjects } from '@/lib/cbe';
import { getCurriculum } from '@/lib/curriculum';
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

    const [learners, marks, feecfg, paybill, weights, savedCreds, profile, subjCfg] = await Promise.all([
      kvGet('paav6_learners', [], tid),
      kvGet('paav6_marks', {}, tid),
      kvGet('paav6_feecfg', {}, tid),
      kvGet('paav_paybill_accounts', [], tid),
      kvGet('paav_grading_weights', null, tid),
      kvGet('paav_at_creds', {}, 'platform-master'), // Centralized SMS control
      kvGet('paav_school_profile', null, tid),
      kvGet('paav8_subj', {}, tid)
    ]);

    const schoolName = profile?.name || '';
    const curr = getCurriculum(profile?.curriculum || 'CBC', profile?.levels);
    const TERMS = curr.TERMS || [];
    const periodWord = TERMS.length === 2 ? 'semester' : 'term';

    const creds = {
      username: savedCreds?.username || process.env.AT_USERNAME || 'sandbox',
      apiKey:   savedCreds?.apiKey   || process.env.AT_API_KEY  || '',
      senderId: savedCreds?.senderId || process.env.AT_SENDER_ID || '',
      schoolName: schoolName || 'EduVantage',
    };

    const results = [];
    const logEntries = [];

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
        // Curriculum-aware totals
        const annual = TERMS.length
          ? TERMS.reduce((s, t) => s + (cfg[t.id.toLowerCase()] || 0), 0) || cfg.annual || 5000
          : (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 5000;
        const paid = TERMS.length
          ? TERMS.reduce((s, t) => s + (learner[t.id.toLowerCase()] || 0), 0)
          : (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
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
              schoolName,
              periodWord,
            }, creds);
            results.push({ adm: learner.adm, channel: 'sms', ...res });
            if (res.success) {
              const recipient = res.recipients?.[0] || null;
              logEntries.push({
                to: parentPhone,
                message: `Fee Balance: KSH ${balance}`,
                type: 'fee_reminder',
                status: 'submitted',
                sentBy: session.username || session.name,
                atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
                providerStatus: recipient?.status || '',
                providerStatusCode: recipient?.statusCode || null
              });
            }
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
        
        const gradeSubjects = (subjCfg[learner.grade] && subjCfg[learner.grade].length > 0)
          ? subjCfg[learner.grade]
          : getDefaultSubjects(learner.grade, profile?.curriculum || 'CBC');
        
        if (!gradeSubjects.length) continue;
        
        const report = calcLearnerReportData(marks, learner.adm, learner.grade, term, gradeSubjects, null, profile?.curriculum || 'CBC', weights);
        const totalPts = report.totalAvgPts;
        const maxPts = gradeSubjects.length * (['GRADE 7', 'GRADE 8', 'GRADE 9'].includes(learner.grade) ? 8 : 4);
        const pct = maxPts > 0 ? Math.round((totalPts / maxPts) * 100) : 0;

        // Resolve full curriculum term label (e.g. "Term 1" or "Semester 2")
        const termLabel = TERMS.find(t => t.id === term)?.name || `Term ${term.replace(/^T/, '')}`;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.eduvantage.app';
        const portalLink = `${baseUrl}/parent-home?adm=${learner.adm}`;

        if (channel === 'sms' || channel === 'both') {
          if (parentPhone) {
            const message = getResultNotificationMessage(learner.name, termLabel, totalPts, maxPts, schoolName);
            const res = await sendSMS({ to: parentPhone, message, schoolName, ...creds });
            results.push({ adm: learner.adm, channel: 'sms', ...res });
            if (res.success) {
              const recipient = res.recipients?.[0] || null;
              logEntries.push({
                to: parentPhone,
                message,
                type: 'report_card',
                status: 'submitted',
                sentBy: session.username || session.name,
                atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
                providerStatus: recipient?.status || '',
                providerStatusCode: recipient?.statusCode || null
              });
            }
          }
        }

        if (channel === 'email' || channel === 'both') {
          if (parentEmail) {
            const html = getReportCardTemplate({
              learnerName: learner.name,
              term: termLabel,
              year: new Date().getFullYear(),
              totalPts,
              maxPts,
              pct,
              promoStatus: pct >= 50 ? 'promote' : 'review',
              link: portalLink
            });
            const res = await sendEmail({
              to: parentEmail,
              subject: `[${schoolName}] ${termLabel} Progress Report - ${learner.name}`,
              html
            });
            results.push({ adm: learner.adm, channel: 'email', ...res });
          }
        }
      }

      if (type === 'absenteeism') {
        const { pct, absences } = target;
        if (channel === 'sms' || channel === 'both') {
          if (parentPhone) {
            const message = getAbsenteeismAlertMessage(learner.name, pct, absences, schoolName);
            const res = await sendSMS({ to: parentPhone, message, schoolName, ...creds });
            results.push({ adm: learner.adm, channel: 'sms', ...res });
            if (res.success) {
              const recipient = res.recipients?.[0] || null;
              logEntries.push({
                to: parentPhone,
                message,
                type: 'attendance_alert',
                status: 'submitted',
                sentBy: session.username || session.name,
                atMessageId: recipient?.messageId || res.messageIds?.[0] || '',
                providerStatus: recipient?.status || '',
                providerStatusCode: recipient?.statusCode || null
              });
            }
          }
        }
      }
    }

    if (logEntries.length > 0) {
      await logBulkComms(logEntries, tid);
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

async function logBulkComms(entries, tenantId) {
  try {
    const logs = await kvGet('paav7_sms', [], tenantId) || [];
    const index = await kvGet('paav_sms_message_index', {}, 'platform-master') || {};

    for (const entry of entries) {
      const id = entry.atMessageId || 's' + Date.now() + Math.random().toString(36).substr(2, 5);
      logs.unshift({
        ...entry,
        id,
        date: new Date().toISOString()
      });
      if (entry.atMessageId) {
        index[entry.atMessageId] = { tenantId, logId: id, updatedAt: new Date().toISOString() };
      }
    }

    await Promise.all([
      kvSet('paav7_sms', logs.slice(0, 500), tenantId),
      kvSet('paav_sms_message_index', index, 'platform-master')
    ]);
  } catch (e) {
    console.error('Failed to log bulk comms:', e);
  }
}
