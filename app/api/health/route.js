export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/health
 * Simple health check for monitoring database connectivity and system status.
 */
export async function GET() {
  const start = Date.now();
  try {
    // 1. Verify DB Connectivity
    await query('SELECT 1');
    
    // 2. Fetch basic system info
    const academicYear = new Date().getFullYear();
    
    return NextResponse.json({
      status: 'UP',
      database: 'connected',
      academicYear,
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - start}ms`,
      version: '2.0.0'
    }, { status: 200 });
  } catch (err) {
    console.error('[HealthCheck] Failed:', err.message);
    return NextResponse.json({
      status: 'DOWN',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
