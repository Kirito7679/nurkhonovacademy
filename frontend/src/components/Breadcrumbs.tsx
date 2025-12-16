import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const { user } = useAuthStore();

  // Skip breadcrumbs on main pages
  if (location.pathname === '/dashboard' || location.pathname === '/teacher/dashboard') {
    return null;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Add home
  const homePath = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'CURATOR'
    ? '/teacher/dashboard'
    : '/dashboard';
  breadcrumbs.push({ label: 'Главная', path: homePath });

  // Build breadcrumbs from path
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip numeric IDs and common segments
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's an ID, use previous segment name or generic
      const prevSegment = pathSegments[index - 1];
      if (prevSegment === 'students') {
        breadcrumbs.push({ label: 'Детали студента', path: currentPath });
      } else if (prevSegment === 'courses') {
        breadcrumbs.push({ label: 'Детали курса', path: currentPath });
      } else if (prevSegment === 'lessons') {
        breadcrumbs.push({ label: 'Урок', path: currentPath });
      } else if (prevSegment === 'curators') {
        breadcrumbs.push({ label: 'Детали учителя', path: currentPath });
      } else {
        breadcrumbs.push({ label: 'Детали', path: currentPath });
      }
    } else {
      // Map segment to readable label
      const labels: Record<string, string> = {
        teacher: 'Учитель',
        admin: 'Администратор',
        students: 'Студенты',
        student: 'Студент',
        courses: 'Курсы',
        course: 'Курс',
        lessons: 'Уроки',
        lesson: 'Урок',
        curators: 'Учителя',
        curator: 'Учитель',
        profile: 'Профиль',
        statistics: 'Статистика',
        chats: 'Чаты',
        chat: 'Чат',
        classes: 'Классы',
        class: 'Класс',
        flashcards: 'Флеш-карточки',
        integrations: 'Интеграции',
        practice: 'Практика',
        tests: 'Тесты',
        test: 'Тест',
      };
      
      breadcrumbs.push({
        label: labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath,
      });
    }
  });

  // Don't show breadcrumbs if only home
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="mb-6" aria-label="Хлебные крошки">
      <ol className="flex items-center gap-2 text-sm text-neutral-600 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {index === 0 ? (
                <Link
                  to={crumb.path}
                  className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                  aria-label={crumb.label}
                >
                  <Home className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                  {isLast ? (
                    <span className="text-neutral-900 font-medium" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="hover:text-primary-600 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
