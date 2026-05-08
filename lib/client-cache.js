'use client';
/**
 * lib/client-cache.js — Client-side session & DB cache
 *
 * Strategy: stale-while-revalidate.
 *   • On first visit: fetch, store, return.
 *   • On subsequent visits: return cached immediately, then refresh in background.
 *   • TTLs: user=5 min, DB=60 s (increased from 30 s).
 */

const USER_TTL = 5 * 60 * 1000;   // 5 minutes
import { idbGet, idbSet, addToOutbox, idbClearKV } from './idb';

const DB_TTL   = 5 * 60 * 1000;   // 5 minutes (increased from 60s)
const PREFIX   = 'paav_cache_';
const pendingRequests = new Map();

/** Get current tenant context from user session */
function getTenantId() {
  if (typeof window === 'undefined') return 'platform-master';
  try {
    // 1. Check for impersonation (Critical for Super Admins)
    const imp = localStorage.getItem('paav_impersonate_id');
    if (imp) return imp;

    // 2. Fallback to session user
    const raw = localStorage.getItem(PREFIX + 'user');
    if (raw) {
      const { v: user } = JSON.parse(raw);
      return user?.tenant_id || user?.tenantId || 'platform-master';
    }
  } catch {}
  return 'platform-master';
}

/** Generate a tenant-isolated cache key */
function getCacheKey(key) {
  if (key === 'user') return 'user';
  const tid = getTenantId();
  return `${tid}_${key}`;
}

/**
 * Robust fetch with retry logic and timeout
 */
export async function fetchWithRetry(resource, options = {}, retries = 2) {
  const { timeout = 30000 } = options;
  let lastError;

  for (let i = 0; i < retries + 1; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort('timeout'), timeout);

    try {
      if (i > 0) console.log(`[Cache] Retrying fetch to ${resource} (attempt ${i})...`);
      const headers = { ...options.headers };
      if (typeof window !== 'undefined') {
        const tid = getTenantId();
        const impId = localStorage.getItem('paav_impersonate_id');
        if (impId && !headers['x-tenant-id']) headers['x-tenant-id'] = impId;
        else if (!headers['x-tenant-id']) headers['x-tenant-id'] = tid;
      }

      const response = await fetch(resource, { ...options, headers, signal: controller.signal });
      clearTimeout(id);
      
      if (response.status >= 400 && response.status < 600) return response;
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error;
      if (error.name === 'AbortError') {
        // Distinguish: our timeout abort vs browser navigation abort (no reason = page unload)
        const reason = error.message || '';
        if (reason === 'timeout' || controller.signal.aborted) {
          // Our own timeout — log once, don't retry
          console.warn(`[Cache] Request to ${resource} timed out after ${timeout}ms.`);
          break; // No point retrying a request that timed out
        }
        // Browser navigation abort — silent, this is expected
        return null;
      }
      console.warn(`[Cache] Fetch to ${resource} failed:`, error.message);
      if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function store(key, value, serverTs = 0) {
  if (typeof window === 'undefined') return;
  try {
    const cacheKey = getCacheKey(key);
    const entry = { v: value, t: Date.now(), s: serverTs };
    const serialized = JSON.stringify(entry);

    // 1. Mirror to IndexedDB (Primary for large data)
    await idbSet(key, entry);

    // 2. Selective LocalStorage (Only if small enough, < 100KB)
    if (serialized.length < 100000) {
      localStorage.setItem(PREFIX + cacheKey, serialized);
    } else {
      // If too big, remove from localStorage to free up space
      localStorage.removeItem(PREFIX + cacheKey);
    }

    if (key.startsWith('db_')) {
      const dbKey = key.slice(3);
      window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: [dbKey] } }));
    }
  } catch (e) {
    console.warn('[Cache] store failed:', e.message);
  }
}

async function read(key, ttl) {
  if (typeof window === 'undefined') return null;
  try {
    const cacheKey = getCacheKey(key);
    
    // 1. Try LocalStorage (Fastest)
    let raw = localStorage.getItem(PREFIX + cacheKey);
    let entry;
    
    if (raw) {
      entry = JSON.parse(raw);
    } else {
      // 2. Fallback to IndexedDB (High capacity)
      entry = await idbGet(key);
    }

    if (!entry) return null;
    const { v, t, s } = entry;
    const isStale = Date.now() - t > ttl;
    return { stale: isStale, value: v, serverTs: s || 0 };
  } catch (e) { 
    console.warn('[Cache] read failed:', e.message);
    return null; 
  }
}


