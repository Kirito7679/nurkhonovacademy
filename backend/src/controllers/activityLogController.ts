import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

export const getActivityLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only admins and moderators can view activity logs
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав для просмотра логов', 403);
    }

    const { userId, action, entityType, limit = 100, offset = 0 } = req.query;

    const where: any = {};
    if (userId) where.userId = userId as string;
    if (action) where.action = action as string;
    if (entityType) where.entityType = entityType as string;

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.activityLog.count({ where });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserActivityLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    // Users can only view their own logs, or admins/moderators can view any
    if (userId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
      throw new AppError('Недостаточно прав', 403);
    }

    const logs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
