import prisma from '../src/db';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

async function generateQRCodes() {
  console.log('Starting QR code generation...');

  // 1. Create output directory
  const outputDir = path.join(__dirname, '../downloads/qrcodes');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  try {
    // 2. Fetch all students
    const students = await prisma.student.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        fullNameEnglish: true,
        username: true,
        qrCode: true,
      },
    });

    console.log(`Found ${students.length} active students.`);

    let generatedCount = 0;
    let skippedCount = 0;

    // 3. Process each student
    for (const student of students) {
      let qrCodeString = student.qrCode;

      // Generate QR string if missing
      if (!qrCodeString) {
        qrCodeString = `STUDENT-${student.id}-${Date.now()}`;
        await prisma.student.update({
          where: { id: student.id },
          data: { qrCode: qrCodeString },
        });
        console.log(`Generated new QR string for student ${student.id}`);
      }

      // Sanitize filename
      const name = student.fullNameEnglish || student.username;
      const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeName}_${student.id}.png`;
      const filePath = path.join(outputDir, filename);

      // Generate PNG
      await QRCode.toFile(filePath, qrCodeString, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 400,
        margin: 2,
      });

      generatedCount++;
      if (generatedCount % 10 === 0) {
        process.stdout.write('.');
      }
    }

    console.log('\n');
    console.log('----------------------------------------');
    console.log(`Generation Complete!`);
    console.log(`Total Students: ${students.length}`);
    console.log(`Generated Images: ${generatedCount}`);
    console.log(`Output Directory: ${outputDir}`);
    console.log('----------------------------------------');

  } catch (error) {
    console.error('Error generating QR codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateQRCodes();
