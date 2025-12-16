import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createBannerSchema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url('Неверный формат URL изображения'),
  link: z.string().url('Неверный формат URL ссылки').optional().or(z.literal('')),
  position: z.enum(['TOP', 'BOTTOM', 'SIDEBAR']).default('TOP'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  order: z.number().int().min(0).default(0),
});

// Get active banners
export const getActiveBanners = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { position } = req.query;
    const now = new Date();
    
    const where: any = {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    if (position && typeof position === 'string') {
      where.position = position;
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// Create banner (admin only)
export const createBanner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Только администратор может создавать баннеры', 403);
    }

    const validatedData = createBannerSchema.parse(req.body);

    const banner = await prisma.banner.create({
      data: {
        ...validatedData,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: banner,
      message: 'Баннер успешно создан',
    });
  } catch (error) {
    next(error);
  }
};

// Delete banner (admin only)
export const deleteBanner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Только администратор может удалять баннеры', 403);
    }

    const { bannerId } = req.params;

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    res.json({
      success: true,
      message: 'Баннер успешно удален',
    });
  } catch (error) {
    next(error);
  }
};
