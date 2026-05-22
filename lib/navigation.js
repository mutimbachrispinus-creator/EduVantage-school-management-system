/**
 * lib/navigation.js — Centralized navigation definition
 * Restored to flat structure as requested.
 */

export const ALL_NAV = [
  { key:'dashboard',  label:'Home', icon:'📊', roles:['admin','teacher','staff','member'], 
    prefetch: ['paav6_learners', 'paav6_paylog', 'paav6_msgs', 'paav6_feecfg', 'paav_announcement', 'paav_hero_img'] },
  { key:'parent-home', label:'Home', icon:'🏠', roles:['parent'],
    prefetch: ['paav6_learners', 'paav6_msgs', 'paav_school_profile', 'paav_timetable'] },
  
  { key:'super-admin', label:'Command Center', icon:'👑', roles:['super-admin'],
    prefetch: ['paav_schools', 'paav_stats_global'] },
  
  { key:'learners',    label:'Learners', icon:'👥', roles:['admin'],
    prefetch: ['paav6_learners', 'paav7_streams', 'paav6_feecfg'] },
  { key:'grades',      label:'Grades', icon:'📝', roles:['admin','teacher'] },
  { key:'attendance',  label:'Attendance', icon:'📅', roles:['admin','teacher'] },
  { key:'fees',        label:'Fees', icon:'💰', roles:['admin'] },
  { key:'billing',     label:'Billing', icon:'💳', roles:['admin'] },
  { key:'nexed',       label:'Nexed Finance', icon:'🏛️', roles:['admin'] },
  { key:'finance/reconcile', label:'Reconciliation', icon:'🏦', roles:['admin'] },
  { key:'finance/budgets',   label:'Budgets', icon:'📊', roles:['admin'] },
  { key:'finance/petty-cash',label:'Petty Cash', icon:'💵', roles:['admin'] },
  { key:'finance/payroll',   label:'Payroll', icon:'💸', roles:['admin'] },
  { key:'teachers',    label:'Staff', icon:'👨‍🏫', roles:['admin'] },
  { key:'timetable',   label:'Timetable', icon:'🗓️', roles:['admin','teacher','staff'] },
  { key:'analytics',   label:'Performance & Insights', icon:'📈', roles:['admin','teacher'] },
  { key:'learning',    label:'Education Hub', icon:'🎓', roles:['admin','teacher','staff','parent','member'],
    prefetch: ['paav_edu_docs', 'paav_live_sessions'] },
  { key:'duties',      label:'Duties', icon:'📋', roles:['admin','teacher','staff'] },
  { key:'streams',      label:'Streams', icon:'🌊', roles:['admin'] },
  { key:'reports',     label:'Reports', icon:'📊', roles:['admin','teacher','staff'] },
  { key:'templates',   label:'Templates', icon:'🖼️', roles:['admin'] },
  { key:'messages',    label:'Communications', icon:'💬', roles:['admin','teacher','staff','parent'] },
  { key:'diary',       label:'Student Diary', icon:'📓', roles:['admin','teacher','parent'] },
  { key:'audit',       label:'Audit Log', icon:'🔍', roles:['admin'] },
  { key:'settings',    label:'Setup', icon:'⚙️', roles:['admin'] },
  { key:'merit-list',  label:'Merit List', icon:'🏆', roles:['admin','teacher'] },
  { key:'classes',     label:'Classes', icon:'🏫', roles:['admin','teacher'] },
  { key:'allocations', label:'Allocations', icon:'📦', roles:['admin'] },
  { key:'profile',     label:'Profiles', icon:'👤', roles:['admin','super-admin','teacher','jss_teacher','senior_teacher','staff','parent'] },
];
