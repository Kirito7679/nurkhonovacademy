import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const processTeacherPaymentSchema = z.object({
  paymentMethod: z.enum(['CARD', 'PAYPAL', 'OTHER']).default('CARD'),
  amount: z.number().min(0),
  transactionId: z.string().optional(),
});

// Process teacher registration payment
export const processTeacherPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      throw new AppError('Только учителя могут оплачивать регистрацию', 403);
    }

    if (req.user!.isPaidTeacher) {
      throw new AppError('Регистрация уже оплачена', 400);
    }

    const validatedData = processTeacherPaymentSchema.parse(req.body);

    // In a real implementation, you would:
    // 1. Verify payment with payment gateway (Stripe, PayPal, etc.)
    // 2. Create payment record
    // 3. Update user's isPaidTeacher status

    // For now, we'll simulate payment processing
    // TODO: Integrate with actual payment gateway

    // Update user to paid teacher
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        isPaidTeacher: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isPaidTeacher: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Регистрация учителя успешно оплачена',
    });
  } catch (error) {
    next(error);
  }
};

// Get payment status
export const getPaymentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'TEACHER') {
      throw new AppError('Только учителя могут проверять статус оплаты', 403);
    }

    res.json({
      success: true,
      data: {
        isPaidTeacher: req.user!.isPaidTeacher || false,
        needsPayment: !req.user!.isPaidTeacher,
      },
    });
  } catch (error) {
    next(error);
  }
};
