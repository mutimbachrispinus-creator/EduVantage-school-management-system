'use client';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/**
 * app/classes/[grade]/page.js — Class & stream list for a specific grade
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCachedUser, getCachedDBMulti } from '@/lib/client-cache';
import { getDefaultSubjects, fmtK } from '@/lib/cbe';
import PrintHeader from '@/components/PrintHeader';
import { useProfile } from '@/app/PortalShell';

export default function ClassPage() {
  const router = useRouter();
  const { grade: gradeParam } = useParams();
  const grade = decodeURIComponent(gradeParam || '');

  const [learners, setLearners] = useState([]);
  const [streams,  setStreams]  = useState([]);
  const [feeCfg,   setFeeCfg]  = useState({});
  const [loading,  setLoading] = useState(true);
  const [streamF,  setStreamF] = useState('');
  const [mounted,  setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      const [u, db] = await Promise.all([
        getCachedUser(),
        getCachedDBMulti(['paav6_learners', 'paav7_streams', 'paav6_feecfg'])
      ]);

      if (!u) { router.push('/'); return; }

      const all = (db.paav6_learners || []).filter(l => l.grade === grade);
      setLearners(all);
      setStreams(Array.isArray(db.paav7_streams) ? db.paav7_streams : []);
      setFeeCfg(db.paav6_feecfg || {});
    } catch (e) {
      console.error('ClassPage load error:', e);
    } finally {
      setLoading(false);
    }
  }, [grade, router]);

  useEffect(() => { load(); }, [load]);

  const { profile: school } = useProfile() || { profile: {} };
  const annualFee  = feeCfg[grade]?.annual || 5000;
  const allStreams  = [...new Set(learners.map(l => l.stream || 'Default').filter(Boolean))];
  const filtered   = learners.filter(l => !streamF || (l.stream || 'Default') === streamF);
  const subjects   = getDefaultSubjects(grade, school?.curriculum || 'CBC');

  if (!mounted || loading) return <div style={{ padding:40, color:'var(--muted)' }}>Loading class…</div>;

  return (
    <div className="page on">
      <PrintHeader />
      <div className="page-hdr">
        <div>
          <h2>🏫 {grade}{streamF && streamF !== 'Default' ? ` — ${streamF}` : ''}</h2>
          <p>{learners.length} learners enrolled · {subjects.length} learning areas</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/learners')}>
            ← All Learners
          </button>
          <button className="btn btn-primary btn-sm no-print" onClick={() => router.push(`/grades/report-card/bulk?grade=${encodeURIComponent(grade)}&stream=${encodeURIComponent(streamF === 'Default' ? '' : streamF)}`)}>
            🖨️ Stream Report Cards
          </button>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => {
            document.body.classList.add('print-landscape');
            window.print();
            setTimeout(() => document.body.classList.remove('print-landscape'), 1000);
          }}>
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Stream filter */}
      {allStreams.length > 1 && (
        <div className="tabs" style={{ marginBottom:16 }}>
          <button className={`tab-btn${!streamF?' on':''}`} onClick={() => setStreamF('')}>
            All ({learners.length})
          </button>
          {allStreams.map(s => (
            <button key={s} className={`tab-btn${streamF===s?' on':''}`}
              onClick={() => setStreamF(s)}>
              {s} ({learners.filter(l=>(l.stream||'Default')===s).length})
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="sg sg4" style={{ marginBottom:18 }}>
        {[
          { icon:'🎓', label:'Enrolled',     v: filtered.length },
          { icon:'♀',  label:'Girls',        v: filtered.filter(l=>l.sex==='Female').length },
          { icon:'♂',  label:'Boys',         v: filtered.filter(l=>l.sex==='Male').length   },
          { icon:'✅', label:'Fee Cleared',  v: filtered.filter(l=>{
              const paid=(l.t1||0)+(l.t2||0)+(l.t3||0); return paid>=annualFee;
            }).length },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{c.icon}</div>
            <div className="sc-n">{c.v}</div>
            <div className="sc-l">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Adm</th><th>Name</th><th>Sex</th>
                <th>Age</th><th>Stream</th><th>Parent</th><th>Phone</th>
                <th>Fee Paid</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const paid = (l.t1||0)+(l.t2||0)+(l.t3||0);
                const bal  = annualFee - paid;
                return (
                  <tr key={l.adm}>
                    <td style={{ color:'var(--muted)', fontSize:11 }}>{i+1}</td>
                    <td style={{ fontWeight:700 }}>{l.adm}</td>
                    <td style={{ fontWeight:600 }}>{l.name}</td>
                    <td>{l.sex}</td>
                    <td>{l.age}</td>
                    <td style={{ fontSize:11.5 }}>{l.stream || '—'}</td>
                    <td style={{ fontSize:11.5 }}>{l.parent || '—'}</td>
                    <td style={{ fontSize:11.5 }}>{l.phone  || '—'}</td>
                    <td>
                      {bal<=0
                        ? <span className="badge bg-green">Cleared</span>
                        : <span className="badge bg-amber">{fmtK(bal)}</span>}
                    </td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => router.push(`/learners/${encodeURIComponent(l.adm)}`)}>👁</button>
                      <button className="btn btn-gold btn-sm" style={{ marginLeft:4 }}
                        onClick={() => router.push(`/grades/report-card/${encodeURIComponent(l.adm)}`)}>📋</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
