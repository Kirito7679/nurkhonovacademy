import { Router } from 'express';
import {
  getQuizByLessonId,
  createOrUpdateQuiz,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
} from '../controllers/quizController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Get quiz for a lesson (students, teachers, admins)
router.get('/lesson/:lessonId', authenticate, requireRole('STUDENT', 'TEACHER', 'ADMIN'), getQuizByLessonId);

// Submit quiz answers (students)
router.post('/lesson/:lessonId/submit', authenticate, requireRole('STUDENT'), submitQuiz);

// Create or update quiz (teachers, moderators)
router.post('/lesson/:lessonId', authenticate, requireRole('TEACHER', 'ADMIN', 'MODERATOR'), createOrUpdateQuiz);
router.put('/lesson/:lessonId', authenticate, requireRole('TEACHER', 'ADMIN', 'MODERATOR'), createOrUpdateQuiz);

// Get quiz results (teachers, moderators)
router.get('/lesson/:lessonId/results', authenticate, requireRole('TEACHER', 'ADMIN', 'MODERATOR'), getQuizResults);

// Delete quiz (teachers, moderators)
router.delete('/lesson/:lessonId', authenticate, requireRole('TEACHER', 'ADMIN', 'MODERATOR'), deleteQuiz);

export default router;

