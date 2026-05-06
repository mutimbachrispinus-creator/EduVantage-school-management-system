'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useTransition } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from '@/components/DynamicCharts';
import { TrendingUp, Users, BookOpen, AlertCircle, Loader2, Filter, ChevronRight } from 'lucide-react';
import { getAcademicStats } from '@/lib/actions/analytics';
import { getAllGrades } from '@/lib/cbe';
import { useSchoolProfile } from '@/lib/school-profile';

const COLORS = ['#8B1A1A', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];

export default function AnalyticsPage() {
  const profile = useSchoolProfile();
  const [grade, setGrade] = useState('GRADE 1');
  const [term, setTerm] = useState('TERM 1');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const grades = getAllGrades(profile?.curriculum || 'CBC');

  useEffect(() => {
    if (profile?.tenantId) {
      setStats(null);
      setError(null);
      
      const timeout = setTimeout(() => {
        if (!stats) setError('Analysis is taking longer than expected. Please try again.');
      }, 12000);

      startTransition(async () => {
        try {
          const res = await getAcademicStats({ 
            tenantId: profile.tenantId, 
            grade, 
            term,
            curriculum: profile.curriculum || 'CBC'
          });
          clearTimeout(timeout);
          if (res.success) {
            setStats(res.data);
            setError(null);
          } else {
            setError(res.error || 'Failed to calculate insights');
          }
        } catch (e) {
          clearTimeout(timeout);
          setError(e.message || 'An unexpected error occurred');
        }
      });
      return () => clearTimeout(timeout);
    }
  }, [grade, term, profile]);

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <AlertCircle className="text-red-500" size={48} />
      <div>
        <h3 className="text-lg font-bold text-slate-900">Analysis Failed</h3>
        <p className="text-slate-500">{error}</p>
      </div>
      <button 
        className="btn btn-primary btn-sm"
        onClick={() => window.location.reload()}
      >
        Retry Analysis
      </button>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-slate-400" size={40} />
      <p className="text-slate-500 font-medium animate-pulse">Calculating institutional insights...</p>
    </div>
  );

  return (
    <div className="page on animate-in fade-in duration-500">
      
      {/* Header & Filters */}
      <div className="page-hdr">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>Academic Analytics</h2>
          <p style={{ color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <Users size={14} /> Data-driven insights for {stats.studentCount} students in {grade}
          </p>
        </div>
        
        <div className="page-hdr-acts">
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <select 
              value={grade} 
              onChange={(e) => setGrade(e.target.value)}
              style={{ background: 'var(--slate-50)', fontWeight: 700 }}
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
            <select 
              value={term} 
              onChange={(e) => setTerm(e.target.value)}
              style={{ background: 'var(--slate-50)', fontWeight: 700 }}
            >
              <option value="TERM 1">TERM 1</option>
              <option value="TERM 2">TERM 2</option>
              <option value="TERM 3">TERM 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="sg sg3">
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Top Subject</div>
              <div className="sc-n" style={{ fontSize: 18, textTransform: 'uppercase' }}>{stats.subjectMastery[0]?.name || '—'}</div>
              <div className="sc-sub" style={{ background: '#ecfdf5', color: '#059669' }}>
                {stats.subjectMastery[0]?.level || '—'} ({stats.subjectMastery[0]?.average || 0}%)
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertCircle size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Weakest Subject</div>
              <div className="sc-n" style={{ fontSize: 18, textTransform: 'uppercase' }}>{stats.subjectMastery[stats.subjectMastery.length-1]?.name || '—'}</div>
              <div className="sc-sub" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {stats.subjectMastery[stats.subjectMastery.length-1]?.level || '—'} ({stats.subjectMastery[stats.subjectMastery.length-1]?.average || 0}%)
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><TrendingUp size={20} /></div>
            <div>
              <div className="sc-l" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Gender Gap</div>
              <div className="sc-n" style={{ fontSize: 24 }}>
                {Math.abs((stats.genderComparison[0]?.average || 0) - (stats.genderComparison[1]?.average || 0)).toFixed(1)}%
              </div>
              <div className="sc-sub" style={{ background: '#eff6ff', color: '#2563eb' }}>Performance Variance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Subject Mastery Chart */}
        <div className="panel">
          <div className="panel-hdr">
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>Subject Mastery Heatmap</h3>
            <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>High to Low</div>
          </div>
          <div className="panel-body">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjectMastery} layout="vertical" margin={{ left: 60, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.name}</div>
                            <div className="flex items-baseline gap-2">
                              <div className="text-2xl font-black text-slate-900">{d.level}</div>
                              <div className="text-xs font-bold text-slate-400">({d.average}%)</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={24}>
                    {stats.subjectMastery.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Gender Comparison */}
          <div className="panel">
            <div className="panel-hdr">
              <h3 style={{ fontSize: 16, fontWeight: 900 }}>Gender Parity Analysis</h3>
            </div>
            <div className="panel-body">
              <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.genderComparison}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="average"
                      >
                        {stats.genderComparison.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 flex-1">
                  {stats.genderComparison.map((g, idx) => (
                    <div key={g.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                        <span className="font-bold text-slate-700">{g.name}</span>
                      </div>
                      <span className="text-lg font-black text-slate-900">{g.average}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stream Comparison */}
          <div className="panel">
            <div className="panel-hdr">
               <h3 style={{ fontSize: 16, fontWeight: 900 }}>Stream Performance</h3>
            </div>
            <div className="panel-body">
              <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.streamComparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#2563EB" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      <style jsx>{`
        .bg-maroon-100 { background-color: #FFF5F5; }
        .hover\\:border-maroon-100:hover { border-color: #FED7D7; }
      `}</style>
    </div>
  );
}
