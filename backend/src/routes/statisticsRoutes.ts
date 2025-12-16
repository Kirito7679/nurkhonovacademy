import { Router } from 'express';
import { 
  getTeacherStatistics,
  getNewUsersGrowth,
  getDeviceStatistics,
  getActiveStudentsStatistics,
  getLocationStatistics,
  getStudentsByCountry,
} from '../controllers/statisticsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require TEACHER, ADMIN, or CURATOR role
router.use(authenticate, requireRole('TEACHER', 'ADMIN', 'CURATOR'));

// Log route registration
console.log('📊 Statistics routes registered:');
console.log('  - GET /api/statistics/teacher');
console.log('  - GET /api/statistics/new-users-growth');
console.log('  - GET /api/statistics/device-statistics');
console.log('  - GET /api/statistics/active-students');
console.log('  - GET /api/statistics/location-statistics');
console.log('  - GET /api/statistics/students-by-country');

router.get('/teacher', getTeacherStatistics);
router.get('/new-users-growth', getNewUsersGrowth);
router.get('/device-statistics', getDeviceStatistics);
router.get('/active-students', getActiveStudentsStatistics);
router.get('/location-statistics', getLocationStatistics);
router.get('/students-by-country', getStudentsByCountry);

export default router;






