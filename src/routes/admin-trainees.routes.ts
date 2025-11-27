import { Router, Request, Response } from 'express';
import { tokenRequired, roleRequired, AuthRequest } from '../middleware/auth';
import { studentService } from '../services/student.service';
import { assignmentService } from '../services/assignment.service';
import { paymentService } from '../services/payment.service';
import { config } from '../config';

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

// Get all trainees
router.get(
  '/',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const status = req.query.status as string | undefined;
      const searchQuery = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await studentService.getAllStudents({
        status,
        searchQuery,
        limit,
        offset,
      });

      return res.json({
        success: true,
        students: result.students,
        total: result.total,
      });
    } catch (error: any) {
      console.error('Error getting trainees:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get trainee details with stats
router.get(
  '/:id',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }

      const stats = await studentService.getStudentStats(studentId);

      return res.json({
        success: true,
        ...stats,
      });
    } catch (error: any) {
      console.error('Error getting trainee details:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Update trainee status
router.put(
  '/:id/status',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const studentId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }

      if (!status || !['active', 'inactive', 'graduated', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const prisma = (await import('../db')).default;
      const student = await prisma.student.update({
        where: { id: studentId },
        data: { status },
      });

      const { passwordHash, ...studentWithoutPassword } = student;

      return res.json({
        success: true,
        student: studentWithoutPassword,
      });
    } catch (error: any) {
      console.error('Error updating trainee status:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get all assignments
router.get(
  '/assignments/all',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const assignments = await assignmentService.getAllAssignments();
      return res.json({
        success: true,
        assignments,
      });
    } catch (error: any) {
      console.error('Error getting assignments:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get assignment with submissions
router.get(
  '/assignments/:id',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await assignmentService.getAssignmentById(assignmentId);

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      return res.json({
        success: true,
        assignment,
      });
    } catch (error: any) {
      console.error('Error getting assignment:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Grade assignment submission
router.put(
  '/assignments/submissions/:id/grade',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const submissionId = parseInt(req.params.id);
      const { grade, feedback } = req.body;
      const gradedBy = req.user?.username || 'admin';

      if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
      }

      if (grade === undefined || grade < 0 || grade > 100) {
        return res.status(400).json({ error: 'Grade must be between 0 and 100' });
      }

      const submission = await assignmentService.gradeAssignment(submissionId, {
        grade,
        feedback,
        gradedBy,
      });

      return res.json({
        success: true,
        submission,
      });
    } catch (error: any) {
      console.error('Error grading assignment:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get all payments
router.get(
  '/payments/all',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const month = req.query.month as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await paymentService.getAllPayments({
        studentId,
        month,
        status,
        limit,
        offset,
      });

      return res.json({
        success: true,
        payments: result.payments,
        total: result.total,
      });
    } catch (error: any) {
      console.error('Error getting payments:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Update payment status
router.put(
  '/payments/:id/status',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const paymentId = parseInt(req.params.id);
      const { status, notes } = req.body;

      if (isNaN(paymentId)) {
        return res.status(400).json({ error: 'Invalid payment ID' });
      }

      if (!status || !['pending', 'paid', 'overdue'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const payment = await paymentService.updatePaymentStatus(paymentId, { status, notes });

      return res.json({
        success: true,
        payment,
      });
    } catch (error: any) {
      console.error('Error updating payment:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Create assignment
router.post(
  '/assignments',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { title, description, dueDate } = req.body;

      if (!title || !dueDate) {
        return res.status(400).json({ error: 'Title and due date are required' });
      }

      const assignment = await assignmentService.createAssignment({
        title,
        description,
        dueDate: new Date(dueDate),
      });

      return res.json({
        success: true,
        assignment,
      });
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Generate monthly payments for all active students
router.post(
  '/payments/generate',
  tokenRequired,
  roleRequired(['admin']),
  async (req: AuthRequest, res: Response) => {
    addCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      const { month, amount } = req.body;

      if (!month || !amount) {
        return res.status(400).json({ error: 'Month and amount are required' });
      }

      const payments = await paymentService.generateMonthlyPayments(month, amount);

      return res.json({
        success: true,
        payments,
        count: payments.length,
      });
    } catch (error: any) {
      console.error('Error generating payments:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;







