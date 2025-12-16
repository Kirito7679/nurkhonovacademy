import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../utils/errors';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log('❌ Role check failed: No user in request');
      return next(new AppError('Требуется аутентификация', 401));
    }

    const userRole = req.user.role?.toUpperCase().trim();
    const normalizedRoles = roles.map(r => r.toUpperCase().trim());
    const hasAccess = normalizedRoles.includes(userRole);
    
    if (!hasAccess) {
      console.log(`❌ Role check failed: User role "${userRole}" not in allowed roles: [${normalizedRoles.join(', ')}]`);
      console.log(`   Request path: ${req.method} ${req.path}`);
      console.log(`   User ID: ${req.user.id}`);
      return next(new AppError(`Недостаточно прав доступа. Ваша роль: ${userRole}. Требуемые роли: ${normalizedRoles.join(', ')}`, 403));
    }

    console.log(`✅ Role check passed: User role "${userRole}" is allowed for ${req.method} ${req.path}`);
    next();
  };
};

