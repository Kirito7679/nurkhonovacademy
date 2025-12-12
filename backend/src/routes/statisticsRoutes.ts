import { Router } from 'express';
import { 
  getTeacherStatistics,
  getNewUsersGrowth,
  getDeviceStatistics,
  getActiveStudentsStatistics,
} from '../controllers/statisticsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require TEACHER or ADMIN role
router.use(authenticate, requireRole('TEACHER', 'ADMIN'));

// Log route registration
console.log('📊 Statistics routes registered:');
console.log('  - GET /api/statistics/teacher');
console.log('  - GET /api/statistics/new-users-growth');
console.log('  - GET /api/statistics/device-statistics');
console.log('  - GET /api/statistics/active-students');

router.get('/teacher', getTeacherStatistics);
router.get('/new-users-growth', getNewUsersGrowth);
router.get('/device-statistics', getDeviceStatistics);
router.get('/active-students', getActiveStudentsStatistics);

export default router;






