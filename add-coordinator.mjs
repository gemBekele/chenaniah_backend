#!/usr/bin/env node
/**
 * Script to add a new coordinator account to production
 * Usage: node add-coordinator.mjs <username> <password>
 * 
 * This script will:
 * 1. Add the coordinator to the .env file
 * 2. Restart the PM2 process
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '.env');
const BACKEND_DIR = __dirname;

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Usage: node add-coordinator.mjs <username> <password>');
    console.error('   Example: node add-coordinator.mjs coordinator2 secure-password-123');
    process.exit(1);
  }
  
  const [username, password] = args;
  
  // Validate username
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    console.error('❌ Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens');
    process.exit(1);
  }
  
  // Validate password
  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
  }
  
  console.log(`\n🔐 Adding coordinator account: ${username}`);
  console.log(`📁 Environment file: ${ENV_FILE}\n`);
  
  // Read existing .env file
  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  } else {
    console.error(`❌ .env file not found at ${ENV_FILE}`);
    console.error('   Please create a .env file first or run this script from the backend directory');
    process.exit(1);
  }
  
  // Check if COORDINATOR_ACCOUNTS already exists
  const coordinatorAccountsMatch = envContent.match(/^COORDINATOR_ACCOUNTS=(.+)$/m);
  let coordinatorAccounts = coordinatorAccountsMatch ? coordinatorAccountsMatch[1] : '';
  
  // Check if this username already exists
  if (coordinatorAccounts.includes(`${username}:`)) {
    console.error(`❌ Coordinator account "${username}" already exists!`);
    process.exit(1);
  }
  
  // Add the new coordinator account
  const newAccount = `${username}:${password}`;
  if (coordinatorAccounts) {
    coordinatorAccounts += `,${newAccount}`;
  } else {
    coordinatorAccounts = newAccount;
  }
  
  // Update or add COORDINATOR_ACCOUNTS line
  if (coordinatorAccountsMatch) {
    // Replace existing line
    envContent = envContent.replace(
      /^COORDINATOR_ACCOUNTS=.+$/m,
      `COORDINATOR_ACCOUNTS=${coordinatorAccounts}`
    );
  } else {
    // Add new line after COORDINATOR_PASSWORD
    const coordinatorPasswordMatch = envContent.match(/^COORDINATOR_PASSWORD=(.+)$/m);
    if (coordinatorPasswordMatch) {
      envContent = envContent.replace(
        /^(COORDINATOR_PASSWORD=.+)$/m,
        `$1\nCOORDINATOR_ACCOUNTS=${coordinatorAccounts}`
      );
    } else {
      // Add at the end
      envContent += `\n# Additional Coordinator Accounts (format: username:password,username2:password2)\nCOORDINATOR_ACCOUNTS=${coordinatorAccounts}\n`;
    }
  }
  
  // Write updated .env file
  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
  console.log('✅ Updated .env file');
  
  // Restart PM2 process
  console.log('\n🔄 Restarting backend service...');
  try {
    execSync('pm2 restart chenaniah-api-v2 || pm2 restart chenaniah-backend-v2 || pm2 restart ecosystem.config.js', {
      cwd: BACKEND_DIR,
      stdio: 'inherit'
    });
    console.log('✅ Backend restarted successfully');
  } catch (error) {
    console.warn('⚠️  Could not restart PM2 process automatically. Please restart manually:');
    console.warn('   pm2 restart chenaniah-api-v2');
  }
  
  console.log(`\n✨ Coordinator account "${username}" has been added successfully!`);
  console.log(`\n📝 Summary:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`\n🔗 The coordinator can now login at: https://chenaniah.org/coordinator`);
  console.log(`\n⚠️  Note: Make sure to keep the .env file secure (chmod 600)`);
}

main();






