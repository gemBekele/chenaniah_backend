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

// Get all teams (public)
router.get('/', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      teams: teams.map((team) => ({
        ...team,
        memberCount: team._count.memberships,
        _count: undefined,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get single team by ID
router.get('/:id', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const teamId = parseInt(req.params.id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    return res.json({
      success: true,
      team: {
        ...team,
        memberCount: team._count.memberships,
        _count: undefined,
      },
    });
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create a team (admin only)
router.post('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({
      where: { name },
    });

    if (existingTeam) {
      return res.status(400).json({ error: 'A team with this name already exists' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        color: color || '#3B82F6',
      },
    });

    return res.json({
      success: true,
      team,
    });
  } catch (error: any) {
    console.error('Error creating team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update a team (admin only)
router.put('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teamId = parseInt(req.params.id);
    const { name, description, color } = req.body;

    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if new name conflicts with another team
    if (name && name !== existingTeam.name) {
      const nameConflict = await prisma.team.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return res.status(400).json({ error: 'A team with this name already exists' });
      }
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
    });

    return res.json({
      success: true,
      team,
    });
  } catch (error: any) {
    console.error('Error updating team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a team (admin only)
router.delete('/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teamId = parseInt(req.params.id);

    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Delete team (cascade will delete memberships and notices)
    await prisma.team.delete({
      where: { id: teamId },
    });

    return res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get team members
router.get('/:id/members', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const teamId = parseInt(req.params.id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        student: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
            phone: true,
            photoPath: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return res.json({
      success: true,
      team,
      members: memberships.map((m) => ({
        ...m.student,
        joinReason: m.joinReason,
        joinedAt: m.joinedAt,
        membershipId: m.id,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Join a team (student)
router.post('/:id/join', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const userRole = (req.user as any)?.role;
    const teamId = parseInt(req.params.id);
    const { joinReason } = req.body;

    if (!joinReason || joinReason.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a reason for joining this team' });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get student ID
    let studentId = userId;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      const student = await prisma.student.findUnique({
        where: { id: userId },
      });
      if (!student) {
        return res.status(400).json({ error: 'Student not found' });
      }
      studentId = student.id;
    }

    // Check if already a member
    const existingMembership = await prisma.teamMembership.findUnique({
      where: {
        teamId_studentId: {
          teamId,
          studentId,
        },
      },
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of this team' });
    }

    // Create membership
    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        studentId,
        joinReason,
      },
      include: {
        team: true,
      },
    });

    return res.json({
      success: true,
      message: `Successfully joined ${team.name}`,
      membership,
    });
  } catch (error: any) {
    console.error('Error joining team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Leave a team (student)
router.delete('/:id/leave', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const teamId = parseInt(req.params.id);

    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_studentId: {
          teamId,
          studentId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }

    await prisma.teamMembership.delete({
      where: { id: membership.id },
    });

    return res.json({
      success: true,
      message: 'Successfully left the team',
    });
  } catch (error: any) {
    console.error('Error leaving team:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get team notices
router.get('/:id/notices', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const teamId = parseInt(req.params.id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const notices = await prisma.teamNotice.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      team,
      notices,
    });
  } catch (error: any) {
    console.error('Error fetching team notices:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Post a team notice (admin only)
router.post('/:id/notices', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teamId = parseInt(req.params.id);
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const notice = await prisma.teamNotice.create({
      data: {
        teamId,
        title,
        content,
      },
    });

    return res.json({
      success: true,
      notice,
    });
  } catch (error: any) {
    console.error('Error creating team notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a team notice (admin only)
router.delete('/:teamId/notices/:noticeId', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const noticeId = parseInt(req.params.noticeId);

    const notice = await prisma.teamNotice.findUnique({
      where: { id: noticeId },
    });

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    await prisma.teamNotice.delete({
      where: { id: noticeId },
    });

    return res.json({
      success: true,
      message: 'Notice deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting team notice:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get student's teams
router.get('/student/:studentId', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const studentId = parseInt(req.params.studentId);

    const memberships = await prisma.teamMembership.findMany({
      where: { studentId },
      include: {
        team: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return res.json({
      success: true,
      teams: memberships.map((m) => ({
        ...m.team,
        joinReason: m.joinReason,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching student teams:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get current user's teams
router.get('/my/memberships', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;

    const memberships = await prisma.teamMembership.findMany({
      where: { studentId: userId },
      include: {
        team: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return res.json({
      success: true,
      teams: memberships.map((m) => ({
        ...m.team,
        memberCount: m.team._count.memberships,
        _count: undefined,
        joinReason: m.joinReason,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching my teams:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
