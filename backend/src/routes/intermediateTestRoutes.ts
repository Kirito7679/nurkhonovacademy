import { Router } from 'express';
import {
  getCourseTests,
  getTestById,
  createTest,
  submitTest,
} from '../controllers/intermediateTestController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Get all tests for a course
router.get('/courses/:courseId/tests', authenticate, getCourseTests);

// Get test by ID
router.get('/:testId', authenticate, getTestById);

// Create test (teachers and admins)
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), createTest);

// Submit test (students only)
router.post('/:testId/submit', authenticate, requireRole('STUDENT'), submitTest);

export default router;
