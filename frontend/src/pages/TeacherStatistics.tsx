import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ApiResponse, ApiError } from '../types';
import { BookOpen, Users, MessageSquare, TrendingUp, Clock, Award, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const { t } = useTranslation();
  const { data: statsResponse, isLoading, error } = useQuery<ApiResponse<TeacherStatistics>>(
    'teacherStatistics',
    async () => {
      const response = await api.get<ApiResponse<TeacherStatistics>>('/statistics/teacher');
      return response.data;
    }
  );

  // Fetch chart data
  const { data: newUsersData } = useQuery<ApiResponse<Array<{ date: string; count: number }>>>(
    'newUsersGrowth',
    async () => {
      const response = await api.get<ApiResponse<Array<{ date: string; count: number }>>>('/statistics/new-users-growth?days=30');
      return response.data;
    }
  );

  const { data: deviceData } = useQuery<ApiResponse<Array<{ name: string; value: number }>>>(
    'deviceStatistics',
    async () => {
      const response = await api.get<ApiResponse<Array<{ name: string; value: number }>>>('/statistics/device-statistics');
      return response.data;
    }
  );

  const { data: activeStudentsData } = useQuery<ApiResponse<Array<{ name: string; value: number }>>>(
    'activeStudents',
    async () => {
      const response = await api.get<ApiResponse<Array<{ name: string; value: number }>>>('/statistics/active-students?days=30');
      return response.data;
    }
  );

  const stats = statsResponse?.data;
  
  // Colors for charts
  const DEVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'];

  if (error) {
    console.error('Statistics error:', error);
    return (
      <div className="text-center py-12">
        <div className="text-red-600">
          {(error as ApiError)?.response?.data?.message || t('errors.somethingWentWrong')}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {t('statistics.title')}
        </h1>
        <button
          onClick={() => {
            const token = localStorage.getItem('token');
            window.open(`/api/export/course-statistics?token=${token}`, '_blank');
          }}
          className="btn-secondary inline-flex items-center"
        >
          <Download className="h-5 w-5 mr-2" />
          <span>Экспорт</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-primary-50 to-blue-50" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-900">{t('courses.totalCourses', { defaultValue: 'Всего курсов' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-900">{stats?.overview.totalCourses || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-accent-50 to-emerald-50" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-accent-900">{t('students.totalStudents', { defaultValue: 'Всего студентов' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-accent-900">{stats?.overview.totalStudents || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-education-50 to-purple-50" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-education-900">{t('statistics.totalLessons', { defaultValue: 'Всего уроков' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-education flex items-center justify-center shadow-glow">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-education-900">{stats?.overview.totalLessons || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-primary-50 to-indigo-50" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-900">{t('statistics.totalComments', { defaultValue: 'Всего комментариев' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-900">{stats?.overview.totalComments || 0}</p>
        </div>

        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-yellow-50 to-amber-50" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-yellow-900">{t('statistics.recentComments', { defaultValue: 'Недавние комментарии' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-glow">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-900">{stats?.overview.recentComments || 0}</p>
          <p className="text-xs text-yellow-700 mt-2 font-medium">{t('statistics.last7Days', { defaultValue: 'За последние 7 дней' })}</p>
        </div>

        <div className="card p-6 animate-fade-scale bg-gradient-to-br from-orange-50 to-red-50" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-orange-900">{t('statistics.courseRequests', { defaultValue: 'Запросы на курсы' })}</h3>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-glow">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-orange-900">{stats?.overview.recentCourseRequests || 0}</p>
          <p className="text-xs text-orange-700 mt-2 font-medium">{t('statistics.last7Days', { defaultValue: 'За последние 7 дней' })}</p>
        </div>
      </div>

      {/* Course Statistics */}
      {stats?.courseStats && stats.courseStats.length > 0 && (
        <div className="card p-6 mb-12 animate-fade-scale" style={{ animationDelay: '0.7s' }}>
          <h2 className="text-xl md:text-2xl font-bold text-gradient mb-4 md:mb-6">
            {t('statistics.byCourses', { defaultValue: 'Статистика по курсам' })}
          </h2>
          <div className="space-y-3 md:space-y-4">
            {stats.courseStats.map((course, index) => (
              <div
                key={course.id}
                className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 animate-slide-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <h3 className="text-base md:text-lg font-semibold text-neutral-900 break-words">{course.title}</h3>
                  <div className="text-left sm:text-right">
                    <div className="text-xl md:text-2xl font-bold text-gradient">{course.completionRate}%</div>
                    <div className="text-xs text-neutral-500">{t('lessons.completed')}</div>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2 md:h-2.5 mb-3">
                  <div
                    className="bg-gradient-primary h-2 md:h-2.5 rounded-full transition-all"
                    style={{ width: `${course.completionRate}%` }}
                  ></div>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-neutral-600">
                  <span>
                    <span className="font-medium">{t('students.title')}:</span> {course.students}
                  </span>
                  <span>
                    <span className="font-medium">{t('lessons.title')}:</span> {course.lessons}
                  </span>
                  <span>
                    <span className="font-medium">{t('comments.title')}:</span> {course.comments}
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
          <h2 className="text-xl md:text-2xl font-bold text-gradient mb-4 md:mb-6">
            {t('statistics.topStudents', { defaultValue: 'Топ студентов' })}
          </h2>
          <div className="space-y-2 md:space-y-3">
            {stats.topStudents.map((student, index) => (
              <div
                key={student.student.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 md:p-4 border border-neutral-200 rounded-lg bg-neutral-50 animate-slide-in"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-white font-bold shadow-soft">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">
                      {student.student.firstName} {student.student.lastName}
                    </h4>
                    <p className="text-xs text-neutral-500">
                      <span className="font-medium">{t('lessons.completed')}:</span> {student.completed} / {student.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-lg md:text-xl font-bold text-gradient">{student.completionRate}%</div>
                    <div className="text-xs text-neutral-500">{t('dashboard.overallProgress', { defaultValue: 'Прогресс' })}</div>
                  </div>
                  {index < 3 && (
                    <Award className={`h-6 w-6 ${
                      index === 0 ? 'text-yellow-500' : index === 1 ? 'text-neutral-400' : 'text-orange-500'
                    }`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* New Users Growth Chart */}
        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.9s' }}>
          <h2 className="text-xl md:text-2xl font-bold text-gradient mb-6">
            Рост новых пользователей
          </h2>
          {newUsersData?.data && newUsersData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={newUsersData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Дата: ${value}`}
                  formatter={(value: number) => [value, 'Новых пользователей']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Новых пользователей"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-neutral-500">
              Нет данных для отображения
            </div>
          )}
        </div>

        {/* Device Statistics Chart */}
        <div className="card p-6 animate-fade-scale" style={{ animationDelay: '1s' }}>
          <h2 className="text-xl md:text-2xl font-bold text-gradient mb-6">
            Устройства пользователей
          </h2>
          {deviceData?.data && deviceData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Пользователей']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-neutral-500">
              Нет данных для отображения
            </div>
          )}
        </div>
      </div>

      {/* Active/Inactive Students Chart */}
      <div className="card p-6 animate-fade-scale mb-12" style={{ animationDelay: '1.1s' }}>
        <h2 className="text-xl md:text-2xl font-bold text-gradient mb-6">
          Активность студентов
        </h2>
        {activeStudentsData?.data && activeStudentsData.data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activeStudentsData.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activeStudentsData.data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Активные' ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Студентов']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-4">
              {activeStudentsData.data.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ 
                        backgroundColor: item.name === 'Активные' ? '#10b981' : '#ef4444' 
                      }}
                    />
                    <span className="font-semibold text-neutral-900">{item.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-gradient">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );
}
