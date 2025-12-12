import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { lessonSchema, validateVideoUrl } from '../utils/validation';

export const getLessonById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
          },
        },
        files: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check access
    let hasAccess = false;
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: lesson.courseId,
          },
        },
      });
      hasAccess = studentCourse?.status === 'APPROVED';
      
      // Check if it's a trial lesson
      const course = await prisma.course.findUnique({
        where: { id: lesson.courseId },
      });
      if (course?.trialLessonId === lesson.id) {
        hasAccess = true; // Trial lesson is always accessible
      }
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = lesson.course.teacherId === req.user.id || req.user.role === 'ADMIN';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому уроку', 403);
    }

    // Get student progress if student
    let progress = null;
    if (req.user?.role === 'STUDENT') {
      progress = await prisma.studentProgress.findUnique({
        where: {
          studentId_lessonId: {
            studentId: req.user.id,
            lessonId: id,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...lesson,
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = lessonSchema.parse(req.body);

    // Check if course exists and user has permission
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для создания урока в этом курсе', 403);
    }

    // Validate video URL if provided (supports YouTube, Vimeo, Google Drive, VK, and direct links)
    if (validatedData.videoUrl && !validateVideoUrl(validatedData.videoUrl)) {
      throw new AppError('Неверный формат URL видео. Поддерживаются: YouTube, Vimeo, Google Drive, VK и прямые ссылки на видео', 400);
    }

    const lesson = await prisma.lesson.create({
      data: validatedData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = lessonSchema.parse(req.body);

    // Check if lesson exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!existingLesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check permission
    if (existingLesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для редактирования этого урока', 403);
    }

    // Validate video URL if provided (supports YouTube, Vimeo, Google Drive, VK, and direct links)
    if (validatedData.videoUrl && !validateVideoUrl(validatedData.videoUrl)) {
      throw new AppError('Неверный формат URL видео. Поддерживаются: YouTube, Vimeo, Google Drive, VK и прямые ссылки на видео', 400);
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: validatedData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления этого урока', 403);
    }

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Урок успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonFiles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check access
    let hasAccess = false;
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: lesson.courseId,
          },
        },
      });
      hasAccess = studentCourse?.status === 'APPROVED';
      
      const course = await prisma.course.findUnique({
        where: { id: lesson.courseId },
      });
      if (course?.trialLessonId === lesson.id) {
        hasAccess = true;
      }
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = lesson.course.teacherId === req.user.id || req.user.role === 'ADMIN';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому уроку', 403);
    }

    const files = await prisma.lessonFile.findMany({
      where: { lessonId: id },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { completed, lastPosition } = req.body;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут обновлять прогресс', 403);
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    const progress = await prisma.studentProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: req.user!.id,
          lessonId: id,
        },
      },
      update: {
        completed: completed !== undefined ? completed : undefined,
        lastPosition: lastPosition !== undefined ? lastPosition : undefined,
        watchedAt: completed ? new Date() : undefined,
      },
      create: {
        studentId: req.user!.id,
        lessonId: id,
        completed: completed || false,
        lastPosition: lastPosition || 0,
        watchedAt: completed ? new Date() : undefined,
      },
    });

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

