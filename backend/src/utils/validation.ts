import { z } from 'zod';

// Phone validation regex for Uzbekistan format: +998XXXXXXXXX or 998XXXXXXXXX
const phoneRegex = /^(\+?998)?[0-9]{9}$/;

// Password strength validation
const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export const registerSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное'),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная'),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона. Используйте формат: +998XXXXXXXXX или 998XXXXXXXXX'),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры'),
});

export const loginSchema = z.object({
  phone: z.string()
    .min(1, 'Номер телефона обязателен')
    .regex(phoneRegex, 'Неверный формат номера телефона'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная').optional(),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона')
    .optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  language: z.enum(['ru', 'en', 'uz', 'kk']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string()
    .min(6, 'Новый пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры'),
});

export const courseSchema = z.object({
  title: z.string().min(1, 'Название курса обязательно'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0).default(0), // Базовая цена (для обратной совместимости)
  trialLessonId: z.string().uuid().optional().or(z.literal('')),
  isVisible: z.boolean().optional().default(true),
  language: z.enum(['ru', 'en', 'uz', 'kk']).optional().default('ru'),
  category: z.enum(['LANGUAGE', 'BUSINESS', 'IT', 'DESIGN', 'MARKETING', 'FINANCE', 'HEALTH', 'EDUCATION', 'OTHER']).optional(),
  subscriptionType: z.enum(['FREE', 'TRIAL', 'PAID']).optional(),
  trialPeriodDays: z.number().int().min(0).optional(), // Для обратной совместимости
  // Цены для разных периодов подписки
  price30Days: z.number().min(0).optional(),
  price3Months: z.number().min(0).optional(),
  price6Months: z.number().min(0).optional(),
  price1Year: z.number().min(0).optional(),
});

export const moduleSchema = z.object({
  title: z.string().min(1, 'Название модуля обязательно'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

export const lessonSchema = z.object({
  courseId: z.string().uuid('Неверный ID курса'),
  moduleId: z.string().uuid('Неверный ID модуля').optional().or(z.literal('')),
  title: z.string().min(1, 'Название урока обязательно'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

export const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная').optional(),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона')
    .optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры'),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное'),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная'),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры')
    .optional(),
});

// Video URL validation helper (supports multiple sources)
export const validateVideoUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid (optional field)
  
  const lowerUrl = url.toLowerCase();
  
  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }
  
  // Vimeo
  if (lowerUrl.includes('vimeo.com')) {
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    return vimeoRegex.test(url);
  }
  
  // Google Drive
  if (lowerUrl.includes('drive.google.com')) {
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    return driveRegex.test(url);
  }
  
  // VK
  if (lowerUrl.includes('vk.com/video')) {
    const vkRegex = /vk\.com\/video(-?\d+_\d+)/;
    return vkRegex.test(url);
  }
  
  // Direct video URLs (mp4, webm, etc.)
  if (/\.(mp4|webm|ogg|mov|avi|wmv|flv)(\?.*)?$/i.test(url)) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  // Other URLs - validate as URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Legacy function for backward compatibility
export const validateYouTubeUrl = (url: string): boolean => {
  return validateVideoUrl(url);
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const commentSchema = z.object({
  content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий слишком длинный'),
  parentId: z.string().uuid().optional().or(z.literal('')),
});

