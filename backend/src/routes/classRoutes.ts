import { Router } from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  addStudent,
  removeStudent,
  updateStudentStatus,
} from '../controllers/classController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All authenticated users can view classes (with access check)
router.get('/', authenticate, getClasses);
router.get('/:id', authenticate, getClassById);

// Teacher/Admin routes
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), createClass);
router.put('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), updateClass);
router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), deleteClass);

// Student management
router.post('/:id/students', authenticate, requireRole('TEACHER', 'ADMIN'), addStudent);
router.delete('/:id/students/:studentId', authenticate, requireRole('TEACHER', 'ADMIN'), removeStudent);
router.put('/:id/students/:studentId/status', authenticate, requireRole('TEACHER', 'ADMIN'), updateStudentStatus);

export default router;




