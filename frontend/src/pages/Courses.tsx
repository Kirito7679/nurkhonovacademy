import { useState, useEffect, memo } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Course, ApiResponse } from '../types';
import { BookOpen, Lock, CheckCircle, ArrowRight, Eye, Grid3x3, List, Search, Filter, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import Skeleton from '../components/Skeleton';
import { getCategoryLabel, getCategoryColor, getLanguageInfo } from '../utils/courseUtils';
import DOMPurify from 'dompurify';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'approved' | 'pending' | 'locked';
type CategoryFilter = 'all' | 'LANGUAGE' | 'BUSINESS' | 'IT' | 'DESIGN' | 'MARKETING' | 'FINANCE' | 'HEALTH' | 'EDUCATION' | 'OTHER';
type SortBy = 'createdAt' | 'title' | 'lessons';

const Courses = memo(function Courses() {
  const { t } = useTranslation();
  
  // Load saved preferences from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('courses_viewMode');
    return (saved as ViewMode) || 'grid';
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const saved = localStorage.getItem('courses_statusFilter');
    return (saved as StatusFilter) || 'all';
  });
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const saved = localStorage.getItem('courses_sortBy');
    return (saved as SortBy) || 'createdAt';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('courses_sortOrder');
    return (saved as 'asc' | 'desc') || 'desc';
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() => {
    const saved = localStorage.getItem('courses_categoryFilter');
    return (saved as CategoryFilter) || 'all';
  });

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('courses_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('courses_statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('courses_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('courses_sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('courses_categoryFilter', categoryFilter);
  }, [categoryFilter]);
  
  const { data: coursesResponse, isLoading } = useQuery(
    ['courses', debouncedSearch, statusFilter, categoryFilter, sortBy, sortOrder],
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await api.get<ApiResponse<Course[]>>(`/courses?${params.toString()}`);
      let courses = response.data.data || [];
      
      // Filter by category on frontend (can be moved to backend later)
      if (categoryFilter !== 'all') {
        courses = courses.filter(course => course.category === categoryFilter);
      }
      
      return courses;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - courses don't change frequently
      cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    }
  );

  const courses = coursesResponse || [];

  const getStatusBadge = (course: Course) => {
    if (course.hasAccess) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
          <CheckCircle className="h-3 w-3 mr-1 text-green-700" />
          {t('students.approved')}
        </span>
      );
    }
    if (course.studentCourseStatus === 'PENDING') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
          {t('students.pending')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
        <Lock className="h-3 w-3 mr-1" />
        {t('courses.locked', { defaultValue: 'Заблокирован' })}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gradient">
            {t('courses.title')}
          </h1>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg p-1 self-start md:self-auto shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-gradient-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-primary-600 hover:bg-neutral-50'
              }`}
              title={t('courses.gridView', { defaultValue: 'Отображать в виде сетки' })}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-gradient-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-primary-600 hover:bg-neutral-50'
              }`}
              title={t('courses.listView', { defaultValue: 'Отображать в виде списка' })}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder={t('courses.searchPlaceholder', { defaultValue: 'Поиск курсов...' })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11 w-full"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[160px]">
            <Filter className={`h-5 w-5 ${statusFilter !== 'all' ? 'text-primary-600' : 'text-neutral-400'} hidden md:block transition-colors`} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={`input-field flex-1 md:flex-none transition-all ${
                statusFilter !== 'all' ? 'border-primary-400 bg-primary-50/50' : ''
              }`}
            >
              <option value="all">{t('courses.allCourses', { defaultValue: 'Все курсы' })}</option>
              <option value="approved">{t('students.approved')}</option>
              <option value="pending">{t('students.pending')}</option>
              <option value="locked">{t('courses.locked', { defaultValue: 'Заблокированные' })}</option>
            </select>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                title="Сбросить фильтр"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[180px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className={`input-field flex-1 sm:flex-none sm:min-w-[180px] transition-all ${
                categoryFilter !== 'all' ? 'border-primary-400 bg-primary-50/50' : ''
              }`}
            >
              <option value="all">{t('courses.allCategories', { defaultValue: 'Все категории' })}</option>
              <option value="LANGUAGE">{getCategoryLabel('LANGUAGE')}</option>
              <option value="BUSINESS">{getCategoryLabel('BUSINESS')}</option>
              <option value="IT">{getCategoryLabel('IT')}</option>
              <option value="DESIGN">{getCategoryLabel('DESIGN')}</option>
              <option value="MARKETING">{getCategoryLabel('MARKETING')}</option>
              <option value="FINANCE">{getCategoryLabel('FINANCE')}</option>
              <option value="HEALTH">{getCategoryLabel('HEALTH')}</option>
              <option value="EDUCATION">{getCategoryLabel('EDUCATION')}</option>
              <option value="OTHER">{getCategoryLabel('OTHER')}</option>
            </select>
            {categoryFilter !== 'all' && (
              <button
                onClick={() => setCategoryFilter('all')}
                className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                title="Сбросить фильтр категории"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[200px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="input-field flex-1 sm:flex-none sm:min-w-[150px]"
            >
              <option value="createdAt">{t('courses.sortByDate', { defaultValue: 'По дате' })}</option>
              <option value="title">{t('courses.sortByTitle', { defaultValue: 'По названию' })}</option>
              <option value="lessons">{t('courses.sortByLessons', { defaultValue: 'По урокам' })}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`px-3 md:px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all text-sm md:text-base flex-shrink-0 ${
                sortOrder === 'asc' ? 'border-primary-400 bg-primary-50/50' : ''
              }`}
              title={sortOrder === 'asc' ? t('courses.sortAsc', { defaultValue: 'По возрастанию' }) : t('courses.sortDesc', { defaultValue: 'По убыванию' })}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <Skeleton height={192} variant="rectangular" />
                  <div className="p-4 md:p-6">
                    <Skeleton height={24} className="mb-2" />
                    <Skeleton height={16} className="mb-4 w-3/4" />
                    <Skeleton height={16} width={100} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-4 md:p-6">
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <Skeleton width={192} height={128} variant="rectangular" className="flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton height={24} className="mb-2" />
                      <Skeleton height={16} className="mb-3 w-2/3" />
                      <Skeleton height={16} width={150} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <BookOpen className="mx-auto h-16 w-16 text-neutral-400 mb-4" />
          <p className="text-neutral-600 mb-4">{t('courses.noCourses')}</p>
          {debouncedSearch && (
            <p className="text-sm text-neutral-500 mt-2">
              {t('courses.tryDifferentSearch', { defaultValue: 'Попробуйте изменить параметры поиска' })}
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {courses.map((course, index) => (
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
                        alt={course.title || 'Course thumbnail'}
                        loading="lazy"
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
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
              <div className="p-5 md:p-6 lg:p-7">
                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors break-words flex-1 leading-tight">
                      {course.title}
                    </h3>
                    <div className="flex-shrink-0">{getStatusBadge(course)}</div>
                  </div>
                  {course.description && (
                    <div 
                      className="text-gray-400 text-sm md:text-base mb-4 line-clamp-3 break-words prose prose-sm max-w-none leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(course.description, { 
                          ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'br', 'span'],
                          ALLOWED_ATTR: ['class']
                        }) 
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <div className="flex items-center text-sm md:text-base text-neutral-500">
                    <BookOpen className="h-4 w-4 md:h-5 md:w-5 mr-2 text-primary-500" />
                    <span>{course._count?.lessons || 0} {t('lessons.lessonsCount', { count: course._count?.lessons || 0, defaultValue: 'уроков' })}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4 md:space-y-6">
          {courses.map((course, index) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="card card-hover group animate-slide-in"
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-5 md:p-6 lg:p-8">
                {course.thumbnailUrl && (
                  <div className="flex-shrink-0 w-full md:w-56 lg:w-64 h-40 md:h-44 lg:h-48 overflow-hidden rounded-lg">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title || 'Course thumbnail'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getLanguageInfo(course.language) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 shadow-sm">
                              <span className="mr-1">{getLanguageInfo(course.language)!.flag}</span>
                              <span>{getLanguageInfo(course.language)!.label}</span>
                            </span>
                          )}
                          {course.category && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getCategoryColor(course.category)}`}>
                              {getCategoryLabel(course.category)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-2 break-words leading-tight">
                          {course.title}
                        </h3>
                        {course.description && (
                          <div 
                            className="text-gray-400 text-sm md:text-base mb-4 line-clamp-3 break-words prose prose-sm max-w-none leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(course.description, { 
                                ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'br', 'span'],
                                ALLOWED_ATTR: ['class']
                              }) 
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-shrink-0 sm:ml-4">
                        {getStatusBadge(course)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <div className="flex items-center text-sm md:text-base text-neutral-500">
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5 mr-2 text-primary-500" />
                      <span>{course._count?.lessons || 0} {t('lessons.lessonsCount', { count: course._count?.lessons || 0, defaultValue: 'уроков' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

export default Courses;
