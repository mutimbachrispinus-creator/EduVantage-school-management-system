import { PAAV_KEYS } from './constants.js';

let _client = null;

/**
 * Smarter fuzzy match for learner names.
 * Handles reordered names and partial matches.
 */
export function isFuzzyMatch(n1, n2) {
  if (!n1 || !n2) return false;
  const s1 = String(n1).toUpperCase().trim().replace(/[^A-Z\s]/g, '');
  const s2 = String(n2).toUpperCase().trim().replace(/[^A-Z\s]/g, '');
  if (s1 === s2) return true;
  
  const w1 = s1.split(/\s+/).filter(w => w.length > 1);
  const w2 = s2.split(/\s+/).filter(w => w.length > 1);
  
  if (w1.length === 0 || w2.length === 0) return s1 === s2;

  // Check if at least 2 words match (Order independent)
  const longer = w1.length >= w2.length ? w1 : w2;
  const shorter = w1.length < w2.length ? w1 : w2;
  const longerSet = new Set(longer);
  const matches = shorter.filter(w => longerSet.has(w)).length;

  if (shorter.length === 1) return matches === 1 && longer.includes(shorter[0]);
  return matches >= 2;
}

/**
 * Get the database client.
 * Uses dynamic imports for @libsql/client to avoid Node-only code on Edge.
 */
export async function getClient() {
  if (_client) return _client;
  
  try {
    let url = process.env.TURSO_URL || '';
    const token = process.env.TURSO_TOKEN || '';

    const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
    if (!url && isBuild) url = 'file:build.db';
    if (!url) {
       console.warn('[DB] Missing TURSO_URL. Using local fallback.');
       url = 'file:local.db';
    }

    const isLocal = url.startsWith('file:');
    let createClient;
    
    if (isLocal) {
      const mod = await import('@libsql/client');
      createClient = mod.createClient;
    } else {
      const mod = await import('@libsql/client/web');
      createClient = mod.createClient;
      if (url.startsWith('libsql://')) {
        url = url.replace('libsql://', 'https://');
      }
    }

    _client = createClient({ url, authToken: token });
    return _client;
  } catch (e) {
    console.error('[DB] Failed to initialize database client:', e);
    throw e;
  }
}

/**
 * Execute a query that returns rows.
 */
export async function query(sql, args = []) {
  const client = await getClient();
  const res = await client.execute({ sql, args });
  return res.rows;
}

/**
 * Execute a single command.
 */
export async function execute(sql, args = []) {
  const client = await getClient();
  return await client.execute({ sql, args });
}

/**
 * Execute multiple statements in a single transaction.
 */
export async function batch(stmts) {
  const client = await getClient();
  return await client.batch(stmts, 'write');
}

let _schemaChecked = false;
/**
 * Optimized schema initialization using batched statements.
 */
