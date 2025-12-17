import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ApiResponse, Course } from '../types';
import { BookOpen, Plus, Edit, Grid3x3, List } from 'lucide-react';
import { getLanguageInfo, getCategoryLabel, getCategoryColor } from '../utils/courseUtils';

type ViewMode = 'grid' | 'list';

export default function TeacherCourses() {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: coursesResponse, isLoading } = useQuery(
    'teacherCourses',
    async () => {
      const response = await api.get<ApiResponse<Course[]>>('/courses');
      return response.data.data || [];
    }
  );

  const courses = coursesResponse || [];
  const myCourses = courses.filter((course) => course.teacherId === user?.id || user?.role === 'ADMIN');

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          Мои курсы
        </h1>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg p-1 shadow-soft">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-gradient-primary text-white shadow-soft'
                  : 'text-neutral-500 hover:text-primary-600 hover:bg-neutral-50'
              }`}
              title="Отображать в виде сетки"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-gradient-primary text-white shadow-soft'
                  : 'text-neutral-500 hover:text-primary-600 hover:bg-neutral-50'
              }`}
              title="Отображать в виде списка"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          
          <Link
            to="/teacher/courses/new"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Создать курс
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
          </div>
          <p className="mt-4 text-neutral-600">Загрузка курсов...</p>
        </div>
      ) : myCourses.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <BookOpen className="mx-auto h-16 w-16 text-neutral-400 mb-4" />
          <div className="text-neutral-600 mb-4 text-lg">
            Нет курсов
          </div>
          <p className="mt-2 text-sm text-neutral-500 mb-6">
            Создайте свой первый курс
          </p>
          <Link
            to="/teacher/courses/new"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Создать курс
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCourses.map((course, index) => (
            <div
              key={course.id}
              className="card card-hover overflow-hidden group animate-fade-scale"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {course.thumbnailUrl && (
                <div className="relative overflow-hidden">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Tags overlay */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-2 z-10">
                    {getLanguageInfo(course.language) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm">
                        <span className="mr-1">{getLanguageInfo(course.language)!.flag}</span>
                        <span>{getLanguageInfo(course.language)!.label}</span>
                      </span>
                    )}
                    {course.category && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getCategoryColor(course.category)} backdrop-blur-sm shadow-sm`}>
                        {getCategoryLabel(course.category)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-2 break-words">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-neutral-600 text-xs md:text-sm mb-4 line-clamp-2 break-words">{course.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-neutral-500">
                    <BookOpen className="h-4 w-4 mr-2 text-primary-500" />
                    <span>{course._count?.lessons || 0} {course._count?.lessons === 1 ? 'урок' : 'уроков'}</span>
                  </div>
                  <Link
                    to={`/teacher/courses/${course.id}/edit`}
                    className="text-primary-600 hover:text-primary-700 transition-colors group/edit"
                  >
                    <Edit className="h-5 w-5 group-hover/edit:scale-110 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {myCourses.map((course, index) => (
            <div
              key={course.id}
              className="card card-hover group animate-slide-in"
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-4 md:p-6">
                {course.thumbnailUrl && (
                  <div className="flex-shrink-0 w-full md:w-48 h-32 overflow-hidden rounded-lg">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="mb-2">
                    <h3 className="text-lg md:text-xl font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-1 break-words">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-neutral-600 text-xs md:text-sm mb-3 line-clamp-2 break-words">{course.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-neutral-500">
                      <BookOpen className="h-4 w-4 mr-2 text-primary-500" />
                      <span>{course._count?.lessons || 0} {course._count?.lessons === 1 ? 'урок' : 'уроков'}</span>
                    </div>
                    <Link
                      to={`/teacher/courses/${course.id}/edit`}
                      className="group/edit inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-all duration-200 text-sm"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Редактировать</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
