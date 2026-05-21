export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { query, kvGet } from '@/lib/db';

/**
 * GET /api/health
 * Platform monitoring dashboard — returns DB connectivity, tenant stats,
 * subscription health, pending payment counts, and SMS throughput.
 *
 * Public (status only): GET /api/health
 * Full metrics (auth required): GET /api/health?detail=1  (Bearer CRON_SECRET)
 */
export async function GET(request) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const wantDetail = searchParams.get('detail') === '1';

  // Auth check for detailed metrics
  if (wantDetail) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // ── Core DB ping ──────────────────────────────────────────────────────
    await query('SELECT 1');
    const dbLatency = Date.now() - start;

    const base = {
      status: 'UP',
      database: 'connected',
      dbLatencyMs: dbLatency,
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      platform: 'EduVantage SaaS',
    };

    if (!wantDetail) {
      return NextResponse.json(base, { status: 200 });
    }

    // ── Extended metrics (authenticated) ─────────────────────────────────
    const [
      tenantRows,
      activeSubRows,
      expiredSubRows,
      pendingMpesaRows,
      staffRows,
    ] = await Promise.allSettled([
      query('SELECT COUNT(*) as n FROM subscriptions'),
      query("SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active' AND expires_at > datetime('now')"),
      query("SELECT COUNT(*) as n FROM subscriptions WHERE status != 'active' OR expires_at < datetime('now')"),
      query("SELECT COUNT(*) as n FROM nexed_mpesa_logs WHERE status = 'pending'"),
      query('SELECT COUNT(*) as n FROM staff'),
    ]);

    const safeCount = (settled) =>
      settled.status === 'fulfilled' ? Number(settled.value[0]?.n ?? 0) : -1;

    // SMS log length from platform KV
    let smsQueueLen = -1;
    try {
      const smsLog = (await kvGet('paav7_sms', [], 'platform-master')) || [];
      smsQueueLen = smsLog.length;
    } catch { /* non-fatal */ }

    // Settlement queue
    let settlementPending = -1;
    try {
      const sq = (await kvGet('paav_settlement_queue', [], 'platform-master')) || [];
      settlementPending = sq.filter(i => i.status === 'pending').length;
    } catch { /* non-fatal */ }

    return NextResponse.json({
      ...base,
      metrics: {
        tenants: {
          total: safeCount(tenantRows),
          activeSubscriptions: safeCount(activeSubRows),
          expiredSubscriptions: safeCount(expiredSubRows),
        },
        payments: {
          pendingMpesaLogs: safeCount(pendingMpesaRows),
          pendingSettlements: settlementPending,
        },
        platform: {
          totalStaff: safeCount(staffRows),
          smsLogEntries: smsQueueLen,
        },
      },
      riskFlags: {
        highPendingPayments: safeCount(pendingMpesaRows) > 50,
        highPendingSettlements: settlementPending > 20,
        cronSecretConfigured: !!process.env.CRON_SECRET,
        tursoConfigured: !!(process.env.TURSO_URL && process.env.TURSO_TOKEN),
      }
    }, { status: 200 });

  } catch (err) {
    console.error('[HealthCheck] Failed:', err.message);
    return NextResponse.json({
      status: 'DOWN',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
