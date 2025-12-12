import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/auth';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../utils/validation';
import { upload } from './fileController';
import { deleteFile, getFilePath } from '../services/fileService';

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким номером телефона уже существует', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        password: hashedPassword,
        role: 'STUDENT',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        avatarUrl: true,
        role: true,
        language: true,
        createdAt: true,
      },
    });

    // Generate token
    // @ts-expect-error - jwt.sign has complex overloads that TypeScript can't infer correctly
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (!user) {
      throw new AppError('Неверный номер телефона или пароль', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError('Неверный номер телефона или пароль', 401);
    }

    // Generate token
    // @ts-expect-error - jwt.sign has complex overloads that TypeScript can't infer correctly
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          language: user.language,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        avatarUrl: true,
        role: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    const userId = req.user.id;

    // Get all courses with access
    const studentCourses = await prisma.studentCourse.findMany({
      where: {
        studentId: userId,
        status: 'APPROVED',
      },
      include: {
        course: {
          include: {
            lessons: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // Get all progress
    const progress = await prisma.studentProgress.findMany({
      where: {
        studentId: userId,
      },
    });

    // Calculate statistics
    const totalCourses = studentCourses.length;
    const totalLessons = studentCourses.reduce(
      (sum, sc) => sum + (sc.course?.lessons?.length || 0),
      0
    );
    const completedLessons = progress.filter((p) => p.completed).length;
    const inProgressLessons = progress.filter((p) => !p.completed).length;
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    // Get recent activity (last 5 completed lessons)
    // For SQLite compatibility, we'll sort by watchedAt and filter by completed
    const allCompletedProgress = await prisma.studentProgress.findMany({
      where: {
        studentId: userId,
        completed: true,
      },
      include: {
        lesson: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Sort by watchedAt (if exists), then take top 5
    const recentActivity = allCompletedProgress
      .sort((a, b) => {
        const aDate = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
        const bDate = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
        return bDate - aDate; // Descending order
      })
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        totalCourses,
        totalLessons,
        completedLessons,
        inProgressLessons,
        overallProgress,
        recentActivity: recentActivity
          .filter((activity) => activity.lesson) // Filter out activities without lessons
          .map((activity) => ({
            id: activity.id,
            completed: activity.completed,
            watchedAt: activity.watchedAt,
            lesson: {
              id: activity.lesson!.id,
              title: activity.lesson!.title,
              course: activity.lesson!.course ? {
                id: activity.lesson!.course.id,
                title: activity.lesson!.course.title,
              } : null,
            },
          })),
      },
    });
  } catch (error) {
    console.error('Error in getMyStats:', error);
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    // Check if phone is being changed and if it's already taken
    if (validatedData.phone) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      
      if (validatedData.phone !== currentUser?.phone) {
        const existingUser = await prisma.user.findUnique({
          where: { phone: validatedData.phone },
        });

        if (existingUser) {
          throw new AppError('Номер телефона уже используется', 400);
        }
      }
    }

    const updateData: any = {};
    if (validatedData.firstName) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName) updateData.lastName = validatedData.lastName;
    if (validatedData.phone) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email || null;
    }
    if (validatedData.language) updateData.language = validatedData.language;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Check current password
    const isPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError('Неверный текущий пароль', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Upload avatar request received');
    console.log('Request file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    } : 'No file');
    console.log('Request body keys:', Object.keys(req.body));
    
    if (!req.file) {
      console.error('No file in request. Files:', req.files);
      console.error('Request headers:', req.headers);
      throw new AppError('Файл не предоставлен. Убедитесь, что вы выбрали файл.', 400);
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      await deleteFile(req.file.filename);
      throw new AppError('Разрешены только изображения (JPEG, PNG, GIF, WebP)', 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      await deleteFile(req.file.filename);
      throw new AppError('Размер файла не должен превышать 5MB', 400);
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    // Delete old avatar if exists
    if (currentUser?.avatarUrl) {
      // Extract filename from URL (format: /api/files/avatar/filename or /api/files/download/filename)
      let oldFileName = currentUser.avatarUrl.replace('/api/files/avatar/', '');
      if (oldFileName === currentUser.avatarUrl) {
        oldFileName = currentUser.avatarUrl.replace('/api/files/download/', '');
      }
      if (oldFileName && oldFileName !== currentUser.avatarUrl) {
        try {
          await deleteFile(oldFileName);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }
    }

    // Use avatar endpoint for the file URL
    const fileUrl = `/api/files/avatar/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: fileUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });

    console.log('Avatar uploaded successfully:', fileUrl);
    res.json({
      success: true,
      data: user,
      message: 'Фото профиля успешно загружено',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    next(error);
  }
};

