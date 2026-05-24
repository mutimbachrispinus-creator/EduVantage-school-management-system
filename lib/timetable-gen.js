// lib/timetable-gen.js

const SIMILAR = [['English','Kiswahili'],['Mathematics','Science'],['Physics','Chemistry'],['Biology','Agriculture'],['Integrated Science','Mathematics']];

export function isSimilar(a,b) {
  return SIMILAR.some(g => g.includes(a) && g.includes(b));
}

// Default subject configurations per level for generating
export function getDefaultSubjectConfig(subjName, lvl) {
  const defaults = {
    'primary13': [
      {n:'English', l:6, d:false, p:'morning'}, {n:'Kiswahili', l:5, d:false, p:'morning'},
      {n:'Mathematics', l:6, d:false, p:'morning'}, {n:'Science', l:4, d:true, p:'any'},
      {n:'Social Studies', l:3, d:false, p:'any'}, {n:'CRE', l:2, d:false, p:'any'},
      {n:'PE', l:2, d:false, p:'afternoon'}, {n:'Creative Arts', l:3, d:true, p:'afternoon'}
    ],
    'primary46': [
      {n:'English', l:6, d:false, p:'morning'}, {n:'Kiswahili', l:5, d:false, p:'morning'},
      {n:'Mathematics', l:6, d:false, p:'morning'}, {n:'Science', l:5, d:true, p:'any'},
      {n:'Social Studies', l:4, d:false, p:'any'}, {n:'CRE', l:2, d:false, p:'any'},
      {n:'Agriculture', l:3, d:false, p:'any'}, {n:'Home Science', l:2, d:true, p:'afternoon'},
      {n:'PE', l:2, d:false, p:'afternoon'}
    ],
    'jss': [
      {n:'English', l:6, d:false, p:'morning'}, {n:'Kiswahili', l:5, d:false, p:'morning'},
      {n:'Mathematics', l:6, d:false, p:'morning'}, {n:'Integrated Science', l:6, d:true, p:'any'},
      {n:'Social Studies', l:4, d:false, p:'any'}, {n:'CRE', l:2, d:false, p:'any'},
      {n:'Agriculture', l:3, d:false, p:'any'}, {n:'Home Science', l:3, d:true, p:'afternoon'},
      {n:'Business Studies', l:3, d:false, p:'any'}, {n:'Computer Studies', l:3, d:false, p:'any'},
      {n:'PE', l:2, d:false, p:'afternoon'}, {n:'Creative Arts', l:2, d:true, p:'afternoon'},
      {n:'PPI', l:1, d:false, p:'morning'}
    ],
    'senior': [
      {n:'English', l:5, d:false, p:'morning'}, {n:'Kiswahili', l:4, d:false, p:'morning'},
      {n:'Mathematics', l:5, d:false, p:'morning'}, {n:'Physics', l:5, d:true, p:'any'},
      {n:'Chemistry', l:5, d:true, p:'any'}, {n:'Biology', l:4, d:true, p:'any'},
      {n:'History', l:4, d:false, p:'any'}, {n:'Geography', l:4, d:false, p:'any'},
      {n:'CRE', l:2, d:false, p:'any'}, {n:'PE', l:2, d:false, p:'afternoon'}
    ],
    // British Curriculum
    'ks1': [
      {n:'English', l:8, d:false, p:'morning'}, {n:'Mathematics', l:6, d:false, p:'morning'},
      {n:'Science', l:4, d:true, p:'any'}, {n:'Geography', l:2, d:false, p:'any'},
      {n:'History', l:2, d:false, p:'any'}, {n:'Art', l:2, d:true, p:'afternoon'},
      {n:'Computing', l:2, d:false, p:'any'}, {n:'Music', l:2, d:false, p:'any'},
      {n:'PE', l:3, d:false, p:'afternoon'}
    ],
    'ks3': [
      {n:'English', l:6, d:false, p:'morning'}, {n:'Mathematics', l:6, d:false, p:'morning'},
      {n:'Science', l:6, d:true, p:'any'}, {n:'French', l:3, d:false, p:'any'},
      {n:'Geography', l:2, d:false, p:'any'}, {n:'History', l:2, d:false, p:'any'},
      {n:'ICT', l:2, d:false, p:'any'}, {n:'Art', l:2, d:true, p:'afternoon'},
      {n:'PE', l:2, d:false, p:'afternoon'}
    ],
    'igcse': [
      {n:'English', l:5, d:false, p:'morning'}, {n:'Mathematics', l:5, d:false, p:'morning'},
      {n:'Physics', l:4, d:true, p:'any'}, {n:'Chemistry', l:4, d:true, p:'any'},
      {n:'Biology', l:4, d:true, p:'any'}, {n:'ICT', l:3, d:false, p:'any'},
      {n:'Business Studies', l:4, d:false, p:'any'}, {n:'Geography', l:3, d:false, p:'any'}
    ],
    // IB
    'pyp': [
      {n:'Language', l:8, d:false, p:'morning'}, {n:'Mathematics', l:7, d:false, p:'morning'},
      {n:'Science', l:5, d:true, p:'any'}, {n:'Social Studies', l:4, d:false, p:'any'},
      {n:'Arts', l:4, d:true, p:'afternoon'}, {n:'PE', l:3, d:false, p:'afternoon'}
    ],
    'myp': [
      {n:'Language & Literature', l:5, d:false, p:'morning'}, {n:'Mathematics', l:5, d:false, p:'morning'},
      {n:'Sciences', l:6, d:true, p:'any'}, {n:'Individuals & Societies', l:4, d:false, p:'any'},
      {n:'Language Acquisition', l:4, d:false, p:'any'}, {n:'Arts', l:4, d:true, p:'afternoon'},
      {n:'Design', l:3, d:true, p:'any'}, {n:'PE', l:3, d:false, p:'afternoon'}
    ]
  };
  
  const defs = defaults[lvl] || defaults['primary13'];
  const match = defs.find(d => d.n.toLowerCase() === subjName.toLowerCase());
  if (match) return { lessons: match.l, dbl: match.d, priority: match.p };
  // fallback for unknown subjects
  return { lessons: 4, dbl: false, priority: 'any' };
}

