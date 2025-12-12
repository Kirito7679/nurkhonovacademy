/**
 * Helper utilities for i18n translations
 * Use this file to add common translation patterns
 */

import { TFunction } from 'i18next';

/**
 * Get translated error message
 */
export const getTranslatedError = (t: TFunction, error: any): string => {
  if (typeof error === 'string') {
    // Try to find translation key
    const errorKey = `errors.${error.toLowerCase().replace(/\s+/g, '')}`;
    const translated = t(errorKey, { defaultValue: error });
    return translated;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  return t('errors.somethingWentWrong');
};

/**
 * Format date with translation
 */
export const formatDate = (t: TFunction, date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(t('common.locale') || 'ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

/**
 * Format number with translation
 */
export const formatNumber = (t: TFunction, num: number): string => {
  return new Intl.NumberFormat(t('common.locale') || 'ru-RU').format(num);
};
