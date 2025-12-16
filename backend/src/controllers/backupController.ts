import { Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
// Note: backup script is called via exec to avoid rootDir issues

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

    // Create backup asynchronously using exec to avoid rootDir issues
    const { exec } = require('child_process');
    exec('npm run backup', (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('Backup creation failed:', error);
        return;
      }
      console.log('Backup created successfully');
    });

    // Return immediately - backup runs in background
    res.status(202).json({
      success: true,
      message: 'Резервная копия создается в фоновом режиме',
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

    // List backup files from backups directory
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          fileSize: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50); // Limit to 50 most recent

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};
