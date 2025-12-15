import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { validateFile, deleteFile, getFilePath } from '../services/fileService';
import path from 'path';

// Get all students for teacher with chat info (including search)
export const getTeacherChats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'TEACHER' && req.user?.role !== 'ADMIN') {
      throw new AppError('Только преподаватели могут просматривать список чатов', 403);
    }

    const { search } = req.query;
    const teacherId = req.user!.id;

    // Build where clause for students
    const where: any = {
      role: 'STUDENT',
    };

    // Add search filter if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Get all students
    const allStudents = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Get students with their last message and unread count
    const students = await Promise.all(
      allStudents.map(async (student) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: teacherId, receiverId: student.id },
              { senderId: student.id, receiverId: teacherId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: student.id,
            receiverId: teacherId,
            read: false,
          },
        });

        return {
          ...student,
          chatType: 'PRIVATE' as const,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
          } : null,
          unreadCount,
        };
      })
    );

    // Get teacher's classes with their last message
    const classWhere: any = {
      teacherId,
    };

    if (search && typeof search === 'string') {
      classWhere.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        students: {
          where: {
            status: 'APPROVED',
          },
          select: {
            studentId: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get classes with their last message
    const classesWithMessages = await Promise.all(
      classes.map(async (classData) => {
        const lastMessage = await prisma.classMessage.findFirst({
          where: {
            classId: classData.id,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return {
          id: classData.id,
          firstName: classData.name,
          lastName: '',
          phone: '',
          avatarUrl: null,
          chatType: 'GROUP' as const,
          classId: classData.id,
          className: classData.name,
          studentCount: classData._count.students,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            senderName: `${lastMessage.sender.firstName} ${lastMessage.sender.lastName}`,
          } : null,
          unreadCount: 0, // Group chats don't have unread count for now
        };
      })
    );

    // Combine students and classes
    const allChats = [...students, ...classesWithMessages];

    // Sort: chats with messages first (by last message date), then others alphabetically
    const sortedChats = allChats.sort((a, b) => {
      // Chats with messages first
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      
      // If both have messages, sort by date
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      }
      
      // If neither has messages, sort alphabetically
      const nameA = a.chatType === 'GROUP' ? a.className : `${a.firstName} ${a.lastName}`;
      const nameB = b.chatType === 'GROUP' ? b.className : `${b.firstName} ${b.lastName}`;
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    });

    res.json({
      success: true,
      data: sortedChats,
    });
  } catch (error) {
    next(error);
  }
};

// Get chat with specific user (for both student and teacher)
export const getChatMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (!otherUser) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Check access: students can only chat with teachers, teachers can chat with students
    if (req.user?.role === 'STUDENT' && otherUser.role !== 'TEACHER' && otherUser.role !== 'ADMIN') {
      throw new AppError('Студенты могут общаться только с преподавателями', 403);
    }

    if ((req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') && otherUser.role !== 'STUDENT') {
      throw new AppError('Преподаватели могут общаться только со студентами', 403);
    }

    // Get messages between these two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        user: otherUser,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send a message
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { receiverId, content, fileUrl, fileName, fileSize } = req.body;

    if (!receiverId) {
      throw new AppError('Получатель обязателен', 400);
    }

    const trimmedContent = content ? content.trim() : '';
    if (!trimmedContent && !fileUrl) {
      throw new AppError('Сообщение или файл обязательны', 400);
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true },
    });

    if (!receiver) {
      throw new AppError('Получатель не найден', 404);
    }

    // Check access: students can only chat with teachers, teachers can chat with students
    if (req.user?.role === 'STUDENT' && receiver.role !== 'TEACHER' && receiver.role !== 'ADMIN') {
      throw new AppError('Студенты могут общаться только с преподавателями', 403);
    }

    if ((req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') && receiver.role !== 'STUDENT') {
      throw new AppError('Преподаватели могут общаться только со студентами', 403);
    }

    // Create message - ensure content is not empty
    const messageContent = trimmedContent || (fileUrl ? '📎 Файл' : 'Сообщение');
    
    const message = await prisma.message.create({
      data: {
        senderId: req.user!.id,
        receiverId,
        content: messageContent,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ? parseInt(String(fileSize), 10) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// Upload file for message
export const uploadMessageFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError('Файл не предоставлен', 400);
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      await deleteFile(req.file.filename);
      throw new AppError(validation.error!, 400);
    }

    // Create file URL - use message file endpoint
    const fileUrl = `/api/messages/files/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    next(error);
  }
};

// Download message file
export const downloadMessageFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName } = req.params;
    const filePath = getFilePath(fileName);
    const fs = await import('fs/promises');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('Файл не найден', 404);
    }

    // Set proper content type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Send file
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading message file:', err);
        if (!res.headersSent) {
          next(new AppError('Ошибка при скачивании файла', 500));
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get student's teacher (for student chat)
export const getStudentTeacher = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'STUDENT') {
      throw new AppError('Только студенты могут использовать этот endpoint', 403);
    }

    // Get teacher from student's approved courses
    const studentCourse = await prisma.studentCourse.findFirst({
      where: {
        studentId: req.user.id,
        status: 'APPROVED',
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });

    if (!studentCourse) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: studentCourse.course.teacher,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError('Сообщение не найдено', 404);
    }

    // Only sender can delete their own message
    if (message.senderId !== userId) {
      throw new AppError('Вы можете удалять только свои сообщения', 403);
    }

    // Delete file if exists
    if (message.fileUrl) {
      const fileName = message.fileUrl.split('/').pop();
      if (fileName) {
        try {
          await deleteFile(fileName);
        } catch (error) {
          console.error('Error deleting message file:', error);
          // Continue with message deletion even if file deletion fails
        }
      }
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      message: 'Сообщение успешно удалено',
    });
  } catch (error) {
    next(error);
  }
};

