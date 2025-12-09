#!/usr/bin/env node
/**
 * Test script to verify QR code scanning for a specific student
 */

const API_BASE_URL = 'https://chenaniah.org/api/v2/api';
const TEST_QR_CODE = 'STUDENT-17-1764604810969'; // Lidiya Abrham Fekadu

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
  
  // Get sessions
  console.log('\n📋 Fetching sessions...');
  const sessionsResponse = await fetch(`${API_BASE_URL}/attendance/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!sessionsResponse.ok) {
    console.error('❌ Failed to fetch sessions:', await sessionsResponse.text());
    process.exit(1);
  }
  
  const sessionsData = await sessionsResponse.json();
  const sessions = sessionsData.sessions || [];
  
  if (sessions.length === 0) {
    console.log('⚠️  No sessions found. Please create a session first.');
    process.exit(0);
  }
  
  // Use the first active session
  const testSession = sessions.find(s => s.status === 'active') || sessions[0];
  console.log(`✅ Using session: ${testSession.name} (ID: ${testSession.id})`);
  
  // Test QR code lookup
  console.log(`\n🔍 Testing QR code lookup: ${TEST_QR_CODE}`);
  
  // Try to scan the QR code
  console.log('\n📥 Attempting to record attendance...');
  const scanResponse = await fetch(`${API_BASE_URL}/attendance/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: testSession.id,
      qrCode: TEST_QR_CODE,
      scannedAt: new Date().toISOString(),
      isOffline: false
    })
  });
  
  const scanData = await scanResponse.json();
  console.log(`Response status: ${scanResponse.status}`);
  console.log('Response data:', JSON.stringify(scanData, null, 2));
  
  if (scanResponse.ok && scanData.success) {
    console.log('\n✅ QR code scan successful!');
    console.log(`   Student: ${scanData.attendance.student.fullNameEnglish || scanData.attendance.student.username}`);
  } else {
    console.log('\n❌ QR code scan failed!');
    console.log(`   Error: ${scanData.error || 'Unknown error'}`);
    
    // Check if student exists with this QR code
    console.log('\n🔍 Checking if student exists with this QR code...');
    const studentsResponse = await fetch(`${API_BASE_URL}/admin/trainees?limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (studentsResponse.ok) {
      const studentsData = await studentsResponse.json();
      const student = studentsData.students?.find(s => s.qrCode === TEST_QR_CODE);
      
      if (student) {
        console.log(`✅ Student found: ${student.fullNameEnglish || student.username}`);
        console.log(`   QR Code in DB: ${student.qrCode}`);
        console.log(`   QR Code tested: ${TEST_QR_CODE}`);
        console.log(`   Match: ${student.qrCode === TEST_QR_CODE ? '✅ YES' : '❌ NO'}`);
        
        // Check for whitespace or encoding issues
        if (student.qrCode !== TEST_QR_CODE) {
          console.log('\n⚠️  QR code mismatch detected!');
          console.log(`   DB length: ${student.qrCode.length}, Test length: ${TEST_QR_CODE.length}`);
          console.log(`   DB bytes: ${JSON.stringify(student.qrCode)}`);
          console.log(`   Test bytes: ${JSON.stringify(TEST_QR_CODE)}`);
        }
      } else {
        console.log('❌ Student not found with this QR code');
      }
    }
  }
}

main().catch(console.error);


