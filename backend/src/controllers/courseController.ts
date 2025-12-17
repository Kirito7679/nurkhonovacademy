import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { courseSchema } from '../utils/validation';
import { createNotification } from './notificationController';
import { checkCourseAccess, canEditCourse } from '../utils/accessControl';

export const getAllCourses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    // Search and filter parameters
    const search = req.query.search as string || '';
    const status = req.query.status as string; // For students: 'all', 'approved', 'pending', 'locked'
    const sortBy = req.query.sortBy as string || 'createdAt'; // 'createdAt', 'title', 'lessons'
    const sortOrder = req.query.sortOrder as string || 'desc'; // 'asc', 'desc'

    // Build where clause
    const where: any = {};
    
    if (search) {
      // SQLite doesn't support case-insensitive search with mode, so we use contains
      const searchLower = search.toLowerCase();
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // For teachers, show only their own courses (not all courses like admin)
    if (req.user.role === 'TEACHER') {
      where.teacherId = req.user.id;
    }

    // For students, filter by visibility: show visible courses OR courses assigned to them
    // Also filter by language: only show courses matching student's language preference
    if (req.user.role === 'STUDENT') {
      const studentCourses = await prisma.studentCourse.findMany({
        where: {
          studentId: req.user.id,
        },
        select: {
          courseId: true,
        },
      });

      const assignedCourseIds = studentCourses.map((sc) => sc.courseId);
      const userLanguage = req.user.language || 'ru';

      // Show courses where:
      // 1. isVisible = true AND language matches user's language
      // 2. OR student is assigned (regardless of language)
      if (assignedCourseIds.length > 0) {
        where.OR = [
          { isVisible: true, language: userLanguage },
          { id: { in: assignedCourseIds } },
        ];
      } else {
        // If no assigned courses, only show visible ones matching language
        where.isVisible = true;
        where.language = userLanguage;
      }
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'title') {
      orderBy = { title: sortOrder };
    } else if (sortBy === 'lessons') {
      orderBy = { lessons: { _count: sortOrder } };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegram: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            studentCourses: true,
          },
        },
      },
      orderBy,
    });

    // For students, add access information
    if (req.user.role === 'STUDENT') {
      const studentCourses = await prisma.studentCourse.findMany({
        where: {
          studentId: req.user.id,
        },
        select: {
          courseId: true,
          status: true,
        },
      });

      const studentCourseMap = new Map(
        studentCourses.map((sc) => [sc.courseId, sc.status])
      );

      // Get all student courses for subscription check
      const studentCoursesForSub = await prisma.studentCourse.findMany({
        where: {
          studentId: req.user.id,
          courseId: { in: courses.map(c => c.id) },
        },
        select: {
          courseId: true,
          approvedAt: true,
          accessStartDate: true,
          accessEndDate: true,
        },
      });

      const studentCourseSubMap = new Map(
        studentCoursesForSub.map(sc => [sc.courseId, sc])
      );

      const now = new Date();

      let coursesWithAccess = courses.map((course) => {
        const studentCourseStatus = studentCourseMap.get(course.id);
        const studentCourse = studentCourseSubMap.get(course.id);
        
        // Check if course has trial lesson
        const hasTrialAccess = !!course.trialLessonId;

        // Check access and subscription status
        let hasAccess = studentCourseStatus === 'APPROVED';
        let subscriptionStatus = null;
        let trialDaysRemaining = null;
        let isSubscriptionExpired = false;

        if (hasAccess && studentCourse) {
          // Check if subscription is still valid based on accessEndDate
          if (studentCourse.accessEndDate) {
            const endDate = new Date(studentCourse.accessEndDate);
            if (now >= endDate) {
              hasAccess = false;
              isSubscriptionExpired = true;
              subscriptionStatus = 'EXPIRED';
            } else {
              // Subscription is still active
              if (course.subscriptionType === 'TRIAL') {
                subscriptionStatus = 'TRIAL';
                const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                trialDaysRemaining = daysLeft;
              } else if (course.subscriptionType === 'PAID') {
                subscriptionStatus = 'PAID';
              } else if (course.subscriptionType === 'FREE') {
                subscriptionStatus = 'FREE';
              }
            }
          } else {
            // No end date means unlimited access
            if (course.subscriptionType === 'FREE') {
              subscriptionStatus = 'FREE';
            } else if (course.subscriptionType === 'PAID') {
              subscriptionStatus = 'PAID';
            } else if (course.subscriptionType === 'TRIAL') {
              subscriptionStatus = 'TRIAL';
            }
          }

          // Check if start date has passed
          if (hasAccess && studentCourse.accessStartDate) {
            const startDate = new Date(studentCourse.accessStartDate);
            if (now < startDate) {
              hasAccess = false;
            }
          }
        }

        return {
          ...course,
          hasAccess,
          studentCourseStatus: studentCourseStatus || null,
          canRequestAccess: !studentCourseStatus && !hasAccess && course.isVisible,
          hasTrialAccess,
          subscriptionStatus,
          trialDaysRemaining,
          isSubscriptionExpired,
        };
      });

      // Filter by status for students
      if (status && status !== 'all') {
        coursesWithAccess = coursesWithAccess.filter((course) => {
          if (status === 'approved') return course.hasAccess;
          if (status === 'pending') return course.studentCourseStatus === 'PENDING';
          if (status === 'locked') return !course.hasAccess && !course.studentCourseStatus;
          return true;
        });
      }

      res.json({
        success: true,
        data: coursesWithAccess,
      });
    } else {
      // For teachers, return only their courses; for admins, return all
      res.json({
        success: true,
        data: courses,
      });
    }
  } catch (error) {
    console.error('Error in getAllCourses:', error);
    next(error);
  }
};

