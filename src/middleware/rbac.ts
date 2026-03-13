import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { checkStudentAccess } from '../services/permission.service';
import prisma from '../db';

export const permissionRequired = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role, userId } = req.user;

    if (role === 'admin' || role === 'coordinator') {
      return next();
    }

    if (role === 'student' && userId) {
      // Check if student leads any section
      const ledSection = await prisma.section.findUnique({
        where: { leaderId: userId }
      });
      if (ledSection) {
        return next();
      }

      const hasAccess = await checkStudentAccess(userId, permission);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied', 
          permission: `You need "${permission}" permission to access this resource` 
        });
      }
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

export const moduleAccessRequired = (module: string, action: string = 'view') => {
  const permission = `${module}.${action}`;
  return permissionRequired(permission);
};

export const adminOrPermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role, userId } = req.user;

    if (role === 'admin' || role === 'coordinator') {
      return next();
    }

    if (role === 'student' && userId) {
      // Check if student leads any section
      const ledSection = await prisma.section.findUnique({
        where: { leaderId: userId }
      });
      if (ledSection) {
        return next();
      }

      const hasAccess = await checkStudentAccess(userId, permission);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied', 
          permission: `You need "${permission}" permission to access this resource` 
        });
      }
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};
