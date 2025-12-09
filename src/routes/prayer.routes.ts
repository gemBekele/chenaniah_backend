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

// Day names for display
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Excluded time slots:
// - Wednesday (day 3): 17:00 - 19:00
// - Sunday (day 0): 15:00 - 18:00
const isExcludedSlot = (dayOfWeek: number, startTime: string): boolean => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  // Wednesday 17:00 - 19:00 (5:00 PM - 7:00 PM)
  if (dayOfWeek === 3) {
    const start = 17 * 60; // 17:00
    const end = 19 * 60; // 19:00
    if (timeInMinutes >= start && timeInMinutes < end) {
      return true;
    }
  }

  // Sunday 15:00 - 18:00 (3:00 PM - 6:00 PM)
  if (dayOfWeek === 0) {
    const start = 15 * 60; // 15:00
    const end = 18 * 60; // 18:00
    if (timeInMinutes >= start && timeInMinutes < end) {
      return true;
    }
  }

  return false;
};

// Generate time slots for a day (15-minute intervals)
const generateTimeSlotsForDay = (dayOfWeek: number): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      if (!isExcludedSlot(dayOfWeek, time)) {
        slots.push(time);
      }
    }
  }
  return slots;
};

// Get all prayer slots
router.get('/slots', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { day } = req.query;
    
    const where: any = {};
    if (day !== undefined) {
      where.dayOfWeek = parseInt(day as string);
    }

    const slots = await prisma.prayerSlot.findMany({
      where,
      include: {
        claimedBy: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
            photoPath: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Group by day
    const slotsByDay: Record<number, typeof slots> = {};
    for (let i = 0; i < 7; i++) {
      slotsByDay[i] = [];
    }
    slots.forEach((slot) => {
      slotsByDay[slot.dayOfWeek].push(slot);
    });

    return res.json({
      success: true,
      slots,
      slotsByDay,
      dayNames: DAY_NAMES,
    });
  } catch (error: any) {
    console.error('Error fetching prayer slots:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get my claimed slot
router.get('/my-slot', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;

    const slot = await prisma.prayerSlot.findFirst({
      where: { claimedById: userId },
    });

    return res.json({
      success: true,
      slot,
      dayName: slot ? DAY_NAMES[slot.dayOfWeek] : null,
    });
  } catch (error: any) {
    console.error('Error fetching my prayer slot:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Claim a slot
router.post('/slots/:id/claim', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const slotId = parseInt(req.params.id);

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }

    // Check if slot exists
    const slot = await prisma.prayerSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return res.status(404).json({ error: 'Prayer slot not found' });
    }

    // Check if slot is already claimed
    if (slot.claimedById) {
      return res.status(400).json({ error: 'This slot is already claimed' });
    }

    // Check if user already has a slot
    const existingSlot = await prisma.prayerSlot.findFirst({
      where: { claimedById: userId },
    });

    if (existingSlot) {
      return res.status(400).json({ 
        error: 'You already have a prayer slot claimed. Please release it first before claiming a new one.',
        existingSlot: {
          id: existingSlot.id,
          dayOfWeek: existingSlot.dayOfWeek,
          dayName: DAY_NAMES[existingSlot.dayOfWeek],
          startTime: existingSlot.startTime,
        },
      });
    }

    // Claim the slot
    const updatedSlot = await prisma.prayerSlot.update({
      where: { id: slotId },
      data: {
        claimedById: userId,
        claimedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: `Successfully claimed ${DAY_NAMES[updatedSlot.dayOfWeek]} at ${updatedSlot.startTime}`,
      slot: updatedSlot,
    });
  } catch (error: any) {
    console.error('Error claiming prayer slot:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Release a claimed slot
router.delete('/slots/:id/claim', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    const userRole = (req.user as any)?.role;
    const slotId = parseInt(req.params.id);

    const slot = await prisma.prayerSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return res.status(404).json({ error: 'Prayer slot not found' });
    }

    // Check permission: admin can release any, students can only release their own
    const isAdmin = userRole === 'coordinator' || userRole === 'admin';
    if (!isAdmin && slot.claimedById !== userId) {
      return res.status(403).json({ error: 'You can only release your own prayer slot' });
    }

    if (!slot.claimedById) {
      return res.status(400).json({ error: 'This slot is not claimed' });
    }

    // Release the slot
    const updatedSlot = await prisma.prayerSlot.update({
      where: { id: slotId },
      data: {
        claimedById: null,
        claimedAt: null,
      },
    });

    return res.json({
      success: true,
      message: 'Prayer slot released successfully',
      slot: updatedSlot,
    });
  } catch (error: any) {
    console.error('Error releasing prayer slot:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Generate all prayer slots (admin only)
router.post('/generate', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { reset } = req.body;

    // If reset, delete all existing slots
    if (reset) {
      await prisma.prayerSlot.deleteMany({});
    }

    // Check if slots already exist
    const existingCount = await prisma.prayerSlot.count();
    if (existingCount > 0 && !reset) {
      return res.status(400).json({ 
        error: 'Prayer slots already exist. Set reset=true to regenerate.',
        existingCount,
      });
    }

    // Generate slots for each day
    const slotsToCreate: { dayOfWeek: number; startTime: string }[] = [];
    
    for (let day = 0; day < 7; day++) {
      const daySlots = generateTimeSlotsForDay(day);
      daySlots.forEach((time) => {
        slotsToCreate.push({ dayOfWeek: day, startTime: time });
      });
    }

    // Batch create slots
    const result = await prisma.prayerSlot.createMany({
      data: slotsToCreate,
      skipDuplicates: true,
    });

    // Count slots per day
    const slotCounts: Record<string, number> = {};
    for (let day = 0; day < 7; day++) {
      slotCounts[DAY_NAMES[day]] = generateTimeSlotsForDay(day).length;
    }

    return res.json({
      success: true,
      message: `Generated ${result.count} prayer slots`,
      totalSlots: result.count,
      slotsPerDay: slotCounts,
      excludedPeriods: [
        'Wednesday 17:00-19:00',
        'Sunday 15:00-18:00',
      ],
    });
  } catch (error: any) {
    console.error('Error generating prayer slots:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get prayer overview (admin)
router.get('/admin/overview', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [totalSlots, claimedSlots, claims] = await Promise.all([
      prisma.prayerSlot.count(),
      prisma.prayerSlot.count({ where: { claimedById: { not: null } } }),
      prisma.prayerSlot.findMany({
        where: { claimedById: { not: null } },
        include: {
          claimedBy: {
            select: {
              id: true,
              fullNameEnglish: true,
              fullNameAmharic: true,
              phone: true,
            },
          },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      }),
    ]);

    // Group claims by day
    const claimsByDay: Record<number, typeof claims> = {};
    for (let i = 0; i < 7; i++) {
      claimsByDay[i] = [];
    }
    claims.forEach((claim) => {
      claimsByDay[claim.dayOfWeek].push(claim);
    });

    return res.json({
      success: true,
      stats: {
        totalSlots,
        claimedSlots,
        availableSlots: totalSlots - claimedSlots,
        claimPercentage: totalSlots > 0 ? Math.round((claimedSlots / totalSlots) * 100) : 0,
      },
      claims,
      claimsByDay,
      dayNames: DAY_NAMES,
    });
  } catch (error: any) {
    console.error('Error fetching prayer overview:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
