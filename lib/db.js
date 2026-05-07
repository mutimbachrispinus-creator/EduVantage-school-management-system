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

import { createClient } from '@libsql/client/web';
import { PAAV_KEYS } from './constants.js';

export function isFuzzyMatch(n1, n2) {
  const s1 = String(n1 || '').toUpperCase().trim();
  const s2 = String(n2 || '').toUpperCase().trim();
  if (s1 === s2) return true;
  const w1 = s1.split(/\s+/).filter(Boolean).sort();
  const w2 = s2.split(/\s+/).filter(Boolean).sort();
  // If they share at least 2 words (regardless of order), they match
  let matches = 0;
  for (const w of w1) {
    if (w2.includes(w)) matches++;
  }
  return matches >= 2;
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
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;

  if (!url) {
    console.error('[DB] Missing TURSO_URL. Ensure it is set in .env.local or production environment.');
    throw new Error('Database configuration error: TURSO_URL is missing.');
  }

  // Validate URL format roughly
  if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('file:')) {
    throw new Error(`Database configuration error: Invalid TURSO_URL format "${url}". Must start with libsql://, https://, or file:`);
  }

  // Local file doesn't strictly need a token in the latest libsql, but we check for it if it's a remote URL
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
  if (_schemaOk) return;
  if (_schemaPromise) return _schemaPromise;

  _schemaPromise = (async () => {
    try {
      const db = getClient();
      console.log('[DB] Checking schema...');

      // 1. Fast path: check if core tables exist
      try {
        const check = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('kv', 'staff', 'learners')");
        if (check.rows.length >= 3) {
          _schemaOk = true;
          return;
        }
        console.log('[DB] Some core tables missing, initializing schema...');
      } catch (e) {
        // Table doesn't exist, proceed to create
        console.log('[DB] sqlite_master check failed, initializing schema...');
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
          updated_at INTEGER DEFAULT (strftime('%s','now'))
        )`
      ];

      // 2. Batch create tables
      console.log('[DB] Executing schema creation batch...');
      try {
        await db.batch(stmts.map(sql => ({ sql, args: [] })), 'write');
        console.log('[DB] Table creation successful');
      } catch (batchErr) {
        console.error('[DB] Batch creation failed. Falling back to individual execution...', batchErr.message);
        for (const sql of stmts) {
          try {
             await db.execute({ sql, args: [] });
          } catch (e) {
             if (!e.message.includes('already exists')) {
               console.error(`[DB] Failed statement: ${sql}`);
               throw e;
             }
          }
        }
      }

      // 3. Selective Alterations
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
        "ALTER TABLE subscriptions ADD COLUMN cycle TEXT DEFAULT 'annual'"
      ];

      for (const m of migrations) {
        try { await db.execute({ sql: m, args: [] }); } catch (e) { /* ignore duplicate column */ }
      }

      // 4. Indices
      const indices = [
        "CREATE INDEX IF NOT EXISTS idx_kv_tenant ON kv(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_learners_tenant ON learners(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_paylog_tenant ON paylog(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_marks_tenant ON marks(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id)"
      ];
      for (const idx of indices) {
        try { await db.execute({ sql: idx, args: [] }); } catch (e) { /* ignore */ }
      }

      _schemaOk = true;
      console.log('[DB] Schema verified');
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
    
    // Merge relational data with any legacy KV data to ensure no learners are missing during migration

    const kvRows = await query('SELECT value FROM kv WHERE key = ? AND tenant_id = ?', ['paav6_learners', tenantId]);
    let kvData = [];
    if (kvRows.length > 0) {
      try { kvData = JSON.parse(kvRows[0].value); } catch { kvData = []; }
    }
    
    if (kvData.length === 0) return relational;

    // Merge and deduplicate by adm
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
  // Use Promise.all to fetch both the value and the timestamp in parallel
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

  // 1. Update learners table
  stmts.push({
    sql: `UPDATE learners SET 
            adm = ?, name = ?, grade = ?, sex = ?, age = ?, dob = ?, 
            stream = ?, teacher = ?, parent = ?, phone = ?, 
            parentEmail = ?, addr = ?, avatar = ?,
            bloodGroup = ?, allergies = ?, medicalCondition = ?, emergencyContact = ?
          WHERE adm = ? AND tenant_id = ?`,
    args: [
      newAdm, details.name, details.grade, details.sex, details.age, details.dob,
      details.stream, details.teacher, details.parent, details.phone,
      details.parentEmail, details.addr, details.avatar || null,
      details.bloodGroup || null, details.allergies || null, details.medicalCondition || null, details.emergencyContact || null,
      oldAdm, tenantId
    ]
  });

  // 2. Cascade Admission Number change if necessary
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
  if (oldAdm !== newAdm) {
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_student_attendance', tenantId]);
  }
}

/**
 * Completely remove a learner and all associated data.
 */
export async function kvDeleteLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [
    { sql: 'DELETE FROM learners WHERE adm = ? AND tenant_id = ?', args: [adm, tenantId] },
    { sql: 'DELETE FROM marks WHERE adm = ? AND tenant_id = ?', args: [adm, tenantId] },
    { sql: 'DELETE FROM paylog WHERE adm = ? AND tenant_id = ?', args: [adm, tenantId] },
    { sql: 'DELETE FROM attendance WHERE grade_date_adm LIKE ? AND tenant_id = ?', args: [`%|${adm}`, tenantId] }
  ];
  await batch(stmts);

  // Update KV for paav6_learners (fallback/sync list)
  const { value: learners } = await kvGetWithMeta('paav6_learners', tenantId);
  if (Array.isArray(learners)) {
    const updated = learners.filter(l => l.adm !== adm);
    await kvSet('paav6_learners', updated, tenantId);
  }

  // Update KV for paav_profiles (extended data)
  const { value: profiles } = await kvGetWithMeta('paav_profiles', tenantId);
  if (profiles && typeof profiles === 'object' && profiles[adm]) {
    const newProfiles = { ...profiles };
    delete newProfiles[adm];
    await kvSet('paav_profiles', newProfiles, tenantId);
  }

  // Update timestamps for others to trigger sync
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_student_attendance', tenantId]);
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
 * Surgically update a single mark entry.
 */
export async function kvUpdateMark(grade_subj_assess, adm, score, tenantId = 'platform-master') {
  if (score === null || score === undefined || score === '') {
    await execute('DELETE FROM marks WHERE grade_subj_assess = ? AND adm = ? AND tenant_id = ?', [grade_subj_assess, adm, tenantId]);
  } else {
    await execute(
      `INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
       ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`,
      [grade_subj_assess, adm, tenantId, Number(score)]
    );
  }
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
}

/**
 * Update multiple marks atomically without wiping the entire table.
 */
export async function kvUpdateMarksBulk(marksList, tenantId = 'platform-master') {
  if (!marksList || !marksList.length) return;
  await ensureSchema();
  
  const stmts = [];
  for (const m of marksList) {
    if (m.score === null || m.score === undefined || m.score === '') {
      stmts.push({
        sql: 'DELETE FROM marks WHERE grade_subj_assess = ? AND adm = ? AND tenant_id = ?',
        args: [m.gsa, m.adm, tenantId]
      });
    } else {
      stmts.push({
        sql: `INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
              ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`,
        args: [m.gsa, m.adm, tenantId, Number(m.score)]
      });
    }
  }
  
  await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
}

/**
 * Update multiple attendance entries atomically.
 */
export async function kvUpdateAttendanceBulk(attMap, tenantId = 'platform-master') {
  if (!attMap || !Object.keys(attMap).length) return;
  await ensureSchema();
  const stmts = Object.entries(attMap).map(([gda, status]) => ({
    sql: `INSERT INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)
          ON CONFLICT(grade_date_adm, tenant_id) DO UPDATE SET status = excluded.status`,
    args: [gda, tenantId, status]
  }));
  await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_student_attendance', tenantId]);
}

/**
 * Add or update a message atomically.
 */
export async function kvUpsertMessage(msg, tenantId = 'platform-master') {
  if (!msg || !msg.id) return;
  await ensureSchema();
  await execute(
    `INSERT INTO messages (id, tenant_id, msg_json, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
     ON CONFLICT(id, tenant_id) DO UPDATE SET msg_json = excluded.msg_json, updated_at = excluded.updated_at`,
    [msg.id, tenantId, JSON.stringify(msg)]
  );
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_msgs', tenantId]);
}

/**
 * Add a new staff request atomically.
 */
export async function kvSubmitStaffRequest(req, tenantId = 'platform-master') {
  if (!req || !req.id) return;
  await ensureSchema();
  await execute(
    `INSERT INTO staff_requests (id, tenant_id, userId, req_json, updated_at) VALUES (?, ?, ?, ?, strftime('%s','now'))`,
    [req.id, tenantId, req.userId, JSON.stringify(req)]
  );
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_staff_reqs', tenantId]);
}

/**
 * Log staff presence (login/logout) atomically.
 */
export async function kvLogPresence(userId, date, record, tenantId = 'platform-master') {
  await ensureSchema();
  await execute(
    `INSERT INTO presence (id_date, tenant_id, userId, prec_json, updated_at) VALUES (?, ?, ?, ?, strftime('%s','now'))
     ON CONFLICT(id_date, tenant_id) DO UPDATE SET prec_json = excluded.prec_json, updated_at = excluded.updated_at`,
    [`${userId}|${date}`, tenantId, userId, JSON.stringify(record)]
  );
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_presence', tenantId]);
}

/**
 * Add or update a duty assignment atomically.
 */
export async function kvUpsertDuty(duty, tenantId = 'platform-master') {
  if (!duty || !duty.id) return;
  await ensureSchema();
  await execute(
    `INSERT INTO duties (id, tenant_id, duty_json, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
     ON CONFLICT(id, tenant_id) DO UPDATE SET duty_json = excluded.duty_json, updated_at = excluded.updated_at`,
    [duty.id, tenantId, JSON.stringify(duty)]
  );
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_duties', tenantId]);
}

/**
 * Delete a duty assignment atomically.
 */
export async function kvDeleteDuty(id, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM duties WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_duties', tenantId]);
}

/**
 * Update staff request status atomically.
 */
export async function kvUpdateStaffRequestStatus(id, status, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT req_json FROM staff_requests WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (!rows.length) return;
  const req = JSON.parse(rows[0].req_json);
  req.status = status;
  await execute(
    `UPDATE staff_requests SET req_json = ?, updated_at = strftime('%s','now') WHERE id = ? AND tenant_id = ?`,
    [JSON.stringify(req), id, tenantId]
  );
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav_staff_reqs', tenantId]);
}

/**
 * Record a payment for a learner and update their balance.
 */
export async function kvRecordPayment({ adm, term, amount, method, ref, by, status = 'approved' }, tenantId = 'platform-master') {
  await ensureSchema();
  const termCol = String(term).toLowerCase();
  if (!['t1', 't2', 't3'].includes(termCol)) throw new Error('Invalid term');

  const learners = await kvGet('paav6_learners', [], tenantId) || [];
  const l = learners.find(x => x.adm === adm);
  const feeCfg = await kvGet('paav6_feecfg', {}, tenantId) || {};
  
  if (status === 'approved' && l) {
    const gradeCfg = feeCfg[l.grade] || { term1: 0, term2: 0, term3: 0 };
    const termLimits = {
      t1: gradeCfg.term1 || (gradeCfg.annual ? Math.floor(gradeCfg.annual / 3) : 0),
      t2: gradeCfg.term2 || (gradeCfg.annual ? Math.floor(gradeCfg.annual / 3) : 0),
      t3: gradeCfg.term3 || (gradeCfg.annual ? Math.floor(gradeCfg.annual / 3) : 0),
    };

    let remaining = Number(amount);
    const updates = { t1: l.t1 || 0, t2: l.t2 || 0, t3: l.t3 || 0, arrears: l.arrears || 0 };

    if (updates.arrears > 0) {
      const payToArrears = Math.min(remaining, updates.arrears);
      updates.arrears -= payToArrears;
      remaining -= payToArrears;
    }

    const termsToFill = ['t1', 't2', 't3'].slice(['t1', 't2', 't3'].indexOf(termCol));
    for (const t of termsToFill) {
      if (remaining <= 0) break;
      const limit = termLimits[t];
      const current = updates[t];
      if (limit > 0 && current < limit) {
        const space = limit - current;
        const add = Math.min(remaining, space);
        updates[t] += add;
        remaining -= add;
      } else if (limit === 0 || current >= limit) {
        if (t === 't3') { updates[t] += remaining; remaining = 0; }
      }
    }
    if (remaining > 0) updates.t3 += remaining;

    await execute(
      `UPDATE learners SET t1 = ?, t2 = ?, t3 = ?, arrears = ? WHERE adm = ? AND tenant_id = ?`,
      [updates.t1, updates.t2, updates.t3, updates.arrears, adm, tenantId]
    );
  }

  const pId = 'p' + Date.now();
  const pDate = new Date().toLocaleDateString('en-KE');
  const pName = l?.name || 'Unknown';
  const pGrade = l?.grade || 'Unknown';
  const pTerm = term.toUpperCase();
  const pAmount = Number(amount);
  const pBy = by || 'System';

  await execute(
    `INSERT INTO paylog (id, tenant_id, date, adm, name, grade, term, amount, method, ref, by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pId, tenantId, pDate, adm, pName, pGrade, pTerm, pAmount, method, ref, pBy, status]
  );
  
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
}

/**
 * Delete a key.
 */
export async function kvDelete(key, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId]);
}

