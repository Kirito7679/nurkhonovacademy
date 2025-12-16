import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LogOut, User } from 'lucide-react';
import { Role } from '../types';
import NotificationBell from './NotificationBell';
import Logo from './Logo';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isTeacher = user?.role === Role.TEACHER || user?.role === Role.ADMIN || user?.role === Role.CURATOR;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b-2 border-primary-200/50 sticky top-0 z-50 shadow-education">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 py-2">
          <Link 
            to={isTeacher ? '/teacher/dashboard' : '/dashboard'} 
            className="text-lg md:text-xl font-bold text-gradient animate-slide-in flex items-center gap-2 hover:opacity-90 transition-opacity overflow-visible"
          >
            <Logo className="h-10 md:h-12" />
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationBell />
            <div className="hidden md:flex items-center gap-2 text-primary-800 animate-fade-scale bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">
              <div className="relative">
                <User size={20} className="text-primary-600" />
              </div>
              <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-primary-700 hover:text-white hover:bg-gradient-primary rounded-lg transition-all duration-200 border-2 border-primary-300 hover:border-primary-600 text-sm md:text-base font-semibold shadow-sm hover:shadow-glow"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

