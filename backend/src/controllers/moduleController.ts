import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { moduleSchema } from '../utils/validation';

export const getCourseModules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check permission
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: courseId,
          },
        },
      });
      if (studentCourse?.status !== 'APPROVED' && course.teacherId !== req.user.id) {
        throw new AppError('У вас нет доступа к этому курсу', 403);
      }
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      if (course.teacherId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('Недостаточно прав для просмотра модулей этого курса', 403);
      }
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: modules,
    });
  } catch (error) {
    next(error);
  }
};

export const getModuleById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
          },
        },
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!module) {
      throw new AppError('Модуль не найден', 404);
    }

    // Check permission
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: module.courseId,
          },
        },
      });
      if (studentCourse?.status !== 'APPROVED' && module.course.teacherId !== req.user.id) {
        throw new AppError('У вас нет доступа к этому модулю', 403);
      }
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      if (module.course.teacherId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('Недостаточно прав для просмотра этого модуля', 403);
      }
    }

    res.json({
      success: true,
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const validatedData = moduleSchema.parse(req.body);

    // Check if course exists and user has permission
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для создания модуля в этом курсе', 403);
    }

    const module = await prisma.module.create({
      data: {
        ...validatedData,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = moduleSchema.parse(req.body);

    // Check if module exists
    const existingModule = await prisma.module.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!existingModule) {
      throw new AppError('Модуль не найден', 404);
    }

    // Check permission
    if (existingModule.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для редактирования этого модуля', 403);
    }

    const module = await prisma.module.update({
      where: { id },
      data: validatedData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!module) {
      throw new AppError('Модуль не найден', 404);
    }

    if (module.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления этого модуля', 403);
    }

    await prisma.module.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Модуль успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