/**
 * Return all keys and their updated_at timestamps (used for smart poll).
 */
export async function kvTimestamps(keys, tenantId = 'platform-master') {
  await ensureSchema();
  if (!keys || !keys.length) return [];
  const placeholders = keys.map(() => '?').join(',');
  return query(
    `SELECT key, updated_at FROM kv WHERE key IN (${placeholders}) AND tenant_id = ?`,
    [...keys, tenantId]
  );
}

/**
 * Get Turso database storage usage.
 */
export async function getStorageUsage() {
  const db = getClient();
  const resCount = await db.execute('PRAGMA page_count');
  const resSize = await db.execute('PRAGMA page_size');
  const count = Number(resCount.rows?.[0]?.[0] || 0);
  const size = Number(resSize.rows?.[0]?.[0] || 4096);
  const totalBytes = count * size;
  const limitBytes = 9 * 1024 * 1024 * 1024; // 9GB Turso Free Tier
  return {
    totalBytes,
    limitBytes,
    percent: (totalBytes / limitBytes) * 100
  };
}

export async function logAction(user, action, details) {
  const isSuper = (user.tenant_id === 'platform-master' || user.tenantId === 'platform-master') && user.role === 'super-admin';
  const tenantId = user?.tenantId || user?.tenant_id || 'platform-master';
  const oldLogs = await kvGet('paav7_activity_log', [], tenantId) || [];
  const newLog = {
    id: 'log_' + Date.now(),
    userId: user?.id || 'guest',
    userName: user?.name || 'Guest/System',
    userRole: user?.role || 'none',
    action,
    details,
    timestamp: new Date().toISOString()
  };
  const logs = [newLog, ...oldLogs].slice(0, 1000);
  await kvSet('paav7_activity_log', logs, tenantId);
}

