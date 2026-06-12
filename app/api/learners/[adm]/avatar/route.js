export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvUpdateLearnerAvatar } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/learners/[adm]/avatar
 * Upload or update a learner's profile photo (stored as base64 in the DB).
 * Used by the Edit Learner modal and the learner profile page.
 *
 * Body: { avatar: "data:image/jpeg;base64,..." }
 * Auth: admin only
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'super-admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorised. Admin access required.' }, { status: 403 });
    }

    const { adm } = params;
    if (!adm) {
      return NextResponse.json({ error: 'Admission number is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { avatar } = body;

    if (!avatar) {
      return NextResponse.json({ error: 'No avatar provided.' }, { status: 400 });
    }

    // Basic validation — must be a base64 data URL
    if (!avatar.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Must be a base64 data URL.' }, { status: 400 });
    }

    // Size guard — reject if > 500KB (should already be compressed client-side)
    const sizeKB = Math.round((avatar.length * 3) / 4 / 1024);
    if (sizeKB > 500) {
      return NextResponse.json({ error: `Image too large (${sizeKB}KB). Max 500KB.` }, { status: 413 });
    }

    const tenantId = session.tenantId || 'platform-master';
    await kvUpdateLearnerAvatar(adm, avatar, tenantId);

    return NextResponse.json({ ok: true, adm, message: 'Profile photo updated successfully.' });
  } catch (error) {
    console.error('[Avatar PATCH] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update avatar.' }, { status: 500 });
  }
}

/**
 * DELETE /api/learners/[adm]/avatar
 * Remove a learner's profile photo.
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'super-admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 403 });
    }

    const { adm } = params;
    const tenantId = session.tenantId || 'platform-master';
    await kvUpdateLearnerAvatar(adm, null, tenantId);

    return NextResponse.json({ ok: true, adm, message: 'Profile photo removed.' });
  } catch (error) {
    console.error('[Avatar DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
