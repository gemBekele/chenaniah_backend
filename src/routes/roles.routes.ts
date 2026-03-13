import { Router, Request, Response } from 'express';
import { tokenRequired, adminRequired, AuthRequest } from '../middleware/auth';
import prisma from '../db';
import { getAllPermissions, getPermissionsByModule, seedPermissions } from '../services/permission.service';

const router = Router();

router.get('/permissions', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const grouped = await getPermissionsByModule();
    const permissions = await getAllPermissions();
    res.json({ permissions, grouped });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/permissions/seed', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    await seedPermissions();
    res.json({ message: 'Permissions seeded successfully' });
  } catch (error: any) {
    console.error('Error seeding permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(p => p.permission),
      studentsCount: role._count.students,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    res.json(formattedRoles);
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                fullNameEnglish: true,
                fullNameAmharic: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(p => p.permission),
      students: role.students.map(s => s.student),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  } catch (error: any) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissionIds && permissionIds.length > 0
          ? {
              create: permissionIds.map((permissionId: number) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(p => p.permission),
      createdAt: role.createdAt,
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', tokenRequired, adminRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existingRole.isSystem) {
      return res.status(400).json({ error: 'Cannot modify system roles' });
    }

    if (name && name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name },
      });
      if (nameExists) {
        return res.status(400).json({ error: 'Role with this name already exists' });
      }
    }

    await prisma.rolePermission.deleteMany({
      where: { roleId: parseInt(id) },
    });

    const role = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        permissions: permissionIds && permissionIds.length > 0
          ? {
              create: permissionIds.map((permissionId: number) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(p => p.permission),
      updatedAt: role.updatedAt,
    });
  } catch (error: any) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', tokenRequired, adminRequired, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existingRole.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    const studentCount = await prisma.studentRole.count({
      where: { roleId: parseInt(id) },
    });

    if (studentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete role that is assigned to students. Remove role assignments first.',
      });
    }

    await prisma.role.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
