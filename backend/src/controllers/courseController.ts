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

    // For teachers/admins, filter by their courses
    if (req.user.role === 'TEACHER' && req.query.myCourses === 'true') {
      where.teacherId = req.user.id;
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
          canRequestAccess: !studentCourseStatus && !hasAccess,
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
      // For teachers/admins, return courses as is
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

    // Check access
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
      hasAccess = studentCourse?.status === 'APPROVED';
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = course.teacherId === req.user.id || req.user.role === 'ADMIN';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому курсу', 403);
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId: id },
      include: {
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

    res.json({
      success: true,
      data: lessons,
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

    const studentCourse = await prisma.studentCourse.create({
      data: {
        studentId: req.user!.id,
        courseId: id,
        status: 'PENDING',
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

    // Create notification for teacher
    // Get student data from database
    const student = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { firstName: true, lastName: true },
    });
    
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

    res.status(201).json({
      success: true,
      data: studentCourse,
      message: 'Запрос на доступ отправлен',
    });
  } catch (error) {
    next(error);
  }
};

