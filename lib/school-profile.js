'use client';
/**
 * lib/school-profile.js
 * Reads the school profile directly from localStorage — always fresh after save().
 * Falls back to a network fetch if the cache is empty (first load).
 */

const CACHE_KEY = 'paav_cache_db_paav_school_profile';

export const DEFAULT_SCHOOL_PROFILE = {
  name: 'SCHOOL PORTAL',
  motto: 'Quality Education for All',
  logo: '/ev-brand-v3.png',
  address: 'Nairobi, Kenya',
  phone: '0700 000 000',
  email: 'info@school.com',
  website: '',
  curriculum: 'CBC'
};

/** Synchronous read from localStorage — returns null if not found. */
export function readSchoolProfile(tenantOverride = null) {
  if (typeof window === 'undefined') return null;
  try {
    let tid = tenantOverride;
    
    if (!tid) {
      const rawUser = localStorage.getItem('paav_cache_user');
      let user = null;
      try { if(rawUser) user = JSON.parse(rawUser).v; } catch(e){}

      // 1. Check for impersonation ONLY if the user is a super-admin
      const imp = localStorage.getItem('paav_impersonate_id');
      if (imp && user?.role === 'super-admin') {
        tid = imp;
      } else {
        // 2. Fallback to session user
        tid = user?.tenant_id || user?.tenantId || 'platform-master';
      }
    }
    
    const cacheKey = `paav_cache_${tid}_db_paav_school_profile`;
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const { v } = JSON.parse(raw);
    const p = typeof v === 'string' ? JSON.parse(v) : v;
    
    return { ...DEFAULT_SCHOOL_PROFILE, ...p, tenantId: tid };
  } catch { return null; }
}

/** Write a profile object into the localStorage cache (called by save()). */
export function writeSchoolProfileCache(profile) {
  if (typeof window === 'undefined') return;
  try {
    const rawUser = localStorage.getItem('paav_cache_user');
    let tid = 'platform-master';
    if (rawUser) {
      const { v: user } = JSON.parse(rawUser);
      tid = user?.tenant_id || user?.tenantId || 'platform-master';
    }

    const stamp = Date.now();
    const cacheKey = `paav_cache_${tid}_db_paav_school_profile`;
    localStorage.setItem(cacheKey, JSON.stringify({ v: profile, t: stamp, s: stamp }));
    
    // Also notify listeners
    window.dispatchEvent(new CustomEvent('paav:sync', { detail: { changed: ['paav_school_profile'] } }));
  } catch {}
}

/**
 * React hook — returns the school profile and re-reads it when the
 * admin saves changes (listens for the 'paav:sync' event).
 */
import { useState, useEffect } from 'react';

export function useSchoolProfile(defaults = {}) {
  const [profile, setProfile] = useState(() => {
    const cached = readSchoolProfile();
    return cached ? { ...defaults, ...cached } : defaults;
  });

  useEffect(() => {
    // Load on mount (in case SSR missed it)
    const cached = readSchoolProfile();
    if (cached) setProfile(prev => ({ ...prev, ...cached }));

    // Re-read immediately whenever admin saves branding
    const onSync = (e) => {
      if (e.detail?.changed?.includes('paav_school_profile')) {
        const fresh = readSchoolProfile();
        if (fresh) setProfile(prev => ({ ...prev, ...fresh }));
      }
    };
    window.addEventListener('paav:sync', onSync);
    return () => window.removeEventListener('paav:sync', onSync);
  }, []);

  return profile;
}
