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
import attendanceRoutes from './routes/attendance.routes';

// Handle BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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
app.use('/api/attendance', attendanceRoutes);

// Serve uploaded files (assignments, payments, resources, student-documents)
// This route must be before the 404 handler
// Using wildcard to handle paths like /uploads/student-documents/filename
// Support both /uploads/* and /api/uploads/* for frontend compatibility
app.get(['/uploads/*', '/api/uploads/*'], (req: Request, res: Response) => {
  try {
    // Get the full path after /uploads/ using req.path
    // req.path will be like "/uploads/student-documents/filename.jpg" or "/api/uploads/student-documents/filename.jpg"
    const requestPath = req.path;
    // Remove /api prefix if present, then remove /uploads/ prefix
    const pathAfterUploads = requestPath.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, '');
    const pathParts = pathAfterUploads.split('/').filter(p => p);
    
    if (pathParts.length < 2) {
      console.log(`[File Request] Invalid path structure: ${requestPath}`);
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Extract type and filename
    // For paths like "student-documents/filename.jpg", type is "student-documents"
    // For paths like "payments/filename.pdf", type is "payments"
    const type = pathParts[0];
    const filename = pathParts.slice(1).join('/'); // Handle nested paths if needed
    
    const allowedTypes = ['assignments', 'payments', 'resources', 'student-documents'];
    
    console.log(`[File Request] Request path: ${requestPath}, Type: ${type}, Filename: ${filename}`);
    
    if (!allowedTypes.includes(type)) {
      console.log(`[File Request] Invalid type: ${type}`);
      return res.status(403).json({ error: 'Invalid file type' });
    }
    
    const filepath = path.join(process.cwd(), 'uploads', type, filename);
    console.log(`[File Request] Looking for file at: ${filepath}`);
    
    if (!fs.existsSync(filepath)) {
      console.log(`[File Request] File not found: ${filepath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Security check: ensure the resolved path is within the uploads directory
    const resolvedPath = path.resolve(filepath);
    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads', type));
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.log(`[File Request] Security check failed: ${resolvedPath} not in ${uploadsDir}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Set appropriate headers for PDF files to open in browser
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filename) + '"');
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      // Set headers for images
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filename) + '"');
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(filename) + '"');
    }
    
    console.log(`[File Request] Serving file: ${filepath}`);
    res.sendFile(resolvedPath);
  } catch (error: any) {
    console.error('[File Request] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
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