/** Get current user — from cache (instant) or /api/auth (fresh) */
export async function getCachedUser() {
  const cached = await read('user', USER_TTL);
  if (cached && !cached.stale) return cached.value;

  // Return stale immediately, refresh in background
  const promise = fetchWithRetry('/api/auth', { cache: 'no-store', timeout: 5000 })
    .then(async (data) => {
      if (data.ok && data.user) {
        await store('user', data.user);
        if (data.initialData) await hydrateCache(data.initialData);
        return data.user;
      }
      return null;
    })
    .catch(e => {
      console.warn('[Cache] getCachedUser background refresh failed:', e.message);
      return null;
    });

  if (cached?.value) {
    promise.catch(() => {}); // fire-and-forget background refresh
    return cached.value;     // return stale instantly
  }
  return promise; // no cache at all — must wait
}

/** Invalidate user cache (call on logout or role change) */
export function invalidateUser() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(PREFIX + 'user'); } catch {}
}

/**
 * Get a DB value — from cache (instant) or /api/db (fresh).
 * Uses stale-while-revalidate: returns cached value immediately,
 * fetches fresh in background.
 */
export async function getCachedDB(key, ttl = DB_TTL) {
  const cached = await read('db_' + key, ttl);
  if (cached && !cached.stale) return cached.value;

  const promise = fetchWithRetry('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'get', key }] }),
    timeout: 7000
  })
    .then(async (r) => {
      const ct = r.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) return null;
      const data = await r.json();
      const value = data.results?.[0]?.value ?? null;
      const serverTs = data.results?.[0]?.updatedAt ?? 0;
      await store('db_' + key, value, serverTs);
      return value;
    })
    .catch(e => {
      console.warn(`[Cache] getCachedDB background refresh failed for ${key}:`, e.message);
      return cached?.value ?? null;
    });

  if (cached?.value !== undefined) {
    return cached.value; // return stale instantly
  }

  // Check for pending request
  if (pendingRequests.has('db_' + key)) {
    return pendingRequests.get('db_' + key);
  }

  return promise;
}

/**
 * Fetch multiple DB keys in one request — partial caching with SWR.
 * Returns {key: value} immediately from cache, fetches missing/stale in background.
 */
export async function getCachedDBMulti(keys, ttl = DB_TTL) {
  const result = {};
  const staleKeys = [];
  const missingKeys = [];

  for (const key of keys) {
    const cached = await read('db_' + key, ttl);
    if (!cached) {
      missingKeys.push(key);
    } else {
      result[key] = cached.value;
      if (cached.stale) staleKeys.push(key);
    }
  }

  // Keys with no cache at all — must fetch synchronously
  const fetchKeys = [...missingKeys, ...staleKeys];

  if (fetchKeys.length === 0) return result;

  const fetchPromise = fetchWithRetry('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: fetchKeys.map(k => ({ type: 'get', key: k })) }),
    timeout: 30000
  })
    .then(async (r) => {
      const ct = r.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) return {};
      const data = await r.json();
      const fresh = {};
      await Promise.all(fetchKeys.map(async (key, i) => {
        const value = data.results?.[i]?.value ?? null;
        const serverTs = data.results?.[i]?.updatedAt ?? 0;
        fresh[key] = value;
        await store('db_' + key, value, serverTs);
      }));
      return fresh;
    })
    .catch(e => {
      console.warn('[Cache] getCachedDBMulti background refresh failed:', e.message);
      return {};
    })
    .finally(() => {
      fetchKeys.forEach(k => pendingRequests.delete('db_' + k));
    });

  // Register pending requests
  fetchKeys.forEach(k => pendingRequests.set('db_' + k, fetchPromise));

  if (missingKeys.length > 0) {
    // Wait only for truly missing keys
    const fresh = await fetchPromise;
    return { ...result, ...fresh };
  }

  // All keys had stale cache — return stale instantly, refresh in background
  fetchPromise.catch(() => {});
  return result;
}

/** Invalidate a cached DB key (call after write) */
export function invalidateDB(key) {
  if (typeof window === 'undefined') return;
  try { 
    const cacheKey = getCacheKey('db_' + key);
    localStorage.removeItem(PREFIX + cacheKey); 
    idbDelete('db_' + key).catch(() => {});
    idbDelete(key).catch(() => {}); // Also delete the raw key just in case
  } catch {}
}

