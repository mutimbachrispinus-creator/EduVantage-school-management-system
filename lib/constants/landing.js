export const CURRICULUM_DETAILS = {
  CBC: {
    title: 'Kenya Competency Based Curriculum (CBC)',
    badge: 'Formative & Rubric Focused',
    icon: '⚖️',
    description: 'Transition from rote learning to continuous competency mapping. EduVantage maps learner outcomes across learning areas, strands, and sub-strands using qualitative rubrics.',
    specs: [
      { label: 'Evaluation Metrics', value: 'EE (Exceeding Expectation), ME (Meeting Expectation), AE (Approaching Expectation), BE (Below Expectation).' },
      { label: 'Assessment Types', value: 'Formative learner observations, portfolio tasks, and end-of-stage school assessments.' },
      { label: 'Learning Areas Mapping', value: 'Environmental, Mathematical, Language, Creative Arts, Hygiene, and Religious Education.' },
      { label: 'Report Outputs', value: 'Comprehensive narrative learning profile transcripts showing strand-level mastery checklists.' }
    ]
  },
  TVET: {
    title: 'TVET / CBET Modular Assessments',
    badge: 'Skill-Based Outcomes',
    icon: '⚙️',
    description: 'Engineered for polytechnics, vocational colleges, and technical institutes using CBET (Competency Based Education & Training) frameworks.',
    specs: [
      { label: 'Curriculum Units', value: 'Units of Competency (UC) divided into Core, Basic, and Common occupational modules.' },
      { label: 'Assessment Mode', value: 'Internal and External Assessment scores. Practical skills checklists matched against strict standards.' },
      { label: 'Outcome Tracking', value: 'Satisfactory (S) / Not Yet Satisfactory (NYS) completion states for specific occupational competencies.' },
      { label: 'Certification Path', value: 'Verifies eligibility for national assessment boards by tracking required practical workshop hours.' }
    ]
  },
  CAMBRIDGE: {
    title: 'Cambridge Assessment International Education',
    badge: 'Global Scaled Marksheets',
    icon: '🇬🇧',
    description: 'Supports Cambridge Primary, Lower Secondary, IGCSE, O-Levels, and AS & A-Levels with full letter scale conversion and component weightings.',
    specs: [
      { label: 'Grading Scales', value: 'A* to G scales for IGCSE, 9 to 1 numeric boundaries, and standard A to E thresholds for A-Levels.' },
      { label: 'Assessment Structure', value: 'Supports multiple paper breakdowns (e.g., Paper 1 Theory, Paper 2 Practical, Paper 3 Alternative) per subject.' },
      { label: 'Weighting Controls', value: 'Admins set custom percentage contribution ratios per exam component to compute final raw scales.' },
      { label: 'Grade Scaling', value: 'Enables flexible grade boundary curves to adjust passing boundaries based on year-on-year exam difficulty.' }
    ]
  },
  IB: {
    title: 'International Baccalaureate (IB) DP/MYP',
    badge: 'Criterion-Referenced Rubrics',
    icon: '🎒',
    description: 'Built for international academies using the IB Middle Years Programme (MYP) and Diploma Programme (DP) criterion-referenced evaluation boards.',
    specs: [
      { label: 'Rubric Criteria', value: 'Evaluation criteria A, B, C, and D graded on an isolated 0-8 scale per subject group.' },
      { label: 'Diploma Scale', value: 'Automatic mapping of combined criterion scores to the final global IB grade boundary of 1 to 7.' },
      { label: 'Core Integration', value: 'Logs status checks for Theory of Knowledge (TOK), Extended Essay (EE), and Creativity, Activity, Service (CAS) requirements.' },
      { label: 'Progress Analytics', value: 'Displays continuous progress grids comparing individual criteria to historical class average bands.' }
    ]
  },
  MONTESSORI: {
    title: 'Montessori Qualitative Observation',
    badge: 'Descriptive & Child-Led',
    icon: '🦋',
    description: 'Designed for early childhood development centers (ECD) focusing on individualized progress tracking without rigid numerical test scores.',
    specs: [
      { label: 'Tracking Model', value: 'Narrative observations logged across key developmental areas: Practical Life, Sensorial, Language, Mathematics, and Culture.' },
      { label: 'Milestone Progress', value: 'Tracks child milestones through sequential stages: Introduced, Working on, and Mastered.' },
      { label: 'Teacher Journal Logs', value: 'Daily or weekly qualitative portfolios describing focus areas, peer interactions, and coordination milestones.' },
      { label: 'Parent Deliverables', value: 'Custom developmental narrative reports replacing traditional grade sheets with comprehensive portfolios.' }
    ]
  }
};

