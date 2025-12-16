import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { emitClassMessage, emitClassMessageDeleted } from '../services/socketService';

// Получить сообщения группового чата класса
export const getClassMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;
    const userId = req.user!.id;

    // Проверить, что класс существует
    const classData = await prisma.class.findUnique({
      where: { id: classId },
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
          where: {
            studentId: userId,
            status: 'APPROVED',
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    // Проверить доступ: учитель класса, админ или одобренный студент
    const isTeacher = classData.teacherId === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const isApprovedStudent = classData.students.length > 0;

    if (!isTeacher && !isAdmin && !isApprovedStudent) {
      throw new AppError('У вас нет доступа к чату этого класса', 403);
    }

    // Получить сообщения
    const messages = await prisma.classMessage.findMany({
      where: { classId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          teacher: classData.teacher,
        },
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Отправить сообщение в групповой чат
export const sendClassMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;
    const { content, fileUrl, fileName, fileSize } = req.body;
    const userId = req.user!.id;

    if (!content || content.trim().length === 0) {
      throw new AppError('Сообщение не может быть пустым', 400);
    }

    // Проверить, что класс существует
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          where: {
            studentId: userId,
            status: 'APPROVED',
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('Класс не найден', 404);
    }

    // Проверить доступ: учитель класса, админ или одобренный студент
    const isTeacher = classData.teacherId === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const isApprovedStudent = classData.students.length > 0;

    if (!isTeacher && !isAdmin && !isApprovedStudent) {
      throw new AppError('У вас нет доступа к чату этого класса', 403);
    }

    // Создать сообщение
    const message = await prisma.classMessage.create({
      data: {
        classId,
        senderId: userId,
        content: content.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Отправить сообщение через Socket.IO всем участникам чата
    emitClassMessage(classId, message);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Сообщение отправлено',
    });
  } catch (error) {
    next(error);
  }
};

// Удалить сообщение из группового чата
export const deleteClassMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    // Найти сообщение
    const message = await prisma.classMessage.findUnique({
      where: { id: messageId },
      include: {
        class: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!message) {
      throw new AppError('Сообщение не найдено', 404);
    }

    // Проверить права: только отправитель, учитель класса или админ могут удалить
    const isSender = message.senderId === userId;
    const isTeacher = message.class.teacherId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isSender && !isTeacher && !isAdmin) {
      throw new AppError('У вас нет прав для удаления этого сообщения', 403);
    }

    // Сохранить classId перед удалением
    const classId = message.classId;

    // Удалить сообщение
    await prisma.classMessage.delete({
      where: { id: messageId },
    });

    // Уведомить всех участников чата через Socket.IO
    emitClassMessageDeleted(classId, messageId);

    res.json({
      success: true,
      message: 'Сообщение удалено',
    });
  } catch (error) {
    next(error);
  }
};