/** Invalidate ALL cached DB keys */
export function invalidateAllDB() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX + 'db_'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

/** Clear EVERYTHING in the cache (user + all DB keys) */
export function clearAllCache() {
  if (typeof window === 'undefined') return;
  try {
    // 1. Clear LocalStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
    
    localStorage.removeItem('paav_impersonate_id');
    localStorage.removeItem('paav_last_tenant');
    
    // 2. Clear IndexedDB (KV store)
    idbClearKV().catch(() => {});

    // 3. Optional: Clear session-specific storage
    localStorage.removeItem('paav_impersonate_id');
    localStorage.removeItem('paav_last_tenant');
  } catch {}
}

let prefetchQueue = new Set();
let prefetchTimer = null;

/** Warm up the cache for common keys — call this early (e.g. from layout) */
export function prefetchKeys(keys) {
  if (typeof window === 'undefined') return;
  
  // Use a small delay and requestIdleCallback to avoid blocking the main thread
  keys.forEach(k => prefetchQueue.add(k));

  if (prefetchTimer) return;
  const run = async () => {
    prefetchTimer = null;
    const currentQueue = Array.from(prefetchQueue);
    prefetchQueue = new Set();
    if (currentQueue.length === 0) return;
    const missing = currentQueue.filter(k => {
      try { return !localStorage.getItem(PREFIX + 'db_' + k); } catch { return true; }
    });
    if (missing.length === 0) return;
    const keysToFetch = missing.filter(k => !pendingRequests.has('db_' + k));
    if (keysToFetch.length === 0) return;
    const fetchPromise = (async () => {
      try {
        const res = await fetchWithRetry('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: keysToFetch.map(k => ({ type: 'get', key: k })) }),
          timeout: 10000
        });
        if (!res.ok) return;
        const data = await res.json();
        data.results?.forEach((r, idx) => {
          if (r?.value !== undefined) {
            store('db_' + keysToFetch[idx], r.value, r.updatedAt);
          }
        });
      } catch {}
    })();
    keysToFetch.forEach(k => pendingRequests.set('db_' + k, fetchPromise));
    await fetchPromise;
    keysToFetch.forEach(k => pendingRequests.delete('db_' + k));
  };

  if (window.requestIdleCallback) {
    prefetchTimer = window.requestIdleCallback(run, { timeout: 1000 });
  } else {
    prefetchTimer = setTimeout(run, 200);
  }
}


/**
 * Manually inject data into cache (e.g. from login response)
 */
export async function hydrateCache(data) {
  if (typeof window === 'undefined' || !data) return;
  for (const [key, value] of Object.entries(data)) {
    // Handle both raw values and {v, s} objects
    if (value && typeof value === 'object' && 'v' in value) {
      await store(key, value.v, value.s || 0);
    } else {
      await store(key, value, Date.now());
    }
  }
}

/**
 * Return current cache state for multiple keys (for sync engine)
 */
export async function getLocalTimestamps(keys) {
  const map = {};
  for (const k of keys) {
    const cached = await read('db_' + k, 1000000000);
    map[k] = cached?.serverTs || 0;
  }
  return map;
}

/**
 * Update a DB key with optimistic local storage + background sync outbox
 */
export async function mutateDB(key, value, url = '/api/db', body = null) {
  // 1. Optimistic Update (Local Cache)
  if (typeof window !== 'undefined') {
    await store(`db_${key}`, value, Date.now());
  }

  // 2. Queue for background sync
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const impId = localStorage.getItem('paav_impersonate_id');
    if (impId) headers['x-tenant-id'] = impId;
  }

  const action = {
    url,
    method: 'POST',
    headers,
    body: body || { requests: [{ type: 'set', key, value }] }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(action.body)
    });
    if (!res.ok) {
      if (res.status === 413) throw new Error('Payload Too Large: The image you uploaded is too big.');
      throw new Error(`Network response not ok (${res.status})`);
    }
  } catch (e) {
    if (e.message.includes('Payload Too Large')) throw e; // Rethrow fatal errors to the caller
    console.warn(`[Cache] Mutate offline, queued in outbox: ${key}`);
    await addToOutbox(action);
  }
}

/**
 * Update a DB key locally only (for custom sync implementations like grades)
 */
export async function updateLocalDBCache(key, value, serverTs = Math.floor(Date.now() / 1000)) {
  if (typeof window !== 'undefined') {
    await store(`db_${key}`, value, serverTs);
  }
}