export const PERSONA_DETAILS = {
  admin: {
    title: 'Supercharged Administration Panel',
    icon: '🛡️',
    color: '#4F46E5',
    badge: 'Full Governance & Oversight',
    desc: 'Complete institutional governance in a single tenant-aware dashboard. Streamline financial operations, manage staff directory parameters, inspect collections, and verify system integrity.',
    bullets: [
      'Trigger Safaricom M-Pesa STK fee payment push requests directly to parent devices.',
      'Audit bulk SMS campaigns, Africa\'s Talking delivery logs, and text templates.',
      'Disburse detailed staff payroll with precise statutory tax and granular loan deductions.',
      'Control multi-tenant branding assets, custom primary colors, and student seat limits.',
      'Execute repair utilities, table checks, cache hydration, and system integrity logs.'
    ]
  },
  teacher: {
    title: 'Digital Classrooms & Markbooks',
    icon: '👩‍🏫',
    color: '#10B981',
    badge: 'Streamlined Academic Workflows',
    desc: 'Empower teachers with optimized data entry markbooks, automated curriculum scales, digital student registers, and diagnostic academic charts.',
    bullets: [
      'Record student attendance in seconds using a responsive mobile-friendly list.',
      'Upload exam marks via bulk CSV import parser or directly into the live web grid.',
      'Auto-convert numerical scores to respective CBC, Cambridge, TVET, or IB scales.',
      'Analyze class grade distributions, standard deviations, and subject performance indices.',
      'Publish academic timetables and attach video-lesson links to student portals.'
    ]
  },
  parent: {
    title: 'Transparent Parent Self-Service',
    icon: '👨‍👩‍👧',
    color: '#8B5CF6',
    badge: 'Trust & Direct Engagement',
    desc: 'Build trust with a secure, real-time parent portal. Parents track their children\'s grades, clear balances with one-tap payment options, and receive immediate SMS notifications.',
    bullets: [
      'Inspect detailed student fees ledger history, itemized charges, and payment records.',
      'Initiate instant fee clearing via Safaricom M-Pesa STK push options.',
      'Download print-ready, official report cards containing an anti-fraud verification QR code.',
      'Track real-time child attendance indicators, academic progress curves, and teacher notes.',
      'Receive instant SMS notifications for class alerts and invoice reminders.'
    ]
  },
  student: {
    title: 'Interactive Learning & Schedules',
    icon: '🎓',
    color: '#F59E0B',
    badge: 'Self-Directed Academic Progress',
    desc: 'Provide students with direct access to academic timetables, course learning documents, performance charts, and live video lecture rooms.',
    bullets: [
      'Access class timetables, subject lessons, and uploaded digital resources.',
      'Join live video lecture sessions using configured Jitsi or Daily.co nodes.',
      'Track individual academic performance deviations and forecasted grade metrics.',
      'Check dynamic school term calendars, exam schedules, and holiday dates.'
    ]
  }
};

