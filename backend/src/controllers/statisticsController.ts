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

// Get new users growth data
export const getNewUsersGrowth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = 30 } = req.query;
    const daysCount = parseInt(days as string, 10) || 30;
    const userRole = req.user!.role;
    const userId = req.user!.id;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    
    // For teachers, only show students from their courses
    let whereClause: any = {
      createdAt: {
        gte: startDate,
      },
      role: 'STUDENT',
    };

    if (userRole === 'TEACHER') {
      // Get students from teacher's courses
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      
      if (teacherCourses.length === 0) {
        // Teacher has no courses, return empty data
        const dateMap = new Map<string, number>();
        const currentDate = new Date(startDate);
        while (currentDate <= new Date()) {
          const dateKey = currentDate.toISOString().split('T')[0];
          dateMap.set(dateKey, 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const data = Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        return res.json({ success: true, data });
      }
      
      const courseIds = teacherCourses.map(c => c.id);
      whereClause.studentCourses = {
        some: {
          courseId: { in: courseIds },
        },
      };
    }
    
    // Get users created in the period, grouped by date
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Group by date
    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);
    
    // Initialize all dates with 0
    while (currentDate <= new Date()) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count users per date
    users.forEach((user) => {
      const dateKey = user.createdAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    
    // Convert to array format
    const data = Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    next(new AppError(`Ошибка при получении данных роста пользователей: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

// Get device statistics
export const getDeviceStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // For teachers, only show statistics for their students
    let whereClause: any = {
      action: 'LOGIN',
    };

    if (userRole === 'TEACHER') {
      // Get students from teacher's courses
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      
      if (teacherCourses.length === 0) {
        // Teacher has no courses, return empty data
        return res.json({
          success: true,
          data: [
            { name: 'Десктоп', value: 0 },
            { name: 'Мобильные', value: 0 },
            { name: 'Планшеты', value: 0 },
            { name: 'Неизвестно', value: 0 },
          ],
        });
      }
      
      const courseIds = teacherCourses.map(c => c.id);
      
      const studentIds = await prisma.studentCourse.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'APPROVED',
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      
      if (studentIds.length === 0) {
        // Teacher has no students, return empty data
        return res.json({
          success: true,
          data: [
            { name: 'Десктоп', value: 0 },
            { name: 'Мобильные', value: 0 },
            { name: 'Планшеты', value: 0 },
            { name: 'Неизвестно', value: 0 },
          ],
        });
      }
      
      const studentIdList = studentIds.map(sc => sc.studentId);
      whereClause.userId = { in: studentIdList };
    }

    // Get device info from activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: whereClause,
      select: {
        userAgent: true,
      },
      distinct: ['userAgent'],
    });
    
    // Parse user agents to determine device type
    const deviceCounts = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };
    
    activityLogs.forEach((log) => {
      const ua = (log.userAgent || '').toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceCounts.mobile++;
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceCounts.tablet++;
      } else if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux') || ua.includes('x11')) {
        deviceCounts.desktop++;
      } else {
        deviceCounts.unknown++;
      }
    });
    
    // Also count by unique users per device type
    const usersByDevice = await prisma.activityLog.groupBy({
      by: ['userAgent'],
      where: whereClause,
      _count: {
        userId: true,
      },
    });
    
    const deviceStats = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };
    
    usersByDevice.forEach((item) => {
      const ua = (item.userAgent || '').toLowerCase();
      const count = item._count.userId;
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceStats.mobile += count;
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceStats.tablet += count;
      } else if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux') || ua.includes('x11')) {
        deviceStats.desktop += count;
      } else {
        deviceStats.unknown += count;
      }
    });
    
    res.json({
      success: true,
      data: [
        { name: 'Десктоп', value: deviceStats.desktop },
        { name: 'Мобильные', value: deviceStats.mobile },
        { name: 'Планшеты', value: deviceStats.tablet },
        { name: 'Неизвестно', value: deviceStats.unknown },
      ],
    });
  } catch (error: any) {
    next(new AppError(`Ошибка при получении статистики устройств: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

// Get active/inactive students statistics
export const getActiveStudentsStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = 30 } = req.query;
    const daysCount = parseInt(days as string, 10) || 30;
    const userRole = req.user!.role;
    const userId = req.user!.id;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysCount);
    
    // For teachers, only show students from their courses
    let studentWhereClause: any = {
      role: 'STUDENT',
    };

    if (userRole === 'TEACHER') {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      
      if (teacherCourses.length === 0) {
        // Teacher has no courses, return empty data
        return res.json({
          success: true,
          data: [
            { name: 'Активные', value: 0 },
            { name: 'Неактивные', value: 0 },
          ],
        });
      }
      
      const courseIds = teacherCourses.map(c => c.id);
      studentWhereClause.studentCourses = {
        some: {
          courseId: { in: courseIds },
        },
      };
    }
    
    // Get all students
    const allStudents = await prisma.user.findMany({
      where: studentWhereClause,
      select: {
        id: true,
      },
    });

    if (allStudents.length === 0) {
      // No students, return empty data
      return res.json({
        success: true,
        data: [
          { name: 'Активные', value: 0 },
          { name: 'Неактивные', value: 0 },
        ],
      });
    }

    const studentIdList = allStudents.map(s => s.id);
    
    // Get students who logged in within the period
    const activeStudentIds = await prisma.activityLog.findMany({
      where: {
        action: 'LOGIN',
        userId: { in: studentIdList },
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });
    
    const activeIds = new Set(activeStudentIds.map((log) => log.userId));
    const activeCount = activeIds.size;
    const inactiveCount = allStudents.length - activeCount;
    
    res.json({
      success: true,
      data: [
        { name: 'Активные', value: activeCount },
        { name: 'Неактивные', value: inactiveCount },
      ],
    });
  } catch (error: any) {
    next(new AppError(`Ошибка при получении статистики активности студентов: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

// Get location statistics (logins and registrations by country/region)
export const getLocationStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type = 'country', action = 'all' } = req.query; // type: 'country' | 'region', action: 'LOGIN' | 'CREATE' | 'all'
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let whereClause: any = {};
    
    if (action !== 'all') {
      if (action === 'LOGIN') {
        whereClause.action = 'LOGIN';
      } else if (action === 'REGISTER' || action === 'CREATE') {
        whereClause.action = 'CREATE';
        whereClause.entityType = 'USER';
      }
    }

    // For teachers, only show statistics for their students
    if (userRole === 'TEACHER') {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      
      if (teacherCourses.length === 0) {
        // Teacher has no courses, return empty data
        return res.json({
          success: true,
          data: [],
        });
      }
      
      const courseIds = teacherCourses.map(c => c.id);
      
      const studentIds = await prisma.studentCourse.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'APPROVED',
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      
      if (studentIds.length === 0) {
        // Teacher has no students, return empty data
        return res.json({
          success: true,
          data: [],
        });
      }
      
      const studentIdList = studentIds.map(sc => sc.studentId);
      whereClause.userId = { in: studentIdList };
    }

    if (type === 'country') {
      const countryStats = await prisma.activityLog.groupBy({
        by: ['country'],
        where: {
          ...whereClause,
          country: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      const data = countryStats.map((stat) => ({
        name: stat.country || 'Неизвестно',
        value: stat._count.id,
      }));

      res.json({
        success: true,
        data,
      });
    } else if (type === 'region') {
      const regionStats = await prisma.activityLog.groupBy({
        by: ['region', 'country'],
        where: {
          ...whereClause,
          region: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      const data = regionStats.map((stat) => ({
        name: stat.region || 'Неизвестно',
        country: stat.country || 'Неизвестно',
        value: stat._count.id,
      }));

      res.json({
        success: true,
        data,
      });
    } else {
      throw new AppError('Неверный тип статистики. Используйте "country" или "region"', 400);
    }
  } catch (error: any) {
    next(new AppError(`Ошибка при получении статистики по локациям: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

// Get students statistics by country (for world map)
export const getStudentsByCountry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // For teachers, only show students from their courses
    let whereClause: any = {
      role: 'STUDENT',
      country: { not: null },
    };

    if (userRole === 'TEACHER') {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      
      if (teacherCourses.length === 0) {
        // Teacher has no courses, return empty data
        return res.json({
          success: true,
          data: [],
        });
      }
      
      const courseIds = teacherCourses.map(c => c.id);
      whereClause.studentCourses = {
        some: {
          courseId: { in: courseIds },
        },
      };
    }

    // Get all students grouped by country
    const studentsByCountry = await prisma.user.groupBy({
      by: ['country'],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Map country names to ISO codes for map visualization
    // Common country name mappings
    const countryNameToCode: Record<string, string> = {
      'Uzbekistan': 'UZ',
      'Узбекистан': 'UZ',
      'Kazakhstan': 'KZ',
      'Казахстан': 'KZ',
      'Russia': 'RU',
      'Россия': 'RU',
      'Kyrgyzstan': 'KG',
      'Кыргызстан': 'KG',
      'Tajikistan': 'TJ',
      'Таджикистан': 'TJ',
      'Turkmenistan': 'TM',
      'Туркменистан': 'TM',
      'United States': 'US',
      'США': 'US',
      'United Kingdom': 'GB',
      'Великобритания': 'GB',
      'Germany': 'DE',
      'Германия': 'DE',
      'France': 'FR',
      'Франция': 'FR',
      'Turkey': 'TR',
      'Турция': 'TR',
      'China': 'CN',
      'Китай': 'CN',
      'India': 'IN',
      'Индия': 'IN',
      'South Korea': 'KR',
      'Южная Корея': 'KR',
      'Japan': 'JP',
      'Япония': 'JP',
    };

    const data = studentsByCountry.map((stat) => {
      const countryName = stat.country || 'Unknown';
      // Try to find country code in mapping (case-insensitive)
      let countryCode: string = countryNameToCode[countryName] || '';
      
      // If not found, try case-insensitive search
      if (!countryCode) {
        const normalizedName = countryName.toLowerCase().trim();
        const foundEntry = Object.entries(countryNameToCode).find(
          ([key]) => key.toLowerCase() === normalizedName
        );
        countryCode = foundEntry ? foundEntry[1] : '';
      }
      
      // If still not found, try to extract from name or use first 2 letters
      if (!countryCode) {
        // Try common patterns
        if (countryName.toLowerCase().includes('uzbek')) countryCode = 'UZ';
        else if (countryName.toLowerCase().includes('kazakh')) countryCode = 'KZ';
        else if (countryName.toLowerCase().includes('russia') || countryName.toLowerCase().includes('россия')) countryCode = 'RU';
        else if (countryName.toLowerCase().includes('kyrgyz') || countryName.toLowerCase().includes('кыргыз')) countryCode = 'KG';
        else if (countryName.toLowerCase().includes('tajik') || countryName.toLowerCase().includes('таджик')) countryCode = 'TJ';
        else if (countryName.toLowerCase().includes('turkmen') || countryName.toLowerCase().includes('туркмен')) countryCode = 'TM';
        else {
          // Fallback: use first 2 uppercase letters
          countryCode = countryName.length >= 2 ? countryName.substring(0, 2).toUpperCase() : 'XX';
        }
      }
      
      // Ensure countryCode is never empty
      if (!countryCode) {
        countryCode = 'XX';
      }
      
      return {
        name: countryName,
        code: countryCode,
        value: stat._count.id,
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    next(new AppError(`Ошибка при получении статистики студентов по странам: ${error?.message || 'Неизвестная ошибка'}`, 500));
  }
};

