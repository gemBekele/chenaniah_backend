# Chenaniah Backend API

Node.js + Express + TypeScript + PostgreSQL + Prisma backend for Chenaniah Worship Ministry.

## Features

- ✅ JWT-based authentication (Admin, Coordinator roles)
- ✅ Submissions management (CRUD, search, pagination)
- ✅ Scheduling system (time slots, appointments)
- ✅ Interview evaluation system
- ✅ Registration status control
- ✅ Audio file serving
- ✅ Statistics and analytics
- ✅ Role-based access control

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- TypeScript

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/chenaniah_db?schema=public"
   API_PORT=5000
   API_SECRET_KEY=your-secret-key-change-in-production
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   COORDINATOR_USERNAME=coordinator
   COORDINATOR_PASSWORD=coordinator123
   CORS_ORIGINS=https://chenaniah.org,https://www.chenaniah.org,https://chenaniah.com,https://www.chenaniah.com
   AUDIO_FILES_DIR=./audio_files
   ```

3. **Set up PostgreSQL database:**
   ```bash
   createdb chenaniah_db
   ```

4. **Run Prisma migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

6. **Initialize default settings:**
   ```bash
   npm run dev
   # Then run the initialization script (if needed)
   ```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/coordinator/login` - Coordinator login

### Submissions
- `GET /api/submissions` - Get all submissions (with pagination, search, filter)
- `GET /api/submissions/:id` - Get submission by ID
- `PUT /api/submissions/:id/status` - Update submission status

### Scheduling
- `GET /api/schedule/stats` - Get scheduling statistics
- `GET /api/schedule/appointments` - Get all appointments
- `GET /api/schedule/time-slots` - Get time slots (PUBLIC)
- `POST /api/schedule/time-slots` - Create time slot
- `POST /api/schedule/time-slots/bulk` - Bulk create time slots
- `PUT /api/schedule/time-slots/:id` - Update time slot
- `POST /api/schedule/appointments` - Create appointment (PUBLIC)
- `PUT /api/schedule/appointments/:id` - Update appointment status
- `PUT /api/schedule/appointments/:id/attendance` - Mark attendance
- `PUT /api/schedule/appointments/:id/approve` - Approve applicant
- `GET /api/schedule/appointments/attendance` - Get verified appointments
- `POST /api/schedule/appointments/:id/evaluation` - Submit evaluation
- `GET /api/schedule/appointments/:id/evaluations` - Get evaluations
- `PUT /api/schedule/appointments/:id/decision` - Set final decision
- `POST /api/schedule/verify-applicant` - Verify applicant (PUBLIC)
- `POST /api/schedule/appointments/check` - Check existing appointment (PUBLIC)
- `POST /api/applicant/status` - Get applicant status (PUBLIC)

### Statistics
- `GET /api/stats` - Get submission statistics

### Registration
- `GET /api/registration/status` - Get registration status
- `PUT /api/registration/status` - Set registration status

### Audio
- `GET /api/audio/:file_path` - Serve audio files

### Health
- `GET /api/health` - Health check

## Database Schema

The Prisma schema is located in `prisma/schema.prisma`. Main models:

- `User` - Telegram bot users
- `Submission` - Application submissions
- `TimeSlot` - Available time slots
- `Appointment` - Interview appointments
- `InterviewEvaluation` - Judge evaluations
- `Setting` - System settings
- `RateLimit` - Rate limiting

## Testing

After starting the server, you can test endpoints using curl. See `TEST_ENDPOINTS.md` for examples.

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

4. Start the server:
   ```bash
   npm start
   ```

Or use a process manager like PM2:
```bash
pm2 start dist/server.js --name chenaniah-backend
```

## License

ISC







