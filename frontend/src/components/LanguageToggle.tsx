import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
    
    // Save language preference to backend if user is logged in
    if (user) {
      try {
        const response = await api.put('/auth/me', { language: langCode });
        if (response.data.success && response.data.data) {
          // Update user in store
          useAuthStore.getState().updateUser(response.data.data);
        }
      } catch (error) {
        // Silently handle error - language preference is not critical
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium hidden md:inline">
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className="text-sm font-medium md:hidden">
          {currentLanguage.flag}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 z-20">
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors flex items-center gap-2 ${
                    i18n.language === lang.code
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-neutral-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {i18n.language === lang.code && (
                    <span className="ml-auto text-primary-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
