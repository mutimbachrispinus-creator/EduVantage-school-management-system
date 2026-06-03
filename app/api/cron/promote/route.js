export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ALL_GRADES } from '@/lib/cbe';
import { kvGet, kvSet } from '@/lib/db';

/**
 * app/api/cron/promote/route.js
 * 
 * Automated New Year Promotion & Fee Reset
 */

export async function GET(req) {
  // Security check for Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const currentYear = new Date().getFullYear();

  try {
    // 1. Fetch current data
    const learners = await kvGet('paav6_learners', []);
    const lastYear = await kvGet('paav_last_promotion_year', 0);
    const feeCfg   = await kvGet('paav6_feecfg', {});

    // 2. Prevent double execution in the same year
    if (currentYear <= lastYear) {
      return NextResponse.json({ ok: true, msg: `Promotion already completed for ${currentYear}.` });
    }

    // 3. Promotion & Arrears Logic
    const promotedList = learners.map(l => {
      const currentGrade = l.grade;
      let nextGrade = currentGrade;

      // Calculate Arrears
      const annualFee = feeCfg[currentGrade]?.annual || 5000;
      const paid = (l.t1 || 0) + (l.t2 || 0) + (l.t3 || 0);
      const diff = annualFee - paid;
      const accumulated = (l.arrears || 0) + (diff > 0 ? diff : 0);

      if (currentGrade === 'GRADE 12' || currentGrade === 'GRADE 9') {
        nextGrade = 'ALUMNI';
      } else if (currentGrade === 'ALUMNI') {
        nextGrade = 'ALUMNI'; 
      } else {
        const idx = ALL_GRADES.indexOf(currentGrade);
        if (idx !== -1 && idx < ALL_GRADES.length - 1) {
          nextGrade = ALL_GRADES[idx + 1];
        }
      }

      return {
        ...l,
        grade: nextGrade,
        arrears: accumulated,
        t1: 0,
        t2: 0,
        t3: 0
      };
    });

    // 4. Save back to DB
    await kvSet('paav6_learners', promotedList);
    await kvSet('paav_last_promotion_year', currentYear);

    return NextResponse.json({ 
      ok: true, 
      msg: `Success! ${promotedList.length} learners processed for the ${currentYear} academic year.`,
      year: currentYear
    });

  } catch (err) {
    console.error('[Promotion Cron Error]:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
