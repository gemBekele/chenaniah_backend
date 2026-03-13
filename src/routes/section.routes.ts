import { Router, Request, Response } from 'express';
import { tokenRequired, adminRequired, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

// Get all sections
router.get('/', async (req: Request, res: Response) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
          },
        },
        _count: {
          select: {
            students: true,
            resources: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return res.json({
      success: true,
      sections,
    });
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create a section (Admin only)
router.post('/', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, color } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const section = await prisma.section.create({
      data: { name, code, color },
    });

    return res.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('Error creating section:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update a section (Admin only)
router.put('/:id', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sectionId = parseInt(req.params.id);
    const { name, code, color, leaderId } = req.body;

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: { name, code, color, leaderId },
    });

    return res.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('Error updating section:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete a section (Admin only)
router.delete('/:id', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sectionId = parseInt(req.params.id);

    await prisma.section.delete({
      where: { id: sectionId },
    });

    return res.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting section:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Assign section leader (Admin only)
router.post('/:id/leader', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sectionId = parseInt(req.params.id);
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update section leader
    const section = await prisma.section.update({
      where: { id: sectionId },
      data: { leaderId: studentId },
    });

    return res.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('Error assigning section leader:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get a single section by ID
router.get('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sectionId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Authorization check
    let isAuthorized = userRole === 'admin' || userRole === 'coordinator';
    
    if (!isAuthorized && userRole === 'student' && userId) {
      // Check if they lead this specific section
      const ledSection = await prisma.section.findUnique({
        where: { leaderId: userId }
      });
      if (ledSection && ledSection.id === sectionId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
          },
        },
        _count: {
          select: {
            students: true,
            resources: true,
            notices: true,
          },
        },
      },
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    return res.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('Error fetching section details:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
