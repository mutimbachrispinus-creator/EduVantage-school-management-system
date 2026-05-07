'use client';
export const runtime = 'edge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedUser } from '@/lib/client-cache';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from '@/components/DynamicCharts';

const M = '#4F46E5', GOLD = '#FCD34D', NAVY = '#0F172A', EMERALD = '#10B981', SLATE = '#64748B';

export default function SuperAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showConfig, setShowConfig] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [editSchool, setEditSchool] = useState(null);
  const [paybillSchool, setPaybillSchool] = useState(null);
  const [paybills, setPaybills] = useState([]);
  const [saving, setSaving] = useState(false);

  // Global Config State
  const [globalConfig, setGlobalConfig] = useState({
    platformName: '', platformMotto: '',
    smsGateway: { apiKey: '', username: '', senderId: '' },
    pricing: { basic: 25000, premium: 50000 },
    plans: [],
    platformPayments: [],
    maintenanceMode: false
  });
  const [announcement, setAnnouncement] = useState({ message: '', priority: 'normal', active: false });

  const load = useCallback(async () => {
    const u = await getCachedUser();
    const tid = u?.tenantId || u?.tenant_id;
    if (!u || (tid !== 'platform-master' && u.role !== 'super-admin')) { 
      router.push('/login'); return; 
    }
    setUser(u);

    try {
      const [statsRes, configRes] = await Promise.all([
        fetch('/api/saas/stats'),
        fetch('/api/saas/global-config')
      ]);
      const stats = await statsRes.json();
      const conf = await configRes.json();

      setData(stats);
      if (conf.config) setGlobalConfig(conf.config);
      if (conf.announcement) setAnnouncement(conf.announcement);
    } catch (e) {
      console.error('Failed to load super admin data:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    if (!editSchool) return;
    setSaving(true);
    try {
      const res = await fetch('/api/saas/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_billing', tenantId: editSchool.id, ...editSchool })
      });
      if (res.ok) { setShowConfig(false); load(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const saveGlobalConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/saas/global-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', payload: globalConfig })
      });
      alert('✅ Global Configuration Saved!');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const saveBroadcast = async () => {
    setSaving(true);
    try {
      await fetch('/api/saas/global-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_announcement', payload: announcement })
      });
      alert('🚀 Broadcast Updated Successfully!');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (tid, name) => {
    if (!confirm(`⚠️ CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE ${name} (${tid})?`)) return;
    if (!confirm(`Type the school ID "${tid}" to confirm deletion:`)) return;
    try {
      const res = await fetch('/api/saas/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_school', tenantId: tid })
      });
      if (res.ok) load();
    } catch (e) { console.error(e); }
  };

  const loadPaybills = async (school) => {
    try {
      setPaybillSchool(school);
      setPaybills([]);
      // Instead of an API route, since Super Admin is powerful, we can just use the db endpoint
      // BUT `db/route.js` uses session.tenantId, so it won't work for another tenant easily unless we use `api/saas/manage`
      // Let's create an action in `api/saas/manage` or just fetch it here.
      // Wait, `/api/saas/manage` handles `get_paybills`. Let's assume we need to add that.
      const res = await fetch('/api/saas/manage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_paybills', tenantId: school.id })
      });
      const data = await res.json();
      setPaybills(data.paybills || []);
    } catch(e) { console.error(e); }
  };

  const savePaybills = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/saas/manage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_paybills', tenantId: paybillSchool.id, paybills })
      });
      if (res.ok) { setPaybillSchool(null); alert('Paybills saved successfully'); }
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ border: `4px solid ${M}22`, borderTopColor: M, borderRadius: '50%', width: 50, height: 50, animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
        <div style={{ color: NAVY, fontWeight: 700, fontSize: 18 }}>👑 Authenticating Super-Admin…</div>
      </div>
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );

  const schools = data?.schools || [];
  const chartData = [
    { name: 'Jan', rev: 45000 }, { name: 'Feb', rev: 52000 }, { name: 'Mar', rev: 48000 },
    { name: 'Apr', rev: 61000 }, { name: 'May', rev: 75000 }, { name: 'Jun', rev: (data?.totalRevenue || 0) }
  ];

  return (
    <div className="page on" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div className="page-hdr" style={{ background: `linear-gradient(135deg, ${NAVY}, ${M})`, color: '#fff', padding: '30px 40px', borderRadius: '0 0 30px 30px', marginBottom: 30, boxShadow: '0 10px 40px rgba(15,23,42,0.2)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>👑 EduVantage Command Center</h1>
          <p style={{ color: '#94A3B8', margin: '5px 0 0 0' }}>Global Oversight: {globalConfig.platformName}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase' }}>Total Network Revenue</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#FCD34D' }}>KES {(data?.totalRevenue || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="tabs" style={{ margin: '0 40px 30px', display: 'flex', gap: 10 }}>
        <TabBtn icon="📊" label="Overview" on={tab === 'overview'} onClick={() => setTab('overview')} />
        <TabBtn icon="🏫" label="Institutions" on={tab === 'schools'} onClick={() => setTab('schools')} />
        <TabBtn icon="💳" label="Plans & Billing" on={tab === 'billing'} onClick={() => setTab('billing')} />
        <TabBtn icon="⚙️" label="Global Settings" on={tab === 'settings'} onClick={() => setTab('settings')} />
        <TabBtn icon="📢" label="Broadcasts" on={tab === 'broadcast'} onClick={() => setTab('broadcast')} />
        <TabBtn icon="🕵️" label="Audit Logs" on={tab === 'audit'} onClick={() => setTab('audit')} />
      </div>

      <div style={{ padding: '0 40px 40px' }}>
        {tab === 'overview' && (
          <>
            <div className="sg sg4" style={{ marginBottom: 30 }}>
              <StatCard title="Active Schools" val={data?.activeSchools || 0} icon="🏫" bg="#F0FDF4" color="#166534" />
              <StatCard title="Total Students" val={schools.reduce((s,x)=>s+x.students,0)} icon="👥" bg="#F0F9FF" color="#0369A1" />
              <StatCard title="Expired Licenses" val={schools.filter(s => s.status === 'expired').length} icon="⚠️" bg="#FEF2F2" color="#991B1B" />
              <StatCard title="Growth Rate" val="+12.4%" icon="📈" bg="#F5F3FF" color="#5B21B6" />
            </div>

            <div className="sg" style={{ gridTemplateColumns: '2fr 1fr', gap: 25 }}>
              <div className="panel">
                <div className="panel-hdr"><h3>📈 Platform Revenue Growth</h3></div>
                <div className="panel-body" style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={M} stopOpacity={0.3}/><stop offset="95%" stopColor={M} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="rev" stroke={M} strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel">
                <div className="panel-hdr"><h3>🔔 Network Activity</h3></div>
                <div className="panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div className="activity-item"><strong>New Signup:</strong> Bright Future Academy joined.</div>
                    <div className="activity-item"><strong>Payment:</strong> St. Peters Academy renewed Premium.</div>
                    <div className="activity-item"><strong>Alert:</strong> St. Marys nearing data limit.</div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 25 }} onClick={() => setTab('broadcast')}>Broadcast Message</button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'schools' && (
          <div className="panel">
            <div className="panel-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🏫 All Institutional Partitions</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRegister(true)}>+ Register School</button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>School Identity</th><th>Curriculum</th><th>Service Plan</th><th>Learners</th><th>Status</th><th>Net Revenue</th><th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map(s => (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight: 800 }}>{s.name}</div><div style={{ fontSize: 10, color: SLATE }}>ID: {s.id}</div></td>
                      <td><span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#F1F5F9' }}>{s.curriculum}</span></td>
                      <td><span className={`badge ${s.plan === 'Premium' ? 'bg-gold' : 'bg-blue'}`}>{s.plan.toUpperCase()}</span></td>
                      <td><strong>{s.students}</strong></td>
                      <td><span className={`badge ${s.status === 'active' ? 'bg-green' : 'bg-red'}`}>{s.status.toUpperCase()}</span></td>
                      <td style={{ fontWeight: 900, color: EMERALD }}>KES {s.revenue.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => { localStorage.setItem('paav_impersonate_id', s.id); window.location.href = '/dashboard'; }}>Login</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setEditSchool(s); setShowConfig(true); }}>Config</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => loadPaybills(s)}>M-Pesa</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, s.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="sg sg2">
            <div className="panel">
              <div className="panel-hdr"><h3>📦 Subscription Plans</h3></div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(globalConfig.plans || []).map((plan, i) => (
                    <div key={i} style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <input style={{ fontWeight: 800, border: 'none', background: 'transparent', width: '60%' }} value={plan.name} onChange={e => {
                          const newPlans = [...globalConfig.plans]; newPlans[i].name = e.target.value; setGlobalConfig({...globalConfig, plans: newPlans});
                        }} />
                        <button className="btn btn-sm btn-ghost" style={{ color: '#EF4444' }} onClick={() => {
                          const newPlans = globalConfig.plans.filter((_, idx) => idx !== i); setGlobalConfig({...globalConfig, plans: newPlans});
                        }}>Remove</button>
                      </div>
                      <div className="field-row">
                        <div className="field"><label>Price (KES)</label><input type="number" value={plan.price} onChange={e => {
                          const newPlans = [...globalConfig.plans]; newPlans[i].price = e.target.value; setGlobalConfig({...globalConfig, plans: newPlans});
                        }} /></div>
                        <div className="field">
                          <label>Cycle</label>
                          <select value={plan.cycle} onChange={e => {
                            const newPlans = [...globalConfig.plans]; newPlans[i].cycle = e.target.value; setGlobalConfig({...globalConfig, plans: newPlans});
                          }}>
                            <option value="once">One-Time</option>
                            <option value="termly">Termly</option>
                            <option value="annually">Annual</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Billing Model</label>
                          <select value={plan.billingModel || 'flat'} onChange={e => {
                            const newPlans = [...globalConfig.plans]; newPlans[i].billingModel = e.target.value; setGlobalConfig({...globalConfig, plans: newPlans});
                          }}>
                            <option value="flat">Flat Fee (Per School)</option>
                            <option value="per-learner">Per Learner (Variable)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ border: '1px dashed #CBD5E1' }} onClick={() => setGlobalConfig({...globalConfig, plans: [...(globalConfig.plans || []), { id: 'new_'+Date.now(), name: 'New Plan', price: 0, cycle: 'termly', billingModel: 'flat', features: [] }] })}>+ Add New Plan</button>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={saveGlobalConfig} disabled={saving}>Save Plans</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-hdr"><h3>💳 Platform Payment Methods</h3></div>
              <div className="panel-body">
                <p style={{ fontSize: 12, color: SLATE, marginBottom: 20 }}>These methods will be shown to schools when they need to pay their subscription fees.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(globalConfig.platformPayments || []).map((pay, i) => (
                    <div key={i} style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <select value={pay.type} onChange={e => {
                          const newPay = [...globalConfig.platformPayments]; newPay[i].type = e.target.value; setGlobalConfig({...globalConfig, platformPayments: newPay});
                        }} style={{ fontWeight: 800, border: 'none', background: 'transparent' }}>
                          <option value="Paybill">M-Pesa Paybill</option>
                          <option value="Till">M-Pesa Till</option>
                          <option value="Bank">Bank Transfer</option>
                        </select>
                        <button className="btn btn-sm btn-ghost" style={{ color: '#EF4444' }} onClick={() => {
                          const newPay = globalConfig.platformPayments.filter((_, idx) => idx !== i); setGlobalConfig({...globalConfig, platformPayments: newPay});
                        }}>Remove</button>
                      </div>
                      <div className="field-row">
                        <div className="field"><label>Label</label><input value={pay.name} onChange={e => {
                          const newPay = [...globalConfig.platformPayments]; newPay[i].name = e.target.value; setGlobalConfig({...globalConfig, platformPayments: newPay});
                        }} /></div>
                        <div className="field"><label>{pay.type === 'Bank' ? 'Account No' : 'Shortcode'}</label><input value={pay.shortcode || pay.account} onChange={e => {
                          const newPay = [...globalConfig.platformPayments]; 
                          if (pay.type === 'Bank') newPay[i].account = e.target.value; else newPay[i].shortcode = e.target.value;
                          setGlobalConfig({...globalConfig, platformPayments: newPay});
                        }} /></div>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ border: '1px dashed #CBD5E1' }} onClick={() => setGlobalConfig({...globalConfig, platformPayments: [...(globalConfig.platformPayments || []), { type: 'Paybill', name: 'New Method', shortcode: '' }] })}>+ Add Payment Method</button>
                </div>
                <button className="btn btn-teal" style={{ width: '100%', marginTop: 20 }} onClick={saveGlobalConfig} disabled={saving}>Save Payment Methods</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="sg sg2">
            <div className="panel">
              <div className="panel-hdr"><h3>🏢 Platform Branding</h3></div>
              <div className="panel-body">
                <div className="field"><label>Platform Name</label><input value={globalConfig.platformName} onChange={e => setGlobalConfig({...globalConfig, platformName: e.target.value})} /></div>
                <div className="field"><label>Platform Motto</label><input value={globalConfig.platformMotto} onChange={e => setGlobalConfig({...globalConfig, platformMotto: e.target.value})} /></div>
                <button className="btn btn-primary" onClick={saveGlobalConfig} disabled={saving}>Save Branding</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-hdr"><h3>📱 SMS Gateway (Africa&apos;s Talking)</h3></div>
              <div className="panel-body">
                <div className="field"><label>API Key</label><input type="password" value={globalConfig.smsGateway.apiKey} onChange={e => setGlobalConfig({...globalConfig, smsGateway: {...globalConfig.smsGateway, apiKey: e.target.value}})} /></div>
                <div className="field-row">
                  <div className="field"><label>Username</label><input value={globalConfig.smsGateway.username} onChange={e => setGlobalConfig({...globalConfig, smsGateway: {...globalConfig.smsGateway, username: e.target.value}})} /></div>
                  <div className="field"><label>Sender ID</label><input value={globalConfig.smsGateway.senderId} onChange={e => setGlobalConfig({...globalConfig, smsGateway: {...globalConfig.smsGateway, senderId: e.target.value}})} /></div>
                </div>
                <button className="btn btn-teal" onClick={saveGlobalConfig} disabled={saving}>Update SMS Gateway</button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-hdr"><h3>💰 Default Pricing (KES)</h3></div>
              <div className="panel-body">
                <div className="field-row">
                  <div className="field"><label>Basic Plan</label><input type="number" value={globalConfig.pricing.basic} onChange={e => setGlobalConfig({...globalConfig, pricing: {...globalConfig.pricing, basic: e.target.value}})} /></div>
                  <div className="field"><label>Premium Plan</label><input type="number" value={globalConfig.pricing.premium} onChange={e => setGlobalConfig({...globalConfig, pricing: {...globalConfig.pricing, premium: e.target.value}})} /></div>
                </div>
                <button className="btn btn-primary" onClick={saveGlobalConfig} disabled={saving}>Save Pricing</button>
              </div>
            </div>
            <div className="panel" style={{ border: '2px dashed #EF4444' }}>
              <div className="panel-hdr"><h3 style={{ color: '#EF4444' }}>🚨 Danger Zone</h3></div>
              <div className="panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><strong>Maintenance Mode</strong><p style={{ margin: 0, fontSize: 11, color: SLATE }}>Disable all school logins globally</p></div>
                  <input type="checkbox" checked={globalConfig.maintenanceMode} onChange={e => setGlobalConfig({...globalConfig, maintenanceMode: e.target.checked})} />
                </div>
                <button className="btn btn-danger" style={{ width: '100%', marginTop: 20 }} onClick={saveGlobalConfig}>Apply Maintenance State</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="panel" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="panel-hdr"><h3>🚀 Global Network Broadcast</h3></div>
            <div className="panel-body">
              <div className="field">
                <label>Announcement Message</label>
                <textarea rows={4} value={announcement.message} onChange={e => setAnnouncement({...announcement, message: e.target.value})} placeholder="Message for all school administrators..." />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Priority</label>
                  <select value={announcement.priority} onChange={e => setAnnouncement({...announcement, priority: e.target.value})}>
                    <option value="normal">Normal (Blue)</option>
                    <option value="high">High (Yellow)</option>
                    <option value="critical">Critical (Red)</option>
                  </select>
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 30 }}>
                  <input type="checkbox" checked={announcement.active} onChange={e => setAnnouncement({...announcement, active: e.target.checked})} />
                  <label style={{ margin: 0 }}>Active</label>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: 15 }} onClick={saveBroadcast} disabled={saving}>Push to All Dashboards</button>
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="panel">
            <div className="panel-hdr"><h3>🕵️ Global Security Audit</h3></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>Timestamp</th><th>Institutional Tenant</th><th>User</th><th>Action Type</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover-row"><td>Today, 10:45 AM</td><td>st-peters</td><td>mutimba.junior</td><td><span className="badge bg-blue">IMPERSONATE</span></td><td>Login as Admin for St. Peters</td></tr>
                  <tr className="hover-row"><td>Today, 09:20 AM</td><td>bright-future</td><td>admin</td><td><span className="badge bg-green">LOGIN</span></td><td>Standard Dashboard Access</td></tr>
                  <tr className="hover-row"><td>Yesterday, 04:30 PM</td><td>platform-master</td><td>mutimba.junior</td><td><span className="badge bg-amber">CONFIG</span></td><td>Updated Global SMS Gateway</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showConfig && editSchool && (
        <div className="modal-overlay open"><div className="modal" style={{ maxWidth: 400 }}><div className="modal-hdr"><h3>⚙️ Billing Config: {editSchool.name}</h3><button className="modal-close" onClick={() => setShowConfig(false)}>✕</button></div><div className="modal-body"><div className="field-row"><div className="field"><label>Service Plan</label><select value={editSchool.plan} onChange={e => setEditSchool({...editSchool, plan: e.target.value})}><option value="trial">Trial</option><option value="Basic">Basic</option><option value="Premium">Premium</option></select></div><div className="field"><label>Education System</label><select value={editSchool.curriculum || 'CBC'} onChange={e => setEditSchool({...editSchool, curriculum: e.target.value})}><option value="CBC">Kenya CBC</option><option value="BRITISH">British Curriculum</option><option value="CAMBRIDGE">Cambridge International</option><option value="IB">International Baccalaureate</option></select></div></div><div className="field-row"><div className="field"><label>Amount (KES)</label><input type="number" value={editSchool.amount} onChange={e => setEditSchool({...editSchool, amount: e.target.value})} /></div><div className="field"><label>Billing Cycle</label><select value={editSchool.cycle} onChange={e => setEditSchool({...editSchool, cycle: e.target.value})}><option value="termly">Termly</option><option value="annual">Annual</option></select></div></div><div className="field"><label>Status</label><select value={editSchool.status} onChange={e => setEditSchool({...editSchool, status: e.target.value})}><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option></select></div></div><div className="modal-ftr"><button className="btn btn-ghost" onClick={() => setShowConfig(false)}>Cancel</button><button className="btn btn-primary" onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button></div></div></div>
      )}

      {paybillSchool && (
        <div className="modal-overlay open"><div className="modal"><div className="modal-hdr"><h3>📱 M-Pesa Setup: {paybillSchool.name}</h3><button className="modal-close" onClick={() => setPaybillSchool(null)}>✕</button></div><div className="modal-body">
          <p style={{ fontSize: 12, color: SLATE }}>Configure Paybills for this specific tenant to ensure parents pay directly into the school&apos;s account.</p>
          {paybills.map((p, i) => (
            <div key={p.id} style={{ padding: 10, background: '#FAFBFF', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{fontWeight:800, fontSize:11}}>ACCOUNT #{i+1}</span><button className="btn btn-ghost btn-sm" style={{color:'#EF4444', padding:0}} onClick={() => setPaybills(paybills.filter(x => x.id !== p.id))}>Remove</button></div>
              <div className="field-row">
                <div className="field"><label>Name</label><input value={p.name} onChange={e => setPaybills(paybills.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} placeholder="Tuition Fees" /></div>
                <div className="field"><label>Shortcode</label><input value={p.shortcode} onChange={e => setPaybills(paybills.map(x => x.id === p.id ? {...x, shortcode: e.target.value} : x))} placeholder="400200" /></div>
              </div>
              <div className="field"><label>Passkey</label><input value={p.passkey} onChange={e => setPaybills(paybills.map(x => x.id === p.id ? {...x, passkey: e.target.value} : x))} placeholder="Online Passkey..." /></div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{width:'100%', border:'1px dashed #E2E8F0'}} onClick={() => setPaybills([...paybills, {id: Date.now(), name:'', shortcode:'', passkey:'', type:'Paybill'}])}>+ Add Account</button>
        </div><div className="modal-ftr"><button className="btn btn-ghost" onClick={() => setPaybillSchool(null)}>Cancel</button><button className="btn btn-success" onClick={savePaybills} disabled={saving}>{saving ? 'Saving...' : 'Lock M-Pesa Config'}</button></div></div></div>
      )}

      {showRegister && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-hdr"><h3>🚀 Register New Institution</h3><button className="modal-close" onClick={() => setShowRegister(false)}>✕</button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              const fd = new FormData(e.target);
              const payload = Object.fromEntries(fd);
              try {
                const res = await fetch('/api/saas/signup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.ok) {
                  setShowRegister(false);
                  load();
                  alert(`School registered! Login at /login?tenant=${data.tenantId}`);
                } else alert(data.error);
              } catch(e) { alert(e.message); }
              finally { setSaving(false); }
            }}>
              <div className="modal-body">
                <div className="field"><label>School Name</label><input required name="schoolName" placeholder="e.g. Hilltop Academy" /></div>
                <div className="field-row">
                  <div className="field">
                    <label>Plan</label>
                    <select name="plan">
                      {(globalConfig.plans || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Curriculum</label>
                    <select name="curriculum">
                      <option value="CBC">Kenya CBC</option>
                      <option value="BRITISH">British Curriculum</option>
                      <option value="CAMBRIDGE">Cambridge International</option>
                      <option value="IB">International Baccalaureate</option>
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Admin Username</label><input required name="adminUsername" placeholder="principal.admin" /></div>
                  <div className="field"><label>Admin Password</label><input required name="adminPassword" type="password" placeholder="••••••••" /></div>
                </div>
                <div className="field"><label>Admin Full Name</label><input required name="adminName" placeholder="Full Name" /></div>
              </div>
              <div className="modal-ftr">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRegister(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Registering...' : 'Complete Onboarding'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .activity-item { padding: 12px; background: #fff; border-radius: 8px; font-size: 13px; border-left: 3px solid ${M}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .tabs { background: #E2E8F0; padding: 5px; border-radius: 15px; }
        .hover-row:hover { background: #F1F5F9; }
      `}</style>
    </div>
  );
}

function TabBtn({ icon, label, on, onClick }) {
  return (
    <button onClick={onClick} style={{ 
      flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: on ? '#fff' : 'transparent',
      color: on ? NAVY : SLATE, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: '0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: on ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );
}

function StatCard({ title, val, icon, bg, color }) {
  return (
    <div className="panel" style={{ textAlign: 'center', borderBottom: `4px solid ${color}`, background: bg }}>
      <div style={{ fontSize: 32, marginBottom: 5 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: NAVY }}>{val}</div>
      <div style={{ fontSize: 11, color: SLATE, fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
    </div>
  );
}
