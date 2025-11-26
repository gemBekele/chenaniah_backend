import prisma from '../db';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export class PaymentService {
  async createPayment(data: {
    studentId: number;
    amount: number;
    month: string; // Format: "YYYY-MM"
    notes?: string;
    depositSlipPath?: string;
  }) {
    // Check if payment already exists for this month
    const existing = await prisma.payment.findUnique({
      where: {
        studentId_month: {
          studentId: data.studentId,
          month: data.month,
        },
      },
    });

    if (existing) {
      throw new Error('Payment for this month already exists');
    }

    return prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        month: data.month,
        notes: data.notes,
        depositSlipPath: data.depositSlipPath,
        status: 'pending',
      },
    });
  }

  async saveDepositSlip(file: Express.Multer.File): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'payments');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `deposit-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    return `uploads/payments/${filename}`;
  }

  async getStudentPayments(studentId: number) {
    return prisma.payment.findMany({
      where: { studentId },
      orderBy: { month: 'desc' },
    });
  }

  async getAllPayments(params: {
    studentId?: number;
    month?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { studentId, month, status, limit = 100, offset = 0 } = params;

    const where: Prisma.PaymentWhereInput = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (month) {
      where.month = month;
    }

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              username: true,
              fullNameEnglish: true,
              fullNameAmharic: true,
              phone: true,
            },
          },
        },
        orderBy: { month: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
    };
  }

  async updatePaymentStatus(
    id: number,
    data: {
      status: 'pending' | 'paid' | 'overdue';
      notes?: string;
    }
  ) {
    const updateData: any = {
      status: data.status,
      notes: data.notes,
    };

    if (data.status === 'paid') {
      updateData.paidAt = new Date();
    }

    return prisma.payment.update({
      where: { id },
      data: updateData,
    });
  }

  async generateMonthlyPayments(month: string, amount: number) {
    // Get all active students
    const students = await prisma.student.findMany({
      where: { status: 'active' },
    });

    const payments = [];

    for (const student of students) {
      // Check if payment already exists
      const existing = await prisma.payment.findUnique({
        where: {
          studentId_month: {
            studentId: student.id,
            month: month,
          },
        },
      });

      if (!existing) {
        const payment = await prisma.payment.create({
          data: {
            studentId: student.id,
            amount: amount,
            month: month,
            status: 'pending',
          },
        });
        payments.push(payment);
      }
    }

    return payments;
  }
}

export const paymentService = new PaymentService();


