import { Router, Request, Response } from 'express';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { getStudentAccessibleModules, MODULES } from '../services/permission.service';

const router = Router();

router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.user || {};

    if (role === 'admin' || role === 'coordinator') {
      return res.json({
        modules: MODULES.map(m => m.key),
        labels: MODULES.reduce((acc, m) => ({ ...acc, [m.key]: m.label }), {}),
      });
    }

    if (role === 'student' && userId) {
      const accessibleModules = await getStudentAccessibleModules(userId);
      const labels = MODULES.filter(m => accessibleModules.includes(m.key))
        .reduce((acc, m) => ({ ...acc, [m.key]: m.label }), {});
      
      return res.json({
        modules: accessibleModules,
        labels,
      });
    }

    res.json({ modules: [], labels: {} });
  } catch (error: any) {
    console.error('Error fetching student modules:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-modules', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.user || {};

    if (role === 'admin' || role === 'coordinator') {
      return res.json({
        modules: MODULES.map(m => m.key),
        labels: MODULES.reduce((acc, m) => ({ ...acc, [m.key]: m.label }), {}),
      });
    }

    if (role === 'student' && userId) {
      const accessibleModules = await getStudentAccessibleModules(userId);
      const labels = MODULES.filter(m => accessibleModules.includes(m.key))
        .reduce((acc, m) => ({ ...acc, [m.key]: m.label }), {});
      
      return res.json({
        modules: accessibleModules,
        labels,
      });
    }

    res.json({ modules: [], labels: {} });
  } catch (error: any) {
    console.error('Error fetching student modules:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
