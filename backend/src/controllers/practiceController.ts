import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

export const getPracticeExercises = async (
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
            id: true,
            teacherId: true,
            trialLessonId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check access based on role
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
      hasAccess = studentCourse?.status === 'APPROVED' || 
        lesson.course.trialLessonId === lessonId;
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN' || req.user?.role === 'MODERATOR') {
      hasAccess = lesson.course.teacherId === req.user.id || req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому уроку', 403);
    }

    const exercises = await prisma.practiceExercise.findMany({
      where: { lessonId },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: exercises,
    });
  } catch (error) {
    next(error);
  }
};

export const createPracticeExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const { title, description, type, instructions, solution, autoCheck, maxAttempts, order } = req.body;

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав', 403);
    }

    const exercise = await prisma.practiceExercise.create({
      data: {
        lessonId,
        title,
        description: description || null,
        type,
        instructions,
        solution: solution || null,
        autoCheck: autoCheck || false,
        maxAttempts: maxAttempts || 3,
        order: order || 0,
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'PRACTICE_EXERCISE',
      entityId: exercise.id,
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const submitPracticeResult = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exerciseId } = req.params;
    const { answer } = req.body;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут отправлять ответы', 403);
    }

    const exercise = await prisma.practiceExercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new AppError('Упражнение не найдено', 404);
    }

    // Check attempt limit
    const previousAttempts = await prisma.practiceResult.count({
      where: {
        exerciseId,
        studentId: req.user!.id,
      },
    });

    if (previousAttempts >= exercise.maxAttempts) {
      throw new AppError('Достигнут лимит попыток', 400);
    }

    let score: number | null = null;
    let feedback: string | null = null;
    let status = 'SUBMITTED';

    // Auto-check if enabled
    if (exercise.autoCheck && exercise.solution) {
      // Simple comparison (can be enhanced with more sophisticated checking)
      const normalizedAnswer = answer.trim().toLowerCase();
      const normalizedSolution = exercise.solution.trim().toLowerCase();
      
      if (normalizedAnswer === normalizedSolution) {
        score = 100;
        feedback = 'Правильно!';
        status = 'APPROVED';
      } else {
        score = 0;
        feedback = 'Неправильный ответ. Попробуйте еще раз.';
      }
    }

    const result = await prisma.practiceResult.create({
      data: {
        exerciseId,
        studentId: req.user!.id,
        answer,
        score,
        feedback,
        status,
        attemptNumber: previousAttempts + 1,
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'SUBMIT',
      entityType: 'PRACTICE_RESULT',
      entityId: result.id,
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewPracticeResult = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resultId } = req.params;
    const { score, feedback, status } = req.body;

    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав для проверки', 403);
    }

    const result = await prisma.practiceResult.findUnique({
      where: { id: resultId },
      include: { exercise: { include: { lesson: { include: { course: true } } } } },
    });

    if (!result) {
      throw new AppError('Результат не найден', 404);
    }

    // Check if user has permission to review this exercise
    if (result.exercise.lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    const updatedResult = await prisma.practiceResult.update({
      where: { id: resultId },
      data: {
        score: score !== undefined ? score : result.score,
        feedback: feedback !== undefined ? feedback : result.feedback,
        status: status || 'REVIEWED',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'REVIEW',
      entityType: 'PRACTICE_RESULT',
      entityId: resultId,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      data: updatedResult,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentPracticeResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exerciseId } = req.params;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут просматривать свои результаты', 403);
    }

    const results = await prisma.practiceResult.findMany({
      where: {
        exerciseId,
        studentId: req.user!.id,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePracticeExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exerciseId } = req.params;
    const { title, description, type, instructions, solution, autoCheck, maxAttempts, order } = req.body;

    const exercise = await prisma.practiceExercise.findUnique({
      where: { id: exerciseId },
      include: { lesson: { include: { course: true } } },
    });

    if (!exercise) {
      throw new AppError('Упражнение не найдено', 404);
    }

    if (exercise.lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав', 403);
    }

    const updatedExercise = await prisma.practiceExercise.update({
      where: { id: exerciseId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(type !== undefined && { type }),
        ...(instructions !== undefined && { instructions }),
        ...(solution !== undefined && { solution: solution || null }),
        ...(autoCheck !== undefined && { autoCheck }),
        ...(maxAttempts !== undefined && { maxAttempts }),
        ...(order !== undefined && { order }),
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'PRACTICE_EXERCISE',
      entityId: updatedExercise.id,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      data: updatedExercise,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePracticeExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exerciseId } = req.params;

    const exercise = await prisma.practiceExercise.findUnique({
      where: { id: exerciseId },
      include: {
        lesson: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!exercise) {
      throw new AppError('Упражнение не найдено', 404);
    }

    // Check permission
    if (exercise.lesson.course.teacherId !== req.user!.id && 
        req.user!.role !== 'ADMIN' && 
        req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав для удаления этого упражнения', 403);
    }

    await prisma.practiceExercise.delete({
      where: { id: exerciseId },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'PRACTICE_EXERCISE',
      entityId: exerciseId,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Упражнение успешно удалено',
    });
  } catch (error) {
    next(error);
  }
};

export const deletePracticeResult = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resultId } = req.params;

    const result = await prisma.practiceResult.findUnique({
      where: { id: resultId },
      include: {
        exercise: {
          include: {
            lesson: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      throw new AppError('Результат не найден', 404);
    }

    // Check permission: student can delete own results, teacher/admin can delete any
    if (req.user!.role === 'STUDENT' && result.studentId !== req.user!.id) {
      throw new AppError('Вы можете удалять только свои результаты', 403);
    }

    if ((req.user!.role === 'TEACHER' || req.user!.role === 'ADMIN' || req.user!.role === 'MODERATOR') &&
        result.exercise.lesson.course.teacherId !== req.user!.id && 
        req.user!.role !== 'ADMIN' && 
        req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав для удаления этого результата', 403);
    }

    await prisma.practiceResult.delete({
      where: { id: resultId },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'PRACTICE_RESULT',
      entityId: resultId,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Результат успешно удален',
    });
  } catch (error) {
    next(error);
  }
};
