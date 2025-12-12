import prisma from '../db';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export class AssignmentService {
  async createAssignment(data: {
    title: string;
    description?: string;
    dueDate?: Date;
    sessionId?: number;
  }) {
    return prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate || new Date(),
        sessionId: data.sessionId,
      },
    });
  }

  async getAllAssignments() {
    return prisma.assignment.findMany({
      include: {
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getAssignmentById(id: number) {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                fullNameEnglish: true,
                fullNameAmharic: true,
              },
            },
          },
        },
      },
    });
  }

  async getStudentAssignments(studentId: number) {
    const assignments = await prisma.assignment.findMany({
      include: {
        session: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId },
    });

    // Map submissions to assignments
    return assignments.map((assignment) => {
      const submission = submissions.find((s) => s.assignmentId === assignment.id);
      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        status: submission ? (submission.grade !== null ? 'graded' : 'submitted') : 'pending',
        submittedAt: submission?.submittedAt,
        grade: submission?.grade,
        feedback: submission?.feedback,
        session: assignment.session,
      };
    });
  }

  async getOrCreateSessionAssignment(sessionId: number) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const existing = await prisma.assignment.findFirst({
      where: { sessionId },
    });

    if (existing) {
      return existing;
    }

    return prisma.assignment.create({
      data: {
        title: session.name ? `${session.name} Assignment` : `Session ${session.id} Assignment`,
        description: 'Auto-created from student upload',
        dueDate: session.date,
        sessionId: session.id,
      },
    });
  }

  async submitAssignment(data: {
    studentId: number;
    assignmentId: number;
    filePaths?: string[];
    text?: string;
  }) {
    // Check if already submitted
    const existing = await prisma.assignmentSubmission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId: data.studentId,
          assignmentId: data.assignmentId,
        },
      },
    });

    if (existing) {
      // Update existing submission
      return prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          filePaths: data.filePaths || existing.filePaths,
          text: data.text || existing.text,
          submittedAt: new Date(),
        },
      });
    }

    // Create new submission
    return prisma.assignmentSubmission.create({
      data: {
        studentId: data.studentId,
        assignmentId: data.assignmentId,
        filePaths: data.filePaths || [],
        text: data.text,
      },
    });
  }

  async gradeAssignment(
    submissionId: number,
    data: {
      grade: number;
      feedback?: string;
      gradedBy: string;
    }
  ) {
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: data.grade,
        feedback: data.feedback,
        gradedAt: new Date(),
        gradedBy: data.gradedBy,
      },
    });
  }

  async saveSubmissionFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'assignments');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const savedPaths: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `assignment-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, file.buffer);
      savedPaths.push(`uploads/assignments/${filename}`);
    }

    return savedPaths;
  }
}

export const assignmentService = new AssignmentService();









