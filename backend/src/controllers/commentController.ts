import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { commentSchema } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from './notificationController';
import { sanitizeText } from '../utils/sanitize';
import { emitCommentUpdate } from '../services/socketService';

// Get all comments for a lesson
export const getLessonComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    // Check if lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            teacherId: true,
            trialLessonId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check access - all roles need to have access to the lesson
    let hasAccess = false;
    
    if (req.user?.role === 'STUDENT') {
      // Students need approved access or trial lesson access
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: lesson.courseId,
          },
        },
      });
      hasAccess = studentCourse?.status === 'APPROVED' || lesson.course.trialLessonId === lessonId;
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN' || req.user?.role === 'MODERATOR' || req.user?.role === 'ASSISTANT') {
      // Teachers, admins, moderators, and assistants have access if they own the course or are admin/moderator
      hasAccess = lesson.course.teacherId === req.user.id || req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к комментариям этого урока', 403);
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.comment.count({
      where: {
        lessonId,
        parentId: null,
      },
    });

    const comments = await prisma.comment.findMany({
      where: {
        lessonId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error in getLessonComments:', error);
    next(error);
  }
};

// Create a comment
export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user!.id;

    // Validate input
    const validatedData = commentSchema.parse(req.body);

    // Check if lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            teacherId: true,
            trialLessonId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check access - all roles need to have access to the lesson
    let hasAccess = false;
    
    if (req.user!.role === 'STUDENT') {
      // Students need approved access or trial lesson access
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user!.id,
            courseId: lesson.courseId,
          },
        },
      });
      hasAccess = studentCourse?.status === 'APPROVED' || lesson.course.trialLessonId === lessonId;
    } else if (req.user!.role === 'TEACHER' || req.user!.role === 'ADMIN' || req.user!.role === 'MODERATOR') {
      // Teachers, admins, and moderators have access if they own the course or are admin
      hasAccess = lesson.course.teacherId === req.user!.id || req.user!.role === 'ADMIN' || req.user!.role === 'MODERATOR';
    }
    
    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому уроку', 403);
    }

    // If it's a reply, check if parent comment exists
    if (validatedData.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentComment) {
        throw new AppError('Родительский комментарий не найден', 404);
      }

      // Only teachers/admins can reply to comments
      if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
        throw new AppError('Только учителя могут отвечать на комментарии', 403);
      }
    } else {
      // Only students can create top-level comments
      if (req.user!.role !== 'STUDENT') {
        throw new AppError('Только студенты могут оставлять комментарии', 403);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        lessonId,
        userId,
        content: sanitizeText(validatedData.content), // Sanitize content to prevent XSS
        parentId: validatedData.parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                teacherId: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Create notification for teacher if student commented
    if (!validatedData.parentId && req.user!.role === 'STUDENT') {
      // Get student data from database
      const student = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { firstName: true, lastName: true },
      });
      
      if (student) {
        const studentName = `${student.firstName} ${student.lastName}`;
        await createNotification(
          comment.lesson.course.teacherId,
          'COMMENT',
          'Новый комментарий к уроку',
          `${studentName} оставил комментарий к уроку "${comment.lesson.title}" в курсе "${comment.lesson.course.title}"`,
          `/courses/${comment.lesson.courseId}/lessons/${lessonId}`
        );
      }
    }

    // Emit socket event to update comments in real-time
    emitCommentUpdate(lessonId, comment);

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Комментарий успешно добавлен',
    });
  } catch (error) {
    console.error('Error in createComment:', error);
    next(error);
  }
};

// Update a comment
export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    // Validate input
    const validatedData = commentSchema.parse(req.body);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError('Комментарий не найден', 404);
    }

    // Only author can edit their comment
    if (comment.userId !== userId) {
      throw new AppError('Вы можете редактировать только свои комментарии', 403);
    }

    // Check if comment is too old to edit (15 minutes)
    const commentAge = Date.now() - new Date(comment.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (commentAge > fifteenMinutes) {
      throw new AppError('Комментарий можно редактировать только в течение 15 минут после создания', 403);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: sanitizeText(validatedData.content),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedComment,
      message: 'Комментарий успешно обновлен',
    });
  } catch (error) {
    console.error('Error in updateComment:', error);
    next(error);
  }
};

// Delete a comment (only by author or teacher/admin)
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        lesson: {
          include: {
            course: {
              select: {
                teacherId: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new AppError('Комментарий не найден', 404);
    }

    // Check permissions: author, teacher of the course, or admin
    const isAuthor = comment.userId === userId;
    const isTeacher = comment.lesson.course.teacherId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isAuthor && !isTeacher && !isAdmin) {
      throw new AppError('У вас нет прав для удаления этого комментария', 403);
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({
      success: true,
      message: 'Комментарий успешно удален',
    });
  } catch (error) {
    console.error('Error in deleteComment:', error);
    next(error);
  }
};

