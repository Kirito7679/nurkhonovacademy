// Simple i18n utility for backend
// For full i18n support, consider using i18next or similar library

export const supportedLanguages = ['ru', 'en', 'uz'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const defaultLanguage: SupportedLanguage = 'ru';

const translations: Record<SupportedLanguage, Record<string, string>> = {
  ru: {
    'error.unauthorized': 'Требуется аутентификация',
    'error.forbidden': 'Недостаточно прав доступа',
    'error.notFound': 'Ресурс не найден',
    'error.validation': 'Ошибка валидации',
    'success.created': 'Успешно создано',
    'success.updated': 'Успешно обновлено',
    'success.deleted': 'Успешно удалено',
  },
  en: {
    'error.unauthorized': 'Authentication required',
    'error.forbidden': 'Insufficient permissions',
    'error.notFound': 'Resource not found',
    'error.validation': 'Validation error',
    'success.created': 'Successfully created',
    'success.updated': 'Successfully updated',
    'success.deleted': 'Successfully deleted',
  },
  uz: {
    'error.unauthorized': 'Autentifikatsiya talab qilinadi',
    'error.forbidden': 'Yetarli ruxsat yo\'q',
    'error.notFound': 'Resurs topilmadi',
    'error.validation': 'Validatsiya xatosi',
    'success.created': 'Muvaffaqiyatli yaratildi',
    'success.updated': 'Muvaffaqiyatli yangilandi',
    'success.deleted': 'Muvaffaqiyatli o\'chirildi',
  },
};

export const t = (key: string, lang: SupportedLanguage = defaultLanguage): string => {
  return translations[lang]?.[key] || translations[defaultLanguage][key] || key;
};

export const getLanguageFromHeader = (acceptLanguage?: string): SupportedLanguage => {
  if (!acceptLanguage) return defaultLanguage;
  
  const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim().toLowerCase());
  
  for (const lang of languages) {
    if (supportedLanguages.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
    // Check for language prefix (e.g., en-US -> en)
    const prefix = lang.split('-')[0];
    if (supportedLanguages.includes(prefix as SupportedLanguage)) {
      return prefix as SupportedLanguage;
    }
  }
  
  return defaultLanguage;
};
