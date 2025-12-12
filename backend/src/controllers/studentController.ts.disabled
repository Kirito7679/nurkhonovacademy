import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { updateStudentSchema, createStudentSchema, resetPasswordSchema } from '../utils/validation';
import { createNotification } from './notificationController';

export const createStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким номером телефона уже существует', 400);
    }

    // Generate default password if not provided
    const password = validatedData.password || '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        email: validatedData.email || null,
        password: hashedPassword,
        role: 'STUDENT',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
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

    const where: any = {
      role: 'STUDENT',
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (courseId) {
      where.studentCourses = {
        some: {
          courseId: courseId as string,
          ...(status && { status: status as string }),
        },
      };
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

    // If admin is trying to update, only allow password reset (which is handled by resetStudentPassword endpoint)
    // Admins should not be able to change student profile data
    if (req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER') {
      throw new AppError('Администраторы и преподаватели могут изменять только пароль студента. Для изменения профиля студент должен войти в свой аккаунт.', 403);
    }

    // Only students can update their own profile
    if (req.user?.id !== id) {
      throw new AppError('Вы можете изменять только свой профиль', 403);
    }

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

    const updatedStudentCourse = await prisma.studentCourse.update({
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

    // Create notification for student
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
      `/courses/${courseId}`
    );

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

