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

    // Check if this appointment has already been used to create a student account
    const existingStudentWithAppointment = await prisma.student.findFirst({
      where: {
        appointmentId: acceptedAppointment.id,
      },
    });

    if (existingStudentWithAppointment) {
      return res.json({
        success: true,
        eligible: false,
        message: 'This interview appointment has already been used to create a student account. Each accepted interview can only be used once for registration.',
        canLogin: true,
        code: 'APPOINTMENT_ALREADY_USED',
      });
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

    // Validate all required fields are present and not empty
    if (!fullNameAmharic || !fullNameEnglish || !gender || !localChurch || !address || !phone || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate name fields (trim and check length)
    const trimmedFullNameAmharic = fullNameAmharic.trim();
    const trimmedFullNameEnglish = fullNameEnglish.trim();
    const trimmedLocalChurch = localChurch.trim();
    const trimmedAddress = address.trim();

    if (trimmedFullNameAmharic.length < 2 || trimmedFullNameAmharic.length > 100) {
      return res.status(400).json({ error: 'Full name (Amharic) must be between 2 and 100 characters' });
    }

    if (trimmedFullNameEnglish.length < 2 || trimmedFullNameEnglish.length > 100) {
      return res.status(400).json({ error: 'Full name (English) must be between 2 and 100 characters' });
    }

    if (trimmedLocalChurch.length < 2 || trimmedLocalChurch.length > 200) {
      return res.status(400).json({ error: 'Local church must be between 2 and 200 characters' });
    }

    if (trimmedAddress.length < 5 || trimmedAddress.length > 500) {
      return res.status(400).json({ error: 'Address must be between 5 and 500 characters' });
    }

    // Validate phone number format (should be at least 8 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number format. Phone number must contain 8-15 digits' });
    }

    // Normalize phone number (use last 8 digits for matching)
    const normalizedPhone = phoneDigits.slice(-8);

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 characters)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be less than 128 characters' });
    }

    // Validate gender
    const validGenders = ['male', 'female', 'Male', 'Female', 'MALE', 'FEMALE'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: 'Gender must be either "male" or "female"' });
    }

    // Check if username already exists
    const prisma = (await import('../db')).default;
    const existingUsername = await prisma.student.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Check if phone is already registered (use exact match first, then normalized match)
    const existingPhoneExact = await prisma.student.findUnique({
      where: { phone },
    });

    if (existingPhoneExact) {
      return res.status(400).json({ 
        error: 'This phone number is already registered. Please login instead.',
        canLogin: true,
      });
    }

    // Also check with normalized phone (last 8 digits) to catch variations
    const allStudents = await prisma.student.findMany({
      select: { phone: true },
    });
    
    const existingPhoneNormalized = allStudents.find((s) => {
      const studentPhoneDigits = s.phone.replace(/\D/g, '');
      return studentPhoneDigits.length >= 8 && studentPhoneDigits.slice(-8) === normalizedPhone;
    });

    if (existingPhoneNormalized) {
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

    // CRITICAL: Check if this appointment has already been used to create a student account
    const existingStudentWithAppointment = await prisma.student.findFirst({
      where: {
        appointmentId: acceptedAppointment.id,
      },
    });

    if (existingStudentWithAppointment) {
      return res.status(400).json({
        error: 'This interview appointment has already been used to create a student account. Each accepted interview can only be used once for registration.',
        code: 'APPOINTMENT_ALREADY_USED',
      });
    }

    // Verify that the phone number matches the appointment's phone number
    const appointmentPhoneDigits = acceptedAppointment.applicant_phone?.replace(/\D/g, '') || '';
    const appointmentNormalizedPhone = appointmentPhoneDigits.slice(-8);
    
    if (appointmentNormalizedPhone !== normalizedPhone) {
      return res.status(403).json({
        error: 'The phone number provided does not match the phone number associated with your accepted interview appointment.',
        code: 'PHONE_MISMATCH',
      });
    }

    const { studentService } = await import('../services/student.service');
    const student = await studentService.createStudent({
      username,
      password,
      fullNameAmharic: trimmedFullNameAmharic,
      fullNameEnglish: trimmedFullNameEnglish,
      gender: gender.toLowerCase(),
      localChurch: trimmedLocalChurch,
      address: trimmedAddress,
      phone, // Store original phone number format
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
