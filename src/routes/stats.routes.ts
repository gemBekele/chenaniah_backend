import { Router, Response } from 'express';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { dbService } from '../services/database.service';

const router = Router();

router.get('/', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await dbService.getSubmissionStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;


