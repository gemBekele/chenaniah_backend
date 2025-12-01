import prisma from '../db';

async function seedApplicants() {
  try {
    console.log('🌱 Seeding sample applicants...\n');

    // Sample applicants data
    const sampleApplicants = [
      {
        userId: 1001,
        name: 'Alemayehu Bekele',
        address: 'Addis Ababa, Bole Sub-city, Woreda 3',
        phone: '+251911234567',
        church: 'Ethiopian Evangelical Church Mekane Yesus',
        telegramUsername: 'alemu_bekele',
        audioFilePath: 'audio_files/2024/11/24/alemayehu_sample.mp3',
        audioFileSize: 2048576,
        audioDuration: 120.5,
        status: 'pending' as const,
      },
      {
        userId: 1002,
        name: 'Meron Tadesse',
        address: 'Addis Ababa, Kirkos Sub-city, Woreda 5',
        phone: '+251922345678',
        church: 'St. Mary Ethiopian Orthodox Church',
        telegramUsername: 'meron_t',
        audioFilePath: 'audio_files/2024/11/24/meron_sample.mp3',
        audioFileSize: 1856432,
        audioDuration: 98.3,
        status: 'approved' as const,
        reviewerComments: 'Excellent vocal range and clear pronunciation',
        reviewedBy: 'admin',
      },
      {
        userId: 1003,
        name: 'Yonas Getachew',
        address: 'Addis Ababa, Nifas Silk Lafto Sub-city, Woreda 8',
        phone: '+251933456789',
        church: 'Full Gospel Believers Church',
        telegramUsername: 'yonas_g',
        audioFilePath: 'audio_files/2024/11/24/yonas_sample.mp3',
        audioFileSize: 2156789,
        audioDuration: 135.2,
        status: 'approved' as const,
        reviewerComments: 'Strong worship leader potential',
        reviewedBy: 'admin',
      },
      {
        userId: 1004,
        name: 'Sara Alemayehu',
        address: 'Addis Ababa, Arada Sub-city, Woreda 2',
        phone: '+251944567890',
        church: 'Addis Ababa Full Gospel Church',
        telegramUsername: 'sara_alem',
        audioFilePath: 'audio_files/2024/11/24/sara_sample.mp3',
        audioFileSize: 1923456,
        audioDuration: 110.7,
        status: 'pending' as const,
      },
      {
        userId: 1005,
        name: 'Daniel Tesfaye',
        address: 'Addis Ababa, Lideta Sub-city, Woreda 4',
        phone: '+251955678901',
        church: 'Ethiopian Kale Heywet Church',
        telegramUsername: 'daniel_t',
        audioFilePath: 'audio_files/2024/11/24/daniel_sample.mp3',
        audioFileSize: 2234567,
        audioDuration: 142.8,
        status: 'approved' as const,
        reviewerComments: 'Good musicality and worshipful heart',
        reviewedBy: 'admin',
      },
      {
        userId: 1006,
        name: 'Hanna Solomon',
        address: 'Addis Ababa, Yeka Sub-city, Woreda 6',
        phone: '+251966789012',
        church: 'Bethel Evangelical Church',
        telegramUsername: 'hanna_s',
        audioFilePath: 'audio_files/2024/11/24/hanna_sample.mp3',
        audioFileSize: 1789234,
        audioDuration: 95.4,
        status: 'rejected' as const,
        reviewerComments: 'Needs more vocal training',
        reviewedBy: 'admin',
      },
      {
        userId: 1007,
        name: 'Michael Assefa',
        address: 'Addis Ababa, Kolfe Keranio Sub-city, Woreda 7',
        phone: '+251977890123',
        church: 'Ethiopian Orthodox Tewahedo Church',
        telegramUsername: 'michael_a',
        audioFilePath: 'audio_files/2024/11/24/michael_sample.mp3',
        audioFileSize: 2098765,
        audioDuration: 128.6,
        status: 'approved' as const,
        reviewerComments: 'Excellent voice quality and worship leading skills',
        reviewedBy: 'admin',
      },
      {
        userId: 1008,
        name: 'Ruth Yohannes',
        address: 'Addis Ababa, Gullele Sub-city, Woreda 9',
        phone: '+251988901234',
        church: 'Addis Ababa Bible Church',
        telegramUsername: 'ruth_y',
        audioFilePath: 'audio_files/2024/11/24/ruth_sample.mp3',
        audioFileSize: 1954321,
        audioDuration: 105.3,
        status: 'pending' as const,
      },
    ];

    // Create users first (if they don't exist)
    for (const applicant of sampleApplicants) {
      await prisma.user.upsert({
        where: { userId: applicant.userId },
        update: {},
        create: {
          userId: applicant.userId,
          username: applicant.telegramUsername,
          firstName: applicant.name.split(' ')[0],
          lastName: applicant.name.split(' ').slice(1).join(' '),
          state: 'idle',
          name: applicant.name,
          phone: applicant.phone,
          address: applicant.address,
          church: applicant.church,
        },
      });
    }

    console.log('✅ Users created/updated\n');

    // Create submissions
    let createdCount = 0;
    let skippedCount = 0;

    for (const applicant of sampleApplicants) {
      try {
        // Check if submission already exists (by phone number)
        const existing = await prisma.submission.findFirst({
          where: {
            phone: applicant.phone,
          },
        });

        if (existing) {
          console.log(`⏭️  Skipping ${applicant.name} - already exists`);
          skippedCount++;
          continue;
        }

        await prisma.submission.create({
          data: {
            userId: applicant.userId,
            name: applicant.name,
            address: applicant.address,
            phone: applicant.phone,
            church: applicant.church,
            telegramUsername: applicant.telegramUsername,
            audioFilePath: applicant.audioFilePath,
            audioFileSize: applicant.audioFileSize,
            audioDuration: applicant.audioDuration,
            status: applicant.status,
            reviewerComments: applicant.reviewerComments || null,
            reviewedBy: applicant.reviewedBy || null,
            reviewedAt: applicant.reviewedBy ? new Date() : null,
          },
        });

        console.log(`✅ Created submission for ${applicant.name} (${applicant.status})`);
        createdCount++;
      } catch (error: any) {
        console.error(`❌ Error creating submission for ${applicant.name}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${createdCount} submissions`);
    console.log(`   Skipped: ${skippedCount} submissions`);
    console.log(`   Total: ${sampleApplicants.length} applicants\n`);

    // Show statistics
    const stats = await prisma.submission.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    console.log('📈 Current database statistics:');
    stats.forEach((stat) => {
      console.log(`   ${stat.status}: ${stat._count.id}`);
    });

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding applicants:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedApplicants();









