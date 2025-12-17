import { Router } from 'express';
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  resetStudentPassword,
  approveCourseAccess,
  assignCourse,
  detachCourse,
  getStudentProgress,
  deleteStudent,
  extendSubscription,
} from '../controllers/studentController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require TEACHER or ADMIN role
router.use(authenticate, requireRole('TEACHER', 'ADMIN'));

router.post('/', createStudent);
router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.put('/:id/reset-password', resetStudentPassword);
router.get('/:id/progress', getStudentProgress);
router.put('/:id/courses/:courseId', approveCourseAccess);
router.post('/:id/courses/:courseId', assignCourse);
router.delete('/:id/courses/:courseId', detachCourse);
router.delete('/:id', requireRole('ADMIN'), deleteStudent);

export default router;

