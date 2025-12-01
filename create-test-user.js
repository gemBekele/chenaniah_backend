const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Generate a unique user ID (using a smaller number that fits in INT4)
    // Get the max existing userId and add 1, or use a random number in safe range
    const maxUser = await prisma.user.findFirst({
      orderBy: { userId: 'desc' },
      select: { userId: true },
    });
    const userId = maxUser ? maxUser.userId + BigInt(1) : BigInt(Math.floor(Math.random() * 1000000) + 100000);
    const phone = `+2519${Math.floor(Math.random() * 100000000)}`;
    
    // Create User
    const user = await prisma.user.create({
      data: {
        userId: userId,
        username: `testuser_${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        phone: phone,
        address: 'Test Address, Addis Ababa',
        church: 'Test Church',
        state: 'idle',
      },
    });

    console.log('✅ Created User:', user.userId.toString(), user.phone);

    // Create Submission with approved status
    const submission = await prisma.submission.create({
      data: {
        userId: user.userId,
        name: user.name,
        address: user.address,
        phone: user.phone,
        church: user.church,
        telegramUsername: user.username,
        audioFilePath: 'test/audio.mp3',
        audioFileSize: 1000000,
        audioDuration: 120.5,
        status: 'approved',
        reviewedBy: 'admin',
        reviewedAt: new Date(),
        reviewerComments: 'Test submission for appointment creation',
      },
    });

    console.log('✅ Created Submission:', submission.id.toString(), 'Status: approved');
    console.log('\n📋 Use this phone number for appointment creation:');
    console.log(`Phone: ${phone}`);
    console.log(`\n📝 Now run the curl commands to create the appointment.`);
    console.log(`\nExport the phone number for use in curl commands:`);
    console.log(`export TEST_PHONE="${phone}"`);
    
    return { user, submission, phone };
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

