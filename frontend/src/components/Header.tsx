import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Home, Settings, HelpCircle, Zap, Languages } from 'lucide-react';
import { Role } from '../types';
import NotificationBell from './NotificationBell';
import Logo from './Logo';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsProfileMenuOpen(false);
  };

  const isTeacher = user?.role === Role.TEACHER || user?.role === Role.ADMIN || user?.role === Role.CURATOR;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b-2 border-primary-200/50 sticky top-0 z-50 shadow-education">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to={isTeacher ? '/teacher/dashboard' : '/dashboard'} 
            className="text-lg md:text-xl font-bold text-gradient animate-slide-in flex items-center gap-2 hover:opacity-90 transition-opacity overflow-visible -ml-1 md:-ml-0 self-center"
          >
            <Logo className="h-12 md:h-14" />
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationBell />
            <LanguageToggle />
            
            {/* Profile Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-primary-300 hover:border-primary-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 z-50 animate-fade-in-scale">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-neutral-200">
                    <p className="font-semibold text-neutral-900 text-sm">
                      {user?.firstName} {user?.lastName}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-neutral-500 mt-1 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      to={isTeacher ? '/teacher/dashboard' : '/dashboard'}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
                    >
                      <Home size={18} className="text-primary-600" />
                      <span>{t('dashboard.title', { defaultValue: 'Главная' })}</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
                    >
                      <User size={18} className="text-primary-600" />
                      <span>{t('profile.title', { defaultValue: 'Профиль' })}</span>
                    </Link>

                    <Link
                      to="/integrations"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
                    >
                      <Zap size={18} className="text-primary-600" />
                      <span>OSNOVA+</span>
                    </Link>

                    <div className="px-4 py-2">
                      <LanguageToggle />
                    </div>

                    <Link
                      to="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
                    >
                      <Settings size={18} className="text-primary-600" />
                      <span>{t('settings.title', { defaultValue: 'Настройка' })}</span>
                    </Link>

                    <Link
                      to="/support"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 transition-colors"
                    >
                      <HelpCircle size={18} className="text-primary-600" />
                      <span>{t('support.title', { defaultValue: 'Служба поддержки' })}</span>
                    </Link>

                    <div className="border-t border-neutral-200 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>{t('auth.logout', { defaultValue: 'Выйти' })}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

