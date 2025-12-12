import prisma from '../config/database';
import { Request } from 'express';

export interface ActivityLogData {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const logActivity = async (data: ActivityLogData) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging should not break the application
  }
};

export const getClientInfo = (req: Request) => {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  };
};
