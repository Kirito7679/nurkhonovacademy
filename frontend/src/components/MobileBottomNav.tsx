import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, User, BarChart3, Settings } from 'lucide-react';
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
    { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/teacher/statistics', icon: BarChart3, label: 'Статистика' },
    { path: '/teacher/students', icon: Users, label: 'Студенты' },
    { path: '/teacher/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/teacher/profile', icon: User, label: 'Профиль' },
  ];

  const studentMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/profile', icon: Settings, label: 'Настройки' },
  ];

  const menuItems = isTeacher ? teacherMenuItems : studentMenuItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111827]/95 backdrop-blur-md border-t border-[#374151] z-50 md:hidden safe-area-bottom">
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
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-300 min-w-[50px] flex-1 ${
                isActive
                  ? 'text-[#39ff14] bg-[#1f2937]/50'
                  : 'text-gray-400 hover:text-[#39ff14]'
              }`}
            >
              <Icon
                size={20}
                className={`transition-all duration-300 ${
                  isActive ? 'scale-110 animate-pulse-glow' : ''
                }`}
              />
              <span className="text-[9px] md:text-[10px] font-mono leading-tight text-center">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#39ff14] rounded-full animate-pulse-glow"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

