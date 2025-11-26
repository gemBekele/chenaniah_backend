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



