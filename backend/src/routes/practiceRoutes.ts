import { Router } from 'express';
import {
  getPracticeExercises,
  createPracticeExercise,
  updatePracticeExercise,
  submitPracticeResult,
  reviewPracticeResult,
  getStudentPracticeResults,
  deletePracticeExercise,
  deletePracticeResult,
} from '../controllers/practiceController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get exercises for a lesson
router.get('/lessons/:lessonId', getPracticeExercises);

// Create exercise (teachers, admins, moderators)
router.post('/lessons/:lessonId', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), createPracticeExercise);

// Submit result (students only)
router.post('/:exerciseId/submit', requireRole('STUDENT'), submitPracticeResult);

// Get student's results
router.get('/:exerciseId/results', requireRole('STUDENT'), getStudentPracticeResults);

// Review result (teachers, admins, moderators)
router.put('/results/:resultId/review', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), reviewPracticeResult);

// Update exercise (teachers, admins, moderators)
router.put('/exercises/:exerciseId', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), updatePracticeExercise);

// Delete exercise (teachers, admins, moderators)
router.delete('/exercises/:exerciseId', requireRole('TEACHER', 'ADMIN', 'MODERATOR'), deletePracticeExercise);

// Delete result (students can delete own, teachers/admins can delete any)
router.delete('/results/:resultId', deletePracticeResult);

export default router;
