export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, execute, query } from '@/lib/db';
import { sendSMS, sendFeeReminderSMS, getResultNotificationMessage } from '@/lib/sms-client';
import { sendEmail, getReportCardTemplate, getFeeBalanceTemplate } from '@/lib/mail';
import { calcLearnerReportData, DEFAULT_SUBJECTS } from '@/lib/cbe';

export async function POST(request) {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { type, channel, targets, term } = await request.json();

  if (!targets || !targets.length) {
    return NextResponse.json({ ok: false, error: 'No targets specified' });
  }

  const [learners, marks, feecfg, paybill, weights, savedCreds] = await Promise.all([
    kvGet('paav6_learners'),
    kvGet('paav6_marks'),
    kvGet('paav6_feecfg'),
    kvGet('paav_paybill_accounts'),
    kvGet('paav_grading_weights'),
    kvGet('paav_at_creds', {}, 'platform-master') // Centralized SMS control
  ]);

  const creds = {
    username: savedCreds?.username || process.env.AT_USERNAME || 'sandbox',
    apiKey:   savedCreds?.apiKey   || process.env.AT_API_KEY  || '',
    senderId: savedCreds?.senderId || process.env.AT_SENDER_ID || '',
  };

  const results = [];

  for (const target of targets) {
    const learner = learners.find(l => String(l.adm) === String(target.adm));
    if (!learner) continue;

    const parentPhone = learner.phone;
    const parentEmail = learner.parentEmail;

    if (type === 'balance') {
      const cfg = feecfg[learner.grade] || {};
      const annual = (cfg.t1||0) + (cfg.t2||0) + (cfg.t3||0) || cfg.annual || 5000;
      const paid = (learner.t1||0) + (learner.t2||0) + (learner.t3||0);
      const arrears = learner.arrears || 0;
      const balance = annual + arrears - paid;
      const currentTermBal = Math.max(0, annual - paid);

      const pb = paybill?.[0]?.value || '4091000';

      if (channel === 'sms' || channel === 'both') {
        if (parentPhone) {
          const res = await sendFeeReminderSMS({
            parentPhone,
            learnerName: learner.name,
            balance,
            paybill: pb,
            admNo: learner.adm
          }, creds);
          results.push({ adm: learner.adm, channel: 'sms', ...res });
          // Log to DB
          await logComms({ to: parentPhone, message: `Fee Balance: KSH ${balance}`, type: 'fee_reminder', status: res.success ? 'sent' : 'failed', sentBy: session.username });
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
      
      const subjCfg = await kvGet('paav_teacher_assignments') || {};
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
          const message = getResultNotificationMessage(learner.name, term.replace('T', ''), totalPts, maxPts);
          const res = await sendSMS({ to: parentPhone, message, ...creds });
          results.push({ adm: learner.adm, channel: 'sms', ...res });
          await logComms({ to: parentPhone, message, type: 'report_card', status: res.success ? 'sent' : 'failed', sentBy: session.username });
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
          await logComms({ to: parentPhone, message, type: 'attendance_alert', status: res.success ? 'sent' : 'failed', sentBy: session.username });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}

async function logComms(entry) {
  try {
    const logs = await kvGet('paav7_sms') || [];
    logs.unshift({
      ...entry,
      id: 's' + Date.now() + Math.random().toString(36).substr(2, 5),
      date: new Date().toISOString()
    });
    await execute(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, strftime('%s','now'))
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, 
                   ['paav7_sms', JSON.stringify(logs.slice(0, 500))]);
  } catch (e) {
    console.error('Failed to log comms:', e);
  }
}
