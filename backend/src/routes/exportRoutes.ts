import { Router } from 'express';
import {
  exportStudents,
  exportCourseStatistics,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require TEACHER or ADMIN role
router.use(authenticate, requireRole('TEACHER', 'ADMIN'));

router.get('/students', authenticate, requireRole('TEACHER', 'ADMIN'), exportStudents);
router.get('/course-statistics', authenticate, requireRole('TEACHER', 'ADMIN'), exportCourseStatistics);

export default router;

