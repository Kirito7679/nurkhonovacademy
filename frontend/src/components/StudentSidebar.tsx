import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Settings } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/courses', icon: BookOpen, label: 'Курсы' },
  { path: '/profile', icon: Settings, label: 'Настройки' },
];

export default function StudentSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111827]/50 backdrop-blur-md border-r border-[#1f2937] flex flex-col hidden md:flex z-40">
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
      
      {/* Telegram Support Link */}
      <div className="mt-auto p-4 border-t border-[#1f2937]">
        <a
          href="https://t.me/Nurkhonov_Dilmurod"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-[#39ff14] hover:bg-[#1f2937]/50 hover:shadow-lg hover:shadow-[#39ff14]/20 transition-all duration-300 group"
        >
          <svg
            className="w-5 h-5 group-hover:scale-110 transition-transform"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.375-1.262 8.453-.151.844-.448 1.125-.736 1.152-.641.052-1.127-.423-1.748-.827-.969-.64-1.518-1.038-2.458-1.662-1.08-.72-.38-1.116.236-1.763.163-.168 2.991-2.745 3.043-2.978.006-.032.012-.15-.056-.212-.068-.062-.17-.041-.244-.024-.105.023-1.793 1.14-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.243-1.349-.374-1.297-.789.027-.216.325-.437.895-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.122.099.155.23.171.325.016.095.036.312.02.48z"/>
          </svg>
          <span className="font-mono text-sm">support()</span>
        </a>
      </div>
    </aside>
  );
}
