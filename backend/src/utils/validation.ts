import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export const loginSchema = z.object({
  phone: z.string().min(1, 'Номер телефона обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  language: z.enum(['ru', 'en', 'uz', 'kk']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(6, 'Новый пароль должен содержать минимум 6 символов'),
});

export const courseSchema = z.object({
  title: z.string().min(1, 'Название курса обязательно'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0).default(0),
  trialLessonId: z.string().uuid().optional().or(z.literal('')),
  isVisible: z.boolean().optional().default(true),
  language: z.enum(['ru', 'en', 'uz', 'kk']).optional().default('ru'),
  subscriptionType: z.enum(['FREE', 'TRIAL', 'PAID']).optional(),
  trialPeriodDays: z.number().int().min(0).optional(),
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
  firstName: z.string().min(1, 'Имя обязательно').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').optional(),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов').optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').optional(),
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

