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
  deleteFile as deleteLocalFile,
  ensureUploadDir,
} from '../services/fileService';
import { uploadLessonFile as uploadLessonFileToCloudinary, deleteFromCloudinary, extractPublicId } from '../services/cloudinaryService';
import { uploadLessonFile as uploadLessonFileToSupabase, deleteFromSupabase, extractFilePath } from '../services/supabaseStorageService';

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
    fileSize: 100 * 1024 * 1024, // 100MB (увеличено для видео файлов)
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
      await deleteLocalFile(req.file.filename);
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
      await deleteLocalFile(req.file.filename);
      throw new AppError('Урок не найден', 404);
    }

    if (lesson.course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      await deleteLocalFile(req.file.filename);
      throw new AppError('Недостаточно прав для загрузки файлов к этому уроку', 403);
    }

    // Upload to cloud storage if configured, otherwise use local storage
    let fileUrl: string;
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        // Upload to Supabase Storage
        const fileBuffer = await fs.readFile(req.file.path);
        const uploadResult = await uploadLessonFileToSupabase(fileBuffer, req.file.originalname, req.file.mimetype);
        fileUrl = uploadResult.publicUrl;
        
        // Delete local file after upload
        await deleteLocalFile(req.file.filename);
      } catch (supabaseError: any) {
        console.error('Supabase upload error:', supabaseError);
        await deleteLocalFile(req.file.filename);
        
        // If bucket doesn't exist, provide helpful error message
        if (supabaseError.message?.includes('does not exist')) {
          throw new AppError(
            `Bucket 'lessons' не существует в Supabase Storage. Пожалуйста, создайте его в Supabase Dashboard: Storage → Create bucket → 'lessons'`,
            500
          );
        }
        
        // If signature verification failed
        if (supabaseError.message?.includes('signature') || supabaseError.message?.includes('verification')) {
          throw new AppError(
            `Ошибка доступа к Supabase Storage. Проверьте, что установлен правильный SUPABASE_SERVICE_KEY (service_role ключ).`,
            500
          );
        }
        
        throw new AppError(
          `Ошибка при загрузке в Supabase: ${supabaseError.message || 'Неизвестная ошибка'}`,
          500
        );
      }
    } else if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Upload to Cloudinary
      const fileBuffer = await fs.readFile(req.file.path);
      const uploadResult = await uploadLessonFileToCloudinary(fileBuffer, req.file.originalname);
      fileUrl = uploadResult.secure_url;
      
      // Delete local file after upload
      await deleteLocalFile(req.file.filename);
    } else {
      // Use local storage (fallback)
      fileUrl = `/api/files/download/${req.file.filename}`;
    }

    // Decode fileName if it's incorrectly encoded (fix Cyrillic encoding issues)
    let decodedFileName = req.file.originalname;
    try {
      // Check if filename contains mojibake (garbled characters like Đ, Ñ, €, Ð)
      // These appear when UTF-8 is interpreted as Latin-1
      const hasMojibake = /[ĐÑ€Ð£]/.test(req.file.originalname);
      
      if (hasMojibake) {
        // Try to fix double-encoded UTF-8 (common issue with Cyrillic)
        // The file name might be encoded as latin1 but should be utf8
        try {
          // Convert from latin1 (incorrect interpretation) to utf8 (correct)
          decodedFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
          
          // If result still has mojibake, the original was already corrupted
          // Try to reverse the corruption by treating as Windows-1251
          if (/[ĐÑ€Ð£]/.test(decodedFileName)) {
            // Try Windows-1251 encoding (common for Cyrillic)
            try {
              // Create a mapping for common Cyrillic mojibake
              // Đ£ = У, Ñ€ = р, Ð³ = г, Ð° = а, Ð = В, Ð² = в, µ = е, ´ = д, ½ = н, ¸ = и, µ = е
              // This is a workaround - ideally we'd use iconv-lite but let's try without it first
              decodedFileName = Buffer.from(req.file.originalname, 'binary').toString('utf8');
            } catch {
              decodedFileName = req.file.originalname;
            }
          }
        } catch (err) {
          console.error('Error decoding filename:', err);
          decodedFileName = req.file.originalname;
        }
      } else if (req.file.originalname.includes('%')) {
        // Try URL decoding if contains % characters
        try {
          decodedFileName = decodeURIComponent(req.file.originalname);
        } catch {
          decodedFileName = req.file.originalname;
        }
      }
    } catch (err) {
      console.error('Error in filename decoding:', err);
      decodedFileName = req.file.originalname;
    }
    
    // Log for debugging
    if (decodedFileName !== req.file.originalname) {
      console.log(`Filename decoded: "${req.file.originalname}" -> "${decodedFileName}"`);
    }

    // Create file record
    const lessonFile = await prisma.lessonFile.create({
      data: {
        lessonId,
        fileName: decodedFileName,
        fileUrl, // Store Cloudinary URL or local path
        fileSize: req.file.size,
      },
    });
    
    // Update fileUrl to use fileId if local storage
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      fileUrl = `/api/files/download/${lessonFile.id}`;
      await prisma.lessonFile.update({
        where: { id: lessonFile.id },
        data: { fileUrl },
      });
    }

    res.status(201).json({
      success: true,
      data: lessonFile,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    if (req.file) {
      try {
        await deleteLocalFile(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting temporary file:', deleteError);
      }
    }
    
    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return next(error);
    }
    
    // Otherwise, wrap it in AppError
    next(new AppError(
      error.message || 'Ошибка при загрузке файла',
      error.statusCode || 500
    ));
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

    // Check if file is in cloud storage or local storage
    if (lessonFile.fileUrl.includes('supabase.co') || lessonFile.fileUrl.includes('cloudinary.com') || lessonFile.fileUrl.startsWith('http')) {
      // File is in cloud storage - redirect to cloud URL
      return res.redirect(lessonFile.fileUrl);
    } else {
      // Extract filename from fileUrl (it's stored as filename in fileUrl field)
      const fileName = lessonFile.fileUrl.replace('/api/files/download/', '');
      const filePath = getFilePath(fileName);
      
      // Check if file exists locally
      try {
        await fs.access(filePath);
      } catch (error) {
        // File doesn't exist locally - might be in cloud storage but URL wasn't updated
        // Try to return the fileUrl as-is if it's a valid URL
        if (lessonFile.fileUrl.startsWith('http')) {
          return res.redirect(lessonFile.fileUrl);
        }
        // If it's a UUID (fileId), the file might have been moved to cloud storage
        // Return 404 with helpful message
        throw new AppError('Файл не найден. Возможно, он был перемещен в облачное хранилище.', 404);
      }
      
      // Decode fileName for download (fix encoding issues)
      let downloadFileName = lessonFile.fileName;
      try {
        // Check if filename contains mojibake
        if (/[ĐÑ€Ð£]/.test(lessonFile.fileName)) {
          // Try to fix encoding
          downloadFileName = Buffer.from(lessonFile.fileName, 'latin1').toString('utf8');
        }
      } catch {
        downloadFileName = lessonFile.fileName;
      }
      
      // Set proper headers for file download
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      res.download(filePath, downloadFileName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          if (!res.headersSent) {
            next(new AppError('Ошибка при скачивании файла', 500));
          }
        }
      });
    }
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

    // Delete file from cloud storage or local storage
    if (lessonFile.fileUrl.includes('supabase.co')) {
      const fileInfo = extractFilePath(lessonFile.fileUrl);
      if (fileInfo) {
        await deleteFromSupabase(fileInfo.bucket, fileInfo.path);
      }
    } else if (lessonFile.fileUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(lessonFile.fileUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId, 'raw');
      }
    } else {
      const fileName = lessonFile.fileUrl.replace('/api/files/download/', '');
      await deleteLocalFile(fileName);
    }

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

