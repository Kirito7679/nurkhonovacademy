import { Router } from 'express';
import {
  getCourseModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} from '../controllers/moduleController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all modules for a course (must be before /:id to avoid route conflict)
router.get('/courses/:courseId/modules', getCourseModules);

// Get module by ID (must be after specific routes)
router.get('/:id', getModuleById);

// Create module (only teachers and admins)
router.post('/courses/:courseId/modules', requireRole('TEACHER', 'ADMIN'), createModule);

// Update module (only teachers and admins)
router.put('/:id', requireRole('TEACHER', 'ADMIN'), updateModule);

// Delete module (only teachers and admins)
router.delete('/:id', requireRole('TEACHER', 'ADMIN'), deleteModule);

export default router;
