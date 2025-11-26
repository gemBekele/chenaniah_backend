import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs';

// Routes
import authRoutes from './routes/auth.routes';
import submissionsRoutes from './routes/submissions.routes';
import scheduleRoutes from './routes/schedule.routes';
import statsRoutes from './routes/stats.routes';
import registrationRoutes from './routes/registration.routes';
import audioRoutes from './routes/audio.routes';
import applicantRoutes from './routes/applicant.routes';
import studentRoutes from './routes/student.routes';
import adminTraineesRoutes from './routes/admin-trainees.routes';
import resourcesRoutes from './routes/resources.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for now
      }
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/applicant', applicantRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin/trainees', adminTraineesRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/admin/resources', resourcesRoutes);

// Serve uploaded files (assignments, payments, etc.)
app.get('/uploads/:type/:filename', (req: Request, res: Response) => {
  const { type, filename } = req.params;
  const allowedTypes = ['assignments', 'payments', 'resources'];
  
  if (!allowedTypes.includes(type)) {
    return res.status(403).json({ error: 'Invalid file type' });
  }
  
  const filepath = path.join(process.cwd(), 'uploads', type, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers for PDF files to open in browser
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
  } else {
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  }
  
  res.sendFile(filepath);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = config.api.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

