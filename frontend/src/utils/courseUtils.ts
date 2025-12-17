// Утилиты для работы с курсами

export type CourseCategory = 'LANGUAGE' | 'BUSINESS' | 'IT' | 'DESIGN' | 'MARKETING' | 'FINANCE' | 'HEALTH' | 'EDUCATION' | 'OTHER';

export const categoryLabels: Record<CourseCategory, string> = {
  LANGUAGE: 'Языковые',
  BUSINESS: 'Бизнес',
  IT: 'IT и программирование',
  DESIGN: 'Дизайн',
  MARKETING: 'Маркетинг',
  FINANCE: 'Финансы',
  HEALTH: 'Здоровье',
  EDUCATION: 'Образование',
  OTHER: 'Другое',
};

export const categoryColors: Record<CourseCategory, string> = {
  LANGUAGE: 'bg-blue-100 text-blue-700 border-blue-200',
  BUSINESS: 'bg-purple-100 text-purple-700 border-purple-200',
  IT: 'bg-green-100 text-green-700 border-green-200',
  DESIGN: 'bg-pink-100 text-pink-700 border-pink-200',
  MARKETING: 'bg-orange-100 text-orange-700 border-orange-200',
  FINANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  HEALTH: 'bg-red-100 text-red-700 border-red-200',
  EDUCATION: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  OTHER: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

export const languageLabels: Record<string, { label: string; flag: string }> = {
  ru: { label: 'Русский', flag: '🇷🇺' },
  en: { label: 'English', flag: '🇺🇸' },
  uz: { label: "O'zbek", flag: '🇺🇿' },
  kk: { label: 'Қазақша', flag: '🇰🇿' },
};

export const getCategoryLabel = (category: CourseCategory | null | undefined): string | null => {
  if (!category) return null;
  return categoryLabels[category] || null;
};

export const getCategoryColor = (category: CourseCategory | null | undefined): string => {
  if (!category) return categoryColors.OTHER;
  return categoryColors[category] || categoryColors.OTHER;
};

export const getLanguageInfo = (language: string | null | undefined): { label: string; flag: string } | null => {
  if (!language) return null;
  return languageLabels[language] || null;
};
