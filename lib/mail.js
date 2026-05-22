import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send an email using Resend.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    console.error('RESEND_API_KEY is missing. Email not sent.');
    return { error: 'RESEND_API_KEY is missing' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'EduVantage Portal <portal@eduvantage.app>', // Updated domain
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email send catch error:', err);
    return { error: err.message };
  }
}

/**
 * Generate a simple fee receipt HTML template.
 */
export function getReceiptTemplate({ learnerName, adm, amount, term, date, ref, balance }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #1e293b; text-align: center;">Fee Payment Receipt</h2>
      <p>Dear Parent,</p>
      <p>We have successfully recorded a payment for <strong>${learnerName}</strong>.</p>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #64748b;">Learner Name:</td><td style="padding: 5px 0; font-weight: bold;">${learnerName}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Admission No:</td><td style="padding: 5px 0; font-weight: bold;">${adm}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Amount Paid:</td><td style="padding: 5px 0; font-weight: bold; color: #16a34a;">KSH ${Number(amount).toLocaleString()}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Term:</td><td style="padding: 5px 0; font-weight: bold;">${term}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Date:</td><td style="padding: 5px 0; font-weight: bold;">${date}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Reference:</td><td style="padding: 5px 0; font-weight: bold;">${ref || 'N/A'}</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <p style="font-size: 18px;">Remaining Balance: <strong style="color: ${balance <= 0 ? '#16a34a' : '#dc2626'}">KSH ${Number(balance).toLocaleString()}</strong></p>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        School Portal Notification<br />
        This is an automated receipt.
      </p>
    </div>
  `;
}

/**
 * Generate a report card summary HTML template.
 */
export function getReportCardTemplate({ learnerName, term, year, totalPts, maxPts, pct, promoStatus, link }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #1e293b; text-align: center;">Termly Progress Report</h2>
      <p>Dear Parent,</p>
      <p>The academic report for <strong>${learnerName}</strong> for <strong>Term ${term} ${year}</strong> is now available.</p>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Overall Performance</div>
        <div style="font-size: 24px; font-weight: bold; color: #1e293b;">${totalPts} / ${maxPts} Points</div>
        <div style="font-size: 16px; color: #1e293b; margin-top: 5px;">Grade Average: <strong>${pct}%</strong></div>
        <div style="margin-top: 10px; font-weight: bold; color: ${promoStatus === 'promote' ? '#16a34a' : '#d97706'}">
          ${promoStatus === 'promote' ? '✅ PROMOTED' : '⚠ UNDER REVIEW'}
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background: #1e293b; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          View Full Report Card
        </a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        You can also log in to the school portal at any time to view detailed marks and fee statements.
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        School Portal Management System<br />
        "Empowering Excellence"
      </p>
    </div>
  `;
}

/**
 * Generate a fee balance reminder HTML template.
 */
export function getFeeBalanceTemplate({ learnerName, balance, arrears, currentTerm, paybill, adm }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://eduvantage.app/eduvantage-logo.png" alt="EduVantage Logo" style="width: 80px; height: 80px;" />
        <h2 style="color: #1E40AF; margin-top: 10px;">Fee Statement Reminder</h2>
      </div>
      
      <p>Dear Parent/Guardian,</p>
      <p>This is a friendly reminder regarding the outstanding fee balance for <strong>${learnerName}</strong> (ADM: ${adm}).</p>
      
      <div style="background: #FFFBEB; border: 1px solid #FEF3C7; padding: 20px; border-radius: 12px; margin: 25px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #92400E;">Current Term Balance:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">KSH ${Number(currentTerm).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #92400E;">Accumulated Arrears:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">KSH ${Number(arrears).toLocaleString()}</td>
          </tr>
          <tr style="border-top: 2px solid #FEF3C7;">
            <td style="padding: 12px 0; color: #92400E; font-size: 18px; font-weight: 800;">TOTAL DUE:</td>
            <td style="padding: 12px 0; text-align: right; font-size: 20px; font-weight: 800; color: #dc2626;">KSH ${Number(balance).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background: #F1F5F9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <h4 style="margin-top: 0; color: #475569;">Payment Instructions:</h4>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
          Pay via M-Pesa Paybill: <strong>${paybill || '4091000'}</strong><br />
          Account Number: <strong>${adm}</strong><br />
          Reference: <em>Learner's Full Name</em>
        </p>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        If you have already made this payment, please disregard this message or log in to the portal to verify your statement.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://portal.eduvantage.app" style="background: #1E40AF; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Go to Portal
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        School Portal · Automated Reminder<br />
        "Innovation in Education"
      </p>
    </div>
  `;
}