export async function ensureSchema() {
  if (_schemaChecked) return;

  try {
    await getClient();
    console.log('[DB] Verifying database schema...');

    const tableStmts = [
      'CREATE TABLE IF NOT EXISTS kv (key TEXT, tenant_id TEXT, value TEXT, updated_at INTEGER, PRIMARY KEY(key, tenant_id))',
      'CREATE TABLE IF NOT EXISTS learners (adm TEXT, tenant_id TEXT, name TEXT, grade TEXT, sex TEXT, age INTEGER, dob TEXT, stream TEXT, teacher TEXT, parent TEXT, phone TEXT, parentEmail TEXT, addr TEXT, t1 REAL, t2 REAL, t3 REAL, arrears REAL, avatar TEXT, bloodGroup TEXT, allergies TEXT, medicalCondition TEXT, emergencyContact TEXT, PRIMARY KEY(adm, tenant_id))',
      'CREATE TABLE IF NOT EXISTS marks (grade_subj_assess TEXT, adm TEXT, tenant_id TEXT, score REAL, PRIMARY KEY(grade_subj_assess, adm, tenant_id))',
      'CREATE TABLE IF NOT EXISTS paylog (id TEXT, tenant_id TEXT, date TEXT, adm TEXT, name TEXT, grade TEXT, term TEXT, amount REAL, method TEXT, ref TEXT, by TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS files (id TEXT, tenant_id TEXT, name TEXT, type TEXT, data BLOB, size INTEGER, created_at INTEGER, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS attendance (grade_date_adm TEXT, tenant_id TEXT, status TEXT, PRIMARY KEY(grade_date_adm, tenant_id))',
      'CREATE TABLE IF NOT EXISTS messages (id TEXT, tenant_id TEXT, msg_json TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS presence (id_date TEXT, tenant_id TEXT, userId TEXT, prec_json TEXT, PRIMARY KEY(id_date, tenant_id))',
      'CREATE TABLE IF NOT EXISTS duties (id TEXT, tenant_id TEXT, duty_json TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS users (id TEXT, tenant_id TEXT, username TEXT, password TEXT, role TEXT, name TEXT, avatar TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS audit (id TEXT, tenant_id TEXT, user_id TEXT, action TEXT, details TEXT, timestamp INTEGER, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS subscriptions (tenant_id TEXT PRIMARY KEY, plan TEXT, status TEXT, expires_at INTEGER, learner_limit INTEGER, features_json TEXT)',
      'CREATE TABLE IF NOT EXISTS global_audit (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, tenant_id TEXT, action TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)',
      'CREATE TABLE IF NOT EXISTS terms (id TEXT, tenant_id TEXT, name TEXT, start_date TEXT, end_date TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS deleted_learners (adm TEXT, tenant_id TEXT, name TEXT, grade TEXT, sex TEXT, age INTEGER, dob TEXT, stream TEXT, teacher TEXT, parent TEXT, phone TEXT, parentEmail TEXT, addr TEXT, t1 REAL, t2 REAL, t3 REAL, arrears REAL, avatar TEXT, bloodGroup TEXT, allergies TEXT, medicalCondition TEXT, emergencyContact TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(adm, tenant_id))',
      'CREATE TABLE IF NOT EXISTS staff_requests (id TEXT, tenant_id TEXT, userId TEXT, req_json TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS staff (id TEXT, tenant_id TEXT, name TEXT, username TEXT, role TEXT, phone TEXT, password TEXT, status TEXT, childAdm TEXT, grade TEXT, teachingAreas TEXT, secQ TEXT, secA TEXT, email TEXT, createdAt TEXT, avatar TEXT, user_json TEXT, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS nexed_suppliers (id TEXT, tenant_id TEXT, name TEXT, contact_person TEXT, phone TEXT, email TEXT, category TEXT, created_at INTEGER, PRIMARY KEY(id, tenant_id))',
      'CREATE TABLE IF NOT EXISTS nexed_voteheads (id TEXT, tenant_id TEXT, name TEXT, description TEXT, PRIMARY KEY(id, tenant_id))'
    ].map(sql => ({ sql, args: [] }));

    const migrationStmts = [
      'ALTER TABLE staff ADD COLUMN name TEXT',
      'ALTER TABLE staff ADD COLUMN username TEXT',
      'ALTER TABLE staff ADD COLUMN role TEXT',
      'ALTER TABLE staff ADD COLUMN phone TEXT',
      'ALTER TABLE staff ADD COLUMN password TEXT',
      'ALTER TABLE staff ADD COLUMN status TEXT',
      'ALTER TABLE staff ADD COLUMN childAdm TEXT',
      'ALTER TABLE staff ADD COLUMN grade TEXT',
      'ALTER TABLE staff ADD COLUMN teachingAreas TEXT',
      'ALTER TABLE staff ADD COLUMN secQ TEXT',
      'ALTER TABLE staff ADD COLUMN secA TEXT',
      'ALTER TABLE staff ADD COLUMN email TEXT',
      'ALTER TABLE staff ADD COLUMN createdAt TEXT',
      'ALTER TABLE staff ADD COLUMN avatar TEXT',
      'ALTER TABLE staff ADD COLUMN user_json TEXT',
      'ALTER TABLE learners ADD COLUMN bloodGroup TEXT',
      'ALTER TABLE learners ADD COLUMN allergies TEXT',
      'ALTER TABLE learners ADD COLUMN medicalCondition TEXT',
      'ALTER TABLE learners ADD COLUMN emergencyContact TEXT',
      'ALTER TABLE users ADD COLUMN name TEXT',
      'ALTER TABLE users ADD COLUMN avatar TEXT',
      'ALTER TABLE subscriptions ADD COLUMN amount REAL',
      'ALTER TABLE subscriptions ADD COLUMN billing_model TEXT',
      'ALTER TABLE subscriptions ADD COLUMN cycle TEXT',
      'ALTER TABLE subscriptions ADD COLUMN learner_limit INTEGER',
      'ALTER TABLE subscriptions ADD COLUMN registered_learners INTEGER',
      'ALTER TABLE subscriptions ADD COLUMN features_json TEXT',
      'ALTER TABLE subscriptions ADD COLUMN updated_at INTEGER',
      'ALTER TABLE deleted_learners ADD COLUMN bloodGroup TEXT',
      'ALTER TABLE deleted_learners ADD COLUMN allergies TEXT',
      'ALTER TABLE deleted_learners ADD COLUMN medicalCondition TEXT',
      'ALTER TABLE deleted_learners ADD COLUMN emergencyContact TEXT',
      'CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username)',
      'CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id)'
    ];

    await batch(tableStmts);

    for (const sql of migrationStmts) {
      try {
        await execute(sql);
      } catch (e) {
        if (!String(e.message).includes('duplicate column')) {
          console.warn(`[DB] Migration warning: ${e.message}`);
        }
      }
    }

    await execute(`
      UPDATE staff
      SET
        name = COALESCE(name, json_extract(user_json, '$.name')),
        username = COALESCE(username, json_extract(user_json, '$.username')),
        role = COALESCE(role, json_extract(user_json, '$.role')),
        phone = COALESCE(phone, json_extract(user_json, '$.phone')),
        password = COALESCE(password, json_extract(user_json, '$.password')),
        status = COALESCE(status, json_extract(user_json, '$.status')),
        childAdm = COALESCE(childAdm, json_extract(user_json, '$.childAdm')),
        grade = COALESCE(grade, json_extract(user_json, '$.grade')),
        teachingAreas = COALESCE(teachingAreas, json_extract(user_json, '$.teachingAreas')),
        secQ = COALESCE(secQ, json_extract(user_json, '$.secQ')),
        secA = COALESCE(secA, json_extract(user_json, '$.secA')),
        email = COALESCE(email, json_extract(user_json, '$.email')),
        createdAt = COALESCE(createdAt, json_extract(user_json, '$.createdAt')),
        avatar = COALESCE(avatar, json_extract(user_json, '$.avatar'))
      WHERE user_json IS NOT NULL AND json_valid(user_json)
    `);

    _schemaChecked = true;
    console.log('[DB] Schema ready.');
  } catch (e) {
    console.error('[DB] Schema initialization failed:', e);
    throw e;
  }
}

