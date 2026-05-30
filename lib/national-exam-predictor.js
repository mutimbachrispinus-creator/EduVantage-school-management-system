const DEFAULT_ASSESSMENTS = [
  { id: 'op1', key: 'op1', label: 'Opener' },
  { id: 'mt1', key: 'mt1', label: 'Mid-Term' },
  { id: 'et1', key: 'et1', label: 'End-Term' }
];

const DEFAULT_TERMS = [
  { id: 'T1', name: 'Term 1' },
  { id: 'T2', name: 'Term 2' },
  { id: 'T3', name: 'Term 3' }
];

const KPSEA_SCALE = [
  { min: 75, max: 100, lv: 'EE', pts: 4, desc: 'Exceeding Expectation', c: '#065F46', bg: '#D1FAE5' },
  { min: 50, max: 74, lv: 'ME', pts: 3, desc: 'Meeting Expectation', c: '#1D4ED8', bg: '#DBEAFE' },
  { min: 25, max: 49, lv: 'AE', pts: 2, desc: 'Approaching Expectation', c: '#B45309', bg: '#FEF3C7' },
  { min: 0, max: 24, lv: 'BE', pts: 1, desc: 'Below Expectation', c: '#DC2626', bg: '#FEE2E2' },
];

const KNEC_CBE_8_SCALE = [
  { min: 90, max: 100, lv: 'EE1', pts: 8, desc: 'Exceptional', c: '#065F46', bg: '#D1FAE5' },
  { min: 75, max: 89, lv: 'EE2', pts: 7, desc: 'Very Good', c: '#059669', bg: '#A7F3D0' },
  { min: 58, max: 74, lv: 'ME1', pts: 6, desc: 'Good', c: '#1D4ED8', bg: '#BFDBFE' },
  { min: 41, max: 57, lv: 'ME2', pts: 5, desc: 'Fair', c: '#2563EB', bg: '#DBEAFE' },
  { min: 31, max: 40, lv: 'AE1', pts: 4, desc: 'Needs Improvement', c: '#B45309', bg: '#FDE68A' },
  { min: 21, max: 30, lv: 'AE2', pts: 3, desc: 'Below Average', c: '#92400E', bg: '#FEF3C7' },
  { min: 11, max: 20, lv: 'BE1', pts: 2, desc: 'Well Below Average', c: '#DC2626', bg: '#FEE2E2' },
  { min: 0, max: 10, lv: 'BE2', pts: 1, desc: 'Minimal', c: '#991B1B', bg: '#FCA5A5' },
];

const GCSE_SCALE = [
  { min: 90, max: 100, lv: '9', desc: 'Outstanding', c: '#065F46', bg: '#D1FAE5' },
  { min: 80, max: 89, lv: '8', desc: 'Excellent', c: '#059669', bg: '#A7F3D0' },
  { min: 70, max: 79, lv: '7', desc: 'Very Good', c: '#1D4ED8', bg: '#BFDBFE' },
  { min: 60, max: 69, lv: '6', desc: 'Good', c: '#2563EB', bg: '#DBEAFE' },
  { min: 50, max: 59, lv: '5', desc: 'Strong Pass', c: '#B45309', bg: '#FDE68A' },
  { min: 40, max: 49, lv: '4', desc: 'Standard Pass', c: '#D97706', bg: '#FEF3C7' },
  { min: 30, max: 39, lv: '3', desc: 'Working Towards', c: '#92400E', bg: '#FFF7ED' },
  { min: 20, max: 29, lv: '2', desc: 'Below Pass', c: '#DC2626', bg: '#FEE2E2' },
  { min: 10, max: 19, lv: '1', desc: 'Well Below', c: '#B91C1C', bg: '#FEE2E2' },
  { min: 0, max: 9, lv: 'U', desc: 'Ungraded', c: '#64748B', bg: '#F1F5F9' },
];

const ALEVEL_SCALE = [
  { min: 80, max: 100, lv: 'A*', desc: 'Outstanding', c: '#065F46', bg: '#D1FAE5' },
  { min: 70, max: 79, lv: 'A', desc: 'Excellent', c: '#059669', bg: '#A7F3D0' },
  { min: 60, max: 69, lv: 'B', desc: 'Very Good', c: '#1D4ED8', bg: '#BFDBFE' },
  { min: 50, max: 59, lv: 'C', desc: 'Good', c: '#B45309', bg: '#FDE68A' },
  { min: 40, max: 49, lv: 'D', desc: 'Satisfactory', c: '#92400E', bg: '#FEF3C7' },
  { min: 30, max: 39, lv: 'E', desc: 'Pass', c: '#DC2626', bg: '#FEE2E2' },
  { min: 0, max: 29, lv: 'U', desc: 'Ungraded', c: '#64748B', bg: '#F1F5F9' },
];

