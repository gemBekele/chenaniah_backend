import prisma from '../db';
import { Prisma } from '@prisma/client';

export class AttendanceService {
  /**
   * Generate or retrieve QR code for a student
   */
  async getOrGenerateQRCode(studentId: number): Promise<string> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, qrCode: true },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // If QR code already exists, return it
    if (student.qrCode) {
      return student.qrCode;
    }

    // Generate new QR code: format is "STUDENT-{studentId}-{timestamp}"
    const qrCode = `STUDENT-${studentId}-${Date.now()}`;

    // Update student with QR code
    await prisma.student.update({
      where: { id: studentId },
      data: { qrCode },
    });

    return qrCode;
  }

  /**
   * Create a new session
   */
  async createSession(data: {
    name: string;
    date: Date;
    location?: string;
    facilitatorId?: string;
  }) {
    return prisma.session.create({
      data: {
        name: data.name,
        date: data.date,
        location: data.location,
        facilitatorId: data.facilitatorId,
        status: 'active',
      },
    });
  }

  /**
   * Get all sessions
   */
  async getSessions(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.SessionWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    return prisma.session.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                fullNameEnglish: true,
                fullNameAmharic: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: number) {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                fullNameEnglish: true,
                fullNameAmharic: true,
                username: true,
                qrCode: true,
              },
            },
          },
          orderBy: { scannedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Record attendance by scanning QR code
   */
  async recordAttendance(data: {
    sessionId: number;
    qrCode: string;
    scannedAt?: Date;
    isOffline?: boolean;
  }) {
    // Find student by QR code
    const student = await prisma.student.findUnique({
      where: { qrCode: data.qrCode },
    });

    if (!student) {
      throw new Error('Invalid QR code: Student not found');
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Check if attendance already recorded
    const existing = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: data.sessionId,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      // Update existing record if it was offline and now syncing
      if (existing.isOffline && !data.isOffline) {
        return prisma.attendance.update({
          where: { id: existing.id },
          data: {
            isOffline: false,
            syncedAt: new Date(),
            scannedAt: data.scannedAt || new Date(),
          },
        });
      }
      throw new Error('Attendance already recorded for this session');
    }

    // Create new attendance record
    return prisma.attendance.create({
      data: {
        sessionId: data.sessionId,
        studentId: student.id,
        scannedAt: data.scannedAt || new Date(),
        isOffline: data.isOffline || false,
        syncedAt: data.isOffline ? null : new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            fullNameEnglish: true,
            fullNameAmharic: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Sync multiple offline attendance records
   */
  async syncOfflineRecords(records: Array<{
    sessionId: number;
    qrCode: string;
    scannedAt: string; // ISO string
  }>) {
    const results = [];
    const errors = [];
    const alreadyRecorded = [];

    for (const record of records) {
      try {
        const attendance = await this.recordAttendance({
          sessionId: record.sessionId,
          qrCode: record.qrCode,
          scannedAt: new Date(record.scannedAt),
          isOffline: false, // Mark as synced
        });
        results.push(attendance);
      } catch (error: any) {
        // If attendance is already recorded, treat it as success
        // since the record exists in the database
        if (error.message.includes('already recorded')) {
          // Find the existing attendance record
          const student = await prisma.student.findUnique({
            where: { qrCode: record.qrCode },
          });
          
          if (student) {
            const existing = await prisma.attendance.findUnique({
              where: {
                sessionId_studentId: {
                  sessionId: record.sessionId,
                  studentId: student.id,
                },
              },
              include: {
                student: {
                  select: {
                    id: true,
                    fullNameEnglish: true,
                    fullNameAmharic: true,
                    username: true,
                  },
                },
              },
            });
            
            if (existing) {
              // Update offline record to synced if it was offline
              if (existing.isOffline) {
                await prisma.attendance.update({
                  where: { id: existing.id },
                  data: {
                    isOffline: false,
                    syncedAt: new Date(),
                  },
                });
              }
              results.push(existing);
              alreadyRecorded.push({
                qrCode: record.qrCode,
                message: 'Attendance already recorded',
              });
              continue;
            }
          }
        }
        
        errors.push({
          qrCode: record.qrCode,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
      alreadyRecorded,
    };
  }

  /**
   * Get attendance statistics for a session
   */
  async getSessionStats(sessionId: number) {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const totalStudents = await prisma.student.count({
      where: { status: 'active' },
    });

    const attendanceCount = session.attendanceRecords.length;
    const offlineCount = session.attendanceRecords.filter(
      (r) => r.isOffline
    ).length;

    return {
      sessionId,
      sessionName: session.name,
      totalStudents,
      attendanceCount,
      offlineCount,
      attendanceRate: totalStudents > 0 ? (attendanceCount / totalStudents) * 100 : 0,
    };
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: number, status: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { status, updatedAt: new Date() },
    });
  }
}

export const attendanceService = new AttendanceService();

