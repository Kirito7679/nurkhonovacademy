import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Course, ApiResponse } from '../types';
import { BookOpen, Clock, CheckCircle, TrendingUp, Award, PlayCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import StoriesCarousel from '../components/StoriesCarousel';
import Banner from '../components/Banner';

interface StudentStats {
  totalCourses: number;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  overallProgress: number;
  recentActivity: Array<{
    id: string;
    completed: boolean;
    watchedAt: string | null;
    lesson: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
      };
    };
  }>;
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const { data: coursesResponse, isLoading: coursesLoading } = useQuery('myCourses', async () => {
    const response = await api.get<ApiResponse<Course[]>>('/courses');
    return response.data.data || [];
  });

  const { data: statsResponse, isLoading: statsLoading } = useQuery(
    'myStats',
    async () => {
      const response = await api.get<ApiResponse<StudentStats>>('/auth/me/stats');
      return response.data.data;
    }
  );

  const courses = coursesResponse || [];
  const myCourses = courses.filter((course) => course.hasAccess);
  const stats = statsResponse || {
    totalCourses: 0,
    totalLessons: 0,
    completedLessons: 0,
    inProgressLessons: 0,
    overallProgress: 0,
    recentActivity: [],
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning', { defaultValue: 'Доброе утро' });
    if (hour < 18) return t('dashboard.goodAfternoon', { defaultValue: 'Добрый день' });
    return t('dashboard.goodEvening', { defaultValue: 'Добрый вечер' });
  };

  return (
    <div>
      {/* Banner Top */}
      <Banner position="TOP" />

      {/* Stories Carousel */}
      <div className="mb-6">
        <StoriesCarousel />
      </div>

      {/* Greeting Section */}
      <div className="mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gradient mb-2">
          {getGreeting()}, {user?.firstName}!
        </h1>
        <p className="text-primary-700 text-sm md:text-base lg:text-lg font-medium">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="card p-6 animate-fade-scale bg-gradient-to-br from-primary-50 to-blue-50" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-700 text-sm mb-1 font-semibold">
                  {t('dashboard.totalCourses', { defaultValue: 'Всего курсов' })}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-primary-900">
                  {stats.totalCourses}
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale bg-gradient-to-br from-accent-50 to-emerald-50" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-700 text-sm mb-1 font-semibold">
                  {t('dashboard.completedLessons', { defaultValue: 'Завершено уроков' })}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-accent-900">
                  {stats.completedLessons}
                  <span className="text-accent-600 text-lg">/{stats.totalLessons}</span>
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale bg-gradient-to-br from-education-50 to-purple-50" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-education-700 text-sm mb-1 font-semibold">
                  {t('dashboard.overallProgress', { defaultValue: 'Общий прогресс' })}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-education-900">
                  {stats.overallProgress}
                  <span className="text-education-600 text-lg">%</span>
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-education flex items-center justify-center shadow-glow">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="mt-4 w-full bg-primary-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-education h-full transition-all duration-500 shadow-sm"
                style={{ width: `${stats.overallProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale bg-gradient-to-br from-primary-50 to-indigo-50" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-700 text-sm mb-1 font-semibold">
                  В процессе
                </p>
                <p className="text-2xl md:text-3xl font-bold text-primary-900">
                  {stats.inProgressLessons}
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <PlayCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!statsLoading && stats.recentActivity.length > 0 && (
        <div className="card p-6 mb-8 animate-fade-scale">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-primary-900">
              {t('dashboard.recentActivity')}
            </h2>
          </div>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 bg-gradient-to-r from-primary-50/50 to-transparent rounded-lg border-2 border-primary-200 hover:border-primary-400 transition-all animate-slide-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0 shadow-glow">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary-900 font-semibold break-words text-sm md:text-base">
                    {activity.lesson.title}
                  </p>
                  <p className="text-primary-700 text-xs md:text-sm break-words">
                    {activity.lesson.course.title}
                  </p>
                </div>
                {activity.watchedAt && (
                  <div className="text-primary-600 text-xs font-medium bg-primary-100 px-2 py-1 rounded">
                    {new Date(activity.watchedAt).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Courses Section */}
      <div className="relative mb-8 animate-slide-in">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient mb-2">
          {t('courses.myCourses')}
        </h2>
        <div className="absolute top-0 right-0 text-xs text-primary-700 font-semibold bg-primary-100 px-2 py-1 rounded">
          {myCourses.length} {t('courses.coursesCount', { count: myCourses.length, defaultValue: myCourses.length === 1 ? 'курс' : 'курсов' })}
        </div>
      </div>

      {coursesLoading ? (
        <div className="text-center py-12">
          <div className="inline-block relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-300 border-t-primary-600"></div>
          </div>
          <p className="mt-4 text-primary-700 font-medium">Загрузка курсов...</p>
        </div>
      ) : myCourses.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <BookOpen className="mx-auto h-16 w-16 text-primary-300 mb-4" />
          <p className="text-primary-700 mb-4 text-lg font-semibold">
            {t('courses.noAccess', { defaultValue: 'У вас пока нет доступа к курсам' })}
          </p>
          <Link
            to="/courses"
            className="btn-primary inline-flex items-center"
          >
            {t('courses.allCourses')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {myCourses.map((course, index) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="card card-hover overflow-hidden group animate-fade-scale"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {course.thumbnailUrl && (
                <div className="relative overflow-hidden">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              )}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-primary-900 mb-2 group-hover:text-primary-700 transition-colors break-words">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-primary-700 text-xs md:text-sm mb-4 line-clamp-2 break-words">{course.description}</p>
                )}
                <div className="flex items-center text-sm text-primary-600 font-medium">
                  <BookOpen className="h-4 w-4 mr-2 text-primary-500" />
                  <span>{course._count?.lessons || 0} {t('lessons.lessonsCount', { count: course._count?.lessons || 0, defaultValue: course._count?.lessons === 1 ? 'урок' : 'уроков' })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
