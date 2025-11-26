import { Router, Response } from 'express';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { dbService } from '../services/database.service';

const router = Router();

router.get('/status', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const isOpen = await dbService.getRegistrationStatus();
    return res.json({
      success: true,
      registration_open: isOpen,
    });
  } catch (error: any) {
    console.error('Error getting registration status:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.put('/status', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { registration_open } = req.body;
    const isOpen = registration_open !== false; // Default to true if not specified

    await dbService.setRegistrationStatus(isOpen);

    return res.json({
      success: true,
      message: `Registration ${isOpen ? 'opened' : 'closed'} successfully`,
      registration_open: isOpen,
    });
  } catch (error: any) {
    console.error('Error setting registration status:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;



