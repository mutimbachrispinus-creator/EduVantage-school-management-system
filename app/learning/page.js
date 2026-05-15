'use client';
export const runtime = 'edge';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';

/* ── Tool palette for whiteboard ── */
const TOOLS = [
  { id: 'pen',    icon: '✏️', label: 'Pen' },
  { id: 'eraser', icon: '🧹', label: 'Eraser' },
  { id: 'text',   icon: '🔤', label: 'Text' },
];
const COLORS = ['#1e293b','#DC2626','#2563EB','#16A34A','#D97706','#7C3AED','#EC4899','#fff'];
const SIZES  = [2, 4, 8, 14];

const CATEGORIES = [
  { id: 'all', label: 'All Resources', icon: '📚' },
  { id: 'notes', label: 'Class Notes', icon: '📝' },
  { id: 'exams', label: 'Past Papers', icon: '📜' },
  { id: 'assignments', label: 'Assignments', icon: '📂' },
  { id: 'videos', label: 'Video Lessons', icon: '🎥' },
];

export default function EducationHubPage() {
  const router = useRouter();
  const { profile: school } = useProfile() || {};
  const curr = getCurriculum(school?.curriculum || 'CBC');
  const ALL_GRADES = curr?.ALL_GRADES || [];
  
  // Hub state
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [tab,  setTab]  = useState('hub'); // 'hub' | 'live'
  const [cat,  setCat]  = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', grade: '', subject: '', category: 'notes', url: '' });
  const [uploading, setUploading] = useState(false);

  // Live Class state
  const [sessions,      setSessions]      = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [activeLiveTab, setActiveLiveTab] = useState('video'); // 'video' | 'board' | 'slides'
  const [newSession,    setNewSession]    = useState({ title: '', grade: '', subject: '', desc: '' });

  /* Whiteboard state */
  const canvasRef   = useRef(null);
  const drawing     = useRef(false);
  const lastPt      = useRef(null);
  const [tool,   setTool]   = useState('pen');
  const [color,  setColor]  = useState('#1e293b');
  const [size,   setSize]   = useState(4);

  /* Slides state */
  const [slides,      setSlides]      = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [uploadingSlide, setUploadingSlide] = useState(false);

  /* Subscription state */
  const [subs, setSubs] = useState({});
  const [paybills, setPaybills] = useState([]);

  /* Jitsi */
  const jitsiRef = useRef(null);
  const apiRef   = useRef(null);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u) { router.push('/'); return; }
    setUser(u);
    
    const db = await getCachedDBMulti(['paav_edu_docs', 'paav_live_sessions', 'paav_live_slides', 'paav_learning_subs', 'paav_paybill_accounts']);
    setDocs(db.paav_edu_docs || []);
    setSessions((db.paav_live_sessions || []).filter(s => Date.now() - s.createdAt < 24 * 60 * 60 * 1000));
    setSlides(db.paav_live_slides || []);
    setSubs(db.paav_learning_subs || {});
    setPaybills(db.paav_paybill_accounts || []);

    if (ALL_GRADES.length > 0) {
      setNewDoc(d => ({ ...d, grade: d.grade || ALL_GRADES[0] }));
      setNewSession(n => ({ ...n, grade: n.grade || ALL_GRADES[0] }));
    }
  }, [router, ALL_GRADES]);

  useEffect(() => { load(); }, [load]);

  /* Jitsi logic stays same */
  useEffect(() => {
    if (!activeSession || activeLiveTab !== 'video' || !jitsiRef.current) return;
    if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }
    const init = () => {
      if (!window.JitsiMeetExternalAPI || !jitsiRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: `eduvantage-${activeSession.id}`,
        parentNode: jitsiRef.current,
        width: '100%', height: '100%',
        configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: false, prejoinPageEnabled: false, disableDeepLinking: true, enableWelcomePage: false, disableThirdPartyRequests: true, subject: `${school?.name || 'EduVantage'} — ${activeSession.title}`, toolbarButtons: ['camera','microphone','hangup','chat','raisehand','tileview','fullscreen'] },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, SHOW_BRAND_WATERMARK: false, SHOW_POWERED_BY: false, MOBILE_APP_PROMO: false, DISPLAY_WELCOME_FOOTER: false, TOOLBAR_ALWAYS_VISIBLE: false, DEFAULT_LOGO_URL: '', JITSI_WATERMARK_LINK: '' },
        userInfo: { displayName: user?.name || user?.username || 'Student' },
      });
    };
    if (window.JitsiMeetExternalAPI) { init(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true; s.onload = init;
      document.head.appendChild(s);
    }
    return () => { if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; } };
  }, [activeSession, activeLiveTab, user, school]);

  /* ── Whiteboard drawing ── */
  function startDraw(e) {
    drawing.current = true;
    const pt = getPoint(e);
    lastPt.current = pt;
    if (tool === 'text') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (tool === 'eraser' ? size * 3 : size) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#fff' : color;
    ctx.fill();
  }
  function draw(e) {
    if (!drawing.current || tool === 'text') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPt.current) return;
    const pt = getPoint(e);
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 4 : size;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastPt.current = pt;
  }
  function stopDraw() { drawing.current = false; lastPt.current = null; }
  function getPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  function clearBoard() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  /* ── Slides ── */
  async function uploadSlide(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingSlide(true);
    const formData = new FormData(); formData.append('file', file); formData.append('name', file.name);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) {
        const updated = [...slides, { id: Date.now(), url: data.url, title: file.name.replace(/\.[^/.]+$/, '') }];
        setSlides(updated); setActiveSlide(updated.length - 1);
        await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_live_slides', value: updated }] }) });
      }
    } catch {}
    setUploadingSlide(false);
  }

  /* ── Hub Resource Management ── */
  async function handleFileChange(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const formData = new FormData(); formData.append('file', file); formData.append('name', file.name);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) setNewDoc({ ...newDoc, url: data.url, title: newDoc.title || file.name });
    } catch {}
    setUploading(false);
  }

  async function saveDoc() {
    if (!newDoc.url || !newDoc.title) return;
    const doc = { ...newDoc, id: Date.now(), author: user.name || user.username, createdAt: Date.now() };
    const updated = [doc, ...docs];
    await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_edu_docs', value: updated }] }) });
    setDocs(updated); setShowUpload(false);
    setNewDoc({ title: '', grade: ALL_GRADES[0] || '', subject: '', category: 'notes', url: '' });
  }

  /* ── Session management ── */
  async function createSession() {
    if (!newSession.title.trim()) return;
    setSaving(true);
    const session = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: newSession.title, grade: newSession.grade || 'All', subject: newSession.subject, desc: newSession.desc, host: user.name || user.username, hostRole: user.role, createdAt: Date.now() };
    const updated = [session, ...sessions];
    await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_live_sessions', value: updated }] }) });
    setSessions(updated); setShowCreate(false);
    setNewSession({ title: '', grade: ALL_GRADES[0] || '', subject: '', desc: '' });
    setSaving(false); setActiveSession(session); setActiveLiveTab('video');
  }

  async function endSession(id) {
    const updated = sessions.filter(s => s.id !== id);
    await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_live_sessions', value: updated }] }) });
    setSessions(updated);
    if (activeSession?.id === id) { if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; } setActiveSession(null); }
  }

  if (!user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Education Hub…</div>;

  const canUpload = ['admin', 'teacher'].includes(user.role);
  const filteredDocs = docs.filter(d => cat === 'all' || d.category === cat);
  const resources = curr?.RESOURCES || [];
  const officialRes = resources.filter(r => r.cat === 'Official');
  const otherRes = resources.filter(r => r.cat !== 'Official');

  // Subscription check
  const isPremiumCat = cat === 'videos';
  const mySub = subs[user.username] || { expires: 0 };
  const hasSub = canUpload || mySub.expires > Date.now();

  async function initiateSubMpesa(plan, amount) {
    const phone = user.phone || prompt('Enter M-Pesa Phone Number (07xxxxxxxx):');
    if (!phone) return;
    const account = paybills[0];
    if (!account) return alert('No payment gateway configured.');
    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          amount: amount,
          accountRef: user.username,
          term: plan, // SUB_DAILY, SUB_WEEKLY, SUB_MONTHLY
          description: 'Learning Subscription',
          paybillId: account.id
        })
      });
      const data = await res.json();
      if (data.success) alert('✅ M-Pesa prompt sent! Enter PIN to activate subscription.');
      else alert('❌ Error: ' + (data.error || 'Failed to initiate M-Pesa.'));
    } catch (err) { alert('❌ Connection error: ' + err.message); }
  }

  return (
    <div className="page on">
      {/* Top Navigation Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 25, borderBottom: '1.5px solid var(--border)', paddingBottom: 12 }}>
        <button onClick={() => setTab('hub')} className={`tab-btn ${tab === 'hub' ? 'on' : ''}`} style={{ fontSize: 14 }}>📚 Hub & Resources</button>
        <button onClick={() => setTab('live')} className={`tab-btn ${tab === 'live' ? 'on' : ''}`} style={{ fontSize: 14 }}>📹 Live Classes {sessions.length > 0 && <span style={{ background: '#DC2626', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, marginLeft: 5 }}>{sessions.length}</span>}</button>
      </div>

      {tab === 'hub' ? (
        <div className="hub-content">
          <div className="page-hdr">
            <div>
              <h2>🎓 Education Hub</h2>
              <p>Curriculum-aligned resources, digital notes, and official {curr.name} materials</p>
            </div>
            {canUpload && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>＋ Share Material</button>
            )}
          </div>

          <div className="sg-responsive">
            <div style={{ flex: 1 }}>
              <div className="sg sg5" style={{ marginBottom: 25 }}>
                {CATEGORIES.map(c => (
                  <div key={c.id} className={`cat-card panel ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                    <div className="cat-icon">{c.icon}</div>
                    <div className="cat-label">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-hdr">
                  <h3>{isPremiumCat ? '⭐ Premium Video Lessons' : 'Recent Shared Materials'}</h3>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isPremiumCat && !hasSub ? 'Locked' : `${filteredDocs.length} items found`}</span>
                </div>
                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isPremiumCat && !hasSub ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', background: '#F8FAFC', borderRadius: 12, border: '2px dashed #CBD5E1' }}>
                      <div style={{ fontSize: 50, marginBottom: 15 }}>🔒</div>
                      <h2 style={{ margin: '0 0 10px', color: '#0F172A' }}>EduVantage Learning Premium</h2>
                      <p style={{ color: '#475569', marginBottom: 25, fontSize: 14 }}>Subscribe to unlock high-quality video lessons and premium revision materials.</p>
                      <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 12, padding: 20, width: 200 }}>
                          <h4 style={{ margin: '0 0 5px' }}>Daily Pass</h4>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', marginBottom: 15 }}>KES 150</div>
                          <button className="btn btn-success w-full" onClick={() => initiateSubMpesa('SUB_DAILY', 150)}>Pay via M-Pesa</button>
                        </div>
                        <div style={{ background: '#fff', border: '2px solid #3B82F6', borderRadius: 12, padding: 20, width: 200, transform: 'scale(1.05)', boxShadow: '0 10px 25px rgba(59,130,246,0.15)' }}>
                          <div style={{ background: '#3B82F6', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 10, display: 'inline-block', marginBottom: 10 }}>MOST POPULAR</div>
                          <h4 style={{ margin: '0 0 5px' }}>Weekly Pass</h4>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', marginBottom: 15 }}>KES 800</div>
                          <button className="btn btn-primary w-full" onClick={() => initiateSubMpesa('SUB_WEEKLY', 800)}>Pay via M-Pesa</button>
                        </div>
                        <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 12, padding: 20, width: 200 }}>
                          <h4 style={{ margin: '0 0 5px' }}>Monthly Pass</h4>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', marginBottom: 15 }}>KES 1,900</div>
                          <button className="btn btn-success w-full" onClick={() => initiateSubMpesa('SUB_MONTHLY', 1900)}>Pay via M-Pesa</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {filteredDocs.map((d, i) => (
                        <div key={i} className="doc-row">
                          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                            <div style={{ fontSize: 24 }}>{d.category === 'videos' ? '🎬' : '📄'}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{d.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.grade} • {d.subject} • Shared by {d.author}</div>
                            </div>
                          </div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 20, textDecoration: 'none' }}>{d.category === 'videos' ? '▶️' : '📥'}</a>
                        </div>
                      ))}
                      {filteredDocs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', background: '#F8FAFC', borderRadius: 15 }}>
                          <div style={{ fontSize: 48, marginBottom: 15 }}>📚</div>
                          <h3 style={{ margin: 0 }}>No materials found</h3>
                          <p style={{ fontSize: 12 }}>{user.role === 'parent' ? "Teachers haven't shared any notes yet." : 'Upload class notes or past papers for your students.'}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="sidebar" style={{ width: 320, flexShrink: 0 }}>
              {officialRes.length > 0 && (
                <div className="panel" style={{ marginBottom: 20 }}>
                  <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #0369A1, #075985)', color: '#fff' }}>
                    <h3 style={{ color: '#fff' }}>🌐 {curr.name} Portals</h3>
                  </div>
                  <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {officialRes.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="kicd-link">
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 18 }}>{r.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{r.desc}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {otherRes.length > 0 && (
                <div className="panel">
                  <div className="panel-hdr"><h3>📚 Learning Links</h3></div>
                  <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {otherRes.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="kicd-link">
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 18 }}>{r.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{r.desc}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="live-content">
          <div className="page-hdr">
            <div>
              <h2>📹 Live Classes</h2>
              <p>In-app video lessons — video, whiteboard &amp; slides, all in one</p>
            </div>
            <div className="page-hdr-acts">
              {canUpload && !activeSession && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>＋ Start Live Class</button>
              )}
              {activeSession && (
                <button className="btn btn-danger btn-sm" onClick={() => { if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; } setActiveSession(null); }}>📵 Leave Class</button>
              )}
            </div>
          </div>

          {activeSession ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid #8B1A1A', marginBottom: 20, boxShadow: '0 8px 32px rgba(139,26,26,0.15)' }}>
              <div style={{ background: 'linear-gradient(135deg,#8B1A1A,#6B1212)', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>📹 {activeSession.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{activeSession.grade} • {activeSession.subject} • {activeSession.host}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: '#D4AF37', color: '#000', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 800 }}>🔴 LIVE</span>
                  {(activeSession.host === (user.name || user.username) || user.role === 'admin') && <button style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => endSession(activeSession.id)}>⏹ End Session</button>}
                </div>
              </div>
              <div style={{ display: 'flex', background: '#0F172A', gap: 2, padding: '6px 12px' }}>
                {[{ id: 'video', icon: '🎥', label: 'Video' }, { id: 'board', icon: '🖊️', label: 'Whiteboard' }, { id: 'slides', icon: '🖼️', label: 'Slides' }].map(t => (
                  <button key={t.id} onClick={() => setActiveLiveTab(t.id)} style={{ background: activeLiveTab === t.id ? '#8B1A1A' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>{t.icon} {t.label}</button>
                ))}
              </div>
              {activeLiveTab === 'video' && <div ref={jitsiRef} style={{ width: '100%', height: 520, background: '#0F172A' }} />}
              {activeLiveTab === 'board' && (
                <div style={{ background: '#1e293b', padding: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#0F172A', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {TOOLS.map(t => <button key={t.id} title={t.label} onClick={() => setTool(t.id)} style={{ background: tool === t.id ? '#8B1A1A' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, color: '#fff', padding: '6px 10px', fontSize: 15, cursor: 'pointer' }}>{t.icon}</button>)}
                    </div>
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />)}
                    </div>
                    <div style={{ marginLeft: 'auto' }}><button onClick={clearBoard} style={{ background: '#DC2626', border: 'none', borderRadius: 7, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️ Clear</button></div>
                  </div>
                  <canvas ref={canvasRef} width={900} height={480} style={{ display: 'block', width: '100%', height: 480, background: '#fff', cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={e => { e.preventDefault(); startDraw(e); }} onTouchMove={e => { e.preventDefault(); draw(e); }} onTouchEnd={stopDraw} />
                </div>
              )}
              {activeLiveTab === 'slides' && (
                <div style={{ background: '#0F172A', minHeight: 520, display: 'flex' }}>
                  <div style={{ width: 160, background: '#1E293B', display: 'flex', flexDirection: 'column', gap: 6, padding: 10, overflowY: 'auto' }}>
                    {slides.map((sl, i) => (
                      <div key={sl.id} onClick={() => setActiveSlide(i)} style={{ cursor: 'pointer', borderRadius: 8, border: `2px solid ${activeSlide === i ? '#8B1A1A' : 'rgba(255,255,255,0.1)'}`, overflow: 'hidden', background: '#0F172A' }}>
                        <img src={sl.url} alt={sl.title} style={{ width: '100%', height: 80, objectFit: 'contain', background: '#fff' }} />
                      </div>
                    ))}
                    {canUpload && <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 6px', cursor: 'pointer', color: '#94A3B8', fontSize: 11 }}><input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadSlide} /> {uploadingSlide ? '⏳' : '➕'} {uploadingSlide ? 'Uploading…' : 'Add Slide'}</label>}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    {slides.length > 0 && <img src={slides[activeSlide]?.url} style={{ width: '100%', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', background: '#fff', objectFit: 'contain', maxHeight: 420 }} alt="" />}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel">
              <div className="panel-hdr"><h3>🔴 Active Sessions</h3></div>
              <div className="panel-body">
                {sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🎥</div>
                    <p style={{ fontWeight: 700 }}>No live classes right now</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sessions.map(s => (
                      <div key={s.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#FAFBFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div><div style={{ fontWeight: 800 }}>{s.title}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.grade} • {s.subject} • {s.host}</div></div>
                        <button className="btn btn-primary btn-sm" onClick={() => { setActiveSession(s); setActiveLiveTab('video'); }}>Join →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-hdr"><h3>➕ Share Material</h3><button className="modal-close" onClick={() => setShowUpload(false)}>✕</button></div>
            <div className="modal-body">
              <div className="field"><label>Title</label><input value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} placeholder="e.g. Mathematics Notes" /></div>
              <div className="field-row">
                <div className="field"><label>Grade</label><select value={newDoc.grade} onChange={e => setNewDoc({...newDoc, grade: e.target.value})}>{ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div className="field"><label>Category</label><select value={newDoc.category} onChange={e => setNewDoc({...newDoc, category: e.target.value})}>{CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
              </div>
              <div className="field"><label>File Upload</label><div style={{ border: '2px dashed #E2E8F0', padding: 20, borderRadius: 12, textAlign: 'center' }}><input type="file" onChange={handleFileChange} />{uploading && <div>⏳ Uploading...</div>}</div></div>
            </div>
            <div className="modal-ftr"><button className="btn btn-ghost" onClick={() => setShowUpload(false)}>Cancel</button><button className="btn btn-primary" onClick={saveDoc} disabled={uploading}>Upload & Share</button></div>
          </div>
        </div>
      )}

      {/* Create Live Session Modal */}
      {showCreate && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-hdr"><h3>📹 Start Live Class</h3><button className="modal-close" onClick={() => setShowCreate(false)}>✕</button></div>
            <div className="modal-body">
              <div className="field"><label>Title</label><input value={newSession.title} onChange={e => setNewSession({...newSession, title: e.target.value})} placeholder="Session Title" /></div>
              <div className="field-row">
                <div className="field"><label>Grade</label><select value={newSession.grade} onChange={e => setNewSession({...newSession, grade: e.target.value})}>{ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div className="field"><label>Subject</label><input value={newSession.subject} onChange={e => setNewSession({...newSession, subject: e.target.value})} placeholder="Subject" /></div>
              </div>
            </div>
            <div className="modal-ftr"><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={createSession} disabled={saving}>Start Now</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sg-responsive { display: flex; gap: 20px; }
        .cat-card { cursor: pointer; text-align: center; padding: 15px; transition: 0.2s; border: 1.5px solid #E2E8F0; min-width: 100px; }
        .cat-card.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .cat-icon { font-size: 24px; margin-bottom: 5px; }
        .cat-label { font-weight: 800; font-size: 11px; }
        .doc-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fff; border: 1.5px solid #F1F5F9; border-radius: 12px; }
        .kicd-link { text-decoration: none; color: inherit; padding: 10px; border-radius: 10px; border: 1.5px solid #F1F5F9; display: block; }
        .kicd-link:hover { background: #F0F9FF; border-color: #0369A1; }
        @media (max-width: 900px) { .sg-responsive { flex-direction: column; } .sidebar { width: 100% !important; } }
      `}</style>
    </div>
  );
}
