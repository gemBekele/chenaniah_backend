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
  batchId?: string;
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

// Upload file resource(s) (admin) - supports multiple files
router.post(
  '/upload',
  tokenRequired,
  roleRequired(['admin']),
  upload.array('files', 50), // Allow up to 50 files
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { titles, descriptions } = req.body;
      // Parse JSON strings if they come as strings (FormData limitation)
      let titleList: string[] = [];
      let descriptionList: string[] = [];
      
      try {
        titleList = typeof titles === 'string' ? JSON.parse(titles) : (titles || []);
        descriptionList = typeof descriptions === 'string' ? JSON.parse(descriptions) : (descriptions || []);
      } catch (e) {
        // If parsing fails, try single title/description for backward compatibility
        if (req.body.title) {
          titleList = [req.body.title];
          descriptionList = [req.body.description || ''];
        }
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'At least one file is required' });
      }

      // If single title provided but multiple files, use filenames (title can be used as description hint)
      if (titleList.length === 1 && files.length > 1) {
        titleList = files.map((file) => file.originalname);
        // Keep the provided description for all files
        descriptionList = files.map(() => descriptionList[0] || '');
      }

      // Ensure we have titles for all files
      if (titleList.length !== files.length) {
        titleList = files.map((file, index) => 
          titleList[index] || file.originalname
        );
        descriptionList = files.map((file, index) => 
          descriptionList[index] || ''
        );
      }

      // Save files
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resources');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate batch ID for files uploaded together
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const createdResources: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const title = titleList[i] || file.originalname;
        const description = descriptionList[i] || '';

        const ext = path.extname(file.originalname);
        const filename = `resource-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        const resource = {
          id: nextResourceId++,
          title,
          description: description || undefined,
          type: 'file' as const,
          fileUrl: `/resources/files/${filename}`,
          fileName: file.originalname,
          fileSize: file.size,
          createdAt: new Date().toISOString(),
          batchId: files.length > 1 ? batchId : undefined, // Only add batchId if multiple files
        };

        resources.push(resource);
        createdResources.push(resource);
      }

      return res.json({
        success: true,
        resources: createdResources,
        count: createdResources.length,
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

