import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

// Validation schemas
const createClassSchema = z.object({
  name: z.string().min(1, 'Название класса обязательно'),
  description: z.string().optional(),
  maxStudents: z.number().int().min(1).max(50).default(10),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  language: z.string().optional(),
});

const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maxStudents: z.number().int().min(1).max(50).optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  language: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
});

const addStudentSchema = z.object({
  studentId: z.string().uuid('Неверный ID студента'),
});

export const createClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = createClassSchema.parse(req.body);

    const newClass = await prisma.class.create({
      data: {
        ...validatedData,
        teacherId: req.user!.id,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Класс успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    
    let where: any = {};
    
    if (req.user!.role === 'TEACHER') {
      where.teacherId = req.user!.id;
    } else if (req.user!.role === 'STUDENT') {
      where.students = {
        some: {
          studentId: req.user!.id,
          status: 'APPROVED',
        },
      };
    }
    
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        students: {
          where: req.user!.role === 'TEACHER' ? undefined : {
            studentId: req.user!.id,
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            email: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
                email: true,
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    // Check access
    if (req.user!.role === 'STUDENT') {
      const isEnrolled = classData.students.some(
        (s) => s.studentId === req.user!.id && s.status === 'APPROVED'
      );
      if (!isEnrolled && classData.teacherId !== req.user!.id) {
        throw new AppError('У вас нет доступа к этому классу', 403);
      }
    } else if (req.user!.role === 'TEACHER') {
      if (classData.teacherId !== req.user!.id) {
        throw new AppError('У вас нет доступа к этому классу', 403);
      }
    } else if (req.user!.role !== 'ADMIN') {
      throw new AppError('У вас нет доступа к этому классу', 403);
    }

    res.json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validatedData = updateClassSchema.parse(req.body);

    // Check if class exists and user has permission
    const existingClass = await prisma.class.findUnique({
      where: { id },
    });

    if (!existingClass) {
      throw new AppError('Класс не найден', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для редактирования этого класса', 403);
    }

    // Check maxStudents limit
    if (validatedData.maxStudents) {
      const currentStudentsCount = await prisma.classStudent.count({
        where: {
          classId: id,
          status: 'APPROVED',
        },
      });

      if (validatedData.maxStudents < currentStudentsCount) {
        throw new AppError(
          `Нельзя установить лимит меньше текущего количества студентов (${currentStudentsCount})`,
          400
        );
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: validatedData,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedClass,
      message: 'Класс успешно обновлен',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existingClass = await prisma.class.findUnique({
      where: { id },
    });

    if (!existingClass) {
      throw new AppError('Класс не найден', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления этого класса', 403);
    }

    await prisma.class.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Класс успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

export const addStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { studentId } = addStudentSchema.parse(req.body);

    // Check if class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: {
              where: {
                status: 'APPROVED',
              },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    if (classData.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для добавления студентов', 403);
    }

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new AppError('Студент не найден', 404);
    }

    if (student.role !== 'STUDENT') {
      throw new AppError('Пользователь не является студентом', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: {
          classId: id,
          studentId,
        },
      },
    });

    if (existingEnrollment) {
      throw new AppError('Студент уже добавлен в этот класс', 400);
    }

    // Check max students limit
    if (classData._count.students >= classData.maxStudents) {
      throw new AppError(
        `Достигнут лимит студентов (${classData.maxStudents}). Увеличьте лимит или удалите студента.`,
        400
      );
    }

    // Add student (auto-approve if added by teacher)
    const enrollment = await prisma.classStudent.create({
      data: {
        classId: id,
        studentId,
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            email: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Студент успешно добавлен в класс',
    });
  } catch (error) {
    next(error);
  }
};

export const removeStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, studentId } = req.params;

    // Check if class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    if (classData.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления студентов', 403);
    }

    // Check if enrollment exists
    const enrollment = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: {
          classId: id,
          studentId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError('Студент не найден в этом классе', 404);
    }

    await prisma.classStudent.delete({
      where: {
        classId_studentId: {
          classId: id,
          studentId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Студент успешно удален из класса',
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, studentId } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('Неверный статус', 400);
    }

    // Check if class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: {
              where: {
                status: 'APPROVED',
              },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    if (classData.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    // Check max students if approving
    if (status === 'APPROVED') {
      const currentEnrollment = await prisma.classStudent.findUnique({
        where: {
          classId_studentId: {
            classId: id,
            studentId,
          },
        },
      });

      if (currentEnrollment?.status !== 'APPROVED' && classData._count.students >= classData.maxStudents) {
        throw new AppError(
          `Достигнут лимит студентов (${classData.maxStudents})`,
          400
        );
      }
    }

    const updatedEnrollment = await prisma.classStudent.update({
      where: {
        classId_studentId: {
          classId: id,
          studentId,
        },
      },
      data: {
        status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedEnrollment,
      message: `Статус студента обновлен на ${status}`,
    });
  } catch (error) {
    next(error);
  }
};




