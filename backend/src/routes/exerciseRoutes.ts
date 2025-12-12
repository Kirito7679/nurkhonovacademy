import { Router } from 'express';
import {
  createExercise,
  getLessonExercises,
  submitExerciseResult,
} from '../controllers/exerciseController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get exercises for a lesson
router.get('/lessons/:lessonId/exercises', getLessonExercises);

// Create exercise (teachers and admins)
router.post('/exercises', requireRole('TEACHER', 'ADMIN'), createExercise);

// Submit exercise result (students)
router.post('/exercises/:exerciseId/submit', requireRole('STUDENT'), submitExerciseResult);

export default router;
