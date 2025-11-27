import prisma from '../db';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export class AssignmentService {
  async createAssignment(data: {
    title: string;
    description?: string;
    dueDate: Date;
  }) {
    return prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      },
    });
  }

  async getAllAssignments() {
    return prisma.assignment.findMany({
      include: {
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
      };
    });
  }

  async submitAssignment(data: {
    studentId: number;
    assignmentId: number;
    filePath?: string;
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
          filePath: data.filePath || existing.filePath,
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
        filePath: data.filePath,
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

  async saveSubmissionFile(file: Express.Multer.File): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'assignments');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `assignment-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    return `uploads/assignments/${filename}`;
  }
}

export const assignmentService = new AssignmentService();







