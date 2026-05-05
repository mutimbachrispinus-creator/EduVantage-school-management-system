export const runtime = 'edge';
/**
 * app/api/db/route.js — Turso KV proxy
 *
 * Drop-in replacement for the window._cloudSv / _cloudLd / _cloudRm calls
 * that originally ran through /api/turso in the single-HTML prototype.
 *
 * The client sends POST requests with a `requests` array (pipeline):
 *   { requests: [ { type, key, value?, keys? } ] }
 *
 * Supported types:
 *   get          → read one key
 *   set          → write one key
 *   delete       → remove one key
 *   timestamps   → return updated_at for a list of keys (smart-poll)
 *   getAll       → read multiple keys at once
 *
 * TURSO_URL and TURSO_TOKEN are server-only env vars — never exposed to the browser.
 */

import { NextResponse } from 'next/server';
import { kvGet, kvSet, kvDelete, kvTimestamps } from '@/lib/db';
import { getSession } from '@/lib/auth';

/* ─── Auth check ────────────────────────────────────────────────────────── */
async function authenticate() {
  // Allow requests that carry a valid session cookie ONLY
  const session = await getSession();
  if (session) return session;
  return null;
}

export async function POST(request) {
  try {
    const auth = await authenticate();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const { requests } = body;
    const headerTenant = request.headers.get('x-tenant-id');
    const impTenant = (auth.role === 'super-admin' && headerTenant) ? headerTenant : null;

    if (!Array.isArray(requests)) {
      return NextResponse.json({ error: 'requests must be an array' }, { status: 400 });
    }

    const results = [];
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      try {
        const res = await handleRequest(req, auth, impTenant);
        results.push(res);
      } catch (reqErr) {
        console.error(`[api/db] Request #${i} (${req.type}) failed:`, reqErr.message);
        results.push({ 
          type: req.type, 
          error: reqErr.message || 'Internal error in sub-request',
          ok: false 
        });
      }
    }
    return NextResponse.json({ results });

  } catch (err) {
    console.error('[api/db] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── GET (single key shorthand) ────────────────────────────────────────── */
export async function GET(request) {
  try {
    const auth = await authenticate();
    if (!auth) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

    let { value, updatedAt } = await (async () => {
      const { kvGetWithMeta } = await import('@/lib/db');
      return await kvGetWithMeta(key);
    })();

    // Security: Filter staff requests if not admin
    if (key === 'paav_staff_reqs' && auth.role !== 'admin' && auth.id) {
      if (Array.isArray(value)) value = value.filter(r => r.userId === auth.id);
    }

    return NextResponse.json({ value, updatedAt });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── Request dispatcher ────────────────────────────────────────────────── */
async function handleRequest(req, auth, impTenant = null) {
  const tenantId = impTenant || auth.tenantId || 'platform-master';

  switch (req.type) {
    /* ── Read one key ── */
    case 'get': {
      const { kvGetWithMeta } = await import('@/lib/db');
      
      // Security: Only super-admin can read AT credentials
      if (req.key === 'paav_at_creds' && auth.role !== 'super-admin') {
        return { type: 'get', key: req.key, value: null, error: 'Forbidden' };
      }

      let { value, updatedAt } = await kvGetWithMeta(req.key, tenantId);
      
      // Security: Filter staff requests if not admin
      if (req.key === 'paav_staff_reqs' && auth.role !== 'admin' && auth.id) {
        if (Array.isArray(value)) value = value.filter(r => r.userId === auth.id);
      }
      return { type: 'get', key: req.key, value, updatedAt };
    }

    /* ── Write one key ── */
    case 'set': {
      if (req.key === undefined || req.value === undefined) return { type: 'set', error: 'key/value required' };

      const systemKeys = ['paav6_staff', 'paav6_feecfg', 'paav8_grad', 'paav8_subj', 'paav_at_creds'];
      const superOnlyKeys = ['paav_at_creds'];

      if (superOnlyKeys.includes(req.key) && auth.role !== 'super-admin') return { type: 'set', error: 'Forbidden' };
      if (systemKeys.includes(req.key) && !['admin', 'super-admin'].includes(auth.role)) return { type: 'set', error: 'Forbidden' };

      await kvSet(req.key, req.value, tenantId);
      return { type: 'set', key: req.key, ok: true };
    }

    /* ── Specialized Staff Request Handlers ── */
    case 'submitStaffRequest': {
      if (!req.request) return { type: req.type, error: 'request object required' };
      const { kvSubmitStaffRequest } = await import('@/lib/db');
      const newReq = { ...req.request, id: Date.now(), userId: auth.id, userName: auth.name, userRole: auth.role, status: 'pending', date: new Date().toLocaleDateString('en-KE') };
      await kvSubmitStaffRequest(newReq, tenantId);
      return { type: req.type, ok: true, request: newReq };
    }

    case 'updateStaffRequestStatus': {
      if (auth.role !== 'admin') return { type: req.type, error: 'Admin only' };
      const { kvUpdateStaffRequestStatus } = await import('@/lib/db');
      await kvUpdateStaffRequestStatus(req.id, req.status, tenantId);
      return { type: req.type, ok: true };
    }

    case 'delete': {
      if (auth.role !== 'admin') return { type: 'delete', error: 'Unauthorized' };
      await kvDelete(req.key, tenantId);
      return { type: 'delete', key: req.key, ok: true };
    }

    case 'timestamps': {
      const keys = Array.isArray(req.keys) ? req.keys : [];
      const rows = await kvTimestamps(keys, tenantId);
      const map  = {};
      rows.forEach(r => { map[r.key] = r.updated_at; });
      return { type: 'timestamps', timestamps: map };
    }

    case 'updateStaffAvatar': {
      const { kvUpdateStaffAvatar } = await import('@/lib/db');
      await kvUpdateStaffAvatar(req.id, req.avatar); // Staff is currently global-ish in staff table but filtered by tenant in kvGet
      return { type: req.type, ok: true };
    }

    case 'updateStaffProfile': {
      const { kvUpdateStaffProfile } = await import('@/lib/db');
      await kvUpdateStaffProfile(req.id, req.name, req.phone, req.avatar, null, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateLearner': {
      if (auth.role !== 'admin') return { type: req.type, error: 'Unauthorized' };
      const { kvUpdateLearner } = await import('@/lib/db');
      await kvUpdateLearner(req.oldAdm, req.details, tenantId);
      return { type: req.type, ok: true };
    }

    case 'deleteLearner': {
      if (auth.role !== 'admin') return { type: req.type, error: 'Unauthorized' };
      const { kvDeleteLearner } = await import('@/lib/db');
      await kvDeleteLearner(req.adm, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateMark': {
      const { kvUpdateMark } = await import('@/lib/db');
      await kvUpdateMark(req.gsa, req.adm, req.score, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateMarksBulk': {
      const { kvUpdateMarksBulk } = await import('@/lib/db');
      await kvUpdateMarksBulk(req.marks, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateAttendanceBulk': {
      const { kvUpdateAttendanceBulk } = await import('@/lib/db');
      await kvUpdateAttendanceBulk(req.attMap, tenantId);
      return { type: req.type, ok: true };
    }

    case 'upsertMessage': {
      const { kvUpsertMessage } = await import('@/lib/db');
      await kvUpsertMessage(req.message, tenantId);
      return { type: req.type, ok: true };
    }

    case 'logPresence': {
      const { kvLogPresence } = await import('@/lib/db');
      await kvLogPresence(req.userId, req.date, req.record, tenantId);
      return { type: req.type, ok: true };
    }

    case 'upsertDuty': {
      const { kvUpsertDuty } = await import('@/lib/db');
      await kvUpsertDuty(req.duty, tenantId);
      return { type: req.type, ok: true };
    }

    case 'deleteDuty': {
      const { kvDeleteDuty } = await import('@/lib/db');
      await kvDeleteDuty(req.id, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getAll': {
      const keys = Array.isArray(req.keys) ? req.keys : [];
      const { kvGetWithMeta } = await import('@/lib/db');
      
      const results = await Promise.all(keys.map(async (k) => {
        let { value, updatedAt } = await kvGetWithMeta(k, tenantId);
        
        // Security: Only super-admin can read AT credentials
        if (k === 'paav_at_creds' && auth.role !== 'super-admin') {
          value = null;
        }

        if (k === 'paav_staff_reqs' && auth.role !== 'admin' && auth.id) {
          if (Array.isArray(value)) value = value.filter(r => r.userId === auth.id);
        }
        
        if (!['admin','parent','super-admin'].includes(auth.role)) {
          if (['paav6_feecfg', 'paav6_paylog'].includes(k)) value = k === 'paav6_paylog' ? [] : {};
          if (k === 'paav6_learners' && Array.isArray(value)) value = value.map(l => ({ ...l, t1: 0, t2: 0, t3: 0, arrears: 0 }));
        }
        
        return { key: k, value, updatedAt };
      }));

      const data = {}; const meta = {};
      results.forEach(r => {
        data[r.key] = r.value;
        meta[r.key] = r.updatedAt;
      });
      
      return { type: 'getAll', data, meta };
    }
    
    case 'logActivity': {
      const { logAction } = await import('@/lib/db');
      await logAction(auth, req.activity.action, req.activity.details);
      return { type: req.type, ok: true };
    }

    case 'recordPayment': {
      if (auth.role !== 'admin') return { type: req.type, error: 'Unauthorized' };
      const { kvRecordPayment } = await import('@/lib/db');
      await kvRecordPayment(req.payment, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getDatabaseDump': {
      if (auth.role !== 'admin') return { error: 'Unauthorized' };
      const { query } = await import('@/lib/db');
      const all = await query('SELECT key, value FROM kv WHERE tenant_id = ?', [tenantId]);
      const data = {};
      all.forEach(r => { try { data[r.key] = JSON.parse(r.value); } catch { data[r.key] = r.value; } });
      return { type: req.type, data };
    }

    case 'bulkAddLearners': {
      if (auth.role !== 'admin') return { type: req.type, error: 'Unauthorized' };
      const { kvBulkAddLearners } = await import('@/lib/db');
      await kvBulkAddLearners(req.learners, tenantId);
      return { type: req.type, ok: true };
    }

    default:
      return { error: `Unknown request type: ${req.type}` };
  }
}