/**
 * Bulk add learners safely. 
 * If a learner exists with the same ADM, it updates.
 * If a learner exists with the same Name + Grade but different ADM, it merges/updates to the new ADM.
 */
export async function kvBulkAddLearners(learners, tenantId = 'platform-master') {
  if (!learners || !learners.length) return;
  // 1. Fetch existing learners to detect duplicates by Fuzzy Name + Grade
  const existing = await query('SELECT adm, name, grade FROM learners WHERE tenant_id = ?', [tenantId]);
  
  const stmts = [];
  const admsToDelete = new Set();

  for (const l of learners) {
    const lName = l.name.toUpperCase();
    const lGrade = l.grade;
    existing.forEach(old => {
      if (old.grade === lGrade && isFuzzyMatch(old.name, lName)) {
        if (old.adm !== l.adm) admsToDelete.add(old.adm);
      }
    });

    stmts.push({
      sql: `INSERT INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies, medicalCondition, emergencyContact) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(adm, tenant_id) DO UPDATE SET 
              name = excluded.name, grade = excluded.grade, sex = excluded.sex, 
              age = excluded.age, dob = excluded.dob, stream = excluded.stream,
              parent = excluded.parent, phone = excluded.phone,
              bloodGroup = excluded.bloodGroup, allergies = excluded.allergies,
              medicalCondition = excluded.medicalCondition, emergencyContact = excluded.emergencyContact`,
      args: [
        l.adm, tenantId, lName, lGrade, l.sex, l.age || '', l.dob || null, 
        l.stream || '', l.teacher || '', l.parent || '', l.phone || '', 
        l.parentEmail || null, l.addr || '', l.t1 || 0, l.t2 || 0, l.t3 || 0, 
        l.arrears || 0, l.avatar || null,
        l.bloodGroup || null, l.allergies || null, l.medicalCondition || null, l.emergencyContact || null
      ]
    });
  }
  
  const remapStmts = [];
  // 2. Remap associated data (marks, payments, etc.)
  if (admsToDelete.size > 0) {
    for (const l of learners) {
      const lName = l.name.toUpperCase();
      const lGrade = l.grade;
      existing.forEach(old => {
        if (old.grade === lGrade && isFuzzyMatch(old.name, lName) && old.adm !== l.adm) {
          remapStmts.push({ sql: `UPDATE OR IGNORE marks SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [l.adm, old.adm, tenantId] });
          remapStmts.push({ sql: `UPDATE OR IGNORE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [l.adm, old.adm, tenantId] });
          remapStmts.push({ sql: `UPDATE OR IGNORE attendance SET id_date = REPLACE(id_date, ?, ?) WHERE id_date LIKE ? AND tenant_id = ?`, args: [`|${old.adm}`, `|${l.adm}`, `%|${old.adm}`, tenantId] });
        }
      });
    }
  }

  // C. SUPER RECOVERY: Use paylog names to re-link orphaned marks
  const orphanedWithNames = await query(`
    SELECT DISTINCT p.adm, p.name, p.grade 
    FROM paylog p 
    WHERE p.tenant_id = ? AND p.adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
  `, [tenantId, tenantId]);

  for (const orphan of orphanedWithNames) {
    const target = learners.find(l => isFuzzyMatch(l.name, orphan.name) && l.grade === orphan.grade);
    if (target) {
      remapStmts.push({ sql: `UPDATE OR IGNORE marks SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, orphan.adm, tenantId] });
      remapStmts.push({ sql: `UPDATE OR IGNORE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, orphan.adm, tenantId] });
    }
  }

  if (remapStmts.length > 0) await batch(remapStmts);

  // 3. Now safe to delete the old learner profiles
  if (admsToDelete.size > 0) {
    const placeholders = Array.from(admsToDelete).map(() => '?').join(',');
    await execute(`DELETE FROM learners WHERE tenant_id = ? AND adm IN (${placeholders})`, [tenantId, ...Array.from(admsToDelete)]);
  }

  await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_learners', tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
}

