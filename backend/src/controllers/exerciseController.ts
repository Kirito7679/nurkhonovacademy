import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

export const createExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId, type, title, description, content, order } = req.body;

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для создания упражнения', 403);
    }

    const exercise = await prisma.interactiveExercise.create({
      data: {
        lessonId,
        type,
        title,
        description: description || null,
        content: JSON.stringify(content),
        order: order || 0,
      },
    });

    res.status(201).json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonExercises = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    const exercises = await prisma.interactiveExercise.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
    });

    // Parse JSON content
    const exercisesWithParsedContent = exercises.map((exercise) => ({
      ...exercise,
      content: JSON.parse(exercise.content),
    }));

    res.json({
      success: true,
      data: exercisesWithParsedContent,
    });
  } catch (error) {
    next(error);
  }
};

export const submitExerciseResult = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { exerciseId } = req.params;
    const { answers } = req.body;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут отправлять результаты упражнений', 403);
    }

    const exercise = await prisma.interactiveExercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new AppError('Упражнение не найдено', 404);
    }

    // Calculate score (simplified - should be based on exercise type)
    const exerciseContent = JSON.parse(exercise.content);
    let score = 0;
    let passed = false;

    // This is a simplified scoring - should be implemented based on exercise type
    // For now, we'll just save the result
    score = 100; // Placeholder
    passed = true; // Placeholder

    const result = await prisma.exerciseResult.upsert({
      where: {
        exerciseId_studentId: {
          exerciseId,
          studentId: req.user!.id,
        },
      },
      update: {
        score,
        passed,
        answers: JSON.stringify(answers),
        completedAt: new Date(),
      },
      create: {
        exerciseId,
        studentId: req.user!.id,
        score,
        passed,
        answers: JSON.stringify(answers),
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
