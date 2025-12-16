import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (langCode: string) => {
    // Change language immediately
    await i18n.changeLanguage(langCode);
    
    // Save language to localStorage (for all users, including non-authenticated)
    localStorage.setItem('i18nextLng', langCode);
    
    setIsOpen(false);
    
    // Save language preference to backend if user is logged in
    if (user) {
      try {
        await api.put(`/users/${user.id}`, { language: langCode });
      } catch (error) {
        // Silently handle error - language preference is not critical
      }
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

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
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors flex items-center gap-2 ${
                    i18n.language === lang.code ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700'
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