/**
 * Recover marks and payments that were orphaned during merges.
 */
export async function recoverOrphanedData(tenantId = 'platform-master') {
  await ensureSchema();
  console.log('[DB] Starting data recovery for orphaned marks/payments...');
  
  // 1. Fetch all current learners to use as targets
  const currentLearners = await query('SELECT adm, name, grade FROM learners WHERE tenant_id = ?', [tenantId]);
  
  // 2. Fetch orphaned ADMs from marks and paylog
  const orphanedAdms = await query(`
    SELECT DISTINCT adm FROM marks WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
    UNION
    SELECT DISTINCT adm FROM paylog WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
  `, [tenantId, tenantId, tenantId, tenantId]);

  if (orphanedAdms.length === 0) {
    console.log('[DB] No orphaned data found.');
    return 0;
  }

  let recoveredCount = 0;
  const stmts = [];

  // 3. Map orphaned ADMs to names from paylog
  const orphanMap = new Map();
  const orphanMeta = await query(`SELECT DISTINCT adm, name, grade FROM paylog WHERE tenant_id = ?`, [tenantId]);
  orphanMeta.forEach(m => {
    if (m.name && m.adm) orphanMap.set(m.adm, { name: m.name, grade: m.grade });
  });

  for (const orphan of orphanedAdms) {
    const oldAdm = orphan.adm;
    const meta = orphanMap.get(oldAdm);
    if (!meta) continue;

    const target = currentLearners.find(l => isFuzzyMatch(l.name, meta.name) && l.grade === meta.grade);
    if (target && target.adm !== oldAdm) {
      recoveredCount++;
      remapStmts.push({ sql: `UPDATE OR IGNORE marks SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, oldAdm, tenantId] });
      remapStmts.push({ sql: `UPDATE OR IGNORE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, oldAdm, tenantId] });
    }
  }

  if (remapStmts.length > 0) {
    await batch(remapStmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_marks', tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
  }
  
  return recoveredCount;
}

/**
 * Get the current subscription status for a tenant.
 */
export async function getSubscriptionStatus(tenantId) {
  await ensureSchema();
  const rows = await query('SELECT * FROM subscriptions WHERE tenant_id = ?', [tenantId]);
  if (!rows.length) return { tenant_id: tenantId, plan: 'basic', status: 'active', expires_at: null };
  return rows[0];
}