export const ALL_FEATURES_BLUEPRINT = [
  // Finance & Payments
  { id: 'mpesa', category: 'finance', icon: '💳', title: 'M-Pesa STK Push Integration', desc: 'Direct push to parent phones enabling one-tap school fee clearing with automatic M-Pesa callbacks.', detail: 'Triggers Safaricom Daraja API STK push requests directly from the fee balance sheet. Once cleared, Safaricom calls our secure webhook which credits the student ledger, generates a digital receipt, and notifies parents.' },
  { id: 'pesapal', category: 'finance', icon: '🏦', title: 'Pesapal Checkout Engine', desc: 'Card, Airtel Money, and bank transfer payments with instant validation and ledger reconciliation.', detail: 'Integrates the official Pesapal v3 API checkout flow, redirecting parents to a secure payments portal that returns transaction status immediately to reconcile school bank balances.' },
  { id: 'revenue', category: 'finance', icon: '📊', title: 'Revenue Visibility Dashboard', desc: 'Real-time collection gauges, fee structure summaries, expected yields, and live arrears tracking.', detail: 'Displays visual gauges comparing budgeted term fees, actual cash collected, unpaid arrears, and historical collection trends per stream and grade.' },
  { id: 'payroll', category: 'finance', icon: '💼', title: 'Transparent Staff Payroll Engine', desc: 'Full payroll with PAYE, SHIF/NHIF, NSSF, Sacco deductions, salary advances, and printable payslips.', detail: 'Generates detailed payslips separating statutory columns (PAYE, SHIF/NHIF, NSSF) from custom deductions (Sacco dues, emergency loans, salary advances). Each payslip includes a QR verification code.' },
  { id: 'settlement', category: 'finance', icon: '🏧', title: 'Platform Settlement Queues', desc: 'Track escrow-to-bank payout flows, transaction splits, and settlement schedules in real time.', detail: 'Monitors the B2C disbursement pipeline. Tracks when fee collections are swept from escrow to institutional bank accounts with clear settlement dates and bank reference codes.' },
  { id: 'ledger', category: 'finance', icon: '🗂️', title: 'Multi-Term Fee Ledger', desc: 'Per-student T1/T2/T3 fee balance tracking with automatic arrears carry-forward and parent receipt history.', detail: 'Every learner stores three-term fee balances with automatic arrears computation. Parents view their full payment history. Admins apply manual cash adjustments with full audit trail entries.' },
  { id: 'allocations', category: 'finance', icon: '📁', title: 'Budget Allocations and Vote-heads', desc: 'Institutional procurement tracking with supplier registry, vote-heads, and expenditure records.', detail: 'Tracks school expenditure against defined budget vote-heads. Maintains a supplier registry and links purchase orders to specific fund allocations for full financial accountability.' },

  // Academics & Reports
  { id: 'grading', category: 'academics', icon: '⚖️', title: 'Curriculum-Aware Grading Engine', desc: 'Adaptable evaluation for CBC, TVET/CBET, Cambridge, IB, British, and Montessori frameworks simultaneously.', detail: 'Adapts backend formulas per student grade level. Handles Kenya CBC formative strands, TVET units of competency, Cambridge grade boundary curves, IB 0-8 rubrics, British National Curriculum levels, and Montessori progress observations.' },
  { id: 'analytics', category: 'academics', icon: '🏆', title: 'Advanced Exam Analytics', desc: 'Subject rankings, standard deviations, Subject Performance Index, and Learner Pathway visualizations.', detail: 'Analyzes scores to produce class-wide summaries. Computes subject ranks, standard deviations, teacher Subject Performance Index (SPI), and identifies at-risk students. Includes a Learner Pathways tab for individual trajectory tracking.' },
  { id: 'predictor', category: 'academics', icon: '🔮', title: 'AI-Powered Grade Predictor', desc: 'Forecasting algorithms projecting national exam scores from historical performance trajectories.', detail: 'Uses historical test averages and curriculum weightages to trace individual learning trajectories, forecasting future national exam targets (KCSE, IGCSE) based on longitudinal progress gradients.' },
  { id: 'reportcards', category: 'academics', icon: '📋', title: 'QR-Verified Digital Report Cards', desc: 'Tamper-proof academic transcripts with embedded anti-fraud QR codes validated against live database records.', detail: 'Generates print-ready termly report cards with teacher remarks, class metrics, attendance summaries, and an encrypted QR code that links to verified database records — stopping transcript forgery at source.' },
  { id: 'markbooks', category: 'academics', icon: '📚', title: 'Teacher Digital Markbooks', desc: 'Score collection with auto-save, offline cache mode, and instant edge-computed formula results.', detail: 'Optimized interface for assignments, mid-terms, and end-terms running instant calculations on the edge runtime. Offline marks sync automatically when connectivity resumes.' },
  { id: 'meritlist', category: 'academics', icon: '🥇', title: 'Automated Merit Lists', desc: 'Instant sortable class and grade-wide merit rankings with printable PDF export.', detail: 'Aggregates all subject scores per learner to auto-generate ranked merit lists. Admins filter by stream, apply score thresholds, and export to print-ready PDFs.' },
  { id: 'timetable', category: 'academics', icon: '🗓️', title: 'AI Timetable Generator', desc: 'Constraint-solving scheduler that resolves teacher conflicts and optimizes workloads automatically.', detail: 'Generates conflict-free weekly timetables. Detects double-booked teachers across streams, enforces break periods, and produces printable timetable sheets per class and per teacher.' },
  { id: 'attendance', category: 'academics', icon: '✅', title: 'Digital Attendance Register', desc: 'Daily roll-call with automated parent SMS absence alerts and term-end attendance reports.', detail: "Teachers mark daily attendance via a responsive register. Absent students trigger immediate SMS notifications to parents via Africa's Talking. Attendance history feeds directly into term report summaries." },

  // Communications
  { id: 'sms', category: 'comms', icon: '🚀', title: "Africa's Talking SMS Hub", desc: 'Bulk SMS for attendance, fee reminders, exam results, and school-wide emergency alerts.', detail: "Integrates Africa's Talking gateway for high-throughput SMS broadcasting. Templates broadcast student absence alerts, fee balance reminders, exam result notifications, and emergency alerts to all parent contacts." },
  { id: 'whatsapp', category: 'comms', icon: '🟢', title: 'WhatsApp Direct Support', desc: 'Persistent WhatsApp channel for instant parent-to-support communication and school assistance.', detail: 'Embedded WhatsApp click-to-chat integration connecting parents and school administrators directly to the EduVantage support team for billing queries, technical issues, and onboarding help.' },
  { id: 'email', category: 'comms', icon: '📧', title: 'Transactional Email Engine', desc: 'Automated emails for receipts, password resets, admission confirmations, and exam summaries.', detail: 'Built-in mail client dispatches automated transactional emails including fee payment receipts, staff credential emails, parent portal access invitations, and admin alerts without third-party dependencies.' },
  { id: 'messages', category: 'comms', icon: '💬', title: 'Internal Multi-Role Messaging', desc: 'Role-restricted internal communication for admin, teacher, staff, and parent workspaces.', detail: 'A secure internal messaging board where administrators issue general notices, teachers communicate with individual parents, and staff file internal requests with real-time unread count badges.' },
  { id: 'alerts', category: 'comms', icon: '🔔', title: 'Context-Aware Push Notifications', desc: 'Real-time notifications for duties, pending approvals, new messages, and calendar events.', detail: 'Fires in-app notifications to teachers for scheduled duties, alerts admins to pending staff requests, and shows real-time unread badges via the background sync engine.' },
  { id: 'delivery', category: 'comms', icon: '📲', title: 'SMS Delivery Observability', desc: 'Webhook logs tracking carrier delivery receipts to confirm every parent notification was delivered.', detail: 'Dedicated delivery webhook endpoint consumes callback statuses from carriers. Admins view delivery logs confirming whether each SMS reached the parent handset.' },
];

export const TRUST_POINTS = [
  { label: 'Comprehensive Workflows', value: 'Manage admissions, fees, grading, attendance, and reports in one place.' },
  { label: 'Seamless Communication', value: 'Built-in support for SMS and email to keep parents informed.' },
  { label: 'Secure and Reliable', value: 'Fast, dependable, and easy to use on any device.' },
];
