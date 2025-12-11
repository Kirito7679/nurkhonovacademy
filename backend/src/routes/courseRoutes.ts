import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseLessons,
  requestCourseAccess,
} from '../controllers/courseController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Public routes
router.get('/', authenticate, getAllCourses);
router.get('/:id', authenticate, getCourseById);
router.get('/:id/lessons', authenticate, getCourseLessons);

// Student routes
router.post('/:id/request', authenticate, requireRole('STUDENT'), requestCourseAccess);

// Teacher/Admin routes
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), createCourse);
router.put('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), updateCourse);
router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), deleteCourse);

export default router;

