import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createTestSchema = z.object({
  courseId: z.string().uuid('Неверный ID курса'),
  title: z.string().min(1, 'Название теста обязательно'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  passingScore: z.number().int().min(0).max(100).default(70),
  timeLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

const createQuestionSchema = z.object({
  testId: z.string().uuid('Неверный ID теста'),
  question: z.string().min(1, 'Вопрос обязателен'),
  type: z.enum(['SINGLE', 'MULTIPLE', 'TEXT']).default('SINGLE'),
  order: z.number().int().min(0).default(0),
  points: z.number().int().min(1).default(1),
  options: z.array(z.object({
    text: z.string().min(1),
    isCorrect: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
  })).optional(),
});

const submitTestSchema = z.object({
  testId: z.string().uuid('Неверный ID теста'),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    optionIds: z.array(z.string().uuid()).optional(),
    textAnswer: z.string().optional(),
  })),
  timeSpent: z.number().int().min(0).optional(),
});

// Get all tests for a course
export const getCourseTests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;

    // Check if user has access to course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check access
    if (req.user!.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user!.id,
            courseId,
          },
        },
      });
      if (!studentCourse || studentCourse.status !== 'APPROVED') {
        throw new AppError('Нет доступа к этому курсу', 403);
      }
    } else if (req.user!.role === 'TEACHER' && course.teacherId !== req.user!.id) {
      throw new AppError('Нет доступа к этому курсу', 403);
    }

    const tests = await prisma.intermediateTest.findMany({
      where: {
        courseId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            questions: true,
            results: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

// Get test by ID with questions
export const getTestById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { testId } = req.params;

    const test = await prisma.intermediateTest.findUnique({
      where: { id: testId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
          },
        },
        questions: {
          include: {
            options: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!test) {
      throw new AppError('Тест не найден', 404);
    }

    // Check access
    if (req.user!.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user!.id,
            courseId: test.courseId,
          },
        },
      });
      if (!studentCourse || studentCourse.status !== 'APPROVED') {
        throw new AppError('Нет доступа к этому тесту', 403);
      }
    } else if (req.user!.role === 'TEACHER' && test.course.teacherId !== req.user!.id) {
      throw new AppError('Нет доступа к этому тесту', 403);
    }

    // For students, don't show correct answers
    if (req.user!.role === 'STUDENT') {
      test.questions.forEach((question) => {
        question.options.forEach((option) => {
          delete (option as any).isCorrect;
        });
      });
    }

    res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

// Create test (teachers only)
export const createTest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = createTestSchema.parse(req.body);

    // Check if user is teacher and has access to course
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Нет доступа к созданию теста для этого курса', 403);
    }

    const test = await prisma.intermediateTest.create({
      data: {
        ...validatedData,
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: test,
      message: 'Тест успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

// Submit test (students only)
export const submitTest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут проходить тесты', 403);
    }

    const validatedData = submitTestSchema.parse(req.body);

    // Get test with questions and options
    const test = await prisma.intermediateTest.findUnique({
      where: { id: validatedData.testId },
      include: {
        course: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!test) {
      throw new AppError('Тест не найден', 404);
    }

    // Check access
    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user!.id,
          courseId: test.courseId,
        },
      },
    });

    if (!studentCourse || studentCourse.status !== 'APPROVED') {
      throw new AppError('Нет доступа к этому тесту', 403);
    }

    // Check if already passed
    const existingResult = await prisma.intermediateTestResult.findFirst({
      where: {
        testId: validatedData.testId,
        studentId: req.user!.id,
      },
    });

    if (existingResult) {
      throw new AppError('Тест уже пройден', 400);
    }

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const answersToCreate: any[] = [];

    for (const question of test.questions) {
      maxScore += question.points;
      const userAnswer = validatedData.answers.find(a => a.questionId === question.id);
      
      if (!userAnswer) {
        continue; // No answer provided
      }

      let isCorrect = false;
      let points = 0;

      if (question.type === 'SINGLE' || question.type === 'MULTIPLE') {
        const correctOptions = question.options.filter(o => o.isCorrect).map(o => o.id);
        const userOptions = userAnswer.optionIds || [];
        
        if (question.type === 'SINGLE') {
          isCorrect = userOptions.length === 1 && correctOptions.includes(userOptions[0]);
        } else {
          // MULTIPLE: all correct options must be selected and no incorrect ones
          const correctSet = new Set(correctOptions);
          const userSet = new Set(userOptions);
          isCorrect = correctOptions.length === userOptions.length &&
                     correctOptions.every(id => userSet.has(id)) &&
                     userOptions.every(id => correctSet.has(id));
        }
        
        if (isCorrect) {
          points = question.points;
          totalScore += points;
        }
      } else if (question.type === 'TEXT') {
        // For text questions, manual review needed - set as incorrect for now
        isCorrect = false;
        points = 0;
      }

      answersToCreate.push({
        questionId: question.id,
        optionIds: userAnswer.optionIds || [],
        textAnswer: userAnswer.textAnswer || null,
        isCorrect,
        points,
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = percentage >= test.passingScore;

    // Create result
    const result = await prisma.intermediateTestResult.create({
      data: {
        testId: validatedData.testId,
        studentId: req.user!.id,
        score: totalScore,
        percentage,
        passed,
        timeSpent: validatedData.timeSpent || null,
        answers: {
          create: answersToCreate,
        },
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    // Award coins if passed (gamification)
    if (passed) {
      const coinsToAward = Math.floor(percentage / 10); // 1 coin per 10%
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          coins: {
            increment: coinsToAward,
          },
        },
      });
    }

    res.json({
      success: true,
      data: result,
      message: passed ? 'Тест пройден!' : 'Тест не пройден. Попробуйте еще раз.',
    });
  } catch (error) {
    next(error);
  }
};
