import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, Course, User, StudentCourse } from '../types';
import { Users, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function TeacherDashboard() {
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
    allStudents.forEach((student: any) => {
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
      <h1 className="text-2xl md:text-4xl font-bold text-gradient mb-4 md:mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="card card-hover p-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-neon-glow to-neon-electric text-white shadow-lg shadow-neon-glow/50">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Всего студентов</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="card card-hover p-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-500/50">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Всего курсов</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalCourses}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white">Последние запросы на курсы</h2>
          <Link
            to="/teacher/students"
            className="text-neon-glow hover:text-neon-300 text-sm font-medium transition-colors"
          >
            Посмотреть всех →
          </Link>
        </div>

        {stats.pendingRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Нет ожидающих запросов</p>
        ) : (
          <div className="space-y-4">
            {stats.pendingRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border border-[#374151] rounded-lg hover:border-neon-glow/50 transition-colors bg-[#1f2937]/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white break-words">
                    {request.student?.firstName} {request.student?.lastName}
                  </p>
                  <p className="text-sm text-gray-400 break-words">{request.course?.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(request.purchaseRequestedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Link
                  to={`/teacher/students/${request.studentId}`}
                  className="px-4 py-2 text-sm font-medium text-neon-glow hover:text-white border border-neon-glow/50 rounded-lg hover:bg-neon-glow/10 transition-all whitespace-nowrap"
                >
                  Рассмотреть
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

