import { NextResponse } from 'next/server';
import { getClient, execute, query } from '@/lib/db';
import { sendSMS } from '@/lib/sms-client';
import { normaliseKenyanNumber } from '@/lib/sms-client';

export const runtime = 'edge';

/**
 * POST /api/attendance/sync
 * Endpoint for ZKTeco (or similar) biometric devices to push attendance records.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { device_id, user_id, timestamp, punch_type, tenant_id = 'platform-master' } = body;

    if (!user_id || !timestamp) {
      return NextResponse.json({ success: false, error: 'Missing user_id or timestamp' }, { status: 400 });
    }

    // Identify user in the database via Biometric ID
    // 1. Check Learners
    const learnerRows = await query('SELECT adm, name, parentPhone FROM learners WHERE biometric_id = ? AND tenant_id = ?', [user_id, tenant_id]);
    
    let dbUser = null;
    let userType = null;
    let parentPhone = null;

    if (learnerRows.length > 0) {
      dbUser = learnerRows[0];
      userType = 'student';
      parentPhone = dbUser.parentPhone;
    } else {
      // 2. Check Staff
      const staffRows = await query('SELECT id, name, phone FROM staff WHERE biometric_id = ? AND tenant_id = ?', [user_id, tenant_id]);
      if (staffRows.length > 0) {
        dbUser = staffRows[0];
        userType = 'staff';
      }
    }

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'Biometric ID not registered to any user' }, { status: 404 });
    }

    // Format Date and Time
    const dateObj = new Date(timestamp);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().split(' ')[0];

    // Upsert into attendance table
    const id = userType === 'student' ? dbUser.adm : dbUser.id;
    const grade_date_adm = `bio|${dateStr}|${id}`; 

    await execute(`
      INSERT INTO attendance (grade_date_adm, tenant_id, status, user_type, time_in) 
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(grade_date_adm, tenant_id) DO UPDATE SET time_in = excluded.time_in
    `, [grade_date_adm, tenant_id, 'Present', userType, timeStr]);

    // Send SMS Notification (If it's a student Check-In and parent has phone)
    if (userType === 'student' && punch_type === 'Check-In' && parentPhone) {
      const formattedPhone = normaliseKenyanNumber(parentPhone);
      if (formattedPhone) {
        const msg = `Dear Parent, ${dbUser.name} has safely arrived at school at ${timeStr}.`;
        // Fire and forget SMS so it doesn't block device response
        sendSMS({ to: formattedPhone, message: msg }).catch(e => console.error('[SMS Error]', e));
      }
    }

    return NextResponse.json({ success: true, message: 'Attendance synced successfully' });
  } catch (error) {
    console.error('[Biometric Sync API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
