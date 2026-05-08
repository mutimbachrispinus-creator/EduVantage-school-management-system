/**
 * lib/db.js — Turso (libSQL) connection
 *
 * Environment variables (set in Vercel dashboard, never in code):
 *   TURSO_URL    e.g. libsql://eduvantage-<tenant>.turso.io
 *   TURSO_TOKEN  your Turso auth token
 *
 * Usage:
 *   import { query, execute } from '@/lib/db'
 *   const rows = await query('SELECT value FROM kv WHERE key = ?', ['paav6_learners'])
 */

import { createClient } from '@libsql/client';
import { PAAV_KEYS } from './constants.js';

export function isFuzzyMatch(n1, n2) {
  const s1 = String(n1 || '').toUpperCase().trim().replace(/[^A-Z\s]/g, '');
  const s2 = String(n2 || '').toUpperCase().trim().replace(/[^A-Z\s]/g, '');
  if (s1 === s2) return true;
  
  const w1 = s1.split(/\s+/).filter(w => w.length > 0);
  const w2 = s2.split(/\s+/).filter(w => w.length > 0);
  
  if (w1.length === 0 || w2.length === 0) return false;

  const [shorter, longer] = w1.length <= w2.length ? [w1, w2] : [w2, w1];
  const longerSet = new Set(longer);
  const matches = shorter.filter(w => longerSet.has(w)).length;
  
  // Rule: If we only have 1 word, it must be an exact match
  if (shorter.length === 1) return matches === 1 && longer.length === 1;

  // Rule: All words of shorter match (e.g. "John Doe" matches "John Michael Doe")
  if (matches === shorter.length) return true;
  
  // Rule: At least 2 significant words match
  if (matches >= 2) return true;

  return false;
}

