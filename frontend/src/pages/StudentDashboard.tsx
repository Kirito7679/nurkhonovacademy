import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Course, ApiResponse } from '../types';
import { BookOpen, Clock, CheckCircle, TrendingUp, Award, PlayCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="code-bg particle-bg">
      {/* Greeting Section */}
      <div className="mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gradient neon-glow font-mono mb-2">
          <span className="text-[#39ff14]">console.log</span>
          <span className="text-white">(</span>
          <span className="text-[#00ff88]">'{getGreeting()}, {user?.firstName}!'</span>
          <span className="text-white">)</span>;
        </h1>
        <p className="text-gray-400 font-mono text-sm md:text-base lg:text-lg">
          <span className="text-gray-600">//</span> Добро пожаловать в вашу образовательную платформу
        </p>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-mono mb-1">
                  <span className="text-[#39ff14]">const</span> totalCourses
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white font-mono">
                  <span className="text-[#00ff88]">{stats.totalCourses}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-black" />
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-mono mb-1">
                  <span className="text-[#39ff14]">const</span> completedLessons
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white font-mono">
                  <span className="text-[#00ff88]">{stats.completedLessons}</span>
                  <span className="text-gray-500 text-lg">/{stats.totalLessons}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-black" />
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-mono mb-1">
                  <span className="text-[#39ff14]">const</span> overallProgress
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white font-mono">
                  <span className="text-[#00ff88]">{stats.overallProgress}</span>
                  <span className="text-gray-500 text-lg">%</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-black" />
              </div>
            </div>
            <div className="mt-4 w-full bg-[#1f2937] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-primary h-full transition-all duration-500"
                style={{ width: `${stats.overallProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-mono mb-1">
                  <span className="text-[#39ff14]">const</span> inProgress
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white font-mono">
                  <span className="text-[#00ff88]">{stats.inProgressLessons}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-black" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!statsLoading && stats.recentActivity.length > 0 && (
        <div className="card p-6 mb-8 animate-fade-scale">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
            <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white font-mono">
              <span className="text-[#39ff14]">const</span> recentActivity <span className="text-[#39ff14]">=</span> <span className="text-white">[]</span>;
            </h2>
          </div>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 bg-[#1f2937]/50 rounded-lg border border-[#374151] hover:border-[#39ff14]/50 transition-all animate-slide-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium font-mono break-words text-sm md:text-base">
                    <span className="text-[#39ff14]">lesson</span>.<span className="text-white">title</span> = <span className="text-[#00ff88]">'{activity.lesson.title}'</span>
                  </p>
                  <p className="text-gray-400 text-xs md:text-sm font-mono break-words">
                    <span className="text-[#39ff14]">course</span>.<span className="text-white">title</span> = <span className="text-gray-500">'{activity.lesson.course.title}'</span>
                  </p>
                </div>
                {activity.watchedAt && (
                  <div className="text-gray-500 text-xs font-mono">
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
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient neon-glow font-mono mb-2">
          <span className="text-[#39ff14]">const</span>{' '}
          <span className="text-white">myCourses</span>{' '}
          <span className="text-[#39ff14]">=</span>{' '}
          <span className="text-[#00ff88]">courses.filter(c =&gt; c.hasAccess)</span>;
        </h2>
        <div className="absolute top-0 right-0 text-xs font-mono text-gray-600 animate-pulse">
          // {myCourses.length} courses
        </div>
      </div>

      {coursesLoading ? (
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
          <Link
            to="/courses"
            className="glow-button inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 transition-all font-mono font-bold relative z-10"
          >
            viewAllCourses()
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              )}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2 font-mono group-hover:text-[#39ff14] transition-colors break-words">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-gray-400 text-xs md:text-sm mb-4 line-clamp-2 break-words">{course.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 font-mono">
                  <BookOpen className="h-4 w-4 mr-2 text-[#39ff14] animate-pulse" />
                  <span>{course._count?.lessons || 0} <span className="text-[#00ff88]">lessons</span></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
