import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createStorySchema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url('Неверный формат URL изображения'),
  videoUrl: z.string().url('Неверный формат URL видео').optional().or(z.literal('')),
  link: z.string().url('Неверный формат URL ссылки').optional().or(z.literal('')),
  expiresAt: z.string().datetime().optional(),
  order: z.number().int().min(0).default(0),
});

// Get active stories
export const getActiveStories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    
    const stories = await prisma.story.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        _count: {
          select: {
            views: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    next(error);
  }
};

// View story (mark as viewed)
export const viewStory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storyId } = req.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new AppError('Сторис не найден', 404);
    }

    // Check if already viewed
    const existingView = await prisma.storyView.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId: req.user!.id,
        },
      },
    });

    if (!existingView) {
      await prisma.storyView.create({
        data: {
          storyId,
          userId: req.user!.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Сторис отмечен как просмотренный',
    });
  } catch (error) {
    next(error);
  }
};

// Create story (admin only)
export const createStory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Только администратор может создавать сторисы', 403);
    }

    const validatedData = createStorySchema.parse(req.body);

    const story = await prisma.story.create({
      data: {
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: story,
      message: 'Сторис успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

// Delete story (admin only)
export const deleteStory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Только администратор может удалять сторисы', 403);
    }

    const { storyId } = req.params;

    await prisma.story.delete({
      where: { id: storyId },
    });

    res.json({
      success: true,
      message: 'Сторис успешно удален',
    });
  } catch (error) {
    next(error);
  }
};
