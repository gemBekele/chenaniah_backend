#!/usr/bin/env node
/**
 * Script to download QR codes for specific phone numbers (using last 8 digits)
 */

import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://chenaniah.org/api/v2/api';
const OUTPUT_DIR = './qr_codes_download';

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
  
  // Target phone numbers (using last 8 digits)
  const targetPhones = [
    '0938896759','0972332873','0921379906','0953504161','0910518876','0911542292','0908220838'
    
  ];
  
  // Extract last 8 digits from target phones
  const targetLast8 = targetPhones.map(phone => {
    const phoneStr = String(phone);
    return phoneStr.length >= 8 ? phoneStr.slice(-8) : phoneStr;
  });
  
  console.log(`\n🔍 Looking for students with phone numbers ending in: ${targetLast8.join(', ')}`);
  
  // Filter students by phone number (last 8 digits)
  const selected = students.filter(s => {
    if (!s.phone) return false;
    const studentPhoneStr = String(s.phone);
    const studentLast8 = studentPhoneStr.length >= 8 ? studentPhoneStr.slice(-8) : studentPhoneStr;
    return targetLast8.includes(studentLast8);
  });
  
  console.log(`\n✅ Found ${selected.length} matching students:`);
  selected.forEach((s, i) => {
    const phoneStr = String(s.phone || '');
    const last8 = phoneStr.length >= 8 ? phoneStr.slice(-8) : phoneStr;
    console.log(`   ${i + 1}. ${s.fullNameEnglish || s.username} (Phone: ${s.phone}, Last 8: ${last8})`);
  });
  
  if (selected.length === 0) {
    console.log('⚠️  No students found with the specified phone numbers.');
    process.exit(0);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`\n📥 Generating and saving QR codes to ${OUTPUT_DIR}/...`);
  
  for (const student of selected) {
    // Use QR code from database if available
    let qrCodeString = student.qrCode;
    
    if (!qrCodeString) {
      console.warn(`   ⚠️  WARNING: Student ${student.fullNameEnglish || student.username} (ID: ${student.id}) does not have a QR code in the database!`);
      console.warn(`   ⚠️  Generating temporary QR code - this will NOT work for attendance scanning.`);
      console.warn(`   ⚠️  The student needs to log in to generate their QR code via the API.`);
      qrCodeString = `STUDENT-${student.id}-${Date.now()}`;
    } else {
      console.log(`   📋 Using QR code from database: ${qrCodeString}`);
    }
    
    // Get last 8 digits of phone number
    const phoneStr = String(student.phone || '');
    const phoneLast8 = phoneStr.length >= 8 ? phoneStr.slice(-8) : phoneStr;
    
    // Generate QR code image
    const filename = `qrcode_${phoneLast8}_${(student.username || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
      await QRCode.toFile(filepath, qrCodeString, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      });
      console.log(`   ✅ Saved: ${filename} (${student.fullNameEnglish || student.username})`);
      if (student.qrCode) {
        console.log(`   ✅ QR code value: ${qrCodeString}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to generate QR for ${student.username}:`, err.message);
    }
  }
  
  console.log('\n✨ Done! QR codes saved to:', path.resolve(OUTPUT_DIR));
}

main().catch(console.error);



