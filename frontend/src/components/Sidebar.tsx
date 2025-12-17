import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Users, BookOpen, User, BarChart3, Instagram, Youtube, Send, MessageSquare, SquareStack, FileText, Link as LinkIcon, GraduationCap, UserCog } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  
  const menuItems: Array<{
    path: string;
    icon: any;
    label: string;
    roles?: string[];
  }> = [
    { path: '/teacher/dashboard', icon: Home, label: t('dashboard.title') },
    { path: '/teacher/statistics', icon: BarChart3, label: t('dashboard.statistics') },
    { path: '/teacher/students', icon: Users, label: t('students.title') },
    { path: '/teacher/courses', icon: BookOpen, label: t('courses.title') },
    { path: '/teacher/classes', icon: GraduationCap, label: 'Групповые классы' },
    { path: '/teacher/chats', icon: MessageSquare, label: t('chat.withStudent') },
    { path: '/admin/curators', icon: UserCog, label: 'Учителя', roles: ['ADMIN'] },
    { path: '/teacher/profile', icon: User, label: t('profile.title') },
  ];

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
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white/95 backdrop-blur-sm border-r-2 border-primary-200/50 hidden md:flex md:flex-col z-40 shadow-education">
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/teacher/dashboard' && location.pathname.startsWith(item.path));
            
            // Проверка прав доступа для пункта меню
            if (item.roles && !item.roles.includes(user?.role || '')) {
              return null;
            }
            
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
      <div className="mt-auto p-4 border-t-2 border-primary-200/50">
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
      </div>
    </aside>
  );
}

