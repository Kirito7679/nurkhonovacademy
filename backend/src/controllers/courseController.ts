import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { courseSchema } from '../utils/validation';
import { createNotification } from './notificationController';

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

      // Show courses where isVisible = true OR where student is assigned
      if (assignedCourseIds.length > 0) {
        where.OR = [
          { isVisible: true },
          { id: { in: assignedCourseIds } },
        ];
      } else {
        // If no assigned courses, only show visible ones
        where.isVisible = true;
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

      let coursesWithAccess = courses.map((course) => {
        const studentCourseStatus = studentCourseMap.get(course.id);
        const hasAccess = studentCourseStatus === 'APPROVED';
        
        // Check if course has trial lesson
        const hasTrialAccess = !!course.trialLessonId;

        return {
          ...course,
          hasAccess,
          studentCourseStatus: studentCourseStatus || null,
          canRequestAccess: !studentCourseStatus && !hasAccess && course.isVisible,
          hasTrialAccess,
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

    // Check if student has access
    let hasAccess = false;
    let studentCourse = null;

    if (req.user?.role === 'STUDENT') {
      studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: id,
          },
        },
      });

      hasAccess = studentCourse?.status === 'APPROVED';
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = course.teacherId === req.user.id || req.user.role === 'ADMIN';
    }

    res.json({
      success: true,
      data: {
        ...course,
        hasAccess,
        studentCourseStatus: studentCourse?.status || null,
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
    const validatedData = courseSchema.parse(req.body);

    const course = await prisma.course.create({
      data: {
        ...validatedData,
        teacherId: req.user!.id,
        trialLessonId: validatedData.trialLessonId || null,
        isVisible: validatedData.isVisible !== undefined ? validatedData.isVisible : true,
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

    if (existingCourse.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для редактирования этого курса', 403);
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...validatedData,
        trialLessonId: validatedData.trialLessonId || null,
        isVisible: validatedData.isVisible !== undefined ? validatedData.isVisible : existingCourse.isVisible,
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

    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
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

