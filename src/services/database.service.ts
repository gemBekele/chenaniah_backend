import prisma from '../db';
import { Prisma } from '@prisma/client';
import { transformAppointments, transformAppointment, transformEvaluations } from '../utils/transform';

export class DatabaseService {
  // Submissions
  async getAllSubmissions(params: {
    status?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, searchQuery, limit = 10000, offset = 0 } = params;

    const where: Prisma.SubmissionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
        { church: { contains: searchQuery, mode: 'insensitive' } },
        { address: { contains: searchQuery, mode: 'insensitive' } },
        { telegramUsername: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    return prisma.submission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getSubmissionCount(params: { status?: string; searchQuery?: string }) {
    const { status, searchQuery } = params;

    const where: Prisma.SubmissionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
        { church: { contains: searchQuery, mode: 'insensitive' } },
        { address: { contains: searchQuery, mode: 'insensitive' } },
        { telegramUsername: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    return prisma.submission.count({ where });
  }

  async getSubmissionById(id: number) {
    return prisma.submission.findUnique({ where: { id } });
  }

  async updateSubmissionStatus(
    id: number,
    status: string,
    reviewerComments?: string,
    reviewedBy?: string
  ) {
    return prisma.submission.update({
      where: { id },
      data: {
        status,
        reviewerComments,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async getSubmissionStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'pending' } }),
      prisma.submission.count({ where: { status: 'approved' } }),
      prisma.submission.count({ where: { status: 'rejected' } }),
    ]);

    return { total, pending, approved, rejected };
  }

  // Settings
  async getRegistrationStatus(): Promise<boolean> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'registration_open' },
    });
    return setting?.value.toLowerCase() === 'true';
  }

  async setRegistrationStatus(isOpen: boolean) {
    return prisma.setting.upsert({
      where: { key: 'registration_open' },
      update: { value: isOpen ? 'true' : 'false' },
      create: { key: 'registration_open', value: isOpen ? 'true' : 'false' },
    });
  }

  // Scheduling - Time Slots
  async getTimeSlots(date?: string) {
    if (date) {
      return prisma.timeSlot.findMany({
        where: { date },
        orderBy: { time: 'asc' },
      });
    }
    return prisma.timeSlot.findMany({
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    });
  }

  async createTimeSlot(time: string, date: string, location?: string) {
    // Check if slot already exists
    const existing = await prisma.timeSlot.findFirst({
      where: { time, date },
    });

    if (existing) {
      return null; // Slot already exists
    }

    // Create time label from time
    const [hours, minutes] = time.split(':').map(Number);
    const timeObj = new Date();
    timeObj.setHours(hours, minutes);
    const label = timeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Determine period
    let period: string | null = null;
    if (hours >= 9 && hours < 14) {
      period = 'morning';
    } else if (hours >= 14 && hours <= 17) {
      period = 'afternoon';
    }

    return prisma.timeSlot.create({
      data: {
        time,
        label,
        date,
        available: true,
        period,
        location: location || null,
      },
    });
  }

  async updateTimeSlotAvailability(id: number, available: boolean) {
    return prisma.timeSlot.update({
      where: { id },
      data: { available },
    });
  }

  // Scheduling - Appointments
  async getAppointments(searchQuery?: string) {
    const where: Prisma.AppointmentWhereInput = {};

    if (searchQuery) {
      where.OR = [
        { applicantName: { contains: searchQuery, mode: 'insensitive' } },
        { applicantPhone: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
    });

    return transformAppointments(appointments);
  }

  async getAppointmentsByPhone(phone: string) {
    // Extract last 8 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return [];
    }

    const last8Digits = digitsOnly.slice(-8);
    const pattern = `%${last8Digits.split('').join('%')}%`;

    // Get all appointments and filter
    const appointments = await prisma.appointment.findMany({
      orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
    });

    const filtered = appointments.filter((apt) => {
      const aptDigits = apt.applicantPhone.replace(/\D/g, '');
      return aptDigits.length >= 8 && aptDigits.slice(-8) === last8Digits;
    });

    return transformAppointments(filtered);
  }

  async createAppointment(data: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    scheduledDate: string;
    scheduledTime: string;
    notes?: string;
    selectedSong?: string;
    additionalSong?: string;
    additionalSongSinger?: string;
  }) {
    return prisma.appointment.create({
      data: {
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        applicantPhone: data.applicantPhone,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        status: 'scheduled',
        notes: data.notes || null,
        selectedSong: data.selectedSong || null,
        additionalSong: data.additionalSong || null,
        additionalSongSinger: data.additionalSongSinger || null,
      },
    });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const updateData: any = { status };

    // Sync final_decision with status
    if (status === 'completed') {
      updateData.finalDecision = 'accepted';
      updateData.decisionMadeAt = new Date();
    } else if (status === 'no_show') {
      updateData.finalDecision = 'rejected';
      updateData.decisionMadeAt = new Date();
    }

    return prisma.appointment.update({
      where: { id },
      data: updateData,
    });
  }

  async getScheduleStats() {
    const [total, scheduled, cancelled, appointments] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'scheduled' } }),
      prisma.appointment.count({ where: { status: 'cancelled' } }),
      prisma.appointment.findMany({
        select: { finalDecision: true, status: true },
      }),
    ]);

    let accepted = 0;
    let rejected = 0;

    appointments.forEach((apt) => {
      if (apt.finalDecision === 'accepted' || (!apt.finalDecision && apt.status === 'completed')) {
        accepted++;
      } else if (apt.finalDecision === 'rejected' || (!apt.finalDecision && apt.status === 'no_show')) {
        rejected++;
      }
    });

    return {
      totalAppointments: total,
      scheduled,
      accepted,
      rejected,
      cancelled,
    };
  }

  async verifyApplicantCoordinator(id: number, verified: boolean) {
    return prisma.appointment.update({
      where: { id },
      data: {
        coordinatorVerified: verified,
        coordinatorVerifiedAt: verified ? new Date() : null,
      },
    });
  }

  async approveApplicantCoordinator(id: number, approved: boolean) {
    return prisma.appointment.update({
      where: { id },
      data: {
        coordinatorApproved: approved,
        coordinatorApprovedAt: approved ? new Date() : null,
      },
    });
  }

  async getVerifiedAppointments() {
    const appointments = await prisma.appointment.findMany({
      where: { coordinatorVerified: true },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });
    return transformAppointments(appointments);
  }

  async getPresentAndApprovedAppointments() {
    const appointments = await prisma.appointment.findMany({
      where: {
        coordinatorVerified: true,
        coordinatorApproved: true,
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });
    return transformAppointments(appointments);
  }

  async setFinalDecision(id: number, decision: string) {
    return prisma.appointment.update({
      where: { id },
      data: {
        finalDecision: decision,
        decisionMadeAt: new Date(),
      },
    });
  }

  // Evaluations
  async submitEvaluation(
    appointmentId: number,
    judgeName: string,
    criteriaName: string,
    rating: number,
    comments?: string
  ) {
    return prisma.interviewEvaluation.upsert({
      where: {
        appointmentId_judgeName_criteriaName: {
          appointmentId,
          judgeName,
          criteriaName,
        },
      },
      update: {
        rating,
        comments: comments || null,
      },
      create: {
        appointmentId,
        judgeName,
        criteriaName,
        rating,
        comments: comments || null,
      },
    });
  }

  async getEvaluations(appointmentId: number) {
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { appointmentId },
      orderBy: [{ judgeName: 'asc' }, { criteriaName: 'asc' }],
    });
    return transformEvaluations(evaluations);
  }

  async getEvaluationAverages(appointmentId: number) {
    const evaluations = await this.getEvaluations(appointmentId);
    const criteriaRatings: Record<string, number[]> = {};

    evaluations.forEach((eval_) => {
      if (!criteriaRatings[eval_.criteriaName]) {
        criteriaRatings[eval_.criteriaName] = [];
      }
      criteriaRatings[eval_.criteriaName].push(eval_.rating);
    });

    const averages: Record<string, number> = {};
    Object.keys(criteriaRatings).forEach((criteria) => {
      const ratings = criteriaRatings[criteria];
      if (ratings.length > 0) {
        averages[criteria] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    });

    return averages;
  }
}

export const dbService = new DatabaseService();

