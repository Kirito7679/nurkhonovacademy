import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

// Get teacher statistics
export const getTeacherStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    
    if (!userId) {
      throw new AppError('Пользователь не авторизован', 401);
    }

    // Get all courses by this teacher
    const courses = await prisma.course.findMany({
      where: {
        teacherId: userId,
      },
      include: {
        _count: {
          select: {
            lessons: true,
            studentCourses: true,
          },
        },
        studentCourses: {
          where: {
            status: 'APPROVED',
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        lessons: {
          include: {
            progress: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalCourses = courses.length;
    const totalLessons = courses.reduce((sum, course) => sum + (course._count?.lessons || 0), 0);
    // Count unique students across all courses
    const uniqueStudentIds = new Set<string>();
    courses.forEach((course) => {
      if (Array.isArray(course.studentCourses)) {
        course.studentCourses.forEach((sc) => {
          if (sc?.student?.id) {
            uniqueStudentIds.add(sc.student.id);
          }
        });
      }
    });
    const totalStudents = uniqueStudentIds.size;
    const totalComments = courses.reduce(
      (sum, course) => {
        if (!Array.isArray(course.lessons)) return sum;
        return sum + course.lessons.reduce((s, lesson) => s + (lesson._count?.comments || 0), 0);
      },
      0
    );

    // Course completion rates
    const courseStats = courses.map((course) => {
      const lessonsArray = Array.isArray(course.lessons) ? course.lessons : [];
      const studentCoursesArray = Array.isArray(course.studentCourses) ? course.studentCourses : [];
      
      const totalLessonCompletions = lessonsArray.reduce(
        (sum, lesson) => {
          const completedProgress = Array.isArray(lesson.progress) 
            ? lesson.progress.filter((p: any) => p?.completed === true).length 
            : 0;
          return sum + completedProgress;
        },
        0
      );
      const possibleCompletions = lessonsArray.length * studentCoursesArray.length;
      const completionRate = possibleCompletions > 0
        ? Math.round((totalLessonCompletions / possibleCompletions) * 100)
        : 0;

      return {
        id: course.id,
        title: course.title || 'Без названия',
        students: studentCoursesArray.length,
        lessons: course._count?.lessons || 0,
        completionRate,
        comments: lessonsArray.reduce((sum, lesson) => sum + (lesson._count?.comments || 0), 0),
      };
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentComments = await prisma.comment.count({
      where: {
        lesson: {
          course: {
            teacherId: userId,
          },
        },
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const recentCourseRequests = await prisma.studentCourse.count({
      where: {
        course: {
          teacherId: userId,
        },
        status: 'PENDING',
        purchaseRequestedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Top students by completion
    const studentCompletions = new Map<string, { student: any; completed: number; total: number }>();
    
    courses.forEach((course) => {
      const studentCoursesArray = Array.isArray(course.studentCourses) ? course.studentCourses : [];
      const lessonsArray = Array.isArray(course.lessons) ? course.lessons : [];
      
      studentCoursesArray.forEach((sc) => {
        if (!sc?.student?.id) return;
        
        const studentId = sc.student.id;
        if (!studentCompletions.has(studentId)) {
          studentCompletions.set(studentId, {
            student: sc.student,
            completed: 0,
            total: 0,
          });
        }
        const stats = studentCompletions.get(studentId);
        if (!stats) return;
        
        const completed = lessonsArray.reduce(
          (sum, lesson) => {
            if (!Array.isArray(lesson.progress)) {
              return sum;
            }
            const hasCompleted = lesson.progress.some((p: any) => 
              p?.studentId === studentId && p?.completed === true
            );
            return sum + (hasCompleted ? 1 : 0);
          },
          0
        );
        stats.completed += completed;
        stats.total += lessonsArray.length;
      });
    });

    const topStudents = Array.from(studentCompletions.values())
      .map((stats) => ({
        ...stats,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        overview: {
          totalCourses,
          totalLessons,
          totalStudents,
          totalComments,
          recentComments,
          recentCourseRequests,
        },
        courseStats,
        topStudents,
      },
    });
  } catch (error: any) {
    console.error('Error in getTeacherStatistics:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    // Return a more detailed error response
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return next(error);
    }
    next(new AppError(`Ошибка при получении статистики: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

