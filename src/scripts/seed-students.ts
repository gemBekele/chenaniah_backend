import prisma from '../db';
import bcrypt from 'bcryptjs';

const ethiopianNames = [
  { am: 'አበበ ቢቂላ', en: 'Abebe Bikila', gender: 'male' },
  { am: 'ከበደ ሚካኤል', en: 'Kebede Michael', gender: 'male' },
  { am: 'አልማዝ አያና', en: 'Almaz Ayana', gender: 'female' },
  { am: 'ኃይሌ ገብረሥላሴ', en: 'Haile Gebrselassie', gender: 'male' },
  { am: 'ጥሩነሽ ዲባባ', en: 'Tirunesh Dibaba', gender: 'female' },
  { am: 'ቀነኒሳ በቀለ', en: 'Kenenisa Bekele', gender: 'male' },
  { am: 'ደራርቱ ቱሉ', en: 'Derartu Tulu', gender: 'female' },
  { am: 'ማሞ ወልዴ', en: 'Mamo Wolde', gender: 'male' },
  { am: 'መሰረት ደፋር', en: 'Meseret Defar', gender: 'female' },
  { am: 'ገንዘቤ ዲባባ', en: 'Genzebe Dibaba', gender: 'female' },
];

async function seedStudents() {
  console.log('🌱 Seeding students and related data...');

  try {
    // 1. Create Sessions (Past 5 weeks)
    console.log('Creating sessions...');
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // Weekly sessions backwards
      date.setHours(14, 0, 0, 0); // 2 PM

      const session = await prisma.session.create({
        data: {
          name: `Weekly Training Session ${5 - i}`,
          date: date,
          location: 'Main Hall',
          status: 'completed',
        }
      });
      sessions.push(session);
    }
    console.log(`✅ Created ${sessions.length} sessions`);

    // 1.5 Create Sections
    console.log('Creating sections...');
    const sectionData = [
      { name: 'Soprano', code: 'S', color: '#FF5733' },
      { name: 'Alto', code: 'A', color: '#33FF57' },
      { name: 'Tenor', code: 'T', color: '#3357FF' },
      { name: 'Bass', code: 'B', color: '#F333FF' },
    ];
    
    const sections = [];
    for (const s of sectionData) {
      // Use upsert to avoid errors if they exist
      // Note: name is unique
      const existing = await prisma.section.findUnique({ where: { name: s.name } });
      if (existing) {
        sections.push(existing);
      } else {
        const section = await prisma.section.create({ data: s });
        sections.push(section);
      }
    }
    console.log(`✅ Created/Found ${sections.length} sections`);

    // 2. Create Students
    console.log('Creating students...');
    const students = [];
    const passwordHash = await bcrypt.hash('password123', 10);

    for (let i = 0; i < ethiopianNames.length; i++) {
      const name = ethiopianNames[i];
      const username = name.en.split(' ')[0].toLowerCase() + (i + 1);
      
      // Check if student exists
      const existing = await prisma.student.findFirst({ where: { username } });
      if (existing) {
        students.push(existing);
        continue;
      }

      // Create mock appointment for student
      const appointment = await prisma.appointment.create({
        data: {
          applicantName: name.en,
          applicantEmail: `${username}@example.com`,
          applicantPhone: `0911${String(i).padStart(6, '0')}`,
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: '10:00',
          status: 'completed',
          finalDecision: 'accepted',
          decisionMadeAt: new Date(),
        }
      });

      const student = await prisma.student.create({
        data: {
          username: username,
          passwordHash,
          fullNameAmharic: name.am,
          fullNameEnglish: name.en,
          gender: name.gender,
          phone: appointment.applicantPhone,
          appointmentId: appointment.id,
          profileComplete: true,
          status: 'active',
          // Randomly assign to a section
          sectionId: sections[Math.floor(Math.random() * sections.length)].id, 
        },
      });
      
      students.push(student);
      console.log(`✅ Created student: ${student.username} (${student.fullNameEnglish})`);
    }

    // 3. Create Attendance & Notes
    console.log('Creating attendance and notes...');
    for (const student of students) {
      for (const session of sessions) {
        // 80% chance of attendance
        if (Math.random() > 0.2) {
          await prisma.attendance.create({
            data: {
              sessionId: session.id,
              studentId: student.id,
              scannedAt: session.date,
              isOffline: Math.random() > 0.8, // 20% offline
            }
          });

          // 30% chance of having a note for the session
          if (Math.random() > 0.7) {
            await prisma.note.create({
              data: {
                sessionId: session.id,
                authorId: student.id,
                authorType: 'student',
                content: `Notes for ${session.name}: Learned about vocal techniques and harmony.`,
                type: 'text',
              }
            });
          }
        }
      }
    }
    console.log('✅ Created attendance and notes');

    // 4. Create Assignments
    console.log('Creating assignments...');
    const assignments = [];
    const assignmentTitles = [
      'Music Theory Fundamentals',
      'Worship Practice Reflection',
      'Bible Study Assignment',
    ];

    for (let i = 0; i < assignmentTitles.length; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i * 7)); // Due weekly

      const assignment = await prisma.assignment.create({
        data: {
          title: assignmentTitles[i],
          description: `Complete the ${assignmentTitles[i]} assignment.`,
          dueDate,
          sessionId: sessions[i]?.id, // Link to session if available
        },
      });
      assignments.push(assignment);
    }

    // 5. Create Submissions
    console.log('Creating submissions...');
    for (const student of students) {
      for (const assignment of assignments) {
        // 90% submission rate
        if (Math.random() > 0.1) {
          const grade = Math.floor(Math.random() * 30) + 70; // 70-100
          await prisma.assignmentSubmission.create({
            data: {
              studentId: student.id,
              assignmentId: assignment.id,
              text: `Submission content for ${assignment.title} by ${student.fullNameEnglish}.`,
              grade: grade,
              feedback: grade > 90 ? 'Excellent work!' : 'Good job, keep it up.',
              gradedAt: new Date(),
              gradedBy: 'admin',
              submittedAt: new Date(),
            }
          });
        }
      }
    }
    console.log('✅ Created submissions');

    // 6. Create Payments
    console.log('Creating payments...');
    const months = ['2023-11', '2023-12', '2024-01'];
    for (const student of students) {
      for (const month of months) {
        await prisma.payment.create({
          data: {
            studentId: student.id,
            amount: 500.0,
            month: month,
            status: Math.random() > 0.2 ? 'paid' : 'pending', // 80% paid
            paidAt: Math.random() > 0.2 ? new Date() : null,
          }
        });
      }
    }
    console.log('✅ Created payments');

    console.log('✅ Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedStudents()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedStudents;
