import { AuthRequest } from '../middleware/auth';

/**
 * Проверяет, является ли пользователь администратором
 */
export const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'ADMIN';
};

/**
 * Проверяет, является ли пользователь учителем или администратором
 */
export const isTeacherOrAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
};

/**
 * Проверяет, может ли пользователь выполнить действие с ресурсом
 * ADMIN имеет полные права на все ресурсы
 * TEACHER может работать только со своими ресурсами
 */
export const canAccessResource = (
  req: AuthRequest,
  resourceOwnerId: string
): boolean => {
  if (isAdmin(req)) {
    return true; // ADMIN имеет полные права
  }
  return req.user?.id === resourceOwnerId;
};

/**
 * Проверяет права доступа и выбрасывает ошибку если доступа нет
 */
export const requireAccess = (
  req: AuthRequest,
  resourceOwnerId: string,
  errorMessage: string = 'Недостаточно прав доступа'
): void => {
  if (!canAccessResource(req, resourceOwnerId)) {
    const { AppError } = require('./errors');
    throw new AppError(errorMessage, 403);
  }
};