const CAM_IGCSE_SCALE = [
  { min: 90, max: 100, lv: 'A*', desc: 'Outstanding', c: '#065F46', bg: '#D1FAE5' },
  { min: 80, max: 89, lv: 'A', desc: 'Excellent', c: '#059669', bg: '#A7F3D0' },
  { min: 70, max: 79, lv: 'B', desc: 'Very Good', c: '#1D4ED8', bg: '#BFDBFE' },
  { min: 60, max: 69, lv: 'C', desc: 'Good', c: '#2563EB', bg: '#DBEAFE' },
  { min: 50, max: 59, lv: 'D', desc: 'Satisfactory', c: '#B45309', bg: '#FDE68A' },
  { min: 40, max: 49, lv: 'E', desc: 'Pass', c: '#92400E', bg: '#FEF3C7' },
  { min: 30, max: 39, lv: 'F', desc: 'Fail', c: '#DC2626', bg: '#FEE2E2' },
  { min: 20, max: 29, lv: 'G', desc: 'Fail', c: '#B91C1C', bg: '#FEE2E2' },
  { min: 0, max: 19, lv: 'U', desc: 'Ungraded', c: '#64748B', bg: '#F1F5F9' },
];

const IB_SCALE = [
  { min: 85, max: 100, lv: '7', desc: 'Excellent', c: '#065F46', bg: '#D1FAE5' },
  { min: 75, max: 84, lv: '6', desc: 'Very Good', c: '#059669', bg: '#A7F3D0' },
  { min: 65, max: 74, lv: '5', desc: 'Good', c: '#1D4ED8', bg: '#BFDBFE' },
  { min: 50, max: 64, lv: '4', desc: 'Satisfactory', c: '#2563EB', bg: '#DBEAFE' },
  { min: 40, max: 49, lv: '3', desc: 'Mediocre', c: '#B45309', bg: '#FDE68A' },
  { min: 25, max: 39, lv: '2', desc: 'Poor', c: '#92400E', bg: '#FEF3C7' },
  { min: 0, max: 24, lv: '1', desc: 'Very Poor', c: '#DC2626', bg: '#FEE2E2' },
];

const CDACC_SCALE = [
  { min: 80, max: 100, lv: 'Distinction', desc: 'Competent with Distinction', c: '#065F46', bg: '#D1FAE5' },
  { min: 65, max: 79, lv: 'Credit', desc: 'Competent with Credit', c: '#1D4ED8', bg: '#DBEAFE' },
  { min: 40, max: 64, lv: 'Pass', desc: 'Competent', c: '#B45309', bg: '#FDE68A' },
  { min: 0, max: 39, lv: 'Referral', desc: 'Not Yet Competent', c: '#DC2626', bg: '#FEE2E2' },
];

const MONTESSORI_SCALE = [
  { min: 90, max: 100, lv: 'M', desc: 'Mastered - Independent', c: '#065F46', bg: '#D1FAE5' },
  { min: 70, max: 89, lv: 'P', desc: 'Proficient', c: '#1D4ED8', bg: '#DBEAFE' },
  { min: 40, max: 69, lv: 'D', desc: 'Developing', c: '#B45309', bg: '#FDE68A' },
  { min: 0, max: 39, lv: 'E', desc: 'Emerging', c: '#DC2626', bg: '#FEE2E2' },
];

export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : 0));
}

export function normalizeAssessments(types = DEFAULT_ASSESSMENTS) {
  const list = Array.isArray(types) && types.length ? types : DEFAULT_ASSESSMENTS;
  return list.map(item => ({
    id: item.id || item.key,
    label: String(item.label || item.name || item.id || item.key).replace(/^[^\w]+/u, '').trim()
  })).filter(item => item.id);
}

export function normalizeTerms(terms = DEFAULT_TERMS) {
  const list = Array.isArray(terms) && terms.length ? terms : DEFAULT_TERMS;
  return list.map(item => ({
    id: item.id,
    name: item.name || item.label || item.id
  })).filter(item => item.id);
}

