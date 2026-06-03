import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, query } from '@/lib/db';
import { getCurriculum } from '@/lib/curriculum';

const ALLOWED_ROLES = ['admin', 'admin_academics', 'super-admin'];

/**
 * Maps standard learner data into curriculum-specific payloads for National Examining Bodies.
 */
function formatForExamBody(curriculumId, learners) {
  switch (curriculumId) {
    case 'CBC':
      // KNEC Format (Kenya National Examinations Council)
      // Requires Index Number format, KPSEA/KCSE Subject Codes, and NEMIS UI
      return {
        examBody: 'KNEC',
        endpoint: 'https://registration.knec.ac.ke/api/v1/candidates',
        payload: learners.map((l, index) => ({
          _adm: l.adm,
          index_number: l.index_number || `PREFIX${String(index + 1).padStart(3, '0')}`,
          nemis_upi: l.nemis_upi || l.adm,
          candidate_name: l.name.toUpperCase(),
          gender: l.sex === 'M' ? 'Male' : 'Female',
          birth_date: l.dob,
          assessments: ['MATH', 'ENG', 'KISW', 'INT-SCI', 'CRE'] // Example KPSEA subjects
        }))
      };

    case 'CAMBRIDGE':
    case 'BRITISH':
      // CIE Direct Format (Cambridge International Examinations)
      // Requires UCI (Unique Candidate Identifier), Syllabus Codes
      return {
        examBody: 'CAMBRIDGE_CIE',
        endpoint: 'https://direct.cie.org.uk/api/sync/candidates',
        payload: learners.map((l, index) => ({
          _adm: l.adm,
          candidate_number: l.index_number || String(1000 + index),
          uci: l.nemis_upi || `XX999-${String(1000 + index).padStart(4, '0')}X`,
          names: l.name,
          date_of_birth: l.dob,
          gender: l.sex,
          syllabus_entries: ['0580', '0500', '0610'] // Mock IGCSE Math, Eng, Bio
        }))
      };

    case 'TVET':
      // TVETA / CDACC Format (Curriculum Development, Assessment and Certification Council)
      return {
        examBody: 'TVET_CDACC',
        endpoint: 'https://cdacc.tvet.go.ke/api/v1/trainees',
        payload: learners.map((l) => ({
          _adm: l.adm,
          registration_number: l.adm,
          trainee_name: l.name,
          gender: l.sex,
          competency_level: l.grade, // e.g., Artisan, Level 4
          trade_area: l.stream || 'General' // Using stream as trade area
        }))
      };

    case 'MONTESSORI':
      // Montessori Global Registry / Portfolio Sync (e.g., AMI or MEPI)
      // Focuses on developmental milestones and holistic indexing rather than traditional exam subject codes
      return {
        examBody: 'MONTESSORI_AMI',
        endpoint: 'https://registry.montessori-ami.org/api/v1/students/sync',
        payload: learners.map((l, index) => ({
          _adm: l.adm,
          student_id: `AMI-${l.adm}`,
          first_name: l.name.split(' ')[0] || '',
          last_name: l.name.split(' ').slice(1).join(' ') || '',
          date_of_birth: l.dob,
          environment_level: l.grade, // e.g., Nido, Casa dei Bambini, Elementary
          developmental_notes_ref: `${l.adm}_portfolio`,
          enrollment_date: new Date().toISOString().split('T')[0]
        }))
      };

    default:
      // Fallback for custom curriculum
      return {
        examBody: 'INTERNAL',
        endpoint: null,
        payload: learners
      };
  }
}

export async function POST(req) {
  try {
    const { action, grade, updates } = await req.json();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const headerTenant = req.headers.get('x-tenant-id');
    const tenantId = session.role === 'super-admin' && headerTenant
      ? headerTenant
      : (session.tenantId || 'platform-master');

    if (!action || !grade) {
      return NextResponse.json({ success: false, error: 'Missing action or grade' }, { status: 400 });
    }

    // 1. Fetch School Profile to determine Curriculum
    const profile = await kvGet('paav_school_profile', {}, tenantId);
    const curriculumId = profile.curriculum || 'CBC';
    const currCtx = getCurriculum(curriculumId, profile.levels);

    // 2. Fetch Learners for the specified Exam Grade
    const learners = await query('SELECT adm, name, sex, dob, grade, stream, nemis_upi, index_number FROM learners WHERE grade = ? AND tenant_id = ?', [grade, tenantId]);
    
    if (learners.length === 0) {
      return NextResponse.json({ success: false, error: `No candidates found in grade ${grade}` });
    }

    // 3. Format payload dynamically based on Curriculum
    const examSyncData = formatForExamBody(curriculumId, learners);

    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        curriculum: currCtx.name,
        examBody: examSyncData.examBody,
        candidatesFound: learners.length,
        fullPayload: examSyncData.payload
      });
    }

    if (action === 'save') {
      if (!updates || updates.length === 0) return NextResponse.json({ success: true, message: 'No changes to save.' });
      for (const u of updates) {
        const dbIndex = u.index_number || u.candidate_number || u.registration_number || u.student_id;
        const dbUpi = u.nemis_upi || u.uci;
        await query('UPDATE learners SET index_number = ?, nemis_upi = ? WHERE adm = ? AND tenant_id = ?', [dbIndex || null, dbUpi || null, u._adm, tenantId]);
      }
      return NextResponse.json({ success: true, message: 'Identifiers saved successfully.' });
    }

    if (action === 'submit') {
      if (examSyncData.examBody === 'INTERNAL') {
        return NextResponse.json({ success: false, error: 'External sync not supported for this curriculum' });
      }

      const schoolSecrets = await kvGet('paav_integration_keys', {}, tenantId);

      if (!schoolSecrets || !schoolSecrets.knecApiKey) {
        return NextResponse.json({ success: false, error: 'Integration API Keys are missing. Please configure them in Settings -> Identity & Branding -> Integrations.' });
      }

      console.log(`[National Exams] Submitting ${learners.length} candidates to ${examSyncData.examBody} via ${examSyncData.endpoint} for Tenant ${tenantId}`);
      
      const apiRes = await fetch(examSyncData.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${schoolSecrets.knecApiKey}`,
          'X-Center-Code': schoolSecrets.knecUsername,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examSyncData.payload)
      });
      
      if (!apiRes.ok) {
        let errMsg = 'National Exam Body API rejected the payload';
        try {
          const errBody = await apiRes.json();
          errMsg = errBody.message || errBody.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${learners.length} candidates with ${examSyncData.examBody} using center code ${schoolSecrets.knecUsername || 'UNKNOWN'}.`,
        examBody: examSyncData.examBody,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[National Exams API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
