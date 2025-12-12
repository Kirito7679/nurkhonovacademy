import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

export const getIntegrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, courseId, lessonId } = req.query;

    const where: any = {};
    if (type) where.type = type as string;
    if (courseId) where.courseId = courseId as string;
    if (lessonId) where.lessonId = lessonId as string;

    // Users can only see their own integrations unless admin or moderator
    // Teachers can see integrations for their courses/lessons
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      if (req.user!.role === 'TEACHER') {
        // If lessonId is provided, check if teacher owns the lesson
        if (lessonId) {
          const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId as string },
            include: {
              course: {
                select: { teacherId: true },
              },
            },
          });
          if (!lesson) {
            // Lesson doesn't exist, return empty array
            return res.json({
              success: true,
              data: [],
            });
          }
          if (lesson.course.teacherId !== req.user!.id) {
            // Teacher doesn't own this lesson, return empty
            return res.json({
              success: true,
              data: [],
            });
          }
        } else if (courseId) {
          // If courseId is provided, check if teacher owns the course
          const course = await prisma.course.findUnique({
            where: { id: courseId as string },
            select: { teacherId: true },
          });
          if (!course) {
            // Course doesn't exist, return empty array
            return res.json({
              success: true,
              data: [],
            });
          }
          if (course.teacherId !== req.user!.id) {
            // Teacher doesn't own this course, return empty
            return res.json({
              success: true,
              data: [],
            });
          }
        } else {
          // No specific lesson/course, show only user's integrations
          where.userId = req.user!.id;
        }
      } else {
        // Students and others see only their own integrations
        where.userId = req.user!.id;
      }
    }

    const integrations = await prisma.externalIntegration.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    next(error);
  }
};

export const createIntegration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, externalId, externalUrl, courseId, lessonId, metadata } = req.body;

    if (!type || !externalId || !externalUrl) {
      throw new AppError('Тип, внешний ID и URL обязательны', 400);
    }

    // Validate integration type
    const validTypes = ['GOOGLE_DOCS', 'QUIZLET', 'YOUTUBE', 'OTHER'];
    if (!validTypes.includes(type)) {
      throw new AppError('Неподдерживаемый тип интеграции', 400);
    }

    const integration = await prisma.externalIntegration.create({
      data: {
        userId: req.user!.id,
        type,
        externalId,
        externalUrl,
        courseId: courseId || null,
        lessonId: lessonId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'EXTERNAL_INTEGRATION',
      entityId: integration.id,
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteIntegration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const integration = await prisma.externalIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new AppError('Интеграция не найдена', 404);
    }

    if (integration.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    await prisma.externalIntegration.delete({
      where: { id },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'EXTERNAL_INTEGRATION',
      entityId: id,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Интеграция удалена',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate Quizlet embed URL
export const generateQuizletEmbed = (quizletId: string) => {
  return `https://quizlet.com/${quizletId}/embed`;
};

// Helper function to generate Google Docs embed URL
export const generateGoogleDocsEmbed = (docId: string) => {
  return `https://docs.google.com/document/d/${docId}/preview`;
};
