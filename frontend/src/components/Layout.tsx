import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import StudentSidebar from './StudentSidebar';
import MobileBottomNav from './MobileBottomNav';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-blue-50/30 to-emerald-50/20">
      <Header />
      <div className="flex">
        {isTeacher && <Sidebar />}
        {isStudent && <StudentSidebar />}
        <main
          className={`flex-1 transition-all duration-300 ${
            isTeacher || isStudent ? 'md:ml-64' : ''
          } ${isTeacher || isStudent ? 'pb-20 md:pb-8' : ''}`}
        >
          <div className="container mx-auto px-4 py-4 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

