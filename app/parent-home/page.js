'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_SUBJECTS, gInfo, fmtK } from '@/lib/cbe';

const M = '#8B1A1A', M2 = '#6B1212', ML = '#FDF2F2', MB = '#F5E6E6';

export default function ParentHome() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('paav_cache_user');
      if (raw) {
        const { v } = JSON.parse(raw);
        return v;
      }
    } catch {}
    return null;
  });
  const [children, setChildren] = useState([]); // multiple children
  const [selAdm, setSelAdm] = useState(null);   // selected child adm
  const [messages, setMessages] = useState([]);
  const [feeCfg, setFeeCfg] = useState({});
  const [marks, setMarks] = useState({});
  const [payInfo, setPayInfo] = useState({});
  const [paylog, setPaylog] = useState([]);
  const [events, setEvents] = useState([]);
  const [fullTT, setFullTT] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('child');
  const [term, setTerm] = useState('T1');
  const [assess, setAssess] = useState('et1');
  const [schools, setSchools] = useState([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [addChildForm, setAddChildForm] = useState({ schoolId: '', adm: '' });
  const [addChildBusy, setAddChildBusy] = useState(false);
  const [addChildMsg, setAddChildMsg] = useState('');
  const [addChildErr, setAddChildErr] = useState('');

  useEffect(() => {
    fetch('/api/saas/schools')
      .then(r => r.json())
      .then(d => { if (d.ok) setSchools(d.schools || []); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth');
      const auth = await authRes.json();
      if (!auth.ok || !auth.user || auth.user.role !== 'parent') { router.push('/'); return; }
      setUser(auth.user);

      const links = auth.user.links || [];
      const uniqueTenants = Array.from(new Set(links.map(l => l.tenantId).filter(Boolean)));
      if (uniqueTenants.length === 0) {
        // Fallback to current tenant if no links found (should not happen with new whoami)
        uniqueTenants.push(auth.user.tenantId);
      }

      let allLearners = [];
      let allMarks = {};
      let allPaylogs = [];
      let allMsgs = [];
      let allProfiles = {};
      let primaryProfile = {};
      let primaryFeeCfg = {};

      await Promise.all(uniqueTenants.map(async (tid) => {
        const dbRes = await fetch('/api/db', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid },
          body: JSON.stringify({ requests: [
            { type: 'get', key: 'paav6_learners' },
            { type: 'get', key: 'paav6_msgs' },
            { type: 'get', key: 'paav6_feecfg' },
            { type: 'get', key: 'paav6_marks' },
            { type: 'get', key: 'paav_paybill_accounts' },
            { type: 'get', key: 'paav_calendar_events' },
            { type: 'get', key: 'paav_documents' },
            { type: 'get', key: 'paav6_paylog' },
            { type: 'get', key: 'paav_school_profile' },
            { type: 'get', key: 'paav_timetable' },
            { type: 'get', key: 'paav_profiles' },
          ]})
        });
        const db = await dbRes.json();
        if (!db.results) return;

        const learners = db.results[0]?.value || [];
        const msgs = db.results[1]?.value || [];
        const fees = db.results[2]?.value || {};
        const mks = db.results[3]?.value || {};
        const payHistory = db.results[7]?.value || [];
        const profile = db.results[8]?.value || {};
        const fullTTData = db.results[9]?.value || {};
        const profiles = db.results[10]?.value || {};

        allLearners = [...allLearners, ...learners];
        allMarks = { ...allMarks, ...mks };
        allPaylogs = [...allPaylogs, ...payHistory];
        allMsgs = [...allMsgs, ...msgs];
        allProfiles = { ...allProfiles, ...profiles };

        if (tid === auth.user.tenantId || !primaryProfile.name) {
          primaryProfile = profile;
          primaryFeeCfg = fees;
          setPayInfo({
            accounts: db.results[4]?.value || [],
            documents: db.results[6]?.value || [],
            profile: profile
          });
          setEvents(db.results[5]?.value || []);
          setFullTT(fullTTData);
        }
      }));

      const admList = links.flatMap(l => (l.adm || '').split(',').map(s => s.trim()).filter(Boolean));
      
      const myKids = allLearners.filter(l => admList.includes(l.adm)).map(l => {
        const extra = allProfiles[l.adm] || {};
        return { 
          ...l, 
          bloodGroup: extra.blood || l.bloodGroup,
          medicalCondition: extra.medical || l.medicalCondition,
          address: extra.address || l.addr,
          father: extra.father,
          mother: extra.mother,
          transport: extra.transport,
          allergies: extra.allergies || l.allergies,
          emergencyContact: extra.emergency || l.emergencyContact
        };
      });
      setChildren(myKids);
      if (!selAdm && myKids.length > 0) setSelAdm(myKids[0].adm);

      setMessages(allMsgs);
      setFeeCfg(primaryFeeCfg);
      setMarks(allMarks);
      setPaylog(allPaylogs);
      setLoading(false);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, [router, selAdm]);

  useEffect(() => { load(); }, [load]);

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      try {
        const staffRes = await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ requests:[{ type:'get', key:'paav6_staff' }] })
        });
        const sdb = await staffRes.json();
        const staffList = sdb.results[0]?.value||[];
        const idx = staffList.findIndex(s=>s.id===user.id);
        if (idx>=0) { staffList[idx].avatar=dataUrl; }
        else { staffList.push({ id:user.id, avatar:dataUrl }); }
        await fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ requests:[{ type:'set', key:'paav6_staff', value:staffList }] })
        });
        setUser(u=>({...u, avatar:dataUrl}));
      } catch(err) { alert('Upload failed: '+err.message); }
    };
    reader.readAsDataURL(file);
  }

  /* ── M-Pesa STK Push ── */
  async function initiateMpesa(account, termLabel) {
    const phone = user.phone || prompt('Enter M-Pesa Phone Number (07xxxxxxxx):');
    if (!phone) return;
    
    const amount = prompt(`Enter amount to pay for ${termLabel}:`, '1000');
    if (!amount || isNaN(amount)) return;

    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          amount: Number(amount),
          accountRef: child.adm,
          term: termLabel.replace('Term ', 'T'),
          description: `${child.name} Fees`,
          paybillId: account.id
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ M-Pesa prompt sent to your phone! Please enter your PIN to complete payment.');
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to initiate M-Pesa.'));
      }
    } catch (err) {
      alert('❌ Connection error: ' + err.message);
    }
  }

  function printReceipt(p) {
    const win = window.open('', '_blank');
    if (!win) {
      alert('⚠️ Popup blocked! Please allow popups for this site to download receipts.');
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Fee Receipt - ${child.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .receipt { border: 2px solid #333; padding: 30px; max-width: 600px; margin: auto; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; color: #8B1A1A; }
            .school { font-size: 18px; font-weight: 700; margin: 5px 0; }
            .title { font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 10px; text-decoration: underline; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
            .label { font-weight: 700; color: #666; }
            .val { font-weight: 900; }
            .total { font-size: 22px; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; font-style: italic; color: #777; }
            .stamp { position: absolute; bottom: 60px; right: 40px; border: 3px solid rgba(139,26,26,.3); color: rgba(139,26,26,.3); padding: 10px; border-radius: 10px; transform: rotate(-15deg); font-weight: 900; text-transform: uppercase; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">
                <img src="${payInfo.profile?.logo || ''}" style="width:50px; height:50px; border-radius:50%;" />
              </div>
              <div class="school">${payInfo.profile?.name || 'OFFICIAL FEE RECEIPT'}</div>
              <div class="title">No: ${p.id || 'N/A'}</div>
            </div>
            <div class="row"><span class="label">Student Name:</span> <span class="val">${child.name}</span></div>
            <div class="row"><span class="label">Admission No:</span> <span class="val">${child.adm}</span></div>
            <div class="row"><span class="label">Grade:</span> <span class="val">${child.grade}</span></div>
            <div class="row"><span class="label">Date:</span> <span class="val">${new Date(p.time).toLocaleString()}</span></div>
            <div class="row"><span class="label">Payment Mode:</span> <span class="val">${p.method || 'MPESA'}</span></div>
            <div class="row"><span class="label">Reference:</span> <span class="val">${p.ref || 'N/A'}</span></div>
            <div class="total row"><span class="label">Amount Paid:</span> <span class="val">KES ${fmtK(p.amount)}</span></div>
            <div class="stamp">OFFICIAL PAID</div>
            <div class="footer">
              This is a system generated receipt.<br/>
              Thank you for your payment.
            </div>
          </div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  if (loading || !user) return <div className="page on" style={{padding:60,textAlign:'center',color:'var(--muted)'}}>Loading…</div>;
  if (!user) return null;

  const child = children.find(c=>c.adm===selAdm) || children[0];

  if (children.length === 0) {
    return (
      <div className="page on">
        <div style={{background:`linear-gradient(135deg,${M},${M2})`,padding:24,borderRadius:12,color:'#fff',marginBottom:22}}>
          <h2>Welcome, {user?.name}</h2>
          <p>No learner linked to your account. Contact school admin.</p>
        </div>
      </div>
    );
  }

  const exp = feeCfg[child?.grade]?.annual || 5000;
  const paid = (child?.t1||0)+(child?.t2||0)+(child?.t3||0);
  const bal = exp + (child?.arrears || 0) - paid;
  const subjs = DEFAULT_SUBJECTS[child?.grade] || [];
  const unr = messages.filter(m=>m.to==='ALL'||m.to==='ALL_PARENTS'||m.to===user.username).filter(m=>!(m.read||[]).includes(user.username)).length;

  const TABS = [
    { id:'child',    label:'👦 Profile',      icon:'👦' },
    { id:'perf',     label:'📊 Academic',     icon:'📊' },
    { id:'fees',     label:'💰 Finance',      icon:'💰' },
    { id:'payments', label:'🧾 Receipts',     icon:'🧾' },
    { id:'timetable',label:'🗓 Timetable',    icon:'🗓' },
    { id:'calendar', label:'📅 Calendar',     icon:'📅' },
    { id:'msgs',     label:`💬 Messages${unr>0?` (${unr})`:''}`, icon:'💬' },
    { id:'docs',     label:'📂 Files',        icon:'📂' },
    { id:'addchild', label:'➕ Add Child',    icon:'➕' },
  ];

  const upcomingEvents = events
    .filter(e=>e.date >= new Date().toISOString().split('T')[0])
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(0,10);

  return (
    <div className="page on" id="pg-parent-home">
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${M},${M2})`,padding:'20px 24px',borderRadius:12,color:'#fff',marginBottom:18,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        {/* School Logo / Profile photo */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="photo-upload-wrapper" onClick={()=>fileRef.current?.click()} title="Click to change photo">
            <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,.2)',border:'2px solid rgba(255,255,255,.4)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,cursor:'pointer'}}>
              {user.avatar ? <img src={user.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="Profile" /> : '👤'}
            </div>
            <div className="photo-upload-btn">📷</div>
            <input ref={fileRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={uploadPhoto} />
          </div>
          {payInfo.profile?.logo && (
            <div style={{ width: 60, height: 60, borderRadius: 12, background: '#fff', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)' }}>
               <img src={payInfo.profile.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="School Logo" />
            </div>
          )}
        </div>
        <div style={{flex:1}}>
          <h2 style={{fontSize:20,margin:0}}>Welcome, {user?.name}</h2>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, fontWeight: 700 }}>{payInfo.profile?.name || 'EduVantage School'}</div>
          {children.length > 1 && (
            <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
              {children.map(c=>(
                <button key={c.adm} onClick={()=>setSelAdm(c.adm)}
                  style={{padding:'3px 10px',borderRadius:20,border:'1.5px solid rgba(255,255,255,.4)',background:selAdm===c.adm?'rgba(255,255,255,.25)':'transparent',color:'#fff',cursor:'pointer',fontSize:11,fontWeight:700}}>
                  {c.name.split(' ')[0]} ({c.grade.replace('GRADE ','G')})
                </button>
              ))}
            </div>
          )}
          {children.length === 1 && (
            <p style={{margin:0,opacity:.9,fontSize:13}}>Monitoring: <strong style={{color:'#FCD34D'}}>{child?.name}</strong> — {child?.grade} · {child?.adm}</p>
          )}
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,opacity:.7,marginBottom:2}}>Fee Balance</div>
          <div style={{fontSize:20,fontWeight:900,color:bal<=0?'#86EFAC':'#FCA5A5'}}>{fmtK(bal)}</div>
          <div style={{fontSize:9,opacity:.7}}>{bal<=0?'✅ Cleared':'⚠ Outstanding'}</div>
        </div>
      </div>

      {/* Child selector for multiple children */}
      {children.length > 1 && (
        <div style={{background:ML,borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:12,color:M}}>📋 Viewing:</span>
          {children.map(c=>(
            <button key={c.adm} onClick={()=>setSelAdm(c.adm)}
              style={{padding:'5px 14px',borderRadius:20,border:`1.5px solid ${selAdm===c.adm?M:'var(--border)'}`,background:selAdm===c.adm?M:'#fff',color:selAdm===c.adm?'#fff':'var(--navy)',cursor:'pointer',fontSize:12,fontWeight:700,transition:'all .2s'}}>
              {c.name} · {c.grade}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:16,background:MB,borderRadius:10,padding:4}}>
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?' on':''}`}
            style={tab===t.id?{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff',boxShadow:`0 2px 10px rgba(139,26,26,.3)`}:{}}
            onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* MY CHILD TAB */}
      {tab==='child' && (
        <div className="sg sg3">
          <div className="stat-card" style={{borderTop:`4px solid ${M}`}}>
            <div className="sc-inner">
              <div className="sc-icon" style={{background:'#EFF6FF',fontSize:22}}>🎓</div>
              <div><div className="sc-n" style={{color:M}}>{child?.grade}</div><div className="sc-l">Current Grade</div></div>
            </div>
          </div>
          <div className="stat-card" style={{borderTop:`4px solid ${bal<=0?'#059669':M}`}}>
            <div className="sc-inner">
              <div className="sc-icon" style={{background:bal<=0?'#ECFDF5':'#FEF2F2',fontSize:22}}>💰</div>
              <div><div className="sc-n" style={{color:bal<=0?'#059669':M}}>{fmtK(bal)}</div><div className="sc-l">Fee Balance</div></div>
            </div>
          </div>
          <div className="stat-card" style={{borderTop:`4px solid #7C3AED`}}>
            <div className="sc-inner">
              <div className="sc-icon" style={{background:'#F5F3FF',fontSize:22}}>💬</div>
              <div><div className="sc-n" style={{color:'#7C3AED'}}>{unr}</div><div className="sc-l">New Messages</div></div>
            </div>
          </div>
          {/* Child info card */}
          <div className="panel" style={{gridColumn:'1/-1',border:`1.5px solid ${MB}`}}>
            <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
              <h3 style={{color:'#fff'}}>👦 {child?.name} — Profile</h3>
            </div>
            <div className="panel-body">
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20}}>
                <div>
                  <div style={{fontSize:11, fontWeight:800, color:M, textTransform:'uppercase', marginBottom:12}}>Basic Information</div>
                  {[
                    ['Admission No.', child?.adm],
                    ['Full Name', child?.name],
                    ['Grade / Class', child?.grade],
                    ['Stream', child?.stream || '—'],
                    ['DOB', child?.dob || '—'],
                    ['Gender', child?.sex === 'F' ? 'Female' : 'Male'],
                  ].map(([l, v]) => (
                    <div key={l} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13}}>
                      <span style={{color: 'var(--muted)', fontWeight: 600}}>{l}</span>
                      <span style={{fontWeight: 700}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{fontSize:11, fontWeight:800, color:M, textTransform:'uppercase', marginBottom:12}}>Guardian & Transport</div>
                  {[
                    ['Father', child?.father || '—'],
                    ['Mother', child?.mother || '—'],
                    ['Primary Parent', child?.parent || user.name],
                    ['Phone Number', child?.phone || '—'],
                    ['Home Address', child?.address || '—'],
                    ['Transport Route', child?.transport || '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13}}>
                      <span style={{color: 'var(--muted)', fontWeight: 600}}>{l}</span>
                      <span style={{fontWeight: 700}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Medical Records Card */}
          <div className="panel" style={{gridColumn:'1/-1', border: '1.5px solid #FECACA', background: '#FFFBFB'}}>
            <div className="panel-hdr" style={{background: 'linear-gradient(135deg, #DC2626, #991B1B)', color: '#fff'}}>
              <h3 style={{color: '#fff'}}>🏥 Medical Records & Emergency</h3>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 10, color: '#991B1B', fontWeight: 800, textTransform: 'uppercase' }}>🩸 Blood Group</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>{child?.bloodGroup || '—'}</div>
                </div>
                <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 10, color: '#991B1B', fontWeight: 800, textTransform: 'uppercase' }}>🚨 Emergency Contact</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginTop: 4 }}>{child?.emergencyContact || '—'}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>🥜 Allergies</div>
                <div style={{ padding: '8px 12px', background: child?.allergies ? '#FEF2F2' : '#F9FAFB', borderRadius: 8, fontSize: 13, border: '1px solid #E5E7EB', color: child?.allergies ? '#991B1B' : '#6B7280', fontWeight: child?.allergies ? 700 : 400 }}>
                  {child?.allergies || 'No known allergies reported'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>📝 Medical Conditions / Notes</div>
                <div style={{ padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, fontSize: 13, border: '1px solid #E5E7EB', color: '#374151', minHeight: 40 }}>
                  {child?.medicalCondition || 'No medical conditions reported'}
                </div>
              </div>

              <div style={{ marginTop: 15, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🔒 This information is confidential and only accessible by authorized staff.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {tab==='perf' && (
        <div className="animate-in">
          <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',background:MB,padding:10,borderRadius:12}}>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:800,color:M,textTransform:'uppercase',display:'block',marginBottom:4}}>Academic Period</label>
              <select value={term} onChange={e=>setTerm(e.target.value)} style={{width:'100%',borderRadius:8,padding:'8px 12px',border:`1.5px solid ${MB}`,fontSize:13,fontWeight:700,outline:'none',background:'#fff'}}>
                <option value="T1">Term 1</option><option value="T2">Term 2</option><option value="T3">Term 3</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:800,color:M,textTransform:'uppercase',display:'block',marginBottom:4}}>Assessment Type</label>
              <select value={assess} onChange={e=>setAssess(e.target.value)} style={{width:'100%',borderRadius:8,padding:'8px 12px',border:`1.5px solid ${MB}`,fontSize:13,fontWeight:700,outline:'none',background:'#fff'}}>
                <option value="op1">Opener Assessment</option><option value="mt1">Mid-Term Assessment</option><option value="et1">Final Assessment</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Subject Mastery List */}
            <div className="panel" style={{border:`1.5px solid ${MB}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)'}}>
              <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{color:'#fff', margin:0}}>🎯 {child?.name.split(' ')[0]}'s Mastery</h3>
                <button 
                  onClick={() => window.open(`/report-card?adm=${child.adm}&grade=${child.grade}&term=${term}&assess=${assess}`, '_blank')}
                  style={{ background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 8, color: '#fff', padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  📜 View Report Card
                </button>
              </div>
              <div className="panel-body" style={{padding:'5px 15px'}}>
                {subjs.map(s => {
                  const key = `${term}:${child?.grade}|${s}|${assess}`;
                  const sc = marks[key]?.[child?.adm];
                  const info = sc!=null ? gInfo(Number(sc),child?.grade) : null;
                  const isCBC = (child?.grade || '').startsWith('GRADE') || (child?.grade || '').startsWith('PP');
                  
                  return (
                    <div key={s} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #F1F5F9'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14,color:'var(--navy)'}}>{s}</div>
                        <div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>{assess.toUpperCase()} · {term}</div>
                      </div>
                      {sc!=null ? (
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:900,fontSize:18,color:info.c}}>{sc}<span style={{fontSize:10,fontWeight:700}}>%</span></div>
                          <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:900,background:info.bg,color:info.c,border:`1px solid ${info.c}33`}}>
                            {isCBC ? info.lv : info.lv}
                          </span>
                        </div>
                      ) : <span style={{color:'#CBD5E1',fontSize:11,fontStyle:'italic'}}>Pending...</span>}
                    </div>
                  );
                })}
                {subjs.length===0&&<div style={{color:'var(--muted)',padding:40,textAlign:'center'}}>No curriculum data found.</div>}
              </div>
            </div>

            {/* Premium Analytics Panel */}
            <div className="panel" style={{ border: '1.5px solid #BFDBFE', background: '#F8FAFF' }}>
              <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)', color: '#fff' }}>
                <h3 style={{ color: '#fff' }}>🛡️ Competency Analysis</h3>
              </div>
              <div className="panel-body" style={{ padding: 20 }}>
                {(() => {
                  const scores = subjs.map(s => {
                    const sc = marks[`${term}:${child?.grade}|${s}|${assess}`]?.[child?.adm];
                    return sc != null ? { s, sc: Number(sc) } : null;
                  }).filter(Boolean);
                  
                  if (!scores.length) return (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: 48, marginBottom: 15 }}>📝</div>
                      <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Assessment in Progress</div>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Results for this period haven't been published yet. Please check back later.</p>
                    </div>
                  );

                  const avg = Math.round(scores.reduce((a, b) => a + b.sc, 0) / scores.length);
                  const info = gInfo(avg, child?.grade);
                  const best = scores.reduce((a, b) => a.sc > b.sc ? a : b);
                  const worst = scores.reduce((a, b) => a.sc < b.sc ? a : b);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '8px solid #E2E8F0' }} />
                        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: `8px solid ${info.c}`, borderTopColor: 'transparent', transform: `rotate(${avg * 3.6}deg)`, transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                        <div style={{ textAlign: 'center', zIndex: 1 }}>
                          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--navy)', lineHeight: 1 }}>{avg}%</div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: info.c, textTransform: 'uppercase' }}>{info.lv}</div>
                        </div>
                      </div>

                      <div style={{ background: '#fff', padding: 15, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12, borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>📊 Subject Trends</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {scores.sort((a,b)=>b.sc - a.sc).slice(0, 5).map(s => {
                            const si = gInfo(s.sc, child?.grade);
                            return (
                              <div key={s.s}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                                  <span>{s.s}</span>
                                  <span style={{ color: si.c }}>{s.sc}%</span>
                                </div>
                                <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${s.sc}%`, background: si.c, borderRadius: 3 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 12, border: '1px solid #DCFCE7' }}>
                          <div style={{ fontSize: 9, color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>🌟 Strongest</div>
                          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{best.s}</div>
                        </div>
                        <div style={{ background: '#FFF7ED', padding: 12, borderRadius: 12, border: '1px solid #FFEDD5' }}>
                          <div style={{ fontSize: 9, color: '#9A3412', fontWeight: 800, textTransform: 'uppercase' }}>🚀 Growth Area</div>
                          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{worst.s}</div>
                        </div>
                      </div>

                      <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)', padding: 15, borderRadius: 12, color: '#fff', textAlign: 'center' }}>
                         <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>PREDICTED COMPETENCY</div>
                         <div style={{ fontSize: 18, fontWeight: 900 }}>{info.desc}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAY FEES TAB */}
      {tab==='fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Fee Overview Card with Chart */}
            <div className="panel" style={{ border: `1.5px solid #A7F3D0`, background: '#fff', borderRadius: 20 }}>
              <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #047857, #065F46)', color: '#fff', borderRadius: '20px 20px 0 0' }}>
                <h3 style={{ color: '#fff' }}>📊 Fee Status Overview</h3>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '30px 25px' }}>
                <div style={{ 
                  width: 160, height: 160, borderRadius: '50%', 
                  background: `conic-gradient(#059669 ${Math.min(100, Math.round((paid/exp)*100))}%, #F1F5F9 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  boxShadow: '0 10px 25px rgba(4, 120, 87, 0.15)'
                }}>
                  <div style={{ width: 130, height: 130, background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#065F46' }}>{Math.min(100, Math.round((paid/exp)*100))}%</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Paid</div>
                  </div>
                </div>
                
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                   <div style={{ background: '#ECFDF5', padding: 14, borderRadius: 14, border: '1px solid #A7F3D0', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#059669', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Paid So Far</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#065F46' }}>{fmtK(paid)}</div>
                   </div>
                   <div style={{ background: bal > 0 ? '#FEF2F2' : '#ECFDF5', padding: 14, borderRadius: 14, border: bal > 0 ? '1px solid #FECACA' : '1px solid #A7F3D0', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: bal > 0 ? '#B91C1C' : '#059669', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{bal > 0 ? 'Outstanding' : 'Status'}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: bal > 0 ? '#B91C1C' : '#065F46' }}>{bal > 0 ? fmtK(bal) : 'CLEARED'}</div>
                   </div>
                </div>
                
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic', background: '#F8FAFC', padding: '8px 16px', borderRadius: 20 }}>
                  Annual fee requirement: <strong style={{color: 'var(--navy)'}}>{fmtK(exp)}</strong>
                </div>
              </div>
            </div>

            {/* Detailed Fee Analytics (Breakdown) */}
            <div className="panel" style={{ border: `1.5px solid #E2E8F0`, background: '#fff', borderRadius: 20 }}>
              <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: '#fff', borderRadius: '20px 20px 0 0' }}>
                <h3 style={{ color: '#fff' }}>📝 Fee Structure Breakdown</h3>
              </div>
              <div className="panel-body" style={{ padding: 25 }}>
                {(() => {
                  const cfg = feeCfg[child?.grade] || {};
                  const items = [
                    { label: 'Tuition & Basic', val: cfg.annual || 0 },
                    { label: 'Transport / Bus', val: cfg.transport || 0 },
                    { label: 'Lunch / Boarding', val: cfg.lunch || 0 },
                    { label: 'Activities / Uniform', val: cfg.other || 0 },
                    { label: 'Previous Arrears', val: child?.arrears || 0, isRed: true },
                  ].filter(i => i.val > 0);

                  if (items.length === 0) return <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Detailed breakdown not yet configured.</div>;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {items.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i === items.length - 1 ? 'none' : '1px dashed #E2E8F0' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{it.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: it.isRed ? '#B91C1C' : 'var(--navy)' }}>KES {fmtK(it.val)}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 10, padding: 12, background: '#F1F5F9', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>TOTAL REQUIREMENT</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)' }}>KES {fmtK(exp + (child?.arrears || 0))}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Termly Progress */}
            <div className="panel" style={{ border: `1.5px solid #E2E8F0`, borderRadius: 20 }}>
              <div className="panel-hdr" style={{ background: `linear-gradient(135deg, #4F46E5, #3730A3)`, color: '#fff', borderRadius: '20px 20px 0 0' }}>
                <h3 style={{ color: '#fff' }}>📅 Termly Payment Cycle</h3>
              </div>
              <div className="panel-body" style={{ padding: 25 }}>
                {[['Term 1',child?.t1||0],['Term 2',child?.t2||0],['Term 3',child?.t3||0]].map(([l,p], i)=>{
                  const due = feeCfg[child?.grade]?.[l.toLowerCase().replace(' ','')]||Math.round(exp/3);
                  const termPct = Math.min(100, Math.round((p/due)*100));
                  return (
                    <div key={l} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{l}</span>
                        <span style={{ fontWeight: 800, color: p >= due ? '#059669' : '#1E40AF' }}>KES {fmtK(p)} / {fmtK(due)}</span>
                      </div>
                      <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${termPct}%`, height: '100%', background: p >= due ? '#059669' : '#3B82F6', borderRadius: 5, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Gateway (Configured by Admin) */}
            <div className="panel" style={{ border: `1.5px solid #A7F3D0`, borderRadius: 20 }}>
              <div className="panel-hdr" style={{ background: 'linear-gradient(135deg, #047857, #065F46)', color: '#fff', borderRadius: '20px 20px 0 0' }}>
                <h3 style={{ color: '#fff' }}>💳 Institutional Payment Gateway</h3>
              </div>
              <div className="panel-body" style={{ padding: 25 }}>
                {(payInfo.accounts?.length > 0 || payInfo.profile?.bankAccounts?.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {payInfo.accounts?.map(acc => (
                      <div key={acc.id} style={{ background: '#fff', border: `1.5px solid #E2E8F0`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, transition: '0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>{acc.type === 'M-Pesa' ? 'STK Push Supported' : acc.type.toUpperCase()}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#065F46' }}>{acc.shortcode || acc.accNo}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{acc.name}</div>
                          </div>
                          <div style={{ background: '#ECFDF5', padding: '4px 10px', borderRadius: 20, fontSize: 10, color: '#059669', fontWeight: 900 }}>{acc.type === 'M-Pesa' ? 'M-PESA' : 'BANK'}</div>
                        </div>
                        
                        {acc.type === 'M-Pesa' && (
                          <button 
                            className="btn btn-success btn-sm w-full" 
                            style={{ background: '#059669', border: 'none', height: 42, borderRadius: 10, fontWeight: 800, boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
                            onClick={() => initiateMpesa(acc, 'Term ' + term.replace('T', ''))}
                          >
                            🚀 Pay Now with M-Pesa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                    <p style={{ fontSize: 13, color: '#64748B' }}>Institutional payment gateways are currently offline. Please contact the administrator for banking details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIMETABLE TAB */}
      {tab==='timetable' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>🗓 {child?.grade} Timetable</h3>
          </div>
          <div className="panel-body">
            {(() => {
              const gradeTT = fullTT[child?.grade] || {};
              const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
              if (Object.keys(gradeTT).length === 0) return <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Timetable not yet published for {child?.grade}.</div>;
              return (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr>
                        <th style={{background:'#F1F5F9',padding:10,border:'1px solid #E2E8F0',width:60}}>Per.</th>
                        {DAYS.map(d=><th key={d} style={{background:'#F1F5F9',padding:10,border:'1px solid #E2E8F0'}}>{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({length: 8}, (_,pi)=>(
                        <tr key={pi}>
                          <td style={{textAlign:'center',fontWeight:700,border:'1px solid #E2E8F0',padding:8}}>{pi+1}</td>
                          {DAYS.map(day=>{
                            const slot = (gradeTT[day]||{})[pi+1];
                            return (
                              <td key={day} style={{border:'1px solid #E2E8F0',padding:4,verticalAlign:'top'}}>
                                {slot?.subject ? (
                                  <div style={{padding:6,background:'#F8FAFC',borderRadius:6}}>
                                    <div style={{fontWeight:800,color:M}}>{slot.subject}</div>
                                    <div style={{fontSize:10,color:'var(--muted)'}}>{slot.teacher}</div>
                                  </div>
                                ) : <div style={{textAlign:'center',color:'#CBD5E1'}}>—</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* PAYMENTS HISTORY TAB */}
      {tab==='payments' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,#047857,#065F46)`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>🧾 Official Payment Receipts</h3>
          </div>
          <div className="panel-body" style={{padding:0}}>
            {(() => {
              const myPays = paylog.filter(p => p.adm === child.adm).sort((a,b) => new Date(b.time) - new Date(a.time));
              if (myPays.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No receipts found for this learner.</div>;
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '14px 20px', textAlign: 'left' }}>Date & Ref</th>
                        <th style={{ padding: '14px 20px', textAlign: 'left' }}>For</th>
                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '14px 20px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myPays.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700 }}>{new Date(p.time || p.date).toLocaleDateString()}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{p.ref || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 600 }}>{p.term || 'Fees'}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.method || 'M-Pesa'}</div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: 15 }}>
                            {fmtK(p.amount)}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(p)}>🖨️ View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab==='calendar' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>📅 School Calendar</h3>
          </div>
          <div className="panel-body">
            {upcomingEvents.length===0 ? (
              <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
                <div style={{fontSize:36,marginBottom:8}}>📅</div>
                No upcoming events. Events are added by school administration.
              </div>
            ) : upcomingEvents.map((ev,i)=>(
              <div key={i} style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
                <div style={{minWidth:52,textAlign:'center',background:`${M}15`,border:`1.5px solid ${MB}`,borderRadius:8,padding:'6px 4px'}}>
                  <div style={{fontSize:10,fontWeight:800,color:M,textTransform:'uppercase'}}>{ev.date.split('-')[1] && ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+ev.date.split('-')[1]]}</div>
                  <div style={{fontSize:20,fontWeight:900,color:M,lineHeight:1}}>{ev.date.split('-')[2]}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{ev.title}</div>
                  {ev.desc&&<div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{ev.desc}</div>}
                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{ev.date}</div>
                </div>
                {ev.type&&<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:`${M}15`,color:M}}>{ev.type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab==='msgs' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>💬 School Messages</h3>
          </div>
          <div className="panel-body">
            {messages.filter(m=>m.to==='ALL'||m.to==='ALL_PARENTS'||m.to===user.username||m.from===user.username)
              .slice(-20).reverse().map((m,i)=>(
              <div key={i} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:13,color:M}}>{m.from===user.username?`To: ${m.to}`:`From: ${m.from}`}</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(m.time||Date.now()).toLocaleString()}</span>
                </div>
                <div style={{fontSize:13,color:'#334155'}}>{m.text}</div>
              </div>
            ))}
            {messages.filter(m=>m.to==='ALL'||m.to==='ALL_PARENTS'||m.to===user.username).length===0&&(
              <div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:30}}>No messages yet</div>
            )}
          </div>
        </div>
      )}
      {/* DOCUMENTS TAB */}
      {tab==='docs' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>📂 School Documents</h3>
          </div>
          <div className="panel-body">
            {(payInfo.documents || [])
              .filter(d => d.target === 'ALL' || d.target === 'parent')
              .length === 0 ? (
                <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>No documents available for download.</div>
              ) : (
                (payInfo.documents || [])
                .filter(d => d.target === 'ALL' || d.target === 'parent')
                .map(d => (
                  <div key={d.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{fontSize:32}}>
                      {d.type?.includes('pdf') ? '📕' : d.type?.includes('image') ? '🖼️' : '📄'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{d.desc || 'No description'}</div>
                      <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{d.size} · {new Date(d.id).toLocaleDateString()}</div>
                    </div>
                    <button className="btn btn-sm" style={{background:M,color:'#fff',borderRadius:8}} 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = d.data;
                        link.download = d.name;
                        link.click();
                      }}>
                      ⬇️ Download
                    </button>
                  </div>
                ))
              )}
          </div>
        </div>
      )}

      {/* ADD CHILD TAB */}
      {tab==='addchild' && (
        <div className="panel" style={{border:`1.5px solid ${MB}`, maxWidth: 520}}>
          <div className="panel-hdr" style={{background:`linear-gradient(135deg,${M},${M2})`,color:'#fff'}}>
            <h3 style={{color:'#fff'}}>➕ Link a Child to Your Account</h3>
          </div>
          <div className="panel-body">
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:20,lineHeight:1.6}}>
              Select the school your child attends and enter their admission number.
              Once verified, you can monitor multiple children across different schools from this account.
            </p>
            {addChildErr && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',color:'#DC2626',fontSize:13,marginBottom:16}}>{addChildErr}</div>}
            {addChildMsg && <div style={{background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:10,padding:'10px 14px',color:'#065F46',fontSize:13,marginBottom:16}}>{addChildMsg}</div>}

            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'var(--navy)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Select School</label>
                <select
                  value={addChildForm.schoolId}
                  onChange={e => setAddChildForm(f => ({...f, schoolId: e.target.value}))}
                  style={{width:'100%',padding:'12px 14px',border:'2px solid var(--border)',borderRadius:10,fontSize:13,outline:'none'}}
                >
                  <option value="">— Choose School —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:800,color:'var(--navy)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Admission Number</label>
                <input
                  value={addChildForm.adm}
                  onChange={e => setAddChildForm(f => ({...f, adm: e.target.value.trim()}))}
                  placeholder="e.g. 2026001"
                  style={{width:'100%',padding:'12px 14px',border:'2px solid var(--border)',borderRadius:10,fontSize:13,outline:'none',boxSizing:'border-box'}}
                />
              </div>
              <button
                disabled={addChildBusy || !addChildForm.schoolId || !addChildForm.adm}
                onClick={async () => {
                  setAddChildBusy(true); setAddChildErr(''); setAddChildMsg('');
                  try {
                    const res = await fetch('/api/auth', {
                      method: 'POST',
                      headers: {'Content-Type':'application/json'},
                      body: JSON.stringify({ action: 'add_child', ...addChildForm })
                    });
                    const data = await res.json();
                    if (!data.ok) { setAddChildErr(data.error || 'Failed to link child.'); }
                    else {
                      setAddChildMsg(`✅ ${data.learner.name} (${data.learner.grade}) linked! Refreshing…`);
                      setAddChildForm({ schoolId: '', adm: '' });
                      setTimeout(() => { load(); setTab('child'); }, 1500);
                    }
                  } catch(e) { setAddChildErr('Connection error: ' + e.message); }
                  finally { setAddChildBusy(false); }
                }}
                style={{padding:'14px',borderRadius:12,border:'none',background:`linear-gradient(135deg,${M},${M2})`,color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',opacity:addChildBusy?0.7:1}}
              >
                {addChildBusy ? '⏳ Verifying & Linking…' : '🔗 Link Child to My Account'}
              </button>
            </div>

            {children.length > 0 && (
              <div style={{marginTop:24,borderTop:'1.5px solid var(--border)',paddingTop:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',marginBottom:10}}>Currently Linked Children</div>
                {children.map(c => (
                  <div key={c.adm} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#F8FAFC',border:'1.5px solid var(--border)',marginBottom:8}}>
                    <div style={{fontSize:22}}>🎒</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{c.grade} · {c.adm}</div>
                    </div>
                    <div style={{padding:'3px 10px',borderRadius:20,background:`${M}15`,color:M,fontSize:11,fontWeight:800}}>Active</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {user && (
        <style jsx>{`
          .page { animation: homeRise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
          @keyframes homeRise {
            from { opacity: 0; transform: translateY(12px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          :global(.stat-card) { 
            background: #fff; border-radius: 16px; padding: 18px; border: 1.5px solid var(--border) !important; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.04) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          :global(.stat-card:hover) { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.08) !important; border-color: ${M}33 !important; }
          :global(.sc-icon) { transition: transform 0.3s ease !important; }
          :global(.stat-card:hover .sc-icon) { transform: scale(1.15) rotate(-5deg); }
          .tab-btn { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
          .tab-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
          .tab-btn:active { transform: scale(0.94); }
          .tab-btn.on::after {
            content: ''; position: absolute; bottom: 2px; left: 25%; right: 25%; height: 2px; background: #fff; border-radius: 2px;
            animation: tabUnderline 0.3s ease forwards;
          }
          @keyframes tabUnderline { from { width: 0; left: 50%; } to { width: 50%; left: 25%; } }
          :global(.panel) { animation: homeRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; transition: transform 0.3s ease, box-shadow 0.3s ease; }
          :global(.panel:hover) { box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
          
          .pay-btn-glint:hover { transform: translateY(-3px); box-shadow: 0 15px 35px ${M}44; }
          .pay-btn-glint:active { transform: scale(0.96); }
          .pay-btn-glint::after {
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
            transform: rotate(45deg) translateX(-100%); transition: none; pointer-events: none;
          }
          .pay-btn-glint:hover::after { transform: rotate(45deg) translateX(100%); transition: transform 0.6s ease-in-out; }
        `}</style>
      )}
    </div>
  );
}
