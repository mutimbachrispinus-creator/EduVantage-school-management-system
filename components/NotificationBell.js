'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const TYPE_COLORS = {
  success: { bg: '#ECFDF5', border: '#A7F3D0', icon: '✅', text: '#065F46' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️', text: '#92400E' },
  danger:  { bg: '#FEF2F2', border: '#FECACA', icon: '🚨', text: '#991B1B' },
  payment: { bg: '#F0FDF4', border: '#86EFAC', icon: '💰', text: '#166534' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: '💬', text: '#1E40AF' },
  grade:   { bg: '#F5F3FF', border: '#DDD6FE', icon: '📊', text: '#5B21B6' },
};

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)  return 'Just now';
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen]       = useState(false);
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [prevUnread, setPrevUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notifications || []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notes.filter(n => !(n.readBy || []).includes(userId)).length;

  useEffect(() => {
    if (unread > prevUnread) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }
    setPrevUnread(unread);
  }, [unread, prevUnread]);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', userId })
      });
      setNotes(prev => prev.map(n => ({
        ...n, readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId]
      })));
    } catch {} finally { setLoading(false); }
  }

  async function markRead(id) {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', notificationId: id, userId })
    });
    setNotes(prev => prev.map(n => n.id === id
      ? { ...n, readBy: [...(n.readBy||[]), userId] } : n
    ));
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        style={{
          position: 'relative', border: 'none',
          cursor: 'pointer', padding: '6px 10px', borderRadius: 10,
          fontSize: 20, lineHeight: 1, transition: '0.2s',
          background: open ? '#EEF2FF' : 'transparent',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 4,
            background: '#EF4444', color: '#fff',
            borderRadius: 10, fontSize: 9, fontWeight: 900,
            minWidth: 16, height: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 3px', lineHeight: 1,
            border: '2px solid #fff'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div 
          className="notif-dropdown"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            background: '#fff', borderRadius: 16, width: 340,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            border: '1px solid #E5E7EB', zIndex: 9999,
            maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <style jsx>{`
            @media (max-width: 600px) {
              .notif-dropdown {
                position: fixed !important;
                top: 70px !important;
                left: 10px !important;
                right: 10px !important;
                width: calc(100vw - 20px) !important;
                max-height: 70vh !important;
              }
            }
          `}</style>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg,#4F46E5,#6D28D9)', color: '#fff'
          }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              🔔 Notifications {unread > 0 && `(${unread} new)`}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={loading}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none',
                  color: '#fff', borderRadius: 8, padding: '4px 10px',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? '…' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notes.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: 13 }}>No notifications yet</div>
              </div>
            ) : notes.slice(0, 30).map(n => {
              const isRead = (n.readBy || []).includes(userId);
              const style  = TYPE_COLORS[n.type] || TYPE_COLORS.info;
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!isRead) markRead(n.id); if (n.link) window.location.href = n.link; }}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid #F3F4F6',
                    cursor: n.link ? 'pointer' : 'default',
                    background: isRead ? '#fff' : '#FAFBFF',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    transition: '0.15s',
                    borderLeft: `3px solid ${isRead ? 'transparent' : style.border}`
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = isRead ? '#fff' : '#FAFBFF'}
                >
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{n.icon || style.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: isRead ? 600 : 800, fontSize: 13,
                      color: '#111827', marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
