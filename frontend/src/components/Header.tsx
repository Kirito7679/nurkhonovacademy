import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User } from 'lucide-react';
import { Role } from '../types';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isTeacher = user?.role === Role.TEACHER || user?.role === Role.ADMIN;

  return (
    <header className="bg-[#111827]/90 backdrop-blur-md border-b border-[#1f2937] sticky top-0 z-50 particle-bg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to={isTeacher ? '/teacher/dashboard' : '/dashboard'} 
            className="text-lg md:text-xl font-bold text-gradient neon-glow animate-slide-in font-mono"
          >
            <span className="hidden sm:inline">&lt;Nurkhonov Academy /&gt;</span>
            <span className="sm:hidden">&lt;NA /&gt;</span>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationBell />
            <div className="hidden md:flex items-center gap-2 text-gray-300 animate-fade-scale">
              <div className="relative">
                <User size={20} className="text-[#39ff14] animate-pulse-glow" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#39ff14] rounded-full animate-ping"></span>
              </div>
              <span className="font-mono">{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="glow-button flex items-center gap-2 px-3 md:px-4 py-2 text-gray-300 hover:text-[#39ff14] hover:bg-[#1f2937] rounded-lg transition-all duration-200 border border-[#374151] hover:border-[#39ff14] hover:neon-border relative z-10 font-mono text-sm md:text-base"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">logout()</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

