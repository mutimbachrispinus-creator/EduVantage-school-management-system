'use client';
/**
 * app/profile/page.js — Learner & Staff Profile Viewer
 *
 * Tabs: My Profile | Password | Staff Directory | Learner Lookup | Bulk Enroll
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGrades, getDefaultSubjects, calcLearnerPoints, gInfo } from '@/lib/cbe';
import { useProfile } from '@/app/PortalShell';

const M = '#8B1A1A', ML = '#FDF2F2';
const PROFILE_ROLES = ['admin', 'teacher', 'jss_teacher', 'senior_teacher', 'staff', 'parent', 'super-admin'];
const PEOPLE_DIRECTORY_ROLES = ['admin', 'super-admin'];
const LEARNER_LOOKUP_ROLES = ['admin', 'teacher', 'jss_teacher', 'senior_teacher'];
const MY_LEARNERS_ROLES = ['parent', 'teacher', 'staff', 'admin', 'super-admin', 'jss_teacher', 'senior_teacher'];
const PREDICTOR_ROLES = ['parent', 'teacher', 'staff', 'admin', 'super-admin', 'jss_teacher', 'senior_teacher'];
const BULK_ENROLL_ROLES = ['admin', 'super-admin'];

async function safeJson(response, fallback = {}) {
  if (!response) return fallback;
  const text = await response.text();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`Server response was not valid JSON (${response.status}): ${preview || 'empty response'}`);
  }
}

function createEmptyBulkRow() {
  return {
    adm: '', name: '', grade: '', stream: '', gender: '', dob: '', parent: '', phone: '',
    address: '', medical: '', blood: '', father: '', mother: '', transport: '', parentEmail: ''
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(v => String(v || '').trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some(v => String(v || '').trim())) rows.push(row);
  return rows;
}

function cleanHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isHeaderLike(row) {
  const joined = row.map(cleanHeader).join(' ');
  const signals = ['adm', 'admission', 'name', 'learner', 'student', 'grade', 'class', 'gender', 'sex', 'parent', 'guardian', 'phone', 'dob', 'birth'];
  return signals.filter(s => joined.includes(s)).length >= 2;
}

function isDateLike(value) {
  const v = String(value || '').trim();
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(v);
}

function isPhoneLike(value) {
  const v = String(value || '').replace(/[\s()-]/g, '');
  return /^(\+?254|0)?[17]\d{8}$/.test(v);
}

function isGenderLike(value) {
  return /^(m|f|male|female|boy|girl)$/i.test(String(value || '').trim());
}

function isGradeLike(value) {
  const v = String(value || '').trim();
  return /^(grade|class|form|year|pp|playgroup|baby|middle|pre|reception|nursery)/i.test(v) || /^(g|c|y|f)?\s?\d{1,2}$/i.test(v);
}

function normalizeGender(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['m', 'male', 'boy'].includes(v)) return 'Male';
  if (['f', 'female', 'girl'].includes(v)) return 'Female';
  return '';
}

function normalizeTransport(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/bus|van|school/i.test(v)) return 'Bus';
  if (/private|car|taxi/i.test(v)) return 'Private';
  if (/walk|foot/i.test(v)) return 'Walk';
  return v;
}

function matchGradeName(value, grades, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback || '';
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const exact = grades.find(g => g.toUpperCase().replace(/[^A-Z0-9]/g, '') === compact);
  if (exact) return exact;
  const n = compact.match(/\d+/)?.[0];
  if (n) {
    const numeric = grades.find(g => g.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(n));
    if (numeric) return numeric;
  }
  return raw.toUpperCase();
}

const CSV_FIELDS = [
  { key: 'adm', fallback: 0, aliases: ['adm', 'adm no', 'adm number', 'admission', 'admission no', 'admission number', 'student no', 'student id', 'learner id', 'index no'] },
  { key: 'name', fallback: 1, aliases: ['name', 'full name', 'learner name', 'student name', 'pupil name'], block: ['parent', 'guardian', 'father', 'mother'] },
  { key: 'grade', fallback: 2, aliases: ['grade', 'class', 'level', 'year', 'form'] },
  { key: 'stream', fallback: 3, aliases: ['stream', 'house', 'branch', 'section'] },
  { key: 'gender', fallback: 4, aliases: ['gender', 'sex'] },
  { key: 'dob', fallback: 5, aliases: ['dob', 'date of birth', 'birth date', 'birth'] },
  { key: 'parent', fallback: 6, aliases: ['parent', 'parent name', 'guardian', 'guardian name', 'main parent'] },
  { key: 'phone', fallback: 7, aliases: ['phone', 'mobile', 'contact', 'telephone', 'tel', 'parent phone', 'guardian phone'] },
  { key: 'father', fallback: 8, aliases: ['father', 'father name', 'father s name'] },
  { key: 'mother', fallback: 9, aliases: ['mother', 'mother name', 'mother s name'] },
  { key: 'address', fallback: 10, aliases: ['address', 'physical address', 'residence', 'location'] },
  { key: 'medical', fallback: 11, aliases: ['medical', 'medical condition', 'health', 'allergy', 'allergies'] },
  { key: 'blood', fallback: 12, aliases: ['blood', 'blood group', 'blood type'] },
  { key: 'transport', fallback: 13, aliases: ['transport', 'transport means', 'route', 'bus'] },
  { key: 'parentEmail', fallback: 14, aliases: ['email', 'parent email', 'guardian email'] },
];

const ASSESS_LIST = [
  { id: 'op1', label: 'Opener' },
  { id: 'mt1', label: 'Mid-Term' },
  { id: 'et1', label: 'End-Term' }
];

const NATIONAL_SERIES = ['T1', 'T2', 'T3'].flatMap(term =>
  ASSESS_LIST.map(a => ({ term, assess: a.id, label: `${term} ${a.label}` }))
);

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : 0));
}

function examBand(score) {
  if (score >= 80) return { label: 'A / Excellent', color: 'var(--green)', bg: 'var(--green-bg)' };
  if (score >= 65) return { label: 'B / Strong', color: 'var(--blue)', bg: 'var(--blue-bg)' };
  if (score >= 50) return { label: 'C / Secure', color: 'var(--amber)', bg: 'var(--amber-bg)' };
  if (score >= 35) return { label: 'D / Watch', color: '#B45309', bg: '#FFF7ED' };
  return { label: 'E / Critical', color: 'var(--red)', bg: 'var(--red-bg)' };
}

function detectCsvColumns(rows) {
  const hasHeader = rows.length > 0 && isHeaderLike(rows[0]);
  const headers = hasHeader ? rows[0].map(cleanHeader) : [];
  const sampleRows = (hasHeader ? rows.slice(1) : rows).slice(0, 25);
  const used = new Set();
  const map = {};

  for (const field of CSV_FIELDS) {
    let best = { idx: field.fallback, score: field.fallback >= 0 ? 1 : 0 };
    headers.forEach((header, idx) => {
      if (!header || used.has(idx)) return;
      if (field.block?.some(b => header.includes(b))) return;
      let score = 0;
      for (const alias of field.aliases) {
        const cleanAlias = cleanHeader(alias);
        if (header === cleanAlias) score = Math.max(score, 100);
        else if (header.includes(cleanAlias) || cleanAlias.includes(header)) score = Math.max(score, 72);
      }
      if (score > best.score) best = { idx, score };
    });

    if (best.score < 40) {
      sampleRows.forEach(row => {
        row.forEach((value, idx) => {
          if (used.has(idx)) return;
          let score = 0;
          if (field.key === 'dob' && isDateLike(value)) score = 55;
          if (field.key === 'phone' && isPhoneLike(value)) score = 55;
          if (field.key === 'gender' && isGenderLike(value)) score = 55;
          if (field.key === 'grade' && isGradeLike(value)) score = 45;
          if (field.key === 'adm' && /^[a-z0-9/-]{2,}$/i.test(String(value || '').trim()) && !isPhoneLike(value)) score = 20;
          if (score > best.score) best = { idx, score };
        });
      });
    }

    map[field.key] = best.idx;
    if (best.idx >= 0 && best.score >= 40) used.add(best.idx);
  }

  return { hasHeader, map, dataRows: hasHeader ? rows.slice(1) : rows };
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile: school } = useProfile() || {};
  const ALL_GRADES = useMemo(() => getAllGrades(school?.curriculum || 'CBC', school), [school]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'me';
    }
    return 'me';
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [allProfiles, setAllProfiles] = useState({});
  const [allStaff, setAllStaff] = useState([]);
  const [allLearners, setAllLearners] = useState([]);
  const [allMarks, setAllMarks] = useState({});
  const [gradCfg, setGradCfg] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);

  // Predictor State
  const [predMode, setPredMode] = useState('national');
  const [targetExam, setTargetExam] = useState('National Exam');
  const [selPredGrade, setSelPredGrade] = useState('');
  const [selPredTerm, setSelPredTerm] = useState('T1');
  const [selPredAssess, setSelPredAssess] = useState('mt1');

  // Own profile
  const [profileData, setProfileData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null); // base64

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  // Staff & Learner Lookup
  const [staffQ, setStaffQ] = useState('');
  const [learnerQ, setLearnerQ] = useState('');
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Bulk Enroll
  const [bulkGrade, setBulkGrade] = useState(ALL_GRADES[0]);
  const [bulkRows, setBulkRows] = useState([createEmptyBulkRow()]);
  const [csvInfo, setCsvInfo] = useState(null);

  // My Learners (Parents)
  const myLearners = useMemo(() => {
    if (!user) return [];
    const phone = String(user.phone || '').replace(/\s+/g, '');
    const email = String(user.email || '').toLowerCase().trim();
    if (!phone && !email) return [];
    
    return allLearners.filter(l => {
      const lp = String(l.phone || '').replace(/\s+/g, '');
      const le = String(l.parentEmail || '').toLowerCase().trim();
      return (phone && lp.includes(phone)) || (email && le === email) || (l.parent?.toUpperCase() === user.name?.toUpperCase());
    });
  }, [allLearners, user]);

  const photoRef = useRef(null);

  useEffect(() => {
    if (ALL_GRADES.length > 0 && !ALL_GRADES.includes(bulkGrade)) setBulkGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, bulkGrade]);

  // Sync Bulk Enroll with existing learners for the selected grade
  useEffect(() => {
    if (tab === 'bulk' && bulkGrade && allLearners.length > 0) {
      const existing = allLearners.filter(l => l.grade === bulkGrade);
      if (existing.length > 0) {
        const rows = existing.map(l => {
          const extra = allProfiles[l.adm] || {};
          return {
            adm: l.adm,
            name: l.name,
            grade: l.grade,
            stream: l.stream || extra.stream || '',
            gender: l.gender || extra.gender || (l.sex === 'M' ? 'Male' : l.sex === 'F' ? 'Female' : ''),
            dob: l.dob || extra.dob || '',
            parent: l.parent || '',
            phone: l.phone || extra.phone || '',
            father: extra.father || '',
            mother: extra.mother || '',
            address: extra.address || '',
            medical: extra.medical || '',
            blood: extra.blood || '',
            transport: extra.transport || '',
            parentEmail: l.parentEmail || extra.parentEmail || ''
          };
        });
        setBulkRows([...rows, createEmptyBulkRow()]);
      } else {
        setBulkRows([createEmptyBulkRow()]);
      }
    }
  }, [tab, bulkGrade, allLearners, allProfiles]);

  const load = useCallback(async () => {
    try {
      const [authRes, dbRes] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [
            { type: 'get', key: 'paav6_staff' },
            { type: 'get', key: 'paav_profiles' },
            { type: 'get', key: 'paav6_marks' },
            { type: 'get', key: 'paav8_grad' }
          ]})
        })
      ]);
      const auth = await safeJson(authRes);
      if (!auth.ok) { router.push('/login'); return; }
      
      if (!PROFILE_ROLES.includes(auth.user?.role)) { router.push('/'); return; }
      
      setUser(auth.user);

      const db = await safeJson(dbRes);
      const staff = db.results[0]?.value || [];
      const profiles = db.results[1]?.value || {};
      const marks = db.results[2]?.value || {};
      const grad = db.results[3]?.value || null;

      setAllStaff(staff);
      setAllProfiles(profiles);
      setAllMarks(marks);
      setGradCfg(grad);

      const myStaff = staff.find(s => s.id === auth.user.id) || {};
      const myExtra = profiles[auth.user.id] || {};
      setProfileData({ ...myStaff, ...auth.user, ...myExtra });
      if (myStaff.avatar || myExtra.photo) setPhotoPreview(myStaff.avatar || myExtra.photo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selPredGrade && ALL_GRADES.length > 0) setSelPredGrade(ALL_GRADES[0]);
  }, [ALL_GRADES, selPredGrade]);

  const nationalForecast = useMemo(() => {
    if (!selPredGrade) return null;
    const learnersToForecast = user?.role === 'parent' ? myLearners : allLearners.filter(l => l.grade === selPredGrade);
    const subs = getDefaultSubjects(selPredGrade, school?.curriculum || 'CBC');
    
    const rows = learnersToForecast.map(l => {
      const series = NATIONAL_SERIES.map(point => {
        const scores = subs
          .map(subject => allMarks[`${point.term}:${selPredGrade}|${subject}|${point.assess}`]?.[l.adm])
          .filter(v => v !== undefined && v !== null && v !== '');
        if (!scores.length) return null;
        const avg = scores.reduce((sum, value) => sum + Number(value), 0) / scores.length;
        return { ...point, avg: Number(avg.toFixed(1)), entries: scores.length };
      }).filter(Boolean);

      const current = series.length ? series[series.length - 1].avg : 0;
      const baseline = series.length ? series[0].avg : 0;
      const momentum = series.length > 1 ? (current - baseline) / (series.length - 1) : 0;
      const latestPoint = series.length ? series[series.length - 1] : null;
      const completion = subs.length ? Math.round(((latestPoint?.entries || 0) / subs.length) * 100) : 0;
      const forecast = clamp(current + (momentum * Math.max(1, 9 - series.length)) + (completion >= 90 ? 1.5 : 0));
      const band = examBand(forecast);
      return {
        ...l,
        series,
        current,
        momentum: Number(momentum.toFixed(1)),
        forecast: Number(forecast.toFixed(1)),
        band,
        confidence: Math.min(95, 35 + series.length * 7 + (completion >= 80 ? 10 : 0))
      };
    }).filter(r => r.series.length > 0).sort((a, b) => b.forecast - a.forecast);

    const avgForecast = rows.length ? rows.reduce((sum, r) => sum + r.forecast, 0) / rows.length : 0;
    return { rows, avgForecast: Number(avgForecast.toFixed(1)), candidates: learnersToForecast.length };
  }, [allLearners, allMarks, selPredGrade, user, myLearners, school?.curriculum]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else       { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(b64);
        setNewPhoto(b64);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);

    try {
      // 1. Prepare updated profiles using local state (Optimistic)
      const profiles = { ...allProfiles };
      const finalPhoto = newPhoto || photoPreview || '';
      profiles[user.id] = { ...profiles[user.id], ...profileData, photo: finalPhoto };

      // 2. Immediate feedback for "Saved" state
      setAllProfiles(profiles);
      
      const newStaffList = [...allStaff];
      const idx = newStaffList.findIndex(s => s.id === user.id);
      if (idx >= 0) {
        newStaffList[idx] = { ...newStaffList[idx], name: profileData.name, phone: profileData.phone, avatar: finalPhoto };
        setAllStaff(newStaffList);
      }

      // 3. Sync with minimal UX delay (so user sees "Saving..." even if network is instant)
      const start = Date.now();
      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav_profiles', value: profiles },
          { type: 'updateStaffProfile', id: user.id, name: profileData.name, phone: profileData.phone, avatar: finalPhoto }
        ] })
      });
      
      const out = await safeJson(res);
      if (!res.ok) throw new Error(out.error || 'API request failed');
      if (out.results?.some(r => r.error)) throw new Error(out.results.find(r => r.error).error);
      
      // Ensure "Saving..." is visible for at least 600ms for psychological "work" confirmation
      const elapsed = Date.now() - start;
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

      setSaved(true); 
      setTimeout(() => setSaved(false), 5000);
    } catch (e) { 
      alert('Error saving profile: ' + e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'err', text: 'New passwords do not match' }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ type: 'err', text: 'Password must be at least 6 characters' }); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', current: pwForm.current, next: pwForm.next })
      });
      const data = await safeJson(res);
      if (data.ok) {
        setPwMsg({ type: 'ok', text: '✅ Password changed successfully!' });
        setPwForm({ current: '', next: '', confirm: '' });
      } else setPwMsg({ type: 'err', text: data.error || 'Failed to change password' });
    } catch (e) { setPwMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function saveBulkLearners() {
    const validRows = bulkRows.filter(r => r.adm && r.name);
    if (!validRows.length) { alert('Please fill in at least Admission No and Name for one row'); return; }

    setBusy(true);
    try {
      // 1. Fetch current data to merge (to avoid overwriting other tenants/data if keys were shared, though they are isolated)
      const dbRes = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'get', key: 'paav6_learners' },
          { type: 'get', key: 'paav_profiles' }
        ]})
      });
      const db = await safeJson(dbRes);
      const currentLearners = db.results[0]?.value || [];
      const currentProfiles = db.results[1]?.value || {};

      const logs = [];
      for (const r of validRows) {
        const finalGender = normalizeGender(r.gender);
        const lData = {
          adm: String(r.adm).trim(),
          name: String(r.name).trim().toUpperCase(),
          grade: r.grade || bulkGrade,
          stream: r.stream || '',
          sex: finalGender === 'Male' ? 'M' : finalGender === 'Female' ? 'F' : '',
          gender: finalGender,
          dob: r.dob,
          parent: r.parent,
          phone: r.phone,
          parentEmail: r.parentEmail || ''
        };
        const idx = currentLearners.findIndex(l => String(l.adm) === String(r.adm));
        if (idx >= 0) currentLearners[idx] = { ...currentLearners[idx], ...lData };
        else currentLearners.push(lData);

        currentProfiles[r.adm] = {
          ...currentProfiles[r.adm],
          address: r.address, medical: r.medical, blood: r.blood,
          father: r.father, mother: r.mother, transport: r.transport,
          gender: finalGender, parentEmail: r.parentEmail || '', stream: r.stream || ''
        };
        logs.push(`Enrolled ${r.name} (${r.adm})`);
      }

      const res = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [
          { type: 'set', key: 'paav6_learners', value: currentLearners },
          { type: 'set', key: 'paav_profiles', value: currentProfiles },
          { type: 'audit', action: 'BULK_ENROLL', details: logs.join(', ') }
        ]})
      });

      if (!res.ok) throw new Error('Failed to save to database');
      
      // CRITICAL: Invalidate cache so other tabs see the new data
      const { invalidateDB } = await import('@/lib/client-cache');
      invalidateDB(['paav6_learners', 'paav_profiles']);

      alert(`✅ Success! ${validRows.length} learners have been enrolled and synchronized with the institutional database.`);
      setBulkRows([{ ...createEmptyBulkRow(), grade: bulkGrade }]);
      setCsvInfo(null);
      setAllLearners(currentLearners);
      setAllProfiles(currentProfiles);
    } catch(e) { 
      alert('Sync Error: ' + e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  function updateBulkRow(index, field, value) {
    setBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function downloadBulkTemplate() {
    const headers = [
      'Admission No', 'Full Name', 'Grade', 'Stream', 'Gender', 'Date of Birth',
      'Parent/Guardian', 'Phone', 'Father', 'Mother', 'Address', 'Medical', 'Blood Group', 'Transport', 'Parent Email'
    ];
    
    const validRows = bulkRows.filter(r => r.adm && r.name);
    
    // If there are existing learners in this grade, export their actual data. Otherwise, provide a template.
    const exportData = validRows.length > 0 ? validRows.map(r => [
      `"${r.adm || ''}"`, `"${r.name || ''}"`, `"${r.grade || bulkGrade}"`, `"${r.stream || ''}"`, `"${r.gender || ''}"`, `"${r.dob || ''}"`,
      `"${r.parent || ''}"`, `"${r.phone || ''}"`, `"${r.father || ''}"`, `"${r.mother || ''}"`, `"${r.address || ''}"`, `"${r.medical || ''}"`, `"${r.blood || ''}"`, `"${r.transport || ''}"`, `"${r.parentEmail || ''}"`
    ]) : [
      ['1001', 'JOHN DOE', bulkGrade || ALL_GRADES[0] || 'GRADE 1', 'North', 'Male', '2016-05-20', 'PETER DOE', '0700111222', 'PETER DOE', 'JANE DOE', 'Nairobi West', 'None', 'O+', 'Bus', 'parents@example.com'],
      ['1002', 'MARY AMANI', bulkGrade || ALL_GRADES[0] || 'GRADE 1', 'South', 'Female', '2017-02-14', 'SARAH AMANI', '0722333444', 'JAMES AMANI', 'SARAH AMANI', 'Mombasa', 'Asthma', 'A-', 'Walk', 'sarah@example.com']
    ];
    
    const csvContent = headers.join(',') + '\n' + exportData.map(r => r.join(',')).join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduvantage-export-${(bulkGrade || 'learners').toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleBulkCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsedRows = parseCsv(String(evt.target.result || ''));
        if (!parsedRows.length) throw new Error('The CSV file is empty.');

        const { hasHeader, map, dataRows } = detectCsvColumns(parsedRows);
        const importedRows = dataRows.map(row => {
          const pick = key => {
            const idx = map[key];
            return idx >= 0 ? String(row[idx] || '').trim() : '';
          };
          const grade = matchGradeName(pick('grade'), ALL_GRADES, bulkGrade);
          return {
            ...createEmptyBulkRow(),
            adm: pick('adm'),
            name: pick('name').toUpperCase(),
            grade,
            stream: pick('stream').toUpperCase(),
            gender: normalizeGender(pick('gender')),
            dob: pick('dob'),
            parent: pick('parent').toUpperCase(),
            phone: pick('phone'),
            father: pick('father').toUpperCase(),
            mother: pick('mother').toUpperCase(),
            address: pick('address'),
            medical: pick('medical'),
            blood: pick('blood').toUpperCase(),
            transport: normalizeTransport(pick('transport')),
            parentEmail: pick('parentEmail')
          };
        }).filter(r => r.adm || r.name);

        if (!importedRows.length) throw new Error('No learner rows could be detected. Confirm the file has admission numbers and learner names.');

        const current = bulkRows.filter(r => r.adm || r.name);
        const merged = [...current];
        let updated = 0;
        importedRows.forEach(row => {
          const idx = merged.findIndex(existing => String(existing.adm || '').trim() && String(existing.adm).trim() === String(row.adm).trim());
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...row };
            updated++;
          } else {
            merged.push(row);
          }
        });

        setBulkRows([...merged, { ...createEmptyBulkRow(), grade: bulkGrade }]);
        setCsvInfo({
          text: `Detected ${importedRows.length} learner rows${hasHeader ? ' with headers' : ' using positional columns'}. ${updated} existing grid row${updated === 1 ? '' : 's'} updated.`,
          fields: Object.entries(map)
            .filter(([, idx]) => idx >= 0)
            .map(([key, idx]) => `${key}: column ${idx + 1}`)
            .join(' · ')
        });
      } catch (err) {
        alert('CSV import failed: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  const handleTabChange = useCallback(async (newTab) => {
    setTab(newTab);
    setSelectedLearner(null);
    setSelectedStaff(null);

    if ((newTab === 'learner' || newTab === 'bulk' || newTab === 'my-learners') && allLearners.length === 0) {
      setTabLoading(true);
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [
            { type: 'get', key: 'paav6_learners' },
            { type: 'get', key: 'paav_profiles' }
          ] })
        });
        const data = await safeJson(res);
        setAllLearners(data.results[0]?.value || []);
        if (data.results[1]?.value) setAllProfiles(data.results[1]?.value);
      } catch (e) {
        console.error('Failed to load learners:', e);
      } finally {
        setTabLoading(false);
      }
    }
  }, [allLearners.length]);

  const filteredStaff = allStaff.filter(s => !staffQ || s.name?.toLowerCase().includes(staffQ.toLowerCase()) || s.role?.toLowerCase().includes(staffQ.toLowerCase()));
  const filteredLearners = learnerQ.length >= 2 ? allLearners.filter(l => l.name?.toLowerCase().includes(learnerQ.toLowerCase()) || l.adm?.toLowerCase().includes(learnerQ.toLowerCase())) : [];

  useEffect(() => {
    if ((tab === 'learner' || tab === 'bulk' || tab === 'my-learners') && allLearners.length === 0 && user) {
      handleTabChange(tab);
    }
  }, [tab, allLearners.length, user, handleTabChange]);

  useEffect(() => {
    if (!user) return;
    const canViewPeople = PEOPLE_DIRECTORY_ROLES.includes(user.role);
    const canBulkEnroll = BULK_ENROLL_ROLES.includes(user.role);
    const canLookupLearners = LEARNER_LOOKUP_ROLES.includes(user.role);

    if ((tab === 'staff' && !canViewPeople) || (tab === 'bulk' && !canBulkEnroll) || (tab === 'learner' && !canLookupLearners) || (tab === 'my-learners' && !MY_LEARNERS_ROLES.includes(user.role))) {
      setTab('me');
      setSelectedStaff(null);
      setSelectedLearner(null);
    }
  }, [tab, user]);

  if (loading || !user) return <div className="page on"><p style={{ padding: 30 }}>Loading profile…</p></div>;

  const TABS = [
    { key: 'me', label: '👤 My Profile' },
    { key: 'pw', label: '🔒 Password' },
    ...(MY_LEARNERS_ROLES.includes(user?.role) ? [{ key: 'my-learners', label: '👨‍👩‍👧 My Learners' }] : []),
    ...(PREDICTOR_ROLES.includes(user?.role) ? [{ key: 'predictor', label: '🎯 Predictor' }] : []),
    ...(PEOPLE_DIRECTORY_ROLES.includes(user?.role) ? [{ key: 'staff', label: '👥 People Directory' }] : []),
    ...(LEARNER_LOOKUP_ROLES.includes(user?.role) ? [{ key: 'learner', label: '🎓 Learner Lookup' }] : []),
    ...(BULK_ENROLL_ROLES.includes(user?.role) ? [{ key: 'bulk', label: '📥 Bulk Enroll' }] : []),
  ];

  return (
    <div className="page on">
      <div className="page-hdr no-print">
        <div>
          <h2>👤 Profiles & Directory</h2>
          <p>Manage your profile and view people in your school community</p>
        </div>
        {(tab === 'learner' && selectedLearner || tab === 'staff' && selectedStaff) && (
          <div className="page-hdr-acts">
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print Profile</button>
          </div>
        )}
      </div>

      <div className="profile-tabs no-print">
        {TABS.map(t => (
          <button key={t.key} className={`profile-tab-btn${tab === t.key ? ' on' : ''}`} onClick={() => handleTabChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── My Profile ── */}
      {tab === 'me' && profileData && (
        <form onSubmit={saveProfile}>
          <div className="sg sg2">
            {/* Avatar panel */}
            <div className="panel">
              <div className="panel-hdr"><h3>Profile Photo</h3></div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="photo-upload-wrapper" style={{ width: 100, height: 100 }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" style={{ width: 100, height: 100, borderRadius: 18, objectFit: 'cover', border: `3px solid ${M}` }} />
                  ) : (
                    <div style={{ width: 100, height: 100, borderRadius: 18, background: `linear-gradient(135deg, ${M}, #6B1212)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#fff', fontWeight: 800 }}>
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <button type="button" className="photo-upload-btn" onClick={() => photoRef.current?.click()} title="Upload photo">📷</button>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{profileData.name}</div>
                  <span className="badge bg-purple" style={{ marginTop: 4 }}>{profileData.role}</span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoRef.current?.click()}>📷 Change Photo</button>
                <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>Photo is saved to your device file system — no URL needed</p>
              </div>
            </div>

            {/* Info panel */}
            <div className="panel">
              <div className="panel-hdr"><h3>Personal & Contact Details</h3></div>
              <div className="panel-body">
                <div className="field-row">
                  <div className="field"><label>Full Name</label><input value={profileData.name || ''} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="field"><label>Email</label><input type="email" value={profileData.email || ''} onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Phone</label><input value={profileData.phone || ''} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="field"><label>ID Number</label><input value={profileData.id_num || ''} onChange={e => setProfileData(p => ({ ...p, id_num: e.target.value }))} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Gender</label>
                    <select value={profileData.gender || ''} onChange={e => setProfileData(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select...</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="field"><label>Tribe</label><input value={profileData.tribe || ''} onChange={e => setProfileData(p => ({ ...p, tribe: e.target.value }))} /></div>
                </div>
                <div className="field"><label>Physical Address</label><input value={profileData.address || ''} onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="field-row">
                  <div className="field"><label>Blood Group</label><input value={profileData.blood || ''} onChange={e => setProfileData(p => ({ ...p, blood: e.target.value }))} /></div>
                  <div className="field"><label>Medical Conditions</label><input value={profileData.medical || ''} onChange={e => setProfileData(p => ({ ...p, medical: e.target.value }))} placeholder="e.g. Asthma, None" /></div>
                </div>
                
                <h4 style={{marginTop:16,marginBottom:8,color:M,fontSize:13}}>Emergency Contact / Next of Kin</h4>
                <div className="field-row">
                  <div className="field"><label>Name</label><input value={profileData.nok_name || ''} onChange={e => setProfileData(p => ({ ...p, nok_name: e.target.value }))} /></div>
                  <div className="field"><label>Phone</label><input value={profileData.nok_phone || ''} onChange={e => setProfileData(p => ({ ...p, nok_phone: e.target.value }))} /></div>
                </div>
                <div className="field"><label>ID Number</label><input value={profileData.nok_id || ''} onChange={e => setProfileData(p => ({ ...p, nok_id: e.target.value }))} /></div>

                <button type="submit" className="btn btn-maroon" style={{ width: '100%', marginTop: 8, justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} disabled={busy}>
                  {busy ? '⏳ Saving…' : saved ? '✅ Changes Saved!' : '💾 Save Profile'}
                </button>
                {saved && <div className="alert alert-ok show" style={{ marginTop: 12, animation: 'slideUp 0.3s ease-out' }}>✅ Success! Your profile details have been updated.</div>}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ── Change Password ── */}
      {tab === 'pw' && (
        <div className="panel no-print" style={{ maxWidth: 480 }}>
          <div className="panel-hdr"><h3>🔒 Change Password</h3></div>
          <div className="panel-body">
            <form onSubmit={changePassword}>
              <div className="field"><label>Current Password</label><input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required /></div>
              <div className="field"><label>New Password</label><input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} required minLength={6} /></div>
              <div className="field"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required /></div>
              {pwMsg.text && <div className={`alert ${pwMsg.type === 'ok' ? 'alert-ok' : 'alert-err'} show`}>{pwMsg.text}</div>}
              <button type="submit" className="btn btn-maroon" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Changing…' : '🔑 Change Password'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── People Directory ── */}
      {tab === 'staff' && !selectedStaff && (
        <div className="panel no-print">
          <div className="panel-hdr">
            <h3>👥 People Directory</h3>
            <input className="field" style={{ margin: 0, width: 220 }} placeholder="Search by name or role…" value={staffQ} onChange={e => setStaffQ(e.target.value)} />
          </div>
          <div className="panel-body">
            <div className="sg sg3">
              {filteredStaff.map(s => (
                <div key={s.id} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedStaff(s)}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${M}, #6B1212)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
                      {s.avatar ? (
                        <img src={s.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        s.name?.charAt(0) || '?'
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                      <span className="badge bg-purple" style={{ marginTop: 3 }}>{s.role}</span>
                      {s.subject && <div style={{ fontSize: 11.5, color: '#666', marginTop: 3 }}>📚 {s.subject}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>No staff found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── View People Profile ── */}
      {tab === 'staff' && selectedStaff && (() => {
        const pExtra = allProfiles[selectedStaff.id] || {};
        const photo = pExtra.photo || selectedStaff.avatar || '';
        return (
          <div>
            <button className="btn btn-ghost btn-sm no-print" style={{ marginBottom: 14 }} onClick={() => setSelectedStaff(null)}>← Back to Directory</button>
            <div className="print-only" style={{ display:'none' }}>EduVantage - People Profile</div>
            <div className="sg sg2">
              <div className="panel" style={{ background: `linear-gradient(135deg, ${M}, #6B1212)`, color: '#fff' }}>
                <div className="panel-body" style={{ textAlign:'center' }}>
                  {photo ? (
                    <img src={photo} alt="" style={{ width:100, height:100, borderRadius:20, objectFit:'cover', border:'3px solid rgba(255,255,255,.3)', marginBottom:12 }} />
                  ) : <div style={{ fontSize: 50, marginBottom: 8 }}>👔</div>}
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 800 }}>{selectedStaff.name}</div>
                  <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>Role: {selectedStaff.role}</div>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, background:'rgba(0,0,0,.15)', padding:12, borderRadius:12 }}>
                    <div style={{ display: 'flex', justifyContent:'space-between', fontSize: 12 }}><span style={{opacity:.7}}>Phone</span><strong>{pExtra.phone || selectedStaff.phone || '—'}</strong></div>
                    <div style={{ display: 'flex', justifyContent:'space-between', fontSize: 12 }}><span style={{opacity:.7}}>Email</span><strong>{pExtra.email || selectedStaff.email || '—'}</strong></div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-hdr"><h3>Extended Details</h3></div>
                <div className="panel-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 20px' }}>
                  <div className="profile-field"><div className="profile-label">ID Number</div><div style={{fontWeight:600}}>{pExtra.id_num || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Gender</div><div style={{fontWeight:600}}>{pExtra.gender || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Tribe</div><div style={{fontWeight:600}}>{pExtra.tribe || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Blood Group</div><div style={{fontWeight:600}}>{pExtra.blood || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Address</div><div style={{fontWeight:600}}>{pExtra.address || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Medical Conditions</div><div style={{fontWeight:600, color:'var(--red)'}}>{pExtra.medical || '—'}</div></div>
                  
                  <div style={{ gridColumn:'1/-1', borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4, fontSize:13, fontWeight:700, color:M }}>Emergency Contact / Next of Kin</div>
                  <div className="profile-field"><div className="profile-label">Name</div><div style={{fontWeight:600}}>{pExtra.nok_name || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Phone</div><div style={{fontWeight:600}}>{pExtra.nok_phone || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">ID No.</div><div style={{fontWeight:600}}>{pExtra.nok_id || '—'}</div></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Predictor Tab ── */}
      {tab === 'predictor' && (
        <div className="predictor-view">
          <div className="panel no-print">
            <div className="panel-hdr">
              <div>
                <h3>🎯 Exam Performance Predictor</h3>
                <p style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Curriculum-aware forecasting based on termly trends.</p>
              </div>
              <div style={{display:'flex',gap:10}}>
                {user.role !== 'parent' && (
                  <select value={selPredGrade} onChange={e=>setSelPredGrade(e.target.value)} className="field" style={{margin:0, width:140}}>
                    {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                  </select>
                )}
                <select value={targetExam} onChange={e=>setTargetExam(e.target.value)} className="field" style={{margin:0, width:140}}>
                  <option>National Exam</option><option>KPSEA</option><option>KJSEA</option><option>KCSE</option><option>IGCSE</option>
                  <option>CDACC Finals</option><option>TVET Internal</option>
                </select>
              </div>
            </div>
            <div className="panel-body">
              {tabLoading ? <p>Loading data…</p> : (
                <div className="sg sg2">
                  <div className="stat-card" style={{borderLeft:`4px solid ${M}`}}>
                    <div className="sc-inner">
                      <div style={{flex:1}}>
                        <div className="sc-n" style={{color:M}}>{nationalForecast?.avgForecast || 0}%</div>
                        <div className="sc-l">Projected Mean</div>
                      </div>
                      <div style={{fontSize:24}}>📈</div>
                    </div>
                  </div>
                  <div className="stat-card" style={{borderLeft:`4px solid var(--gold)`}}>
                    <div className="sc-inner">
                      <div style={{flex:1}}>
                        <div className="sc-n" style={{color:'var(--gold)'}}>{nationalForecast?.rows?.length || 0}</div>
                        <div className="sc-l">Forecasted Learners</div>
                      </div>
                      <div style={{fontSize:24}}>🎯</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr">
              <h3>{targetExam} Readiness Forecast</h3>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Grade</th>
                    <th style={{textAlign:'center'}}>Current Avg</th>
                    <th style={{textAlign:'center'}}>Momentum</th>
                    <th style={{textAlign:'center'}}>Predicted</th>
                    <th>Band</th>
                    <th style={{textAlign:'center'}}>Confidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalForecast?.rows.map(row => (
                    <tr key={row.adm}>
                      <td>
                        <div style={{fontWeight:700}}>{row.name}</div>
                        <div style={{fontSize:10,color:'#999'}}>ADM: {row.adm}</div>
                      </td>
                      <td>{row.grade}</td>
                      <td style={{textAlign:'center', fontWeight:700}}>{row.current}%</td>
                      <td style={{textAlign:'center', color:row.momentum >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:800}}>
                        {row.momentum > 0 ? '+' : ''}{row.momentum}
                      </td>
                      <td style={{textAlign:'center', fontWeight:900, fontSize:15}}>{row.forecast}%</td>
                      <td><span className="badge" style={{background:row.band.bg, color:row.band.color}}>{row.band.label}</span></td>
                      <td style={{textAlign:'center'}}>{row.confidence}%</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => { setSelectedLearner(row); setTab('my-learners'); }}>🔍 Analyze</button></td>
                    </tr>
                  ))}
                  {(!nationalForecast || nationalForecast.rows.length === 0) && (
                    <tr><td colSpan={8} style={{textAlign:'center', padding:40, color:'#999'}}>No trend data available to generate a forecast yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── My Learners (Parent View) ── */}
      {tab === 'my-learners' && !selectedLearner && (
        <div className="panel no-print">
          <div className="panel-hdr">
            <h3>👨‍👩‍👧 My Learners</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Learners associated with your account</p>
          </div>
          <div className="panel-body">
            {tabLoading ? <p>Loading your learners…</p> : (
              <div className="sg sg3">
                {myLearners.map(l => (
                  <div key={l.adm} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push(`/learners/${encodeURIComponent(l.adm)}`)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${M}, #6B1212)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>
                        🎓
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{l.grade} · ADM: {l.adm}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {myLearners.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🔎</div>
                    <p>No learners found associated with your phone number or email.</p>
                    <p style={{ fontSize: 12 }}>Contact the school administration to update your details.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Learner Lookup ── */}
      {tab === 'learner' && !selectedLearner && (
        <div className="panel no-print">
          <div className="panel-hdr"><h3>🎓 Learner Lookup</h3></div>
          <div className="panel-body">
            {tabLoading ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading learner database…</p> : (
              <>
                <div className="field" style={{ maxWidth: 340 }}>
                  <label>Search by Name or Admission No.</label>
                  <input placeholder="Type at least 2 characters…" value={learnerQ} onChange={e => setLearnerQ(e.target.value)} />
                </div>
                {filteredLearners.length > 0 && (
                  <div className="tbl-wrap">
                    <table>
                      <thead><tr><th>Adm</th><th>Name</th><th>Grade</th><th>Stream</th><th></th></tr></thead>
                      <tbody>
                        {filteredLearners.slice(0, 20).map(l => (
                          <tr key={l.adm} style={{cursor:'pointer'}} onClick={() => setSelectedLearner(l)}>
                            <td><span className="badge bg-gray">{l.adm}</span></td>
                            <td style={{ fontWeight: 600 }}>{l.name}</td>
                            <td>{l.grade}</td>
                            <td>{l.stream || '—'}</td>
                            <td><button className="btn btn-sm btn-maroon" onClick={(e) => { e.stopPropagation(); router.push(`/learners/${encodeURIComponent(l.adm)}`); }}>Full Profile</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── View Learner Profile ── */}
      {(tab === 'learner' || tab === 'my-learners') && selectedLearner && (() => {
        const lExtra = allProfiles[selectedLearner.adm] || {};
        return (
          <div>
            <button className="btn btn-ghost btn-sm no-print" style={{ marginBottom: 14 }} onClick={() => setSelectedLearner(null)}>← Back to Results</button>
            <div className="print-only" style={{ display:'none' }}>EduVantage - Learner Profile</div>
            <div className="sg sg2">
              <div className="panel" style={{ background: `linear-gradient(135deg, ${M}, #6B1212)`, color: '#fff' }}>
                <div className="panel-body">
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800 }}>{selectedLearner.name}</div>
                  <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>Adm: {selectedLearner.adm}</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      ['Grade', selectedLearner.grade],
                      ['Stream', selectedLearner.stream || '—'],
                      ['DOB', selectedLearner.dob || '—'],
                      ['Parent/Guardian', selectedLearner.parent || '—'],
                      ['Contact', selectedLearner.phone || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                        <span style={{ opacity: .6, minWidth: 110 }}>{k}:</span><strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-hdr"><h3>Detailed Information</h3></div>
                <div className="panel-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 20px' }}>
                  <div className="profile-field"><div className="profile-label">Father's Name</div><div style={{fontWeight:600}}>{lExtra.father || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Mother's Name</div><div style={{fontWeight:600}}>{lExtra.mother || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Gender</div><div style={{fontWeight:600}}>{selectedLearner.gender || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Blood Group</div><div style={{fontWeight:600}}>{lExtra.blood || '—'}</div></div>
                  <div className="profile-field"><div className="profile-label">Transport Means</div><div style={{fontWeight:600}}>{lExtra.transport || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Physical Address</div><div style={{fontWeight:600}}>{lExtra.address || '—'}</div></div>
                  <div className="profile-field" style={{ gridColumn:'1/-1' }}><div className="profile-label">Medical Conditions</div><div style={{fontWeight:600, color:'var(--red)'}}>{lExtra.medical || '—'}</div></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Enroll Learners ── */}
      {tab === 'bulk' && (
        <div className="panel no-print">
          <div className="panel-hdr">
            <div>
              <h3 style={{color:M}}>📥 Bulk Enroll Detailed Learners</h3>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Quickly add multiple learners with extended profile data.</div>
            </div>
            {tabLoading ? <span className="badge bg-gray">Loading DB…</span> : (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <select value={bulkGrade} onChange={e=>setBulkGrade(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1.5px solid var(--border)'}}>
                  {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
                <label className="btn btn-gold btn-sm" style={{ cursor:'pointer' }}>
                  📁 Upload CSV
                  <input type="file" accept=".csv,text/csv" onChange={handleBulkCsvUpload} style={{ display:'none' }} />
                </label>
                <button className="btn btn-ghost btn-sm" onClick={downloadBulkTemplate}>📥 Export / Template</button>
                <button className="btn btn-gold btn-sm" onClick={() => setBulkRows([...bulkRows, { ...createEmptyBulkRow(), grade: bulkGrade }])}>➕ Add Row</button>
              </div>
            )}
          </div>
          {csvInfo && (
            <div className="alert alert-info show" style={{ margin: 16, marginBottom: 0, alignItems:'flex-start' }}>
              <span>✅</span>
              <span>
                <strong>{csvInfo.text}</strong>
                <br />
                <span style={{ fontSize: 11 }}>{csvInfo.fields}</span>
              </span>
            </div>
          )}
          <div className="tbl-wrap" style={{ overflowX:'auto' }}>
            <table style={{ minWidth: 1640 }}>
              <thead>
                <tr>
                  <th style={{width:100}}>Adm No*</th>
                  <th style={{width:160}}>Full Name*</th>
                  <th style={{width:130}}>Grade</th>
                  <th style={{width:100}}>Stream</th>
                  <th style={{width:80}}>Gender</th>
                  <th style={{width:110}}>DOB</th>
                  <th style={{width:130}}>Main Parent</th>
                  <th style={{width:110}}>Phone</th>
                  <th style={{width:130}}>Father</th>
                  <th style={{width:130}}>Mother</th>
                  <th style={{width:130}}>Address</th>
                  <th style={{width:100}}>Medical</th>
                  <th style={{width:80}}>Blood G.</th>
                  <th style={{width:100}}>Transport</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((r, i) => (
                  <tr key={i}>
                    <td><input value={r.adm} onChange={e=>updateBulkRow(i, 'adm', e.target.value)} placeholder="e.g. 1001" style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.name} onChange={e=>updateBulkRow(i, 'name', e.target.value.toUpperCase())} placeholder="Full Name" style={{width:'100%',padding:4}} /></td>
                    <td>
                      <select value={r.grade || bulkGrade} onChange={e=>updateBulkRow(i, 'grade', e.target.value)} style={{width:'100%',padding:4}}>
                        {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td><input value={r.stream} onChange={e=>updateBulkRow(i, 'stream', e.target.value.toUpperCase())} placeholder="A" style={{width:'100%',padding:4}} /></td>
                    <td><select value={r.gender} onChange={e=>updateBulkRow(i, 'gender', e.target.value)} style={{width:'100%',padding:4}}><option value=""></option><option>Male</option><option>Female</option></select></td>
                    <td><input type="date" value={r.dob} onChange={e=>updateBulkRow(i, 'dob', e.target.value)} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.parent} onChange={e=>updateBulkRow(i, 'parent', e.target.value.toUpperCase())} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.phone} onChange={e=>updateBulkRow(i, 'phone', e.target.value)} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.father} onChange={e=>updateBulkRow(i, 'father', e.target.value.toUpperCase())} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.mother} onChange={e=>updateBulkRow(i, 'mother', e.target.value.toUpperCase())} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.address} onChange={e=>updateBulkRow(i, 'address', e.target.value)} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.medical} onChange={e=>updateBulkRow(i, 'medical', e.target.value)} style={{width:'100%',padding:4}} /></td>
                    <td><input value={r.blood} onChange={e=>updateBulkRow(i, 'blood', e.target.value.toUpperCase())} style={{width:'100%',padding:4}} /></td>
                    <td><select value={r.transport} onChange={e=>updateBulkRow(i, 'transport', e.target.value)} style={{width:'100%',padding:4}}><option value=""></option><option>Walk</option><option>Bus</option><option>Private</option></select></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => {const nr=[...bulkRows];nr.splice(i,1);setBulkRows(nr);}} style={{padding:4}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:16, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-maroon" onClick={saveBulkLearners} disabled={busy}>
              {busy ? '⏳ Saving...' : `💾 Save ${bulkGrade} Learners`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
