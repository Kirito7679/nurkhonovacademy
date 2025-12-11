export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  COURSES: '/courses',
  COURSE_DETAILS: (id: string) => `/courses/${id}`,
  LESSON: (courseId: string, lessonId: string) => `/courses/${courseId}/lessons/${lessonId}`,
  PROFILE: '/profile',
  TEACHER_DASHBOARD: '/teacher/dashboard',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_STUDENT_DETAILS: (id: string) => `/teacher/students/${id}`,
  TEACHER_COURSES: '/teacher/courses',
  TEACHER_COURSE_NEW: '/teacher/courses/new',
  TEACHER_COURSE_EDIT: (id: string) => `/teacher/courses/${id}/edit`,
  TEACHER_COURSE_LESSONS: (id: string) => `/teacher/courses/${id}/lessons`,
  TEACHER_LESSON_EDIT: (courseId: string, lessonId: string) => `/teacher/courses/${courseId}/lessons/${lessonId}/edit`,
  TEACHER_PROFILE: '/teacher/profile',
};

