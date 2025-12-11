import { Router } from 'express';
import {
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonFiles,
  updateProgress,
} from '../controllers/lessonController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All authenticated users can view lessons (with access check)
router.get('/:id', authenticate, getLessonById);
router.get('/:id/files', authenticate, getLessonFiles);

// Students can update their progress
router.put('/:id/progress', authenticate, requireRole('STUDENT'), updateProgress);

// Teacher/Admin routes
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), createLesson);
router.put('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), updateLesson);
router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), deleteLesson);

export default router;