export function getForecastSeries(terms = DEFAULT_TERMS, assessments = DEFAULT_ASSESSMENTS) {
  return normalizeTerms(terms).flatMap(term =>
    normalizeAssessments(assessments).map(assessment => ({
      term: term.id,
      assess: assessment.id,
      label: `${term.name} ${assessment.label}`
    }))
  );
}

export function getExamForGrade(grade, curriculum) {
  const cur = (curriculum || 'CBC').toUpperCase();
  if (cur === 'CBC') {
    if (grade === 'GRADE 6') return { name: 'KPSEA', body: 'KNEC', level: 'Upper Primary', scale: KPSEA_SCALE, note: 'Grade 6 national assessment reports broad competency levels.' };
    if (grade === 'GRADE 9') return { name: 'KJSEA', body: 'KNEC', level: 'Junior School', scale: KNEC_CBE_8_SCALE, note: 'KNEC KJSEA reporting uses EE1, EE2, ME1, ME2, AE1, AE2, BE1 and BE2.' };
    if (['GRADE 7', 'GRADE 8'].includes(grade)) return { name: 'KJSEA Readiness', body: 'KNEC', level: 'Junior School SBA', scale: KNEC_CBE_8_SCALE, note: 'Readiness forecast uses KJSEA achievement-level language.' };
    if (['GRADE 10', 'GRADE 11'].includes(grade)) return { name: 'KCBE SBA Readiness', body: 'KNEC', level: 'Senior School', scale: KNEC_CBE_8_SCALE, note: 'Senior School forecasts align to competency-based national reporting language.' };
    if (grade === 'GRADE 12') return { name: 'KCBE', body: 'KNEC', level: 'Senior School Exit', scale: KNEC_CBE_8_SCALE, note: 'Grade 12 forecast targets the Kenya Certificate of Basic Education.' };
    if (['KINDERGARTEN', 'PP1', 'PP2', 'GRADE 1', 'GRADE 2', 'GRADE 3'].includes(grade)) return { name: 'Foundational CBA', body: 'KNEC/KICD', level: 'Early Years', scale: KPSEA_SCALE, note: 'Early years use competency-level progress reporting, not high-stakes ranking.' };
    return { name: 'KPSEA Readiness', body: 'KNEC', level: 'Primary School SBA', scale: KPSEA_SCALE, note: 'Primary readiness is expressed in competency bands.' };
  }
  if (cur === 'BRITISH') {
    if (['YEAR 12', 'YEAR 13'].includes(grade)) return { name: 'A-Level', body: 'Ofqual / Awarding Body', level: 'Key Stage 5', scale: ALEVEL_SCALE };
    if (['YEAR 10', 'YEAR 11'].includes(grade)) return { name: 'GCSE (9-1)', body: 'Ofqual / Awarding Body', level: 'Key Stage 4', scale: GCSE_SCALE };
    if (grade === 'YEAR 6') return { name: 'Key Stage 2 SATs', body: 'STA', level: 'Key Stage 2', scale: KPSEA_SCALE };
    return { name: 'Key Stage Readiness', body: 'School / STA', level: 'British National Curriculum', scale: KPSEA_SCALE };
  }
  if (cur === 'CAMBRIDGE') {
    if (['STAGE 12', 'STAGE 13'].includes(grade)) return { name: 'Cambridge International AS & A Level', body: 'CAIE', level: 'Advanced', scale: ALEVEL_SCALE };
    if (['STAGE 10', 'STAGE 11'].includes(grade)) return { name: 'Cambridge IGCSE', body: 'CAIE', level: 'Upper Secondary', scale: CAM_IGCSE_SCALE };
    if (['STAGE 6', 'STAGE 9'].includes(grade)) return { name: 'Cambridge Checkpoint', body: 'CAIE', level: 'Checkpoint', scale: KPSEA_SCALE };
    return { name: 'Cambridge Progression Readiness', body: 'CAIE / School', level: 'Cambridge Pathway', scale: KPSEA_SCALE };
  }
  if (cur === 'IB') {
    if (['DP 1', 'DP 2'].includes(grade)) return { name: 'IB Diploma Programme', body: 'IBO', level: 'DP', scale: IB_SCALE };
    if (grade?.startsWith('MYP')) return { name: 'IB MYP eAssessment', body: 'IBO', level: 'MYP', scale: IB_SCALE };
    return { name: 'IB PYP Exhibition / Portfolio', body: 'IBO', level: 'PYP', scale: MONTESSORI_SCALE };
  }
  if (cur === 'TVET') return { name: 'CBET Summative Assessment', body: 'CDACC / KNEC', level: 'TVET', scale: CDACC_SCALE };
  if (cur === 'MONTESSORI') return { name: 'Portfolio Assessment', body: 'AMI / AMS', level: 'Montessori', scale: MONTESSORI_SCALE };
  return { name: 'National Exam', body: 'KNEC', scale: KPSEA_SCALE };
}

