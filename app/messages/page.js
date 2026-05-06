'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { today } from '@/lib/cbe';

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const [showCompose, setShowCompose] = useState(false);
  const [cmpTo, setCmpTo] = useState('ALL');
  const [cmpSub, setCmpSub] = useState('');
  const [cmpBody, setCmpBody] = useState('');
  const [cmpPri, setCmpPri] = useState('normal');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const timeout = setTimeout(() => {
        if (!user) setError('Taking longer than expected. Please refresh or check connection.');
      }, 12000);

      const authRes = await fetch('/api/auth');
      const ctAuth = authRes.headers.get('content-type');
      if (!ctAuth || !ctAuth.includes('application/json')) throw new Error('Invalid server response');
      const auth = await authRes.json();
      
      if (!auth.ok || !auth.user) { 
        clearTimeout(timeout);
        router.push('/'); 
        return; 
      }
      setUser(auth.user);

      const dbRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'get', key: 'paav6_msgs' }] })
      });
      const ctDb = dbRes.headers.get('content-type');
      const msgs = (ctDb && ctDb.includes('application/json')) ? (await dbRes.json()).results[0]?.value : [];
      
      clearTimeout(timeout);
      setAllMessages(msgs || []);
    } catch (e) {
      console.error(e);
      setError('Communication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router, user]);

  useEffect(() => { load(); }, [load]);

  const openThread = async (m) => {
    setActiveThread(m);
    if (!m.read.includes(user.username)) {
      const updatedMsg = { ...m, read: [...m.read, user.username] };
      setSaving(true);
      try {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: updatedMsg }] })
        });
        setAllMessages(prev => prev.map(msg => msg.id === m.id ? updatedMsg : msg));
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
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: updatedMsg }] })
      });
      setAllMessages(prev => prev.map(msg => msg.id === activeThread.id ? updatedMsg : msg));
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
    
    const newMsg = {
      id: 'm' + Date.now(),
      from: user.username,
      fromName: user.name,
      to: cmpTo,
      subject: cmpSub.trim(),
      body: cmpBody.trim(),
      date: today(),
      read: [user.username],
      priority: cmpPri,
      replies: []
    };
    
    setSaving(true);
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'upsertMessage', message: newMsg }] })
      });
      setAllMessages(prev => [newMsg, ...prev]);
      setShowCompose(false);
      setCmpSub('');
      setCmpBody('');
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <div className="page on" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
      <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Connection Issue</h3>
      <p style={{ color: 'var(--red)', marginBottom: '24px', fontSize: 13 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry Connection</button>
    </div>
  );

  if (loading || !user) return <LoadingSkeleton />;

  const filteredMsgs = allMessages.filter(m => {
    if (activeTab === 'inbox') {
      return (
        m.to === user.username || 
        m.to === 'ALL' || 
        (m.to === 'ALL_PARENTS' && user.role === 'parent') || 
        (m.to === 'ALL_STAFF' && ['admin','teacher','staff'].includes(user.role))
      );
    } else if (activeTab === 'sent') {
      return m.from === user.username;
    }
    return false;
  }).sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div className="page on" id="pg-messages">
      <div className="page-hdr">
        <div>
          <h2>💬 Messages</h2>
          <p>School inbox and announcements</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)}>
            ✏️ Compose
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`btn btn-sm ${activeTab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveTab('inbox'); setActiveThread(null); }}>
          📥 Inbox
        </button>
        <button className={`btn btn-sm ${activeTab === 'sent' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setActiveTab('sent'); setActiveThread(null); }}>
          📤 Sent
        </button>
      </div>

      <div className="sg sg2">
        <div className="panel">
          <div className="panel-hdr">
            <h3>{activeTab === 'inbox' ? 'Inbox' : 'Sent'}</h3>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {filteredMsgs.length > 0 ? filteredMsgs.map(m => {
              const unr = !m.read.includes(user.username) && m.from !== user.username;
              const pC = m.priority === 'urgent' ? '#EF4444' : m.priority === 'important' ? 'var(--amber)' : 'transparent';
              return (
                <div key={m.id} className={`msg-item ${unr ? 'unread' : ''}`} onClick={() => openThread(m)}
                  style={{ borderLeft: `3px solid ${pC}`, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: activeThread?.id === m.id ? '#F8FAFF' : 'transparent' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy)' }}>
                    {m.fromName} {unr && <span style={{ color: 'var(--blue)', fontSize: '10px' }}>●NEW</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--navy)', marginTop: '2px' }}>{m.subject}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--light)', marginTop: '6px' }}>
                    {m.date} {m.replies?.length ? ` · ${m.replies.length} replies` : ''}
                  </div>
                </div>
              );
            }) : <div style={{ padding: '20px', color: 'var(--muted)', fontSize: '12.5px', textAlign: 'center' }}>No messages found</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-hdr">
            <h3>Thread View</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
            {activeThread ? (
              <>
                <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--navy)' }}>{activeThread.subject}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>From: {activeThread.fromName} · {activeThread.date}</div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                  <div className="msg-bubble recv" style={{ marginBottom: '12px' }}>
                    <div>
                      <div className="bbl" style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', color: '#334155', display: 'inline-block' }}>{activeThread.body}</div>
                      <div className="bbl-time" style={{ fontSize: '10px', color: 'var(--light)', marginTop: '4px' }}>{activeThread.fromName} · {activeThread.date}</div>
                    </div>
                  </div>
                  
                  {(activeThread.replies || []).map((r, i) => {
                    const mine = r.from === user.username;
                    return (
                      <div key={i} className={`msg-bubble ${mine ? 'sent' : 'recv'}`} style={{ marginBottom: '12px', textAlign: mine ? 'right' : 'left' }}>
                        <div>
                          <div className="bbl" style={{ background: mine ? 'var(--blue)' : '#F1F5F9', color: mine ? '#fff' : '#334155', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', display: 'inline-block' }}>
                            {r.text}
                          </div>
                          <div className="bbl-time" style={{ fontSize: '10px', color: 'var(--light)', marginTop: '4px' }}>{r.fromName || r.from} · {r.date}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={sendReply} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }} disabled={saving} />
                  <button type="submit" className="btn btn-primary" disabled={saving || !replyText.trim()}>Send</button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Select a message to view the thread
              </div>
            )}
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-hdr">
              <h3>✉️ Compose Message</h3>
              <button className="btn-close" onClick={() => setShowCompose(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={sendMessage}>
                <div className="field">
                  <label>To</label>
                  <select value={cmpTo} onChange={e => setCmpTo(e.target.value)}>
                    <option value="ALL">All Portal Users</option>
                    <option value="ALL_STAFF">All Staff & Teachers</option>
                    <option value="ALL_PARENTS">All Parents</option>
                    {user.role === 'parent' && <option value="admin">School Admin</option>}
                  </select>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Subject</label>
                    <input value={cmpSub} onChange={e => setCmpSub(e.target.value)} placeholder="Brief title" required />
                  </div>
                  <div className="field">
                    <label>Priority</label>
                    <select value={cmpPri} onChange={e => setCmpPri(e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea value={cmpBody} onChange={e => setCmpBody(e.target.value)} rows="5" placeholder="Type your message here..." required></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="page on" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading messages...</div>;
}
