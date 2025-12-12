import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, User, BarChart3, Settings, Instagram, Youtube, Send, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';

  if (!isTeacher && !isStudent) {
    return null;
  }

  const teacherMenuItems = [
    { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'Панель' },
    { path: '/teacher/statistics', icon: BarChart3, label: 'Статистика' },
    { path: '/teacher/students', icon: Users, label: 'Студенты' },
    { path: '/teacher/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/teacher/chats', icon: MessageSquare, label: 'Чаты' },
  ];

  const studentMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Панель' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/chat', icon: MessageSquare, label: 'Чат' },
    { path: '/profile', icon: Settings, label: 'Настройки' },
  ];

  const menuItems = isTeacher ? teacherMenuItems : studentMenuItems;

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-primary-200/50 z-50 md:hidden safe-area-bottom shadow-education">
      <div className="flex flex-col">
        <div className="flex items-center justify-around px-1 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/teacher/dashboard' &&
                item.path !== '/dashboard' &&
                location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-200 min-w-[50px] flex-1 ${
                  isActive
                    ? 'text-white bg-gradient-primary shadow-glow'
                    : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-all duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                <span className={`text-[9px] md:text-[10px] leading-tight text-center ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-white rounded-full shadow-sm"></div>
                )}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-primary-100">
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
              >
                <SocialIcon size={18} />
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

