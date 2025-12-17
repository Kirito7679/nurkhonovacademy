import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, Settings, Instagram, Youtube, Send, MessageSquare, SquareStack, Link as LinkIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function StudentSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();

  // Базовые пункты меню, доступные всем студентам
  const baseMenuItems = [
    { path: '/dashboard', icon: Home, label: t('dashboard.title') },
    { path: '/courses', icon: BookOpen, label: t('courses.title') },
    { path: '/chat', icon: MessageSquare, label: t('chat.withTeacher') },
    { path: '/profile', icon: Settings, label: t('profile.settings') },
  ];

  // Пункты меню, требующие специального доступа
  // Для студентов проверяем разрешения, для учителей/админов всегда доступны
  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MODERATOR' || user?.role === 'CURATOR';
  const conditionalMenuItems = [
    { 
      path: '/flashcards', 
      icon: SquareStack, 
      label: t('flashcards.title'), 
      requiresAccess: isTeacherOrAdmin || user?.hasFlashcardsAccess 
    },
    { 
      path: '/integrations', 
      icon: LinkIcon, 
      label: t('integrations.title'), 
      requiresAccess: isTeacherOrAdmin || user?.hasIntegrationsAccess 
    },
  ];

  // Фильтруем условные пункты меню на основе доступа
  const availableConditionalItems = conditionalMenuItems.filter(item => item.requiresAccess);

  // Объединяем все доступные пункты меню
  const menuItems = [...baseMenuItems, ...availableConditionalItems];

  const socialLinks = [
    { 
      url: 'https://www.instagram.com/dilmurod_nurkhonov_/', 
      icon: Instagram, 
      label: 'Instagram',
      color: 'hover:text-pink-600'
    },
    { 
      url: 'https://www.youtube.com/@dilmurod_nurkhonov', 
      icon: Youtube, 
      label: 'YouTube',
      color: 'hover:text-red-600'
    },
    { 
      url: 'https://t.me/dilmurod_nurkhonov', 
      icon: Send, 
      label: 'Telegram',
      color: 'hover:text-blue-500'
    },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white/95 backdrop-blur-sm border-r-2 border-primary-200/50 flex flex-col hidden md:flex z-40 shadow-education">
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-primary text-white font-semibold shadow-glow border-l-4 border-white'
                      : 'text-primary-700 hover:text-primary-800 hover:bg-primary-50 border-l-4 border-transparent hover:border-primary-300'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Social Media Links */}
      <div className="mt-auto p-4 border-t-2 border-primary-200/50 space-y-3">
        <div className="flex items-center justify-center gap-3">
          {socialLinks.map((social) => {
            const SocialIcon = social.icon;
            return (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center p-2 rounded-lg transition-all duration-200 text-primary-500 ${social.color} hover:bg-primary-50`}
                aria-label={social.label}
                title={social.label}
              >
                <SocialIcon size={20} />
              </a>
            );
          })}
        </div>
        
        {/* Telegram Support Link */}
        <a
          href="https://t.me/Nurkhonov_Dilmurod"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary-700 hover:text-white hover:bg-gradient-accent transition-all duration-200 group border-2 border-primary-200 hover:border-accent-500 font-semibold shadow-sm hover:shadow-glow"
        >
          <svg
            className="w-5 h-5 group-hover:scale-110 transition-transform"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.375-1.262 8.453-.151.844-.448 1.125-.736 1.152-.641.052-1.127-.423-1.748-.827-.969-.64-1.518-1.038-2.458-1.662-1.08-.72-.38-1.116.236-1.763.163-.168 2.991-2.745 3.043-2.978.006-.032.012-.15-.056-.212-.068-.062-.17-.041-.244-.024-.105.023-1.793 1.14-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.243-1.349-.374-1.297-.789.027-.216.325-.437.895-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.122.099.155.23.171.325.016.095.036.312.02.48z"/>
          </svg>
          <span className="text-sm">{t('common.support', { defaultValue: 'Поддержка' })}</span>
        </a>
      </div>
    </aside>
  );
}
