export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/db';
import { hashPassword, getSession } from '@/lib/auth';
import { ALL_GRADES } from '@/lib/cbe';

export async function GET() {
  const session = await getSession();
  if (!session || !['admin', 'super-admin'].includes(session.role)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const staff = (await kvGet('paav6_staff')) || [];
    const learners = (await kvGet('paav6_learners')) || [];
    
    // Check if admin already exists
    if (staff.find(s => s.username === 'admin')) {
      return NextResponse.json({ message: 'Seed already executed', staffCount: staff.length, learnersCount: learners.length });
    }

    const defaultPass = await hashPassword('admin123');

    // Create 4 Admins (1 default + 3 extra)
    staff.push({ id: 'admin_' + Date.now(), name: 'SYSTEM ADMIN', role: 'admin', phone: '0000000000', username: 'admin', password: defaultPass, status: 'active', createdAt: new Date().toISOString() });
    for (let i = 1; i <= 3; i++) {
      staff.push({ id: 'admin_x_' + i, name: 'Extra Admin ' + i, role: 'admin', phone: '000000000' + i, username: 'admin' + i, password: defaultPass, status: 'active', createdAt: new Date().toISOString() });
    }

    // Generate 1 Teacher and 5 Learners per Grade
    ALL_GRADES.forEach((grade, idx) => {
      // 1 Teacher
      staff.push({
        id: 'tr_' + idx,
        name: `Teacher ${grade.replace('GRADE ', 'G')}`,
        role: 'teacher',
        phone: '07' + String(Math.floor(10000000 + Math.random() * 90000000)),
        username: `teacher${idx}`,
        password: defaultPass,
        status: 'active',
        grade: grade,
        teachingAreas: [],
        createdAt: new Date().toISOString()
      });

      // 5 Learners
      for (let j = 1; j <= 5; j++) {
        const admNo = `ADM${idx}0${j}`;
        learners.push({
          id: 'lrn_' + idx + '_' + j,
          adm: admNo,
          name: `Student ${j} of ${grade}`,
          grade: grade,
          gender: j % 2 === 0 ? 'F' : 'M',
          dob: '2015-01-01',
          upi: '',
          phone: '07' + String(Math.floor(10000000 + Math.random() * 90000000)), // Parent phone
          feeGrp: '',
          health: '',
          t1: 0, t2: 0, t3: 0,
          createdAt: new Date().toISOString()
        });
      }
    });

    await kvSet('paav6_staff', staff);
    await kvSet('paav6_learners', learners);

    return NextResponse.json({ 
      message: 'Database seeded successfully!', 
      staffCount: staff.length,
      learnersCount: learners.length,
      defaultCredentials: 'username: admin, password: admin123'
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
