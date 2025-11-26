import { Router, Request, Response } from 'express';
import multer from 'multer';
import { tokenRequired, roleRequired, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Note: multer needs to be installed: npm install multer @types/multer

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  const allowedOrigins = config.cors.origins;

  if (allowedOrigins.includes(origin) || origin === '*') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '3600');
};

// For now, we'll use a simple in-memory store
// In production, this should use a database
let resources: Array<{
  id: number;
  title: string;
  description?: string;
  type: 'file' | 'link';
  url?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}> = [];

let nextResourceId = 1;

// Get all resources (public for students - requires auth)
router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  return res.json({
    success: true,
    resources,
  });
});

// Get all resources (admin) - accessible via /api/admin/resources/all
router.get(
  '/all',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    return res.json({
      success: true,
      resources,
    });
  }
);

// Create resource (admin)
router.post(
  '/',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { title, description, type, url } = req.body;

      if (!title || !type) {
        return res.status(400).json({ error: 'Title and type are required' });
      }

      if (type === 'link' && !url) {
        return res.status(400).json({ error: 'URL is required for link type' });
      }

      const resource = {
        id: nextResourceId++,
        title,
        description,
        type,
        url: type === 'link' ? url : undefined,
        createdAt: new Date().toISOString(),
      };

      resources.push(resource);

      return res.json({
        success: true,
        resource,
      });
    } catch (error: any) {
      console.error('Error creating resource:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Upload file resource (admin)
router.post(
  '/upload',
  tokenRequired,
  roleRequired(['admin']),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // Save file
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resources');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = path.extname(req.file.originalname);
      const filename = `resource-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const resource = {
        id: nextResourceId++,
        title,
        description: description || undefined,
        type: 'file' as const,
        fileUrl: `/resources/files/${filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        createdAt: new Date().toISOString(),
      };

      resources.push(resource);

      return res.json({
        success: true,
        resource,
      });
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Serve resource files
router.get('/files/:filename', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const filename = req.params.filename;
  const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set appropriate headers for file serving
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
  } else {
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  }

  res.sendFile(filepath);
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;

