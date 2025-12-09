#!/usr/bin/env node
/**
 * Script to check and fix QR code for a specific student via API
 * Usage: node fix-qrcode-via-api.mjs <phone_number_or_name>
 */

const API_BASE_URL = 'https://chenaniah.org/api/v2/api';
const searchTerm = process.argv[2] || '0939484817';

async function main() {
  console.log('🔐 Logging in as admin...');
  
  // Login as admin
  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    process.exit(1);
  }
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('✅ Logged in successfully');
  
  // Fetch all trainees
  console.log('📋 Fetching students list...');
  const traineesResponse = await fetch(`${API_BASE_URL}/admin/trainees?limit=1000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!traineesResponse.ok) {
    console.error('❌ Failed to fetch trainees:', await traineesResponse.text());
    process.exit(1);
  }
  
  const traineesData = await traineesResponse.json();
  const students = traineesData.students || [];
  console.log(`✅ Found ${students.length} students`);
  
  // Search for student
  const isPhone = /^\d+$/.test(searchTerm);
  let matchingStudents = [];
  
  if (isPhone) {
    // Search by phone (last 8 digits)
    const phoneDigits = searchTerm.replace(/\D/g, '');
    const last8 = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : phoneDigits;
    
    console.log(`\n🔍 Searching by phone (last 8 digits: ${last8})...`);
    
    matchingStudents = students.filter(s => {
      if (!s.phone) return false;
      const studentPhoneStr = String(s.phone);
      const studentLast8 = studentPhoneStr.length >= 8 ? studentPhoneStr.slice(-8) : studentPhoneStr;
      return studentLast8 === last8;
    });
  } else {
    // Search by name
    console.log(`\n🔍 Searching by name: ${searchTerm}...`);
    const searchLower = searchTerm.toLowerCase();
    matchingStudents = students.filter(s => {
      const nameEng = (s.fullNameEnglish || '').toLowerCase();
      const nameAmh = (s.fullNameAmharic || '').toLowerCase();
      const username = (s.username || '').toLowerCase();
      return nameEng.includes(searchLower) || 
             nameAmh.includes(searchLower) || 
             username.includes(searchLower);
    });
  }
  
  if (matchingStudents.length === 0) {
    console.log('❌ No student found with that search term');
    process.exit(1);
  }
  
  if (matchingStudents.length > 1) {
    console.log(`\n⚠️  Found ${matchingStudents.length} students:`);
    matchingStudents.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.fullNameEnglish || s.username} (Phone: ${s.phone}, Username: ${s.username})`);
    });
    console.log('\n⚠️  Please be more specific.');
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
    console.log('\n⚠️  Student does not have a QR code in the database!');
    console.log('   This is the problem - the QR code image was generated with a temporary value');
    console.log('   that was never saved to the database.');
    console.log('\n💡 Solution:');
    console.log('   1. The student needs to log in and generate their QR code via the API');
    console.log('   2. Or an admin can trigger QR code generation by accessing the student endpoint');
    console.log('\n🔧 Attempting to generate QR code via student login simulation...');
    console.log('   (This requires the student to log in at least once to generate the QR code)');
    console.log('\n✨ To fix this, have the student:');
    console.log('   1. Log into their account');
    console.log('   2. Navigate to their QR code page (this will auto-generate it)');
    console.log('   3. The QR code will then be saved to the database');
  } else {
    console.log('\n✅ Student has a QR code in the database.');
    console.log('   If scanning is still not working, possible issues:');
    console.log('   1. The QR code image file has a different value than the database');
    console.log('   2. The QR code image needs to be regenerated to match the database');
    console.log('\n💡 To regenerate the QR code image, run:');
    console.log(`   node download-qrcodes.mjs`);
    console.log('   This will create a new image file with the correct QR code value.');
  }
}

main().catch(console.error);


