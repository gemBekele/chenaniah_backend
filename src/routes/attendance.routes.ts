// ATTENDANCE ROUTES - TEMPORARILY COMMENTED OUT
// This file is disabled to prevent TypeScript compilation errors
// Uncomment when attendance functionality is ready

/*
import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { config } from '../config';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { attendanceService } from '../services/attendance.service';
import { studentService } from '../services/student.service';

const router = Router();

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  const allowedOrigins = config.cors.origins;

  if (allowedOrigins.includes(origin) || origin === '*') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '3600');
};

// Get student's QR code (as image)
router.get('/student/qrcode', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get or generate QR code
    const qrCode = await attendanceService.getOrGenerateQRCode(userId);

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    return res.json({
      success: true,
      qrCode,
      qrCodeImage: qrCodeDataUrl,
    });
  } catch (error: any) {
    console.error('QR code generation error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get student's QR code string only
router.get('/student/qrcode/string', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const qrCode = await attendanceService.getOrGenerateQRCode(userId);
    return res.json({
      success: true,
      qrCode,
    });
  } catch (error: any) {
    console.error('QR code retrieval error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create a new session (coordinator/admin only)
router.post('/sessions', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, date, location } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    const facilitatorId = (req.user as any)?.username;

    const session = await attendanceService.createSession({
      name,
      date: new Date(date),
      location,
      facilitatorId,
    });

    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all sessions
router.get('/sessions', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { status, dateFrom, dateTo } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const sessions = await attendanceService.getSessions(filters);

    return res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get session by ID
router.get('/sessions/:id', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await attendanceService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('Get session error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Scan QR code and record attendance
router.post('/scan', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { sessionId, qrCode, scannedAt, isOffline } = req.body;

    if (!sessionId || !qrCode) {
      return res.status(400).json({ error: 'Session ID and QR code are required' });
    }

    const attendance = await attendanceService.recordAttendance({
      sessionId: parseInt(sessionId, 10),
      qrCode,
      scannedAt: scannedAt ? new Date(scannedAt) : undefined,
      isOffline: isOffline || false,
    });

    return res.json({
      success: true,
      attendance,
      message: 'Attendance recorded successfully',
    });
  } catch (error: any) {
    console.error('Scan QR code error:', error);
    return res.status(400).json({ error: error.message || 'Failed to record attendance' });
  }
});

// Sync offline attendance records
router.post('/sync', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const result = await attendanceService.syncOfflineRecords(records);

    return res.json({
      success: true,
      successCount: result.success,
      failed: result.failed,
      results: result.results,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Sync attendance error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get session statistics
router.get('/sessions/:id/stats', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const stats = await attendanceService.getSessionStats(sessionId);

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get session stats error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update session status
router.put('/sessions/:id/status', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== 'coordinator' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const session = await attendanceService.updateSessionStatus(sessionId, status);

    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('Update session status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
*/

// Export empty router to prevent import errors
import { Router } from 'express';
const router = Router();
export default router;
