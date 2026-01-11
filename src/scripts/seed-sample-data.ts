import prisma from '../db';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

async function seedSampleData() {
  console.log('🌱 Seeding 10 sample Ethiopian students and related data...');

  try {
    // 1. Ensure Sections exist
    let sections = await prisma.section.findMany();
    if (sections.length === 0) {
      console.log('⚠️ No sections found. Creating default sections...');
      const defaultSections = [
        { name: 'Soprano', code: 'sop', color: '#EF4444' },
        { name: 'Alto', code: 'alt', color: '#F59E0B' },
        { name: 'Tenor', code: 'ten', color: '#10B981' },
        { name: 'Bass', code: 'bas', color: '#3B82F6' },
      ];
      for (const s of defaultSections) {
        await prisma.section.create({ data: s });
      }
      sections = await prisma.section.findMany();
    }

    // 2. Sample Data
    const ethiopianNames = [
      { en: 'Abebe Bikila', am: 'አበበ ቢቂላ' },
      { en: 'Haile Gebrselassie', am: 'ኃይሌ ገብረሥላሴ' },
      { en: 'Derartu Tulu', am: 'ደራርቱ ቱሉ' },
      { en: 'Kenenisa Bekele', am: 'ቀነኒሳ በቀለ' },
      { en: 'Tirunesh Dibaba', am: 'ጥሩነሽ ዲባባ' },
      { en: 'Meseret Defar', am: 'መሠረት ደፋር' },
      { en: 'Almaz Ayana', am: 'አልማዝ አያና' },
      { en: 'Genzebe Dibaba', am: 'ገንዘቤ ዲባባ' },
      { en: 'Lamecha Girma', am: 'ላሜቻ ግርማ' },
      { en: 'Letesenbet Gidey', am: 'ለተሰንበት ግድይ' },
    ];

    const passwordHash = await bcrypt.hash('123456', 10);
    const students = [];
    const credentials = [];

    // 3. Create Students
    for (let i = 0; i < 10; i++) {
      const name = ethiopianNames[i];
      const username = name.en.toLowerCase().replace(/\s/g, '');
      const phone = `0911${String(i).padStart(6, '0')}`;
      const section = sections[i % sections.length];

      // Check if student exists
      let student = await prisma.student.findUnique({ where: { username } });
      if (!student) {
        student = await prisma.student.create({
          data: {
            username,
            passwordHash,
            fullNameEnglish: name.en,
            fullNameAmharic: name.am,
            phone,
            sectionId: section.id,
            profileComplete: true,
            status: 'active',
            localChurch: 'Ethiopian Orthodox Tewahedo Church',
            address: 'Addis Ababa, Ethiopia',
            gender: i % 2 === 0 ? 'male' : 'female',
          } as any,
        });
      }

      students.push(student);
      credentials.push(`Username: ${username}, Password: 123456`);
      console.log(`✅ Created/Found student: ${username}`);
    }

    // 4. Create Assignments
    const assignments = [];
    for (let i = 1; i <= 5; i++) {
      const title = `Assignment ${i}: Spiritual Growth`;
      let assignment = await prisma.assignment.findFirst({ where: { title } });
      if (!assignment) {
        assignment = await prisma.assignment.create({
          data: {
            title,
            description: `This is the description for assignment ${i}.`,
            dueDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000),
          },
        });
      }
      assignments.push(assignment);
    }

    // 5. Create Submissions, Payments, Attendance, Notes
    for (const student of students) {
      // Submissions
      for (const assignment of assignments) {
        await prisma.assignmentSubmission.upsert({
          where: { studentId_assignmentId: { studentId: student.id, assignmentId: assignment.id } },
          update: {},
          create: {
            studentId: student.id,
            assignmentId: assignment.id,
            text: `Sample submission for ${assignment.title} by ${student.fullNameEnglish}`,
            submittedAt: new Date(),
          },
        });
      }

      // Payments (3 months)
      for (let m = 0; m < 3; m++) {
        const date = new Date();
        date.setMonth(date.getMonth() - m);
        const monthStr = date.toISOString().slice(0, 7);
        await prisma.payment.upsert({
          where: { studentId_month: { studentId: student.id, month: monthStr } },
          update: {},
          create: {
            studentId: student.id,
            amount: 500,
            month: monthStr,
            status: m === 0 ? 'pending' : 'paid',
            paidAt: m === 0 ? null : new Date(),
          },
        });
      }

      // Attendance (5 sessions)
      for (let s = 1; s <= 5; s++) {
        const sessionName = `Session ${s}`;
        let session = await prisma.session.findFirst({ where: { name: sessionName } });
        if (!session) {
          session = await prisma.session.create({
            data: {
              name: sessionName,
              date: new Date(Date.now() - s * 24 * 60 * 60 * 1000),
              status: 'completed',
            },
          });
        }
        await prisma.attendance.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
          update: {},
          create: {
            sessionId: session.id,
            studentId: student.id,
            scannedAt: new Date(),
          } as any,
        });
      }

      // Notes
      const session = await prisma.session.findFirst();
      if (session) {
        for (let n = 1; n <= 3; n++) {
          await prisma.note.create({
            data: {
              content: `Sample note ${n} for ${student.fullNameEnglish}`,
              sessionId: session.id,
              authorId: student.id,
              authorType: 'student',
              type: 'text',
            },
          });
        }
      }
    }

    // 6. Write credentials file
    const filePath = path.join(process.cwd(), 'sample_students.txt');
    fs.writeFileSync(filePath, credentials.join('\n'));
    console.log(`✅ Credentials saved to ${filePath}`);

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSampleData();
