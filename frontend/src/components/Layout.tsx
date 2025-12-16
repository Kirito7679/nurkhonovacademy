import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import StudentSidebar from './StudentSidebar';
import MobileBottomNav from './MobileBottomNav';
import ToastContainer from './ToastContainer';
import Breadcrumbs from './Breadcrumbs';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'CURATOR';
  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-primary-50/20">
      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>
      <Header />
      <div className="flex">
        {isTeacher && <Sidebar />}
        {isStudent && <StudentSidebar />}
        <main
          id="main-content"
          className={`flex-1 transition-all duration-300 ${
            isTeacher || isStudent ? 'md:ml-64' : ''
          } ${isTeacher || isStudent ? 'pb-20 md:pb-8' : ''}`}
          role="main"
        >
          <div className="container mx-auto px-4 py-4 md:py-8">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
}