export function generateTimetableData(subjects, cfg, DAYS) {
  let bestGrid = null;
  let bestUnplaced = null;
  let minUnplaced = Infinity;

  // Run multiple randomized generations to find the most optimal (fewest unplaced)
  for (let attempt = 0; attempt < 15; attempt++) {
    const { grid, unplaced } = runSingleGeneration(subjects, cfg, DAYS);
    if (unplaced.length < minUnplaced) {
      minUnplaced = unplaced.length;
      bestGrid = grid;
      bestUnplaced = unplaced;
    }
    if (minUnplaced === 0) break; // Perfect timetable!
  }

  return { grid: bestGrid, unplaced: bestUnplaced };
}

function runSingleGeneration(subjects, cfg, DAYS) {
  const globalMax = Math.max(...(cfg.perDay || [8]));
  
  let pool = [];
  subjects.forEach(s => {
    let singles = s.lessons;
    let doubles = 0;
    if (s.dbl && singles >= 2) {
      doubles = 1;
      singles -= 2;
    }
    for(let i=0; i<doubles; i++) pool.push({...s, double:true});
    for(let i=0; i<singles; i++) pool.push({...s, double:false});
  });

  // Randomize pool to explore different constraint paths
  pool = pool.sort(() => Math.random() - 0.5);

  // Sorting: Doubles first, then Morning priority, PPI at the absolute top
  pool.sort((a,b) => {
    if(a.name === 'PPI') return -1; if(b.name === 'PPI') return 1;
    if(a.double && !b.double) return -1;
    if(b.double && !a.double) return 1;
    if(a.priority === 'morning' && b.priority !== 'morning') return -1;
    if(b.priority === 'morning' && a.priority !== 'morning') return 1;
    if(a.priority === 'afternoon' && b.priority !== 'afternoon') return 1;
    if(b.priority === 'afternoon' && a.priority !== 'afternoon') return -1;
    return 0;
  });

  const grid = {};
  const subjectPerDay = {};
  const teacherBusy = {}; 

  DAYS.forEach((d, i) => { 
    grid[d] = {}; 
    subjectPerDay[d] = {};
    const dayMax = cfg.perDay[i] || cfg.perDay[0] || 8;
    for(let p=1; p<=dayMax; p++) grid[d][p] = null; 
  });

  function canPlace(day, period, item, relaxSpreading = false) {
    const dayIdx = DAYS.indexOf(day);
    const dayMax = cfg.perDay[dayIdx] || cfg.perDay[0] || 8;
    
    // Bounds check
    if(period > dayMax) return false;
    if(grid[day][period] !== null) return false;
    if(item.double && (period >= dayMax || grid[day][period+1] !== null)) return false;
    
    // Constraint: Spread subjects across the week (max 1 block per day)
    if (!relaxSpreading && item.name !== 'PPI') {
      const currentCount = subjectPerDay[day][item.name] || 0;
      if (currentCount >= 1) return false;
    }
    
    // Teacher constraint: Clash detection
    if(item.teacher) {
      if(!teacherBusy[item.teacher]) teacherBusy[item.teacher] = new Set();
      if(teacherBusy[item.teacher].has(day+'-'+period)) return false;
      if(item.double && teacherBusy[item.teacher].has(day+'-'+(period+1))) return false;
    }
    
    // Similar subjects constraint
    const prev = grid[day][period-1];
    if(prev && isSimilar(prev.subject || prev.name, item.name)) return false;
    const next = grid[day][period+(item.double?2:1)];
    if(next && isSimilar(next.subject || next.name, item.name)) return false;

    // Time-of-day priority
    if(item.priority === 'morning' && period > Math.ceil(dayMax/2)) return false;
    if(item.priority === 'afternoon' && period <= Math.ceil(dayMax/2)) return false;

    // Teacher constraint: Max 3 consecutive lessons
    if(item.teacher) {
      const isConsecutive = (d, p) => teacherBusy[item.teacher]?.has(d+'-'+(p-1)) && 
                                     teacherBusy[item.teacher]?.has(d+'-'+(p-2)) && 
                                     teacherBusy[item.teacher]?.has(d+'-'+(p-3));
      if (isConsecutive(day, period)) return false;
      if (item.double && isConsecutive(day, period + 1)) return false;
    }

    // Break boundaries: don't cross breaks for double lessons!
    if(item.double && cfg.breaks) {
      const crossesBreak = cfg.breaks.some(b => b.after === period);
      if (crossesBreak) return false;
    }

    return true;
  }

  function place(day, period, item) {
    grid[day][period] = { subject: item.name, teacher: item.teacher };
    subjectPerDay[day][item.name] = (subjectPerDay[day][item.name] || 0) + 1;
    
    if(item.teacher) {
      if(!teacherBusy[item.teacher]) teacherBusy[item.teacher] = new Set();
      teacherBusy[item.teacher].add(day+'-'+period);
    }
    if(item.double) {
      grid[day][period+1] = { subject: item.name, teacher: item.teacher, cont: true };
      if(item.teacher) teacherBusy[item.teacher].add(day+'-'+(period+1));
    }
  }

  // 1. Place PPI
  const ppi = pool.find(x => x.name === 'PPI');
  if(ppi) {
    for(let p=1; p<=globalMax; p++) {
      if(DAYS.every((d, i) => (p <= (cfg.perDay[i] || cfg.perDay[0])) && grid[d][p] === null)) {
        DAYS.forEach(d => place(d, p, ppi));
        pool = pool.filter(x => x.name !== 'PPI');
        break;
      }
    }
  }

  // 2. Place remaining pool
  let unplaced = [];
  pool.forEach(item => {
    let placed = false;
    
    // Pass 1: Strict constraints (including spread constraint)
    for(const day of DAYS) {
      const dayIdx = DAYS.indexOf(day);
      const dayMax = cfg.perDay[dayIdx] || cfg.perDay[0] || 8;
      // Start randomly to distribute evenly
      const periods = Array.from({length: dayMax}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      
      for(let p of periods) {
        if(canPlace(day, p, item, false)) { place(day, p, item); placed = true; break; }
      }
      if(placed) break;
    }
    
    // Pass 2: Relax spreading constraint (allow >1 of same subject per day)
    if (!placed) {
      for(const day of DAYS) {
        const dayIdx = DAYS.indexOf(day);
        const dayMax = cfg.perDay[dayIdx] || cfg.perDay[0] || 8;
        for(let p=1; p<=dayMax; p++) {
          if(canPlace(day, p, item, true)) { place(day, p, item); placed = true; break; }
        }
        if(placed) break;
      }
    }
    
    if(!placed) unplaced.push(item);
  });

  // Pass 3: Relax morning/afternoon priorities for unplaced
  unplaced = unplaced.filter(item => {
    if(item.priority === 'afternoon' || item.priority === 'morning') {
      const orig = item.priority; item.priority = 'any';
      for(const day of DAYS) {
        const dayIdx = DAYS.indexOf(day);
        const dayMax = cfg.perDay[dayIdx] || cfg.perDay[0] || 8;
        for(let p=1; p<=dayMax; p++) {
          if(canPlace(day, p, item, true)) { place(day, p, item); item.priority = orig; return false; }
        }
      }
      item.priority = orig;
    }
    return true; // Still unplaced
  });

  return { grid, unplaced };
}
