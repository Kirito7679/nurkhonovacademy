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
});

export const lessonSchema = z.object({
  courseId: z.string().uuid('Неверный ID курса'),
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

// YouTube URL validation helper
export const validateYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
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

