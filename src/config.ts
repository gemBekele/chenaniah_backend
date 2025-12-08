import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/chenaniah_db',
  },
  api: {
    port: parseInt(process.env.API_PORT || '5000', 10),
    secretKey: process.env.API_SECRET_KEY || 'your-secret-key-change-in-production',
  },
  auth: {
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    coordinatorUsername: process.env.COORDINATOR_USERNAME || 'coordinator',
    coordinatorPassword: process.env.COORDINATOR_PASSWORD || 'coordinator123',
    // Support multiple coordinators via environment variables
    // Format: COORDINATOR_ACCOUNTS=username1:password1,username2:password2
    coordinators: (() => {
      const accounts: Array<{ username: string; password: string }> = [];
      
      // Add primary coordinator (for backward compatibility)
      if (process.env.COORDINATOR_USERNAME && process.env.COORDINATOR_PASSWORD) {
        accounts.push({
          username: process.env.COORDINATOR_USERNAME,
          password: process.env.COORDINATOR_PASSWORD,
        });
      }
      
      // Parse additional coordinators from COORDINATOR_ACCOUNTS
      if (process.env.COORDINATOR_ACCOUNTS) {
        const accountStrings = process.env.COORDINATOR_ACCOUNTS.split(',');
        for (const accountStr of accountStrings) {
          const [username, password] = accountStr.split(':').map(s => s.trim());
          if (username && password) {
            accounts.push({ username, password });
          }
        }
      }
      
      // Default coordinator if none specified
      if (accounts.length === 0) {
        accounts.push({ username: 'coordinator', password: 'coordinator123' });
      }
      
      return accounts;
    })(),
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'https://chenaniah.org',
      'https://www.chenaniah.org',
      'https://chenaniah.com',
      'https://www.chenaniah.com',
    ],
  },
  audio: {
    filesDir: process.env.AUDIO_FILES_DIR || './audio_files',
  },
};









