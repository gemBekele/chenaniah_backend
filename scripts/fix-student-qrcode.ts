import prisma from '../src/db';

const phoneNumber = process.argv[2] || '0939484817';

async function main() {
  const searchTerm = process.argv[2] || '0939484817';
  const isPhone = /^\d+$/.test(searchTerm);
  
  console.log(`🔍 Looking for student: ${searchTerm}`);
  
  let students;
  
  if (isPhone) {
    // Normalize phone number - get last 8 digits
    const phoneDigits = searchTerm.replace(/\D/g, '');
    const last8 = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : phoneDigits;
    
    console.log(`📱 Searching by last 8 digits: ${last8}`);
    
    // Find student by phone number (last 8 digits)
    const allStudents = await prisma.student.findMany({
      where: {
        phone: {
          contains: last8,
        },
      },
      select: {
        id: true,
        username: true,
        fullNameEnglish: true,
        fullNameAmharic: true,
        phone: true,
        qrCode: true,
        status: true,
      },
    });
    
    // Filter to exact match on last 8 digits
    students = allStudents.filter(s => {
      if (!s.phone) return false;
      const studentPhoneDigits = String(s.phone).replace(/\D/g, '');
      const studentLast8 = studentPhoneDigits.length >= 8 ? studentPhoneDigits.slice(-8) : studentPhoneDigits;
      return studentLast8 === last8;
    });
  } else {
    // Search by name
    console.log(`👤 Searching by name: ${searchTerm}`);
    students = await prisma.student.findMany({
      where: {
        OR: [
          { fullNameEnglish: { contains: searchTerm, mode: 'insensitive' } },
          { fullNameAmharic: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullNameEnglish: true,
        fullNameAmharic: true,
        phone: true,
        qrCode: true,
        status: true,
      },
    });
  }
  
  const matchingStudents = students;
  
  if (matchingStudents.length === 0) {
    console.log('❌ No student found with that search term');
    await prisma.$disconnect();
    process.exit(1);
  }
  
  if (matchingStudents.length > 1) {
    console.log(`⚠️  Found ${matchingStudents.length} students with that phone number:`);
    matchingStudents.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.fullNameEnglish || s.username} (ID: ${s.id}, Username: ${s.username})`);
    });
    console.log('\n⚠️  Please specify which student to fix.');
    await prisma.$disconnect();
    process.exit(1);
  }
  
  const student = matchingStudents[0];
  console.log(`\n✅ Found student:`);
  console.log(`   Name: ${student.fullNameEnglish || student.fullNameAmharic || 'N/A'}`);
  console.log(`   Username: ${student.username}`);
  console.log(`   Phone: ${student.phone}`);
  console.log(`   Status: ${student.status}`);
  console.log(`   Current QR Code: ${student.qrCode || '❌ NOT SET'}`);
  
  if (!student.qrCode) {
    console.log('\n🔧 Generating QR code...');
    const qrCode = `STUDENT-${student.id}-${Date.now()}`;
    
    await prisma.student.update({
      where: { id: student.id },
      data: { qrCode },
    });
    
    console.log(`✅ Generated and saved QR code: ${qrCode}`);
    console.log('\n✨ QR code has been fixed! The student can now use their QR code for attendance.');
  } else {
    console.log('\n✅ Student already has a QR code.');
    console.log('   If scanning is still not working, the issue might be:');
    console.log('   1. The QR code image doesn\'t match the database value');
    console.log('   2. The QR code was generated but not saved to the database');
    console.log('   3. There\'s a mismatch between the image and database');
    console.log('\n💡 To regenerate the QR code image, run:');
    console.log(`   node download-qrcodes.mjs`);
  }
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

