import { Router, Request, Response } from 'express';
import multer from 'multer';
import { tokenRequired, roleRequired, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import prisma from '../db';
import * as fs from 'fs';
import * as path from 'path';

import { botService } from '../services/bot.service';

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

// Get all resources (public for students - requires auth)
router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const studentId = req.user?.userId;
    let sectionId: number | null = null;

    if (req.user?.role === 'student' && studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { sectionId: true },
      });
      sectionId = student?.sectionId || null;
    }

    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { sectionId: null }, // Public resources
          { sectionId: sectionId }, // Section-specific resources
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match frontend expectations
    const transformedResources = resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      type: r.type as 'file' | 'link',
      url: r.url || undefined,
      fileUrl: r.fileUrl || undefined,
      fileName: r.fileName || undefined,
      fileSize: r.fileSize || undefined,
      createdAt: r.createdAt.toISOString(),
      batchId: r.batchId || undefined,
      sectionId: r.sectionId || undefined,
      category: r.category,
    }));

    return res.json({
      success: true,
      resources: transformedResources,
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
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

    try {
      const resources = await prisma.resource.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Transform to match frontend expectations
      const transformedResources = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || undefined,
        type: r.type as 'file' | 'link',
        url: r.url || undefined,
        fileUrl: r.fileUrl || undefined,
        fileName: r.fileName || undefined,
        fileSize: r.fileSize || undefined,
        createdAt: r.createdAt.toISOString(),
        batchId: r.batchId || undefined,
        sectionId: r.sectionId || undefined,
        category: r.category,
      }));

      return res.json({
        success: true,
        resources: transformedResources,
      });
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get all unique resource categories
router.get('/categories', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const categories = await prisma.resource.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    // Ensure we have a clean list of strings
    const categoryList = categories
      .map(c => c.category)
      .filter(Boolean); // Remove nulls/undefined if any

    return res.json({
      success: true,
      categories: categoryList,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

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
      const { title, description, type, url, category } = req.body;

      if (!title || !type) {
        return res.status(400).json({ error: 'Title and type are required' });
      }

      if (type === 'link' && !url) {
        return res.status(400).json({ error: 'URL is required for link type' });
      }

      const resource = await prisma.resource.create({
        data: {
          title,
          description: description || null,
          type,
          category: category || 'General',
          url: type === 'link' ? url : null,
        },
      });

      return res.json({
        success: true,
        resource: {
          id: resource.id,
          title: resource.title,
          description: resource.description || undefined,
          type: resource.type as 'file' | 'link',
          url: resource.url || undefined,
          fileUrl: resource.fileUrl || undefined,
          fileName: resource.fileName || undefined,
          fileSize: resource.fileSize || undefined,
          createdAt: resource.createdAt.toISOString(),
          batchId: resource.batchId || undefined,
          category: resource.category,
        },
      });
    } catch (error: any) {
      console.error('Error creating resource:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Upload file resource(s) (admin or section leader) - supports multiple files
router.post(
  '/upload',
  tokenRequired,
  async (req: AuthRequest, res: Response, next) => {
    // Custom authorization: admin or section leader
    if (req.user?.role === 'admin') {
      return next();
    }
    
    if (req.user?.role === 'student' && req.user.userId) {
      const ledSection = await prisma.section.findUnique({
        where: { leaderId: req.user.userId }
      });
      if (ledSection) {
        return next();
      }
    }
    
    return res.status(403).json({ error: 'Insufficient permissions' });
  },
  upload.array('files', 50), // Allow up to 50 files
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { titles, descriptions, category } = req.body;
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
      const batchId = files.length > 1 ? `batch-${Date.now()}-${Math.random().toString(36).substring(7)}` : null;
      const createdResources: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const title = titleList[i] || file.originalname;
        const description = descriptionList[i] || '';

        const ext = path.extname(file.originalname);
        const filename = `resource-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        const resource = await prisma.resource.create({
          data: {
            title,
            description: description || null,
            type: 'file',
            fileUrl: `/resources/files/${filename}`,
            fileName: file.originalname,
            fileSize: file.size,
            batchId: batchId,
            sectionId: req.body.sectionId ? parseInt(req.body.sectionId) : null,
            category: category || 'General',
          },
        });

        createdResources.push({
          id: resource.id,
          title: resource.title,
          description: resource.description || undefined,
          type: resource.type as 'file' | 'link',
          url: resource.url || undefined,
          fileUrl: resource.fileUrl || undefined,
          fileName: resource.fileName || undefined,
          fileSize: resource.fileSize || undefined,
          createdAt: resource.createdAt.toISOString(),
          batchId: resource.batchId || undefined,
          category: resource.category,
        });
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

// Send resource to Telegram
router.post(
  '/:id/send-to-telegram',
  tokenRequired,
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const resourceId = parseInt(req.params.id);
      const studentId = req.user?.userId;

      if (isNaN(resourceId)) {
        return res.status(400).json({ error: 'Invalid resource ID' });
      }

      if (!studentId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        await botService.sendResourceToUser(studentId, resourceId);
        return res.json({
          success: true,
          message: 'Resource sent to Telegram successfully',
        });
      } catch (botError: any) {
        if (botError.message === 'Student not linked to Telegram') {
          return res.status(400).json({ 
            error: 'You haven\'t linked your Telegram account yet. Please open the bot and share your contact first.',
            notLinked: true
          });
        }
        throw botError;
      }
    } catch (error: any) {
      console.error('Error sending resource to Telegram:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Delete resource(s) (admin)
router.delete(
  '/:id',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const resourceId = parseInt(req.params.id);

      if (isNaN(resourceId)) {
        return res.status(400).json({ error: 'Invalid resource ID' });
      }

      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // If it's a file resource, delete the physical file
      if (resource.type === 'file' && resource.fileUrl) {
        try {
          // Extract filename from fileUrl (format: /resources/files/filename)
          const filename = resource.fileUrl.split('/').pop();
          if (filename) {
            const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
            }
          }
        } catch (fileError: any) {
          // Log error but continue with deletion from database
          console.error('Error deleting resource file:', fileError);
        }
      }

      // Delete from database
      await prisma.resource.delete({
        where: { id: resourceId },
      });

      return res.json({
        success: true,
        message: 'Resource deleted successfully',
        deletedResource: {
          id: resource.id,
          title: resource.title,
          description: resource.description || undefined,
          type: resource.type as 'file' | 'link',
          url: resource.url || undefined,
          fileUrl: resource.fileUrl || undefined,
          fileName: resource.fileName || undefined,
          fileSize: resource.fileSize || undefined,
          createdAt: resource.createdAt.toISOString(),
          batchId: resource.batchId || undefined,
          category: resource.category,
        },
      });
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Delete multiple resources (admin) - accepts array of IDs in body
router.delete(
  '/',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Array of resource IDs is required' });
      }

      const resourceIds = ids
        .map((id) => (typeof id === 'string' ? parseInt(id) : id))
        .filter((id) => !isNaN(id)) as number[];

      if (resourceIds.length === 0) {
        return res.status(400).json({ error: 'No valid resource IDs provided' });
      }

      // Fetch resources to get file paths before deletion
      const resources = await prisma.resource.findMany({
        where: { id: { in: resourceIds } },
      });

      const deletedResources: any[] = [];
      const notFoundIds: number[] = [];

      // Delete physical files and track which resources exist
      for (const resource of resources) {
        if (resource.type === 'file' && resource.fileUrl) {
          try {
            const filename = resource.fileUrl.split('/').pop();
            if (filename) {
              const filepath = path.join(process.cwd(), 'uploads', 'resources', filename);
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }
            }
          } catch (fileError: any) {
            console.error(`Error deleting file for resource ${resource.id}:`, fileError);
          }
        }

        deletedResources.push({
          id: resource.id,
          title: resource.title,
          description: resource.description || undefined,
          type: resource.type as 'file' | 'link',
          url: resource.url || undefined,
          fileUrl: resource.fileUrl || undefined,
          fileName: resource.fileName || undefined,
          fileSize: resource.fileSize || undefined,
          createdAt: resource.createdAt.toISOString(),
          batchId: resource.batchId || undefined,
          category: resource.category,
        });
      }

      // Find IDs that weren't found
      const foundIds = resources.map((r) => r.id);
      notFoundIds.push(...resourceIds.filter((id) => !foundIds.includes(id)));

      // Delete from database
      await prisma.resource.deleteMany({
        where: { id: { in: resourceIds } },
      });

      return res.json({
        success: true,
        message: `Deleted ${deletedResources.length} resource(s)`,
        deletedCount: deletedResources.length,
        deletedResources,
        notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
      });
    } catch (error: any) {
      console.error('Error deleting resources:', error);
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
