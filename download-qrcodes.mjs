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
  
  // Extract and process all students
  const selected = students;
  
  console.log(`\n✅ Processing all ${selected.length} students:`);
  
  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    // Optionally clear directory or just ensure it exists
    // fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`\n📥 Generating and saving QR codes to ${OUTPUT_DIR}/...`);
  
  for (const student of selected) {
    // Use QR code from database if available
    let qrCodeString = student.qrCode;
    
    if (!qrCodeString) {
      console.warn(`   ⚠️  WARNING: Student ${student.fullNameEnglish || student.username} (ID: ${student.id}) does not have a QR code in the database!`);
      // console.warn(`   ⚠️  Generating temporary QR code - this will NOT work for attendance scanning.`);
      // qrCodeString = `STUDENT-${student.id}-${Date.now()}`;
      continue; // Skip if no QR code
    }
    
    // Sanitize student name for filename
    const studentName = (student.fullNameEnglish || student.username || 'unknown')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid filename characters
      .replace(/\s+/g, '_');          // Replace spaces with underscores
    
    const filename = `${studentName}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
      await QRCode.toFile(filepath, qrCodeString, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      });
      console.log(`   ✅ Saved: ${filename} for ${student.fullNameEnglish || student.username}`);
    } catch (err) {
      console.error(`   ❌ Failed to generate QR for ${student.username}:`, err.message);
    }
  }
  
  console.log('\n✨ Done! QR codes saved to:', path.resolve(OUTPUT_DIR));
}

main().catch(console.error);



