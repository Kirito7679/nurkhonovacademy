import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

// Helper to escape CSV values
const escapeCsv = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Export students data to CSV
export const exportStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // For teachers, get only students enrolled in their courses
    let where: any = {
      role: 'STUDENT',
    };
    
    if (userRole === 'TEACHER') {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      const courseIds = teacherCourses.map(c => c.id);
      
      if (courseIds.length === 0) {
        // Teacher has no courses, return empty CSV
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
        res.send('\uFEFF'); // BOM for Excel
        return;
      }
      
      const studentCourses = await prisma.studentCourse.findMany({
        where: {
          courseId: { in: courseIds },
        },
        select: {
          studentId: true,
        },
      });
      
      const studentIds = [...new Set(studentCourses.map(sc => sc.studentId))];
      
      if (studentIds.length === 0) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
        res.send('\uFEFF'); // BOM for Excel
        return;
      }
      
      where.id = { in: studentIds };
    }
    
    const students = await prisma.user.findMany({
      where,
      include: {
        studentCourses: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
          },
        },
        progress: {
          include: {
            lesson: {
              select: {
                title: true,
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = ['ID', 'Имя', 'Фамилия', 'Телефон', 'Email', 'Курсы', 'Завершено уроков', 'Дата регистрации'];
    const rows = students.map((student) => {
      const courses = student.studentCourses.filter((sc) => sc.status === 'APPROVED').map((sc) => sc.course.title).join('; ');
      const completedLessons = student.progress.filter((p) => p.completed).length;
      return [
        student.id,
        student.firstName,
        student.lastName,
        student.phone,
        student.email || '',
        courses,
        completedLessons.toString(),
        new Date(student.createdAt).toLocaleDateString('ru-RU'),
      ];
    });

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Error in exportStudents:', error);
    next(error);
  }
};

// Export course statistics to CSV
export const exportCourseStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

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
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        lessons: {
          include: {
            progress: {
              where: {
                completed: true,
              },
            },
          },
        },
      },
    });

    // Convert to CSV
    const headers = ['Название курса', 'Уроков', 'Студентов', 'Процент завершения', 'Студенты'];
    const rows = courses.map((course) => {
      const totalLessons = course._count.lessons;
      const totalStudents = course.studentCourses.length;
      const totalCompletions = course.lessons.reduce((sum, lesson) => sum + lesson.progress.length, 0);
      const possibleCompletions = totalLessons * totalStudents;
      const completionRate = possibleCompletions > 0
        ? Math.round((totalCompletions / possibleCompletions) * 100)
        : 0;
      
      const students = course.studentCourses.map((sc) => `${sc.student.firstName} ${sc.student.lastName}`).join('; ');

      return [
        course.title,
        totalLessons.toString(),
        totalStudents.toString(),
        `${completionRate}%`,
        students,
      ];
    });

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=course-statistics.csv');
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('Error in exportCourseStatistics:', error);
    next(error);
  }
};

