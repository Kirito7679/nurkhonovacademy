import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createCuratorSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(1, 'Телефон обязателен'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').optional(),
});

// Создать куратора (только админ)
export const createCurator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может создавать кураторов
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может создавать кураторов', 403);
    }

    const validatedData = createCuratorSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким номером телефона уже существует', 400);
    }

    // Generate default password if not provided
    const password = validatedData.password || '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create curator
    const curator = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'CURATOR',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: curator,
      message: 'Куратор успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

// Получить список кураторов (только админ)
export const getAllCurators = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только админ может просматривать список кураторов
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Только администратор может просматривать список кураторов', 403);
    }

    const { search } = req.query;

    const where: any = {
      role: 'CURATOR',
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const curators = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    res.json({
      success: true,
      data: curators,
    });
  } catch (error) {
    next(error);
  }
};