export function examBand(score, grade, curriculum) {
  const examInfo = getExamForGrade(grade, curriculum);
  const value = clamp(score);
  const entry = examInfo.scale.find(x => value >= x.min) || examInfo.scale[examInfo.scale.length - 1];
  return {
    label: `${entry.lv} - ${entry.desc}`,
    lv: entry.lv,
    pts: entry.pts ?? null,
    desc: entry.desc,
    color: entry.c,
    bg: entry.bg,
    examName: examInfo.name,
    examBody: examInfo.body,
  };
}

export function isInterventionBand(band) {
  const points = Number(band?.pts);
  return ['AE1', 'AE2', 'BE1', 'BE2', 'AE', 'BE', 'D', 'E', 'F', 'G', 'U', 'Referral'].includes(band?.lv) ||
    (band?.pts !== null && Number.isFinite(points) && points <= 3);
}

export function isStrongBand(band) {
  const points = Number(band?.pts);
  return ['EE', 'EE1', 'EE2', 'A*', 'A', '9', '8', '7', 'Distinction', 'M'].includes(band?.lv) ||
    (band?.pts !== null && Number.isFinite(points) && points >= 7);
}

function linearSlope(values) {
  if (values.length < 2) return 0;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;
  const numerator = values.reduce((sum, y, x) => sum + ((x - meanX) * (y - meanY)), 0);
  const denominator = values.reduce((sum, _, x) => sum + ((x - meanX) ** 2), 0);
  return denominator ? numerator / denominator : 0;
}

