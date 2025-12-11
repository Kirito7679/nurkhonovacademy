import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, User, BarChart3 } from 'lucide-react';

const menuItems = [
  { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/teacher/statistics', icon: BarChart3, label: 'Статистика' },
  { path: '/teacher/students', icon: Users, label: 'Студенты' },
  { path: '/teacher/courses', icon: BookOpen, label: 'Курсы' },
  { path: '/teacher/profile', icon: User, label: 'Профиль' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111827]/50 backdrop-blur-md border-r border-[#1f2937] hidden md:block z-40">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/teacher/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-primary text-black font-medium shadow-lg shadow-[#39ff14]/50 neon-border'
                      : 'text-gray-400 hover:text-[#39ff14] hover:bg-[#1f2937]/50 hover:shadow-lg hover:shadow-[#39ff14]/20'
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
    </aside>
  );
}

