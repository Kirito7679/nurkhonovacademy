import { Router } from 'express';
import {
  getActivityLogs,
  getUserActivityLogs,
} from '../controllers/activityLogController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// Get all activity logs (admins and moderators only)
router.get('/', requireRole('ADMIN', 'MODERATOR'), getActivityLogs);

// Get user's activity logs
router.get('/user/:userId', getUserActivityLogs);

export default router;
