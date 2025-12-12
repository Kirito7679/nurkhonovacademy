import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

// Get quiz for a lesson
export const getQuizByLessonId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    // Check if student has access to the lesson
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
      throw new AppError('У вас нет доступа к этому тесту', 403);
    }

    // Get quiz with questions and options
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
        ...(req.user?.role === 'STUDENT' ? {
          results: {
            where: { studentId: req.user.id },
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        } : {}),
      },
    });

    if (!quiz) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Don't send correct answers to students, but send full data to teachers/admins
    if (req.user?.role === 'STUDENT') {
      const quizForStudent = {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          options: q.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            order: opt.order,
          })),
          correctAnswer: undefined, // Hide correct answer
        })),
      };
      res.json({
        success: true,
        data: quizForStudent,
      });
    } else {
      // Teachers and admins get full quiz data including correct answers
      res.json({
        success: true,
        data: quiz,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Create or update quiz (for teachers)
export const createOrUpdateQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const { title, description, passingScore, questions } = req.body;

    if (req.user?.role !== 'TEACHER' && req.user?.role !== 'ADMIN' && req.user?.role !== 'MODERATOR') {
      throw new AppError('Только преподаватели могут создавать тесты', 403);
    }

    // Check if lesson exists and belongs to teacher
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      throw new AppError('Вы не можете создавать тесты для этого урока', 403);
    }

    // Check if quiz exists
    let existingQuiz;
    try {
      existingQuiz = await prisma.quiz.findUnique({
        where: { lessonId },
      });
    } catch (error: any) {
      console.error('Error accessing quiz model:', error);
      if (error.message && error.message.includes('undefined')) {
        throw new AppError('Модель Quiz не доступна. Пожалуйста, перезапустите сервер после генерации Prisma Client.', 500);
      }
      throw error;
    }

    let quiz;
    if (existingQuiz) {
      // Update existing quiz
      quiz = await prisma.quiz.update({
        where: { lessonId },
        data: {
          title: title || null,
          description: description || null,
          passingScore: passingScore || 70,
        },
      });
    } else {
      // Create new quiz
      quiz = await prisma.quiz.create({
        data: {
          lessonId,
          title: title || null,
          description: description || null,
          passingScore: passingScore || 70,
        },
      });
    }

    // Delete existing questions and options
    await prisma.quizQuestion.deleteMany({
      where: { quizId: quiz.id },
    });

    // Create questions and options
    if (questions && Array.isArray(questions)) {
      for (const [qIndex, question] of questions.entries()) {
        const createdQuestion = await prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: question.question,
            type: question.type || 'MULTIPLE_CHOICE',
            order: question.order || qIndex,
            correctAnswer: question.correctAnswer || null,
            metadata: question.metadata || null,
          },
        });

        if (question.options && Array.isArray(question.options)) {
          for (const [oIndex, option] of question.options.entries()) {
            await prisma.quizOption.create({
              data: {
                questionId: createdQuestion.id,
                text: option.text,
                isCorrect: option.isCorrect || false,
                order: option.order || oIndex,
              },
            });
          }
        }
      }
    }

    // Return updated quiz
    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedQuiz,
    });
  } catch (error) {
    next(error);
  }
};

// Submit quiz answers
export const submitQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body; // { questionId: optionId or answer }

    if (req.user?.role !== 'STUDENT') {
      throw new AppError('Только студенты могут проходить тесты', 403);
    }

    // Check access
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

    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user.id,
          courseId: lesson.courseId,
        },
      },
    });

    const hasAccess = studentCourse?.status === 'APPROVED' || 
      lesson.course.trialLessonId === lessonId;

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому тесту', 403);
    }

    // Get quiz
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new AppError('Тест не найден', 404);
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    for (const question of quiz.questions) {
      const studentAnswer = answers[question.id];
      
      if (question.type === 'MULTIPLE_CHOICE') {
        const selectedOptionId = studentAnswer;
        const correctOption = question.options.find((opt) => opt.isCorrect);
        if (correctOption && selectedOptionId === correctOption.id) {
          correctAnswers++;
        }
      } else if (question.type === 'TRUE_FALSE') {
        if (studentAnswer === question.correctAnswer) {
          correctAnswers++;
        }
      } else if (question.type === 'DRAG_DROP' || question.type === 'MATCHING' || question.type === 'FILL_BLANK') {
        // For interactive questions, compare JSON answers
        try {
          const studentAnswerObj = typeof studentAnswer === 'string' ? JSON.parse(studentAnswer) : studentAnswer;
          const correctAnswerObj = question.correctAnswer ? JSON.parse(question.correctAnswer) : null;
          
          if (correctAnswerObj && JSON.stringify(studentAnswerObj) === JSON.stringify(correctAnswerObj)) {
            correctAnswers++;
          }
        } catch (e) {
          // If parsing fails, answer is incorrect
        }
      }
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    // Save result
    const result = await prisma.quizResult.create({
      data: {
        quizId: quiz.id,
        studentId: req.user.id,
        score,
        passed,
        answers: JSON.stringify(answers),
      },
    });

    res.json({
      success: true,
      data: {
        ...result,
        correctAnswers,
        totalQuestions,
        passingScore: quiz.passingScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get quiz results for a lesson (for teachers)
export const getQuizResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    if (req.user?.role !== 'TEACHER' && req.user?.role !== 'ADMIN' && req.user?.role !== 'MODERATOR') {
      throw new AppError('Только преподаватели могут просматривать результаты', 403);
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      throw new AppError('Вы не можете просматривать результаты этого теста', 403);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        results: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!quiz) {
      return res.json({
        success: true,
        data: [],
      });
    }

    res.json({
      success: true,
      data: quiz.results,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
      },
    });

    if (!lesson) {
      throw new AppError('Урок не найден', 404);
    }

    // Check permission
    if (lesson.course.teacherId !== req.user!.id && 
        req.user!.role !== 'ADMIN' && 
        req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав для удаления этого теста', 403);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
    });

    if (!quiz) {
      throw new AppError('Тест не найден', 404);
    }

    // Delete quiz (cascade will handle questions, options, and results)
    await prisma.quiz.delete({
      where: { id: quiz.id },
    });

    res.json({
      success: true,
      message: 'Тест успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

