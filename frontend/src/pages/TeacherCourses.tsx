import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ApiResponse, Course } from '../types';
import { BookOpen, Plus, Edit, Grid3x3, List } from 'lucide-react';

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
    <div className="code-bg particle-bg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow font-mono">
          <span className="text-[#39ff14]">const</span> myCourses <span className="text-[#39ff14]">=</span> <span className="text-white">[]</span>;
        </h1>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#111827] border border-[#374151] rounded-lg p-1">
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
          
          <Link
            to="/teacher/courses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/50 transition-all font-mono font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            createCourse()
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
          </div>
          <p className="mt-4 text-gray-400 font-mono">loading courses...</p>
        </div>
      ) : myCourses.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <BookOpen className="mx-auto h-16 w-16 text-gray-600 mb-4 animate-pulse-glow" />
          <div className="font-mono text-gray-400 mb-4">
            <span className="text-[#39ff14]">if</span>{' '}
            <span className="text-white">(myCourses.length === 0)</span>{' '}
            <span className="text-[#39ff14]">return</span>{' '}
            <span className="text-gray-500">'Нет курсов'</span>;
          </div>
          <p className="mt-2 text-sm text-gray-500 font-mono mb-6">
            <span className="text-[#39ff14]">//</span> Создайте свой первый курс
          </p>
          <Link
            to="/teacher/courses/new"
            className="glow-button inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 transition-all font-mono font-bold relative z-10"
          >
            <Plus className="h-5 w-5 mr-2" />
            createCourse()
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
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              )}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-white font-mono group-hover:text-[#39ff14] transition-colors mb-2 break-words">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-gray-400 text-xs md:text-sm mb-4 line-clamp-2 break-words">{course.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500 font-mono">
                    <BookOpen className="h-4 w-4 mr-2 text-[#39ff14] animate-pulse" />
                    <span>{course._count?.lessons || 0} <span className="text-[#00ff88]">lessons</span></span>
                  </div>
                  <Link
                    to={`/teacher/courses/${course.id}/edit`}
                    className="text-[#39ff14] hover:text-white transition-colors group/edit"
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
                    <h3 className="text-lg md:text-xl font-semibold text-white font-mono group-hover:text-[#39ff14] transition-colors mb-1 break-words">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-gray-400 text-xs md:text-sm mb-3 line-clamp-2 break-words">{course.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500 font-mono">
                      <BookOpen className="h-4 w-4 mr-2 text-[#39ff14] animate-pulse" />
                      <span>{course._count?.lessons || 0} <span className="text-[#00ff88]">lessons</span></span>
                    </div>
                    <Link
                      to={`/teacher/courses/${course.id}/edit`}
                      className="group/edit inline-flex items-center gap-2 px-4 py-2 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all duration-300 font-mono text-sm relative overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover/edit:translate-x-[100%] transition-transform duration-700"></span>
                      <Edit className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">edit()</span>
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
