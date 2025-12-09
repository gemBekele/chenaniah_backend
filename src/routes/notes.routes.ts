import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import prisma from '../db';
import { tokenRequired, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure multer for note image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `note-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max (client should compress before upload)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
};

// Get notes for a specific session
router.get('/session/:sessionId', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const sessionId = parseInt(req.params.sessionId);

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const notes = await prisma.note.findMany({
      where: { sessionId },
      include: {
        student: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
            photoPath: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      notes,
    });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all notes (admin)
router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sessionId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (sessionId) {
      where.sessionId = parseInt(sessionId as string);
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullNameEnglish: true,
              fullNameAmharic: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
              date: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.note.count({ where }),
    ]);

    return res.json({
      success: true,
      notes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching all notes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get sessions list for notes
router.get('/sessions', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { status: { in: ['active', 'completed'] } },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        name: true,
        date: true,
        _count: {
          select: { notes: true },
        },
      },
    });

    return res.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date,
        notesCount: s._count.notes,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching sessions for notes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create a text note
router.post('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const userRole = (req.user as any)?.role;
    const { content, sessionId } = req.body;

    if (!content || !sessionId) {
      return res.status(400).json({ error: 'Content and sessionId are required' });
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Determine author type
    const isAdmin = userRole === 'coordinator' || userRole === 'admin';
    const authorType = isAdmin ? 'admin' : 'student';

    // If student, verify they exist; admin notes store null authorId
    let authorId: number | null = null;
    if (!isAdmin) {
      const student = await prisma.student.findUnique({
        where: { id: userId },
      });
      if (!student) {
        return res.status(400).json({ error: 'Student not found' });
      }
      authorId = student.id;
    }

    const note = await prisma.note.create({
      data: {
        content,
        type: 'text',
        sessionId: parseInt(sessionId),
        authorId,
        authorType,
      },
      include: {
        student: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      note,
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create an image note
router.post('/image', tokenRequired, upload.single('image'), async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const userRole = (req.user as any)?.role;
    const { sessionId, content } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session) {
      // Clean up uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Session not found' });
    }

    // Determine author type
    const isAdmin = userRole === 'coordinator' || userRole === 'admin';
    const authorType = isAdmin ? 'admin' : 'student';

    // If student, verify they exist; admin notes store null authorId
    let authorId: number | null = null;
    if (!isAdmin) {
      const student = await prisma.student.findUnique({
        where: { id: userId },
      });
      if (!student) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Student not found' });
      }
      authorId = student.id;
    }

    const imagePath = `/uploads/notes/${req.file.filename}`;

    const note = await prisma.note.create({
      data: {
        content: content || null,
        imagePath,
        type: 'image',
        sessionId: parseInt(sessionId),
        authorId,
        authorType,
      },
      include: {
        student: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      note,
    });
  } catch (error: any) {
    console.error('Error creating image note:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a note
router.delete('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const userRole = (req.user as any)?.role;
    const noteId = parseInt(req.params.id);

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check permission: admin can delete any, students can only delete their own
    const isAdmin = userRole === 'coordinator' || userRole === 'admin';
    if (!isAdmin && note.authorId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    // Delete the note
    await prisma.note.delete({
      where: { id: noteId },
    });

    // Delete associated image file if exists
    if (note.imagePath) {
      const imagePath = path.join(process.cwd(), note.imagePath.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    return res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
