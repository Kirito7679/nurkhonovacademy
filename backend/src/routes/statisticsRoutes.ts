import { Router } from 'express';
import { getTeacherStatistics } from '../controllers/statisticsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require TEACHER or ADMIN role
router.use(authenticate, requireRole('TEACHER', 'ADMIN'));

router.get('/teacher', getTeacherStatistics);

export default router;

