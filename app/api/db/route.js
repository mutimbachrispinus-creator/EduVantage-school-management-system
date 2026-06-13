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
import { PAAV_KEYS } from '@/lib/constants';
import { getSession } from '@/lib/auth';

/* ─── Auth check ────────────────────────────────────────────────────────── */
async function authenticate() {
  // Allow requests that carry a valid session cookie ONLY
  const session = await getSession();
  if (session) return session;
  return null;
}

function hasRole(auth, roles) {
  return roles.includes(auth.role);
}

function isTeachingRole(auth) {
  return ['admin', 'super-admin', 'teacher', 'jss_teacher', 'senior_teacher'].includes(auth.role);
}

export async function POST(request) {
  try {
    const auth = await authenticate();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { requests } = body;
    const headerTenant = request.headers.get('x-tenant-id');
    let impTenant = (auth.role === 'super-admin' && headerTenant) ? headerTenant : null;

    // Allow parents to fetch from other schools they are linked to
    if (!impTenant && auth.role === 'parent' && headerTenant && headerTenant !== auth.tenantId) {
      const { query } = await import('@/lib/db');
      const linked = await query('SELECT id FROM staff WHERE id = ? AND tenant_id = ?', [auth.id, headerTenant]);
      if (linked.length > 0) impTenant = headerTenant;
    }

    if (!Array.isArray(requests)) {
      return NextResponse.json({ error: 'requests must be an array' }, { status: 400 });
    }

    const results = new Array(requests.length).fill(null);
    const getReqs = [];
    const getIndices = [];

    // 1. Group all 'get' requests to prevent Cloudflare Worker subrequest limits
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].type === 'get' && requests[i].key) {
        getReqs.push(requests[i].key);
        getIndices.push(i);
      }
    }

    if (getReqs.length > 0) {
      try {
        const batchReq = { type: 'getAll', keys: getReqs };
        const batchRes = await handleRequest(batchReq, auth, impTenant);
        for (let j = 0; j < getIndices.length; j++) {
          const idx = getIndices[j];
          const key = getReqs[j];
          results[idx] = {
            type: 'get',
            key: key,
            value: batchRes.data?.[key] ?? null,
            updatedAt: batchRes.meta?.[key] ?? 0
          };
        }
      } catch (e) {
        for (let j = 0; j < getIndices.length; j++) {
          results[getIndices[j]] = { type: 'get', key: getReqs[j], error: e.message, ok: false };
        }
      }
    }

    // 2. Process all other requests sequentially
    for (let i = 0; i < requests.length; i++) {
      if (results[i] !== null) continue; // already processed by batch
      const req = requests[i];
      try {
        results[i] = await handleRequest(req, auth, impTenant);
      } catch (reqErr) {
        console.error(`[api/db] Request #${i} (${req.type}) failed:`, reqErr.message);
        results[i] = { 
          type: req.type, 
          error: reqErr.message || 'Internal error in sub-request',
          ok: false 
        };
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
    if (key === 'paav_staff_reqs' && !['admin', 'super-admin'].includes(auth.role) && auth.id) {
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
      if (req.key === 'paav_staff_reqs' && !['admin', 'super-admin'].includes(auth.role) && auth.id) {
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

      // When the learner list is saved, silently track overages for renewal billing.
      // Schools are NEVER blocked — any learners above the registered count are noted
      // and factored in when the subscription is next renewed.
      if (req.key === 'paav6_learners' && Array.isArray(req.value)) {
        try {
          const { kvBulkAddLearners } = await import('@/lib/db');
          await kvBulkAddLearners(req.value, tenantId);
        } catch (e) {
          console.warn('[api/db] Learner relational sync failed:', e.message);
        }
      }

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
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Admin only' };
      const { kvUpdateStaffRequestStatus } = await import('@/lib/db');
      await kvUpdateStaffRequestStatus(req.id, req.status, tenantId);
      return { type: req.type, ok: true };
    }

    case 'delete': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: 'delete', error: 'Unauthorized' };
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
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvUpdateLearner } = await import('@/lib/db');
      await kvUpdateLearner(req.oldAdm, req.details, tenantId);
      return { type: req.type, ok: true };
    }

    case 'deleteLearner': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvDeleteLearner } = await import('@/lib/db');
      await kvDeleteLearner(req.adm, tenantId);
      return { type: req.type, ok: true };
    }
    
    case 'deleteGradeLearners': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvDeleteGradeLearners } = await import('@/lib/db');
      await kvDeleteGradeLearners(req.grade, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getDeletedLearners':
    case 'get_deleted_learners': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { getDeletedLearners } = await import('@/lib/db');
      const value = await getDeletedLearners(tenantId);
      return { type: req.type, ok: true, value };
    }

    case 'restoreLearner':
    case 'restore_learner': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { restoreLearner } = await import('@/lib/db');
      await restoreLearner(req.adm, tenantId);
      return { type: req.type, ok: true };
    }

    case 'hard_delete_learner': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { hardDeleteLearner } = await import('@/lib/db');
      await hardDeleteLearner(req.adm, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateMark': {
      if (!isTeachingRole(auth)) return { type: req.type, error: 'Unauthorized' };
      const { kvUpdateMark } = await import('@/lib/db');
      await kvUpdateMark(req.gsa, req.adm, req.score, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateMarksBulk': {
      if (!isTeachingRole(auth)) return { type: req.type, error: 'Unauthorized' };
      const { kvUpdateMarksBulk } = await import('@/lib/db');
      await kvUpdateMarksBulk(req.marks, tenantId);
      return { type: req.type, ok: true };
    }

    case 'updateAttendanceBulk': {
      if (!isTeachingRole(auth)) return { type: req.type, error: 'Unauthorized' };
      const { kvUpdateAttendanceBulk } = await import('@/lib/db');
      await kvUpdateAttendanceBulk(req.attMap, tenantId);
      return { type: req.type, ok: true };
    }

    case 'upsertMessage': {
      if (!hasRole(auth, ['admin', 'super-admin', 'teacher', 'jss_teacher', 'senior_teacher', 'staff', 'parent', 'learner'])) {
        return { type: req.type, error: 'Unauthorized' };
      }
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
      if (!hasRole(auth, ['admin', 'super-admin', 'teacher', 'jss_teacher', 'senior_teacher', 'staff'])) {
        return { type: req.type, error: 'Unauthorized' };
      }
      const { kvUpsertDuty } = await import('@/lib/db');
      await kvUpsertDuty(req.duty, tenantId);
      return { type: req.type, ok: true };
    }

    case 'deleteDuty': {
      if (!hasRole(auth, ['admin', 'super-admin'])) return { type: req.type, error: 'Unauthorized' };
      const { kvDeleteDuty } = await import('@/lib/db');
      await kvDeleteDuty(req.id, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getAll': {
      const keys = Array.isArray(req.keys) ? req.keys : [];
      const { kvGetManyWithMeta } = await import('@/lib/db');

      const rawResults = await kvGetManyWithMeta(keys, tenantId);

      const results = rawResults.map(r => {
        let value = r.value;
        const k = r.key;

        // Security: Only super-admin can read AT credentials
        if (k === 'paav_at_creds' && auth.role !== 'super-admin') {
          value = null;
        }

        if (k === 'paav_staff_reqs' && !['admin', 'super-admin'].includes(auth.role) && auth.id) {
          if (Array.isArray(value)) value = value.filter(row => row.userId === auth.id);
        }
        
        if (!['admin','parent','super-admin'].includes(auth.role)) {
          if (['paav6_feecfg', 'paav6_paylog'].includes(k)) value = k === 'paav6_paylog' ? [] : {};
          if (k === 'paav6_learners' && Array.isArray(value)) value = value.map(l => ({ ...l, t1: 0, t2: 0, t3: 0, arrears: 0 }));
        }
        
        return { key: k, value, updatedAt: r.updatedAt };
      });

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
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvRecordPayment } = await import('@/lib/db');
      await kvRecordPayment(req.payment, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getDatabaseDump': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { error: 'Unauthorized' };
      const { query } = await import('@/lib/db');
      const all = await query('SELECT key, value FROM kv WHERE tenant_id = ?', [tenantId]);
      const data = {};
      all.forEach(r => { try { data[r.key] = JSON.parse(r.value); } catch { data[r.key] = r.value; } });
      return { type: req.type, data };
    }

    case 'bulkAddLearners': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvBulkAddLearners } = await import('@/lib/db');
      try {
        await kvBulkAddLearners(req.learners, tenantId);
        return { type: req.type, ok: true };
      } catch (e) {
        return { type: req.type, ok: false, error: e.message };
      }
    }

    case 'bulkPromote': {
      // Efficient promote: only receives ADMs + target grade, no full learner payload
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      if (!Array.isArray(req.adms) || !req.toGrade) return { type: req.type, error: 'adms[] and toGrade are required' };
      try {
        const { batch, syncLearnerKV } = await import('@/lib/db');
        const stmts = req.adms.map(adm => ({
          sql: 'UPDATE learners SET grade = ?, t1 = 0, t2 = 0, t3 = 0 WHERE adm = ? AND tenant_id = ?',
          args: [req.toGrade, adm, tenantId]
        }));
        if (stmts.length > 0) await batch(stmts);
        await syncLearnerKV(tenantId);
        return { type: req.type, ok: true, promoted: req.adms.length };
      } catch (e) {
        return { type: req.type, ok: false, error: e.message };
      }
    }

    case 'storageUsage': {
      const { getStorageUsage } = await import('@/lib/db');
      const usage = await getStorageUsage();
      return { type: req.type, usage };
    }

    case 'getTerms': {
      const { kvGetTerms } = await import('@/lib/db');
      const value = await kvGetTerms(tenantId);
      return { type: req.type, ok: true, value };
    }

    case 'setTerms': {
      if (!['admin', 'super-admin'].includes(auth.role)) return { type: req.type, error: 'Unauthorized' };
      const { kvSetTerms } = await import('@/lib/db');
      await kvSetTerms(req.terms, tenantId);
      return { type: req.type, ok: true };
    }

    case 'getGlobalAudit': {
      if (auth.role !== 'super-admin') return { type: req.type, error: 'Unauthorized' };
      const { query: dbQuery } = await import('@/lib/db');
      const value = await dbQuery('SELECT * FROM global_audit ORDER BY timestamp DESC LIMIT 200');
      return { type: req.type, ok: true, value };
    }

    default:
      return { error: `Unknown request type: ${req.type}` };
  }
}
