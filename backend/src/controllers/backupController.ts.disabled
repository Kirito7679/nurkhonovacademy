import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

export const createBackup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only admins can create backups
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    const { type = 'MANUAL' } = req.body;

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        type,
        status: 'IN_PROGRESS',
        createdBy: req.user!.id,
      },
    });

    // In a real implementation, you would:
    // 1. Export database data
    // 2. Compress files
    // 3. Upload to cloud storage (S3, etc.)
    // 4. Update backup record with file URL

    // For now, we'll just mark it as completed
    // In production, this should be done asynchronously
    const updatedBackup = await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        // fileUrl: 'https://...', // URL to backup file
        // fileSize: 1024, // Size in bytes
      },
    });

    res.status(201).json({
      success: true,
      data: updatedBackup,
      message: 'Резервная копия создана успешно',
    });
  } catch (error) {
    next(error);
  }
};

export const getBackups = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    next(error);
  }
};
