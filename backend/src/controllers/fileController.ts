import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import {
  validateFile,
  generateFileName,
  getFilePath,
  deleteFile,
  ensureUploadDir,
} from '../services/fileService';

// Configure multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export const uploadFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.body;

    if (!lessonId) {
      throw new AppError('ID урока обязателен', 400);
    }

    if (!req.file) {
      throw new AppError('Файл не предоставлен', 400);
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      await deleteFile(req.file.filename);
      throw new AppError(validation.error!, 400);
    }

    // Check if lesson exists and user has permission
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
      },
    });

    if (!lesson) {
      await deleteFile(req.file.filename);
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      await deleteFile(req.file.filename);
      throw new AppError('Недостаточно прав для загрузки файлов к этому уроку', 403);
    }

    // Create file record
    const lessonFile = await prisma.lessonFile.create({
      data: {
        lessonId,
        fileName: req.file.originalname,
        fileUrl: req.file.filename, // Store filename, we'll use fileId for download
        fileSize: req.file.size,
      },
    });
    
    // Update fileUrl to use fileId
    const fileUrl = `/api/files/download/${lessonFile.id}`;
    await prisma.lessonFile.update({
      where: { id: lessonFile.id },
      data: { fileUrl },
    });

    res.status(201).json({
      success: true,
      data: lessonFile,
    });
  } catch (error) {
    if (req.file) {
      await deleteFile(req.file.filename);
    }
    next(error);
  }
};

export const downloadFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;

    const lessonFile = await prisma.lessonFile.findUnique({
      where: { id: fileId },
      include: {
        lesson: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lessonFile) {
      throw new AppError('Файл не найден', 404);
    }

    // Check access
    let hasAccess = false;
    if (req.user?.role === 'STUDENT') {
      const studentCourse = await prisma.studentCourse.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.id,
            courseId: lessonFile.lesson.courseId,
          },
        },
      });
      hasAccess = studentCourse?.status === 'APPROVED';
      
      const course = await prisma.course.findUnique({
        where: { id: lessonFile.lesson.courseId },
      });
      if (course?.trialLessonId === lessonFile.lessonId) {
        hasAccess = true;
      }
    } else if (req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN') {
      hasAccess = lessonFile.lesson.course.teacherId === req.user.id || req.user.role === 'ADMIN';
    }

    if (!hasAccess) {
      throw new AppError('У вас нет доступа к этому файлу', 403);
    }

    // Extract filename from fileUrl (it's stored as filename in fileUrl field)
    const fileName = lessonFile.fileUrl;
    const filePath = getFilePath(fileName);

    res.download(filePath, lessonFile.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          next(new AppError('Ошибка при скачивании файла', 500));
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName } = req.params;
    const filePath = getFilePath(fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('Файл не найден', 404);
    }

    // Set proper content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Send file with proper headers
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error sending avatar file:', err);
        if (!res.headersSent) {
          next(new AppError('Ошибка при загрузке файла', 500));
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFileById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;

    const lessonFile = await prisma.lessonFile.findUnique({
      where: { id: fileId },
      include: {
        lesson: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lessonFile) {
      throw new AppError('Файл не найден', 404);
    }

    // Check permission
    if (lessonFile.lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления этого файла', 403);
    }

    // Delete file from disk
    const fileName = lessonFile.fileUrl; // fileUrl stores the filename
    await deleteFile(fileName);

    // Delete record from database
    await prisma.lessonFile.delete({
      where: { id: fileId },
    });

    res.json({
      success: true,
      message: 'Файл успешно удален',
    });
  } catch (error) {
    next(error);
  }
};