export const getCourseById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegram: true,
          },
        },
        modules: {
          orderBy: {
            order: 'asc',
          },
          include: {
            lessons: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        lessons: {
          orderBy: {
            order: 'asc',
          },
          include: {
            _count: {
              select: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check if student has access using centralized access control
    let hasAccess = false;
    let accessInfo: any = {};

    if (req.user?.role === 'STUDENT') {
      accessInfo = await checkCourseAccess(req.user.id, id);
      hasAccess = accessInfo.hasAccess;
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = canEditCourse(req.user.id, req.user.role, course.teacherId);
    }

    res.json({
      success: true,
      data: {
        ...course,
        hasAccess,
        studentCourseStatus: accessInfo.studentCourseStatus || null,
        isSubscriptionExpired: accessInfo.isSubscriptionExpired || false,
        accessEndDate: accessInfo.accessEndDate || null,
        accessStartDate: accessInfo.accessStartDate || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if teacher has paid registration (if role is TEACHER)
    if (req.user!.role === 'TEACHER' && !req.user!.isPaidTeacher) {
      throw new AppError('Для создания курсов необходимо оплатить регистрацию учителя', 403);
    }

    const validatedData = courseSchema.parse(req.body);

    // Validate trialLessonId if provided
    // Note: We can't check if lesson belongs to this course yet (course doesn't exist),
    // but we can check if lesson exists and belongs to the same teacher
    if (validatedData.trialLessonId) {
      const trialLesson = await prisma.lesson.findUnique({
        where: { id: validatedData.trialLessonId },
        include: {
          course: {
            select: {
              teacherId: true,
            },
          },
        },
      });

      if (!trialLesson) {
        throw new AppError('Пробный урок не найден', 404);
      }

      // Check if lesson belongs to the same teacher (or admin can use any lesson)
      if (trialLesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError('Пробный урок должен принадлежать вам', 403);
      }
    }

    const course = await prisma.course.create({
      data: {
        ...validatedData,
        teacherId: req.user!.id,
        trialLessonId: validatedData.trialLessonId || null,
        isVisible: validatedData.isVisible !== undefined ? validatedData.isVisible : true,
        language: validatedData.language || 'ru',
        category: validatedData.category || null,
        subscriptionType: validatedData.subscriptionType || null,
        trialPeriodDays: validatedData.trialPeriodDays || null,
        price30Days: validatedData.price30Days || null,
        price3Months: validatedData.price3Months || null,
        price6Months: validatedData.price6Months || null,
        price1Year: validatedData.price1Year || null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegram: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = courseSchema.parse(req.body);

    // Check if course exists and user has permission
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new AppError('Курс не найден', 404);
    }

    if (!canEditCourse(req.user!.id, req.user!.role, existingCourse.teacherId)) {
      throw new AppError('Недостаточно прав для редактирования этого курса', 403);
    }

    // Validate trialLessonId if provided and changed
    if (validatedData.trialLessonId && validatedData.trialLessonId !== existingCourse.trialLessonId) {
      const trialLesson = await prisma.lesson.findUnique({
        where: { id: validatedData.trialLessonId },
        include: {
          course: {
            select: {
              id: true,
              teacherId: true,
            },
          },
        },
      });

      if (!trialLesson) {
        throw new AppError('Пробный урок не найден', 404);
      }

      // Check if lesson belongs to this course
      if (trialLesson.courseId !== id) {
        throw new AppError('Пробный урок должен принадлежать этому курсу', 400);
      }

      // Additional check: lesson should belong to the same teacher
      if (trialLesson.course.teacherId !== existingCourse.teacherId) {
        throw new AppError('Пробный урок должен принадлежать этому курсу', 400);
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...validatedData,
        trialLessonId: validatedData.trialLessonId || null,
        isVisible: validatedData.isVisible !== undefined ? validatedData.isVisible : existingCourse.isVisible,
        category: validatedData.category !== undefined ? validatedData.category : existingCourse.category,
        price30Days: validatedData.price30Days !== undefined ? validatedData.price30Days : existingCourse.price30Days,
        price3Months: validatedData.price3Months !== undefined ? validatedData.price3Months : existingCourse.price3Months,
        price6Months: validatedData.price6Months !== undefined ? validatedData.price6Months : existingCourse.price6Months,
        price1Year: validatedData.price1Year !== undefined ? validatedData.price1Year : existingCourse.price1Year,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegram: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    if (!canEditCourse(req.user!.id, req.user!.role, course.teacherId)) {
      throw new AppError('Недостаточно прав для удаления этого курса', 403);
    }

    await prisma.course.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Курс успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseLessons = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check access (but don't block - we'll return lessons anyway)
    // Allow access if course is visible OR user has approved access OR is the teacher
    let hasAccess = false;
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: id,
          },
        },
      });
      hasAccess = course.isVisible || studentCourse?.status === 'APPROVED' || course.teacherId === req.user.id;
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = true; // Teachers and admins always have access
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId: id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Get student progress only if student has access
    let lessonsWithProgress = lessons;
    if (req.user?.role === 'STUDENT' && hasAccess) {
      const progressMap = await prisma.studentProgress.findMany({
        where: {
          studentId: req.user.id,
          lessonId: {
            in: lessons.map((l) => l.id),
          },
        },
      });

      lessonsWithProgress = lessons.map((lesson) => ({
        ...lesson,
        progress: progressMap.find((p) => p.lessonId === lesson.id) || null,
      }));
    }

    res.json({
      success: true,
      data: lessonsWithProgress,
    });
  } catch (error) {
    next(error);
  }
};

export const requestCourseAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут запрашивать доступ к курсам', 403);
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check if request already exists
    const existingRequest = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user!.id,
          courseId: id,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'APPROVED') {
        throw new AppError('У вас уже есть доступ к этому курсу', 400);
      }
      if (existingRequest.status === 'PENDING') {
        throw new AppError('Запрос на доступ уже отправлен', 400);
      }
    }

    // If course is free (price = 0), automatically approve access
    const isFreeCourse = course.price === 0;
    const courseStatus = isFreeCourse ? 'APPROVED' : 'PENDING';

    const studentCourse = await prisma.studentCourse.create({
      data: {
        studentId: req.user!.id,
        courseId: id,
        status: courseStatus,
        ...(isFreeCourse && {
          approvedAt: new Date(),
          approvedBy: req.user!.id, // Auto-approved by system
        }),
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Get student data from database
    const student = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { firstName: true, lastName: true },
    });
    
    if (isFreeCourse) {
      // For free courses, notify student that access is granted
      if (student) {
        await createNotification(
          req.user!.id,
          'COURSE_APPROVED',
          'Доступ к курсу предоставлен',
          `Вам предоставлен доступ к бесплатному курсу "${course.title}"`,
          `/courses/${id}`
        );
      }
    } else {
      // For paid courses, notify teacher about request
    if (student) {
      const studentName = `${student.firstName} ${student.lastName}`;
      await createNotification(
        course.teacherId,
        'COURSE_REQUEST',
        'Новый запрос на доступ к курсу',
        `${studentName} запросил доступ к курсу "${course.title}"`,
        `/teacher/dashboard`
      );
      }
    }

    res.status(201).json({
      success: true,
      data: studentCourse,
      message: isFreeCourse ? 'Доступ к курсу предоставлен' : 'Запрос на доступ отправлен',
    });
  } catch (error) {
    next(error);
  }
};

// Extend subscription for a course (for students)
export const extendCourseSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: courseId } = req.params;
    const { subscriptionPeriod } = req.body; // 30_DAYS, 3_MONTHS, 6_MONTHS, 1_YEAR

    if (!subscriptionPeriod || !['30_DAYS', '3_MONTHS', '6_MONTHS', '1_YEAR'].includes(subscriptionPeriod)) {
      throw new AppError('Неверный период подписки. Используйте: 30_DAYS, 3_MONTHS, 6_MONTHS, 1_YEAR', 400);
    }

    const studentId = req.user!.id;

    // Get course with prices
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        subscriptionType: true,
        price30Days: true,
        price3Months: true,
        price6Months: true,
        price1Year: true,
      },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    if (course.subscriptionType !== 'PAID') {
      throw new AppError('Продление подписки доступно только для платных курсов', 400);
    }

    // Get price for selected period
    let price: number | null = null;
    switch (subscriptionPeriod) {
      case '30_DAYS':
        price = course.price30Days;
        break;
      case '3_MONTHS':
        price = course.price3Months;
        break;
      case '6_MONTHS':
        price = course.price6Months;
        break;
      case '1_YEAR':
        price = course.price1Year;
        break;
    }

    if (!price || price <= 0) {
      throw new AppError('Цена для выбранного периода не установлена', 400);
    }

    // Get current student course
    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (!studentCourse) {
      throw new AppError('Подписка на курс не найдена. Сначала запросите доступ к курсу', 404);
    }

    // Check if subscription is expired or will expire soon
    const now = new Date();
    let newAccessEndDate: Date;

    if (studentCourse.accessEndDate) {
      const currentEndDate = new Date(studentCourse.accessEndDate);
      // If subscription is still active, extend from current end date
      // If expired, start from now
      const baseDate = currentEndDate > now ? currentEndDate : now;
      newAccessEndDate = new Date(baseDate);
    } else {
      // If no end date (unlimited), start from now
      newAccessEndDate = new Date();
    }

    // Add period to end date
    switch (subscriptionPeriod) {
      case '30_DAYS':
        newAccessEndDate.setDate(newAccessEndDate.getDate() + 30);
        break;
      case '3_MONTHS':
        newAccessEndDate.setMonth(newAccessEndDate.getMonth() + 3);
        break;
      case '6_MONTHS':
        newAccessEndDate.setMonth(newAccessEndDate.getMonth() + 6);
        break;
      case '1_YEAR':
        newAccessEndDate.setFullYear(newAccessEndDate.getFullYear() + 1);
        break;
    }

    // TODO: Process payment here before updating subscription
    // For now, we'll just update the dates
    // In production, you should:
    // 1. Create payment record
    // 2. Process payment through payment gateway
    // 3. Only update subscription if payment is successful

    // Update student course with new end date
    const updatedStudentCourse = await prisma.studentCourse.update({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
      data: {
        accessEndDate: newAccessEndDate,
        accessStartDate: studentCourse.accessStartDate || new Date(),
        status: 'APPROVED',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create notification
    const { createNotification } = await import('./notificationController');
    await createNotification(
      studentId,
      'COURSE_APPROVED',
      'Подписка продлена',
      `Ваша подписка на курс "${course.title}" продлена до ${newAccessEndDate.toLocaleDateString('ru-RU')}`,
      `/courses/${courseId}`
    );

    res.json({
      success: true,
      data: {
        studentCourse: updatedStudentCourse,
        price,
        subscriptionPeriod,
        newEndDate: newAccessEndDate,
      },
      message: 'Подписка успешно продлена',
    });
  } catch (error) {
    next(error);
  }
};

