import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ru from './locales/ru.json';
import en from './locales/en.json';
import uz from './locales/uz.json';
import kk from './locales/kk.json';

// Get user language from localStorage or user data
const getUserLanguage = () => {
  // First, check localStorage for saved language preference
  try {
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['ru', 'en', 'uz', 'kk'].includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Then, check user data if available
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.language && ['ru', 'en', 'uz', 'kk'].includes(user.language)) {
        // Save to localStorage for consistency
        localStorage.setItem('i18nextLng', user.language);
        return user.language;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
};

// Инициализация i18n синхронно, чтобы гарантировать готовность
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ru: { translation: ru },
        en: { translation: en },
        uz: { translation: uz },
        kk: { translation: kk },
      },
      lng: getUserLanguage() || undefined,
      fallbackLng: 'ru',
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
    });
}

export default i18n;
