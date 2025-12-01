import prisma from '../db';
import bcrypt from 'bcryptjs';

async function seedStudents() {
  console.log('🌱 Seeding students and related data...');

  try {
    // Create some appointments first (these should already exist, but we'll check)
    const appointments = await prisma.appointment.findMany({
      where: {
        finalDecision: 'accepted',
      },
      take: 5,
    });

    if (appointments.length === 0) {
      console.log('⚠️  No accepted appointments found. Creating mock appointments...');
      
      // Create mock appointments
      for (let i = 1; i <= 5; i++) {
        await prisma.appointment.create({
          data: {
            applicantName: `Student ${i}`,
            applicantEmail: `student${i}@example.com`,
            applicantPhone: `091234567${i}`,
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '10:00',
            status: 'completed',
            finalDecision: 'accepted',
            decisionMadeAt: new Date(),
          },
        });
      }
      
      // Refresh appointments
      const newAppointments = await prisma.appointment.findMany({
        where: {
          finalDecision: 'accepted',
        },
        take: 5,
      });
      appointments.push(...newAppointments);
    }

    // Create students
    const students = [];
    for (let i = 0; i < Math.min(5, appointments.length); i++) {
      const appointment = appointments[i];
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const student = await prisma.student.create({
        data: {
          username: `student${i + 1}`,
          passwordHash,
          fullNameAmharic: `ምሳሌ ስም ${i + 1}`,
          fullNameEnglish: `Student ${i + 1}`,
          phone: appointment.applicantPhone,
          appointmentId: appointment.id,
          profileComplete: i < 3, // First 3 have complete profiles
          idDocumentPath: i < 3 ? `uploads/student-documents/id-${i + 1}.pdf` : null,
          recommendationLetterPath: i < 3 ? `uploads/student-documents/recommendation-${i + 1}.pdf` : null,
          essay: i < 3 ? `This is a sample essay for student ${i + 1} about their expectations from Chenaniah.` : null,
          status: i < 4 ? 'active' : 'inactive',
        },
      });
      
      students.push(student);
      console.log(`✅ Created student: ${student.username}`);
    }

    // Create assignments
    const assignments = [];
    const assignmentTitles = [
      'Music Theory Fundamentals',
      'Worship Practice Reflection',
      'Bible Study Assignment',
      'Vocal Training Exercise',
      'Ministry Leadership Essay',
    ];

    for (let i = 0; i < 5; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i + 1) * 7); // Due in 1, 2, 3, 4, 5 weeks

      const assignment = await prisma.assignment.create({
        data: {
          title: assignmentTitles[i],
          description: `Complete the ${assignmentTitles[i]} assignment. Submit your work by the due date.`,
          dueDate,
        },
      });
      
      assignments.push(assignment);
      console.log(`✅ Created assignment: ${assignment.title}`);
    }

    // Create assignment submissions for some students
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Each student submits to first 2 assignments
      for (let j = 0; j < Math.min(2, assignments.length); j++) {
        const assignment = assignments[j];
        const isGraded = i < 2 && j === 0; // First 2 students have first assignment graded
        
        await prisma.assignmentSubmission.create({
          data: {
            studentId: student.id,
            assignmentId: assignment.id,
            text: `Submission from ${student.fullNameEnglish} for ${assignment.title}`,
            grade: isGraded ? 75 + (i * 5) : null, // Grades: 75, 80
            feedback: isGraded ? `Good work! Keep practicing.` : null,
            gradedAt: isGraded ? new Date() : null,
            gradedBy: isGraded ? 'admin' : null,
            submittedAt: new Date(),
          },
        });
      }
    }
    console.log('✅ Created assignment submissions');

    // Create payments
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Last month payment (some paid, some pending)
      await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: 500.0,
          month: lastMonthStr,
          status: i < 3 ? 'paid' : 'pending',
          paidAt: i < 3 ? new Date() : null,
        },
      });

      // Current month payment
      await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: 500.0,
          month: currentMonth,
          status: i < 2 ? 'paid' : 'pending',
          paidAt: i < 2 ? new Date() : null,
        },
      });
    }
    console.log('✅ Created payment records');

    console.log('✅ Seeding completed successfully!');
    console.log(`   - Created ${students.length} students`);
    console.log(`   - Created ${assignments.length} assignments`);
    console.log(`   - Created payment records`);

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









