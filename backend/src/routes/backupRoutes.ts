import { Router } from 'express';
import { createBackup, getBackups } from '../controllers/backupController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.use(authenticate);

// All routes require admin role
router.use(requireRole('ADMIN'));

// Get backups
router.get('/', getBackups);

// Create backup
router.post('/', createBackup);

export default router;
