import prisma from '../db';

async function initDatabase() {
  try {
    // Initialize default settings
    await prisma.setting.upsert({
      where: { key: 'registration_open' },
      update: {},
      create: { key: 'registration_open', value: 'true' },
    });

    await prisma.setting.upsert({
      where: { key: 'sms_enabled' },
      update: {},
      create: { key: 'sms_enabled', value: 'false' },
    });

    await prisma.setting.upsert({
      where: { key: 'sms_sender_id' },
      update: {},
      create: { key: 'sms_sender_id', value: '' },
    });

    await prisma.setting.upsert({
      where: { key: 'sms_template_approved' },
      update: {},
      create: {
        key: 'sms_template_approved',
        value: 'Dear {name}, your application has been approved. - Chenaniah',
      },
    });

    await prisma.setting.upsert({
      where: { key: 'sms_template_rejected' },
      update: {},
      create: {
        key: 'sms_template_rejected',
        value: 'Dear {name}, your application was not approved at this time. - Chenaniah',
      },
    });

    console.log('✅ Database initialized with default settings');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();









