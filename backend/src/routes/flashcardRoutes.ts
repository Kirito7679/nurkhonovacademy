import { Router } from 'express';
import {
  getFlashcardDecks,
  getFlashcardDeckById,
  createFlashcardDeck,
  updateFlashcardDeck,
  deleteFlashcardDeck,
  addFlashcard,
  updateFlashcardProgress,
  getFlashcardsToReview,
} from '../controllers/flashcardController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get all flashcard decks
router.get('/', getFlashcardDecks);

// Get deck by ID
router.get('/:id', getFlashcardDeckById);

// Get cards to review
router.get('/:deckId/review', requireRole('STUDENT'), getFlashcardsToReview);

// Create deck (teachers, admins, moderators)
router.post('/', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), createFlashcardDeck);

// Update deck
router.put('/:id', updateFlashcardDeck);

// Delete deck
router.delete('/:id', deleteFlashcardDeck);

// Add flashcard to deck
router.post('/:deckId/cards', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), addFlashcard);

// Update flashcard progress (students only)
router.put('/:deckId/cards/:cardId/progress', requireRole('STUDENT'), updateFlashcardProgress);

export default router;
