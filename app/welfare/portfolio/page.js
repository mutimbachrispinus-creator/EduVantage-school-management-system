'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { ALL_GRADES } from '@/lib/cbe';

const M = '#8B1A1A', M2 = '#6B1212', ML = '#FDF2F2', MB = '#F5E6E6';

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  
  const [selGrade, setSelGrade] = useState('GRADE 7');
  const [selAdm, setSelAdm] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    const u = await getCachedUser();
    if (!u) { router.push('/'); return; }
    setUser(u);

    const db = await getCachedDBMulti(['paav6_learners', 'paav7_portfolio']);
    setLearners(db.paav6_learners || []);
    // Mock data if empty
    setPortfolio(db.paav7_portfolio || [
      { id: 1, adm: 'L001', title: 'Science Project: Solar System', desc: 'Created a scale model of the solar system using recycled materials.', date: '2026-04-15', tags: ['Creativity', 'Science'], img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400' },
      { id: 2, adm: 'L001', title: 'Music: Traditional Instruments', desc: 'Performed a folk song using the Nyatiti instrument.', date: '2026-04-20', tags: ['Arts', 'Culture'], img: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=400' }
    ]);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filteredLearners = useMemo(() => learners.filter(l => l.grade === selGrade), [learners, selGrade]);
  const learner = useMemo(() => learners.find(l => l.adm === selAdm), [learners, selAdm]);
  const items = useMemo(() => portfolio.filter(p => p.adm === selAdm), [portfolio, selAdm]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Opening Portfolio…</div>;

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>🎨 CBC Visual Portfolio</h2>
          <p>Capture and celebrate practical achievements beyond the report card</p>
        </div>
        {user.role !== 'parent' && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>+ New Achievement</button>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 25 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
            <label>Grade</label>
            <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelAdm(''); }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Learner</label>
            <select value={selAdm} onChange={e => setSelAdm(e.target.value)}>
              <option value="">— Select Learner —</option>
              {filteredLearners.map(l => <option key={l.adm} value={l.adm}>{l.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!learner ? (
        <div className="panel" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          Select a learner to view their visual learning journey
        </div>
      ) : (
        <div className="portfolio-grid">
          {items.map(item => (
            <div key={item.id} className="portfolio-card">
              <div className="pc-img" style={{ backgroundImage: `url(${item.img})` }}>
                <div className="pc-date">{new Date(item.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
              </div>
              <div className="pc-content">
                <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                  {item.tags.map(t => <span key={t} className="pc-tag">{t}</span>)}
                </div>
                <h3 className="pc-title">{item.title}</h3>
                <p className="pc-desc">{item.desc}</p>
                <div className="pc-footer">
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Recorded by Teacher Sarah</span>
                  <button className="btn-link" style={{ fontSize: 12 }}>View Full Gallery →</button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 100, color: 'var(--muted)', background: '#fff', borderRadius: 15 }}>
              <div style={{ fontSize: 50, marginBottom: 15 }}>📸</div>
              <h3>No portfolio items yet</h3>
              <p>Start capturing practical work, projects, and talents!</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 25px;
        }
        .portfolio-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          transition: transform 0.3s;
          border: 1px solid #eee;
        }
        .portfolio-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 35px rgba(139,26,26,0.1);
        }
        .pc-img {
          height: 200px;
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .pc-date {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255,255,255,0.9);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          color: ${M};
          backdrop-filter: blur(5px);
        }
        .pc-content {
          padding: 20px;
        }
        .pc-tag {
          background: ${ML};
          color: ${M};
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .pc-title {
          font-size: 18px;
          font-weight: 800;
          margin: 10px 0;
          color: var(--navy);
        }
        .pc-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 20px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pc-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 15px;
          border-top: 1px solid #f1f5f9;
        }
        @media (max-width: 600px) {
          .portfolio-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
