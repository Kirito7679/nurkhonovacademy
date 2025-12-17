import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { updateStudentSchema, createStudentSchema, resetPasswordSchema } from '../utils/validation';
import { createNotification } from './notificationController';
import { getLocationFromRequest } from '../services/geolocationService';
import { generateSecurePassword } from '../utils/passwordGenerator';

export const createStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Админ и учителя могут создавать студентов
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TEACHER') {
      throw new AppError('Только администратор или учитель могут создавать студентов', 403);
    }

    const validatedData = createStudentSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким номером телефона уже существует', 400);
    }

    // Generate secure random password if not provided
    // Security: Never use weak default passwords
    const password = validatedData.password || generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get user location from IP (for country tracking)
    const location = await getLocationFromRequest(req);

    // Create student with createdBy field and location
    const student = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'STUDENT',
        createdBy: req.user!.id, // Track who created this student
        city: location.city || undefined,
        region: location.region || undefined,
        country: location.country || undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: {
            studentCourses: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, courseId, status } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const where: any = {
      role: 'STUDENT',
    };

    // Build search conditions
    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } }
      );
    }

    // For teachers, show students they created OR students enrolled in their courses
    if (userRole === 'TEACHER') {
      const teacherConditions: any[] = [
        { createdBy: userId }, // Students created by this teacher
        {
          studentCourses: {
            some: {
              course: {
                teacherId: userId,
              },
            },
          },
        },
      ];

      // If courseId is specified, filter by course and verify teacher owns it
      if (courseId) {
        teacherConditions.push({
          studentCourses: {
            some: {
              courseId: courseId as string,
              course: {
                teacherId: userId, // Verify teacher owns the course
              },
              ...(status && { status: status as string }),
            },
          },
        });
      }

      // Combine search and teacher conditions
      if (searchConditions.length > 0) {
        where.AND = [
          {
            OR: teacherConditions,
          },
          {
            OR: searchConditions,
          },
        ];
      } else {
        where.OR = teacherConditions;
      }
    } else {
      // For admin, apply search if provided
      if (searchConditions.length > 0) {
        where.OR = searchConditions;
      }

      // Filter by courseId if provided (for admin)
      if (courseId) {
        where.studentCourses = {
          some: {
            courseId: courseId as string,
            ...(status && { status: status as string }),
          },
        };
      }
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        studentCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentCourses: true,
            progress: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        hasFlashcardsAccess: true,
        hasIntegrationsAccess: true,
        createdAt: true,
        updatedAt: true,
        studentCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: {
            purchaseRequestedAt: 'desc',
          },
        },
        progress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                courseId: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: {
            watchedAt: 'desc',
          },
        },
      },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = updateStudentSchema.parse(req.body);

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    // Check permissions: ADMIN can update any student, TEACHER cannot update student profile, STUDENT can only update their own
    if (req.user?.role === 'TEACHER') {
      throw new AppError('Учителя могут изменять только пароль студента. Для изменения профиля используйте функцию сброса пароля.', 403);
    }

    if (req.user?.role === 'STUDENT' && req.user?.id !== id) {
      throw new AppError('Вы можете изменять только свой профиль', 403);
    }

    // ADMIN can update any student profile

    // Check if phone is being changed and if it's already taken
    if (validatedData.phone && validatedData.phone !== student.phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone: validatedData.phone },
      });

      if (existingUser) {
        throw new AppError('Номер телефона уже используется', 400);
      }
    }

    const updateData: any = {};
    if (validatedData.firstName !== undefined && validatedData.firstName !== '') {
      updateData.firstName = validatedData.firstName;
    }
    if (validatedData.lastName !== undefined && validatedData.lastName !== '') {
      updateData.lastName = validatedData.lastName;
    }
    if (validatedData.phone !== undefined && validatedData.phone !== '') {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email || null;
    }

    // If no data to update, return current student
    if (Object.keys(updateData).length === 0) {
      const currentStudent = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          updatedAt: true,
        },
      });
      return res.json({
        success: true,
        data: currentStudent,
      });
    }

    const updatedStudent = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedStudent,
    });
  } catch (error) {
    next(error);
  }
};

export const resetStudentPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = resetPasswordSchema.parse(req.body);

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    res.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error) {
    next(error);
  }
};

