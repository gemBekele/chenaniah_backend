import { Router, Request, Response } from 'express';
import { dbService } from '../services/database.service';

const router = Router();

// Helper to add CORS headers
const addCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '3600');
};

// Get applicant status (PUBLIC)
router.post('/status', async (req: Request, res: Response) => {
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
      return res.status(400).json({ success: false, error: 'Phone number too short' });
    }

    const last8Digits = digitsOnly.slice(-8);

    const [submissions, appointments] = await Promise.all([
      dbService.getAllSubmissions({}),
      dbService.getAppointmentsByPhone(phone),
    ]);

    let submission = null;
    for (const sub of submissions) {
      const subDigits = sub.phone.replace(/\D/g, '');
      if (subDigits.length >= 8 && subDigits.slice(-8) === last8Digits) {
        submission = sub;
        break;
      }
    }

    // Find appointment with final decision
    let finalDecision: string | null = null;
    let decisionMadeAt: Date | null = null;
    let appointmentDate: string | null = null;
    let appointmentTime: string | null = null;
    let appointmentStatus: string | null = null;
    let applicantNameFromAppointment: string | null = null;

    for (const apt of appointments) {
      // Appointments are already transformed to snake_case by database service
      const decision = apt.final_decision;
      const status = apt.status;

      // Store applicant name from appointment
      if (apt.applicant_name && !applicantNameFromAppointment) {
        applicantNameFromAppointment = apt.applicant_name;
      }

      if (!decision) {
        if (status === 'completed') {
          finalDecision = 'accepted';
        } else if (status === 'no_show') {
          finalDecision = 'rejected';
        }
      } else {
        finalDecision = decision;
      }

      if (finalDecision) {
        decisionMadeAt = apt.decision_made_at;
        appointmentDate = apt.scheduled_date;
        appointmentTime = apt.scheduled_time;
        appointmentStatus = status;
        break;
      } else if (status && !appointmentStatus) {
        appointmentStatus = status;
        appointmentDate = apt.scheduled_date;
        appointmentTime = apt.scheduled_time;
      }
    }

    // If no submission found, but we have an appointment, still return the appointment data
    if (!submission && appointments.length === 0) {
      addCorsHeaders(res, req);
      return res.json({
        success: true,
        is_applicant: false,
        message: 'Phone number not found in our system',
      });
    }

    // If we have an appointment but no submission, use appointment data
    if (!submission && appointments.length > 0) {
      // Determine overall status based on appointment
      let overallStatus: string;
      let statusMessage: string;

      if (finalDecision) {
        if (finalDecision.toLowerCase() === 'accepted') {
          overallStatus = 'accepted';
          statusMessage = 'Congratulations! You have been accepted.';
        } else {
          overallStatus = 'rejected';
          statusMessage = 'Unfortunately, your application was not approved at this time.';
        }
      } else if (appointmentStatus === 'scheduled') {
        overallStatus = 'approved';
        statusMessage = 'Your interview has been scheduled.';
      } else {
        overallStatus = 'pending';
        statusMessage = 'Your application is still under review. Please check back later.';
      }

      addCorsHeaders(res, req);
      return res.json({
        success: true,
        is_applicant: true,
        applicant_name: applicantNameFromAppointment || 'Applicant',
        submission_status: null,
        final_decision: finalDecision,
        overall_status: overallStatus,
        status_message: statusMessage,
        decision_made_at: decisionMadeAt,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        submitted_at: null,
        reviewer_comments: null,
      });
    }

    // At this point, submission must exist (we've already handled the case where it doesn't)
    if (!submission) {
      addCorsHeaders(res, req);
      return res.json({
        success: true,
        is_applicant: false,
        message: 'Phone number not found in our system',
      });
    }

    // Determine overall status
    let overallStatus: string;
    let statusMessage: string;

    if (finalDecision) {
      if (finalDecision.toLowerCase() === 'accepted') {
        overallStatus = 'accepted';
        statusMessage = 'Congratulations! You have been accepted.';
      } else {
        overallStatus = 'rejected';
        statusMessage = 'Unfortunately, your application was not approved at this time.';
      }
    } else if (submission.status === 'approved') {
      overallStatus = 'approved';
      statusMessage =
        'Your application has been approved. Interview scheduling will be available soon.';
    } else if (submission.status === 'rejected') {
      overallStatus = 'rejected';
      statusMessage = 'Your application was not approved at this time.';
    } else {
      overallStatus = 'pending';
      statusMessage = 'Your application is still under review. Please check back later.';
    }

    addCorsHeaders(res, req);
    return res.json({
      success: true,
      is_applicant: true,
      applicant_name: submission.name,
      submission_status: submission.status,
      final_decision: finalDecision,
      overall_status: overallStatus,
      status_message: statusMessage,
      decision_made_at: decisionMadeAt,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      submitted_at: submission.submittedAt,
      reviewer_comments: submission.reviewerComments,
    });
  } catch (error: any) {
    console.error('Error getting applicant status:', error);
    addCorsHeaders(res, req);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

