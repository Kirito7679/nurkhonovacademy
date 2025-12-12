import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ApiResponse, Course, User, StudentCourse } from '../types';
import { Users, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: statsResponse } = useQuery('teacherStats', async () => {
    const [studentsRes, coursesRes, requestsRes] = await Promise.all([
      api.get<ApiResponse<User[]>>('/students'),
      api.get<ApiResponse<Course[]>>('/courses'),
      api.get<ApiResponse<StudentCourse[]>>('/students'),
    ]);

    const students = studentsRes.data.data || [];
    const courses = coursesRes.data.data || [];
    const allStudents = students;

    // Get pending requests
    const pendingRequests: StudentCourse[] = [];
    allStudents.forEach((student: User & { studentCourses?: StudentCourse[] }) => {
      if (student.studentCourses) {
        student.studentCourses.forEach((sc: StudentCourse) => {
          if (sc.status === 'PENDING') {
            pendingRequests.push(sc);
          }
        });
      }
    });

    return {
      totalStudents: students.length,
      totalCourses: courses.length,
      pendingRequests: pendingRequests.slice(0, 5),
    };
  });

  const stats = statsResponse || { totalStudents: 0, totalCourses: 0, pendingRequests: [] };

  return (
    <div>
      <h1 className="text-2xl md:text-4xl font-bold text-gradient mb-4 md:mb-8">Панель управления</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="card card-hover p-6 bg-gradient-to-br from-primary-50 to-blue-50">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-primary text-white shadow-glow">
              <Users className="h-7 w-7" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-primary-700">{t('students.totalStudents', { defaultValue: 'Всего студентов' })}</p>
              <p className="text-2xl md:text-3xl font-bold text-primary-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="card card-hover p-6 bg-gradient-to-br from-accent-50 to-emerald-50">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-accent text-white shadow-glow">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-accent-700">{t('courses.totalCourses', { defaultValue: 'Всего курсов' })}</p>
              <p className="text-2xl md:text-3xl font-bold text-accent-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-primary-900">{t('students.recentRequests', { defaultValue: 'Последние запросы на курсы' })}</h2>
          <Link
            to="/teacher/students"
            className="text-primary-700 hover:text-primary-800 text-sm font-semibold transition-colors underline decoration-2 underline-offset-2"
          >
            {t('students.viewAll', { defaultValue: 'Посмотреть всех' })} →
          </Link>
        </div>

        {stats.pendingRequests.length === 0 ? (
          <p className="text-primary-600 text-center py-8 font-medium">{t('students.noPendingRequests', { defaultValue: 'Нет ожидающих запросов' })}</p>
        ) : (
          <div className="space-y-4">
            {stats.pendingRequests.map((request: StudentCourse) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border-2 border-primary-200 rounded-lg hover:border-primary-400 transition-colors bg-gradient-to-r from-primary-50/50 to-transparent"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-900 break-words">
                    {request.student?.firstName} {request.student?.lastName}
                  </p>
                  <p className="text-sm text-primary-700 break-words">{request.course?.title}</p>
                  <p className="text-xs text-primary-600 mt-1">
                    {new Date(request.purchaseRequestedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Link
                  to={`/teacher/students/${request.studentId}`}
                  className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                >
                  {t('students.review', { defaultValue: 'Рассмотреть' })}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

