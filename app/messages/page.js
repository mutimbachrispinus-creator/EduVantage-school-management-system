'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { today } from '@/lib/cbe';
import { getCachedUser, getCachedDBMulti, fetchWithRetry, updateLocalDBCache } from '@/lib/client-cache';
import { Search, Send, User, Users, CheckCircle, Inbox, Smartphone } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const [showCompose, setShowCompose] = useState(false);
  const [cmpMode, setCmpMode] = useState('group'); // 'group' or 'individual'
  const [cmpTo, setCmpTo] = useState('ALL');
  const [cmpSub, setCmpSub] = useState('');
  const [cmpBody, setCmpBody] = useState('');
  const [cmpPri, setCmpPri] = useState('normal');
  const [cmpSearch, setCmpSearch] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  
  // Contacts
  const [staff, setStaff] = useState([]);
  const [learners, setLearners] = useState([]);
  const [smsLog, setSmsLog] = useState([]);
  const [smsGroup, setSmsGroup] = useState('parents');
  const [smsCustom, setSmsCustom] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsResult, setSmsResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_msgs', 'paav6_staff', 'paav6_learners', 'paav7_sms'])
      ]);

      if (!u) { router.push('/'); return; }
      setUser(u);

      setAllMessages(db.paav6_msgs || []);
      setStaff(db.paav6_staff || []);
      setLearners(db.paav6_learners || []);
      setSmsLog(db.paav7_sms || []);
    } catch (e) {
      console.error('[Messages] Load error:', e);
      setError('Communication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openThread = async (m) => {
    setActiveThread(m);
    const readArray = Array.isArray(m.read) ? m.read : [];
    if (!readArray.includes(user.username)) {
      const updatedMsg = { ...m, read: [...readArray, user.username] };
      setSaving(true);
      try {
        await fetchWithRetry('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: updatedMsg }] })
        });
        setAllMessages(prev => {
          const newMsgs = prev.map(msg => msg.id === m.id ? updatedMsg : msg);
          updateLocalDBCache('paav6_msgs', newMsgs); // Update cache so Navbar badge clears
          return newMsgs;
        });
        setActiveThread(updatedMsg);
      } catch (e) { console.error(e); }
      finally { setSaving(false); }
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;
    
    const updatedMsg = {
      ...activeThread,
      replies: [...(activeThread.replies || []), { from: user.username, fromName: user.name, text: replyText.trim(), date: today() }]
    };
    
    setSaving(true);
    try {
      await fetchWithRetry('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: updatedMsg }] })
      });
      setAllMessages(prev => {
        const newMsgs = prev.map(msg => msg.id === activeThread.id ? updatedMsg : msg);
        updateLocalDBCache('paav6_msgs', newMsgs);
        return newMsgs;
      });
      setActiveThread(updatedMsg);
      setReplyText('');
    } catch (e) {
      console.error(e);
      alert('Failed to send reply');
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!cmpTo || !cmpSub.trim() || !cmpBody.trim()) {
      alert('Please fill all fields');
      return;
    }
    
    // Find recipient name if individual
    let toName = cmpTo;
    if (cmpMode === 'individual') {
      const target = [...staff, ...learners].find(x => x.username === cmpTo || x.adm === cmpTo || x.id === cmpTo);
      toName = target?.name || cmpTo;
    }

    const newMsg = {
      id: 'm' + Date.now(),
      from: user.username,
      fromName: user.name,
      to: cmpTo,
      toName: toName,
      subject: cmpSub.trim(),
      body: cmpBody.trim(),
      date: today(),
      read: [user.username],
      priority: cmpPri,
      replies: []
    };
    
    setSaving(true);
    try {
      await fetchWithRetry('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: newMsg }] })
      });
      setAllMessages(prev => {
        const newMsgs = [newMsg, ...prev];
        updateLocalDBCache('paav6_msgs', newMsgs);
        return newMsgs;
      });
      setSentSuccess(true);
      setTimeout(() => {
        setShowCompose(false);
        setSentSuccess(false);
        setCmpSub('');
        setCmpBody('');
        setCmpTo('ALL');
        setCmpMode('group');
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    } finally {
      setSaving(false);
    }
  };

  const getSmsPhones = () => {
    if (smsGroup === 'custom') return smsCustom.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
    const phones = [];
    if (smsGroup === 'parents' || smsGroup === 'all') {
      learners.forEach(l => { if (l.phone) phones.push(l.phone); });
      staff.filter(s => s.role === 'parent').forEach(s => { if (s.phone) phones.push(s.phone); });
    }
    if (smsGroup === 'teachers' || smsGroup === 'all') {
      staff.filter(s => s.role === 'teacher').forEach(s => { if (s.phone) phones.push(s.phone); });
    }
    if (smsGroup === 'staff' || smsGroup === 'all') {
      staff.forEach(s => { if (s.phone) phones.push(s.phone); });
    }
    return [...new Set(phones)];
  };

  const sendSms = async () => {
    const phones = getSmsPhones();
    if (!phones.length) { setSmsResult({ ok: false, error: 'No recipients' }); return; }
    if (!smsMessage.trim()) { setSmsResult({ ok: false, error: 'Enter a message' }); return; }
    setSaving(true); setSmsResult(null);
    try {
      const res = await fetchWithRetry('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          phones,
          message: smsMessage,
          toLabel: smsGroup
        })
      });
      const data = await res.json();
      setSmsResult(data);
      if (data.ok) { setSmsMessage(''); load(); }
    } catch (e) { setSmsResult({ ok: false, error: 'Failed to send' }); }
    finally { setSaving(false); }
  };

  const filteredContacts = useMemo(() => {
    const q = cmpSearch.toLowerCase();
    if (!q) return [];
    return [...staff, ...learners]
      .filter(x => x.name?.toLowerCase().includes(q) || x.username?.toLowerCase().includes(q) || x.adm?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [staff, learners, cmpSearch]);

  const filteredMsgs = useMemo(() => {
    if (!user) return [];
    return allMessages.filter(m => {
      if (activeTab === 'inbox') {
        return (
          m.to === user.username || 
          m.to === user.role ||
          m.to === 'ALL' || 
          (m.to === 'ALL_PARENTS' && user.role === 'parent') || 
          (m.to === 'ALL_STAFF' && ['admin','teacher','staff'].includes(user.role)) ||
          (m.to === 'ALL_TEACHERS' && ['admin','teacher'].includes(user.role)) ||
          (m.to === 'NON_TEACHING_STAFF' && ['admin','staff'].includes(user.role))
        );
      } else if (activeTab === 'sent') {
        return m.from === user.username;
      }
      return false;
    }).sort((a,b) => b.id.localeCompare(a.id));
  }, [allMessages, activeTab, user]);

  if (error) return (
    <div className="page on" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
      <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Connection Issue</h3>
      <p style={{ color: 'var(--red)', marginBottom: '24px', fontSize: 13 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry Connection</button>
    </div>
  );

  if (loading || !user) return <LoadingSkeleton />;

  return (
    <div className="page on" id="pg-messages">
      <div className="page-hdr">
        <div>
          <h2>💬 Messages</h2>
          <p>School inbox and announcements</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)} style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue2))', border: 'none' }}>
            <Send size={14} /> Compose
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className={`btn btn-sm ${activeTab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveTab('inbox'); setActiveThread(null); }}>
          <Inbox size={14} /> Inbox
        </button>
        <button className={`btn btn-sm ${activeTab === 'sent' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveTab('sent'); setActiveThread(null); }}>
          <Send size={14} /> Sent
        </button>
        {['admin', 'super-admin'].includes(user.role) && (
          <button className={`btn btn-sm ${activeTab === 'sms' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveTab('sms'); setActiveThread(null); }}>
            <Smartphone size={14} /> Bulk SMS
          </button>
        )}
      </div>

      <div className="sg-responsive" style={{ display: 'grid', gridTemplateColumns: activeTab === 'sms' ? '1fr' : '380px 1fr', gap: 20 }}>
        {activeTab !== 'sms' ? (
          <>
            <div className="panel" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
              <div className="panel-hdr" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: 14 }}>{activeTab === 'inbox' ? 'Recieved Messages' : 'Sent History'}</h3>
              </div>
              <div className="panel-body" style={{ padding: 0, overflowY: 'auto', flex: 1 }}>
                {filteredMsgs.length > 0 ? filteredMsgs.map(m => {
                  const unr = !m.read.includes(user.username) && m.from !== user.username;
                  const active = activeThread?.id === m.id;
                  const pC = m.priority === 'urgent' ? '#EF4444' : m.priority === 'important' ? '#F59E0B' : 'transparent';
                  return (
                    <div key={m.id} className={`msg-item ${unr ? 'unread' : ''}`} onClick={() => openThread(m)}
                      style={{ 
                        borderLeft: `4px solid ${pC}`, padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', 
                        background: active ? '#F0F9FF' : 'transparent', transition: '0.2s', position: 'relative'
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: active ? 'var(--blue)' : 'var(--navy)' }}>
                          {activeTab === 'inbox' ? m.fromName : (m.toName || m.to)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>{m.date}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#334155', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subject}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {m.body}
                      </div>
                      {unr && <div style={{ position: 'absolute', right: 12, top: '50%', width: 8, height: 8, background: 'var(--blue)', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(37,99,235,0.1)' }} />}
                    </div>
                  );
                }) : <div style={{ padding: '60px 20px', color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                    No messages found
                  </div>}
              </div>
            </div>

            <div className="panel" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
              <div className="panel-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: 14 }}>Thread Conversation</h3>
                {activeThread && <span className="badge bg-blue" style={{ fontSize: 10 }}>{activeThread.priority?.toUpperCase()}</span>}
              </div>
              <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
                {activeThread ? (
                  <>
                    <div style={{ paddingBottom: '16px', borderBottom: '1.5px solid #f1f5f9', marginBottom: '20px' }}>
                      <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--navy)', letterSpacing: '-0.3px' }}>{activeThread.subject}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', display: 'flex', gap: 12 }}>
                        <span><strong>From:</strong> {activeThread.fromName}</span>
                        <span><strong>To:</strong> {activeThread.toName || activeThread.to}</span>
                        <span><strong>Date:</strong> {activeThread.date}</span>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ maxWidth: '85%' }}>
                          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', fontSize: '14px', color: '#1E293B', lineHeight: 1.6 }}>
                            {activeThread.body}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--light)', marginTop: '6px', fontWeight: 700, paddingLeft: 4 }}>{activeThread.fromName} · {activeThread.date}</div>
                        </div>
                      </div>
                      
                      {(activeThread.replies || []).map((r, i) => {
                        const mine = r.from === user.username;
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '85%' }}>
                              <div style={{ 
                                background: mine ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#F1F5F9', 
                                color: mine ? '#fff' : '#334155', padding: '12px 16px', 
                                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                                fontSize: '14px', lineHeight: 1.6, boxShadow: mine ? '0 4px 12px rgba(37,99,235,0.2)' : 'none'
                              }}>
                                {r.text}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--light)', marginTop: '6px', fontWeight: 700, textAlign: mine ? 'right' : 'left', padding: '0 4px' }}>
                                {r.fromName || r.from} · {r.date}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={sendReply} style={{ marginTop: '20px', display: 'flex', gap: '10px', background: '#F8FAFC', padding: 8, borderRadius: 16, border: '1px solid #E2E8F0' }}>
                      <input 
                        type="text" 
                        value={replyText} 
                        onChange={e => setReplyText(e.target.value)} 
                        placeholder="Write a professional reply..." 
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', background: 'transparent', fontSize: '14px', outline: 'none' }} 
                        disabled={saving} 
                      />
                      <button type="submit" className="btn btn-primary" disabled={saving || !replyText.trim()} style={{ borderRadius: 12, width: 80 }}>
                        {saving ? '...' : 'Reply'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 15, opacity: 0.5 }}>📫</div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>No Conversation Selected</h3>
                    <p style={{ fontSize: 13 }}>Choose a message from the list to view the full thread.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="sg-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            <div className="panel">
              <div className="panel-hdr"><h3>📤 Send SMS Blast</h3></div>
              <div className="panel-body" style={{ padding: 24 }}>
                {smsResult && (
                  <div className={`alert show alert-${smsResult.ok ? 'ok' : 'err'}`} style={{ marginBottom: 20, borderRadius: 12 }}>
                    {smsResult.ok ? `✅ Sent to ${smsResult.totalSent} recipients.` : `❌ ${smsResult.error}`}
                  </div>
                )}
                <div className="field">
                  <label>Recipients Group</label>
                  <select value={smsGroup} onChange={e => setSmsGroup(e.target.value)} style={{ borderRadius: 12 }}>
                    <option value="parents">All Parents</option>
                    <option value="teachers">All Teachers</option>
                    <option value="staff">All Staff</option>
                    <option value="all">Everyone</option>
                    <option value="custom">Custom Numbers</option>
                  </select>
                </div>
                {smsGroup === 'custom' && (
                  <div className="field">
                    <label>Phone Numbers (comma separated)</label>
                    <textarea value={smsCustom} onChange={e => setSmsCustom(e.target.value)} rows={3} placeholder="07XXXXXXXX, 07XXXXXXXX" style={{ borderRadius: 12 }} />
                  </div>
                )}
                <div className="field">
                  <label>Message Content</label>
                  <textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} rows={5} placeholder="Type your SMS message here..." style={{ borderRadius: 12 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 8, fontWeight: 700 }}>
                    <span>{smsMessage.length} characters</span>
                    <span>{getSmsPhones().length} targeted recipients</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={sendSms} disabled={saving} style={{ marginTop: 20, height: 50, borderRadius: 14, fontSize: 15 }}>
                  {saving ? '⏳ Processing Blast...' : `📱 Send SMS to ${getSmsPhones().length} Recipients`}
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-hdr"><h3>📋 Recent SMS Activity</h3></div>
              <div className="panel-body" style={{ height: '500px', overflowY: 'auto', padding: 0 }}>
                {smsLog.length > 0 ? smsLog.map((s, i) => (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{s.to}</strong>
                      <span className={`badge ${s.deliveryStatus === 'Success' ? 'bg-green' : s.status === 'failed' || ['Failed', 'Rejected'].includes(s.deliveryStatus) ? 'bg-red' : ''}`} style={{ fontSize: 10 }}>
                        {(s.deliveryStatus || s.status || 'submitted').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', margin: '6px 0', lineHeight: 1.5 }}>{s.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--light)', fontWeight: 600 }}>
                      {new Date(s.date).toLocaleString()} · Sent by {s.sentBy}
                      {s.failureReason ? ` · ${s.failureReason}` : ''}
                    </div>
                  </div>
                )) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No SMS logs found</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="modal" style={{ maxWidth: 600, borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: 'none' }}>
            <div className="modal-hdr" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '24px 30px' }}>
              <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>✉️ New Message</h3>
              <button className="btn-close" onClick={() => setShowCompose(false)} style={{ color: '#fff' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '30px' }}>
              {sentSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 60, marginBottom: 15 }}>✅</div>
                  <h3 style={{ fontWeight: 800, color: 'var(--green)' }}>Message Delivered!</h3>
                  <p style={{ color: 'var(--muted)' }}>Processing delivery to all recipients...</p>
                </div>
              ) : (
                <form onSubmit={sendMessage}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                    <button type="button" onClick={() => { setCmpMode('group'); setCmpTo('ALL'); }} 
                      style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: cmpMode === 'group' ? '#fff' : 'transparent', fontWeight: 700, fontSize: 12, boxShadow: cmpMode === 'group' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>
                      <Users size={14} style={{ marginRight: 4 }} /> Send to Group
                    </button>
                    <button type="button" onClick={() => { setCmpMode('individual'); setCmpTo(''); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: cmpMode === 'individual' ? '#fff' : 'transparent', fontWeight: 700, fontSize: 12, boxShadow: cmpMode === 'individual' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>
                      <User size={14} style={{ marginRight: 4 }} /> Send to Individual
                    </button>
                  </div>

                  <div className="field">
                    <label>Recipient(s)</label>
                    {cmpMode === 'group' ? (
                      <select value={cmpTo} onChange={e => setCmpTo(e.target.value)} style={{ borderRadius: 12, height: 45 }}>
                        <option value="ALL">All Portal Users</option>
                        <option value="ALL_STAFF">All Staff & Teachers</option>
                        <option value="ALL_TEACHERS">Only Teachers</option>
                        <option value="NON_TEACHING_STAFF">Only Non-Teaching Staff</option>
                        <option value="ALL_PARENTS">All Parents</option>
                        {user.role === 'parent' && <option value="admin">School Admin</option>}
                      </select>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--muted)' }} />
                        <input 
                          value={cmpSearch} 
                          onChange={e => setCmpSearch(e.target.value)} 
                          placeholder="Search staff, teachers or parents..." 
                          style={{ paddingLeft: 40, borderRadius: 12, height: 45, width: '100%' }} 
                        />
                        {filteredContacts.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginTop: 4, zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                            {filteredContacts.map(c => (
                              <div key={c.id || c.adm} onClick={() => { setCmpTo(c.username || c.adm); setCmpSearch(c.name); setCmpSearch(''); }}
                                style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13, background: cmpTo === (c.username || c.adm) ? '#f0f9ff' : 'transparent' }}>
                                <strong>{c.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 11 }}>({c.role || 'Student'})</span>
                                {cmpTo === (c.username || c.adm) && <CheckCircle size={14} style={{ float: 'right', color: 'var(--blue)' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                        {cmpTo && !cmpSearch && (
                          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>
                            Selected: {cmpTo} (Recipient ID)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 15 }}>
                    <div className="field">
                      <label>Subject</label>
                      <input value={cmpSub} onChange={e => setCmpSub(e.target.value)} placeholder="Topic of communication" required style={{ borderRadius: 12, height: 45 }} />
                    </div>
                    <div className="field">
                      <label>Priority</label>
                      <select value={cmpPri} onChange={e => setCmpPri(e.target.value)} style={{ borderRadius: 12, height: 45 }}>
                        <option value="normal">Normal</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Message Body</label>
                    <textarea value={cmpBody} onChange={e => setCmpBody(e.target.value)} rows="5" placeholder="Type your message content..." required style={{ borderRadius: 16, padding: 15 }}></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)} style={{ flex: 1, height: 50, borderRadius: 14 }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving || !cmpTo} style={{ flex: 2, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none' }}>
                      {saving ? '⏳ Processing Delivery...' : '🚀 Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .msg-item:hover { background: #F8FAFC !important; }
        .unread { background: #F0F9FF !important; }
        .badge.bg-blue { background: #DBEAFE; color: #1E40AF; }
        .badge.bg-green { background: #DCFCE7; color: #15803D; }
        .badge.bg-red { background: #FEE2E2; color: #B91C1C; }
        .hover\:border-blue-200:hover { border-color: #BFDBFE !important; }
      `}</style>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="page on" style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
      <div className="ai-loader" style={{ width: 50, height: 50, border: '3px solid #f3f3f3', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
      <h3 style={{ fontWeight: 800 }}>Initializing Comms Hub...</h3>
      <p style={{ fontSize: 13 }}>Preparing your secure message environment.</p>
      <style jsx>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
    </div>
  );
}