function weightedAverage(values) {
  if (!values.length) return 0;
  const totalWeight = values.reduce((sum, _, index) => sum + index + 1, 0);
  return values.reduce((sum, value, index) => sum + (value * (index + 1)), 0) / totalWeight;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + ((v - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function readScore(marks, point, grade, subject, adm) {
  const group = marks?.[`${point.term}:${grade}|${subject}|${point.assess}`];
  const value = group?.[adm];
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? clamp(num) : null;
}

function getRecommendation({ series, band, trend, volatility, coverage, subjectBreadth, weakSubjects }) {
  if (series.length < 3 || coverage < 0.25) {
    return 'Capture more marks across terms before making high-stakes placement decisions.';
  }
  if (isInterventionBand(band)) {
    return `Start a monitored intervention plan for ${band.lv}, prioritising ${weakSubjects.slice(0, 3).join(', ') || 'low-scoring learning areas'}.`;
  }
  if (trend < -1.5) {
    return 'Performance is declining. Audit attendance, assignments, and the weakest recent subjects immediately.';
  }
  if (volatility > 12) {
    return 'Results are unstable. Increase timed practice and moderate assessment consistency before final prediction.';
  }
  if (subjectBreadth < 0.7) {
    return 'Prediction is based on limited subject coverage. Capture missing core subjects to improve confidence.';
  }
  if (isStrongBand(band)) {
    return 'Protect top-band performance with extension tasks, timed mocks, and subject-specific stretch targets.';
  }
  return 'Maintain pace with weekly practice, feedback corrections, and monitored subject targets.';
}

export function buildNationalForecast({
  learners = [],
  marks = {},
  grade,
  curriculum = 'CBC',
  subjects = [],
  terms = DEFAULT_TERMS,
  assessments = DEFAULT_ASSESSMENTS,
}) {
  const forecastSeries = getForecastSeries(terms, assessments);
  const classLearners = learners.filter(l => l.grade === grade);
  const totalPossibleEntries = Math.max(1, forecastSeries.length * Math.max(1, subjects.length));

  const rawRows = classLearners.map(learner => {
    const subjectStats = subjects.map(subject => {
      const scores = forecastSeries
        .map((point, index) => ({ point, index, score: readScore(marks, point, grade, subject, learner.adm) }))
        .filter(item => item.score !== null);
      const latest = scores[scores.length - 1];
      return {
        subject,
        scores,
        latest: latest?.score ?? null,
        average: scores.length ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length : null,
      };
    });

    const series = forecastSeries.map((point, index) => {
      const scores = subjects
        .map(subject => readScore(marks, point, grade, subject, learner.adm))
        .filter(score => score !== null);
      if (!scores.length) return null;
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return { ...point, index, avg: Number(avg.toFixed(1)), entries: scores.length };
    }).filter(Boolean);

    if (!series.length) return null;

    const averages = series.map(point => point.avg);
    const current = averages[averages.length - 1];
    const baseline = averages[0];
    const recency = weightedAverage(averages);
    const slope = linearSlope(averages);
    const volatility = standardDeviation(averages);
    const remaining = Math.max(1, forecastSeries.length - series[series.length - 1].index - 1);
    const trendImpact = clamp(slope * remaining * 0.55, -9, 9);
    const subjectBreadth = subjects.length
      ? subjectStats.filter(s => s.scores.length > 0).length / subjects.length
      : 0;
    const entryCount = subjectStats.reduce((sum, stat) => sum + stat.scores.length, 0);
    const coverage = entryCount / totalPossibleEntries;
    const weakSubjects = subjectStats
      .filter(stat => stat.latest !== null && stat.latest < 41)
      .sort((a, b) => a.latest - b.latest)
      .map(stat => stat.subject);

    const latestSubjectAverage = subjectStats
      .filter(stat => stat.latest !== null)
      .reduce((sum, stat, _, arr) => sum + (stat.latest / arr.length), 0);
    const subjectPenalty = weakSubjects.length ? Math.min(6, weakSubjects.length * 1.25) : 0;
    const volatilityPenalty = Math.min(5, volatility * 0.15);
    const breadthPenalty = subjectBreadth < 0.65 ? (0.65 - subjectBreadth) * 10 : 0;
    const consistencyBonus = volatility <= 5 && series.length >= 4 ? 1.5 : 0;

    const modelScore = (recency * 0.42) +
      (current * 0.28) +
      (latestSubjectAverage * 0.18) +
      ((baseline + current) / 2 * 0.12) +
      trendImpact -
      subjectPenalty -
      volatilityPenalty -
      breadthPenalty +
      consistencyBonus;

    return {
      ...learner,
      series,
      subjectStats,
      current: Number(current.toFixed(1)),
      baseline: Number(baseline.toFixed(1)),
      recency: Number(recency.toFixed(1)),
      trend: Number(slope.toFixed(2)),
      momentum: Number(slope.toFixed(1)),
      volatility: Number(volatility.toFixed(1)),
      coverage,
      subjectBreadth,
      weakSubjects,
      rawForecast: modelScore,
    };
  }).filter(Boolean);

  const cohortMean = rawRows.length
    ? rawRows.reduce((sum, row) => sum + row.rawForecast, 0) / rawRows.length
    : 0;

  const rows = rawRows.map(row => {
    const confidenceFactor = Math.min(1, (row.coverage * 0.62) + (row.subjectBreadth * 0.28) + (Math.min(row.series.length, 6) / 6 * 0.1));
    const blended = (row.rawForecast * confidenceFactor) + (cohortMean * (1 - confidenceFactor));
    const forecast = Number(clamp(blended, 0, 100).toFixed(1));
    const band = examBand(forecast, grade, curriculum);
    const confidence = Math.round(clamp(
      25 + (row.coverage * 38) + (row.subjectBreadth * 22) + (Math.min(row.series.length, 6) * 3) - Math.min(12, row.volatility * 0.6),
      20,
      95
    ));

    return {
      ...row,
      forecast,
      band,
      confidence,
      coveragePct: Math.round(row.coverage * 100),
      subjectBreadthPct: Math.round(row.subjectBreadth * 100),
      recommendation: getRecommendation({
        series: row.series,
        band,
        trend: row.trend,
        volatility: row.volatility,
        coverage: row.coverage,
        subjectBreadth: row.subjectBreadth,
        weakSubjects: row.weakSubjects,
      }),
    };
  }).sort((a, b) => b.forecast - a.forecast);

  const avgForecast = rows.length ? rows.reduce((sum, row) => sum + row.forecast, 0) / rows.length : 0;
  const avgConfidence = rows.length ? rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length : 0;

  return {
    rows,
    candidates: classLearners.length,
    forecasted: rows.length,
    avgForecast: Number(avgForecast.toFixed(1)),
    avgConfidence: Math.round(avgConfidence),
    top: rows[0] || null,
    watch: rows.filter(row => isInterventionBand(row.band)).length,
    strong: rows.filter(row => isStrongBand(row.band)).length,
  };
}
