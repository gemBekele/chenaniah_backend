import { Router, Request, Response } from 'express';
import { tokenRequired, roleRequired, AuthRequest } from '../middleware/auth';
import { dbService } from '../services/database.service';
import { transformAppointment } from '../utils/transform';

const router = Router();

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
};

// Get schedule stats
router.get('/stats', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await dbService.getScheduleStats();
    return res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error getting schedule stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get appointments
router.get('/appointments', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const searchQuery = (req.query.search as string)?.trim();
    const appointments = await dbService.getAppointments(searchQuery);
    return res.json({ success: true, appointments });
  } catch (error: any) {
    console.error('Error getting appointments:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get time slots (PUBLIC - no auth required)
router.get('/time-slots', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const date = req.query.date as string | undefined;
    const timeSlots = await dbService.getTimeSlots(date);
    addCorsHeaders(res, req);
    return res.json({ success: true, timeSlots });
  } catch (error: any) {
    console.error('Error getting time slots:', error);
    addCorsHeaders(res, req);
    return res.status(500).json({ error: error.message });
  }
});

// Create time slot
router.post('/time-slots', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { time, date, location } = req.body;

    if (!time || !date) {
      return res.status(400).json({ error: 'Time and date are required' });
    }

    const slot = await dbService.createTimeSlot(time, date, location);

    if (!slot) {
      return res.status(500).json({ error: 'Failed to create time slot (may already exist)' });
    }

    return res.json({ success: true, message: 'Time slot created successfully' });
  } catch (error: any) {
    console.error('Error creating time slot:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Bulk create time slots
router.post('/time-slots/bulk', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { date, start_time, end_time, interval_minutes, location, number_of_slots } = req.body;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'date, start_time, and end_time are required' });
    }

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    // Parse times
    const [startHour, startMin] = start_time.split(':').map(Number);
    const [endHour, endMin] = end_time.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const start = new Date();
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    if (end <= start) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }

    let interval = interval_minutes || 30;
    let slotsCreated = 0;
    let slotsSkipped = 0;

    // If number_of_slots is specified, calculate interval
    if (number_of_slots) {
      const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const calculatedInterval = Math.floor(totalMinutes / number_of_slots);
      if (calculatedInterval < 1) {
        interval = 1;
      } else {
        interval = calculatedInterval;
      }
    }

    let current = new Date(start);
    let slotCount = 0;

    while (current < end) {
      const timeStr = `${String(current.getHours()).padStart(2, '0')}:${String(
        current.getMinutes()
      ).padStart(2, '0')}`;

      const slot = await dbService.createTimeSlot(timeStr, date, location);
      if (slot) {
        slotsCreated++;
        slotCount++;
      } else {
        slotsSkipped++;
      }

      current.setMinutes(current.getMinutes() + interval);

      if (number_of_slots && slotCount >= number_of_slots) {
        break;
      }
    }

    return res.json({
      success: true,
      message: `Created ${slotsCreated} time slots, skipped ${slotsSkipped} existing slots`,
      slots_created: slotsCreated,
      slots_skipped: slotsSkipped,
    });
  } catch (error: any) {
    console.error('Error creating bulk time slots:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update time slot
router.put('/time-slots/:slot_id', tokenRequired, async (req: AuthRequest, res: Response) => {
  try {
    const slotId = parseInt(req.params.slot_id);
    const { available } = req.body;

    if (typeof available !== 'boolean') {
      return res.status(400).json({ error: 'Available status is required' });
    }

    await dbService.updateTimeSlotAvailability(slotId, available);

    return res.json({ success: true, message: 'Time slot updated successfully' });
  } catch (error: any) {
    console.error('Error updating time slot:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create appointment (PUBLIC)
router.post('/appointments', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  try {
    const {
      applicant_name,
      applicant_email,
      applicant_phone,
      scheduled_date,
      scheduled_time,
      notes,
      selected_song,
      additional_song,
      additional_song_singer,
    } = req.body;

    const requiredFields = ['applicant_name', 'applicant_phone', 'scheduled_date', 'scheduled_time'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Check for existing appointments
    const existingAppointments = await dbService.getAppointmentsByPhone(applicant_phone);
    // Appointments are already transformed to snake_case
    const activeAppointments = existingAppointments.filter(
      (apt) => apt.status.toLowerCase() === 'scheduled'
    );

    if (activeAppointments.length > 0) {
      const latest = activeAppointments[0];
      return res.status(400).json({
        success: false,
        error: 'You already have a scheduled interview appointment.',
        existing_appointment: {
          date: latest.scheduled_date,
          time: latest.scheduled_time,
        },
      });
    }

    // Check if applicant's submission is approved
    const digitsOnly = applicant_phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    const last8Digits = digitsOnly.slice(-8);
    const allSubmissions = await dbService.getAllSubmissions({});
    const submission = allSubmissions.find((sub) => {
      const subDigits = sub.phone.replace(/\D/g, '');
      return subDigits.length >= 8 && subDigits.slice(-8) === last8Digits;
    });

    if (!submission) {
      return res.status(400).json({
        success: false,
        error:
          'Phone number not found in our system. Please ensure you have submitted an application first.',
      });
    }

    const submissionStatus = submission.status.toLowerCase();
    if (submissionStatus !== 'approved') {
      if (submissionStatus === 'pending') {
        return res.status(400).json({
          success: false,
          error:
            'Your application is still under review. Please wait for approval before scheduling an interview.',
        });
      } else if (submissionStatus === 'rejected') {
        return res.status(400).json({
          success: false,
          error:
            'Your application was not approved. You cannot schedule an interview at this time.',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Your application must be approved before you can schedule an interview.',
        });
      }
    }

    const appointment = await dbService.createAppointment({
      applicantName: applicant_name,
      applicantEmail: applicant_email || '',
      applicantPhone: applicant_phone,
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      notes: notes || '',
      selectedSong: selected_song || '',
      additionalSong: additional_song || '',
      additionalSongSinger: additional_song_singer || '',
    });

    // Transform the appointment to snake_case
    const transformedAppointment = {
      id: appointment.id,
      applicant_name: appointment.applicantName,
      applicant_email: appointment.applicantEmail,
      applicant_phone: appointment.applicantPhone,
      scheduled_date: appointment.scheduledDate,
      scheduled_time: appointment.scheduledTime,
      status: appointment.status,
      notes: appointment.notes,
      selected_song: appointment.selectedSong,
      additional_song: appointment.additionalSong,
      additional_song_singer: appointment.additionalSongSinger,
      coordinator_verified: appointment.coordinatorVerified,
      coordinator_verified_at: appointment.coordinatorVerifiedAt,
      coordinator_approved: appointment.coordinatorApproved,
      coordinator_approved_at: appointment.coordinatorApprovedAt,
      final_decision: appointment.finalDecision,
      decision_made_at: appointment.decisionMadeAt,
      created_at: appointment.createdAt,
      updated_at: appointment.updatedAt,
    };

    // Mark time slot as unavailable
    if (appointment) {
      const slots = await dbService.getTimeSlots(scheduled_date);
      const slot = slots.find((s) => s.time === scheduled_time);
      if (slot) {
        await dbService.updateTimeSlotAvailability(slot.id, false);
      }
    }

    return res.json({
      success: true,
      appointment_id: transformedAppointment.id,
      message: 'Appointment created successfully',
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    addCorsHeaders(res, req);
    return res.status(500).json({ error: error.message });
  }
});

// Update appointment status
router.put(
  '/appointments/:appointment_id',
  tokenRequired,
  async (req: AuthRequest, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointment_id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      await dbService.updateAppointmentStatus(appointmentId, status);

      return res.json({
        success: true,
        message: 'Appointment status updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      return res.status(500).json({ error: error.message });
    }
  }
);

// Mark attendance
// router.put(
//   '/appointments/:appointment_id/attendance',
//   tokenRequired,
//   roleRequired(['coordinator', 'admin']),
//   async (req: AuthRequest, res: Response) => {
//     try {
//       const appointmentId = parseInt(req.params.appointment_id);
//       const { present } = req.body;

//       await dbService.verifyApplicantCoordinator(appointmentId, present === true);

//       return res.json({ success: true, message: 'Attendance updated' });
//     } catch (error: any) {
//       console.error('Error updating attendance:', error);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//   }
// );

// Approve applicant
router.put(
  '/appointments/:appointment_id/approve',
  tokenRequired,
  roleRequired(['coordinator', 'admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointment_id);
      const { approved } = req.body;

      await dbService.approveApplicantCoordinator(appointmentId, approved === true);

      return res.json({ success: true, message: 'Approval status updated' });
    } catch (error: any) {
      console.error('Error updating approval:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get attendance appointments
// router.get(
//   '/appointments/attendance',
//   tokenRequired,
//   roleRequired(['coordinator', 'admin']),
//   async (req: AuthRequest, res: Response) => {
//     try {
//       const appointments = await dbService.getVerifiedAppointments();
//       return res.json({ success: true, appointments });
//     } catch (error: any) {
//       console.error('Error fetching appointments:', error);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//   }
// );

// Get appointments for evaluation
router.get(
  '/appointments/evaluation',
  tokenRequired,
  roleRequired(['judge', 'admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const appointments = await dbService.getPresentAndApprovedAppointments();
      return res.json({ success: true, appointments });
    } catch (error: any) {
      console.error('Error fetching appointments for evaluation:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Submit evaluation
router.post(
  '/appointments/:appointment_id/evaluation',
  tokenRequired,
  roleRequired(['judge', 'admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointment_id);
      const { judge_name, criteria_name, rating, comments } = req.body;

      if (!judge_name || !criteria_name || rating === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
        return res
          .status(400)
          .json({ success: false, error: 'Rating must be between 0 and 5' });
      }

      await dbService.submitEvaluation(
        appointmentId,
        judge_name,
        criteria_name,
        rating,
        comments || ''
      );

      return res.json({ success: true, message: 'Evaluation submitted successfully' });
    } catch (error: any) {
      console.error('Error submitting evaluation:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get evaluations
router.get(
  '/appointments/:appointment_id/evaluations',
  tokenRequired,
  roleRequired(['judge', 'admin', 'coordinator']),
  async (req: AuthRequest, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointment_id);
      const evaluations = await dbService.getEvaluations(appointmentId);
      const averages = await dbService.getEvaluationAverages(appointmentId);

      return res.json({
        success: true,
        evaluations,
        averages,
      });
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Set final decision
router.put(
  '/appointments/:appointment_id/decision',
  tokenRequired,
  async (req: AuthRequest, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointment_id);
      const { decision } = req.body;

      if (!['accepted', 'rejected'].includes(decision)) {
        return res
          .status(400)
          .json({ success: false, error: 'Decision must be "accepted" or "rejected"' });
      }

      await dbService.setFinalDecision(appointmentId, decision);

      return res.json({ success: true, message: `Applicant marked as ${decision}` });
    } catch (error: any) {
      console.error('Error setting final decision:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Verify applicant (PUBLIC)
router.post('/verify-applicant', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      addCorsHeaders(res, req);
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      addCorsHeaders(res, req);
      return res.status(400).json({ success: false, is_applicant: false, error: 'Phone number too short' });
    }

    const last8Digits = digitsOnly.slice(-8);
    const submissions = await dbService.getAllSubmissions({});

    let isApplicant = false;
    let applicantName: string | null = null;

    for (const submission of submissions) {
      const subDigits = submission.phone.replace(/\D/g, '');
      if (subDigits.length >= 8 && subDigits.slice(-8) === last8Digits) {
        isApplicant = true;
        applicantName = submission.name;
        break;
      }
    }

    addCorsHeaders(res, req);
    return res.json({
      success: true,
      is_applicant: isApplicant,
      applicant_name: applicantName,
    });
  } catch (error: any) {
    console.error('Error verifying applicant:', error);
    addCorsHeaders(res, req);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Check existing appointment (PUBLIC)
router.post('/appointments/check', async (req: Request, res: Response) => {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      addCorsHeaders(res, req);
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const appointments = await dbService.getAppointmentsByPhone(phone);
    // Appointments are already transformed to snake_case
    const activeAppointments = appointments.filter(
      (apt) => apt.status.toLowerCase() === 'scheduled'
    );

    addCorsHeaders(res, req);
    return res.json({
      success: true,
      has_existing_appointment: activeAppointments.length > 0,
      appointments: activeAppointments.length > 0 ? activeAppointments : [],
    });
  } catch (error: any) {
    console.error('Error checking existing appointment:', error);
    addCorsHeaders(res, req);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Applicant status route moved to applicant.routes.ts

export default router;

