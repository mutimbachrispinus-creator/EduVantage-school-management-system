export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/notifications  — fetch notifications for the current user
 * POST /api/notifications  — create a notification (server-to-server or admin)
 */

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ notifications: [] });

    const all = (await kvGet('paav_notifications', [], session.tenantId)) || [];

    // Return only notifications for this user (by role, userId, or 'ALL')
    const mine = all.filter(n =>
      n.to === 'ALL' ||
      n.to === session.role ||
      n.to === session.userId ||
      n.to === session.username
    ).slice(-50).reverse(); // newest first, max 50

    return NextResponse.json({ notifications: mine });
  } catch (e) {
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(req) {
  try {
    const session = await getSession();
    const body = await req.json();

    const { action, tenantId: bodyTenant } = body;

    // Allow server-side creation (from callback) with explicit tenantId
    const tid = session?.tenantId || bodyTenant;
    if (!tid) return NextResponse.json({ error: 'No tenant context' }, { status: 400 });

    if (action === 'create') {
      const { to, title, message, icon, type, link } = body;
      const notifications = (await kvGet('paav_notifications', [], tid)) || [];

      const newNote = {
        id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        to: to || 'ALL',
        title: title || 'Notification',
        message: message || '',
        icon: icon || '🔔',
        type: type || 'info',   // info | success | warning | danger
        link: link || null,
        createdAt: new Date().toISOString(),
        readBy: []
      };

      notifications.push(newNote);
      // Keep max 200 notifications (prune oldest)
      if (notifications.length > 200) notifications.splice(0, notifications.length - 200);
      await kvSet('paav_notifications', notifications, tid);

      return NextResponse.json({ ok: true, notification: newNote });
    }

    if (action === 'mark_read') {
      const { notificationId, userId } = body;
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const notifications = (await kvGet('paav_notifications', [], tid)) || [];
      const note = notifications.find(n => n.id === notificationId);
      if (note && !note.readBy.includes(userId || session.userId)) {
        note.readBy.push(userId || session.userId);
      }
      await kvSet('paav_notifications', notifications, tid);
      return NextResponse.json({ ok: true });
    }

    if (action === 'mark_all_read') {
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const notifications = (await kvGet('paav_notifications', [], tid)) || [];
      const uid = session.userId || session.username;
      notifications.forEach(n => { if (!n.readBy.includes(uid)) n.readBy.push(uid); });
      await kvSet('paav_notifications', notifications, tid);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