export async function kvUpdateStaffAvatar(id, avatar, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('UPDATE staff SET avatar = ? WHERE id = ? AND tenant_id = ?', [avatar, id, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
}

export async function kvUpdateStaffProfile(id, name, phone, avatar, password = null, tenantId = 'platform-master') {
  await ensureSchema();
  if (password) {
    await execute('UPDATE staff SET name = ?, phone = ?, avatar = ?, password = ? WHERE id = ? AND tenant_id = ?', [name, phone, avatar, password, id, tenantId]);
  } else {
    await execute('UPDATE staff SET name = ?, phone = ?, avatar = ? WHERE id = ? AND tenant_id = ?', [name, phone, avatar, id, tenantId]);
  }
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
}

export async function kvUpdateLearnerAvatar(adm, avatar, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('UPDATE learners SET avatar = ? WHERE adm = ? AND tenant_id = ?', [avatar, adm, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
}

let _client = null;
let _schemaPromise = null;

export function getClient() {
  if (_client) return _client;
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  const url = process.env.TURSO_URL || (isBuild ? 'file:local.db' : 'file:paav.db');
  const token = process.env.TURSO_TOKEN;

  if (!process.env.TURSO_URL && !isBuild) {
    console.warn('[DB] Missing TURSO_URL. Using local SQLite fallback.');
  }

  // Validate URL format roughly
  if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('file:')) {
    throw new Error(`Database configuration error: Invalid TURSO_URL format "${url}". Must start with libsql://, https://, or file:`);
  }

  if (!url.startsWith('file:') && !token) {
    console.error('[DB] Missing TURSO_TOKEN for remote DB');
    throw new Error('Database configuration error: TURSO_TOKEN is missing for remote connection.');
  }

  try {
    let normalizedUrl = url;
    if (normalizedUrl.startsWith('libsql://')) {
      normalizedUrl = normalizedUrl.replace('libsql://', 'https://');
    }
    _client = createClient({ url: normalizedUrl, authToken: token });
    return _client;
  } catch (e) {
    console.error('[DB] Failed to create client:', e);
    throw new Error('Failed to initialize database client: ' + e.message);
  }
}

/**
 * Auto-create the key-value table on first use.
 * The portal stores all data as JSON blobs keyed by a string.
 *
 * Schema:
 *   kv(key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER) */
let _schemaOk = false;

export async function ensureSchema() {
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (isBuildPhase && !process.env.TURSO_URL) {
    return; // Skip schema checks during static build if DB is not configured
  }
  if (_schemaOk) return;
  if (_schemaPromise) return _schemaPromise;

  _schemaPromise = (async () => {
    try {
      const db = getClient();
      console.log('[DB] Verifying schema...');

      // 1. Fast path: check for critical tables
      try {
        const coreTables = ['kv', 'staff', 'learners', 'paylog', 'marks', 'attendance', 'terms', 'global_audit'];
        const check = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${coreTables.map(t => `'${t}'`).join(',')})`);
        if (check.rows.length >= coreTables.length) {
          _schemaOk = true;
          return;
        }
        console.log(`[DB] Missing tables (found ${check.rows.length}/${coreTables.length}), initializing schema...`);
      } catch (e) {
        console.log('[DB] sqlite_master check failed, proceeding to full initialization...');
      }
      
      const stmts = [
        `CREATE TABLE IF NOT EXISTS kv (
          key        TEXT,
          tenant_id  TEXT NOT NULL DEFAULT 'platform-master',
          value      TEXT NOT NULL DEFAULT '""',
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          PRIMARY KEY(key, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS learners (
          adm TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          name TEXT NOT NULL,
          grade TEXT,
          sex TEXT,
          age INTEGER,
          dob TEXT,
          stream TEXT,
          teacher TEXT,
          parent TEXT,
          phone TEXT,
          parentEmail TEXT,
          addr TEXT,
          t1 REAL DEFAULT 0,
          t2 REAL DEFAULT 0,
          t3 REAL DEFAULT 0,
          arrears REAL DEFAULT 0,
          avatar TEXT,
          bloodGroup TEXT,
          allergies TEXT,
          medicalCondition TEXT,
          emergencyContact TEXT,
          PRIMARY KEY(adm, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS staff (
          id TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          name TEXT NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL,
          phone TEXT,
          password TEXT,
          status TEXT,
          childAdm TEXT,
          grade TEXT,
          teachingAreas TEXT,
          secQ TEXT,
          secA TEXT,
          email TEXT,
          createdAt TEXT,
          avatar TEXT,
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS paylog (
          id TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          date TEXT,
          adm TEXT,
          name TEXT,
          grade TEXT,
          term TEXT,
          amount REAL,
          method TEXT,
          ref TEXT,
          by TEXT,
          status TEXT DEFAULT 'approved',
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS marks (
          grade_subj_assess TEXT,
          adm TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          score REAL,
          PRIMARY KEY(grade_subj_assess, adm, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
          grade_date_adm TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          status TEXT NOT NULL,
          PRIMARY KEY(grade_date_adm, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          msg_json TEXT NOT NULL,
          updated_at INTEGER DEFAULT (strftime('%s','now')),
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS staff_requests (
          id INTEGER,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          userId TEXT NOT NULL,
          req_json TEXT NOT NULL,
          updated_at INTEGER DEFAULT (strftime('%s','now')),
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS presence (
          id_date TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          userId TEXT NOT NULL,
          prec_json TEXT NOT NULL,
          updated_at INTEGER DEFAULT (strftime('%s','now')),
          PRIMARY KEY(id_date, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS duties (
          id TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          duty_json TEXT NOT NULL,
          updated_at INTEGER DEFAULT (strftime('%s','now')),
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS files (
          id TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          createdAt TEXT,
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS subscriptions (
          tenant_id TEXT PRIMARY KEY,
          plan TEXT DEFAULT 'basic',
          status TEXT DEFAULT 'active',
          amount REAL DEFAULT 0,
          cycle TEXT DEFAULT 'annual',
          expires_at TEXT,
          learner_limit INTEGER,
          registered_learners INTEGER DEFAULT 0,
          updated_at INTEGER DEFAULT (strftime('%s','now'))
        )`,
        `CREATE TABLE IF NOT EXISTS deleted_learners (
          adm TEXT,
          tenant_id TEXT NOT NULL DEFAULT 'platform-master',
          name TEXT NOT NULL,
          grade TEXT,
          sex TEXT,
          age INTEGER,
          dob TEXT,
          stream TEXT,
          teacher TEXT,
          parent TEXT,
          phone TEXT,
          parentEmail TEXT,
          addr TEXT,
          t1 REAL DEFAULT 0,
          t2 REAL DEFAULT 0,
          t3 REAL DEFAULT 0,
          arrears REAL DEFAULT 0,
          avatar TEXT,
          bloodGroup TEXT,
          allergies TEXT,
          medicalCondition TEXT,
          emergencyContact TEXT,
          deleted_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          PRIMARY KEY(adm, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS terms (
          id         TEXT,
          tenant_id  TEXT NOT NULL DEFAULT 'platform-master',
          name       TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date   TEXT NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          PRIMARY KEY(id, tenant_id)
        )`,
        `CREATE TABLE IF NOT EXISTS global_audit (
          id        TEXT PRIMARY KEY,
          user_id   TEXT,
          user_name TEXT,
          tenant_id TEXT,
          action    TEXT NOT NULL,
          details   TEXT,
          timestamp TEXT DEFAULT (datetime('now'))
        )`
      ];

      // Execute all creations one by one to ensure failure of one doesn't stop others
      for (const sql of stmts) {
        try {
          await db.execute({ sql, args: [] });
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('[DB] Table creation error:', err.message, '| SQL:', sql);
          }
        }
      }

      // Selective Alterations / Migrations
      const migrations = [
        "ALTER TABLE learners ADD COLUMN arrears REAL DEFAULT 0",
        "ALTER TABLE learners ADD COLUMN parentEmail TEXT",
        "ALTER TABLE learners ADD COLUMN avatar TEXT",
        "ALTER TABLE learners ADD COLUMN bloodGroup TEXT",
        "ALTER TABLE learners ADD COLUMN allergies TEXT",
        "ALTER TABLE learners ADD COLUMN medicalCondition TEXT",
        "ALTER TABLE learners ADD COLUMN emergencyContact TEXT",
        "ALTER TABLE staff ADD COLUMN avatar TEXT",
        "ALTER TABLE paylog ADD COLUMN status TEXT DEFAULT 'approved'",
        "ALTER TABLE subscriptions ADD COLUMN amount REAL DEFAULT 0",
        "ALTER TABLE subscriptions ADD COLUMN cycle TEXT DEFAULT 'annual'",
        "ALTER TABLE subscriptions ADD COLUMN learner_limit INTEGER",
        "ALTER TABLE subscriptions ADD COLUMN registered_learners INTEGER DEFAULT 0"
      ];

      for (const m of migrations) {
        try { await db.execute({ sql: m, args: [] }); } catch (e) { /* ignore duplicate column */ }
      }

      // Indices
      const indices = [
        "CREATE INDEX IF NOT EXISTS idx_kv_tenant ON kv(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_learners_tenant ON learners(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_paylog_tenant ON paylog(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_marks_tenant ON marks(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_terms_tenant ON terms(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_global_audit_tenant ON global_audit(tenant_id)"
      ];
      for (const idx of indices) {
        try { await db.execute({ sql: idx, args: [] }); } catch (e) { /* ignore */ }
      }

      _schemaOk = true;
      console.log('[DB] Schema verified and updated');
    } catch (e) {
      console.error('[DB] Schema initialization critical failure:', e);
      _schemaPromise = null; // Allow retry on next call
      throw e; 
    } finally {
      _schemaPromise = null;
    }
  })();

  return _schemaPromise;
}



/**
 * Run a SELECT and return all rows as plain objects.
 * @param {string} sql
 * @param {any[]}  args
 */
export async function query(sql, args = []) {
  try {
    await ensureSchema();
    const db = getClient();
    const cleanArgs = args.map(a => a === undefined ? null : a);
    const result = await db.execute({ sql, args: cleanArgs });
    return result.rows || [];
  } catch (e) {
    console.error(`[DB] Query Error: ${sql}`, e);
    // Return empty array on failure if it's a SELECT to avoid downstream crashes
    if (sql.trim().toUpperCase().startsWith('SELECT')) return [];
    throw e;
  }
}

/**
 * Run an INSERT / UPDATE / DELETE.
 * @param {string} sql
 * @param {any[]}  args
 */
export async function execute(sql, args = []) {
  await ensureSchema();
  const db = getClient();
  const cleanArgs = args.map(a => a === undefined ? null : a);
  try {
    return await db.execute({ sql, args: cleanArgs });
  } catch (e) {
    console.error(`[DB] Execute Error: ${sql}`, e);
    throw e;
  }
}

/**
 * Run a batch of statements atomically (used by /api/db for pipeline).
 * @param {{ sql: string, args: any[] }[]} statements
 */
export async function batch(statements) {
  await ensureSchema();
  const db = getClient();
  const cleanStmts = statements.map(s => ({
    sql: s.sql,
    args: s.args ? s.args.map(a => a === undefined ? null : a) : []
  }));
  try {
    return await db.batch(cleanStmts, 'write');
  } catch (e) {
    console.error(`[DB] Batch Error`, e);
    throw e;
  }
}

/* ─── Convenience wrappers (matching the original _cloudSv / _cloudLd API) ─── */

/**
 * Load a JSON value by key.  Returns parsed value or defaultValue.
 */
export async function kvGet(key, defaultValue = null, tenantId = 'platform-master') {
  await ensureSchema();

  if (key === 'paav6_learners') {
    const relational = await query('SELECT * FROM learners WHERE tenant_id = ?', [tenantId]);
    const kvRows = await query('SELECT value FROM kv WHERE key = ? AND tenant_id = ?', ['paav6_learners', tenantId]);
    let kvData = [];
    if (kvRows.length > 0) {
      try { kvData = JSON.parse(kvRows[0].value); } catch { kvData = []; }
    }
    if (kvData.length === 0) return relational;
    const merged = [...relational];
    const adms = new Set(relational.map(l => l.adm));
    for (const l of kvData) {
      if (!adms.has(l.adm)) {
        merged.push(l);
        adms.add(l.adm);
      }
    }
    return merged;
  }

  if (key === 'paav6_staff') {
    const rows = await query('SELECT * FROM staff WHERE tenant_id = ?', [tenantId]);
    if (!rows.length) return defaultValue || [];
    return rows.map(r => ({
      ...r,
      teachingAreas: r.teachingAreas ? JSON.parse(r.teachingAreas) : []
    }));
  }

  if (key === 'paav6_paylog') {
    const rows = await query('SELECT * FROM paylog WHERE tenant_id = ?', [tenantId]);
    if (!rows.length) return defaultValue || [];
    return rows;
  }

  if (key === 'paav6_marks') {
    const rows = await query('SELECT * FROM marks WHERE tenant_id = ?', [tenantId]);
    const result = {};
    for (const r of rows) {
      if (!result[r.grade_subj_assess]) result[r.grade_subj_assess] = {};
      result[r.grade_subj_assess][r.adm] = r.score;
    }
    return result;
  }

  if (key === 'paav_student_attendance') {
    const rows = await query('SELECT * FROM attendance WHERE tenant_id = ?', [tenantId]);
    const result = {};
    rows.forEach(r => { result[r.grade_date_adm] = r.status; });
    return result;
  }

  if (key === 'paav6_msgs') {
    const rows = await query('SELECT msg_json FROM messages WHERE tenant_id = ? ORDER BY updated_at DESC', [tenantId]);
    return rows.map(r => JSON.parse(r.msg_json));
  }

  if (key === 'paav_staff_reqs') {
    const rows = await query('SELECT req_json FROM staff_requests WHERE tenant_id = ? ORDER BY updated_at DESC', [tenantId]);
    return rows.map(r => JSON.parse(r.req_json));
  }

  if (key === 'paav_presence') {
    const rows = await query('SELECT prec_json FROM presence WHERE tenant_id = ? ORDER BY updated_at DESC', [tenantId]);
    return rows.map(r => JSON.parse(r.prec_json));
  }

  if (key === 'paav_duties') {
    const rows = await query('SELECT duty_json FROM duties WHERE tenant_id = ? ORDER BY updated_at DESC', [tenantId]);
    return rows.map(r => JSON.parse(r.duty_json));
  }

  const rows = await query('SELECT value FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId]);
  if (!rows.length) return defaultValue;
  try { return JSON.parse(rows[0].value); } catch { return defaultValue; }
}

/**
 * Internal helper to get value AND updatedAt
 */
export async function kvGetWithMeta(key, tenantId = 'platform-master') {
  const [value, rows] = await Promise.all([
    kvGet(key, null, tenantId),
    query('SELECT updated_at FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId])
  ]);
  const updatedAt = rows.length ? rows[0].updated_at : 0;
  return { value, updatedAt };
}

/**
 * Update a learner's details, with cascading updates if the admission number changes.
 */
export async function kvUpdateLearner(oldAdm, details, tenantId = 'platform-master') {
  await ensureSchema();
  const newAdm = details.adm;
  const stmts = [];
  const lName = details.name.toUpperCase();
  stmts.push({
    sql: `UPDATE learners SET 
            adm = ?, name = ?, grade = ?, sex = ?, age = ?, dob = ?, 
            stream = ?, teacher = ?, parent = ?, phone = ?, 
            parentEmail = ?, addr = ?, avatar = ?,
            bloodGroup = ?, allergies = ?, medicalCondition = ?, emergencyContact = ?
          WHERE adm = ? AND tenant_id = ?`,
    args: [
      newAdm, lName, details.grade, details.sex, details.age, details.dob,
      details.stream, details.teacher, details.parent, details.phone,
      details.parentEmail, details.addr, details.avatar || null,
      details.bloodGroup || null, details.allergies || null, details.medicalCondition || null, details.emergencyContact || null,
      oldAdm, tenantId
    ]
  });
  if (oldAdm !== newAdm) {
    stmts.push({ sql: 'UPDATE marks SET adm = ? WHERE adm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });
    stmts.push({ sql: 'UPDATE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });
    stmts.push({ sql: 'UPDATE staff SET childAdm = ? WHERE childAdm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });
    const attRows = await query('SELECT grade_date_adm, status FROM attendance WHERE grade_date_adm LIKE ? AND tenant_id = ?', [`%|${oldAdm}`, tenantId]);
    for (const row of attRows) {
      const parts = row.grade_date_adm.split('|');
      if (parts[parts.length - 1] === oldAdm) {
        parts[parts.length - 1] = newAdm;
        const newGda = parts.join('|');
        stmts.push({ sql: 'DELETE FROM attendance WHERE grade_date_adm = ? AND tenant_id = ?', args: [row.grade_date_adm, tenantId] });
        stmts.push({ sql: 'INSERT INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)', args: [newGda, tenantId, row.status] });
      }
    }
  }
  await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
}

/**
 * Move a learner to the recycle bin and remove from active list.
 */
export async function kvDeleteLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT * FROM learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  if (rows.length > 0) {
    const l = rows[0];
    await execute(`
      INSERT INTO deleted_learners (
        adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies, medicalCondition, emergencyContact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(adm, tenant_id) DO UPDATE SET deleted_at = strftime('%s','now')
    `, [
      l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar, l.bloodGroup, l.allergies, l.medicalCondition, l.emergencyContact
    ]);
  }
  await execute('DELETE FROM learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  const { value: learners } = await kvGetWithMeta('paav6_learners', tenantId);
  if (Array.isArray(learners)) {
    const updated = learners.filter(l => l.adm !== adm);
    await kvSet('paav6_learners', updated, tenantId);
  }
}

/**
 * Completely remove a staff member from the relational table and invalidate KV cache.
 */
export async function kvDeleteStaff(id, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM staff WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
}

/**
 * Save a JSON-serialisable value by key.
 */
export async function kvSet(key, value, tenantId = 'platform-master') {
  await ensureSchema();

  if (key === 'paav6_learners') {
    const stmts = [];
    for (const l of value) {
      stmts.push({
        sql: `INSERT INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(adm, tenant_id) DO UPDATE SET 
                name=excluded.name, grade=excluded.grade, sex=excluded.sex, age=excluded.age, dob=excluded.dob,
                stream=excluded.stream, teacher=excluded.teacher, parent=excluded.parent, phone=excluded.phone,
                parentEmail=excluded.parentEmail, addr=excluded.addr, t1=excluded.t1, t2=excluded.t2, t3=excluded.t3,
                arrears=excluded.arrears, avatar=excluded.avatar`,
        args: [l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail || null, l.addr, l.t1, l.t2, l.t3, l.arrears || 0, l.avatar || null]
      });
    }
    if (stmts.length) await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav6_staff') {
    const stmts = [];
    for (const s of value) {
      stmts.push({
        sql: `INSERT INTO staff (id, tenant_id, name, username, role, phone, password, status, childAdm, grade, teachingAreas, secQ, secA, email, createdAt, avatar)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id, tenant_id) DO UPDATE SET
                name=excluded.name, username=excluded.username, role=excluded.role, phone=excluded.phone,
                password=excluded.password, status=excluded.status, childAdm=excluded.childAdm, grade=excluded.grade,
                teachingAreas=excluded.teachingAreas, secQ=excluded.secQ, secA=excluded.secA, email=excluded.email,
                avatar=excluded.avatar`,
        args: [s.id, tenantId, s.name, s.username, s.role, s.phone, s.password, s.status, s.childAdm, s.grade, JSON.stringify(s.teachingAreas || []), s.secQ, s.secA, s.email, s.createdAt, s.avatar || null]
      });
    }
    if (stmts.length) await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav6_paylog') {
    const stmts = [ { sql: 'DELETE FROM paylog WHERE tenant_id = ?', args: [tenantId] } ];
    for (const p of value) {
      stmts.push({
        sql: `INSERT INTO paylog (id, tenant_id, date, adm, name, grade, term, amount, method, ref, by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, tenantId, p.date, p.adm, p.name, p.grade, p.term, p.amount, p.method, p.ref, p.by]
      });
    }
    await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav6_marks') {
    const stmts = [];
    for (const [gsa, admObj] of Object.entries(value)) {
      for (const [adm, score] of Object.entries(admObj)) {
        if (score !== null && score !== undefined && score !== '') {
          stmts.push({
            sql: `INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
                  ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`,
            args: [gsa, adm, tenantId, Number(score)]
          });
        }
      }
    }
    if (stmts.length) await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav_student_attendance') {
    const stmts = [];
    for (const [gda, status] of Object.entries(value)) {
      stmts.push({
        sql: `INSERT INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)
              ON CONFLICT(grade_date_adm, tenant_id) DO UPDATE SET status = excluded.status`,
        args: [gda, tenantId, status]
      });
    }
    if (stmts.length) await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav6_msgs') {
    const stmts = [ { sql: 'DELETE FROM messages WHERE tenant_id = ?', args: [tenantId] } ];
    for (const m of value) {
      stmts.push({
        sql: 'INSERT INTO messages (id, tenant_id, msg_json) VALUES (?, ?, ?)',
        args: [m.id, tenantId, JSON.stringify(m)]
      });
    }
    await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav_staff_reqs') {
    const stmts = [ { sql: 'DELETE FROM staff_requests WHERE tenant_id = ?', args: [tenantId] } ];
    for (const r of value) {
      stmts.push({
        sql: 'INSERT INTO staff_requests (id, tenant_id, userId, req_json) VALUES (?, ?, ?, ?)',
        args: [r.id, tenantId, r.userId, JSON.stringify(r)]
      });
    }
    await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav_presence') {
    const stmts = [ { sql: 'DELETE FROM presence WHERE tenant_id = ?', args: [tenantId] } ];
    for (const p of value) {
      stmts.push({
        sql: 'INSERT INTO presence (id_date, tenant_id, userId, prec_json) VALUES (?, ?, ?, ?)',
        args: [`${p.id}|${p.date}`, tenantId, p.id, JSON.stringify(p)]
      });
    }
    await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav_duties') {
    const stmts = [ { sql: 'DELETE FROM duties WHERE tenant_id = ?', args: [tenantId] } ];
    for (const d of value) {
      stmts.push({
        sql: 'INSERT INTO duties (id, tenant_id, duty_json) VALUES (?, ?, ?)',
        args: [d.id, tenantId, JSON.stringify(d)]
      });
    }
    await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  const json = JSON.stringify(value);
  await execute(
    `INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
     ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, tenantId, json]
  );
}

/**
 * Get academic terms for a tenant.
 */
export async function kvGetTerms(tenantId = 'platform-master') {
  await ensureSchema();
  return await query('SELECT * FROM terms WHERE tenant_id = ? ORDER BY start_date ASC', [tenantId]);
}

/**
 * Save academic terms for a tenant.
 */
export async function kvSetTerms(terms, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [ { sql: 'DELETE FROM terms WHERE tenant_id = ?', args: [tenantId] } ];
  for (const t of terms) {
    stmts.push({
      sql: 'INSERT INTO terms (id, tenant_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      args: [t.id || ('term_' + Date.now()), tenantId, t.name, t.start_date, t.end_date]
    });
  }
  await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_terms', tenantId]);
}

/**
 * Log a security or administrative action to the global audit trail.
 */
export async function logAction(user, action, details) {
  await ensureSchema();
  const id = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  const uName = user.name || user.username || 'unknown';
  const tenant = user.tenantId || 'platform-master';
  await execute(
    'INSERT INTO global_audit (id, user_id, user_name, tenant_id, action, details) VALUES (?, ?, ?, ?, ?, ?)',
    [id, user.id, uName, tenant, action, details]
  );
}

/**
 * Get storage usage metrics.
 */
export async function getStorageUsage() {
  const rows = await query("SELECT SUM(LENGTH(value)) as total_kv FROM kv");
  const files = await query("SELECT SUM(LENGTH(data)) as total_files FROM files");
  return {
    kv: Number(rows[0]?.total_kv || 0),
    files: Number(files[0]?.total_files || 0)
  };
}

export async function kvUpdateMark(gsa, adm, score, tenantId = 'platform-master') {
  await ensureSchema();
  await execute(`INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
                 ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`, [gsa, adm, tenantId, score]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
}

export async function kvUpdateMarksBulk(marks, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [];
  for (const m of marks) {
    stmts.push({
      sql: `INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
            ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`,
      args: [m.gsa, m.adm, tenantId, m.score]
    });
  }
  if (stmts.length) await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
}

export async function kvUpdateAttendanceBulk(attMap, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [];
  for (const [gda, status] of Object.entries(attMap)) {
    stmts.push({
      sql: `INSERT INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)
            ON CONFLICT(grade_date_adm, tenant_id) DO UPDATE SET status = excluded.status`,
      args: [gda, tenantId, status]
    });
  }
  if (stmts.length) await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_student_attendance', tenantId]);
}

export async function kvUpsertMessage(msg, tenantId = 'platform-master') {
  await ensureSchema();
  await execute(`INSERT INTO messages (id, tenant_id, msg_json) VALUES (?, ?, ?)
                 ON CONFLICT(id, tenant_id) DO UPDATE SET msg_json = excluded.msg_json`, [msg.id, tenantId, JSON.stringify(msg)]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_msgs', tenantId]);
}

export async function kvLogPresence(userId, date, record, tenantId = 'platform-master') {
  await ensureSchema();
  await execute(`INSERT INTO presence (id_date, tenant_id, userId, prec_json) VALUES (?, ?, ?, ?)
                 ON CONFLICT(id_date, tenant_id) DO UPDATE SET prec_json = excluded.prec_json`, [`${userId}|${date}`, tenantId, userId, JSON.stringify(record)]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_presence', tenantId]);
}

export async function kvUpsertDuty(duty, tenantId = 'platform-master') {
  await ensureSchema();
  await execute(`INSERT INTO duties (id, tenant_id, duty_json) VALUES (?, ?, ?)
                 ON CONFLICT(id, tenant_id) DO UPDATE SET duty_json = excluded.duty_json`, [duty.id, tenantId, JSON.stringify(duty)]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_duties', tenantId]);
}

export async function kvDeleteDuty(id, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM duties WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_duties', tenantId]);
}

export async function kvRecordPayment(p, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('INSERT INTO paylog (id, tenant_id, date, adm, name, grade, term, amount, method, ref, by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [p.id, tenantId, p.date, p.adm, p.name, p.grade, p.term, p.amount, p.method, p.ref, p.by]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
}
export async function kvDelete(key, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId]);
}

export async function kvTimestamps(keys, tenantId = 'platform-master') {
  await ensureSchema();
  if (!keys.length) return [];
  const placeholders = keys.map(() => '?').join(',');
  return await query(`SELECT key, updated_at FROM kv WHERE key IN (${placeholders}) AND tenant_id = ?`, [...keys, tenantId]);
}

export async function kvBulkAddLearners(learners, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [];
  for (const l of learners) {
    stmts.push({
      sql: `INSERT INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(adm, tenant_id) DO UPDATE SET 
              name=excluded.name, grade=excluded.grade, sex=excluded.sex, age=excluded.age, dob=excluded.dob,
              stream=excluded.stream, teacher=excluded.teacher, parent=excluded.parent, phone=excluded.phone,
              parentEmail=excluded.parentEmail, addr=excluded.addr, t1=excluded.t1, t2=excluded.t2, t3=excluded.t3,
              arrears=excluded.arrears, avatar=excluded.avatar`,
      args: [l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail || null, l.addr, l.t1, l.t2, l.t3, l.arrears || 0, l.avatar || null]
    });
  }
  if (stmts.length) await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
}

export async function getSubscriptionStatus(tenantId) {
  await ensureSchema();
  const rows = await query('SELECT * FROM subscriptions WHERE tenant_id = ?', [tenantId]);
  if (!rows.length) return { tenant_id: tenantId, plan: 'basic', status: 'active', expires_at: null };
  return rows[0];
}

export async function getDeletedLearners(tenantId = 'platform-master') {
  await ensureSchema();
  return await query('SELECT * FROM deleted_learners WHERE tenant_id = ? ORDER BY deleted_at DESC', [tenantId]);
}

export async function restoreLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT * FROM deleted_learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  if (!rows.length) throw new Error('Learner not found in recycle bin');
  const l = rows[0];
  await execute(`
    INSERT INTO learners (
      adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies, medicalCondition, emergencyContact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(adm, tenant_id) DO UPDATE SET 
      name=excluded.name, grade=excluded.grade, sex=excluded.sex, age=excluded.age, dob=excluded.dob,
      stream=excluded.stream, teacher=excluded.teacher, parent=excluded.parent, phone=excluded.phone,
      parentEmail=excluded.parentEmail, addr=excluded.addr, t1=excluded.t1, t2=excluded.t2, t3=excluded.t3,
      arrears=excluded.arrears, avatar=excluded.avatar
  `, [
    l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar, l.bloodGroup, l.allergies, l.medicalCondition, l.emergencyContact
  ]);
  await execute('DELETE FROM deleted_learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
}

export async function hardDeleteLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM deleted_learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
}

export async function kvSubmitStaffRequest(req, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('INSERT INTO staff_requests (id, tenant_id, userId, req_json) VALUES (?, ?, ?, ?)',
                [req.id, tenantId, req.userId, JSON.stringify(req)]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_staff_reqs', tenantId]);
}

export async function kvUpdateStaffRequestStatus(id, status, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT req_json FROM staff_requests WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (rows.length > 0) {
    const req = JSON.parse(rows[0].req_json);
    req.status = status;
    await execute('UPDATE staff_requests SET req_json = ? WHERE id = ? AND tenant_id = ?', [JSON.stringify(req), id, tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_staff_reqs', tenantId]);
  }
}

export async function getStudentUsage(tenantId) {
  await ensureSchema();
  const [countRes, limitRes] = await Promise.all([
    query('SELECT COUNT(*) as count FROM learners WHERE tenant_id = ?', [tenantId]),
    query('SELECT learner_limit FROM subscriptions WHERE tenant_id = ?', [tenantId])
  ]);
  return {
    count: Number(countRes[0]?.count || 0),
    limit: Number(limitRes[0]?.learner_limit || 50)
  };
}
