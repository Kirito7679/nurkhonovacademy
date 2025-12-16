import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { updateStudentSchema, resetPasswordSchema } from '../utils/validation';
import { generateSecurePassword } from '../utils/passwordGenerator';

const createTeacherSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(1, 'Телефон обязателен'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').optional(),
});

const updateTeacherSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная').optional(),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  isPaidTeacher: z.boolean().optional(),
});

// Создать учителя (только админ)
export const createCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может создавать учителей
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может создавать учителей', 403);
    }

    const validatedData = createTeacherSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким номером телефона уже существует', 400);
    }

    // Generate secure random password if not provided
    // Security: Never use weak default passwords
    const password = validatedData.password || generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'TEACHER',
        isPaidTeacher: true, // Учителя, созданные админом, автоматически получают оплаченную регистрацию
        createdBy: req.user!.id, // Track who created this teacher
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        isPaidTeacher: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: teacher,
      message: 'Учитель успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

// Получить список учителей (только админ)
export const getAllCurators = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может просматривать список учителей
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может просматривать список учителей', 403);
    }

    const { search } = req.query;

    const where: any = {
      role: 'TEACHER',
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const teachers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        isPaidTeacher: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            coursesAsTeacher: true,
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

// Получить учителя по ID (только админ)
export const getCuratorById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может просматривать детали учителя
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может просматривать детали учителя', 403);
    }

    const { id } = req.params;

    const teacher = await prisma.user.findUnique({
      where: { id, role: 'TEACHER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        isPaidTeacher: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        coursesAsTeacher: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            coursesAsTeacher: true,
            createdUsers: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new AppError('Учитель не найден', 404);
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

// Обновить учителя (только админ)
export const updateCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может обновлять учителей
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может обновлять учителей', 403);
    }

    const { id } = req.params;
    const validatedData = updateTeacherSchema.parse(req.body);

    const teacher = await prisma.user.findUnique({
      where: { id, role: 'TEACHER' },
    });

    if (!teacher) {
      throw new AppError('Учитель не найден', 404);
    }

    // Check if phone is being changed and if it's already taken
    if (validatedData.phone && validatedData.phone !== teacher.phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone: validatedData.phone },
      });

      if (existingUser) {
        throw new AppError('Номер телефона уже используется', 400);
      }
    }

    const updateData: any = {};
    if (validatedData.firstName !== undefined && validatedData.firstName !== '') {
      updateData.firstName = validatedData.firstName;
    }
    if (validatedData.lastName !== undefined && validatedData.lastName !== '') {
      updateData.lastName = validatedData.lastName;
    }
    if (validatedData.phone !== undefined && validatedData.phone !== '') {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email || null;
    }
    if (validatedData.isPaidTeacher !== undefined) {
      updateData.isPaidTeacher = validatedData.isPaidTeacher;
    }

    // If no data to update, return current teacher
    if (Object.keys(updateData).length === 0) {
      const currentTeacher = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          isPaidTeacher: true,
          updatedAt: true,
        },
      });
      return res.json({
        success: true,
        data: currentTeacher,
      });
    }

    const updatedTeacher = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isPaidTeacher: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedTeacher,
    });
  } catch (error) {
    next(error);
  }
};

// Сбросить пароль учителя (только админ)
export const resetCuratorPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может сбрасывать пароль учителя
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может сбрасывать пароль учителя', 403);
    }

    const { id } = req.params;
    const validatedData = resetPasswordSchema.parse(req.body);

    const teacher = await prisma.user.findUnique({
      where: { id, role: 'TEACHER' },
    });

    if (!teacher) {
      throw new AppError('Учитель не найден', 404);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error) {
    next(error);
  }
};

// Удалить учителя (только админ)
export const deleteCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может удалять учителей
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может удалять учителей', 403);
    }

    const { id } = req.params;

    const teacher = await prisma.user.findUnique({
      where: { id, role: 'TEACHER' },
    });

    if (!teacher) {
      throw new AppError('Учитель не найден', 404);
    }

    // Delete teacher (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Учитель успешно удален',
    });
  } catch (error) {
    next(error);
  }
};


