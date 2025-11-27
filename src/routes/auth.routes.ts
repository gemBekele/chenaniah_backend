import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '3600');
};

// Admin login
router.post('/login', (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  const { username, password } = req.body;

  if (username === config.auth.adminUsername && password === config.auth.adminPassword) {
    const token = jwt.sign(
      {
        username,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      config.api.secretKey,
      { algorithm: 'HS256' }
    );

    return res.json({
      success: true,
      token,
      username,
      role: 'admin',
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// Coordinator login
router.post('/coordinator/login', (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  const { username, password } = req.body;

  if (
    username === config.auth.coordinatorUsername &&
    password === config.auth.coordinatorPassword
  ) {
    const token = jwt.sign(
      {
        username,
        role: 'coordinator',
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      config.api.secretKey,
      { algorithm: 'HS256' }
    );

    return res.json({
      success: true,
      token,
      username,
      role: 'coordinator',
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// Check if phone number is eligible for registration
router.post('/student/check-eligibility', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }

    // Check if phone is already registered
    const prisma = (await import('../db')).default;
    const existingStudent = await prisma.student.findUnique({
      where: { phone },
    });

    if (existingStudent) {
      return res.json({
        success: true,
        eligible: false,
        message: 'This phone number is already registered. Please login instead.',
        canLogin: true,
      });
    }

    // Check if user has accepted interview
    const { dbService } = await import('../services/database.service');
    const appointments = await dbService.getAppointmentsByPhone(phone);
    
    const acceptedAppointment = appointments.find((apt) => {
      // Check final_decision field
      if (apt.final_decision === 'accepted') {
        return true;
      }
      // Also check if status is completed (legacy support)
      if (apt.status === 'completed' && !apt.final_decision) {
        return true;
      }
      return false;
    });

    if (!acceptedAppointment) {
      // Check if there are any appointments at all
      const hasAnyAppointment = appointments.length > 0;
      
      if (hasAnyAppointment) {
        // Check appointment status
        const latestAppointment = appointments[0];
        if (latestAppointment.status === 'scheduled') {
          return res.json({
            success: true,
            eligible: false,
            message: 'Your interview is scheduled but not yet completed. Please complete your interview first.',
            canLogin: false,
          });
        } else if (latestAppointment.final_decision === 'rejected') {
          return res.json({
            success: true,
            eligible: false,
            message: 'Unfortunately, your application was not accepted. Please contact us for more information.',
            canLogin: false,
          });
        } else {
          return res.json({
            success: true,
            eligible: false,
            message: 'You must have passed the interview to register as a student. Please check your interview status.',
            canLogin: false,
          });
        }
      } else {
        return res.json({
          success: true,
          eligible: false,
          message: 'No interview record found for this phone number. Please complete the application and interview process first.',
          canLogin: false,
        });
      }
    }

    // User is eligible
    return res.json({
      success: true,
      eligible: true,
      message: 'You are eligible to register!',
      appointmentInfo: {
        scheduledDate: acceptedAppointment.scheduled_date,
        scheduledTime: acceptedAppointment.scheduled_time,
      },
    });
  } catch (error: any) {
    console.error('Check eligibility error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
  }
});

// Student login
router.post('/student/login', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { studentService } = await import('../services/student.service');
    const student = await studentService.authenticateStudent(username, password);

    if (!student) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        userId: student.id,
        username: student.username,
        role: 'student',
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      config.api.secretKey,
      { algorithm: 'HS256' }
    );

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
      token,
      username: student.username,
      role: 'student',
      user,
    });
  } catch (error: any) {
    console.error('Student login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Student registration
router.post('/student/register', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { fullNameAmharic, fullNameEnglish, gender, localChurch, address, phone, username, password } = req.body;

    if (!fullNameAmharic || !fullNameEnglish || !gender || !localChurch || !address || !phone || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    const prisma = (await import('../db')).default;
    const existingUsername = await prisma.student.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Check if phone is already registered
    const existingPhone = await prisma.student.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      return res.status(400).json({ 
        error: 'This phone number is already registered. Please login instead.',
        canLogin: true,
      });
    }

    // Check if user passed interview (has appointment with finalDecision = 'accepted')
    const { dbService } = await import('../services/database.service');
    const appointments = await dbService.getAppointmentsByPhone(phone);
    
    const acceptedAppointment = appointments.find((apt) => {
      // Check final_decision field
      if (apt.final_decision === 'accepted') {
        return true;
      }
      // Also check if status is completed (legacy support)
      if (apt.status === 'completed' && !apt.final_decision) {
        return true;
      }
      return false;
    });

    if (!acceptedAppointment) {
      return res.status(403).json({
        error: 'You must have passed the interview to register as a student. Please check your interview status or contact us for assistance.',
        code: 'INTERVIEW_NOT_ACCEPTED',
      });
    }

    const { studentService } = await import('../services/student.service');
    const student = await studentService.createStudent({
      username,
      password,
      fullNameAmharic,
      fullNameEnglish,
      gender,
      localChurch,
      address,
      phone,
      appointmentId: acceptedAppointment.id,
    });

    const token = jwt.sign(
      {
        userId: student.id,
        username: student.username,
        role: 'student',
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      config.api.secretKey,
      { algorithm: 'HS256' }
    );

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
      token,
      username: student.username,
      role: 'student',
      user,
    });
  } catch (error: any) {
    console.error('Student registration error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('username')) {
        return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      }
      if (error.meta?.target?.includes('phone')) {
        return res.status(400).json({ error: 'Phone number already registered. Please login instead.' });
      }
    }
    
    return res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Handle OPTIONS for CORS
router.options('*', (req: Request, res: Response) => {
  addCorsHeaders(res, req);
  res.sendStatus(200);
});

export default router;
