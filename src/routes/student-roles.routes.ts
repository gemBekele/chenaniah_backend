import { Router, Request, Response } from 'express';
import { tokenRequired, adminRequired, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

// Get current student's roles
router.get('/my-roles', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.user || {};

    if (role !== 'student' || !userId) {
      return res.status(403).json({ error: 'Only students can access this endpoint' });
    }

    const studentRoles = await prisma.studentRole.findMany({
      where: { studentId: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = studentRoles.map(sr => ({
      id: sr.role.id,
      name: sr.role.name,
      description: sr.role.description,
      assignedAt: sr.assignedAt,
      permissions: sr.role.permissions.map(p => p.permission.module),
    }));

    // Check if student leads any section
    const ledSection = await prisma.section.findUnique({
      where: { leaderId: userId },
      select: {
        id: true,
        name: true,
        code: true,
        color: true,
      },
    });

    res.json({ roles, ledSection });
  } catch (error: any) {
    console.error('Error fetching my roles:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:studentId/roles', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: {
        id: true,
        username: true,
        fullNameEnglish: true,
        fullNameAmharic: true,
        phone: true,
        status: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentRoles = await prisma.studentRole.findMany({
      where: { studentId: parseInt(studentId) },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = studentRoles.map(sr => ({
      id: sr.role.id,
      name: sr.role.name,
      description: sr.role.description,
      assignedAt: sr.assignedAt,
      permissions: sr.role.permissions.map(p => p.permission),
    }));

    res.json({
      student,
      roles,
    });
  } catch (error: any) {
    console.error('Error fetching student roles:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:studentId/roles', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { roleIds } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({ error: 'Role IDs array is required' });
    }

    await prisma.studentRole.deleteMany({
      where: { studentId: parseInt(studentId) },
    });

    if (roleIds.length > 0) {
      await prisma.studentRole.createMany({
        data: roleIds.map((roleId: number) => ({
          studentId: parseInt(studentId),
          roleId,
        })),
      });
    }

    const updatedRoles = await prisma.studentRole.findMany({
      where: { studentId: parseInt(studentId) },
      include: {
        role: true,
      },
    });

    res.json({
      message: 'Roles assigned successfully',
      roles: updatedRoles.map(sr => sr.role),
    });
  } catch (error: any) {
    console.error('Error assigning roles:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:studentId/roles/:roleId', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const { studentId, roleId } = req.params;

    await prisma.studentRole.delete({
      where: {
        studentId_roleId: {
          studentId: parseInt(studentId),
          roleId: parseInt(roleId),
        },
      },
    });

    res.json({ message: 'Role removed from student successfully' });
  } catch (error: any) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/roles/:roleId/students', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const studentRoles = await prisma.studentRole.findMany({
      where: { roleId: parseInt(roleId) },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    res.json({
      role,
      students: studentRoles.map(sr => sr.student),
    });
  } catch (error: any) {
    console.error('Error fetching role students:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
