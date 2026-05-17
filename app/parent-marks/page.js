'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_SUBJECTS, isJSSGrade, maxPts, gInfo } from '@/lib/cbe';

export default function ParentMarksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [child, setChild] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth');
      const auth = await authRes.json();
      if (!auth.ok || !auth.user || auth.user.role !== 'parent') {
        router.push('/');
        return;
      }
      setUser(auth.user);

      const dbRes = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { type: 'get', key: 'paav6_learners' },
            { type: 'get', key: 'paav6_marks' }
          ]
        })
      });
      const db = await dbRes.json();
      
      const learners = db.results[0]?.value || [];
      const mks = db.results[1]?.value || {};
      
      setChild(learners.find(l => l.adm === auth.user.childAdm));
      setMarks(mks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading || !user) return <div className="page on" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading report...</div>;

  if (!child) {
    return (
      <div className="page on" id="pg-parent-marks">
        <div className="page-hdr">
          <div>
            <h2>📊 Academic Report</h2>
            <p>No learner linked.</p>
          </div>
        </div>
      </div>
    );
  }

  const subjs = DEFAULT_SUBJECTS[child.grade] || [];
  const isJSS = isJSSGrade(child.grade);
  const mx = maxPts(child.grade, subjs);
  
  let totalPts = 0;
  let enteredSubjs = 0;
  
  const rows = subjs.map(s => {
    const mt = marks[`T1:${child.grade}|${s}|mt1`]?.[child.adm] ?? marks[`${child.grade}|${s}|mt1`]?.[child.adm];
    const et = marks[`T1:${child.grade}|${s}|et1`]?.[child.adm] ?? marks[`${child.grade}|${s}|et1`]?.[child.adm];
    const avg = (mt !== undefined && et !== undefined) ? Math.round((Number(mt) + Number(et)) / 2) : (mt !== undefined ? mt : et);
    
    const i = avg !== undefined ? gInfo(+avg, child.grade) : { lv: '—', pts: '—', c: 'var(--muted)', bg: '#F1F5F9' };
    
    if (avg !== undefined) {
      totalPts += i.pts;
      enteredSubjs++;
    }
    
    return (
      <tr key={s}>
        <td>{s}</td>
        <td style={{ textAlign: 'center' }}>{mt !== undefined ? mt : '—'}</td>
        <td style={{ textAlign: 'center' }}>{et !== undefined ? et : '—'}</td>
        <td style={{ textAlign: 'center', fontWeight: 800, background: i.bg, color: i.c }}>{avg !== undefined ? avg : '—'}</td>
        <td style={{ textAlign: 'center' }}><span className={`badge`} style={{ background: i.bg, color: i.c, fontWeight: 800, minWidth: '40px', display: 'inline-block' }}>{i.lv}</span></td>
        <td style={{ textAlign: 'center', fontWeight: 800, color: i.c }}>{i.pts}</td>
      </tr>
    );
  });

  return (
    <div className="page on" id="pg-parent-marks">
      <div className="page-hdr">
        <div>
          <h2>📊 Academic Report</h2>
          <p>{child.name} — {child.grade}</p>
        </div>
        <div className="page-hdr-acts">
          <button className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <div>
            <h3 style={{ margin: 0 }}>{child.grade} — Term 1 CBC Report</h3>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Total Points: <strong style={{ color: 'var(--navy)' }}>{totalPts}</strong> / {enteredSubjs > 0 ? enteredSubjs * (isJSS ? 8 : 4) : mx} 
              ({enteredSubjs} of {subjs.length} subjects entered)
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: 'center' }}>Mid-Term</th>
                  <th style={{ textAlign: 'center' }}>End-Term</th>
                  <th style={{ textAlign: 'center' }}>Average</th>
                  <th style={{ textAlign: 'center' }}>Level</th>
                  <th style={{ textAlign: 'center' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFF' }}>
                  <td colSpan="3" style={{ fontWeight: 700, padding: '10px 14px' }}>TOTAL</td>
                  <td colSpan="2" style={{ fontWeight: 800, fontSize: '13px', padding: '10px 14px', color: 'var(--navy)', textAlign: 'right' }}>{totalPts} pts</td>
                  <td style={{ fontWeight: 800, fontSize: '13px', padding: '10px 14px', color: 'var(--navy)', textAlign: 'center' }}>/ {mx} max</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
