import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';

// Get leaderboard - top students by coins
export const getLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 100 } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 100, 1000); // Max 1000

    // Get top students by coins
    const topStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        coins: {
          gt: 0, // Only students with coins > 0
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        coins: true,
        _count: {
          select: {
            progress: {
              where: {
                completed: true,
              },
            },
          },
        },
      },
      orderBy: {
        coins: 'desc',
      },
      take: limitNum,
    });

    // Calculate rank and add additional stats
    const leaderboard = topStudents.map((student, index) => ({
      rank: index + 1,
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      avatarUrl: student.avatarUrl,
      coins: student.coins,
      completedLessons: student._count.progress,
    }));

    // Get current user's rank if authenticated
    let userRank: number | null = null;
    if (req.user && req.user.role === 'STUDENT') {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { coins: true },
      });
      
      if (currentUser) {
        const userCoins = currentUser.coins || 0;
        const studentsAbove = await prisma.user.count({
          where: {
            role: 'STUDENT',
            coins: {
              gt: userCoins,
            },
          },
        });
        userRank = studentsAbove + 1;
      }
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        totalParticipants: topStudents.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
