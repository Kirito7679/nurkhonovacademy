import { useQuery } from 'react-query';
import api from '../services/api';
import { ApiResponse } from '../types';
import { BookOpen, Users, MessageSquare, TrendingUp, Clock, Award, Download } from 'lucide-react';

interface TeacherStatistics {
  overview: {
    totalCourses: number;
    totalLessons: number;
    totalStudents: number;
    totalComments: number;
    recentComments: number;
    recentCourseRequests: number;
  };
  courseStats: Array<{
    id: string;
    title: string;
    students: number;
    lessons: number;
    completionRate: number;
    comments: number;
  }>;
  topStudents: Array<{
    student: {
      id: string;
      firstName: string;
      lastName: string;
    };
    completed: number;
    total: number;
    completionRate: number;
  }>;
}

export default function TeacherStatistics() {
  const { data: statsResponse, isLoading, error } = useQuery<ApiResponse<TeacherStatistics>>(
    'teacherStatistics',
    async () => {
      const response = await api.get<ApiResponse<TeacherStatistics>>('/statistics/teacher');
      return response.data;
    }
  );

  const stats = statsResponse?.data;

  if (error) {
    console.error('Statistics error:', error);
    return (
      <div className="text-center py-12">
        <div className="text-red-400 font-mono">
          <span className="text-[#39ff14]">error:</span> {(error as any)?.response?.data?.message || 'Ошибка загрузки статистики'}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
        </div>
        <p className="mt-4 text-gray-400 font-mono">loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="code-bg particle-bg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow font-mono">
          <span className="text-[#39ff14]">const</span> statistics <span className="text-[#39ff14]">=</span>{' '}
          <span className="text-white">getTeacherStats()</span>;
        </h1>
        <button
          onClick={() => {
            const token = localStorage.getItem('token');
            window.open(`/api/export/course-statistics?token=${token}`, '_blank');
          }}
          className="inline-flex items-center px-4 py-2 border border-[#374151] shadow-sm text-sm font-medium rounded-lg text-gray-300 hover:text-[#39ff14] hover:border-[#39ff14] hover:bg-[#1f2937] transition-all font-mono"
        >
          <Download className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">export()</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Total Courses</h3>
            <BookOpen className="h-8 w-8 text-[#39ff14] animate-pulse-glow" />
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gradient font-mono">{stats?.overview.totalCourses || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Total Students</h3>
            <Users className="h-8 w-8 text-[#00ff88] animate-pulse-glow" />
          </div>
          <p className="text-4xl font-bold text-gradient font-mono">{stats?.overview.totalStudents || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Total Lessons</h3>
            <BookOpen className="h-8 w-8 text-[#00ff41] animate-pulse-glow" />
          </div>
          <p className="text-4xl font-bold text-gradient font-mono">{stats?.overview.totalLessons || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Total Comments</h3>
            <MessageSquare className="h-8 w-8 text-[#39ff14] animate-pulse-glow" />
          </div>
          <p className="text-4xl font-bold text-gradient font-mono">{stats?.overview.totalComments || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Recent Comments</h3>
            <Clock className="h-8 w-8 text-yellow-400 animate-pulse-glow" />
          </div>
          <p className="text-4xl font-bold text-gradient font-mono">{stats?.overview.recentComments || 0}</p>
          <p className="text-xs text-gray-500 font-mono mt-2">Last 7 days</p>
        </div>

        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-mono">Course Requests</h3>
            <TrendingUp className="h-8 w-8 text-yellow-400 animate-pulse-glow" />
          </div>
          <p className="text-4xl font-bold text-gradient font-mono">{stats?.overview.recentCourseRequests || 0}</p>
          <p className="text-xs text-gray-500 font-mono mt-2">Last 7 days</p>
        </div>
      </div>

      {/* Course Statistics */}
      {stats?.courseStats && stats.courseStats.length > 0 && (
        <div className="card p-6 mb-12 animate-fade-scale" style={{ animationDelay: '0.7s' }}>
          <h2 className="text-xl md:text-2xl font-bold text-gradient neon-glow font-mono mb-4 md:mb-6">
            <span className="text-[#39ff14]">const</span> courseStats <span className="text-[#39ff14]">=</span>{' '}
            <span className="text-white">[]</span>;
          </h2>
          <div className="space-y-3 md:space-y-4">
            {stats.courseStats.map((course, index) => (
              <div
                key={course.id}
                className="border border-[#374151] rounded-lg p-4 bg-[#1f2937]/30 animate-slide-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <h3 className="text-base md:text-lg font-semibold text-white font-mono break-words">{course.title}</h3>
                  <div className="text-left sm:text-right">
                    <div className="text-xl md:text-2xl font-bold text-gradient font-mono">{course.completionRate}%</div>
                    <div className="text-xs text-gray-500 font-mono">completion</div>
                  </div>
                </div>
                <div className="w-full bg-[#1f2937] rounded-full h-2 md:h-2.5 mb-3">
                  <div
                    className="bg-gradient-to-r from-[#39ff14] to-[#00ff88] h-2 md:h-2.5 rounded-full transition-all"
                    style={{ width: `${course.completionRate}%` }}
                  ></div>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-400 font-mono">
                  <span>
                    <span className="text-[#39ff14]">students:</span> {course.students}
                  </span>
                  <span>
                    <span className="text-[#39ff14]">lessons:</span> {course.lessons}
                  </span>
                  <span>
                    <span className="text-[#39ff14]">comments:</span> {course.comments}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Students */}
      {stats?.topStudents && stats.topStudents.length > 0 && (
        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.8s' }}>
          <h2 className="text-xl md:text-2xl font-bold text-gradient neon-glow font-mono mb-4 md:mb-6">
            <span className="text-[#39ff14]">const</span> topStudents <span className="text-[#39ff14]">=</span>{' '}
            <span className="text-white">[]</span>;
          </h2>
          <div className="space-y-2 md:space-y-3">
            {stats.topStudents.map((student, index) => (
              <div
                key={student.student.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 md:p-4 border border-[#374151] rounded-lg bg-[#1f2937]/30 animate-slide-in"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-black font-bold font-mono">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white font-mono">
                      {student.student.firstName} {student.student.lastName}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">
                      <span className="text-[#39ff14]">completed:</span> {student.completed} / {student.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-lg md:text-xl font-bold text-gradient font-mono">{student.completionRate}%</div>
                    <div className="text-xs text-gray-500 font-mono">progress</div>
                  </div>
                  {index < 3 && (
                    <Award className={`h-6 w-6 ${
                      index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'
                    }`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

