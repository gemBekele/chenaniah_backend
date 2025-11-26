import prisma from '../db';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export class StudentService {
  async createStudent(data: {
    username: string;
    password: string;
    fullNameAmharic?: string;
    fullNameEnglish?: string;
    localChurch?: string;
    address?: string;
    phone: string;
    appointmentId?: number;
  }) {
    // Check if username or phone already exists
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { username: data.username },
          { phone: data.phone },
        ],
      },
    });

    if (existing) {
      throw new Error('Username or phone number already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.student.create({
      data: {
        username: data.username,
        passwordHash,
        fullNameAmharic: data.fullNameAmharic,
        fullNameEnglish: data.fullNameEnglish,
        localChurch: data.localChurch,
        address: data.address,
        phone: data.phone,
        appointmentId: data.appointmentId,
      },
    });
  }

  async authenticateStudent(username: string, password: string) {
    const student = await prisma.student.findUnique({
      where: { username },
    });

    if (!student) {
      return null;
    }

    const isValid = await bcrypt.compare(password, student.passwordHash);
    if (!isValid) {
      return null;
    }

    // Remove password hash from response
    const { passwordHash, ...studentWithoutPassword } = student;
    return studentWithoutPassword;
  }

  async getStudentById(id: number) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        appointment: true,
      },
    });

    if (!student) {
      return null;
    }

    const { passwordHash, ...studentWithoutPassword } = student;
    return studentWithoutPassword;
  }

  async getStudentByUsername(username: string) {
    const student = await prisma.student.findUnique({
      where: { username },
    });

    if (!student) {
      return null;
    }

    const { passwordHash, ...studentWithoutPassword } = student;
    return studentWithoutPassword;
  }

  async updateStudentProfile(
    id: number,
    data: {
      fullNameAmharic?: string;
      fullNameEnglish?: string;
      idDocumentPath?: string;
      recommendationLetterPath?: string;
      essay?: string;
    }
  ) {
    // Check if profile is complete
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new Error('Student not found');
    }

    // Merge existing data with new data to check completeness
    const fullNameAmharic = data.fullNameAmharic ?? student.fullNameAmharic;
    const fullNameEnglish = data.fullNameEnglish ?? student.fullNameEnglish;
    const idDocumentPath = data.idDocumentPath ?? student.idDocumentPath;
    const recommendationLetterPath = data.recommendationLetterPath ?? student.recommendationLetterPath;
    const essay = data.essay ?? student.essay;

    const profileComplete =
      !!fullNameAmharic &&
      !!fullNameEnglish &&
      !!idDocumentPath &&
      !!recommendationLetterPath &&
      !!essay;

    return prisma.student.update({
      where: { id },
      data: {
        ...data,
        profileComplete,
      },
    });
  }

  async getAllStudents(params: {
    status?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, searchQuery, limit = 100, offset = 0 } = params;

    const where: Prisma.StudentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (searchQuery) {
      where.OR = [
        { fullNameEnglish: { contains: searchQuery, mode: 'insensitive' } },
        { fullNameAmharic: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
        { username: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          appointment: {
            select: {
              id: true,
              applicantName: true,
              scheduledDate: true,
              scheduledTime: true,
              finalDecision: true,
            },
          },
          _count: {
            select: {
              assignmentSubmissions: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.student.count({ where }),
    ]);

    // Remove password hashes
    const studentsWithoutPasswords = students.map(({ passwordHash, ...student }) => student);

    return {
      students: studentsWithoutPasswords,
      total,
    };
  }

  async getStudentStats(studentId: number) {
    const [assignments, payments, student] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: {
          assignment: true,
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { studentId },
        orderBy: { month: 'desc' },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
      }),
    ]);

    if (!student) {
      throw new Error('Student not found');
    }

    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter((a) => a.submittedAt).length;
    const gradedAssignments = assignments.filter((a) => a.grade !== null).length;
    const averageGrade =
      gradedAssignments > 0
        ? assignments
            .filter((a) => a.grade !== null)
            .reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments
        : null;

    const totalPayments = payments.length;
    const paidPayments = payments.filter((p) => p.status === 'paid').length;
    const pendingPayments = payments.filter((p) => p.status === 'pending').length;
    const overduePayments = payments.filter((p) => p.status === 'overdue').length;

    return {
      student: {
        id: student.id,
        username: student.username,
        fullNameEnglish: student.fullNameEnglish,
        fullNameAmharic: student.fullNameAmharic,
        phone: student.phone,
        status: student.status,
        profileComplete: student.profileComplete,
        createdAt: student.createdAt,
      },
      assignments: {
        total: totalAssignments,
        submitted: submittedAssignments,
        graded: gradedAssignments,
        averageGrade,
        submissions: assignments,
      },
      payments: {
        total: totalPayments,
        paid: paidPayments,
        pending: pendingPayments,
        overdue: overduePayments,
        records: payments,
      },
    };
  }

  async saveUploadedFile(file: Express.Multer.File, type: 'id' | 'recommendation'): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'student-documents');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    // Return relative path
    return `uploads/student-documents/${filename}`;
  }
}

export const studentService = new StudentService();


