/**
 * lib/navigation.js — Centralized navigation definition
 * Restored to flat structure as requested.
 */

export const ALL_NAV = [
  { key:'dashboard',  label:'Home', icon:'📊', roles:['admin','teacher','staff','member','parent'], 
    prefetch: ['paav6_learners', 'paav6_paylog', 'paav6_msgs', 'paav6_feecfg', 'paav_announcement', 'paav_hero_img'] },
  
  { key:'super-admin', label:'Command Center', icon:'👑', roles:['super-admin'],
    prefetch: ['paav_schools', 'paav_stats_global'] },
  
  { key:'learners',    label:'Learners', icon:'👥', roles:['admin','teacher'] },
  { key:'grades',      label:'Grades', icon:'📝', roles:['admin','teacher'] },
  { key:'attendance',  label:'Attendance', icon:'📅', roles:['admin','teacher'] },
  { key:'fees',        label:'Fees', icon:'💰', roles:['admin'] },
  { key:'nexed',       label:'Nexed Finance', icon:'🏛️', roles:['admin'] },
  { key:'finance/reconcile', label:'Reconciliation', icon:'🏦', roles:['admin'] },
  { key:'finance/budgets',   label:'Budgets', icon:'📊', roles:['admin'] },
  { key:'finance/petty-cash',label:'Petty Cash', icon:'💵', roles:['admin'] },
  { key:'finance/payroll',   label:'Payroll', icon:'💸', roles:['admin'] },
  { key:'teachers',    label:'Staff', icon:'👨‍🏫', roles:['admin'] },
  { key:'timetable',   label:'Timetable', icon:'🗓️', roles:['admin','teacher','staff'] },
  { key:'performance', label:'Performance', icon:'📈', roles:['admin','teacher'] },
  { key:'analytics',   label:'Insights', icon:'📊', roles:['admin','teacher'] },
  { key:'learning',    label:'Education Hub', icon:'🎓', roles:['admin','teacher','staff','parent','member'],
    prefetch: ['paav_edu_docs', 'paav_live_sessions'] },
  { key:'duties',      label:'Duties', icon:'📋', roles:['admin','teacher','staff'] },
  { key:'streams',      label:'Streams', icon:'🌊', roles:['admin'] },
  { key:'reports',     label:'Reports', icon:'📊', roles:['admin','teacher','staff'] },
  { key:'templates',   label:'Templates', icon:'🖼️', roles:['admin'] },
  { key:'sms',         label:'SMS', icon:'📲', roles:['admin'] },
  { key:'messages',    label:'Messages', icon:'💬', roles:['admin','teacher','staff','parent'] },
  { key:'diary',       label:'Student Diary', icon:'📓', roles:['admin','teacher','parent'] },
  { key:'audit',       label:'Audit Log', icon:'🔍', roles:['admin'] },
  { key:'settings',    label:'Setup', icon:'⚙️', roles:['admin'] },
  { key:'merit-list',  label:'Merit List', icon:'🏆', roles:['admin','teacher'] },
  { key:'classes',     label:'Classes', icon:'🏫', roles:['admin','teacher'] },
  { key:'allocations', label:'Allocations', icon:'📦', roles:['admin'] },
  { key:'profile',     label:'Profile', icon:'👤', roles:['admin','super-admin','teacher','parent'] },
];
