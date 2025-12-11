import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Course, ApiResponse } from '../types';
import { BookOpen, Lock, CheckCircle, ArrowRight, Eye, Grid3x3, List, Search, Filter } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import Skeleton from '../components/Skeleton';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'approved' | 'pending' | 'locked';
type SortBy = 'createdAt' | 'title' | 'lessons';

export default function Courses() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { data: coursesResponse, isLoading } = useQuery(
    ['courses', debouncedSearch, statusFilter, sortBy, sortOrder],
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await api.get<ApiResponse<Course[]>>(`/courses?${params.toString()}`);
      return response.data.data || [];
    }
  );

  const courses = coursesResponse || [];

  const getStatusBadge = (course: Course) => {
    if (course.hasAccess) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neon-glow/20 text-neon-glow border border-neon-glow/50 neon-glow font-mono animate-pulse-glow">
          <CheckCircle className="h-3 w-3 mr-1" />
          approved
        </span>
      );
    }
    if (course.studentCourseStatus === 'PENDING') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono">
          pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1f2937] text-gray-400 border border-[#374151] font-mono">
        <Lock className="h-3 w-3 mr-1" />
        locked
      </span>
    );
  };

  return (
    <div className="code-bg particle-bg">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl md:text-5xl font-bold text-gradient neon-glow font-mono">
            <span className="text-[#39ff14]">const</span> courses <span className="text-[#39ff14]">=</span> <span className="text-white">[]</span>;
          </h1>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#111827] border border-[#374151] rounded-lg p-1 self-start md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-gradient-primary text-black shadow-lg shadow-[#39ff14]/50'
                : 'text-gray-400 hover:text-[#39ff14] hover:bg-[#1f2937]'
            }`}
            title="Отображать в виде сетки"
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-gradient-primary text-black shadow-lg shadow-[#39ff14]/50'
                : 'text-gray-400 hover:text-[#39ff14] hover:bg-[#1f2937]'
            }`}
            title="Отображать в виде списка"
          >
            <List className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск курсов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono text-sm md:text-base"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400 hidden md:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono text-sm md:text-base"
            >
              <option value="all">Все курсы</option>
              <option value="approved">Доступные</option>
              <option value="pending">Ожидающие</option>
              <option value="locked">Заблокированные</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono text-sm md:text-base"
            >
              <option value="createdAt">По дате</option>
              <option value="title">По названию</option>
              <option value="lessons">По урокам</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 md:px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white hover:border-[#39ff14] transition-colors font-mono text-sm md:text-base"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

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
          <BookOpen className="mx-auto h-16 w-16 text-gray-600 mb-4 animate-pulse-glow" />
          <div className="font-mono text-gray-400 mb-4">
            <span className="text-[#39ff14]">if</span>{' '}
            <span className="text-white">(courses.length === 0)</span>{' '}
            <span className="text-[#39ff14]">return</span>{' '}
            <span className="text-gray-500">'Нет доступных курсов'</span>;
          </div>
          {debouncedSearch && (
            <p className="text-sm text-gray-500 font-mono mt-2">
              <span className="text-[#39ff14]">//</span> Попробуйте изменить параметры поиска
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {courses.map((course, index) => (
            <div
              key={course.id}
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
                </div>
              )}
              <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <h3 className="text-lg md:text-xl font-semibold text-white font-mono group-hover:text-[#39ff14] transition-colors break-words flex-1">
                    {course.title}
                  </h3>
                  <div className="flex-shrink-0">{getStatusBadge(course)}</div>
                </div>
                {course.description && (
                  <p className="text-gray-400 text-xs md:text-sm mb-4 line-clamp-2 break-words">{course.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500 font-mono">
                    <BookOpen className="h-4 w-4 mr-2 text-[#39ff14] animate-pulse" />
                    <span>{course._count?.lessons || 0} <span className="text-[#00ff88]">lessons</span></span>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="group inline-flex items-center gap-2 px-4 py-2 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all duration-300 font-mono text-sm relative overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    <Eye className="h-4 w-4 relative z-10 animate-pulse group-hover:animate-none" />
                    <span className="relative z-10">view()</span>
                    <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {courses.map((course, index) => (
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
                          alt={course.title || 'Course thumbnail'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold text-white font-mono group-hover:text-[#39ff14] transition-colors mb-1 break-words">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-gray-400 text-xs md:text-sm mb-3 line-clamp-2 break-words">{course.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 sm:ml-4">
                      {getStatusBadge(course)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500 font-mono">
                      <BookOpen className="h-4 w-4 mr-2 text-[#39ff14] animate-pulse" />
                      <span>{course._count?.lessons || 0} <span className="text-[#00ff88]">lessons</span></span>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="group inline-flex items-center gap-2 px-4 py-2 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all duration-300 font-mono text-sm relative overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                      <Eye className="h-4 w-4 relative z-10 animate-pulse group-hover:animate-none" />
                      <span className="relative z-10">view()</span>
                      <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
