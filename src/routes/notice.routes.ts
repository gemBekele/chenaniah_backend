import { Router, Request, Response } from 'express';
import prisma from '../db';
import { tokenRequired, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
};

// Get all active notices (public endpoint for students)
router.get('/', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const notices = await prisma.notice.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      notices,
    });
  } catch (error: any) {
    console.error('Error fetching notices:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all notices (admin)
router.get('/all', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      notices,
    });
  } catch (error: any) {
    console.error('Error fetching all notices:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create notice (admin)
router.post('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { title, content, type, active } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        type: type || 'info',
        active: active !== undefined ? active : true,
      },
    });

    return res.json({
      success: true,
      notice,
    });
  } catch (error: any) {
    console.error('Error creating notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update notice (admin)
router.put('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { id } = req.params;
    const { title, content, type, active } = req.body;

    const notice = await prisma.notice.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(active !== undefined && { active }),
      },
    });

    return res.json({
      success: true,
      notice,
    });
  } catch (error: any) {
    console.error('Error updating notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete notice (admin)
router.delete('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { id } = req.params;

    await prisma.notice.delete({
      where: { id: parseInt(id) },
    });

    return res.json({
      success: true,
      message: 'Notice deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
