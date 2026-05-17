'use client';
/**
 * app/documents/page.js — Role-based Document Portal
 * 
 * Admins can upload documents targeted to specific roles.
 * Users can see and download documents meant for them.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fmtK } from '@/lib/cbe';

const ROLES = [
  { val: 'ALL', label: 'Everyone' },
  { val: 'admin', label: 'Admins Only' },
  { val: 'staff', label: 'Staff & Teachers' },
  { val: 'teacher', label: 'Teachers Only' },
  { val: 'parent', label: 'Parents Only' },
  { val: 'student', label: 'Students Only' }
];

export default function DocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState([]);
  const [modal, setModal] = useState(null); // 'upload' | null

  const load = useCallback(async () => {
    try {
      const [authRes, dbRes] = await Promise.all([
        fetch('/api/auth'),
        fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ type: 'get', key: 'paav_documents' }] })
        })
      ]);
      const auth = await authRes.json();
      if (!auth.ok) { router.push('/'); return; }
      setUser(auth.user);

      const db = await dbRes.json();
      setDocs(db.results[0]?.value || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    const updated = docs.filter(d => d.id !== id);
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_documents', value: updated }] })
    });
    setDocs(updated);
  }

  if (loading || !user) return <div className="page on"><p>Loading documents...</p></div>;

  const isAdmin = user.role === 'admin';
  const myDocs = isAdmin ? docs : docs.filter(d => {
    if (d.target === 'ALL') return true;
    if (d.target === user.role) return true;
    if (d.target === 'staff' && (user.role === 'staff' || user.role === 'teacher')) return true;
    return false;
  });

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📂 School Documents</h2>
          <p>Access official school files, circulars and resources</p>
        </div>
        {isAdmin && (
          <div className="page-hdr-acts">
            <button className="btn btn-primary" onClick={() => setModal('upload')}>➕ Upload Document</button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <h3>📜 {isAdmin ? 'All Documents' : 'Available for You'}</h3>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Description</th>
                <th>Target Role</th>
                <th>Size</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myDocs.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#999' }}>No documents found</td></tr>
              ) : myDocs.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{getFileIcon(d.type)}</span>
                      <strong>{d.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#666' }}>{d.desc || '—'}</td>
                  <td>
                    <span className="badge bg-purple">{ROLES.find(r => r.val === d.target)?.label || d.target}</span>
                  </td>
                  <td style={{ fontSize: 11 }}>{d.size || 'Unknown'}</td>
                  <td style={{ fontSize: 11 }}>{new Date(d.id).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-gold" onClick={() => downloadFile(d)}>⬇️ Download</button>
                    {isAdmin && (
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 5 }} onClick={() => deleteDoc(d.id)}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'upload' && (
        <UploadModal 
          onClose={() => setModal(null)} 
          onSave={async (newDoc) => {
            setBusy(true);
            try {
              const updated = [newDoc, ...docs];
              await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requests: [{ type: 'set', key: 'paav_documents', value: updated }] })
              });
              setDocs(updated);
              setModal(null);
            } catch (e) { alert(e.message); }
            finally { setBusy(false); }
          }}
          busy={busy}
        />
      )}
    </div>
  );
}

function UploadModal({ onClose, onSave, busy }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [target, setTarget] = useState('ALL');
  const [fileData, setFileData] = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setFileData({
        base64: ev.target.result,
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      if (!name) setName(file.name.split('.')[0]);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-hdr"><h3>➕ Upload Document</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="field">
            <label>Document Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Term 1 Circular" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief summary of the document..." rows={2} />
          </div>
          <div className="field">
            <label>Target Audience (Role)</label>
            <select value={target} onChange={e => setTarget(e.target.value)}>
              {ROLES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Select File</label>
            <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFile} />
            <div 
              style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              {fileData ? (
                <div>
                  <div style={{ fontSize: 32 }}>{getFileIcon(fileData.type)}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{fileData.name}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{fileData.size}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32 }}>☁️</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>Click to browse files</div>
                  <div style={{ fontSize: 11, color: '#666' }}>PDF, Image, Word, etc.</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !fileData || !name} onClick={() => onSave({
            id: Date.now(),
            name, desc, target,
            type: fileData.type,
            size: fileData.size,
            data: fileData.base64
          })}>
            {busy ? 'Uploading...' : '💾 Save & Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getFileIcon(type) {
  if (type.includes('pdf')) return '📕';
  if (type.includes('image')) return '🖼️';
  if (type.includes('word') || type.includes('officedocument')) return '📘';
  if (type.includes('excel') || type.includes('sheet')) return '📗';
  return '📄';
}

function downloadFile(doc) {
  const link = document.createElement('a');
  link.href = doc.data;
  link.download = doc.name + (doc.type.includes('pdf') ? '.pdf' : doc.type.includes('image') ? '.jpg' : '');
  link.click();
}
