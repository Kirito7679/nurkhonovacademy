import prisma from '../config/database';
import { AppError } from './errors';

export interface AccessCheckResult {
  hasAccess: boolean;
  isSubscriptionExpired?: boolean;
  studentCourseStatus?: string | null;
  accessStartDate?: Date | null;
  accessEndDate?: Date | null;
}

/**
 * Check if student has access to a course
 * @param studentId - Student user ID
 * @param courseId - Course ID
 * @returns Access check result with detailed information
 */
export const checkCourseAccess = async (
  studentId: string,
  courseId: string
): Promise<AccessCheckResult> => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      isVisible: true,
      trialLessonId: true,
      teacherId: true,
    },
  });

  if (!course) {
    throw new AppError('Курс не найден', 404);
  }

  const studentCourse = await prisma.studentCourse.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });

  let hasAccess = false;
  let isSubscriptionExpired = false;

  if (studentCourse?.status === 'APPROVED') {
    const now = new Date();

    // Check if subscription is still valid
    if (studentCourse.accessEndDate) {
      const endDate = new Date(studentCourse.accessEndDate);
      hasAccess = now < endDate;
      isSubscriptionExpired = !hasAccess;
    } else {
      // No end date means unlimited access
      hasAccess = true;
    }

    // Check if start date has passed
    if (hasAccess && studentCourse.accessStartDate) {
      const startDate = new Date(studentCourse.accessStartDate);
      hasAccess = now >= startDate;
    }
  }

  return {
    hasAccess,
    isSubscriptionExpired,
    studentCourseStatus: studentCourse?.status || null,
    accessStartDate: studentCourse?.accessStartDate || null,
    accessEndDate: studentCourse?.accessEndDate || null,
  };
};

/**
 * Check if student has access to a lesson
 * @param studentId - Student user ID
 * @param lessonId - Lesson ID
 * @returns Access check result
 */
export const checkLessonAccess = async (
  studentId: string,
  lessonId: string
): Promise<AccessCheckResult> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: {
        select: {
          id: true,
          isVisible: true,
          trialLessonId: true,
          teacherId: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new AppError('Урок не найден', 404);
  }

  // Check if it's a trial lesson (always accessible)
  if (lesson.course.trialLessonId === lessonId) {
    return {
      hasAccess: true,
      studentCourseStatus: null,
    };
  }

  // Check course access
  return await checkCourseAccess(studentId, lesson.courseId);
};

/**
 * Check if user can edit a course
 * @param userId - User ID
 * @param userRole - User role
 * @param courseTeacherId - Course teacher ID
 * @returns True if user can edit the course
 */
export const canEditCourse = (
  userId: string,
  userRole: string,
  courseTeacherId: string
): boolean => {
  return courseTeacherId === userId || userRole === 'ADMIN';
};
