/**
 * lib/navigation.js — Centralized navigation definition
 * Restored to flat structure as requested.
 */

export const ALL_NAV = [
  { key:'dashboard',  label:'Home', icon:'📊', roles:['admin','admin_finance','admin_academics','admin_admissions','teacher','staff','member'], 
    prefetch: ['paav6_learners', 'paav6_paylog', 'paav6_msgs', 'paav6_feecfg', 'paav_announcement', 'paav_hero_img'] },
  { key:'parent-home', label:'Home', icon:'🏠', roles:['parent'],
    prefetch: ['paav6_learners', 'paav6_msgs', 'paav_school_profile', 'paav_timetable'] },
  
  { key:'super-admin', label:'Command Center', icon:'👑', roles:['super-admin'],
    prefetch: ['paav_schools', 'paav_stats_global'] },
  
  { key:'learners',    label:'Learners', icon:'👥', roles:['admin', 'admin_admissions'],
    prefetch: ['paav6_learners', 'paav7_streams', 'paav6_feecfg'] },
  { key:'grades',      label:'Grades', icon:'📝', roles:['admin','admin_academics','teacher'] },
  { key:'national-exams', label:'National Exams', icon:'🏛️', roles:['admin','admin_academics'] },
  { key:'attendance',  label:'Attendance', icon:'📅', roles:['admin','admin_academics','teacher'] },
  { key:'finance',     label:'Finance', icon:'💰', roles:['admin', 'admin_finance'] },
  { key:'teachers',    label:'Staff', icon:'👨‍🏫', roles:['admin'] }, // General admin manages staff
  { key:'timetable',   label:'Timetable', icon:'🗓️', roles:['admin','admin_academics','teacher','staff'] },
  { key:'analytics',   label:'Performance & Insights', icon:'📈', roles:['admin','admin_academics','teacher'] },
  { key:'learning',    label:'Education Hub', icon:'🎓', roles:['admin','admin_academics','teacher','staff','parent','member'],
    prefetch: ['paav_edu_docs', 'paav_live_sessions'] },
  { key:'library',     label:'Library', icon:'📚', roles:['admin','admin_academics','teacher','staff','parent'] },
  { key:'duties',      label:'Duties', icon:'📋', roles:['admin','admin_academics','teacher','staff'] },
  { key:'streams',     label:'Streams', icon:'🌊', roles:['admin', 'admin_admissions', 'admin_academics'] },
  { key:'reports',     label:'Reports', icon:'📊', roles:['admin','admin_finance','admin_academics','admin_admissions','teacher','staff'] },
  { key:'templates',   label:'Templates', icon:'🖼️', roles:['admin'] },
  { key:'messages',    label:'Communications', icon:'💬', roles:['admin','admin_finance','admin_academics','admin_admissions','teacher','staff','parent'] },
  { key:'diary',       label:'Student Diary', icon:'📓', roles:['admin','admin_academics','teacher','parent'] },
  { key:'audit',       label:'Audit Log', icon:'🔍', roles:['admin', 'admin_finance'] },
  { key:'settings',    label:'Setup', icon:'⚙️', roles:['admin', 'admin_finance', 'admin_academics', 'admin_admissions'] },
  { key:'merit-list',  label:'Merit List', icon:'🏆', roles:['admin','admin_academics','teacher'] },
  { key:'classes',     label:'Classes', icon:'🏫', roles:['admin','admin_academics','teacher'] },
  { key:'allocations', label:'Allocations', icon:'📦', roles:['admin', 'admin_finance'] },
  { key:'profile',     label:'Profiles', icon:'👤', roles:['admin','super-admin','admin_finance','admin_academics','admin_admissions','teacher','jss_teacher','senior_teacher','staff','parent'] },
];