/**
 * KV store utilities.
 */
export async function kvGet(key, defaultValue = null, tenantId = 'platform-master') {
  if (key === 'paav6_marks') {
    const rows = await query('SELECT grade_subj_assess, adm, score FROM marks WHERE tenant_id = ?', [tenantId]);
    const marks = {};
    for (const row of rows) {
      if (!marks[row.grade_subj_assess]) marks[row.grade_subj_assess] = {};
      marks[row.grade_subj_assess][row.adm] = row.score;
    }
    return marks;
  }

  if (key === 'paav_student_attendance') {
    const rows = await query('SELECT grade_date_adm, status FROM attendance WHERE tenant_id = ?', [tenantId]);
    const att = {};
    for (const row of rows) {
      att[row.grade_date_adm] = row.status;
    }
    return att;
  }

  if (key === 'paav_terms') {
    const rows = await query('SELECT id, name, start_date, end_date FROM terms WHERE tenant_id = ?', [tenantId]);
    return rows;
  }

  if (key === 'paav6_staff') {
    const rows = await query('SELECT * FROM staff WHERE tenant_id = ?', [tenantId]);
    return rows.map(rowToStaff);
  }

  if (key === 'paav6_learners') {
    const rows = await query('SELECT * FROM learners WHERE tenant_id = ?', [tenantId]);
    return rows;
  }

  const rows = await query('SELECT value FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId]);
  if (!rows.length) return defaultValue;
  try { return JSON.parse(rows[0].value); }
  catch (e) { return rows[0].value; }
}

export async function kvSet(key, value, tenantId = 'platform-master') {
  await ensureSchema();
  if (key === 'paav6_marks' && value && typeof value === 'object') {
    const stmts = [];
    for (const [gsa, admScores] of Object.entries(value)) {
      if (!admScores || typeof admScores !== 'object' || Array.isArray(admScores)) continue;
      for (const [adm, score] of Object.entries(admScores)) {
        if (score === null || score === undefined || score === '') continue;
        stmts.push({
          sql: `INSERT INTO marks (grade_subj_assess, adm, tenant_id, score) VALUES (?, ?, ?, ?)
                ON CONFLICT(grade_subj_assess, adm, tenant_id) DO UPDATE SET score = excluded.score`,
          args: [gsa, adm, tenantId, Number(score)]
        });
      }
    }

    if (stmts.length) await batch(stmts);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [key, tenantId]);
    return;
  }

  if (key === 'paav6_staff' && Array.isArray(value)) {
    await kvBulkSetStaff(value, tenantId);
    return;
  }

  const valStr = typeof value === 'string' ? value : JSON.stringify(value);
  await execute(`INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
                 ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, tenantId, valStr]);
}

function rowToStaff(row) {
  let teachingAreas = [];
  if (row.teachingAreas) {
    try {
      teachingAreas = JSON.parse(row.teachingAreas);
    } catch {
      teachingAreas = [];
    }
  }

  return {
    ...row,
    teachingAreas
  };
}

async function kvBulkSetStaff(staff, tenantId) {
  const stmts = [];
  for (const s of staff) {
    if (!s) continue;
    const id = s.id || `${s.role || 'staff'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    stmts.push({
      sql: `INSERT INTO staff (
              id, tenant_id, name, username, role, phone, password, status, childAdm,
              grade, teachingAreas, secQ, secA, email, createdAt, avatar, user_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id, tenant_id) DO UPDATE SET
              name=excluded.name,
              username=excluded.username,
              role=excluded.role,
              phone=excluded.phone,
              password=excluded.password,
              status=excluded.status,
              childAdm=excluded.childAdm,
              grade=excluded.grade,
              teachingAreas=excluded.teachingAreas,
              secQ=excluded.secQ,
              secA=excluded.secA,
              email=excluded.email,
              avatar=excluded.avatar,
              user_json=excluded.user_json`,
      args: [
        id,
        tenantId,
        s.name || '',
        s.username || '',
        s.role || 'staff',
        s.phone || '',
        s.password || '',
        s.status || 'active',
        s.childAdm || null,
        s.grade || null,
        JSON.stringify(s.teachingAreas || []),
        s.secQ || null,
        s.secA || null,
        s.email || null,
        s.createdAt || new Date().toISOString(),
        s.avatar || null,
        JSON.stringify({ ...s, id })
      ]
    });
  }
  if (stmts.length) await batch(stmts);
  await execute(`INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
                 ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                ['paav6_staff', tenantId, JSON.stringify(staff)]);
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

export async function kvUpdateStaffStatus(id, status, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT user_json FROM staff WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (rows.length > 0) {
    const user = JSON.parse(rows[0].user_json);
    user.status = status;
    await execute('UPDATE staff SET user_json = ? WHERE id = ? AND tenant_id = ?', [JSON.stringify(user), id, tenantId]);
    await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
  }
}

export async function kvDeleteStaff(id, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM staff WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_staff', tenantId]);
}

/**
 * Save academic terms for a tenant.
 */
export async function kvSetTerms(terms, tenantId = 'platform-master') {
  await ensureSchema();
  const stmts = [ { sql: 'DELETE FROM terms WHERE tenant_id = ?', args: [tenantId] } ];
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    stmts.push({
      sql: 'INSERT INTO terms (id, tenant_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      args: [t.id || (`term_${Date.now()}_${i}`), tenantId, t.name, t.start_date, t.end_date]
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
  // Update the timestamp in KV so clients know to re-fetch the virtual key
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
  const id = p.id || (p.ref ? `pay_${String(p.ref).replace(/[^A-Za-z0-9_-]/g, '_')}` : `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const date = p.date || new Date().toISOString();
  await execute(`INSERT INTO paylog (id, tenant_id, date, adm, name, grade, term, amount, method, ref, by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id, tenant_id) DO NOTHING`,
                [id, tenantId, date, p.adm, p.name || '', p.grade || '', p.term, p.amount, p.method, p.ref, p.by]);
  await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, ['paav6_paylog', tenantId]);
}
export async function kvDelete(key, tenantId = 'platform-master') {
  await ensureSchema();
  await execute('DELETE FROM kv WHERE key = ? AND tenant_id = ?', [key, tenantId]);
}

export async function kvGetWithMeta(key, tenantId = 'platform-master') {
  const results = await kvGetManyWithMeta([key], tenantId);
  return results[0] || { value: null, updatedAt: 0 };
}

/**
 * Optimized bulk getter for multiple KV keys.
 */
export async function kvGetManyWithMeta(keys, tenantId = 'platform-master') {
  if (!keys || keys.length === 0) return [];

  // Special virtual keys that map to relational tables
  const virtualKeys = ['paav6_learners', 'paav6_staff', 'paav6_marks', 'paav_student_attendance', 'paav_terms', 'paav6_msgs'];
  const hasVirtual = keys.some(k => virtualKeys.includes(k));
  
  const virtualData = {};
  if (hasVirtual) {
    await Promise.all(keys.map(async k => {
      if (k === 'paav6_staff') {
        const rows = await query('SELECT * FROM staff WHERE tenant_id = ?', [tenantId]);
        virtualData[k] = rows.map(rowToStaff);
      } else if (k === 'paav6_marks') {
        const rows = await query('SELECT grade_subj_assess, adm, score FROM marks WHERE tenant_id = ?', [tenantId]);
        const marks = {};
        for (const row of rows) {
          if (!marks[row.grade_subj_assess]) marks[row.grade_subj_assess] = {};
          marks[row.grade_subj_assess][row.adm] = row.score;
        }
        virtualData[k] = marks;
      } else if (k === 'paav_student_attendance') {
        const rows = await query('SELECT grade_date_adm, status FROM attendance WHERE tenant_id = ?', [tenantId]);
        const att = {};
        for (const row of rows) { att[row.grade_date_adm] = row.status; }
        virtualData[k] = att;
      } else if (k === 'paav_terms') {
        virtualData[k] = await query('SELECT id, name, start_date, end_date FROM terms WHERE tenant_id = ?', [tenantId]);
      } else if (k === 'paav6_learners') {
        virtualData[k] = await query('SELECT * FROM learners WHERE tenant_id = ?', [tenantId]);
      } else if (k === 'paav6_msgs') {
        const rows = await query('SELECT msg_json FROM messages WHERE tenant_id = ? ORDER BY id DESC', [tenantId]);
        virtualData[k] = rows.map(r => {
          try { return JSON.parse(r.msg_json); }
          catch { return null; }
        }).filter(Boolean);
      }
    }));
  }

  const kvKeys = keys.filter(k => !virtualKeys.includes(k));
  const placeholders = kvKeys.map(() => '?').join(',');
  let rows = [];
  if (placeholders) {
    rows = await query(`SELECT key, value, updated_at FROM kv WHERE key IN (${placeholders}) AND tenant_id = ?`, [...kvKeys, tenantId]);
  }

  const rowMap = new Map();
  rows.forEach(r => rowMap.set(r.key, r));

  // Get timestamps for virtual keys from the kv table (even if value is null)
  const allTimestamps = await kvTimestamps(keys, tenantId);
  const tsMap = {};
  allTimestamps.forEach(t => tsMap[t.key] = t.updated_at);

  return keys.map(k => {
    if (virtualKeys.includes(k)) {
      return { key: k, value: virtualData[k], updatedAt: tsMap[k] || 0 };
    }
    const row = rowMap.get(k);
    let val = null;
    if (row) {
      try { val = JSON.parse(row.value); } catch { val = row.value; }
    }
    return { key: k, value: val, updatedAt: row?.updated_at || 0 };
  });
}

export async function kvTimestamps(keys, tenantId = 'platform-master') {
  if (!keys.length) return [];
  const placeholders = keys.map(() => '?').join(',');
  return await query(`SELECT key, updated_at FROM kv WHERE key IN (${placeholders}) AND tenant_id = ?`, [...keys, tenantId]);
}

export async function kvUpdateLearner(oldAdm, details, tenantId = 'platform-master') {
  await ensureSchema();
  const newAdm = details.adm;
  const stmts = [{
    sql: `UPDATE learners SET
            adm = ?, name = ?, grade = ?, sex = ?, age = ?, dob = ?,
            stream = ?, teacher = ?, parent = ?, phone = ?,
            parentEmail = ?, addr = ?, avatar = ?,
            bloodGroup = ?, allergies = ?, medicalCondition = ?, emergencyContact = ?
          WHERE adm = ? AND tenant_id = ?`,
    args: [
      newAdm,
      (details.name || '').toUpperCase(),
      details.grade,
      details.sex,
      details.age,
      details.dob,
      details.stream,
      details.teacher,
      details.parent,
      details.phone,
      details.parentEmail || null,
      details.addr,
      details.avatar || null,
      details.bloodGroup || null,
      details.allergies || null,
      details.medicalCondition || null,
      details.emergencyContact || null,
      oldAdm,
      tenantId
    ]
  }];

  if (oldAdm !== newAdm) {
    stmts.push({ sql: 'UPDATE marks SET adm = ? WHERE adm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });
    stmts.push({ sql: 'UPDATE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });
    stmts.push({ sql: 'UPDATE staff SET childAdm = ? WHERE childAdm = ? AND tenant_id = ?', args: [newAdm, oldAdm, tenantId] });

    const attRows = await query('SELECT grade_date_adm, status FROM attendance WHERE grade_date_adm LIKE ? AND tenant_id = ?', [`%|${oldAdm}`, tenantId]);
    for (const row of attRows) {
      const parts = row.grade_date_adm.split('|');
      if (parts[parts.length - 1] === oldAdm) {
        parts[parts.length - 1] = newAdm;
        stmts.push({ sql: 'DELETE FROM attendance WHERE grade_date_adm = ? AND tenant_id = ?', args: [row.grade_date_adm, tenantId] });
        stmts.push({ sql: 'INSERT OR IGNORE INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)', args: [parts.join('|'), tenantId, row.status] });
      }
    }
  }

  await batch(stmts);
  await syncLearnerKV(tenantId);
}

export async function kvDeleteLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT * FROM learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  if (rows.length > 0) {
    const l = rows[0];
    await execute(`
      INSERT INTO deleted_learners (
        adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone,
        parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies,
        medicalCondition, emergencyContact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(adm, tenant_id) DO UPDATE SET deleted_at = strftime('%s','now')
    `, [
      l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent,
      l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar, l.bloodGroup,
      l.allergies, l.medicalCondition, l.emergencyContact
    ]);
  }
  await execute('DELETE FROM learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  await syncLearnerKV(tenantId);
}

export async function kvDeleteGradeLearners(grade, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT * FROM learners WHERE grade = ? AND tenant_id = ?', [grade, tenantId]);
  const stmts = rows.map(l => ({
    sql: `INSERT INTO deleted_learners (
            adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone,
            parentEmail, addr, t1, t2, t3, arrears, avatar, bloodGroup, allergies,
            medicalCondition, emergencyContact
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(adm, tenant_id) DO UPDATE SET deleted_at = strftime('%s','now')`,
    args: [
      l.adm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent,
      l.phone, l.parentEmail, l.addr, l.t1, l.t2, l.t3, l.arrears, l.avatar, l.bloodGroup,
      l.allergies, l.medicalCondition, l.emergencyContact
    ]
  }));
  // CRITICAL FIX: Removed the destructive DELETE statement that was wiping out entire grades!
  // It now safely upserts (updates existing ADMs and adds new ones) without touching other learners in the grade.
  await batch(stmts);
  await syncLearnerKV(tenantId);
}

/**
 * Synchronizes the relational learners table to the KV paav6_learners list.
 * The client-side app relies on this KV entry for many displays.
 */
export async function syncLearnerKV(tenantId) {
  await ensureSchema();
  const learners = await query('SELECT * FROM learners WHERE tenant_id = ?', [tenantId]);
  await kvSet('paav6_learners', learners, tenantId);
  return learners.length;
}

export async function kvBulkAddLearners(learners, tenantId = 'platform-master') {
  await ensureSchema();
  
  // Fetch current learners to perform name-based merging if ADM doesn't match
  const existingLearners = await query('SELECT adm, name, grade FROM learners WHERE tenant_id = ?', [tenantId]);
  
  const stmts = [];
  for (const l of learners) {
    if (!l) continue;
    
    let targetAdm = l.adm;
    
    // 1. Try to find by ADM first
    const admMatch = existingLearners.find(ex => ex.adm === l.adm);
    
    // 2. If no ADM match, try to find by Name fuzzy match in the same grade
    if (!admMatch) {
      const nameMatch = existingLearners.find(ex => ex.grade === l.grade && isFuzzyMatch(ex.name, l.name));
      if (nameMatch) {
        targetAdm = nameMatch.adm; // Merge into the existing record's ADM
      }
    }

    stmts.push({
      sql: `INSERT INTO learners (adm, tenant_id, name, grade, sex, age, dob, stream, teacher, parent, phone, parentEmail, addr, t1, t2, t3, arrears, avatar) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(adm, tenant_id) DO UPDATE SET 
              name=excluded.name, grade=excluded.grade, sex=excluded.sex, age=excluded.age, dob=excluded.dob,
              stream=excluded.stream, teacher=excluded.teacher, parent=excluded.parent, phone=excluded.phone,
              parentEmail=excluded.parentEmail, addr=excluded.addr, t1=excluded.t1, t2=excluded.t2, t3=excluded.t3,
              arrears=excluded.arrears, avatar=excluded.avatar`,
      args: [targetAdm, tenantId, l.name, l.grade, l.sex, l.age, l.dob, l.stream, l.teacher, l.parent, l.phone, l.parentEmail || null, l.addr, l.t1, l.t2, l.t3, l.arrears || 0, l.avatar || null]
    });
  }
  if (stmts.length) await batch(stmts);

  await syncLearnerKV(tenantId);
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
  await syncLearnerKV(tenantId);
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

export async function getLearner(adm, tenantId = 'platform-master') {
  await ensureSchema();
  const rows = await query('SELECT * FROM learners WHERE adm = ? AND tenant_id = ?', [adm, tenantId]);
  return rows[0] || null;
}

/**
 * Count orphaned mark records for a tenant.
 */
export async function countOrphanedData(tenantId = 'platform-master') {
  await ensureSchema();
  const res = await query(`
    SELECT 
      (SELECT COUNT(DISTINCT adm) FROM marks WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)) as m_count,
      (SELECT COUNT(DISTINCT adm) FROM paylog WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)) as p_count
  `, [tenantId, tenantId, tenantId, tenantId]);
  
  const m = Number(res[0]?.m_count || 0);
  const p = Number(res[0]?.p_count || 0);

  // Check for configuration health
  const profile = await kvGet('paav_school_profile', null, tenantId);
  const hasProfile = !!profile;
  const hasLearners = (await query('SELECT COUNT(*) as c FROM learners WHERE tenant_id = ?', [tenantId]))[0]?.c > 0;

  return { 
    count: Math.max(m, p), 
    marksCount: m, 
    paylogCount: p,
    health: {
      hasProfile,
      hasLearners,
      isConfigured: hasProfile && hasLearners
    }
  };
}

/**
 * Synchronizes learners from the core 'learners' table to the 'nexed_students' table.
 * This ensures that the financial module always has the latest student records.
 */
export async function syncLearnersToNexed(tenantId) {
  const db = await getClient();
  const learners = await db.execute({
    sql: 'SELECT adm, name, phone, parentEmail FROM learners WHERE tenant_id = ?',
    args: [tenantId]
  });

  const stmts = learners.rows.map(l => ({
    sql: `INSERT INTO nexed_students (id, adm, name, phone, email, tenant_id, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))
          ON CONFLICT(adm) DO UPDATE SET name = excluded.name, phone = excluded.phone, email = excluded.email`,
    args: [`nexed_${l.adm}`, l.adm, l.name, l.phone, l.parentEmail, tenantId]
  }));

  if (stmts.length > 0) {
    await db.batch(stmts, 'write');
  }
  return learners.rows.length;
}

/**
 * System-wide diagnostic scan for all tenants.
 */
export async function diagnosticScan() {
  await ensureSchema();
  const tenants = await query('SELECT tenant_id FROM subscriptions');
  const results = [];

  for (const t of tenants) {
    const tid = t.tenant_id;
    if (tid === 'platform-master') continue;

    const stats = await countOrphanedData(tid);
    const profile = await kvGet('paav_school_profile', { name: tid }, tid);
    
    results.push({
      id: tid,
      name: profile.name || tid,
      ...stats
    });
  }

  return results;
}

/**
 * Recover marks and payments that were orphaned during merges.
 */
export async function recoverOrphanedData(tenantId = 'platform-master') {
  await ensureSchema();
  console.log(`[DB] Starting deep recovery for tenant: ${tenantId}`);
  
  const currentLearners = await query('SELECT adm, name, grade FROM learners WHERE tenant_id = ?', [tenantId]);
  const orphanedAdms = await query(`
    SELECT DISTINCT adm FROM marks WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
    UNION
    SELECT DISTINCT adm FROM paylog WHERE tenant_id = ? AND adm NOT IN (SELECT adm FROM learners WHERE tenant_id = ?)
  `, [tenantId, tenantId, tenantId, tenantId]);

  if (orphanedAdms.length === 0) return 0;

  await logAction({ id: 'system', name: 'Deep Recovery Engine', tenantId }, 'Recovery Started', `Scanning for orphans in ${tenantId}`);

  let recoveredCount = 0;
  const remapStmts = [];
  const nameRegistry = new Map();
  
  const paylogNames = await query(`SELECT DISTINCT adm, name, grade FROM paylog WHERE tenant_id = ?`, [tenantId]);
  paylogNames.forEach(m => { if (m.name && m.adm) nameRegistry.set(m.adm, { name: m.name, grade: m.grade }); });
  
  const profiles = await kvGet('paav_profiles', {}, tenantId);
  if (profiles && typeof profiles === 'object') {
    Object.entries(profiles).forEach(([adm, p]) => {
       if (p.name && !nameRegistry.has(adm)) nameRegistry.set(adm, { name: p.name, grade: p.grade });
    });
  }

  for (const orphan of orphanedAdms) {
    const oldAdm = orphan.adm;
    const meta = nameRegistry.get(oldAdm);
    if (!meta) continue;

    const target = currentLearners.find(l => isFuzzyMatch(l.name, meta.name) && l.grade === meta.grade);
    if (target && target.adm !== oldAdm) {
      recoveredCount++;
      remapStmts.push({ sql: `UPDATE OR IGNORE marks SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, oldAdm, tenantId] });
      remapStmts.push({ sql: `UPDATE OR IGNORE paylog SET adm = ? WHERE adm = ? AND tenant_id = ?`, args: [target.adm, oldAdm, tenantId] });
      remapStmts.push({ sql: `UPDATE OR IGNORE staff SET childAdm = ? WHERE childAdm = ? AND tenant_id = ?`, args: [target.adm, oldAdm, tenantId] });
      
      const attRows = await query('SELECT grade_date_adm, status FROM attendance WHERE grade_date_adm LIKE ? AND tenant_id = ?', [`%|${oldAdm}`, tenantId]);
      for (const row of attRows) {
        const parts = row.grade_date_adm.split('|');
        if (parts[parts.length - 1] === oldAdm) {
          parts[parts.length - 1] = target.adm;
          const newGda = parts.join('|');
          remapStmts.push({ sql: 'DELETE FROM attendance WHERE grade_date_adm = ? AND tenant_id = ?', args: [row.grade_date_adm, tenantId] });
          remapStmts.push({ sql: 'INSERT OR IGNORE INTO attendance (grade_date_adm, tenant_id, status) VALUES (?, ?, ?)', args: [newGda, tenantId, row.status] });
        }
      }
    }
  }

  if (remapStmts.length > 0) {
    await batch(remapStmts);

    // Re-sync KV caches to reflect recovered relational data
    await syncLearnerKV(tenantId);
    await syncMarksKV(tenantId);
    await syncPaylogKV(tenantId);

    const keys = ['paav_student_attendance', 'paav6_staff'];
    for (const k of keys) {
       await execute(`INSERT INTO kv (key, tenant_id, updated_at) VALUES (?, ?, strftime('%s','now')) ON CONFLICT(key, tenant_id) DO UPDATE SET updated_at = excluded.updated_at`, [k, tenantId]);
    }
  }
  
  if (recoveredCount > 0) {
    await logAction({ id: 'system', name: 'Deep Recovery Engine', tenantId }, 'Recovery Completed', `Successfully restored ${recoveredCount} records for ${tenantId}`);
  }

  return recoveredCount;
}

/**
 * Synchronizes relational marks to the KV paav6_marks map.
 */
export async function syncMarksKV(tenantId) {
  await ensureSchema();
  const marks = await query('SELECT * FROM marks WHERE tenant_id = ?', [tenantId]);
  const marksMap = {};
  marks.forEach(m => {
    if (!marksMap[m.grade_subj_assess]) marksMap[m.grade_subj_assess] = {};
    marksMap[m.grade_subj_assess][m.adm] = m.score;
  });
  const valStr = JSON.stringify(marksMap);
  await execute(`INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
                 ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                 ['paav6_marks', tenantId, valStr]);
  return marks.length;
}

/**
 * Synchronizes relational paylog to the KV paav6_paylog list.
 */
export async function syncPaylogKV(tenantId) {
  await ensureSchema();
  const paylog = await query('SELECT * FROM paylog WHERE tenant_id = ? ORDER BY date DESC', [tenantId]);
  const valStr = JSON.stringify(paylog);
  await execute(`INSERT INTO kv (key, tenant_id, value, updated_at) VALUES (?, ?, ?, strftime('%s','now'))
                 ON CONFLICT(key, tenant_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                 ['paav6_paylog', tenantId, valStr]);
  return paylog.length;
}
