import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

export const getFlashcardDecks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId, lessonId } = req.query;

    const where: any = {};
    if (courseId) where.courseId = courseId as string;
    if (lessonId) where.lessonId = lessonId as string;
    
    // Show public decks or decks created by user
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TEACHER') {
      where.OR = [
        { isPublic: true },
        { createdBy: req.user!.id },
      ];
    }

    const decks = await prisma.flashcardDeck.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: decks,
    });
  } catch (error) {
    next(error);
  }
};

export const getFlashcardDeckById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const deck = await prisma.flashcardDeck.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        flashcards: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!deck) {
      throw new AppError('Колода флеш-карточек не найдена', 404);
    }

    // Check access
    if (!deck.isPublic && deck.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('У вас нет доступа к этой колоде', 403);
    }

    res.json({
      success: true,
      data: deck,
    });
  } catch (error) {
    next(error);
  }
};

export const createFlashcardDeck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, courseId, lessonId, isPublic, flashcards } = req.body;

    if (!title) {
      throw new AppError('Название колоды обязательно', 400);
    }

    const deck = await prisma.flashcardDeck.create({
      data: {
        title,
        description: description || null,
        courseId: courseId || null,
        lessonId: lessonId || null,
        createdBy: req.user!.id,
        isPublic: isPublic || false,
        flashcards: flashcards ? {
          create: flashcards.map((card: any, index: number) => ({
            front: card.front,
            back: card.back,
            order: index,
          })),
        } : undefined,
      },
      include: {
        flashcards: true,
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'FLASHCARD_DECK',
      entityId: deck.id,
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      data: deck,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFlashcardDeck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;

    const existingDeck = await prisma.flashcardDeck.findUnique({
      where: { id },
    });

    if (!existingDeck) {
      throw new AppError('Колода не найдена', 404);
    }

    if (existingDeck.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для редактирования', 403);
    }

    const deck = await prisma.flashcardDeck.update({
      where: { id },
      data: {
        title,
        description,
        isPublic,
      },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'FLASHCARD_DECK',
      entityId: id,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      data: deck,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFlashcardDeck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const deck = await prisma.flashcardDeck.findUnique({
      where: { id },
    });

    if (!deck) {
      throw new AppError('Колода не найдена', 404);
    }

    if (deck.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав для удаления', 403);
    }

    await prisma.flashcardDeck.delete({
      where: { id },
    });

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'FLASHCARD_DECK',
      entityId: id,
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Колода успешно удалена',
    });
  } catch (error) {
    next(error);
  }
};

export const addFlashcard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deckId } = req.params;
    const { front, back } = req.body;

    if (!front || !back) {
      throw new AppError('Обе стороны карточки обязательны', 400);
    }

    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new AppError('Колода не найдена', 404);
    }

    if (deck.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Недостаточно прав', 403);
    }

    const cardCount = await prisma.flashcard.count({
      where: { deckId },
    });

    const card = await prisma.flashcard.create({
      data: {
        deckId,
        front,
        back,
        order: cardCount,
      },
    });

    res.status(201).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFlashcardProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deckId, cardId } = req.params;
    const { difficulty } = req.body;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут обновлять прогресс', 403);
    }

    // Calculate next review date based on difficulty (spaced repetition)
    const now = new Date();
    let nextReview = new Date();
    const daysToAdd: { [key: string]: number } = {
      NEW: 1,
      EASY: 4,
      MEDIUM: 2,
      HARD: 1,
    };
    nextReview.setDate(now.getDate() + (daysToAdd[difficulty] || 1));

    const progress = await prisma.flashcardProgress.upsert({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId,
        },
      },
      update: {
        difficulty,
        lastReviewed: now,
        nextReview,
        reviewCount: {
          increment: 1,
        },
      },
      create: {
        userId: req.user!.id,
        deckId,
        cardId,
        difficulty: difficulty || 'NEW',
        lastReviewed: now,
        nextReview,
        reviewCount: 1,
      },
    });

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

export const getFlashcardsToReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deckId } = req.params;

    if (req.user!.role !== 'STUDENT') {
      throw new AppError('Только студенты могут просматривать карточки для повторения', 403);
    }

    const now = new Date();
    
    // Get all flashcards in the deck
    const allCards = await prisma.flashcard.findMany({
      where: {
        deckId,
      },
      include: {
        progress: {
          where: {
            userId: req.user!.id,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Filter cards that need review:
    // 1. Cards with no progress for this user
    // 2. Cards with progress where nextReview <= now
    const cardsToReview = allCards.filter(card => {
      if (card.progress.length === 0) {
        return true; // No progress yet, needs review
      }
      const userProgress = card.progress[0];
      return userProgress.nextReview && userProgress.nextReview <= now;
    });

    res.json({
      success: true,
      data: cardsToReview,
    });
  } catch (error) {
    next(error);
  }
};