export const approveCourseAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, courseId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (action !== 'approve' && action !== 'reject') {
      throw new AppError('Неверное действие. Используйте "approve" или "reject"', 400);
    }

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        teacherId: true,
        subscriptionType: true,
        trialPeriodDays: true,
        price30Days: true,
        price3Months: true,
        price6Months: true,
        price1Year: true,
      },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check permission
    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для управления доступом к этому курсу', 403);
    }

    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: id,
          courseId,
        },
      },
    });

    if (!studentCourse) {
      throw new AppError('Запрос на доступ не найден', 404);
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Calculate access dates based on subscription type
      let accessStartDate: Date | null = null;
      let accessEndDate: Date | null = null;

      if (action === 'approve') {
        accessStartDate = new Date(); // Start from now

        // Get subscription period from request body (30_DAYS, 3_MONTHS, 6_MONTHS, 1_YEAR)
        const subscriptionPeriod = req.body.subscriptionPeriod as string | undefined;

        // Set end date based on subscription type and period
        if (course.subscriptionType === 'TRIAL' && course.trialPeriodDays) {
          // Trial period - limited days (legacy support)
          accessEndDate = new Date();
          accessEndDate.setDate(accessEndDate.getDate() + course.trialPeriodDays);
        } else if (course.subscriptionType === 'PAID' && subscriptionPeriod) {
          // Paid subscription with specific period
          accessEndDate = new Date();
          switch (subscriptionPeriod) {
            case '30_DAYS':
              accessEndDate.setDate(accessEndDate.getDate() + 30);
              break;
            case '3_MONTHS':
              accessEndDate.setMonth(accessEndDate.getMonth() + 3);
              break;
            case '6_MONTHS':
              accessEndDate.setMonth(accessEndDate.getMonth() + 6);
              break;
            case '1_YEAR':
              accessEndDate.setFullYear(accessEndDate.getFullYear() + 1);
              break;
            default:
              // If no period specified, unlimited access
              accessEndDate = null;
          }
        } else if (course.subscriptionType === 'PAID' && !subscriptionPeriod) {
          // Paid subscription without period - unlimited access (legacy)
          accessEndDate = null;
        } else if (course.subscriptionType === 'FREE') {
          // Free course - unlimited access
          accessEndDate = null;
        }
        // If subscriptionType is null or undefined, leave accessEndDate as null (unlimited)

        // Validate dates
        if (accessEndDate && accessStartDate && accessEndDate < accessStartDate) {
          throw new AppError('Дата окончания доступа не может быть раньше даты начала', 400);
        }
      }

      const updatedStudentCourse = await tx.studentCourse.update({
        where: {
          studentId_courseId: {
            studentId: id,
            courseId,
          },
        },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedAt: action === 'approve' ? new Date() : null,
          approvedBy: action === 'approve' ? req.user!.id : null,
          accessStartDate: action === 'approve' ? accessStartDate : null,
          accessEndDate: action === 'approve' ? accessEndDate : null,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Create notification for student (inside transaction)
      const notificationType = action === 'approve' ? 'COURSE_APPROVED' : 'COURSE_REJECTED';
      const notificationTitle = action === 'approve' 
        ? 'Доступ к курсу одобрен' 
        : 'Запрос на доступ отклонен';
      const notificationMessage = action === 'approve'
        ? `Вам предоставлен доступ к курсу "${course.title}"`
        : `Ваш запрос на доступ к курсу "${course.title}" был отклонен`;
      
      await createNotification(
        id,
        notificationType,
        notificationTitle,
        notificationMessage,
        `/courses/${courseId}`,
        tx // Pass transaction client
      );

      return updatedStudentCourse;
    });

    const updatedStudentCourse = result;
    
    // Emit socket notification after transaction commits
    if (updatedStudentCourse) {
      const notificationType = action === 'approve' ? 'COURSE_APPROVED' : 'COURSE_REJECTED';
      const notificationTitle = action === 'approve' 
        ? 'Доступ к курсу одобрен' 
        : 'Запрос на доступ отклонен';
      const notificationMessage = action === 'approve'
        ? `Вам предоставлен доступ к курсу "${course.title}"`
        : `Ваш запрос на доступ к курсу "${course.title}" был отклонен`;
      
      // Re-fetch notification to emit via socket
      const notification = await prisma.notification.findFirst({
        where: {
          userId: id,
          type: notificationType,
          title: notificationTitle,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (notification) {
        const { emitNotification } = await import('../services/socketService');
        emitNotification(id, notification);
      }
    }

    res.json({
      success: true,
      data: updatedStudentCourse,
      message: action === 'approve' ? 'Доступ к курсу одобрен' : 'Доступ к курсу отклонен',
    });
  } catch (error) {
    next(error);
  }
};

export const assignCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, courseId } = req.params;
    const { accessStartDate, accessEndDate } = req.body;

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherId: true },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check permission - ADMIN может прикреплять любые курсы, TEACHER только свои
    if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
      throw new AppError('Недостаточно прав для прикрепления этого курса', 403);
    }

    // Validate dates if provided
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (accessStartDate) {
      startDate = new Date(accessStartDate);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Неверный формат даты начала доступа', 400);
      }
    }

    if (accessEndDate) {
      endDate = new Date(accessEndDate);
      if (isNaN(endDate.getTime())) {
        throw new AppError('Неверный формат даты окончания доступа', 400);
      }
      if (startDate && endDate < startDate) {
        throw new AppError('Дата окончания не может быть раньше даты начала', 400);
      }
    }

    // Check if already assigned
    const existing = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: id,
          courseId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        // Update existing assignment with new dates
        const updated = await prisma.studentCourse.update({
          where: {
            studentId_courseId: {
              studentId: id,
              courseId,
            },
          },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: req.user!.id,
            accessStartDate: startDate,
            accessEndDate: endDate,
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

        // Create notification for student
        await createNotification(
          id,
          'COURSE_APPROVED',
          'Доступ к курсу обновлен',
          `Вам обновлен доступ к курсу "${course.title}"`,
          `/courses/${courseId}`
        );

        return res.json({
          success: true,
          data: updated,
          message: 'Доступ к курсу обновлен',
        });
      }
      // Update existing request to approved
      const updated = await prisma.studentCourse.update({
        where: {
          studentId_courseId: {
            studentId: id,
            courseId,
          },
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: req.user!.id,
          accessStartDate: startDate,
          accessEndDate: endDate,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Create notification for student
      await createNotification(
        id,
        'COURSE_APPROVED',
        'Доступ к курсу предоставлен',
        `Вам предоставлен доступ к курсу "${course.title}"`,
        `/courses/${courseId}`
      );

      return res.json({
        success: true,
        data: updated,
        message: 'Доступ к курсу назначен',
      });
    }

    // Create new assignment
    const studentCourse = await prisma.studentCourse.create({
      data: {
        studentId: id,
        courseId,
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user!.id,
        accessStartDate: startDate,
        accessEndDate: endDate,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create notification for student
    const dateMessage = endDate 
      ? ` с ${startDate ? startDate.toLocaleDateString('ru-RU') : 'сегодня'} по ${endDate.toLocaleDateString('ru-RU')}`
      : startDate 
        ? ` с ${startDate.toLocaleDateString('ru-RU')} (бессрочно)`
        : ' (бессрочно)';

    await createNotification(
      id,
      'COURSE_APPROVED',
      'Доступ к курсу предоставлен',
      `Вам предоставлен доступ к курсу "${course.title}"${dateMessage}`,
      `/courses/${courseId}`
    );

    res.status(201).json({
      success: true,
      data: studentCourse,
      message: 'Курс успешно назначен студенту',
    });
  } catch (error) {
    next(error);
  }
};

export const detachCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, courseId } = req.params;

    // Get course to check ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      throw new AppError('Курс не найден', 404);
    }

    // Check permission - ADMIN может откреплять любые курсы, TEACHER только свои
    if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
      throw new AppError('Недостаточно прав для открепления этого курса', 403);
    }

    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: id,
          courseId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!studentCourse) {
      throw new AppError('Курс не прикреплен к этому студенту', 404);
    }

    // Delete the course assignment
    await prisma.studentCourse.delete({
      where: {
        studentId_courseId: {
          studentId: id,
          courseId,
        },
      },
    });

    // Create notification for student
    await createNotification(
      id,
      'COURSE_REJECTED',
      'Доступ к курсу отозван',
      `У вас отозван доступ к курсу "${studentCourse.course.title}"`,
      '/courses'
    );

    res.json({
      success: true,
      message: 'Курс успешно откреплен от студента',
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    const progress = await prisma.studentProgress.findMany({
      where: { studentId: id },
      include: {
        lesson: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        watchedAt: 'desc',
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

export const deleteStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Only ADMIN can delete students
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Только администраторы могут удалять студентов', 403);
    }

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
      include: {
        _count: {
          select: {
            studentCourses: true,
            progress: true,
            sentMessages: true,
            receivedMessages: true,
            comments: true,
          },
        },
      },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    // Check if student has any important data
    const totalMessages = (student._count.sentMessages || 0) + (student._count.receivedMessages || 0);
    const hasData = 
      student._count.studentCourses > 0 ||
      student._count.progress > 0 ||
      totalMessages > 0 ||
      student._count.comments > 0;

    if (hasData) {
      // For safety, we could implement soft delete or require confirmation
      // For now, we'll delete with cascade (Prisma will handle related records)
    }

    // Delete student (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Студент успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

// Extend subscription for a course
export const extendSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
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
      throw new AppError('Подписка на курс не найдена', 404);
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

    // Update student course with new end date
    // Note: In real implementation, you would process payment first
    // For now, we'll just update the dates
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

