import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../utils/errors';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Требуется аутентификация', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Недостаточно прав доступа', 403));
    }

    next();
  };
};

