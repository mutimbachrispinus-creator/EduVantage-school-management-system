'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti, mutateDB } from '@/lib/client-cache';
import { getCurriculum } from '@/lib/curriculum';
import { useProfile } from '@/app/PortalShell';

export default function LibraryPage() {
  const router = useRouter();
  const { profile: school } = useProfile();
  const curr = getCurriculum(school?.curriculum);
  const { ALL_GRADES, DEFAULT_SUBJECTS } = curr;

  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI State
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [modal, setModal] = useState(null); // 'add-book', 'issue-book'
  const [selectedBook, setSelectedBook] = useState(null);

  // Forms
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', grade: '', subject: '', stock: 1 });
  const [issueForm, setIssueForm] = useState({ learnerId: '', dueDate: '' });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav7_library', 'paav6_learners']);
    setBooks(db.paav7_library || []);
    setLearners(db.paav6_learners || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase());
      const matchGrade = filterGrade === 'ALL' || b.grade === filterGrade;
      return matchSearch && matchGrade;
    });
  }, [books, search, filterGrade]);

  const availableSubjects = useMemo(() => {
    return bookForm.grade ? (DEFAULT_SUBJECTS[bookForm.grade] || []) : [];
  }, [bookForm.grade, DEFAULT_SUBJECTS]);

  async function handleSaveBook(e) {
    e.preventDefault();
    if (!bookForm.title || !bookForm.grade || !bookForm.subject) return alert('Title, Grade, and Subject required');
    setSaving(true);
    
    const newBook = {
      ...bookForm,
      id: selectedBook ? selectedBook.id : 'bk_' + Date.now(),
      stock: parseInt(bookForm.stock),
      available: selectedBook ? (selectedBook.available + (parseInt(bookForm.stock) - selectedBook.stock)) : parseInt(bookForm.stock),
      issues: selectedBook ? selectedBook.issues : []
    };

    let updated = [];
    if (selectedBook) {
      updated = books.map(b => b.id === newBook.id ? newBook : b);
    } else {
      updated = [newBook, ...books];
    }

    try {
      await mutateDB('paav7_library', updated);
      setBooks(updated);
      setModal(null);
      setSelectedBook(null);
    } catch (e) {
      alert('Failed to save book');
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueBook(e) {
    e.preventDefault();
    if (!issueForm.learnerId || !issueForm.dueDate) return alert('Select learner and due date');
    if (selectedBook.available <= 0) return alert('No copies available');

    const learner = learners.find(l => l.adm === issueForm.learnerId || l.id === issueForm.learnerId);
    if (!learner) return alert('Learner not found');

    setSaving(true);
    const newIssue = {
      id: 'iss_' + Date.now(),
      learnerId: learner.adm || learner.id,
      learnerName: learner.name,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: issueForm.dueDate
    };

    const updatedBook = {
      ...selectedBook,
      available: selectedBook.available - 1,
      issues: [...(selectedBook.issues || []), newIssue]
    };

    const updatedBooks = books.map(b => b.id === updatedBook.id ? updatedBook : b);

    try {
      await mutateDB('paav7_library', updatedBooks);
      setBooks(updatedBooks);
      setModal(null);
    } catch (e) {
      alert('Failed to issue book');
    } finally {
      setSaving(false);
    }
  }

  async function handleReturnBook(bookId, issueId) {
    if (!confirm('Mark this book as returned?')) return;
    setSaving(true);

    const book = books.find(b => b.id === bookId);
    const updatedBook = {
      ...book,
      available: book.available + 1,
      issues: book.issues.filter(i => i.id !== issueId)
    };

    const updatedBooks = books.map(b => b.id === bookId ? updatedBook : b);

    try {
      await mutateDB('paav7_library', updatedBooks);
      setBooks(updatedBooks);
    } catch (e) {
      alert('Failed to return book');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    const updatedBooks = books.filter(b => b.id !== id);
    await mutateDB('paav7_library', updatedBooks);
    setBooks(updatedBooks);
  }

  if (loading || !user) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading Library...</div>;

  const isAdmin = ['admin', 'super-admin', 'admin_academics'].includes(user.role);

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>📚 Library Management</h2>
          <p>Curriculum-aware resource catalog and circulation</p>
        </div>
        {isAdmin && (
          <div className="page-hdr-acts">
            <button className="btn btn-primary btn-sm" onClick={() => {
              setSelectedBook(null);
              setBookForm({ title: '', author: '', isbn: '', grade: '', subject: '', stock: 1 });
              setModal('add-book');
            }}>➕ Add Resource</button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-hdr" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Search title or author..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none', width: '250px' }}
          />
          <select 
            value={filterGrade} 
            onChange={e => setFilterGrade(e.target.value)}
            style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none' }}
          >
            <option value="ALL">All Grades</option>
            {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <span style={{ margin: 'auto 0 auto auto', fontSize: 12, color: 'var(--muted)' }}>{filteredBooks.length} resources found</span>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Title & Author</th>
                <th>Curriculum Mapping</th>
                <th>Stock / Available</th>
                {isAdmin && <th>Active Issues</th>}
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.author || 'Unknown Author'} {b.isbn && `• ISBN: ${b.isbn}`}</div>
                  </td>
                  <td>
                    <span className="badge bg-blue" style={{ marginBottom: 4, display: 'inline-block' }}>{b.grade}</span>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{b.subject}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800 }}>
                      <span style={{ color: b.available > 0 ? 'var(--green)' : 'var(--red)' }}>{b.available}</span> / {b.stock}
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      {b.issues && b.issues.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {b.issues.map(iss => (
                            <div key={iss.id} style={{ fontSize: 10, background: '#F1F5F9', padding: '4px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{iss.learnerName} <br/><span style={{ color: 'var(--red)' }}>Due: {iss.dueDate}</span></span>
                              <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => handleReturnBook(b.id, iss.id)}>Return</button>
                            </div>
                          ))}
                        </div>
                      ) : <span style={{ fontSize: 11, color: 'var(--muted)' }}>No active issues</span>}
                    </td>
                  )}
                  {isAdmin && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        setSelectedBook(b);
                        setIssueForm({ learnerId: '', dueDate: '' });
                        setModal('issue-book');
                      }} disabled={b.available <= 0} title="Issue Book">📤</button>
                      
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        setSelectedBook(b);
                        setBookForm({ title: b.title, author: b.author, isbn: b.isbn, grade: b.grade, subject: b.subject, stock: b.stock });
                        setModal('add-book');
                      }} title="Edit">✏️</button>

                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteBook(b.id)} title="Delete">🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredBooks.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 3} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No books found for this criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add-book' && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-hdr">
              <h3>{selectedBook ? '✏️ Edit Resource' : '➕ Add Resource'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveBook}>
                <div className="field">
                  <label>Title *</label>
                  <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} required />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Author</label>
                    <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>ISBN</label>
                    <input value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} />
                  </div>
                </div>
                
                <div className="field-row">
                  <div className="field">
                    <label>Target Grade *</label>
                    <select value={bookForm.grade} onChange={e => setBookForm({...bookForm, grade: e.target.value, subject: ''})} required>
                      <option value="">Select Grade...</option>
                      {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Curriculum Subject *</label>
                    <select value={bookForm.subject} onChange={e => setBookForm({...bookForm, subject: e.target.value})} required disabled={!bookForm.grade}>
                      <option value="">Select Subject...</option>
                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Total Copies in Stock *</label>
                  <input type="number" min="1" value={bookForm.stock} onChange={e => setBookForm({...bookForm, stock: e.target.value})} required />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Resource'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modal === 'issue-book' && selectedBook && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-hdr">
              <h3>📤 Issue Book</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 15, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                <strong>{selectedBook.title}</strong>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Available: {selectedBook.available} copies</div>
              </div>
              <form onSubmit={handleIssueBook}>
                <div className="field">
                  <label>Select Learner *</label>
                  <select value={issueForm.learnerId} onChange={e => setIssueForm({...issueForm, learnerId: e.target.value})} required>
                    <option value="">Select Learner...</option>
                    {learners.map(l => (
                      <option key={l.id} value={l.adm || l.id}>{l.name} ({l.adm || l.grade})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Expected Return Date *</label>
                  <input type="date" value={issueForm.dueDate} onChange={e => setIssueForm({...issueForm, dueDate: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Processing...' : 'Issue Book'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bg-blue { background: #DBEAFE; color: #1D4ED8; }
      `}</style>
    </div>
  );
}
