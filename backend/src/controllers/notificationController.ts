import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { emitNotification } from '../services/socketService';

// Get all notifications for the current user
export const getMyNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.notification.count({
      where: {
        userId,
      },
    });

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error in getMyNotifications:', error);
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError('Уведомление не найдено', 404);
    }

    if (notification.userId !== userId) {
      throw new AppError('У вас нет прав для этого действия', 403);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.json({
      success: true,
      message: 'Уведомление отмечено как прочитанное',
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      message: 'Все уведомления отмечены как прочитанные',
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    next(error);
  }
};

// Delete all notifications
export const deleteAllNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const deletedCount = await prisma.notification.deleteMany({
      where: {
        userId,
      },
    });

    res.json({
      success: true,
      message: `Удалено уведомлений: ${deletedCount.count}`,
      data: {
        deletedCount: deletedCount.count,
      },
    });
  } catch (error) {
    console.error('Error in deleteAllNotifications:', error);
    next(error);
  }
};

// Helper function to create notification
export const createNotification = async (
  userId: string,
  type: 'COMMENT' | 'COURSE_REQUEST' | 'COURSE_APPROVED' | 'COURSE_REJECTED',
  title: string,
  message: string,
  link?: string
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });

    // Emit real-time notification via WebSocket
    emitNotification(userId, notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw error, notifications are not critical
  }
};

