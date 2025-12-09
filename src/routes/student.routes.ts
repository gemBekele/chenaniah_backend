import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { config } from '../config';
import prisma from '../db';
import { tokenRequired, AuthRequest } from '../middleware/auth';
import { studentService } from '../services/student.service';
import { assignmentService } from '../services/assignment.service';
import { paymentService } from '../services/payment.service';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

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

// Get student profile
router.get('/profile', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const student = await studentService.getStudentById(userId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Format response for frontend
    const user = {
      id: student.id,
      username: student.username,
      fullNameAmharic: student.fullNameAmharic,
      fullNameEnglish: student.fullNameEnglish,
      phone: student.phone,
      profileComplete: student.profileComplete,
      hasIdDocument: !!student.idDocumentPath,
      hasRecommendationLetter: !!student.recommendationLetterPath,
      hasEssay: !!student.essay,
      hasPortrait: !!student.photoPath,
      photoPath: student.photoPath,
    };

    return res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Error getting student profile:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Upload document
router.post('/upload-document', tokenRequired, upload.single('file'), async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { type } = req.body;

    if (!type || (type !== 'id' && type !== 'recommendation' && type !== 'portrait')) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Validate file type for portrait (images only)
    if (type === 'portrait') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Portrait must be an image file (JPG, PNG)' });
      }
    }

    // Save file
    const filePath = await studentService.saveUploadedFile(req.file, type);

    // Update student profile
    const updateData: any = {};
    if (type === 'id') {
      updateData.idDocumentPath = filePath;
    } else if (type === 'recommendation') {
      updateData.recommendationLetterPath = filePath;
    } else if (type === 'portrait') {
      updateData.photoPath = filePath;
    }

    await studentService.updateStudentProfile(userId, updateData);

    const messages: { [key: string]: string } = {
      'id': 'ID document',
      'recommendation': 'Recommendation letter',
      'portrait': 'Portrait photo'
    };

    return res.json({
      success: true,
      message: `${messages[type]} uploaded successfully`,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Submit essay
router.post('/submit-essay', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { essay } = req.body;

    if (!essay || !essay.trim()) {
      return res.status(400).json({ error: 'Essay is required' });
    }

    await studentService.updateStudentProfile(userId, { essay });

    return res.json({
      success: true,
      message: 'Essay submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting essay:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get assignments
router.get('/assignments', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const assignments = await assignmentService.getStudentAssignments(userId);

    return res.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error('Error getting assignments:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get sessions that allow assignment uploads
router.get('/assignment-sessions', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { status: { in: ['active', 'completed'] } },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        name: true,
        date: true,
      },
    });

    return res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Error getting assignment sessions:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Submit assignment
router.post('/submit-assignment', tokenRequired, upload.single('file'), async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { assignmentId, sessionId, text } = req.body;

    const parsedAssignmentId = assignmentId ? parseInt(assignmentId) : undefined;
    const parsedSessionId = sessionId ? parseInt(sessionId) : undefined;

    if (!parsedAssignmentId && !parsedSessionId) {
      return res.status(400).json({ error: 'Assignment ID or session ID is required' });
    }

    if (parsedAssignmentId !== undefined && isNaN(parsedAssignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    if (parsedSessionId !== undefined && isNaN(parsedSessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    let filePath: string | undefined;
    if (req.file) {
      filePath = await assignmentService.saveSubmissionFile(req.file);
    }

    let targetAssignmentId = parsedAssignmentId;
    if (!targetAssignmentId && parsedSessionId) {
      const assignment = await assignmentService.getOrCreateSessionAssignment(parsedSessionId);
      targetAssignmentId = assignment.id;
    }

    if (!targetAssignmentId) {
      return res.status(400).json({ error: 'Unable to resolve assignment' });
    }

    await assignmentService.submitAssignment({
      studentId: userId,
      assignmentId: targetAssignmentId,
      filePath,
      text,
    });

    return res.json({
      success: true,
      message: 'Assignment submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Submit monthly payment
router.post('/submit-payment', tokenRequired, upload.single('depositSlip'), async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { amount, month, notes } = req.body;

    if (!amount || !month) {
      return res.status(400).json({ error: 'Amount and month are required' });
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    }

    let depositSlipPath: string | undefined;
    if (req.file) {
      depositSlipPath = await paymentService.saveDepositSlip(req.file);
    }

    const payment = await paymentService.createPayment({
      studentId: userId,
      amount: parseFloat(amount),
      month,
      notes,
      depositSlipPath,
    });

    return res.json({
      success: true,
      message: 'Payment submitted successfully',
      payment,
    });
  } catch (error: any) {
    console.error('Error submitting payment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get student payments
router.get('/payments', tokenRequired, async (req: AuthRequest, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const payments = await paymentService.getStudentPayments(userId);

    return res.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error('Error getting payments:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get resources - redirects to resources route
// This endpoint is kept for backward compatibility but resources are now at /api/resources

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
