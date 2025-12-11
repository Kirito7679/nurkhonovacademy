import rateLimit from 'express-rate-limit';

// Rate limiter for API requests
// В режиме разработки лимиты увеличены, в продакшене более строгие
const isDevelopment = process.env.NODE_ENV !== 'production';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 200, // В production увеличен лимит до 200
  message: 'Слишком много запросов с этого IP, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
  // Используем правильный keyGenerator для работы за прокси
  keyGenerator: (req) => {
    // Используем X-Forwarded-For если доступен, иначе обычный IP
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
  },
  skip: (req) => {
    // Пропускаем rate limiting для localhost в режиме разработки
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
});

// Rate limiter for comment creation
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 comments per 15 minutes
  message: 'Слишком много комментариев. Пожалуйста, подождите перед отправкой следующего.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // В production 20 попыток, в dev больше
  message: 'Слишком много попыток входа. Пожалуйста, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  // Используем правильный keyGenerator для работы за прокси
  keyGenerator: (req) => {
    // Используем X-Forwarded-For если доступен, иначе обычный IP
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
  },
});

